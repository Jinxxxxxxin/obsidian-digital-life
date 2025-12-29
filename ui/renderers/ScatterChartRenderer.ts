import { BaseChartRenderer, RenderDataset } from './BaseChartRenderer';
import { RefLine } from '../../core/cr_def_type_main';

export class ScatterChartRenderer extends BaseChartRenderer {
    
    private getY(val: number, max: number, min: number, height: number, padding: number): number {
        const range = max - min || 1;
        return height - padding - ((val - min) / range) * (height - padding * 2);
    }

    render(datasets: RenderDataset[], labels: string[], width: number, height: number, refLines: RefLine[], showLabels = false, userMin?: number, userMax?: number): SVGSVGElement {
        const svg = this.createSvg(width, height);
        const padding = 30;
        const chartW = width - padding * 2;
        const { max, min } = this.getRange(datasets, refLines, userMin, userMax);

        this.drawAxes(svg, labels, max, min, width, height, padding);
        this.drawRefLines(svg, refLines, max, min, width, height, padding);

        datasets.forEach(dataset => {
            dataset.data.forEach((val, i) => {
                if (val === null) return;
                
                const div = labels.length > 1 ? labels.length - 1 : 1;
                const x = padding + (i / div) * chartW;
                const y = this.getY(val, max, min, height, padding);

                const circle = document.createElementNS(this.ns, 'circle');
                circle.setAttribute('cx', x.toString());
                circle.setAttribute('cy', y.toString());
                circle.setAttribute('r', '4');
                circle.setAttribute('class', 'dl-chart-point');
                circle.style.fill = dataset.color;
                circle.style.opacity = '0.7';
                circle.style.stroke = dataset.color;
                circle.style.strokeWidth = '0';
                
                circle.setAttribute('data-tooltip-value', val.toString());
                circle.setAttribute('data-tooltip-label', `${labels[i] || ''} - ${dataset.label}`);
                svg.appendChild(circle);

                if (showLabels) {
                    this.drawText(svg, x, y - 8, val.toString(), 'middle', 'dl-chart-text', 'var(--text-normal)');
                }
            });
        });
        return svg;
    }
}