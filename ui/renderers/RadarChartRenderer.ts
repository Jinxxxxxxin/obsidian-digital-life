// === FILE: ui/renderers/RadarChartRenderer.ts ===
import { BaseChartRenderer, RenderDataset } from './BaseChartRenderer';

export class RadarChartRenderer extends BaseChartRenderer {
    render(datasets: RenderDataset[], labels: string[], width: number, height: number): SVGSVGElement {
        const svg = this.createSvg(width, height);
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(cx, cy) - 40;
        
        // [修复] 防止除零，至少视为 1 个维度
        const count = Math.max(1, labels.length);
        const angleStep = (Math.PI * 2) / count;

        // 1. Draw Web (Grid)
        // 如果只有 1 个维度，画同心圆轴而不是多边形网
        if (count === 1) {
            for (let level = 1; level <= 5; level++) {
                const levelR = r * (level / 5);
                const circle = document.createElementNS(this.ns, 'circle');
                circle.setAttribute('cx', cx.toString());
                circle.setAttribute('cy', cy.toString());
                circle.setAttribute('r', levelR.toString());
                circle.style.fill = 'none';
                circle.style.stroke = 'var(--text-muted)';
                circle.style.strokeOpacity = '0.1';
                svg.appendChild(circle);
            }
        } else {
            // 多个维度画蜘蛛网
            for (let level = 1; level <= 5; level++) {
                const levelR = r * (level / 5);
                const points: string[] = [];
                for (let i = 0; i < count; i++) {
                    const angle = i * angleStep - Math.PI / 2;
                    const x = cx + levelR * Math.cos(angle);
                    const y = cy + levelR * Math.sin(angle);
                    points.push(`${x},${y}`);
                }
                const poly = document.createElementNS(this.ns, 'polygon');
                poly.setAttribute('points', points.join(' '));
                poly.style.fill = 'none';
                poly.style.stroke = 'var(--text-muted)';
                poly.style.strokeOpacity = '0.2';
                svg.appendChild(poly);
            }
        }

        // 2. Axis Lines & Labels
        labels.forEach((l, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const lx = cx + (r + 20) * Math.cos(angle);
            const ly = cy + (r + 20) * Math.sin(angle);
            
            const ax = cx + r * Math.cos(angle);
            const ay = cy + r * Math.sin(angle);
            
            const line = document.createElementNS(this.ns, 'line');
            line.setAttribute('x1', cx.toString());
            line.setAttribute('y1', cy.toString());
            line.setAttribute('x2', ax.toString());
            line.setAttribute('y2', ay.toString());
            line.style.stroke = 'var(--text-muted)';
            line.style.strokeOpacity = '0.2';
            svg.appendChild(line);

            this.drawText(svg, lx, ly, l, 'middle', 'dl-axis-text');
        });

        // 3. Data Polygons & Points
        datasets.forEach((ds) => {
            const validData = ds.data.map(v => v || 0);
            const maxVal = Math.max(...validData, 1); 
            
            const points: {x:number, y:number}[] = [];
            validData.forEach((val, i) => {
                const norm = val / maxVal;
                const angle = i * angleStep - Math.PI / 2;
                const x = cx + (r * norm) * Math.cos(angle);
                const y = cy + (r * norm) * Math.sin(angle);
                points.push({x, y});
            });

            // 绘制区域 (容错处理)
            if (count > 2) {
                // 3+ 维度：画多边形
                const poly = document.createElementNS(this.ns, 'polygon');
                poly.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
                poly.style.fill = ds.color;
                poly.style.fillOpacity = '0.3';
                poly.style.stroke = ds.color;
                poly.style.strokeWidth = '2';
                svg.appendChild(poly);
            } else if (count === 2) {
                // 2 维度：画一条线
                const line = document.createElementNS(this.ns, 'polyline');
                line.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
                line.style.fill = 'none';
                line.style.stroke = ds.color;
                line.style.strokeWidth = '2';
                svg.appendChild(line);
            } else {
                // 1 维度：画一条从中心到点的线（射线）
                const line = document.createElementNS(this.ns, 'line');
                line.setAttribute('x1', cx.toString());
                line.setAttribute('y1', cy.toString());
                line.setAttribute('x2', points[0].x.toString());
                line.setAttribute('y2', points[0].y.toString());
                line.style.stroke = ds.color;
                line.style.strokeWidth = '4';
                svg.appendChild(line);
            }

            // [新增] 绘制数据点圆点 (增强可见性)
            points.forEach((p, i) => {
                const dot = document.createElementNS(this.ns, 'circle');
                dot.setAttribute('cx', p.x.toString());
                dot.setAttribute('cy', p.y.toString());
                dot.setAttribute('r', '4');
                dot.style.fill = ds.color;
                dot.style.stroke = 'var(--background-primary)';
                dot.style.strokeWidth = '1';
                
                // Tooltip
                const val = validData[i];
                dot.setAttribute('data-tooltip-value', val.toString());
                dot.setAttribute('data-tooltip-label', labels[i]);
                
                svg.appendChild(dot);
            });
        });

        return svg;
    }
}