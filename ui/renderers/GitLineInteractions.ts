// === FILE: ui/renderers/GitLineInteractions.ts ===
export class GitLineInteractions {
    private scale = 1;
    private translateX = 20;
    private translateY = 20;
    private svgGroup: SVGGElement | null = null;

    setSvgGroup(group: SVGGElement) {
        this.svgGroup = group;
    }

    setupInteractions(wrapper: HTMLElement) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;

        wrapper.addEventListener('wheel', e => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale = Math.min(Math.max(0.1, this.scale * delta), 5);
            this.updateTransform();
        });

        wrapper.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            isDragging = true;
            startX = e.clientX - this.translateX;
            startY = e.clientY - this.translateY;
            wrapper.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', e => {
            if (!isDragging) return;
            this.translateX = e.clientX - startX;
            this.translateY = e.clientY - startY;
            this.updateTransform();
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            wrapper.style.cursor = 'grab';
        });
    }

    resetZoom() {
        this.scale = 1;
        this.translateX = 20;
        this.translateY = 20;
        this.updateTransform();
    }

    private updateTransform() {
        if (this.svgGroup) {
            this.svgGroup.setAttribute(
                'transform',
                `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`
            );
        }
    }
}