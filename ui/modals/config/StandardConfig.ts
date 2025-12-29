// === FILE: ui/modals/config/StandardConfig.ts ===
import { App } from 'obsidian';
import { ChartWidget } from '../../../../core/types';
import { DataEngine } from '../../../../core/DataEngine';
import { PropertySuggest } from '../../../components/Suggesters';
import { YAxisConfig } from './components/YAxisConfig';
import { XAxisConfig } from './components/XAxisConfig';
import { RefLineConfig } from './components/RefLineConfig'; // [新增]

export class StandardConfig {
    private app: App;
    private dataEngine: DataEngine;
    private onUpdate: () => void;
    private xAxisConfig: XAxisConfig;
    private yAxisConfig: YAxisConfig;
    private refLineConfig: RefLineConfig; // [新增]

    constructor(app: App, dataEngine: DataEngine, onUpdate: () => void) {
        this.app = app;
        this.dataEngine = dataEngine;
        this.onUpdate = onUpdate;
        this.xAxisConfig = new XAxisConfig(app, dataEngine, onUpdate);
        this.yAxisConfig = new YAxisConfig(app, onUpdate);
        this.refLineConfig = new RefLineConfig(); // [新增]
    }

    public getSuggesters() {
        return {
            x: this.xAxisConfig.getSuggesters(),
            y: this.yAxisConfig.getSuggesters()
        };
    }

    public render(el: HTMLElement, w: ChartWidget) {
        if (!w.xAxisProperty) w.xAxisProperty = [''];
        if (!w.yAxisProperties) w.yAxisProperties = [];

        try { this.xAxisConfig.render(el, w); } catch (e) { console.error(e); }
        el.createEl('hr');
        try { this.yAxisConfig.render(el, w); } catch (e) { console.error(e); }
        el.createEl('hr');
        // [新增] 渲染参考线配置
        try { this.refLineConfig.render(el, w, this.onUpdate); } catch (e) { console.error(e); }
    }
}