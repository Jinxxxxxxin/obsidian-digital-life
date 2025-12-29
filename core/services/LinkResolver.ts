// === FILE: core/services/LinkResolver.ts ===
import { App, TFile } from 'obsidian';

export class LinkResolver {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    public resolve(linkText: string, sourcePath: string): TFile | null {
        if (!linkText || typeof linkText !== 'string') return null;
        // 处理 [[Link|Alias]] 或 Link 格式
        const cleanLink = linkText.replace(/[\[\]"]/g, '').split('|')[0]; 
        const file = this.app.metadataCache.getFirstLinkpathDest(cleanLink, sourcePath);
        return (file instanceof TFile && file.extension === 'md') ? file : null;
    }
}