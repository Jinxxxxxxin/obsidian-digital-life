// === FILE: ui/configs/ChartConfigView.ts ===
import { App, TFile, Setting } from 'obsidian';
import { ChartWidget } from '../../core/types';
import { DataEngine } from '../../core/DataEngine';
import { IConfigView } from './IConfigView';
import { BaseConfig } from '../modals/config/BaseConfig';
import { StandardConfig } from '../modals/config/StandardConfig';
import { BubbleConfig } from '../modals/config/BubbleConfig';
import { AdvancedConfig } from '../modals/config/AdvancedConfig';

export class ChartConfigView implements IConfigView<ChartWidget> {
    private app: App;
    private dataEngine: DataEngine;
    private onUpdate: () => void;

    private baseConfig: BaseConfig;
    private standardConfig: StandardConfig;
    private bubbleConfig: BubbleConfig;
    private advancedConfig: AdvancedConfig;

    constructor(app: App, dataEngine: DataEngine, onUpdate: () => void) {
        this.app = app;
        this.dataEngine = dataEngine;
        this.onUpdate = onUpdate;

        this.baseConfig = new BaseConfig(app, dataEngine, onUpdate);
        this.standardConfig = new StandardConfig(app, dataEngine, onUpdate);
        this.bubbleConfig = new BubbleConfig(app, onUpdate);
        this.advancedConfig = new AdvancedConfig(app, onUpdate);
    }

    public render(el: HTMLElement, w: ChartWidget) {
        // 数据防御
        if (!w.dataSources || w.dataSources.length === 0) {
            w.dataSources = [{ id: crypto.randomUUID(), folderPath: '/', filter: { tags: [] } }];
        }
        if (!w.yAxisProperties) w.yAxisProperties = [];

        try {
            // 1. 基础配置 (类型 & 数据源)
            this.baseConfig.render(el, w, () => this.updateAllSuggesters(w));
            el.createEl('hr');

            // 2. 类型特定配置 (Specific Config)
            if (w.chartType === 'bubble') {
                this.bubbleConfig.render(el, w);
            } else if (['heatmap', 'radar', 'histogram'].includes(w.chartType)) {
                this.advancedConfig.render(el, w);
            } else if (w.chartType === 'gitline') {
                // [修复] GitLine 不需要 X/Y 轴配置
                el.createDiv({ 
                    text: 'GitLine 模式：自动根据任务缩进和来源构建分支图。主线为未缩进任务或任务笔记本身。', 
                    style: 'color: var(--text-muted); font-size: 0.9em; padding: 10px; background: var(--background-secondary); border-radius: 4px;' 
                });
            } else {
                // [修复] 只有标准图表 (Bar/Line/Pie/Scatter) 才需要 X/Y 轴配置
                this.standardConfig.render(el, w);
            }

            el.createEl('hr');

            // 3. 显示设置
            el.createEl('h3', { text: '显示设置' });
            
            // GitLine 不需要图例
            if (w.chartType !== 'gitline') {
                new Setting(el).setName('显示图例').addToggle(t => t.setValue(w.showLegend).onChange(v => w.showLegend = v));
                new Setting(el).setName('显示数值').addToggle(t => t.setValue(w.showDataLabels).onChange(v => w.showDataLabels = v));
            } else {
                // GitLine 特有显示设置 (如有需要可在此添加，目前留空)
            }
            
            if (!['bubble', 'heatmap', 'radar', 'gitline'].includes(w.chartType)) {
                new Setting(el).setName('忽略空值').addToggle(t => t.setValue(w.ignoreEmpty).onChange(v => w.ignoreEmpty = v));
                new Setting(el).setName('Y轴范围').setDesc('Min / Max')
                    .addText(t => t.setPlaceholder('Min').setValue(w.yAxisMin !== undefined ? String(w.yAxisMin) : '').onChange(v => w.yAxisMin = v ? Number(v) : undefined))
                    .addText(t => t.setPlaceholder('Max').setValue(w.yAxisMax !== undefined ? String(w.yAxisMax) : '').onChange(v => w.yAxisMax = v ? Number(v) : undefined));
            }

            setTimeout(() => this.updateAllSuggesters(w), 100);
        } catch (e) {
            console.error("Critical Config Error", e);
            el.createDiv({ text: '配置面板渲染错误', style: 'color: red' });
        }
    }

    private async updateAllSuggesters(w: ChartWidget) {
        try {
            if (!w.dataSources || !w.dataSources[0]) return;
            const source = w.dataSources[0];
            let props: string[] = [];
            let tags: string[] = [];

            if (source.type === 'file' && source.filePath) {
                const file = this.app.vault.getAbstractFileByPath(source.filePath);
                if (file instanceof TFile) {
                    const tableData = await this.dataEngine.getMarkdownTableData(file);
                    props = tableData.headers;
                }
            } else {
                const path = source.folderPath || '/';
                props = this.dataEngine.getAvailableProperties(path);
                tags = this.dataEngine.getAvailableTags(path);
            }

            this.baseConfig.updateFilterColumnSuggestions(props);
            
            // 仅当渲染 StandardConfig 时才更新其 Suggesters
            if (!['bubble', 'heatmap', 'radar', 'histogram', 'gitline'].includes(w.chartType)) {
                const { x, y } = this.standardConfig.getSuggesters();
                x.forEach(s => s.setSuggestions(props));
                
                let targetProps = props;
                if (source.type !== 'file' && w.enableLinkPenetration && w.xAxisProperty.length > 0) {
                    targetProps = this.dataEngine.getAvailableLinkedProperties(source.folderPath, w.xAxisProperty);
                }
                y.forEach(s => s.setSuggestions(targetProps));
            }

            if (w.chartType === 'bubble') this.bubbleConfig.updateSuggesters(props);
            if (['heatmap', 'radar', 'histogram'].includes(w.chartType)) this.advancedConfig.updateSuggesters(props, tags);

        } catch (e) {
            console.warn("Suggester update failed", e);
        }
    }
}