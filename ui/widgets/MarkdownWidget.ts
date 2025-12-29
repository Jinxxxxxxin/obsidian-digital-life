// === FILE: ui/widgets/MarkdownWidget.ts ===
import { App, MarkdownRenderer, Component, TFile, Notice, setIcon, Menu } from 'obsidian';
import { BaseWidget } from './BaseWidget';
import { MarkdownWidget as IMarkdownWidget } from '../../core/types';

export class MarkdownWidget extends BaseWidget {
    private app: App;
    private component: Component;
    private file: TFile | null = null;

    constructor(
        widget: IMarkdownWidget, 
        app: App,
        component: Component,
        onDelete: () => void, 
        onEdit: () => void,
        onMove: () => void
    ) {
        super(widget, onDelete, onEdit, onMove);
        this.app = app;
        this.component = component;
        this.registerFileWatcher();
    }

    private registerFileWatcher() {
        this.component.registerEvent(
            this.app.vault.on('modify', (file) => {
                const w = this.widget as IMarkdownWidget;
                if (file instanceof TFile && file.path === w.filePath) {
                    if (w.mode === 'preview') {
                        this.renderContent();
                    }
                }
            })
        );
        
        this.component.registerEvent(
            this.app.vault.on('rename', (file, oldPath) => {
                const w = this.widget as IMarkdownWidget;
                if (oldPath === w.filePath) {
                    w.filePath = file.path; 
                    this.renderContent();
                }
            })
        );
    }

    protected renderHeader(): void {
        const header = this.container.createDiv('dl-widget-header');
        header.createSpan({ cls: 'dl-widget-title', text: this.widget.title });

        const controls = header.createDiv('dl-widget-controls');

        const openBtn = controls.createSpan('dl-icon-btn');
        setIcon(openBtn, 'external-link');
        openBtn.title = '打开笔记';
        openBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.file) this.app.workspace.getLeaf(false).openFile(this.file);
            else new Notice('未找到文件');
        };

        const toggleBtn = controls.createSpan('dl-icon-btn');
        const isEdit = (this.widget as IMarkdownWidget).mode === 'edit';
        setIcon(toggleBtn, isEdit ? 'eye' : 'pencil');
        toggleBtn.title = isEdit ? '切换预览' : '快速编辑';
        
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const w = this.widget as IMarkdownWidget;
            w.mode = w.mode === 'edit' ? 'preview' : 'edit';
            setIcon(toggleBtn, w.mode === 'edit' ? 'eye' : 'pencil');
            this.renderContent();
        };

        const menuBtn = controls.createSpan('dl-icon-btn');
        setIcon(menuBtn, 'more-vertical');
        
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            const menu = new Menu();
            menu.addItem((item) => item.setTitle('配置').setIcon('settings').onClick(() => this.onEdit()));
            menu.addItem((item) => item.setTitle('移动').setIcon('arrow-right-circle').onClick(() => this.onMove()));
            menu.addItem((item) => item.setTitle('删除').setIcon('trash').setWarning(true).onClick(() => this.onDelete()));
            menu.showAtPosition({ x: e.clientX, y: e.clientY });
        };
    }

    public async renderContent(): Promise<void> {
        // [Fix 4] 核心修复：确保容器清空，防止重复渲染
        this.contentEl.empty();
        this.contentEl.addClass('dl-markdown-widget-container');

        const mdWidget = this.widget as IMarkdownWidget;
        if (!mdWidget.filePath) {
            this.contentEl.createDiv({ text: '未选择文件', cls: 'dl-no-data' });
            return;
        }

        const abstractFile = this.app.vault.getAbstractFileByPath(mdWidget.filePath);
        if (!(abstractFile instanceof TFile)) {
            this.contentEl.createDiv({ text: '文件不存在', cls: 'dl-error-msg' });
            return;
        }
        this.file = abstractFile;

        const content = await this.app.vault.read(this.file);

        if (mdWidget.mode === 'preview') {
            const previewContainer = this.contentEl.createDiv('dl-markdown-preview markdown-preview-view');
            
            await MarkdownRenderer.render(
                this.app,
                content,
                previewContainer,
                this.file.path,
                this.component
            );
        } else {
            const wrapper = this.contentEl.createDiv('dl-markdown-editor-wrapper');
            
            const info = wrapper.createDiv({ 
                text: '💡 快速编辑模式 (纯文本)',
                style: 'font-size: 0.8em; color: var(--text-muted); padding: 5px 10px; background: var(--background-secondary); border-bottom: 1px solid var(--background-modifier-border);'
            });

            const textarea = wrapper.createEl('textarea', { 
                cls: 'dl-markdown-editor',
                text: content 
            });
            
            textarea.onblur = async () => {
                if (this.file && textarea.value !== content) {
                    await this.app.vault.modify(this.file, textarea.value);
                    new Notice('笔记已保存');
                }
            };
        }
    }
}