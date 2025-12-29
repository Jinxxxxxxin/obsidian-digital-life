// === FILE: ui/renderers/helpers/AxisGenerator.ts ===
export class AxisGenerator {
    private ns = 'http://www.w3.org/2000/svg';

    public drawAxes(
        svg: SVGSVGElement, 
        labels: string[], 
        max: number, 
        min: number, 
        w: number, 
        h: number, 
        pad: number, 
        isHorizontal = false
    ) {
        const xAxisY = h - pad;
        const yAxisX = pad;
        const chartW = w - pad * 2;
        const chartH = h - pad * 2;

        // Draw Lines
        this.drawLine(svg, pad, xAxisY, w - pad, xAxisY); // X Axis
        this.drawLine(svg, yAxisX, pad, yAxisX, xAxisY); // Y Axis

        if (isHorizontal) {
            // Y Axis = Labels
            if (labels.length > 0) {
                const stepH = chartH / labels.length;
                labels.forEach((label, i) => {
                    const y = pad + i * stepH + stepH / 2;
                    this.drawText(svg, yAxisX - 5, y + 4, label, 'end');
                });
            }
            // X Axis = Values
            const steps = 5;
            for (let i = 0; i <= steps; i++) {
                const val = min + (max - min) * (i / steps);
                const x = pad + (i / steps) * chartW;
                this.drawText(svg, x, xAxisY + 15, Math.round(val).toString(), 'middle');
            }
        } else {
            // X Axis = Labels (Optimized)
            if (labels.length > 0) {
                const maxLabelLen = labels.reduce((max, l) => Math.max(max, (l || '').length), 0);
                const estLabelWidth = Math.max(30, maxLabelLen * 7); 
                const maxVisibleLabels = Math.max(1, Math.floor(chartW / (estLabelWidth + 15)));
                const step = Math.ceil(labels.length / maxVisibleLabels);

                labels.forEach((label, i) => {
                    if (i % step === 0) { 
                        const x = pad + (i / (labels.length - 1 || 1)) * chartW;
                        this.drawText(svg, x, xAxisY + 15, label, 'middle');
                    }
                });
            }
            // Y Axis = Values
            const steps = 5;
            for (let i = 0; i <= steps; i++) {
                const val = min + (max - min) * (i / steps);
                const y = xAxisY - (i / steps) * chartH;
                this.drawText(svg, yAxisX - 5, y + 4, Math.round(val).toString(), 'end');
            }
        }
    }

    private drawLine(svg: SVGSVGElement, x1: number, y1: number, x2: number, y2: number) {
        const el = document.createElementNS(this.ns, 'line');
        el.setAttribute('x1', x1.toString());
        el.setAttribute('y1', y1.toString());
        el.setAttribute('x2', x2.toString());
        el.setAttribute('y2', y2.toString());
        el.setAttribute('class', 'dl-axis-line');
        svg.appendChild(el);
    }

    private drawText(svg: SVGSVGElement, x: number, y: number, text: string, anchor: string) {
        const el = document.createElementNS(this.ns, 'text');
        el.setAttribute('x', x.toString());
        el.setAttribute('y', y.toString());
        el.setAttribute('text-anchor', anchor);
        el.setAttribute('class', 'dl-axis-text');
        el.textContent = text;
        svg.appendChild(el);
    }
}