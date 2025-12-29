import { App, TFile } from 'obsidian';
import { TaskItem, TodoWidget } from '../types';
import { SettingsManager } from '../SettingsManager';
import { TaskParser } from './TaskParser';

export class TaskFetcher {
    private app: App;
    private settingsManager: SettingsManager;

    constructor(app: App, settingsManager: SettingsManager) {
        this.app = app;
        this.settingsManager = settingsManager;
    }

    private getGlobalSettings() {
        return this.settingsManager.getSettings().taskManagement;
    }

    public async getTasks(config: TodoWidget): Promise<TaskItem[]> {
        const items: TaskItem[] = [];
        const globalSettings = this.getGlobalSettings();
        const taskAttribute = globalSettings.taskNoteAttribute;
        let files: TFile[] = [];

        if (config.sourceType === 'file' && config.filePath) {
            const f = this.app.vault.getAbstractFileByPath(config.filePath);
            if (f instanceof TFile) files.push(f);
        } else {
            const allFiles = this.app.vault.getMarkdownFiles();
            if (config.folderPath && config.folderPath !== '/') {
                files = allFiles.filter(f => f.path.startsWith(config.folderPath));
            } else { files = allFiles; }
            
            // 自动并入收集箱 (非单文件模式下)
            if (globalSettings.captureInboxPath && config.sourceType !== 'file') {
                const inboxFile = this.app.vault.getAbstractFileByPath(globalSettings.captureInboxPath);
                if (inboxFile instanceof TFile && !files.includes(inboxFile)) files.push(inboxFile);
            }
        }

        if (globalSettings.archivePath) {
            files = files.filter(f => f.path !== globalSettings.archivePath || f.path === config.filePath);
        }

        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            let isTaskNote = false;
            if (taskAttribute && cache?.frontmatter) {
                const [key, val] = taskAttribute.split('=').map(s => s.trim());
                const fmVal = cache.frontmatter[key];
                if (fmVal !== undefined && (!val || String(fmVal) === val)) isTaskNote = true;
            }

            // 如果是任务笔记，添加笔记本身作为一个任务项 (Root Node)
            // 但单文件模式下不添加，避免重复显示文件名
            if (isTaskNote && config.sourceType !== 'file') {
                const taskNoteItem = TaskParser.parseTaskNote(file, cache!.frontmatter);
                // 只有未完成，或者未隐藏完成时才添加
                if (!config.hideCompleted || !taskNoteItem.completed) {
                    // GitLine 模式下我们希望看到它，待办模式下也作为容器显示
                    items.push(taskNoteItem);
                }
            }

            const content = await this.app.vault.cachedRead(file);
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                const task = TaskParser.parseLine(line, file, index);
                if (task) {
                    if (config.hideCompleted && task.completed) return;
                    task.isTaskNoteSubtask = isTaskNote;
                    const indentMatch = line.match(/^(\s*)/);
                    task.indentation = indentMatch ? indentMatch[1].length : 0;
                    items.push(task);
                }
            });
        }

        // Sort
        if (config.sortBy === 'priority') {
            const pMap = { 'high': 3, 'medium': 2, 'low': 1, undefined: 0 };
            items.sort((a, b) => (pMap[b.priority || 'undefined'] - pMap[a.priority || 'undefined']));
        } else if (config.sortBy === 'date') {
            items.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
        }
        return items;
    }
}