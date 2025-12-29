// === FILE: ui/widgets/ChartWidget.ts ===
import { App } from 'obsidian';
import { BaseWidget } from './BaseWidget';
import { ChartWidget as IChartWidget } from '../../core/types';
import { DataEngine } from '../../core/DataEngine';
import { RenderDataset } from '../renderers/BaseChartRenderer';
import { Platform } from 'obsidian';
import { ColorUtils } from '../../core/utils/ColorUtils';
import { ChartLegendManager } from './ChartLegendManager';
import { ChartTooltipManager } from './ChartTooltipManager';
import { ChartRendererFactory } from './ChartRendererFactory';

export class ChartWidget extends BaseWidget {
    private app: App;
    private dataEngine: DataEngine;
    private legendManager: ChartLegendManager;
    private tooltipManager: ChartTooltipManager;
    private rendererFactory: ChartRendererFactory;

    constructor(
        widget: IChartWidget,
        app: App,
        dataEngine: DataEngine,
        onDelete: () => void,
        onEdit: () => void,
        onMove: () => void
    ) {
        super(widget, onDelete, onEdit, onMove);
        this.app = app;
        this.dataEngine = dataEngine;
        this.legendManager = new ChartLegendManager(this.contentEl);
        this.tooltipManager = new ChartTooltipManager();
        this.rendererFactory = new ChartRendererFactory(app);
    }

    // =========================
    // 核心渲染入口
    // =========================
    public async renderContent(): Promise<void> {
        const w = this.widget as IChartWidget;
        const refLines = w.refLines || [];
        const yAxisProps = w.yAxisProperties || [];
        const showDataLabels = w.showDataLabels || false;

        // 确保legendManager的container已正确设置
        this.legendManager.setContainer(this.contentEl);
        
        this.contentEl.empty();
        this.legendManager.removeExistingLegend();
        this.contentEl.addClass('dl-widget-content');

        if (!w.dataSources || w.dataSources.length === 0) {
            this.contentEl.createDiv({ text: '未配置数据源', cls: 'dl-no-data' });
            return;
        }

        try {
            this.contentEl.addClass('is-loading');

            const rect = this.contentEl.getBoundingClientRect();
            let width = rect.width;
            let height = rect.height;

            if (Platform.isMobile) {
                if (height < 100) height = 260;
                if (width < 50) width = this.container.clientWidth || window.innerWidth - 32;
            } else {
                if (height < 50) height = 200;
                if (width < 50) width = 300;
            }

            const wrapper = this.contentEl.createDiv({ cls: 'dl-chart-wrapper' });
            let svg: SVGSVGElement | null = null;

            // 供 legend 复用的数据
            let standardDatasets: any[] = [];
            let standardLabels: string[] = [];

            // ===== GitLine =====
            if (w.chartType === 'gitline') {
                const tasks = await this.dataEngine.getGitLineData(w);
                this.contentEl.removeClass('is-loading');

                if (!tasks.length) {
                    wrapper.createDiv({ text: '无任务数据', cls: 'dl-no-data' });
                    return;
                }

                const chartEl = this.rendererFactory.getGitLineRenderer().render(tasks, width, height, w.isHorizontal);
                wrapper.appendChild(chartEl);
                wrapper.style.overflow = 'hidden';
                return;
            }

            // ===== Bubble =====
            if (w.chartType === 'bubble') {
                const { points, xLabels, yLabels } = await this.dataEngine.getBubbleData(w);
                this.contentEl.removeClass('is-loading');

                if (!points.length) {
                    wrapper.createDiv({ text: '无数据', cls: 'dl-no-data' });
                    return;
                }

                svg = this.rendererFactory.getBubbleRenderer().render(points, xLabels, yLabels, width, height);
            }

            // ===== Heatmap =====
            else if (w.chartType === 'heatmap') {
                const data = await this.dataEngine.getHeatmapData(w);
                this.contentEl.removeClass('is-loading');
                svg = this.rendererFactory.getHeatmapRenderer().render(data, width, height);
            }

            // ===== 标准图表 =====
            else {
                const result = await this.dataEngine.getChartData(w);
                standardLabels = result.labels;
                standardDatasets = result.datasets;

                this.contentEl.removeClass('is-loading');

                standardDatasets.forEach((d, i) => {
                    if (!d.color) {
                        d.color = yAxisProps[i]?.color || ColorUtils.getColor(i);
                    }
                });

                if (!standardDatasets.some(d => d.data.some((v: any) => v !== null))) {
                    wrapper.createDiv({ text: '无数据', cls: 'dl-no-data' });
                    return;
                }

                if (w.chartType === 'pie') {
                    const isTranspose = standardDatasets.length === 1 && standardLabels.length > 1;
                    const pieData = isTranspose
                        ? standardDatasets[0].data.map((v: any) => v || 0)
                        : standardDatasets.map(ds => ds.data.reduce((a: any, b: any) => (a || 0) + (b || 0), 0));

                    const pieLabels = isTranspose
                        ? standardLabels
                        : standardDatasets.map(ds => ds.label);

                    const pieColors = pieLabels.map((_, i) => ColorUtils.getColor(i));
                    const single: RenderDataset = { label: 'Total', data: pieData, color: '' };

                    svg = this.rendererFactory.getPieRenderer().render(single, pieLabels, width, height, pieColors, w.isDonut, showDataLabels);
                } else if (w.chartType === 'line') {
                    svg = this.rendererFactory.getLineRenderer().render(
                        standardDatasets,
                        standardLabels,
                        width,
                        height,
                        refLines,
                        showDataLabels,
                        w.enableSmoothCurve,
                        w.yAxisMin,
                        w.yAxisMax,
                        w.enableRefLineZones
                    );
                } else if (w.chartType === 'scatter') {
                    svg = this.rendererFactory.getScatterRenderer().render(
                        standardDatasets,
                        standardLabels,
                        width,
                        height,
                        refLines,
                        showDataLabels,
                        w.yAxisMin,
                        w.yAxisMax
                    );
                } else if (w.chartType === 'radar') {
                    svg = this.rendererFactory.getRadarRenderer().render(standardDatasets, standardLabels, width, height);
                } else {
                    svg = this.rendererFactory.getBarRenderer().render(
                        standardDatasets,
                        standardLabels,
                        width,
                        height,
                        refLines,
                        showDataLabels,
                        w.yAxisMin,
                        w.yAxisMax,
                        w.isStacked,
                        w.isHorizontal
                    );
                }
            }

            // ===== SVG + Legend =====
            if (svg) {
                wrapper.appendChild(svg);
                this.tooltipManager.attachTooltip(svg);

                this.legendManager.removeExistingLegend();

                if (w.showLegend && !['bubble', 'heatmap', 'gitline'].includes(w.chartType)) {
                    const labels = standardDatasets.map(d => d.label);
                    const colors = standardDatasets.map(d => d.color);

                    const seen = new Set<string>();
                    const finalLabels: string[] = [];
                    const finalColors: string[] = [];

                    labels.forEach((l, i) => {
                        const key = l?.trim();
                        if (key && !seen.has(key)) {
                            seen.add(key);
                            finalLabels.push(key);
                            finalColors.push(colors[i]);
                        }
                    });

                    this.legendManager.renderLegend(finalLabels, finalColors);
                }
            }
        } catch (e) {
            console.error('Chart Render Error:', e);
            this.contentEl.empty();
            this.contentEl.createDiv({ text: '图表渲染错误', cls: 'dl-error-msg' });
        }
    }
}
