import { BaseChartRenderer, RenderDataset } from './BaseChartRenderer';
import { RefLine } from '../../core/cr_def_type_main';

export class LineChartRenderer extends BaseChartRenderer {
    
    // Soft Macaroon Palette (Low -> High)
    private zoneColors = [
        'rgba(155, 246, 255, 0.4)', // Cyan
        'rgba(202, 255, 191, 0.4)', // Green
        'rgba(253, 255, 182, 0.4)', // Yellow
        'rgba(255, 214, 165, 0.4)', // Orange
        'rgba(255, 173, 173, 0.4)', // Red
        'rgba(189, 178, 255, 0.4)', // Purple
        'rgba(255, 198, 255, 0.4)'  // Pink
    ];

    private getY(val: number, max: number, min: number, height: number, padding: number): number {
        const range = max - min || 1;
        return height - padding - ((val - min) / range) * (height - padding * 2);
    }

    render(datasets: RenderDataset[], labels: string[], width: number, height: number, refLines: RefLine[], showLabels = false, smooth = false, userMin?: number, userMax?: number, enableZones = false): SVGSVGElement {
        const svg = this.createSvg(width, height);
        const padding = 30;
        const chartW = width - padding * 2;
        const { max, min } = this.getRange(datasets, refLines, userMin, userMax);

        // 1. Draw Axes (Background)
        this.drawAxes(svg, labels, max, min, width, height, padding);

        // 2. Automatic Zone Coloring (Clipped Areas)
        if (enableZones && refLines.length > 0) {
            // Sort boundaries: Min -> Ref1 -> Ref2 -> Max
            const bounds = [min, ...refLines.map(r => r.value), max].sort((a, b) => a - b);
            const uniqueBounds = [...new Set(bounds)];

            const defs = document.createElementNS(this.ns, 'defs');
            svg.appendChild(defs);

            for (let i = 0; i < uniqueBounds.length - 1; i++) {
                const bBottom = uniqueBounds[i];
                const bTop = uniqueBounds[i+1];
                
                if (bTop <= bBottom) continue;

                // Define the Zone Strip as a ClipPath
                const yBottomPx = this.getY(bBottom, max, min, height, padding);
                const yTopPx = this.getY(bTop, max, min, height, padding);
                
                const clipId = `zone-strip-${i}-${Math.random().toString(36).substr(2,5)}`;
                const clipPath = document.createElementNS(this.ns, 'clipPath');
                clipPath.setAttribute('id', clipId);
                
                const rect = document.createElementNS(this.ns, 'rect');
                rect.setAttribute('x', padding.toString()); // Restrict to chart area
                rect.setAttribute('width', chartW.toString());
                rect.setAttribute('y', yTopPx.toString()); 
                rect.setAttribute('height', Math.max(0, yBottomPx - yTopPx).toString());
                
                clipPath.appendChild(rect);
                defs.appendChild(clipPath);

                // Draw the Area Path for each dataset, clipped by this strip
                datasets.forEach(ds => {
                    // Generate a closed path from line down to the chart bottom (min)
                    // We use 'min' as the base for the area, so it fills everything up to the line
                    const yBase = this.getY(min, max, min, height, padding);
                    const d = this.generateAreaPath(ds, labels.length, chartW, height, padding, max, min, smooth, yBase);
                    
                    if (d) {
                        const path = document.createElementNS(this.ns, 'path');
                        path.setAttribute('d', d);
                        path.style.fill = this.zoneColors[i % this.zoneColors.length];
                        path.style.stroke = 'none';
                        // The magic: Clip the full area path to just this horizontal strip
                        path.setAttribute('clip-path', `url(#${clipId})`);
                        svg.appendChild(path);
                    }
                });
            }
        }

        // 3. Draw Ref Lines
        refLines.forEach(line => {
            const y = this.getY(line.value, max, min, height, padding);
            if (y > height - padding || y < padding) return; // Clip ref lines too

            const el = document.createElementNS(this.ns, 'line');
            el.setAttribute('x1', padding.toString());
            el.setAttribute('y1', y.toString());
            el.setAttribute('x2', (width - padding).toString());
            el.setAttribute('y2', y.toString());
            el.style.stroke = line.color || '#ff0000';
            el.style.strokeWidth = '1.5';
            el.style.strokeDasharray = '4 2';
            svg.appendChild(el);

            if (line.label) {
                this.drawText(svg, width - padding + 5, y + 3, line.label, 'start', 'dl-axis-text', line.color);
            }
        });

        // 4. Draw Lines and Points (Foreground)
        datasets.forEach(dataset => {
            let dsMax = max, dsMin = min;
            if (dataset.enablePercentage) {
                const valid = dataset.data.filter(v => v !== null) as number[];
                dsMax = valid.length ? Math.max(...valid) : 100;
                dsMin = valid.length ? Math.min(...valid) : 0;
                if (dsMax === dsMin) dsMax += 1;
            }

            const points: {x: number, y: number, val: number, label: string}[] = [];
            dataset.data.forEach((val, i) => {
                if (val === null) return;
                let normVal = val;
                let currentMax = max, currentMin = min;
                if (dataset.enablePercentage) {
                    const range = dsMax - dsMin || 1;
                    normVal = ((val - dsMin) / range) * 100;
                    currentMax = 100; currentMin = 0;
                }
                const div = labels.length > 1 ? labels.length - 1 : 1;
                const x = padding + (i / div) * chartW;
                const y = this.getY(normVal, currentMax, currentMin, height, padding);
                points.push({ x, y, val, label: labels[i] || '' });
            });

            if (points.length > 1) {
                let d = '';
                if (smooth) {
                    d = `M ${points[0].x} ${points[0].y}`;
                    for (let i = 0; i < points.length - 1; i++) {
                        const p0 = points[i];
                        const p1 = points[i + 1];
                        const cp1x = p0.x + (p1.x - p0.x) * 0.5;
                        const cp2x = p1.x - (p1.x - p0.x) * 0.5;
                        d += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
                    }
                } else {
                    d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                }
                const path = document.createElementNS(this.ns, 'path');
                path.setAttribute('d', d);
                path.setAttribute('class', 'dl-chart-line');
                path.style.fill = 'none';
                path.style.stroke = dataset.color;
                path.style.strokeWidth = '2';
                svg.appendChild(path);
            }

            points.forEach(p => {
                const circle = document.createElementNS(this.ns, 'circle');
                circle.setAttribute('cx', p.x.toString());
                circle.setAttribute('cy', p.y.toString());
                circle.setAttribute('r', '3');
                circle.setAttribute('class', 'dl-chart-point');
                circle.style.fill = 'var(--background-primary)';
                circle.style.stroke = dataset.color;
                circle.style.strokeWidth = '2';
                circle.setAttribute('data-tooltip-value', p.val.toString());
                circle.setAttribute('data-tooltip-label', `${p.label} - ${dataset.label}`);
                svg.appendChild(circle);

                if (showLabels) {
                    this.drawText(svg, p.x, p.y - 8, p.val.toString(), 'middle', 'dl-chart-text', 'var(--text-normal)');
                }
            });
        });

        return svg;
    }

    private generateAreaPath(dataset: RenderDataset, count: number, w: number, h: number, pad: number, max: number, min: number, smooth: boolean, yBase: number): string {
        const points: {x: number, y: number}[] = [];
        
        let dsMax = max, dsMin = min;
        if (dataset.enablePercentage) {
            const valid = dataset.data.filter(v => v !== null) as number[];
            dsMax = valid.length ? Math.max(...valid) : 100;
            dsMin = valid.length ? Math.min(...valid) : 0;
            if (dsMax === dsMin) dsMax += 1;
        }

        dataset.data.forEach((val, i) => {
            if (val === null) return;
            let normVal = val;
            let currentMax = max, currentMin = min;
            if (dataset.enablePercentage) {
                const range = dsMax - dsMin || 1;
                normVal = ((val - dsMin) / range) * 100;
                currentMax = 100; currentMin = 0;
            }
            const div = count > 1 ? count - 1 : 1;
            const x = pad + (i / div) * w;
            const y = this.getY(normVal, currentMax, currentMin, h, pad);
            points.push({ x, y });
        });

        if (points.length < 2) return '';

        // Start path at bottom-left (at base Y)
        let d = `M ${points[0].x} ${yBase} L ${points[0].x} ${points[0].y}`;
        
        if (smooth) {
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];
                const cp1x = p0.x + (p1.x - p0.x) * 0.5;
                const cp2x = p1.x - (p1.x - p0.x) * 0.5;
                d += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
            }
        } else {
            for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
        }

        // Close path to bottom-right then back to bottom-left
        d += ` L ${points[points.length-1].x} ${yBase} Z`;
        return d;
    }
}