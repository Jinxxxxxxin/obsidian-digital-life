// === FILE: ui/modals/config/AdvancedConfig.ts ===
import { App } from 'obsidian';
import { ChartWidget } from '../../../core/cr_def_type_main';
import { RadarSettings, HeatmapSettings, HistogramSettings } from './components/AdvancedSettings';

export class AdvancedConfig {
    private app: App;
    private onUpdate: () => void;
    private radarSettings: RadarSettings;
    private heatmapSettings: HeatmapSettings;
    private histogramSettings: HistogramSettings;

    constructor(app: App, onUpdate: () => void) {
        this.app = app;
        this.onUpdate = onUpdate;
        this.radarSettings = new RadarSettings(app, onUpdate);
        this.heatmapSettings = new HeatmapSettings(app, onUpdate);
        this.histogramSettings = new HistogramSettings(app, onUpdate);
    }

    // [核心] 接收 tags 参数
    public updateSuggesters(props: string[], tags: string[] = []) {
        this.radarSettings.updateSuggesters(props, tags);
        this.heatmapSettings.updateSuggesters(props);
        this.histogramSettings.updateSuggesters(props);
    }

    // 获取除雷达图以外的建议器（雷达图自己管理更新了）
    public getSuggesters() {
        return [
            ...this.heatmapSettings.getSuggesters(),
            ...this.histogramSettings.getSuggesters()
        ];
    }

    public render(el: HTMLElement, w: ChartWidget) {
        if (w.chartType === 'heatmap') this.heatmapSettings.render(el, w);
        else if (w.chartType === 'radar') this.radarSettings.render(el, w);
        else if (w.chartType === 'histogram') this.histogramSettings.render(el, w);
    }
}