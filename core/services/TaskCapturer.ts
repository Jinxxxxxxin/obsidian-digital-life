import { App, TFile, Notice } from 'obsidian';
import { TodoWidget } from '../types';
import { SettingsManager } from '../SettingsManager';

export class TaskCapturer {
    private app: App;
    private settingsManager: SettingsManager;

    constructor(app: App, settingsManager: SettingsManager) {
        this.app = app;
        this.settingsManager = settingsManager;
    }

    private getGlobalSettings() {
        return this.settingsManager.getSettings().taskManagement;
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