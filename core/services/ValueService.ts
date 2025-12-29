// === FILE: core/services/ValueService.ts ===
import { App, TFile } from 'obsidian';
import { LinkResolver } from './LinkResolver';
import { TagService } from './TagService';
import { NumberUtils } from '../utils/NumberUtils';
import { AxisMode } from '../types';

export class ValueService {
    private app: App;
    private linkResolver: LinkResolver;
    private tagService: TagService;

    constructor(app: App, linkResolver: LinkResolver, tagService: TagService) {
        this.app = app;
        this.linkResolver = linkResolver;
        this.tagService = tagService;
    }

    public async resolveValue(file: TFile, propertyName: string, linkSourceProperties?: string[]): Promise<number | null> {
        // 1. 标签作为数值 (存在=1, 不存在=0)
        if (propertyName.startsWith('#')) {
            return this.tagService.hasTag(file, propertyName) ? 1 : 0;
        }

        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache || !cache.frontmatter) return null;
        const fm = cache.frontmatter;

        // 2. 直接属性读取
        if (!linkSourceProperties || linkSourceProperties.length === 0) {
            return NumberUtils.parse(fm[propertyName]);
        }

        // 3. 双链穿透逻辑 (Link Penetration)
        let totalValue = 0; 
        let hasValidValue = false;

        for (const linkPropName of linkSourceProperties) {
            if (!linkPropName) continue;
            const linkRaw = fm[linkPropName];
            if (!linkRaw) continue;
            
            const linkTexts: string[] = Array.isArray(linkRaw) ? linkRaw.filter(x => typeof x === 'string') : [linkRaw];
            
            for (const linkText of linkTexts) {
                const targetFile = this.linkResolver.resolve(linkText, file.path);
                if (!targetFile) continue;
                
                const targetCache = this.app.metadataCache.getFileCache(targetFile);
                if (!targetCache?.frontmatter) continue;
                
                const targetVal = NumberUtils.parse(targetCache.frontmatter[propertyName]);
                if (targetVal !== null) { 
                    totalValue += targetVal; 
                    hasValidValue = true; 
                }
            }
        }
        return hasValidValue ? totalValue : null;
    }

    public async resolveNumericArray(file: TFile, propertyName: string): Promise<number[]> {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache || !cache.frontmatter) return [];
        const raw = cache.frontmatter[propertyName];
        if (raw === undefined || raw === null) return [];
        
        const inputs = Array.isArray(raw) ? raw : [raw];
        const results: number[] = [];
        for (const item of inputs) {
            const val = NumberUtils.parse(item);
            if (val !== null) results.push(val);
        }
        return results;
    }

    // 用于解析用于显示或分组的轴值
    public async resolveAxisValue(file: TFile, mode: AxisMode, propName?: string): Promise<string | number> {
        if (mode === 'filename') return file.basename;
        if (mode === 'created') return new Date(file.stat.ctime).toISOString().split('T')[0];
        if (mode === 'modified') return new Date(file.stat.mtime).toISOString().split('T')[0];
        if (mode === 'tags') {
            const tags = this.tagService.getTags(file);
            return tags.length > 0 ? tags[0] : 'No Tag';
        }
        if (mode === 'frontmatter' && propName) {
            const cache = this.app.metadataCache.getFileCache(file);
            const val = cache?.frontmatter?.[propName];
            if (typeof val === 'number') return val;
            return val !== undefined && val !== null ? String(val) : 'Unknown';
        }
        return 'Unknown';
    }
}