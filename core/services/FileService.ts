// === FILE: core/services/FileService.ts ===
import { App, TFile, getAllTags } from 'obsidian';
import { DataSource } from '../types';

export class FileService {
    private app: App;

    constructor(app: App) { this.app = app; }

    public getFiles(dataSource: DataSource): TFile[] {
        if (dataSource.type === 'file' && dataSource.filePath) {
            const file = this.app.vault.getAbstractFileByPath(dataSource.filePath);
            return file instanceof TFile ? [file] : [];
        }
        const allFiles = this.app.vault.getMarkdownFiles();
        return allFiles.filter(file => {
            if (file.extension !== 'md') return false;
            if (dataSource.folderPath && dataSource.folderPath !== '/' && !file.path.startsWith(dataSource.folderPath)) return false;
            
            // 标签过滤
            if (dataSource.filter.tags.length > 0) {
                const cache = this.app.metadataCache.getFileCache(file);
                const tags = getAllTags(cache);
                if (!tags) return false;
                // 简单的标签匹配逻辑
                const hasMatch = dataSource.filter.tags.some(reqTag => {
                    const search = reqTag.startsWith('#') ? reqTag.toLowerCase() : '#' + reqTag.toLowerCase();
                    return tags.some(t => t.toLowerCase() === search || t.toLowerCase().startsWith(search + '/'));
                });
                if (!hasMatch) return false;
            }
            return true;
        });
    }

    public getAvailableProperties(folderPath: string): string[] {
        const files = this.app.vault.getMarkdownFiles().filter(f => f.extension === 'md' && (folderPath === '/' || f.path.startsWith(folderPath)));
        const keys = new Set<string>();
        files.forEach(file => { const c = this.app.metadataCache.getFileCache(file); if (c?.frontmatter) Object.keys(c.frontmatter).forEach(k => keys.add(k)); });
        return Array.from(keys);
    }

    public getAvailableTags(folderPath: string): string[] {
        const files = this.app.vault.getMarkdownFiles().filter(f => f.extension === 'md' && (folderPath === '/' || f.path.startsWith(folderPath)));
        const tagSet = new Set<string>();
        files.forEach(file => { const c = this.app.metadataCache.getFileCache(file); const tags = getAllTags(c); if (tags) tags.forEach(t => tagSet.add(t)); });
        return Array.from(tagSet).sort();
    }
    
    // 兼容接口：获取双链属性 (实现略，可基于 MetadataService 逻辑扩展)
    public getAvailableLinkedProperties(folderPath: string, linkPropertyNames: string[]): string[] {
        return []; 
    }
}