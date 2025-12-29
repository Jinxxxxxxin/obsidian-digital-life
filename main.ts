// === FILE: main.ts ===
import { Plugin, WorkspaceLeaf, debounce, TFile, Notice, Editor, MarkdownView } from 'obsidian';
import { SettingsManager } from './core/SettingsManager';
import { FormulaManager } from './core/FormulaManager';
import { MainView, VIEW_TYPE_DIGITAL_LIFE } from './ui/MainView';
import { DigitalLifeSettingTab } from './ui/DigitalLifeSettingTab';
import { PropertyVisibilityModal } from './ui/modals/PropertyVisibilityModal';
import { NoteCreatorModal } from './ui/modals/NoteCreatorModal';
import { CsvSelectionModal, ColumnSelectionModal } from './ui/modals/CsvImportModal';
import { CsvParser } from './core/utils/CsvParser';
import { QuickTaskModal } from './ui/modals/QuickTaskModal'; 
import { SearchModal } from './ui/modals/SearchModal';
import { TaskService } from './core/services/TaskService';

export default class DigitalLifePlugin extends Plugin {
    public settingsManager: SettingsManager;
    public formulaManager: FormulaManager;
    public taskService: TaskService;
    private debouncedCalculate: (file: TFile) => void;
    private debouncedAutoCapture: (file: TFile) => void; // [新增]

    async onload() {
        console.log('Loading Digital Life Plugin v1.3.0');

        this.settingsManager = new SettingsManager(this);
        await this.settingsManager.loadSettings();

        this.formulaManager = new FormulaManager(this.app, this.settingsManager);
        this.formulaManager.updateHiddenPropertiesCSS();

        this.taskService = new TaskService(this.app, this.settingsManager);

        this.registerView(
            VIEW_TYPE_DIGITAL_LIFE,
            (leaf: WorkspaceLeaf) => new MainView(leaf, this.settingsManager)
        );

        this.addSettingTab(new DigitalLifeSettingTab(this.app, this));

        this.addRibbonIcon('home', '打开数字人生仪表盘', () => {
            this.activateView();
        });

        // --- Commands ---
        
        this.addCommand({
            id: 'open-digital-life-dashboard',
            name: '打开仪表盘 (Open Dashboard)',
            callback: () => { this.activateView(); }
        });

        this.addCommand({
            id: 'digital-life-quick-task-cmd',
            name: '快速创建任务 (Smart Task)',
            callback: () => {
                new QuickTaskModal(this.app, async (taskLine) => {
                    await this.taskService.quickAddTask(taskLine);
                }).open();
            }
        });

        this.addCommand({
            id: 'create-new-note-modal',
            name: '新建笔记 (从模板创建)',
            callback: () => { new NoteCreatorModal(this.app, this.settingsManager).open(); }
        });

        this.addCommand({
            id: 'insert-csv-as-table',
            name: '导入 CSV 为 Markdown 表格',
            editorCallback: (editor, view) => {
                new CsvSelectionModal(this.app, async (file) => {
                    try {
                        const content = await this.app.vault.read(file);
                        const headers = CsvParser.getHeaders(content);
                        if (headers.length === 0) { new Notice('CSV 文件为空或格式无效'); return; }
                        new ColumnSelectionModal(this.app, headers, (selectedIndices) => {
                            if (selectedIndices.length === 0) return;
                            const markdownTable = CsvParser.convertToMarkdown(content, selectedIndices);
                            editor.replaceSelection(markdownTable);
                        }).open();
                    } catch (error) { console.error('CSV 处理失败', error); new Notice('导入失败'); }
                }).open();
            }
        });

        this.addCommand({
            id: 'manage-hidden-properties',
            name: '管理当前笔记属性显隐',
            callback: () => {
                const f = this.app.workspace.getActiveFile();
                if(f) new PropertyVisibilityModal(this.app, this.settingsManager, this.formulaManager, f).open();
            }
        });

        this.addCommand({
            id: 'manual-calculate-yaml',
            name: '手动计算 YAML 公式',
            editorCallback: (editor, view) => {
                if (view.file) this.formulaManager.calculateFormulas(view.file, true);
            }
        });

        this.addCommand({
            id: 'search-digital-life',
            name: '搜索',
            hotkeys: [
                { modifiers: ['Ctrl'], key: 'p' }
            ],
            callback: () => {
                new SearchModal(this.app).open();
            }
        });

        // --- Events ---
        
        this.debouncedCalculate = debounce((file: TFile) => {
            this.formulaManager.calculateFormulas(file, false);
        }, 1000, true);

        // [新增] 自动捕获防抖
        this.debouncedAutoCapture = debounce(async (file: TFile) => {
            const taskSettings = this.settingsManager.getSettings().taskManagement;
            if (taskSettings.autoCapture) {
                // 不传入 config，即扫描全库（TaskService 内部会过滤 Inbox/Archive）
                // 优化：仅扫描当前变更的文件？
                // captureTasks 接口目前设计为扫描文件夹，这里我们传入 config 为 null 触发全局扫描
                // 为了性能，最好修改 captureTasks 支持单文件，但目前为了简化，我们仅在修改文件不是 Inbox/Archive 时触发
                if (file.path !== taskSettings.captureInboxPath && file.path !== taskSettings.archivePath) {
                    await this.taskService.captureTasks(null); 
                }
            }
        }, 3000, true); // 3秒防抖，避免频繁触发

        this.registerEvent(this.app.metadataCache.on('changed', (file) => {
            const activeFile = this.app.workspace.getActiveFile();
            // 公式计算
            if (activeFile && file.path === activeFile.path) {
                this.debouncedCalculate(activeFile);
            }
            // 自动捕获
            this.debouncedAutoCapture(file);
        }));
    }

    onunload() {}

    async activateView() {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_DIGITAL_LIFE);
        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getLeaf(true); 
            await leaf.setViewState({ type: VIEW_TYPE_DIGITAL_LIFE, active: true });
        }
        if (leaf) { workspace.revealLeaf(leaf); }
    }
}
