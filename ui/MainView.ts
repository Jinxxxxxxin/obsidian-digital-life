// === FILE: ui/MainView.ts ===
import { ItemView, WorkspaceLeaf, Notice, Platform } from 'obsidian';
import { SettingsManager } from '../core/SettingsManager';
import { DataEngine } from '../core/DataEngine';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GridCanvas } from './components/GridCanvas';
import { WidgetFactory } from './widgets/WidgetFactory';
import { MoveWidgetModal } from './modals/MoveWidgetModal';

export const VIEW_TYPE_DIGITAL_LIFE = 'digital-life-dashboard-view';

export class MainView extends ItemView {
    private settingsManager: SettingsManager;
    private dataEngine: DataEngine;
    private widgetFactory: WidgetFactory;
    
    private sidebar: Sidebar;
    private header: Header;
    private gridCanvas: GridCanvas;
    
    private isSidebarCollapsed = false;

    constructor(leaf: WorkspaceLeaf, settingsManager: SettingsManager) {
        super(leaf);
        this.settingsManager = settingsManager;
        
        // [核心修复] 必须传入 settingsManager，否则 GitLineProcessor 不会初始化
        this.dataEngine = new DataEngine(this.app, this.settingsManager);
        
        this.widgetFactory = new WidgetFactory(
            this.app,
            this,
            this.dataEngine,
            this.settingsManager, 
            (id) => this.handleDeleteWidget(id),
            (id) => this.handleEditWidget(id),
            (id) => this.handleMoveWidget(id)
        );
    }

    getViewType(): string { return VIEW_TYPE_DIGITAL_LIFE; }
    getDisplayText(): string { return '数字人生'; }
    getIcon(): string { return 'home'; }

    async onOpen(): Promise<void> {
        const root = this.containerEl.children[1] as HTMLElement;
        root.empty();
        root.addClass('dl-main-container');
        
        if (Platform.isMobile) {
            root.addClass('is-mobile');
            this.isSidebarCollapsed = true; 
        }

        const headerEl = root.createDiv();
        this.header = new Header(
            headerEl, 
            this.app, 
            this.settingsManager,
            () => this.toggleSidebar(),
            () => this.toggleEditMode(),
            () => this.gridCanvas.openAddWidgetModal() // 这里触发新增弹窗
        );
        this.header.render();
        
        const bodyContainer = root.createDiv('dl-body-container');

        // 创建侧边栏
        const sidebarEl = bodyContainer.createDiv();
        this.sidebar = new Sidebar(sidebarEl, this.app, this.settingsManager,
            (id) => this.gridCanvas.loadDashboard(id));
        this.sidebar.render();
        
        if (Platform.isMobile) {
            this.sidebar.toggleCollapse(true);
        }

        // 创建内容区域
        const contentArea = bodyContainer.createDiv('dl-content-area');
        
        // 创建遮罩层
        const overlay = bodyContainer.createDiv('dl-overlay');
        overlay.onclick = () => this.toggleSidebar();
        
        // 初始状态下隐藏遮罩层
        // 遮罩层主要用于移动端，桌面端默认隐藏
        if (this.isSidebarCollapsed || !Platform.isMobile) {
            overlay.addClass('is-hidden');
        }
        
        const gridEl = contentArea.createDiv();
        this.gridCanvas = new GridCanvas(gridEl, this.app, this.settingsManager, this.widgetFactory);
        this.gridCanvas.render();

        const activeId = this.settingsManager.getSettings().activeDashboardId;
        if (activeId) this.gridCanvas.loadDashboard(activeId);
    }

    async onClose(): Promise<void> {
        if (this.sidebar) {
            this.sidebar.destroy();
        }
    }

    private toggleSidebar() {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
        this.sidebar.toggleCollapse(this.isSidebarCollapsed);
        
        // 控制遮罩层显示/隐藏
        const overlay = this.containerEl.querySelector('.dl-overlay');
        if (overlay) {
            if (this.isSidebarCollapsed) {
                overlay.addClass('is-hidden');
            } else {
                overlay.removeClass('is-hidden');
            }
        }
    }

    private toggleEditMode() {
        if (Platform.isMobile) {
            new Notice('移动端暂不支持布局编辑，请在桌面端调整。');
            return;
        }
        const isEditing = this.contentEl.querySelector('.dl-grid-canvas.is-editing') !== null;
        this.gridCanvas.setEditMode(!isEditing);
    }

    private async handleDeleteWidget(widgetId: string) {
        const activeId = this.settingsManager.getSettings().activeDashboardId;
        if(!activeId) return;

        const dashboard = this.settingsManager.getDashboard(activeId);
        if(dashboard) {
            dashboard.layout = dashboard.layout.filter(i => i.widgetId !== widgetId);
            await this.settingsManager.saveSettings();
            await this.settingsManager.removeWidget(widgetId);
            this.gridCanvas.loadDashboard(activeId);
        }
    }

    private async handleEditWidget(widgetId: string) {
        const activeId = this.settingsManager.getSettings().activeDashboardId;
        if(!activeId) return;

        const widget = this.settingsManager.getWidget(widgetId);
        if(!widget) return;

        // 动态导入
        const { WidgetConfigModal } = await import('./modals/WidgetConfigModal');
        
        // [核心修复] 传入 this.settingsManager
        new WidgetConfigModal(
            this.app, 
            activeId, 
            this.settingsManager, // Add this
            async (updatedWidget) => {
                await this.settingsManager.saveWidget(updatedWidget);
                this.gridCanvas.loadDashboard(activeId);
            }, 
            widget
        ).open();
    }

    private async handleMoveWidget(widgetId: string) {
        const activeId = this.settingsManager.getSettings().activeDashboardId;
        if (!activeId) return;

        const dashboards = this.settingsManager.getDashboards();
        if (dashboards.length <= 1) {
            new Notice('暂无其他看板可供移动');
            return;
        }

        new MoveWidgetModal(this.app, dashboards, activeId, async (targetDashboardId) => {
            await this.settingsManager.moveWidgetToDashboard(widgetId, targetDashboardId);
            new Notice('组件已移动');
            this.gridCanvas.loadDashboard(activeId);
        }).open();
    }
}