// === FILE: ui/modals/NoteCreatorModal.ts ===
import { App, Modal, Setting, Notice, TFile, normalizePath, AbstractInputSuggest } from 'obsidian';
import { SettingsManager } from '../../core/cr_man_set_store';

export class NoteCreatorModal extends Modal {
    private settingsManager: SettingsManager;
    private templates: TFile[] = [];
    private selectedTemplate: TFile | null = null;
    private newFileName: string = '';

    constructor(app: App, settingsManager: SettingsManager) {
        super(app);
        this.settingsManager = settingsManager;
    }

    async onOpen() {
        await this.loadTemplates();
        this.render();
    }

    private async loadTemplates() {
        const path = this.settingsManager.getSettings().noteCreator.templatePath;
        if (!path) return;

        const folder = this.app.vault.getAbstractFileByPath(path);
        if (folder) {
            if ('children' in folder) {
                // @ts-ignore
                this.templates = folder.children.filter(f => f instanceof TFile && f.extension === 'md');
            }
        }
    }

    private render() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: '创建新笔记' });

        // 1. Filename Input (优先显示)
        new Setting(contentEl)
            .setName('文件名')
            .addText(text => {
                text.setPlaceholder('请输入笔记名称')
                    .onChange(val => this.newFileName = val);
                // 自动聚焦
                setTimeout(() => text.inputEl.focus(), 50);
            });

        // 2. Template Selector (使用补全替代下拉框)
        if (this.templates.length > 0) {
            new Setting(contentEl)
                .setName('选择模板')
                .setDesc('支持搜索')
                .addText(text => {
                    text.setPlaceholder('输入模板名称...')
                        .onChange(val => {
                            // 如果用户清空了输入，重置选择
                            if (!val) this.selectedTemplate = null;
                        });
                    
                    // 绑定补全器
                    new TemplateSuggest(this.app, text.inputEl, this.templates, (file) => {
                        this.selectedTemplate = file;
                        text.setValue(file.basename);
                    });
                });
        } else {
            contentEl.createDiv({ 
                text: '未找到模板，请先在设置中配置模板路径。', 
                cls: 'dl-error-msg' 
            });
        }

        // Footer
        const footer = contentEl.createDiv('dl-modal-footer');
        const btn = footer.createEl('button', { text: '创建', cls: 'mod-cta' });
        btn.onclick = () => this.handleCreate();
        
        // 支持回车直接创建
        contentEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.newFileName) {
                this.handleCreate();
            }
        });
    }

    private async handleCreate() {
        if (!this.newFileName) {
            new Notice('请输入文件名');
            return;
        }

        const savePath = this.settingsManager.getSettings().noteCreator.savePath || '';
        const fullPath = normalizePath(`${savePath}/${this.newFileName}.md`);

        if (this.app.vault.getAbstractFileByPath(fullPath)) {
            new Notice('文件已存在');
            return;
        }

        let content = '';
        if (this.selectedTemplate) {
            content = await this.app.vault.read(this.selectedTemplate);
        }

        try {
            const file = await this.app.vault.create(fullPath, content);
            this.app.workspace.getLeaf(false).openFile(file);
            this.close();
        } catch (err) {
            new Notice('创建文件失败');
            console.error(err);
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}

// 内部类：模板补全器
class TemplateSuggest extends AbstractInputSuggest<TFile> {
    private files: TFile[];
    private onSelect: (file: TFile) => void;

    constructor(app: App, inputEl: HTMLInputElement, files: TFile[], onSelect: (file: TFile) => void) {
        super(app, inputEl);
        this.files = files;
        this.onSelect = onSelect;
    }

    getSuggestions(query: string): TFile[] {
        const lower = query.toLowerCase();
        return this.files.filter(f => 
            f.basename.toLowerCase().includes(lower) || 
            f.path.toLowerCase().includes(lower)
        );
    }

    renderSuggestion(file: TFile, el: HTMLElement) {
        el.createDiv({ text: file.basename, style: 'font-weight: 500;' });
        el.createDiv({ text: file.path, style: 'font-size: 0.8em; color: var(--text-muted);' });
    }

    selectSuggestion(file: TFile) {
        this.onSelect(file);
        this.close();
    }
}