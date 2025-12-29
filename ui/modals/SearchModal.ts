import { App, Modal, MarkdownView, debounce } from 'obsidian';
import { SearchService, SearchResult } from './SearchService';

export class SearchModal extends Modal {
    private input!: HTMLInputElement;
    private list!: HTMLElement;
    private preview!: HTMLElement;

    private results: SearchResult[] = [];
    private pinned = new Map<string, SearchResult>();

    private service: SearchService;
    private debounced: (q: string) => void;

    constructor(app: App) {
        super(app);
        this.service = new SearchService(app);
        this.debounced = debounce(this.search.bind(this), 300, true);
    }

    onOpen() {
        const el = this.contentEl;
        el.empty();
        el.style.maxWidth = '900px';
        el.style.overflow = 'hidden'; // 🔑 防止整体滚动

        el.createEl('h2', { text: '搜索' });

        this.input = el.createEl('input', {
            type: 'text',
            placeholder: '支持 AND / OR / 正则 (/regex/)'
        });
        this.input.style.width = '100%';

        const main = el.createDiv();
        main.style.display = 'grid';
        main.style.gridTemplateColumns = '1fr 2fr';
        main.style.height = '450px';
        main.style.gap = '12px';

        /* ---------- 左侧列表 ---------- */
        this.list = main.createDiv();
        this.list.style.overflowY = 'auto';
        this.list.style.border = '1px solid var(--background-modifier-border)';

        /* ---------- 右侧预览（独立滚动） ---------- */
        this.preview = main.createDiv();
        this.preview.style.overflowY = 'auto';
        this.preview.style.border = '1px solid var(--background-modifier-border)';
        this.preview.style.padding = '12px';

        this.input.addEventListener('input', () =>
            this.debounced(this.input.value.trim())
        );
    }

    private async search(q: string) {
        if (!q) return;

        await this.service.performSearch(q, partial => {
            this.results = this.mergePinned(partial);
            this.renderList();
        });
    }

    private mergePinned(list: SearchResult[]) {
        const map = new Map<string, SearchResult>();
        this.pinned.forEach(v => map.set(v.path, v));
        list.forEach(v => {
            if (!map.has(v.path)) map.set(v.path, v);
        });

        return Array.from(map.values()).sort(
            (a, b) => Number(b.pinned) - Number(a.pinned) || b.score - a.score
        );
    }

    private renderList() {
        this.list.empty();

        this.results.forEach(r => {
            const item = this.list.createDiv();
            item.style.padding = '6px';
            item.style.cursor = 'pointer';

            const title = item.createDiv({ text: r.file.name });
            title.style.fontWeight = '600';

            const pin = item.createSpan({ text: r.pinned ? '📌' : '📍' });
            pin.style.float = 'right';
            pin.onclick = e => {
                e.stopPropagation();
                r.pinned = !r.pinned;
                r.pinned
                    ? this.pinned.set(r.path, r)
                    : this.pinned.delete(r.path);
                this.renderList();
            };

            item.onclick = () => this.showPreview(r);
            item.ondblclick = () =>
                this.openAt(r.file.path, r.contentMatches[0]?.lineNumber ?? 1);
        });
    }

    /* ---------- 右侧上下文 + 关键词高亮 ---------- */
    private showPreview(r: SearchResult) {
        this.preview.empty();
        this.preview.createEl('h3', { text: r.file.name });

        if (!r.contentMatches.length) {
            this.preview.createDiv({ text: '仅文件名命中' });
            return;
        }

        const q = this.input.value.trim();
        let reg: RegExp | null = null;

        if (q.startsWith('/') && q.endsWith('/')) {
            reg = new RegExp(q.slice(1, -1), 'gi');
        } else {
            const parts = q.split(/\s+|\|/).filter(Boolean);
            reg = new RegExp(`(${parts.join('|')})`, 'gi');
        }

        r.contentMatches.forEach(m => {
            const block = this.preview.createDiv();
            block.style.marginBottom = '10px';
            block.style.border = '1px solid var(--background-modifier-border)';
            block.style.padding = '6px';

            m.context.forEach((line, idx) => {
                const el = block.createDiv();
                el.innerHTML = reg ? line.replace(reg, '<mark>$1</mark>') : line;

                if (idx === Math.floor(m.context.length / 2)) {
                    el.style.background = 'var(--background-secondary)';
                }
            });

            block.onclick = () => this.openAt(r.file.path, m.lineNumber);
        });
    }

    private async openAt(path: string, line: number) {
        const leaf = await this.app.workspace.openLinkText(path, '', true);
        if (leaf?.view instanceof MarkdownView) {
            const ed = leaf.view.editor;
            ed.setCursor({ line: line - 1, ch: 0 });
            ed.scrollIntoView({ line: line - 1, ch: 0 }, true);
        }
        this.close();
    }

    onClose() {
        this.contentEl.empty();
    }
}
