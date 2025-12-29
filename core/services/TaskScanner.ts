// === FILE: core/services/TaskScanner.ts ===
import { App, TFile, Notice } from 'obsidian';
import { TaskItem, TodoWidget } from '../types';
import { SettingsManager } from '../SettingsManager';
import { TaskParser } from './TaskParser';

export class TaskScanner {
    private app: App;
    private settingsManager: SettingsManager;
    private taskParser: TaskParser;

    constructor(app: App, settingsManager: SettingsManager) {
        this.app = app;
        this.settingsManager = settingsManager;
        this.taskParser = new TaskParser();
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
            } else {
                files = allFiles;
            }
            
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
            if (isTaskNote) {
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

    public async captureTasks(config: TodoWidget | null): Promise<void> {
        const globalSettings = this.getGlobalSettings();
        if (!globalSettings.captureInboxPath) return;
        const inboxFile = this.app.vault.getAbstractFileByPath(globalSettings.captureInboxPath);
        if (!(inboxFile instanceof TFile)) return;

        let captureCount = 0;
        let filesToScan = this.app.vault.getMarkdownFiles();
        if (config && config.folderPath && config.folderPath !== '/') {
            filesToScan = filesToScan.filter(f => f.path.startsWith(config.folderPath));
        }

        let inboxContent = await this.app.vault.read(inboxFile);
        let inboxModified = false;

        for (const file of filesToScan) {
            if (file.path === globalSettings.captureInboxPath || file.path === globalSettings.archivePath) continue;
            
            // [逻辑保持] 任务笔记不进行行捕获
            const cache = this.app.metadataCache.getFileCache(file);
            if (globalSettings.taskNoteAttribute && cache?.frontmatter) {
                const [key, val] = globalSettings.taskNoteAttribute.split('=').map(s => s.trim());
                if (cache.frontmatter[key] !== undefined) continue; 
            }

            let content = await this.app.vault.read(file);
            const lines = content.split('\n');
            const linesToKeep: string[] = [];
            const blocksToMove: string[] = [];
            let skipIndex = -1;

            for (let i = 0; i < lines.length; i++) {
                if (i <= skipIndex) continue;
                const line = lines[i];
                const match = line.match(/^(\s*)-\s*\[ \]\s*(.*)$/);
                if (match) {
                    const blockBuffer = [line];
                    const currentIndent = match[1].length;
                    let j = i + 1;
                    while (j < lines.length) {
                        const nextLine = lines[j];
                        const nextIndentMatch = nextLine.match(/^(\s*)/);
                        const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0;
                        if (nextLine.trim().length === 0 || nextIndent > currentIndent) {
                            blockBuffer.push(nextLine); j++;
                        } else break;
                    }
                    blocksToMove.push(blockBuffer.join('\n'));
                    captureCount++;
                    skipIndex = j - 1;
                } else linesToKeep.push(line);
            }

            if (blocksToMove.length > 0) {
                await this.app.vault.modify(file, linesToKeep.join('\n'));
                const linkHeader = `#### [[${file.basename}]]`;
                const contentToAppend = blocksToMove.join('\n');
                
                if (inboxContent.includes(linkHeader)) {
                    inboxContent = inboxContent.replace(linkHeader, `${linkHeader}\n${contentToAppend}`);
                } else {
                    if (!inboxContent.endsWith('\n') && inboxContent.length > 0) inboxContent += '\n';
                    inboxContent += `\n${linkHeader}\n${contentToAppend}\n`;
                }
                inboxModified = true;
            }
        }

        if (inboxModified) {
            await this.app.vault.modify(inboxFile, inboxContent);
            if (config) new Notice(`已智能捕获 ${captureCount} 条任务`);
        }
    }
}