import { App, setIcon } from 'obsidian';

export class Sidebar {
    private app: App;
    private container: HTMLElement;
    private parentEl: HTMLElement;

    constructor(app: App, parentEl: HTMLElement) {
        this.app = app;
        this.parentEl = parentEl;
        this.render();
    }

    private render() {
        this.container = this.parentEl.createDiv({ cls: 'dl-sidebar' });
        
        // Header
        const header = this.container.createDiv({ cls: 'dl-sidebar-header' });
        header.createSpan({ text: '仪表盘列表' });
        
        // Content placeholder
        const list = this.container.createDiv({ cls: 'dl-dashboard-list' });
        // (Logic to populate list would go here)

        // Footer
        const footer = this.container.createDiv({ cls: 'dl-sidebar-footer' });
        const collapseBtn = footer.createEl('button', { cls: 'dl-collapse-btn' });
        setIcon(collapseBtn, 'chevrons-left');
        collapseBtn.onclick = () => this.toggleCollapse();
    }

    public toggleCollapse() {
        this.container.classList.toggle('is-collapsed');
    }

    // --- FIXED: Added destroy method ---
    public destroy() {
        if (this.container) {
            this.container.empty();
            this.container.remove();
        }
    }
}