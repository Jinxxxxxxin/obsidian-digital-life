// === FILE: ui/renderers/BaseChartRenderer.ts ===
import { RefLine } from '../../core/types';
import { AxisGenerator } from './helpers/AxisGenerator'; // [新增]

export interface RenderDataset {
    label: string;
    data: (number | null)[];
    color: string;
    enablePercentage?: boolean;
}

export class BaseChartRenderer {
    protected ns = 'http://www.w3.org/2000/svg';
    protected axisGenerator: AxisGenerator;

    constructor() {
        this.axisGenerator = new AxisGenerator();
    }

    createSvg(width: number, height: number): SVGSVGElement {
        const svg = document.createElementNS(this.ns, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        return svg;
    }

    // 代理绘制方法，保持原有子类兼容性
    protected drawAxes(svg: SVGSVGElement, labels: string[], max: number, min: number, w: number, h: number, pad: number, yLabels?: string[], isHorizontal = false) {
        this.axisGenerator.drawAxes(svg, labels, max, min, w, h, pad, isHorizontal);
    }

    protected drawText(svg: SVGSVGElement, x: number, y: number, text: string, anchor: string, cls = 'dl-chart-text', fill?: string) {
        const el = document.createElementNS(this.ns, 'text');
        el.setAttribute('x', x.toString());
        el.setAttribute('y', y.toString());
        el.setAttribute('text-anchor', anchor);
        el.setAttribute('class', cls);
        if (fill) el.style.fill = fill;
        el.textContent = text;
        svg.appendChild(el);
    }

    protected getRange(datasets: RenderDataset[], refLines: RefLine[], userMin?: number, userMax?: number): { max: number, min: number } {
        const isAllPercent = datasets.every(d => d.enablePercentage);
        if (isAllPercent) return { max: 100, min: 0 };

        let allValues: number[] = [];
        datasets.forEach(d => {
            if (!d.enablePercentage) {
                d.data.forEach(v => { if (v !== null) allValues.push(v); });
            }
        });
        refLines.forEach(r => allValues.push(r.value));
        
        let max = userMax !== undefined ? userMax : (allValues.length ? Math.max(...allValues) : 100);
        let min = userMin !== undefined ? userMin : (allValues.length ? Math.min(...allValues) : 0);
        
        if (max === min) {
            max += 5;
            min -= 5;
        }
        return { max, min };
    }

    protected drawRefLines(svg: SVGSVGElement, refLines: RefLine[], max: number, min: number, w: number, h: number, pad: number) {
        const chartH = h - pad * 2;
        const range = max - min || 1;

        refLines.forEach(line => {
            const y = h - pad - ((line.value - min) / range) * chartH;
            const el = document.createElementNS(this.ns, 'line');
            el.setAttribute('x1', pad.toString());
            el.setAttribute('y1', y.toString());
            el.setAttribute('x2', (w - pad).toString());
            el.setAttribute('y2', y.toString());
            el.style.stroke = line.color || 'var(--text-error)';
            el.style.strokeWidth = '1';
            el.style.strokeDasharray = '4 2';
            svg.appendChild(el);
        });
    }
}