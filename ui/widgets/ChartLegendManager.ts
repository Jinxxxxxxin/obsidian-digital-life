// === FILE: ui/widgets/ChartLegendManager.ts ===
export class ChartLegendManager {
    private container: HTMLElement | null = null;

    constructor(container?: HTMLElement) {
        if (container) {
            this.container = container;
        }
    }

    setContainer(container: HTMLElement) {
        this.container = container;
    }

    removeExistingLegend() {
        if (!this.container) return;
        const old = this.container.querySelector('.dl-chart-legend-container');
        if (old) old.remove();
    }

    renderLegend(labels: string[], colors: string[]) {
        if (!this.container) return;
        const legendEl = this.container.createDiv('dl-chart-legend-container');

        legendEl.style.display = 'flex';
        legendEl.style.flexWrap = 'wrap';
        legendEl.style.gap = '15px';
        legendEl.style.fontSize = '0.8em';
        legendEl.style.color = 'var(--text-muted)';
        legendEl.style.justifyContent = 'center';
        legendEl.style.padding = '8px';
        legendEl.style.borderTop = '1px solid var(--background-modifier-border)';

        labels.forEach((label, i) => {
            const item = legendEl.createDiv({ cls: 'dl-legend-item' });
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '5px';

            const dot = item.createDiv();
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = colors[i] || '#ccc';

            item.createSpan({ text: label });
        });
    }
}