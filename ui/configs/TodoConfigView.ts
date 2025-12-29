// === FILE: ui/configs/TodoConfigView.ts ===
import { App, Setting } from 'obsidian';
import { TodoWidget } from '../../core/types';
import { IConfigView } from './IConfigView';
import { FolderSuggest, FileSuggest } from '../components/Suggesters';

export class TodoConfigView implements IConfigView<TodoWidget> {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    render(el: HTMLElement, w: TodoWidget): void {
        el.createEl('h4', { text: '数据源' });
        
        new Setting(el).setName('数据源类型')
            .addDropdown(d => d
                .addOption('folder', '文件夹')
                .addOption('file', '单文件')
                .setValue(w.sourceType || 'folder')
                .onChange(v => {
                    w.sourceType = v as any;
                    this.refresh(el, w);
                }));

        if (w.sourceType === 'file') {
            new Setting(el).setName('选择文件').addText(t => { 
                t.setValue(w.filePath || ''); 
                new FileSuggest(this.app, t.inputEl); 
                t.onChange(v => w.filePath = v); 
            });
        } else {
            new Setting(el).setName('扫描文件夹').addText(t => { 
                t.setValue(w.folderPath); 
                new FolderSuggest(this.app, t.inputEl); 
                t.onChange(v => w.folderPath = v); 
            });
        }
        
        el.createEl('h4', { text: '显示设置' });
        
        new Setting(el).setName('分组方式')
            .addDropdown(d => d.addOption('none', '不分组').addOption('file', '按文件分组').setValue(w.groupBy || 'none').onChange(v => w.groupBy = v as any));

        new Setting(el).setName('排序方式')
            .addDropdown(d => d.addOption('default', '默认').addOption('priority', '按优先级').addOption('date', '按截止日期').setValue(w.sortBy || 'default').onChange(v => w.sortBy = v as any));

        new Setting(el).setName('隐藏已完成').addToggle(t => t.setValue(w.hideCompleted).onChange(v => w.hideCompleted = v));
    }

    private refresh(el: HTMLElement, w: TodoWidget) {
        el.empty();
        this.render(el, w);
    }
}