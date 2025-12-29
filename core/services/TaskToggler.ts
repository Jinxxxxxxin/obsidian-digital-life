import { App, TFile } from 'obsidian';
import { TaskItem } from '../types';

export class TaskToggler {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    public async toggleTask(task: TaskItem): Promise<void> {
        if (task.isTaskNote) {
            await this.app.fileManager.processFrontMatter(task.file, (fm) => {
                fm.status = task.completed ? 'todo' : 'done';
            });
        } else {
            const content = await this.app.vault.read(task.file);
            const lines = content.split('\n');
            let targetLineIndex = task.line;
            if (targetLineIndex >= lines.length || !lines[targetLineIndex].includes(task.text)) {
                targetLineIndex = lines.findIndex(l => l.includes(task.text));
            }
            if (targetLineIndex !== -1) {
                const line = lines[targetLineIndex];
                const newLine = line.replace(/([-*]\s*)\[([ x])\]/, (match, prefix, state) => {
                    return `${prefix}[${state === ' ' ? 'x' : ' '}]`;
                });
                lines[targetLineIndex] = newLine;
                await this.app.vault.modify(task.file, lines.join('\n'));
            }
        }
    }
}