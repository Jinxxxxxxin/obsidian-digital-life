// === FILE: ui/widgets/ChartRendererFactory.ts ===
import { App } from 'obsidian';
import { BarChartRenderer } from '../renderers/BarChartRenderer';
import { LineChartRenderer } from '../renderers/LineChartRenderer';
import { ScatterChartRenderer } from '../renderers/ScatterChartRenderer';
import { RadarChartRenderer } from '../renderers/RadarChartRenderer';
import { HeatmapChartRenderer } from '../renderers/HeatmapChartRenderer';
import { PieChartRenderer } from '../renderers/PieChartRenderer';
import { BubbleChartRenderer } from '../renderers/BubbleChartRenderer';
import { GitLineChartRenderer } from '../renderers/GitLineChartRenderer';

export class ChartRendererFactory {
    private barRenderer = new BarChartRenderer();
    private lineRenderer = new LineChartRenderer();
    private scatterRenderer = new ScatterChartRenderer();
    private radarRenderer = new RadarChartRenderer();
    private heatmapRenderer = new HeatmapChartRenderer();
    private pieRenderer = new PieChartRenderer();
    private bubbleRenderer = new BubbleChartRenderer();
    private gitLineRenderer: GitLineChartRenderer;
    
    constructor(private app: App) {
        this.gitLineRenderer = new GitLineChartRenderer(app);
    }

    getBarRenderer() {
        return this.barRenderer;
    }

    getLineRenderer() {
        return this.lineRenderer;
    }

    getScatterRenderer() {
        return this.scatterRenderer;
    }

    getRadarRenderer() {
        return this.radarRenderer;
    }

    getHeatmapRenderer() {
        return this.heatmapRenderer;
    }

    getPieRenderer() {
        return this.pieRenderer;
    }

    getBubbleRenderer() {
        return this.bubbleRenderer;
    }

    getGitLineRenderer() {
        return this.gitLineRenderer;
    }
}