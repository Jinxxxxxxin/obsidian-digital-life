// === FILE: ui/renderers/PieChartRenderer.ts ===
import { BaseChartRenderer, RenderDataset } from './BaseChartRenderer';

interface LabelPos { 
    x: number; y: number; text: string; align: string; 
    isRight: boolean; angle: number; anchorR: number; targetR: number; width: number; 
}

export class PieChartRenderer extends BaseChartRenderer {
    render(dataset: RenderDataset, labels: string[], width: number, height: number, colors: string[], isDonut = false, showLabels = false): SVGSVGElement {
        const svg = this.createSvg(width, height);
        const data = dataset.data.map(v => v || 0);
        const total = data.reduce((a, b) => a + b, 0);
        if (total === 0) return svg;

        let currentAngle = 0;
        const cx = width / 2;
        const cy = height / 2;
        
        // [修复] 响应式边距：如果宽度太小，缩小边距，优先保证图表主体显示
        let margin = showLabels ? 100 : 20;
        if (width < 350) margin = showLabels ? 60 : 10; // 移动端紧凑模式

        const r = Math.min(cx, cy) - margin; 
        if (r <= 0) return svg; // 空间不足不绘制

        const innerR = isDonut ? r * 0.6 : 0;
        const labelItems: LabelPos[] = [];

        data.forEach((val, i) => {
            const sliceAngle = (val / total) * 2 * Math.PI;
            const largeArc = sliceAngle > Math.PI ? 1 : 0;
            
            const x1 = cx + r * Math.cos(currentAngle);
            const y1 = cy + r * Math.sin(currentAngle);
            const x2 = cx + r * Math.cos(currentAngle + sliceAngle);
            const y2 = cy + r * Math.sin(currentAngle + sliceAngle);
            const x3 = cx + innerR * Math.cos(currentAngle + sliceAngle);
            const y3 = cy + innerR * Math.sin(currentAngle + sliceAngle);
            const x4 = cx + innerR * Math.cos(currentAngle);
            const y4 = cy + innerR * Math.sin(currentAngle);

            let d = isDonut 
                ? `M ${x4} ${y4} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`
                : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            const path = document.createElementNS(this.ns, 'path');
            path.setAttribute('d', d);
            path.style.fill = colors[i % colors.length];
            path.style.stroke = 'var(--background-primary)';
            path.style.strokeWidth = '1';
            
            const tooltipVal = val.toFixed(2);
            const percent = (val / total * 100).toFixed(1);
            path.setAttribute('data-tooltip-value', `${tooltipVal} (${percent}%)`);
            path.setAttribute('data-tooltip-label', labels[i] || '');
            
            svg.appendChild(path);

            if (showLabels && sliceAngle > 0.08) { // 略微增加最小角度阈值
                const midAngle = currentAngle + sliceAngle / 2;
                let labelText = labels[i] || '';
                // 移动端截断文字
                const maxLen = width < 350 ? 4 : 8;
                if (labelText.length > maxLen) labelText = labelText.substring(0, maxLen) + '..';
                
                const percentStr = (val/total*100).toFixed(0) + '%';
                const text = `${labelText} ${percentStr}`;
                
                let textW = 0;
                for(let c of text) textW += (c.charCodeAt(0) > 255 ? 12 : 7);
                textW += 6; 

                // 移动端缩短引导线
                const labelR = width < 350 ? r + 5 : r + 15;
                const lx = cx + labelR * Math.cos(midAngle);
                const ly = cy + labelR * Math.sin(midAngle);
                const isRight = Math.cos(midAngle) >= 0;

                labelItems.push({
                    x: lx, y: ly, text, align: isRight ? 'start' : 'end', isRight,
                    angle: midAngle, anchorR: r, targetR: labelR, width: textW
                });
            }
            currentAngle += sliceAngle;
        });

        this.resolveCollisions(labelItems);

        labelItems.forEach(l => {
            const sx = cx + (l.anchorR + 2) * Math.cos(l.angle);
            const sy = cy + (l.anchorR + 2) * Math.sin(l.angle);
            const mx = cx + (l.targetR + 5) * Math.cos(l.angle);
            
            const padding = 5;
            let safeX = l.x;
            if (l.isRight) safeX = Math.min(width - l.width - padding, Math.max(mx + 5, l.x));
            else safeX = Math.max(l.width + padding, Math.min(mx - 5, l.x));
            
            const line = document.createElementNS(this.ns, 'polyline');
            line.setAttribute('points', `${sx},${sy} ${mx},${l.y} ${safeX},${l.y}`);
            line.style.stroke = 'var(--text-muted)';
            line.style.fill = 'none';
            line.style.strokeWidth = '1';
            line.style.opacity = '0.5';
            svg.appendChild(line);

            const bgX = l.isRight ? safeX + 2 : safeX - l.width - 2;
            const bgRect = document.createElementNS(this.ns, 'rect');
            bgRect.setAttribute('x', bgX.toString());
            bgRect.setAttribute('y', (l.y - 10).toString());
            bgRect.setAttribute('width', l.width.toString());
            bgRect.setAttribute('height', '14');
            bgRect.style.fill = 'var(--background-primary)';
            bgRect.style.opacity = '0.6';
            bgRect.setAttribute('rx', '2');
            svg.appendChild(bgRect);

            const textX = l.isRight ? safeX + 4 : safeX - 4;
            this.drawText(svg, textX, l.y + 3, l.text, l.align, 'dl-chart-text', 'var(--text-normal)');
        });

        return svg;
    }

    private resolveCollisions(labels: LabelPos[]) {
        const left = labels.filter(l => !l.isRight).sort((a, b) => a.y - b.y);
        const right = labels.filter(l => l.isRight).sort((a, b) => a.y - b.y);
        const minSpacing = 14; 
        const adjust = (group: LabelPos[]) => {
            for (let i = 1; i < group.length; i++) {
                const prev = group[i-1];
                const curr = group[i];
                if (curr.y < prev.y + minSpacing) curr.y = prev.y + minSpacing;
            }
        };
        adjust(left); adjust(right);
    }
}