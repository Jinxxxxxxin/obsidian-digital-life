// === FILE: ui/configs/ListConfigView.ts ===
import { App, Setting } from 'obsidian';
import { ListWidget } from '../../core/types';
import { IConfigView } from './IConfigView';
import { FolderSuggest, TagSuggest } from '../components/Suggesters';

export class ListConfigView implements IConfigView<ListWidget> {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    render(el: HTMLElement, w: ListWidget): void {
        const folderSetting = new Setting(el).setName('文件夹路径');
        folderSetting.addText(t => { 
            t.setValue(w.folderPath); 
            new FolderSuggest(this.app, t.inputEl); 
            t.onChange(v => w.folderPath = v); 
        });
        
        new Setting(el).setName('标签过滤')
            .setDesc('只显示包含特定标签的笔记')
            .addText(t => {
                t.setValue(w.filterTags ? w.filterTags.join(', ') : '');
                new TagSuggest(this.app, t.inputEl);
                t.onChange(v => w.filterTags = v.split(/[,，]/).map(s => s.trim()).filter(Boolean));
            });

        new Setting(el).setName('排序依据')
            .addDropdown(d => d
                .addOption('modified', '修改时间')
                .addOption('created', '创建时间')
                .addOption('name', '文件名')
                .setValue(w.sortBy).onChange(v => w.sortBy = v as any));
        
        new Setting(el).setName('排序方式')
            .addDropdown(d => d
                .addOption('desc', '降序 (最新/Z-A)')
                .addOption('asc', '升序 (最早/A-Z)')
                .setValue(w.sortOrder).onChange(v => w.sortOrder = v as any));
        
        new Setting(el).setName('显示数量')
            .addText(t => t.setValue(String(w.limit)).onChange(v => w.limit = Number(v)));
    }
}