import { BaseChartRenderer } from './BaseChartRenderer';
import { HeatmapDataResult } from '../../core/cr_eng_data_flow';

export class HeatmapChartRenderer extends BaseChartRenderer {
    render(data: HeatmapDataResult, width: number, height: number): SVGSVGElement {
        const svg = this.createSvg(width, height);
        const padding = 40;
        const chartW = width - padding * 2;
        const chartH = height - padding * 2;
        
        const cols = Math.max(1, data.xLabels.length);
        const rows = Math.max(1, data.yLabels.length);
        const cellW = chartW / cols;
        const cellH = chartH / rows;

        this.drawAxes(svg, data.xLabels, rows, 0, width, height, padding, data.yLabels);

        data.matrix.forEach((row, i) => {
            row.forEach((val, j) => {
                if (val === 0) return;
                const ratio = (val - data.min) / (data.max - data.min || 1);
                
                const rect = document.createElementNS(this.ns, 'rect');
                rect.setAttribute('x', (padding + j * cellW).toString());
                rect.setAttribute('y', (height - padding - (i+1) * cellH).toString());
                rect.setAttribute('width', cellW.toString());
                rect.setAttribute('height', cellH.toString());
                rect.style.fill = 'var(--interactive-accent)';
                rect.style.fillOpacity = String(0.2 + ratio * 0.8);
                
                rect.setAttribute('data-tooltip-value', val.toString());
                rect.setAttribute('data-tooltip-label', `${data.xLabels[j]} / ${data.yLabels[i]}`);
                svg.appendChild(rect);
            });
        });
        return svg;
    }
}