// === FILE: ui/widgets/TodoWidget.ts ===
import { App, setIcon, Menu } from 'obsidian';
import { BaseWidget } from './BaseWidget';
import { TodoWidget as ITodoWidget, TaskItem } from '../../core/types';
import { TaskService } from '../../core/services/TaskService';
import { SettingsManager } from '../../core/SettingsManager';

export class TodoWidget extends BaseWidget {
    private app: App;
    private taskService: TaskService;
    private items: TaskItem[] = [];
    private settingsManager: SettingsManager;

    constructor(
        widget: ITodoWidget, 
        app: App,
        settingsManager: SettingsManager, 
        onDelete: () => void, 
        onEdit: () => void,
        onMove: () => void
    ) {
        super(widget, onDelete, onEdit, onMove);
        this.app = app;
        this.settingsManager = settingsManager;
        this.taskService = new TaskService(app, settingsManager);
    }

    protected renderHeader(): void { super.renderHeader(); }

    public async renderContent(): Promise<void> {
        this.contentEl.empty();
        this.contentEl.addClass('dl-todo-widget-container');
        this.contentEl.addClass('is-loading');

        try {
            const w = this.widget as ITodoWidget;
            this.items = await this.taskService.getTasks(w);
            
            const globalSettings = this.settingsManager.getSettings().taskManagement;
            if (globalSettings.autoArchive && this.items.some(t => t.completed)) {
                setTimeout(async () => {
                    await this.taskService.archiveCompletedTasks(w);
                    this.items = await this.taskService.getTasks(w); 
                    this.renderList(w);
                }, 100);
            } else {
                this.renderList(w);
            }
        } catch (e) {
            console.error("Task Load Error", e);
            this.contentEl.createDiv({ text: '加载任务失败', cls: 'dl-error-msg' });
        } finally {
            this.contentEl.removeClass('is-loading');
        }
    }

    private renderList(w: ITodoWidget) {
        this.contentEl.empty(); 
        if (this.items.length === 0) {
            this.contentEl.createDiv({ text: '暂无待办任务', cls: 'dl-no-data' });
            return;
        }

        const listContainer = this.contentEl.createDiv('dl-todo-list');

        if (w.groupBy === 'file' && w.sourceType !== 'file') {
            const groups = new Map<string, TaskItem[]>();
            this.items.forEach(t => {
                const key = t.file.basename;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(t);
            });

            groups.forEach((tasks, fileName) => {
                const groupHeader = listContainer.createDiv('dl-todo-group-header');
                groupHeader.createSpan({ text: fileName, style: 'font-weight: bold; font-size: 0.85em; color: var(--text-muted);' });
                groupHeader.createSpan({ text: ` (${tasks.length})`, style: 'font-size: 0.8em; opacity: 0.7;' });
                tasks.forEach(t => this.renderTaskItem(listContainer, t, w));
            });
        } else {
            this.items.forEach(t => this.renderTaskItem(listContainer, t, w));
        }
    }

    private renderTaskItem(container: HTMLElement, item: TaskItem, config: ITodoWidget) {
        const row = container.createDiv('dl-todo-item');
        
        const checkbox = row.createEl('input', { type: 'checkbox' });
        checkbox.checked = item.completed;
        checkbox.onclick = async (e) => {
            e.stopPropagation();
            item.completed = !item.completed;
            textSpan.toggleClass('is-completed', item.completed);
            await this.taskService.toggleTask(item);

            const globalSettings = this.settingsManager.getSettings().taskManagement;
            if (item.completed && globalSettings.autoArchive) {
                setTimeout(async () => {
                    await this.taskService.archiveCompletedTasks(config);
                    this.renderContent();
                }, 500);
            }
        };

        const contentDiv = row.createDiv({ cls: 'dl-todo-content' });
        contentDiv.style.flex = '1';
        contentDiv.style.marginLeft = '8px';
        contentDiv.style.display = 'flex';
        contentDiv.style.flexDirection = 'column';

        const mainLine = contentDiv.createDiv({ style: 'display: flex; align-items: center; gap: 6px;' });
        
        // [修复] 移除了原有的 isTaskNoteSubtask 图标逻辑
        
        const textSpan = mainLine.createSpan({ text: item.text, cls: 'dl-todo-text' });
        if (item.completed) textSpan.addClass('is-completed');

        if (item.priority) {
            const badge = mainLine.createSpan('dl-priority-badge');
            badge.setText(item.priority.toUpperCase());
            badge.setAttribute('data-priority', item.priority);
        }

        const metaLine = contentDiv.createDiv('dl-todo-meta-line');
        const metaParts = [];
        
        if (item.dueDate) {
            const isOverdue = new Date(item.dueDate) < new Date() && !item.completed;
            const dateSpan = `<span class="${isOverdue ? 'dl-date-overdue' : ''}">📅 ${item.dueDate}</span>`;
            metaParts.push(dateSpan);
        }
        if (config.groupBy !== 'file') {
            metaParts.push(`📄 ${item.file.basename}`);
        }
        metaLine.innerHTML = metaParts.join(' · ');

        const linkBtn = row.createSpan('dl-icon-btn dl-todo-link');
        setIcon(linkBtn, 'external-link');
        linkBtn.style.opacity = '0';
        row.onmouseenter = () => linkBtn.style.opacity = '1';
        row.onmouseleave = () => linkBtn.style.opacity = '0';
        
        linkBtn.onclick = (e) => {
            e.stopPropagation();
            this.app.workspace.getLeaf(false).openFile(item.file, { eState: { line: item.line } });
        };
    }
}