// === FILE: core/services/TagService.ts ===
import { App, TFile, getAllTags } from 'obsidian';

export class TagService {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    public getTags(file: TFile): string[] {
        const cache = this.app.metadataCache.getFileCache(file);
        return getAllTags(cache) || [];
    }

    public hasTag(file: TFile, tagName: string): boolean {
        if (!tagName) return false;
        const tags = this.getTags(file);
        if (tags.length === 0) return false;
        
        let search = tagName.trim();
        if (!search.startsWith('#')) search = '#' + search;
        search = search.toLowerCase();
        
        return tags.some(t => { 
            const lowerT = t.toLowerCase(); 
            return lowerT === search || lowerT.startsWith(search + '/'); 
        });
    }
}