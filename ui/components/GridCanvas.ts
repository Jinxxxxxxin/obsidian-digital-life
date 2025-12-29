// === FILE: ui/components/GridCanvas.ts ===
import { App, Menu, Notice, Platform } from 'obsidian';
import { SettingsManager } from '../../core/SettingsManager';
import { WidgetFactory } from '../widgets/WidgetFactory';
import { Dashboard, LayoutItem, Widget } from '../../core/types';
import { WidgetConfigModal } from '../modals/WidgetConfigModal';

interface DragState {
    isDragging: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    item: HTMLElement;
    layoutItem: LayoutItem;
}

interface ResizeState {
    isResizing: boolean;
    startX: number;
    startY: number;
    initialW: number;
    initialH: number;
    item: HTMLElement;
    layoutItem: LayoutItem;
}

export class GridCanvas {
    private container: HTMLElement;
    private app: App;
    private settingsManager: SettingsManager;
    private widgetFactory: WidgetFactory;
    private isEditMode: boolean = false;
    private currentDashboardId: string | null = null;
    
    private dragState: DragState | null = null;
    private resizeState: ResizeState | null = null;
    
    // Grid Constants
    private CELL_HEIGHT = 50;
    private GAP = 16;
    private COLS = 24;

    constructor(container: HTMLElement, app: App, settingsManager: SettingsManager, widgetFactory: WidgetFactory) {
        this.container = container;
        this.app = app;
        this.settingsManager = settingsManager;
        this.widgetFactory = widgetFactory;

        // Global Event Listeners
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    public render() {
        this.container.empty();
        this.container.addClass('dl-grid-canvas-container');
        const canvas = this.container.createDiv('dl-grid-canvas');
        if (this.isEditMode) canvas.addClass('is-editing');
    }

    public setEditMode(enabled: boolean) {
        this.isEditMode = enabled;
        const canvas = this.container.querySelector('.dl-grid-canvas');
        if (canvas) canvas.toggleClass('is-editing', enabled);
        if (this.currentDashboardId) this.loadDashboard(this.currentDashboardId);
    }

    public async loadDashboard(id: string) {
        this.currentDashboardId = id;
        this.settingsManager.setActiveDashboard(id);
        const dashboard = this.settingsManager.getDashboard(id);
        const canvas = this.container.querySelector('.dl-grid-canvas') as HTMLElement;
        
        if (!canvas || !dashboard) return;
        canvas.empty();

        dashboard.layout.forEach(item => {
            const widget = this.settingsManager.getWidget(item.widgetId);
            if (!widget) return;

            const wrapper = canvas.createDiv('dl-grid-item-wrapper');
            wrapper.setAttribute('data-id', item.i);
            
            wrapper.style.gridColumnStart = String(item.x + 1);
            wrapper.style.gridColumnEnd = String(item.x + item.w + 1);
            wrapper.style.gridRowStart = String(item.y + 1);
            wrapper.style.gridRowEnd = String(item.y + item.h + 1);

            const component = this.widgetFactory.create(widget);
            if (component && typeof component.render === 'function') {
                component.render(wrapper);
                if (typeof component.renderContent === 'function') component.renderContent();
            }

            if (this.isEditMode && !Platform.isMobile) {
                const resizeHandle = wrapper.createDiv('dl-resize-handle');
                resizeHandle.addEventListener('mousedown', (e) => this.initResize(e, wrapper, item));
                wrapper.addEventListener('mousedown', (e) => this.initDrag(e, wrapper, item));
            }
        });
    }

    public async openAddWidgetModal() {
        if (!this.currentDashboardId) { new Notice('请先选择或创建一个看板'); return; }
        new WidgetConfigModal(
            this.app, 
            this.currentDashboardId, 
            this.settingsManager, 
            async (widget) => {
                await this.settingsManager.saveWidget(widget);
                await this.addWidgetToLayout(widget.id);
            }
        ).open();
    }

    private async addWidgetToLayout(widgetId: string) {
        const dashboard = this.settingsManager.getDashboard(this.currentDashboardId!);
        if (!dashboard) return;
        
        let y = 0;
        if (dashboard.layout.length > 0) y = Math.max(...dashboard.layout.map(i => i.y + i.h));
        
        const newItem: LayoutItem = { i: crypto.randomUUID(), x: 0, y: y, w: 12, h: 6, widgetId };
        await this.settingsManager.addLayoutItem(this.currentDashboardId!, newItem);
        this.loadDashboard(this.currentDashboardId!);
    }

    // --- Interaction Logic ---

    private initResize(e: MouseEvent, item: HTMLElement, layoutItem: LayoutItem) {
        e.stopPropagation();
        e.preventDefault();
        this.resizeState = {
            isResizing: true,
            startX: e.clientX,
            startY: e.clientY,
            initialW: item.clientWidth,
            initialH: item.clientHeight,
            item: item,
            layoutItem: layoutItem
        };
        item.style.zIndex = '100';
    }

    private initDrag(e: MouseEvent, item: HTMLElement, layoutItem: LayoutItem) {
        if ((e.target as HTMLElement).closest('button, input, select, .dl-resize-handle, .dl-list-item')) return;
        
        e.preventDefault();
        this.dragState = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            initialX: item.offsetLeft,
            initialY: item.offsetTop,
            item: item,
            layoutItem: layoutItem
        };
        item.style.zIndex = '100';
    }

    private handleMouseMove(e: MouseEvent) {
        if (this.resizeState && this.resizeState.isResizing) {
            const dx = e.clientX - this.resizeState.startX;
            const dy = e.clientY - this.resizeState.startY;
            this.resizeState.item.style.width = `${this.resizeState.initialW + dx}px`;
            this.resizeState.item.style.height = `${this.resizeState.initialH + dy}px`;
        } 
        else if (this.dragState && this.dragState.isDragging) {
            const dx = e.clientX - this.dragState.startX;
            const dy = e.clientY - this.dragState.startY;
            this.dragState.item.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }

    private async handleMouseUp(e: MouseEvent) {
        if (!this.currentDashboardId) return;
        const dashboard = this.settingsManager.getDashboard(this.currentDashboardId);
        if (!dashboard) return;

        const canvas = this.container.querySelector('.dl-grid-canvas');
        if (!canvas) return;
        const canvasRect = canvas.getBoundingClientRect();
        const colWidth = (canvasRect.width - (this.COLS - 1) * this.GAP) / this.COLS;

        if (this.resizeState && this.resizeState.isResizing) {
            const { item, layoutItem } = this.resizeState;
            item.style.zIndex = '';
            
            const newPixelW = item.clientWidth;
            const newPixelH = item.clientHeight;
            
            let w = Math.round((newPixelW + this.GAP) / (colWidth + this.GAP));
            let h = Math.round((newPixelH + this.GAP) / (this.CELL_HEIGHT + this.GAP));
            
            w = Math.max(2, Math.min(w, this.COLS - layoutItem.x));
            h = Math.max(2, h);

            layoutItem.w = w;
            layoutItem.h = h;
            
            item.style.width = '';
            item.style.height = '';
            
            // 添加重叠检测和推挤逻辑
            await this.resolveOverlaps(dashboard, layoutItem);
            await this.settingsManager.saveSettings();
            this.loadDashboard(this.currentDashboardId);
            this.resizeState = null;
        } 
        else if (this.dragState && this.dragState.isDragging) {
            const { item, layoutItem, startX, startY } = this.dragState;
            item.style.zIndex = '';
            item.style.transform = '';

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const dCol = Math.round(dx / (colWidth + this.GAP));
            const dRow = Math.round(dy / (this.CELL_HEIGHT + this.GAP));

            let newX = layoutItem.x + dCol;
            let newY = layoutItem.y + dRow;

            newX = Math.max(0, Math.min(newX, this.COLS - layoutItem.w));
            newY = Math.max(0, newY);

            layoutItem.x = newX;
            layoutItem.y = newY;

            // 添加重叠检测和推挤逻辑
            await this.resolveOverlaps(dashboard, layoutItem);
            await this.settingsManager.saveSettings();
            this.loadDashboard(this.currentDashboardId);
            this.dragState = null;
        }
    }

    private async resolveOverlaps(dashboard: Dashboard, activeItem: LayoutItem) {
        // 创建一个临时布局副本，用于计算最终位置
        const layout = [...dashboard.layout];
        
        // 标记需要重新计算位置的组件
        const updated = new Set<string>();
        updated.add(activeItem.i);
        
        // 循环处理，直到没有重叠
        let hasOverlap = true;
        let iterations = 0;
        const maxIterations = 100;
        
        while (hasOverlap && iterations < maxIterations) {
            hasOverlap = false;
            iterations++;
            
            // 按照 Y 坐标排序，从 top 到 bottom 处理
            const sorted = [...layout].sort((a, b) => a.y - b.y);
            
            // 检查所有组件对
            for (let i = 0; i < sorted.length; i++) {
                const A = sorted[i];
                
                for (let j = i + 1; j < sorted.length; j++) {
                    const B = sorted[j];
                    
                    // 检查是否重叠
                    const overlaps = 
                        A.x < B.x + B.w && 
                        A.x + A.w > B.x && 
                        A.y < B.y + B.h && 
                        A.y + A.h > B.y;
                    
                    if (overlaps) {
                        hasOverlap = true;
                        
                        // 确定哪个组件应该被推挤
                        let pusher, pushee;
                        
                        // 如果其中一个是活动组件，活动组件优先
                        if (A.i === activeItem.i) {
                            pusher = A;
                            pushee = B;
                        } else if (B.i === activeItem.i) {
                            pusher = B;
                            pushee = A;
                        } 
                        // 否则，上方的组件优先
                        else if (A.y < B.y) {
                            pusher = A;
                            pushee = B;
                        } 
                        // 同一行，左侧的组件优先
                        else if (A.y === B.y && A.x < B.x) {
                            pusher = A;
                            pushee = B;
                        } 
                        // 其他情况，保持现状
                        else {
                            continue;
                        }
                        
                        // 将被推挤的组件向下移动
                        pushee.y = pusher.y + pusher.h;
                        updated.add(pushee.i);
                    }
                }
            }
        }
        
        // 更新原始布局
        for (const item of dashboard.layout) {
            const temp = layout.find(i => i.i === item.i);
            if (temp) {
                item.x = temp.x;
                item.y = temp.y;
            }
            
            // 边界保护
            item.x = Math.max(0, Math.min(item.x, this.COLS - item.w));
            item.y = Math.max(0, item.y);
        }
    }
}