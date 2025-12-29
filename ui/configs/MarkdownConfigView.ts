// === FILE: ui/configs/MarkdownConfigView.ts ===
import { App, Setting } from 'obsidian';
import { MarkdownWidget } from '../../core/types';
import { IConfigView } from './IConfigView';
import { FileSuggest } from '../components/Suggesters';

export class MarkdownConfigView implements IConfigView<MarkdownWidget> {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    render(el: HTMLElement, w: MarkdownWidget): void {
        const fileSetting = new Setting(el).setName('文件路径');
        fileSetting.addText(t => {
            t.setValue(w.filePath);
            new FileSuggest(this.app, t.inputEl);
            t.onChange(v => w.filePath = v);
        });
        
        new Setting(el).setName('默认模式')
            .addDropdown(d => d
                .addOption('preview', '预览')
                .addOption('edit', '编辑')
                .setValue(w.mode).onChange(v => w.mode = v as any));
    }
}