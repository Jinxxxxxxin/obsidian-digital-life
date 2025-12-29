// === FILE: core/SettingsManager.ts ===
import { Plugin } from 'obsidian';
import { DigitalLifePluginSettings, DEFAULT_SETTINGS, Dashboard, Widget, LayoutItem } from './types';

export class SettingsManager {
    private plugin: Plugin;
    private settings: DigitalLifePluginSettings;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
        this.settings = DEFAULT_SETTINGS;
    }

    async loadSettings(): Promise<void> {
        const loadedData = await this.plugin.loadData();
        
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
        
        // 确保深层对象存在
        if (!this.settings.formula) this.settings.formula = { ...DEFAULT_SETTINGS.formula };
        if (!this.settings.taskManagement) this.settings.taskManagement = { ...DEFAULT_SETTINGS.taskManagement };
        
        if (loadedData?.formula) this.settings.formula = { ...DEFAULT_SETTINGS.formula, ...loadedData.formula };
        if (loadedData?.taskManagement) this.settings.taskManagement = { ...DEFAULT_SETTINGS.taskManagement, ...loadedData.taskManagement };
    }

    async saveSettings(): Promise<void> {
        await this.plugin.saveData(this.settings);
    }

    getSettings(): DigitalLifePluginSettings { return this.settings; }
    getDashboards(): Dashboard[] { return this.settings.dashboards; }
    getDashboard(id: string): Dashboard | undefined { return this.settings.dashboards.find(d => d.id === id); }
    getWidget(id: string): Widget | undefined { return this.settings.widgets.find(w => w.id === id); }

    // ... (Add/Remove Dashboard/Widget/Layout 方法保持不变，省略以节省空间) ...
    async addDashboard(name: string): Promise<Dashboard> {
        const newDashboard: Dashboard = { id: crypto.randomUUID(), name, layout: [], createdAt: Date.now(), updatedAt: Date.now(), isPinned: false };
        this.settings.dashboards.push(newDashboard);
        if (!this.settings.activeDashboardId) this.settings.activeDashboardId = newDashboard.id;
        await this.saveSettings(); return newDashboard;
    }
    async renameDashboard(id: string, newName: string): Promise<void> { const d = this.getDashboard(id); if (d) { d.name = newName; d.updatedAt = Date.now(); await this.saveSettings(); } }
    async togglePinDashboard(id: string): Promise<void> { const d = this.getDashboard(id); if (d) { d.isPinned = !d.isPinned; this.sortDashboardsByPinStatus(); await this.saveSettings(); } }
    async updateDashboardProperties(id: string, props: Partial<Dashboard>): Promise<void> { const d = this.getDashboard(id); if (d) { Object.assign(d, props); d.updatedAt = Date.now(); await this.saveSettings(); } }
    private sortDashboardsByPinStatus() { this.settings.dashboards.sort((a, b) => { if (a.isPinned === b.isPinned) return 0; return a.isPinned ? -1 : 1; }); }
    async reorderDashboards(newOrderIds: string[]): Promise<void> {
        const currentMap = new Map(this.settings.dashboards.map(d => [d.id, d]));
        const newDashboards: Dashboard[] = [];
        newOrderIds.forEach(id => { const d = currentMap.get(id); if (d) newDashboards.push(d); });
        this.settings.dashboards.forEach(d => { if (!newDashboards.includes(d)) newDashboards.push(d); });
        this.settings.dashboards = newDashboards; await this.saveSettings();
    }
    async removeDashboard(id: string): Promise<void> {
        this.settings.dashboards = this.settings.dashboards.filter(d => d.id !== id);
        if (this.settings.activeDashboardId === id) this.settings.activeDashboardId = this.settings.dashboards.length > 0 ? this.settings.dashboards[0].id : null;
        await this.saveSettings();
    }
    async setActiveDashboard(id: string): Promise<void> { if (this.settings.dashboards.some(d => d.id === id)) { this.settings.activeDashboardId = id; await this.saveSettings(); } }
    async saveWidget(widget: Widget): Promise<void> { const index = this.settings.widgets.findIndex(w => w.id === widget.id); if (index >= 0) this.settings.widgets[index] = widget; else this.settings.widgets.push(widget); await this.saveSettings(); }
    async removeWidget(id: string): Promise<void> { this.settings.widgets = this.settings.widgets.filter(w => w.id !== id); await this.saveSettings(); }
    async addLayoutItem(dashboardId: string, item: LayoutItem): Promise<void> { const d = this.getDashboard(dashboardId); if (d) { d.layout.push(item); await this.saveSettings(); } }
    async updateLayout(dashboardId: string, layout: LayoutItem[]): Promise<void> { const d = this.getDashboard(dashboardId); if (d) { d.layout = layout; await this.saveSettings(); } }
    async moveWidgetToDashboard(widgetId: string, targetDashboardId: string): Promise<void> {
        const widget = this.getWidget(widgetId); if (!widget) return; const sourceDashboardId = widget.dashboardId; if (sourceDashboardId === targetDashboardId) return;
        const sourceDashboard = this.getDashboard(sourceDashboardId); const targetDashboard = this.getDashboard(targetDashboardId);
        if (sourceDashboard && targetDashboard) {
            sourceDashboard.layout = sourceDashboard.layout.filter(i => i.widgetId !== widgetId);
            const y = targetDashboard.layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
            const newLayoutItem: LayoutItem = { i: crypto.randomUUID(), x: 0, y: y, w: 12, h: 6, widgetId: widgetId };
            targetDashboard.layout.push(newLayoutItem); widget.dashboardId = targetDashboardId; await this.saveSettings();
        }
    }
}