// === FILE: ui/widgets/BaseWidget.ts ===
import { Widget } from '../../core/cr_def_type_main';
import { setIcon, Menu } from 'obsidian';

export abstract class BaseWidget {
    public container: HTMLElement;
    protected widget: Widget;
    protected contentEl: HTMLElement;
    protected onDelete: () => void;
    protected onEdit: () => void;
    protected onMove: () => void; // [新增]

    constructor(
        widget: Widget, 
        onDelete: () => void, 
        onEdit: () => void,
        onMove: () => void // [新增]
    ) {
        this.widget = widget;
        this.onDelete = onDelete;
        this.onEdit = onEdit;
        this.onMove = onMove;
    }

    public render(parent: HTMLElement): void {
        this.container = parent.createDiv('dl-widget-card');
        this.container.setAttribute('data-id', this.widget.id);

        this.renderHeader();
        this.contentEl = this.container.createDiv('dl-widget-content');
        this.renderContent();
    }

    protected renderHeader(): void {
        const header = this.container.createDiv('dl-widget-header');
        header.createSpan({ cls: 'dl-widget-title', text: this.widget.title });

        const controls = header.createDiv('dl-widget-controls');

        const menuBtn = controls.createSpan('dl-icon-btn');
        setIcon(menuBtn, 'more-vertical');
        
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            const menu = new Menu();
            
            menu.addItem((item) => {
                item.setTitle('编辑组件')
                    .setIcon('pencil')
                    .onClick(() => this.onEdit());
            });

            // [新增] 移动选项
            menu.addItem((item) => {
                item.setTitle('移动到其他看板')
                    .setIcon('arrow-right-circle')
                    .onClick(() => this.onMove());
            });

            menu.addSeparator();

            menu.addItem((item) => {
                item.setTitle('删除')
                    .setIcon('trash')
                    .setWarning(true)
                    .onClick(() => this.onDelete());
            });

            menu.showAtPosition({ x: e.clientX, y: e.clientY });
        };
    }

    public abstract renderContent(): Promise<void>;
    
    public update(widget: Widget): void {
        this.widget = widget;
        this.container.querySelector('.dl-widget-title')!.setText(widget.title);
        this.contentEl.empty();
        this.renderContent();
    }
}