// === FILE: ui/renderers/GitLineDrawer.ts ===
export class GitLineDrawer {
    private ns = 'http://www.w3.org/2000/svg';

    drawLine(
        g: SVGGElement,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: string,
        dashed: boolean
    ) {
        const line = document.createElementNS(this.ns, 'line');
        line.setAttribute('x1', String(x1));
        line.setAttribute('y1', String(y1));
        line.setAttribute('x2', String(x2));
        line.setAttribute('y2', String(y2));
        line.style.stroke = color;
        line.style.strokeWidth = '2';
        if (dashed) line.style.strokeDasharray = '4,3';
        g.appendChild(line);
    }

    drawOrthogonalLine(
        g: SVGGElement,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: string,
        isHorizontal: boolean
    ) {
        const d = isHorizontal
            ? `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`
            : `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
        this.drawPath(g, d, color, false);
    }

    drawPath(g: SVGGElement, d: string, color: string, dashed: boolean): SVGPathElement {
        const path = document.createElementNS(this.ns, 'path');
        path.setAttribute('d', d);
        path.style.stroke = color;
        path.style.strokeWidth = '2';
        path.style.fill = 'none';
        if (dashed) path.style.strokeDasharray = '4,3';
        g.appendChild(path);
        return path;
    }

    drawNode(
        g: SVGGElement,
        cx: number,
        cy: number,
        r: number,
        color: string,
        filled: boolean
    ): SVGCircleElement {
        const c = document.createElementNS(this.ns, 'circle');
        c.setAttribute('cx', String(cx));
        c.setAttribute('cy', String(cy));
        c.setAttribute('r', String(r));
        c.style.stroke = color;
        c.style.strokeWidth = '2';
        c.style.fill = filled ? color : 'var(--background-primary)';
        g.appendChild(c);
        return c;
    }

    drawText(
        g: SVGGElement,
        text: string,
        x: number,
        y: number,
        completed: boolean,
        isHorizontal: boolean
    ) {
        const el = document.createElementNS(this.ns, 'text');
        el.textContent = text;
        el.style.fontSize = '12px';
        el.style.fill = completed ? 'var(--text-muted)' : 'var(--text-normal)';
        if (completed) el.style.textDecoration = 'line-through';

        if (isHorizontal) {
            el.setAttribute('x', String(x));
            el.setAttribute('y', String(y - 10));
            el.setAttribute('transform', `rotate(-30, ${x}, ${y - 10})`);
        } else {
            el.setAttribute('x', String(x + 15));
            el.setAttribute('y', String(y + 4));
        }

        g.appendChild(el);
    }
}