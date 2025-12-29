import { App, TFile } from 'obsidian';

export interface ContentMatch {
    lineNumber: number;
    context: string[];
}

export interface SearchResult {
    file: TFile;
    path: string;
    score: number;

    matchedInFileName: boolean;
    matchedInContent: boolean;
    contentMatches: ContentMatch[];

    pinned?: boolean;
}

type Matcher = (text: string) => boolean;

export class SearchService {
    constructor(private app: App) {}

    /* ---------- 查询解析 ---------- */
    private buildMatcher(query: string): Matcher {
        query = query.trim();

        // 正则
        if (query.startsWith('/') && query.endsWith('/')) {
            const reg = new RegExp(query.slice(1, -1), 'i');
            return text => reg.test(text);
        }

        // OR
        if (query.includes('|')) {
            const parts = query.split('|').map(s => s.trim().toLowerCase());
            return text => parts.some(p => text.includes(p));
        }

        // AND
        const parts = query.toLowerCase().split(/\s+/);
        return text => parts.every(p => text.includes(p));
    }

    async performSearch(
        query: string,
        onPartial?: (r: SearchResult[]) => void
    ): Promise<SearchResult[]> {

        if (query.length < 2) return [];

        const matcher = this.buildMatcher(query);
        const files = this.app.vault.getMarkdownFiles();
        const results = new Map<string, SearchResult>();

        /* ---------- 文件名搜索 ---------- */
        for (const file of files) {
            const name = file.basename.toLowerCase();
            const path = file.path.toLowerCase();

            if (matcher(name) || matcher(path)) {
                results.set(file.path, {
                    file,
                    path: file.path,
                    score: 80,
                    matchedInFileName: true,
                    matchedInContent: false,
                    contentMatches: []
                });
            }
        }

        onPartial?.(Array.from(results.values()));

        /* ---------- 正文搜索（Idle） ---------- */
        const CONTEXT = 2;
        const MAX_MATCH = 5;
        let index = 0;

        const idle =
            window.requestIdleCallback ??
            ((cb: any) => setTimeout(() => cb({ timeRemaining: () => 10 }), 16));

        return new Promise(resolve => {
            const work = async (deadline: any) => {
                while (deadline.timeRemaining() > 0 && index < files.length) {
                    const file = files[index++];
                    try {
                        if (file.stat.size > 1024 * 1024) continue;

                        const text = await this.app.vault.cachedRead(file);
                        const lines = text.split('\n');

                        let matches: ContentMatch[] = [];
                        let score = 0;

                        for (let i = 0; i < lines.length && matches.length < MAX_MATCH; i++) {
                            if (matcher(lines[i].toLowerCase())) {
                                const start = Math.max(0, i - CONTEXT);
                                const end = Math.min(lines.length, i + CONTEXT + 1);

                                matches.push({
                                    lineNumber: i + 1,
                                    context: lines.slice(start, end)
                                });

                                score += 30;
                                if (/^#{1,6}\s/.test(lines[i])) score += 20;
                            }
                        }

                        if (matches.length) {
                            const existing = results.get(file.path);
                            if (existing) {
                                existing.matchedInContent = true;
                                existing.contentMatches.push(...matches);
                                existing.score += score;
                            } else {
                                results.set(file.path, {
                                    file,
                                    path: file.path,
                                    score,
                                    matchedInFileName: false,
                                    matchedInContent: true,
                                    contentMatches: matches
                                });
                            }
                        }
                    } catch {}
                }

                onPartial?.(Array.from(results.values()));

                if (index < files.length) idle(work);
                else resolve(Array.from(results.values()));
            };

            idle(work);
        });
    }
}
