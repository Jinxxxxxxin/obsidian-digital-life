import { App, TFile, parseLinktext } from 'obsidian';

export class LinkService {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * 核心功能：计算穿透数值
     * @param sourceFile 当前笔记 (例如：2023-10-01.md)
     * @param sourceFields 包含链接的字段列表 (例如：['早餐', '午餐'])
     * @param targetField 目标笔记中的指标字段 (例如：'蛋白质')
     */
    public calculateLinkedSum(sourceFile: TFile, sourceFields: string[], targetField: string): number {
        const cache = this.app.metadataCache.getFileCache(sourceFile);
        if (!cache || !cache.frontmatter) return 0;

        let total = 0;

        // 1. 遍历源字段 (早餐、午餐...)
        for (const field of sourceFields) {
            const rawValue = cache.frontmatter[field];
            if (!rawValue) continue;

            // 2. 提取所有链接路径
            const links = this.extractLinks(rawValue);

            // 3. 遍历链接，找到文件并读取数值
            for (const link of links) {
                const targetFile = this.resolveFile(link, sourceFile.path);
                if (targetFile) {
                    const val = this.readNumberFromFile(targetFile, targetField);
                    total += val;
                }
            }
        }

        return total;
    }

    /**
     * UI辅助：获取所有被链接文件的属性列表（供补全用）
     */
    public scanLinkedProperties(sourceFiles: TFile[], sourceFields: string[]): string[] {
        const propSet = new Set<string>();
        const sampleSize = 20; // 采样前20个文件，避免卡顿

        for (const file of sourceFiles.slice(0, sampleSize)) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache || !cache.frontmatter) continue;

            for (const field of sourceFields) {
                const raw = cache.frontmatter[field];
                if (!raw) continue;
                
                const links = this.extractLinks(raw);
                for (const link of links) {
                    const target = this.resolveFile(link, file.path);
                    if (target) {
                        const tCache = this.app.metadataCache.getFileCache(target);
                        if (tCache && tCache.frontmatter) {
                            Object.keys(tCache.frontmatter).forEach(k => propSet.add(k));
                        }
                    }
                }
            }
        }
        return Array.from(propSet).sort();
    }

    // --- Private Helpers ---

    private extractLinks(raw: any): string[] {
        const results: string[] = [];
        // 处理数组或嵌套数组
        if (Array.isArray(raw)) {
            raw.flat(Infinity).forEach(item => results.push(String(item)));
        } else if (typeof raw === 'string') {
            // 处理 "[[A]], [[B]]" 格式
            if (raw.includes(',')) {
                raw.split(',').forEach(s => results.push(s.trim()));
            } else {
                results.push(raw);
            }
        }
        return results;
    }

    private resolveFile(linkText: string, sourcePath: string): TFile | null {
        // 清理 [[ ]] 和 |别名
        let clean = linkText.replace(/[\[\]"]/g, '');
        if (clean.includes('|')) clean = clean.split('|')[0];
        clean = clean.trim();
        if (!clean) return null;

        const file = this.app.metadataCache.getFirstLinkpathDest(clean, sourcePath);
        return (file instanceof TFile && file.extension === 'md') ? file : null;
    }

    private readNumberFromFile(file: TFile, propName: string): number {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache || !cache.frontmatter) return 0;

        // 尝试精确匹配
        let val = cache.frontmatter[propName];
        
        // 尝试忽略大小写匹配
        if (val === undefined) {
            const key = Object.keys(cache.frontmatter).find(k => k.toLowerCase() === propName.toLowerCase());
            if (key) val = cache.frontmatter[key];
        }

        if (val === undefined || val === null) return 0;

        // 数值清洗
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const parsed = parseFloat(val.replace(/[^\d.-]/g, ''));
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }
}