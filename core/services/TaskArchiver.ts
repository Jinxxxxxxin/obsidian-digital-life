// === FILE: core/services/TaskArchiver.ts ===
import { App, TFile, Notice, moment } from 'obsidian';
import { TodoWidget } from '../types';
import { SettingsManager } from '../SettingsManager';

export class TaskArchiver {
    private app: App;
    private settingsManager: SettingsManager;

    constructor(app: App, settingsManager: SettingsManager) {
        this.app = app;
        this.settingsManager = settingsManager;
    }

    private getGlobalSettings() {
        return this.settingsManager.getSettings().taskManagement;
    }

    // [核心修复] 归档逻辑分流
    public async archiveCompletedTasks(config: TodoWidget): Promise<void> {
        const globalSettings = this.getGlobalSettings();
        if (!globalSettings.archivePath) return;
        const archiveFile = this.app.vault.getAbstractFileByPath(globalSettings.archivePath);
        if (!(archiveFile instanceof TFile)) return;

        // 计算归档文件夹 (用于移动文件)
        const archiveFolder = archiveFile.parent?.path || '/';

        let filesToScan: TFile[] = [];
        // 扫描逻辑...
        const inboxFile = this.app.vault.getAbstractFileByPath(globalSettings.captureInboxPath || '');
        if (inboxFile instanceof TFile) filesToScan.push(inboxFile);
        
        if (config.sourceType === 'file' && config.filePath) {
             const f = this.app.vault.getAbstractFileByPath(config.filePath); 
             if (f instanceof TFile && f !== inboxFile) filesToScan.push(f);
        } else {
             this.app.vault.getMarkdownFiles().forEach(f => {
                if ((config.folderPath === '/' || f.path.startsWith(config.folderPath)) && f !== inboxFile) filesToScan.push(f);
             });
        }

        let archiveCount = 0; 
        const tableRows: string[] = [];

        for (const file of filesToScan) {
            if (file.path === globalSettings.archivePath) continue;

            const cache = this.app.metadataCache.getFileCache(file);
            let isTaskNote = false;
            
            // 检测是否为任务笔记
            if (globalSettings.taskNoteAttribute && cache?.frontmatter) {
                const [key, val] = globalSettings.taskNoteAttribute.split('=').map(s => s.trim());
                const fmVal = cache.frontmatter[key];
                if (fmVal !== undefined && (!val || String(fmVal) === val)) {
                    isTaskNote = true;
                }
            }

            // [核心逻辑 A] 任务笔记归档 -> 移动文件
            if (isTaskNote) {
                const fm = cache!.frontmatter!;
                const isCompleted = fm.status === 'done' || fm.completed === true;
                if (isCompleted) {
                    // 防止重名覆盖
                    const targetPath = `${archiveFolder}/${file.name}`;
                    if (this.app.vault.getAbstractFileByPath(targetPath)) {
                        new Notice(`归档失败：${targetPath} 已存在`);
                    } else {
                        await this.app.fileManager.renameFile(file, targetPath);
                        new Notice(`已归档任务笔记：${file.basename}`);
                    }
                }
                // 任务笔记内部的行任务不进行提取归档，直接跳过
                continue; 
            }

            // [核心逻辑 B] 普通笔记归档 -> 提取行任务
            let content = await this.app.vault.read(file);
            const lines = content.split('\n');
            const linesToKeep: string[] = [];
            let skipIndex = -1;

            for (let i = 0; i < lines.length; i++) {
                if (i <= skipIndex) continue;
                const line = lines[i];
                const match = line.match(/^(\s*)[-*]\s*\[x\]\s*(.*)$/i);

                if (match) {
                    // ... 解析逻辑 (保持 v1.3.0) ...
                    const currentIndent = match[1].length;
                    let taskText = match[2].trim();
                    const subLines: string[] = [];
                    let j = i + 1;
                    while (j < lines.length) {
                        const nextLine = lines[j];
                        const nextIndentMatch = nextLine.match(/^(\s*)/);
                        const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0;
                        if (nextLine.trim().length === 0 || nextIndent > currentIndent) {
                            const cleanSub = nextLine.trim().replace(/^[-*]\s+/, '');
                            if (cleanSub) subLines.push(cleanSub); j++;
                        } else break;
                    }
                    skipIndex = j - 1;

                    let priority = '无';
                    if (taskText.includes('🔺')) { priority = '高'; taskText = taskText.replace('🔺', ''); }
                    else if (taskText.includes('⏫')) { priority = '中'; taskText = taskText.replace('⏫', ''); }
                    else if (taskText.includes('🔽')) { priority = '低'; taskText = taskText.replace('🔽', ''); }
                    taskText = taskText.replace(/📅\s*\d{4}-\d{2}-\d{2}/, '').trim();

                    let cellContent = taskText;
                    if (subLines.length > 0) cellContent += `<br><span style="color:var(--text-muted);font-size:0.9em">- ${subLines.join('<br>- ')}</span>`;
                    cellContent = cellContent.replace(/\|/g, '\\|');
                    const timeStr = moment().format('YYYY-MM-DD HH:mm');
                    const sourceLink = `[[${file.basename}]]`;
                    tableRows.push(`| ${timeStr} | ${cellContent} | ${sourceLink} | ${priority} |`);
                    archiveCount++;
                } else linesToKeep.push(line);
            }

            if (archiveCount > 0 && tableRows.length > 0) {
                await this.app.vault.modify(file, linesToKeep.join('\n'));
            }
        }

        if (tableRows.length > 0) {
            let archiveContent = await this.app.vault.read(archiveFile);
            let appendText = '';
            if (!/\|\s*完成时间/.test(archiveContent)) appendText += `\n| 完成时间 | 任务内容 | 来源 | 优先级 |\n|---|---|---|---|\n`;
            else if (!archiveContent.endsWith('\n')) appendText += '\n';
            appendText += tableRows.join('\n') + '\n';
            await this.app.vault.append(archiveFile, appendText);
            new Notice(`已归档 ${archiveCount} 条任务项`);
        }
    }
}