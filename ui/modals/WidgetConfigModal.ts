// === FILE: ui/modals/WidgetConfigModal.ts ===
import { App, Modal, Setting, Notice } from 'obsidian';
import { Widget, WidgetType } from '../../core/types';
import { DataEngine } from '../../core/DataEngine';
import { WIDGET_DEFAULTS } from '../../core/constants';
import { ChartConfigView } from '../configs/ChartConfigView';
import { ListConfigView } from '../configs/ListConfigView';
import { TodoConfigView } from '../configs/TodoConfigView';
import { MarkdownConfigView } from '../configs/MarkdownConfigView';
import { SettingsManager } from '../../core/SettingsManager'; // [新增]

export class WidgetConfigModal extends Modal {
    private widget: Partial<Widget>;
    private dashboardId: string;
    private onSubmit: (widget: Widget) => void;
    private dataEngine: DataEngine;
    private settingsManager: SettingsManager; // [新增]
    private isCreationMode: boolean;
    
    private chartConfig: ChartConfigView;
    private listConfig: ListConfigView;
    private todoConfig: TodoConfigView;
    private markdownConfig: MarkdownConfigView;

    // [修改] 构造函数签名，增加 settingsManager
    constructor(
        app: App, 
        dashboardId: string, 
        settingsManager: SettingsManager, 
        onSubmit: (widget: Widget) => void, 
        existingWidget?: Widget
    ) {
        super(app);
        this.dashboardId = dashboardId;
        this.settingsManager = settingsManager;
        this.onSubmit = onSubmit;
        
        // [核心修复] 初始化 DataEngine 时传入 settingsManager
        this.dataEngine = new DataEngine(app, settingsManager);
        
        const refresh = () => this.onOpen();
        this.chartConfig = new ChartConfigView(app, this.dataEngine, refresh);
        this.listConfig = new ListConfigView(app);
        this.todoConfig = new TodoConfigView(app);
        this.markdownConfig = new MarkdownConfigView(app);
        
        if (existingWidget) {
            this.isCreationMode = false;
            this.widget = JSON.parse(JSON.stringify(existingWidget));
            this.ensureDefaults();
        } else {
            this.isCreationMode = true;
            this.widget = {
                id: crypto.randomUUID(),
                dashboardId: dashboardId,
                ...WIDGET_DEFAULTS['chart']()
            };
        }
    }

    private ensureDefaults() {
        if (this.widget.type === 'chart') {
            if (!this.widget.dataSources || this.widget.dataSources.length === 0) {
                this.widget.dataSources = WIDGET_DEFAULTS['chart']().dataSources;
            }
            if (!this.widget.yAxisProperties) this.widget.yAxisProperties = [];
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Flex Layout
        contentEl.style.display = 'flex';
        contentEl.style.flexDirection = 'column';
        contentEl.style.height = '100%';
        contentEl.style.maxHeight = '80vh';
        
        const headerDiv = contentEl.createDiv();
        const titleText = this.isCreationMode ? '添加组件' : `编辑: ${this.widget.title}`;
        headerDiv.createEl('h2', { text: titleText });

        new Setting(headerDiv)
            .setName('标题')
            .addText(text => text.setValue(this.widget.title || '').onChange(value => this.widget.title = value));

        if (this.isCreationMode) { 
             new Setting(headerDiv)
                .setName('类型')
                .addDropdown(drop => drop
                    .addOption('chart', '统计图表')
                    .addOption('list', '文件列表')
                    .addOption('todo', '待办清单')
                    .addOption('markdown', 'Markdown 笔记')
                    .setValue(this.widget.type || 'chart')
                    .onChange((value: WidgetType) => {
                        this.widget = {
                            id: this.widget.id, 
                            dashboardId: this.dashboardId, 
                            title: this.widget.title, 
                            ...WIDGET_DEFAULTS[value]() 
                        };
                        this.onOpen();
                    }));
        }

        const configContainer = contentEl.createDiv('dl-config-container');
        configContainer.style.flex = '1';
        configContainer.style.overflowY = 'auto';
        configContainer.style.padding = '10px 0';
        configContainer.style.borderTop = '1px solid var(--background-modifier-border)';
        configContainer.style.borderBottom = '1px solid var(--background-modifier-border)';
        configContainer.style.margin = '10px 0';

        this.renderSpecificConfig(configContainer);

        const footer = contentEl.createDiv('dl-modal-footer');
        footer.style.flexShrink = '0';
        footer.style.borderTop = 'none';
        
        const saveBtn = footer.createEl('button', { text: '保存', cls: 'mod-cta' });
        saveBtn.onclick = () => {
            if (!this.widget.title) {
                new Notice('标题不能为空');
                return;
            }
            this.onSubmit(this.widget as Widget);
            this.close();
        };
    }

    private renderSpecificConfig(container: HTMLElement) {
        if (!this.widget.type) return;
        try {
            switch (this.widget.type) {
                case 'chart': this.chartConfig.render(container, this.widget as any); break;
                case 'list': this.listConfig.render(container, this.widget as any); break;
                case 'todo': this.todoConfig.render(container, this.widget as any); break;
                case 'markdown': this.markdownConfig.render(container, this.widget as any); break;
            }
        } catch (e) {
            console.error("Config Render Error", e);
            container.createDiv({ text: '配置面板渲染出错，请查看控制台。', style: 'color: var(--text-error)' });
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}