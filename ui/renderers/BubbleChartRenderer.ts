import { BaseChartRenderer } from './BaseChartRenderer';
import { BubblePoint } from '../../core/cr_eng_data_flow';

export class BubbleChartRenderer extends BaseChartRenderer {
    render(points: BubblePoint[], xLabels: string[] | undefined, yLabels: string[] | undefined, width: number, height: number, opacity: number = 0.6): SVGSVGElement {
        const svg = this.createSvg(width, height);
        const padding = 40;
        const chartW = width - padding * 2;
        const chartH = height - padding * 2;

        // Ranges
        const xValues = points.map(p => p.x);
        const yValues = points.map(p => p.y);
        const rValues = points.map(p => p.r);

        const xMax = xLabels ? xLabels.length - 1 : Math.max(...xValues, 100);
        const xMin = xLabels ? 0 : Math.min(...xValues, 0);
        
        const yMax = yLabels ? yLabels.length - 1 : Math.max(...yValues, 100);
        const yMin = yLabels ? 0 : Math.min(...yValues, 0);

        const rMax = Math.max(...rValues, 1);
        const rMin = Math.min(...rValues, 0);

        // Draw Axes
        const axisXLabels = xLabels || [];
        const axisYLabels = yLabels || [];
        
        this.drawAxes(svg, axisXLabels, yMax, yMin, width, height, padding, axisYLabels);

        points.forEach(p => {
            const xRatio = (p.x - xMin) / (xMax - xMin || 1);
            const yRatio = (p.y - yMin) / (yMax - yMin || 1);
            
            const cx = padding + xRatio * chartW;
            const cy = height - padding - yRatio * chartH;

            const rRatio = (p.r - rMin) / (rMax - rMin || 1);
            const radius = 5 + rRatio * 35; // 5px to 40px

            const circle = document.createElementNS(this.ns, 'circle');
            circle.setAttribute('cx', cx.toString());
            circle.setAttribute('cy', cy.toString());
            circle.setAttribute('r', radius.toString());
            circle.setAttribute('class', 'dl-chart-bubble');
            circle.style.fill = 'var(--interactive-accent)';
            circle.style.fillOpacity = String(opacity); // Apply transparency
            circle.style.stroke = 'var(--interactive-accent)';
            circle.style.strokeWidth = '1';
            
            const tooltipLabel = `${p.label}<br/>X: ${p.rawX}<br/>Y: ${p.rawY}<br/>Size: ${p.r}`;
            circle.setAttribute('data-tooltip-value', ' ');
            circle.setAttribute('data-tooltip-label', tooltipLabel);
            
            svg.appendChild(circle);
        });

        return svg;
    }
}