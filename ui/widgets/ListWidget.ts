// === FILE: ui/widgets/ListWidget.ts ===
import { App, TFile, getAllTags } from 'obsidian';
import { BaseWidget } from './BaseWidget';
import { ListWidget as IListWidget } from '../../core/cr_def_type_main';

export class ListWidget extends BaseWidget {
    private app: App;

    constructor(
        widget: IListWidget, 
        app: App,
        onDelete: () => void, 
        onEdit: () => void,
        onMove: () => void // [新增]
    ) {
        super(widget, onDelete, onEdit, onMove);
        this.app = app;
    }

    public async renderContent(): Promise<void> {
        // ... (保持原有实现不变)
        const listWidget = this.widget as IListWidget;
        this.contentEl.empty();
        this.contentEl.addClass('dl-list-widget-container');

        // 1. Filter Files
        let files = this.app.vault.getMarkdownFiles();

        if (listWidget.folderPath && listWidget.folderPath !== '/') {
            files = files.filter(f => f.path.startsWith(listWidget.folderPath));
        }

        if (listWidget.filterTags && listWidget.filterTags.length > 0) {
            files = files.filter(f => {
                const cache = this.app.metadataCache.getFileCache(f);
                const tags = getAllTags(cache) || [];
                return listWidget.filterTags.some(tag => tags.includes(tag));
            });
        }

        // 2. Sort Files
        files.sort((a, b) => {
            let valA: any, valB: any;
            switch (listWidget.sortBy) {
                case 'created':
                    valA = a.stat.ctime;
                    valB = b.stat.ctime;
                    break;
                case 'modified':
                    valA = a.stat.mtime;
                    valB = b.stat.mtime;
                    break;
                case 'name':
                default:
                    valA = a.basename;
                    valB = b.basename;
                    break;
            }

            if (listWidget.sortOrder === 'desc') {
                return valA > valB ? -1 : 1;
            }
            return valA > valB ? 1 : -1;
        });

        // 3. Limit
        if (listWidget.limit > 0) {
            files = files.slice(0, listWidget.limit);
        }

        // 4. Render
        if (files.length === 0) {
            this.contentEl.createDiv({ text: '未找到符合条件的笔记', cls: 'dl-no-data' });
            return;
        }

        const ul = this.contentEl.createEl('ul', { cls: 'dl-list-items' });

        files.forEach(file => {
            const li = ul.createEl('li', { cls: 'dl-list-item' });
            
            // Icon
            const iconSpan = li.createSpan('dl-list-item-icon');
            iconSpan.setText('📄');

            // Text info
            const infoDiv = li.createDiv('dl-list-item-info');
            infoDiv.createDiv({ cls: 'dl-list-item-title', text: file.basename });
            
            const dateStr = new Date(file.stat.mtime).toLocaleDateString('zh-CN');
            const metaText = `${dateStr} · ${file.parent?.name || '根目录'}`;
            infoDiv.createDiv({ cls: 'dl-list-item-meta', text: metaText });

            // Click interaction
            li.onclick = () => {
                this.app.workspace.getLeaf(false).openFile(file);
            };
        });
    }
}