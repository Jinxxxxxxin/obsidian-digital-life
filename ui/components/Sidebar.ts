// === FILE: ui/components/Sidebar.ts ===
import { App, Menu, setIcon } from 'obsidian';
import { SettingsManager } from '../../core/cr_man_set_store';
import { Dashboard } from '../../core/cr_def_type_main';
import { RenameModal } from '../modals/RenameModal';

export class Sidebar {
    private container: HTMLElement;
    private app: App;
    private settingsManager: SettingsManager;
    private pinnedContainer: HTMLElement;
    private standardContainer: HTMLElement;
    private onDashboardSwitch: (id: string) => void;
    
    // Drag state
    private draggedId: string | null = null;

    constructor(
        container: HTMLElement, 
        app: App, 
        settingsManager: SettingsManager,
        onDashboardSwitch: (id: string) => void
    ) {
        this.container = container;
        this.app = app;
        this.settingsManager = settingsManager;
        this.onDashboardSwitch = onDashboardSwitch;
    }

    render() {
        this.container.addClass('dl-sidebar');
        
        // Header
        const header = this.container.createDiv('dl-sidebar-header');
        header.createSpan({ text: '看板列表' });
        const addBtn = header.createSpan('dl-icon-btn');
        setIcon(addBtn, 'plus');
        addBtn.onclick = () => this.handleCreateDashboard();
        addBtn.title = "新建看板";

        // Scrollable Content Area
        const content = this.container.createDiv('dl-sidebar-content');

        // Pinned Section
        this.pinnedContainer = content.createDiv('dl-dashboard-list dl-pinned-list');
        this.pinnedContainer.setAttribute('data-section', 'pinned');
        
        // Separator (CSS handles visibility)
        content.createDiv('dl-list-separator');

        // Standard Section
        this.standardContainer = content.createDiv('dl-dashboard-list dl-standard-list');
        this.standardContainer.setAttribute('data-section', 'standard');

        this.setupDragDrop(this.pinnedContainer);
        this.setupDragDrop(this.standardContainer);

        this.refreshList();
    }

    async refreshList() {
        this.pinnedContainer.empty();
        this.standardContainer.empty();
        
        const dashboards = this.settingsManager.getDashboards();
        const activeId = this.settingsManager.getSettings().activeDashboardId;
        
        // Sort: Pinned first (though UI separates them), then user order
        const pinned = dashboards.filter(d => d.isPinned);
        const standard = dashboards.filter(d => !d.isPinned);

        if (pinned.length > 0) {
            this.pinnedContainer.createDiv({ text: '置顶', cls: 'dl-list-header' });
            pinned.forEach(d => this.renderItem(this.pinnedContainer, d, activeId));
            this.pinnedContainer.style.display = 'block';
        } else {
            this.pinnedContainer.style.display = 'none';
        }

        if (standard.length > 0) {
            // Only show 'All' header if there are pinned items to distinguish
            if (pinned.length > 0) this.standardContainer.createDiv({ text: '全部', cls: 'dl-list-header' });
            standard.forEach(d => this.renderItem(this.standardContainer, d, activeId));
        }
    }

    private renderItem(container: HTMLElement, dashboard: Dashboard, activeId: string | null) {
        const item = container.createDiv('dl-dashboard-item');
        item.setAttribute('draggable', 'true');
        item.setAttribute('data-id', dashboard.id);
        
        if (dashboard.id === activeId) item.addClass('is-active');

        // Icon
        const icon = item.createSpan('dl-item-icon');
        setIcon(icon, dashboard.isPinned ? 'pin' : 'layout-dashboard');
        
        // Name
        const nameSpan = item.createSpan({ text: dashboard.name, cls: 'dl-item-name' });

        // Click to switch
        item.onclick = () => {
            if (dashboard.id !== activeId) {
                this.settingsManager.setActiveDashboard(dashboard.id).then(() => {
                    this.onDashboardSwitch(dashboard.id);
                    this.refreshList();
                });
            }
        };

        // Context Menu
        item.oncontextmenu = (evt) => {
            this.showContextMenu(evt, dashboard);
        };

        // Drag Events for Item
        item.addEventListener('dragstart', (e) => {
            this.draggedId = dashboard.id;
            item.addClass('is-dragging');
            if(e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', dashboard.id);
            }
        });

        item.addEventListener('dragend', () => {
            item.removeClass('is-dragging');
            this.draggedId = null;
            this.container.querySelectorAll('.dl-drop-target').forEach(el => el.removeClass('dl-drop-target'));
        });
    }

    private setupDragDrop(container: HTMLElement) {
        container.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            
            const target = (e.target as HTMLElement).closest('.dl-dashboard-item');
            if (target && target !== container) {
                // Visual feedback could go here (e.g. border-bottom)
            }
        });

        container.addEventListener('drop', async (e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer?.getData('text/plain');
            if (!draggedId) return;

            const targetSection = container.getAttribute('data-section'); // 'pinned' or 'standard'
            const targetItem = (e.target as HTMLElement).closest('.dl-dashboard-item');
            
            // 1. Calculate new order
            const dashboards = this.settingsManager.getDashboards();
            let newOrder = [...dashboards];
            const draggedDashboard = newOrder.find(d => d.id === draggedId);
            if (!draggedDashboard) return;

            // Remove dragged item from old position
            newOrder = newOrder.filter(d => d.id !== draggedId);

            // Determine insert index
            let insertIndex = -1;
            if (targetItem) {
                const targetId = targetItem.getAttribute('data-id');
                const targetIndex = newOrder.findIndex(d => d.id === targetId);
                // Insert before target for simplicity
                insertIndex = targetIndex; 
            } else {
                // Drop on container (empty space) -> Append to section
                // If dropped in pinned container, append after last pinned item
                if (targetSection === 'pinned') {
                    const lastPinnedIndex = newOrder.findLastIndex(d => d.isPinned);
                    insertIndex = lastPinnedIndex + 1;
                } else {
                    // Standard container, append to end
                    insertIndex = newOrder.length;
                }
            }
            
            if (insertIndex === -1) insertIndex = 0; // Fallback

            // 2. Update Pinned State based on Target Section
            const isNowPinned = targetSection === 'pinned';
            draggedDashboard.isPinned = isNowPinned;

            // 3. Re-insert
            newOrder.splice(insertIndex, 0, draggedDashboard);

            // 4. Save
            // We update the whole list order + property of the dragged item
            await this.settingsManager.updateDashboardProperties(draggedId, { isPinned: isNowPinned });
            await this.settingsManager.reorderDashboards(newOrder.map(d => d.id));
            
            this.refreshList();
        });
    }

    private async handleCreateDashboard() {
        const name = `看板 ${this.settingsManager.getDashboards().length + 1}`;
        const newDash = await this.settingsManager.addDashboard(name);
        this.onDashboardSwitch(newDash.id);
        this.refreshList();
    }

    private showContextMenu(evt: MouseEvent, dashboard: Dashboard) {
        const menu = new Menu();
        
        // Pin / Unpin
        menu.addItem((item) => {
            item.setTitle(dashboard.isPinned ? '取消置顶' : '置顶')
                .setIcon('pin')
                .onClick(async () => {
                    await this.settingsManager.togglePinDashboard(dashboard.id);
                    this.refreshList();
                });
        });

        menu.addSeparator();

        menu.addItem((item) => {
            item.setTitle('重命名')
                .setIcon('pencil')
                .onClick(() => {
                    new RenameModal(this.app, dashboard.name, async (newName) => {
                        await this.settingsManager.renameDashboard(dashboard.id, newName);
                        this.refreshList();
                    }).open();
                });
        });

        menu.addItem((item) => {
            item.setTitle('删除')
                .setIcon('trash')
                .setWarning(true)
                .onClick(async () => {
                    await this.settingsManager.removeDashboard(dashboard.id);
                    this.refreshList();
                    const activeId = this.settingsManager.getSettings().activeDashboardId;
                    if (activeId) this.onDashboardSwitch(activeId);
                });
        });
        menu.showAtPosition({ x: evt.clientX, y: evt.clientY });
    }

    public toggleCollapse(collapsed: boolean) {
        this.container.toggleClass('is-collapsed', collapsed);
    }

    public destroy() {
        if (this.container) {
            this.container.empty();
            this.container.remove();
        }
    }
}