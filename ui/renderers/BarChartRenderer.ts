// === FILE: ui/renderers/BarChartRenderer.ts ===
import { BaseChartRenderer, RenderDataset } from './BaseChartRenderer';
import { RefLine } from '../../core/cr_def_type_main';

export class BarChartRenderer extends BaseChartRenderer {
    
    // [修改] 增加 isHistogram 参数
    render(datasets: RenderDataset[], labels: string[], width: number, height: number, refLines: RefLine[], showLabels = false, userMin?: number, userMax?: number, isStacked = false, isHorizontal = false, isHistogram = false): SVGSVGElement {
        const svg = this.createSvg(width, height);
        const padding = 40;
        const chartW = width - padding * 2;
        const chartH = height - padding * 2;
        
        let max, min;
        if (isStacked) {
            const sums = labels.map((_, i) => datasets.reduce((acc, d) => acc + (d.data[i] || 0), 0));
            max = userMax !== undefined ? userMax : Math.max(...sums, 0);
            min = userMin !== undefined ? userMin : 0; 
        } else {
            const r = this.getRange(datasets, refLines, userMin, userMax);
            max = r.max; min = r.min;
        }

        this.drawAxes(svg, labels, max, min, width, height, padding, undefined, isHorizontal);
        if (!isHorizontal) this.drawRefLines(svg, refLines, max, min, width, height, padding);

        const itemCount = labels.length || 1;
        
        if (isHorizontal) {
            // 水平条形图逻辑保持不变 (直方图通常是垂直的)
            const groupHeight = chartH / itemCount;
            const barHeight = isStacked ? groupHeight * 0.6 : (groupHeight * 0.8) / datasets.length;

            datasets.forEach((dataset, setIndex) => {
                dataset.data.forEach((val, i) => {
                    if (val === null) return;
                    let leftVal = 0;
                    if (isStacked) {
                        for(let k=0; k<setIndex; k++) leftVal += (datasets[k].data[i] || 0);
                    }
                    const rightVal = leftVal + val;
                    
                    if (rightVal < min || leftVal > max) return;

                    const visibleLeft = Math.max(min, Math.min(max, leftVal));
                    const visibleRight = Math.max(min, Math.min(max, rightVal));
                    
                    const wTotal = ((visibleRight - min) / (max - min || 1)) * chartW;
                    const wStart = ((visibleLeft - min) / (max - min || 1)) * chartW;
                    let barW = Math.abs(wTotal - wStart);

                    if (val !== 0 && barW < 5) barW = 5;

                    const yGroup = padding + i * groupHeight + (groupHeight * 0.1);
                    const y = isStacked ? yGroup + (groupHeight * 0.2) : yGroup + setIndex * barHeight;
                    const x = padding + wStart;

                    const rect = document.createElementNS(this.ns, 'rect');
                    rect.setAttribute('x', x.toString());
                    rect.setAttribute('y', y.toString());
                    rect.setAttribute('width', Math.max(0, barW).toString());
                    rect.setAttribute('height', barHeight.toString());
                    rect.setAttribute('class', 'dl-chart-bar');
                    rect.style.fill = dataset.color;
                    rect.setAttribute('data-tooltip-value', val.toString());
                    rect.setAttribute('data-tooltip-label', `${labels[i]} - ${dataset.label}`);
                    svg.appendChild(rect);

                    if (showLabels) {
                        const labelX = x + barW;
                        if (labelX >= padding && labelX <= width - padding) {
                            this.drawText(svg, labelX + 5, y + barHeight/2 + 4, val.toString(), 'start', 'dl-chart-text', 'var(--text-normal)');
                        }
                    }
                });
            });
        } else {
            const groupWidth = chartW / itemCount;
            
            // [核心修改] 直方图模式下，去除间隙
            let barWidth: number;
            let groupPadding = 0;

            if (isHistogram) {
                barWidth = groupWidth; // 占满整个分组宽度
                groupPadding = 0;      // 无内边距
            } else {
                // 普通柱状图保持原有间隙
                barWidth = isStacked ? groupWidth * 0.6 : (groupWidth * 0.8) / datasets.length;
                groupPadding = groupWidth * 0.1;
            }

            datasets.forEach((dataset, setIndex) => {
                dataset.data.forEach((val, i) => {
                    if (val === null) return;
                    
                    let bottomVal = 0;
                    if (isStacked) {
                        for(let k=0; k<setIndex; k++) bottomVal += (datasets[k].data[i] || 0);
                    }
                    const topVal = bottomVal + val;

                    if (topVal < min || bottomVal > max) return;

                    const visibleBottom = Math.max(min, Math.min(max, bottomVal));
                    const visibleTop = Math.max(min, Math.min(max, topVal));

                    const barTopH = ((visibleTop - min) / (max - min || 1)) * chartH;
                    const barBottomH = ((visibleBottom - min) / (max - min || 1)) * chartH;
                    let barH = barTopH - barBottomH;

                    if (val !== 0 && barH < 5) barH = 5;

                    // 计算 X 坐标
                    const groupX = padding + i * groupWidth + groupPadding;
                    // 直方图只有一个系列，setIndex=0，直接使用 groupX
                    const x = (isStacked || isHistogram) ? groupX : groupX + setIndex * barWidth;
                    
                    const y = (height - padding - barBottomH) - barH;

                    const rect = document.createElementNS(this.ns, 'rect');
                    rect.setAttribute('x', x.toString());
                    rect.setAttribute('y', y.toString());
                    rect.setAttribute('width', barWidth.toString());
                    rect.setAttribute('height', Math.max(0, barH).toString());
                    rect.setAttribute('class', 'dl-chart-bar');
                    rect.style.fill = dataset.color;
                    
                    // [新增] 直方图描边：用背景色描边，区分相邻柱子
                    if (isHistogram) {
                        rect.style.stroke = 'var(--background-primary)';
                        rect.style.strokeWidth = '1';
                    }

                    rect.setAttribute('data-tooltip-value', val.toString());
                    rect.setAttribute('data-tooltip-label', `${labels[i]} - ${dataset.label}`);
                    svg.appendChild(rect);

                    if (showLabels) {
                        this.drawText(svg, x + barWidth / 2, y - 5, val.toString(), 'middle', 'dl-chart-text', 'var(--text-normal)');
                    }
                });
            });
        }

        return svg;
    }
}