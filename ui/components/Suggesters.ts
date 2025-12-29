// === FILE: ui/components/Suggesters.ts ===
import { AbstractInputSuggest, App, TFolder, TFile, getAllTags } from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
    private inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    getSuggestions(query: string): TFolder[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];
        const lowerQuery = query.toLowerCase();

        for (const file of abstractFiles) {
            if (file instanceof TFolder) {
                if (file.path.toLowerCase().contains(lowerQuery)) {
                    folders.push(file);
                }
            }
        }
        return folders;
    }

    renderSuggestion(file: TFolder, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TFolder): void {
        this.inputEl.value = file.path;
        this.inputEl.trigger('input');
        this.close();
    }
}

export class FileSuggest extends AbstractInputSuggest<TFile> {
    private inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    getSuggestions(query: string): TFile[] {
        const allFiles = this.app.vault.getMarkdownFiles();
        const lowerQuery = query.toLowerCase();
        return allFiles.filter(f => f.path.toLowerCase().contains(lowerQuery)).slice(0, 20);
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.setText(file.path);
        el.createDiv({ 
            text: file.parent?.path, 
            style: 'font-size: 0.8em; color: var(--text-muted);' 
        });
    }

    selectSuggestion(file: TFile): void {
        this.inputEl.value = file.path;
        this.inputEl.trigger('input');
        this.close();
    }
}

export class TagSuggest extends AbstractInputSuggest<string> {
    private inputEl: HTMLInputElement;
    private customTags: string[] | null = null; // [新增] 支持自定义数据源

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    // [新增] 允许外部更新建议列表
    setSuggestions(tags: string[]) {
        this.customTags = tags;
    }

    getSuggestions(query: string): string[] {
        let allTags: string[] = [];
        
        if (this.customTags) {
            // 使用自定义列表（基于文件夹过滤）
            allTags = this.customTags;
        } else {
            // 默认回退到全库扫描
            // @ts-ignore
            const tags = (this.app.metadataCache.getTags() as Record<string, number>);
            allTags = Object.keys(tags);
        }

        const lowerQuery = query.toLowerCase();
        const currentVal = this.inputEl.value;
        const lastCommaIndex = currentVal.lastIndexOf(',');
        const currentSegment = lastCommaIndex >= 0 ? currentVal.substring(lastCommaIndex + 1).trim() : currentVal.trim();
        
        if (!currentSegment) return allTags.slice(0, 20);

        return allTags.filter(t => t.toLowerCase().contains(currentSegment.toLowerCase())).slice(0, 20);
    }

    renderSuggestion(tag: string, el: HTMLElement): void {
        el.setText(tag);
    }

    selectSuggestion(tag: string): void {
        const currentVal = this.inputEl.value;
        const lastCommaIndex = currentVal.lastIndexOf(',');
        if (lastCommaIndex >= 0) {
            this.inputEl.value = currentVal.substring(0, lastCommaIndex + 1) + ' ' + tag;
        } else {
            this.inputEl.value = tag;
        }
        this.inputEl.trigger('input');
        this.close();
    }
}

export class PropertySuggest extends AbstractInputSuggest<string> {
    private inputEl: HTMLInputElement;
    private properties: string[];

    constructor(app: App, inputEl: HTMLInputElement, properties: string[]) {
        super(app, inputEl);
        this.inputEl = inputEl;
        this.properties = properties;
    }

    setSuggestions(properties: string[]) {
        this.properties = properties;
    }

    getSuggestions(query: string): string[] {
        const lowerQuery = query.toLowerCase();
        return this.properties.filter(p => p.toLowerCase().contains(lowerQuery));
    }

    renderSuggestion(prop: string, el: HTMLElement): void {
        el.setText(prop);
    }

    selectSuggestion(prop: string): void {
        this.inputEl.value = prop;
        this.inputEl.trigger('input');
        this.close();
    }
}