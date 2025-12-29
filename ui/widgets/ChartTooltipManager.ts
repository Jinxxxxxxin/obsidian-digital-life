// === FILE: ui/widgets/ChartTooltipManager.ts ===
export class ChartTooltipManager {
    private tooltip: HTMLElement | null = null;

    attachTooltip(svg: SVGSVGElement) {
        svg.addEventListener('mousemove', e => {
            const target = e.target as HTMLElement;
            const val = target.getAttribute('data-tooltip-value');
            const label = target.getAttribute('data-tooltip-label');

            if (val && label) {
                if (!this.tooltip) {
                    this.tooltip = document.body.createDiv('dl-tooltip');
                }
                this.tooltip.style.display = 'block';
                this.tooltip.style.left = `${e.clientX + 10}px`;
                this.tooltip.style.top = `${e.clientY + 10}px`;
                this.tooltip.innerHTML = `<strong>${label}</strong><br/>${val}`;
            } else if (this.tooltip) {
                this.tooltip.style.display = 'none';
            }
        });

        svg.addEventListener('mouseleave', () => {
            if (this.tooltip) this.tooltip.style.display = 'none';
        });
    }

    cleanup() {
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }
}