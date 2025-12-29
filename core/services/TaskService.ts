// === FILE: core/services/TaskService.ts ===
import { App, TFile, Notice } from 'obsidian';
import { TaskItem, TodoWidget } from '../types';
import { SettingsManager } from '../SettingsManager';
import { TaskFetcher } from './TaskFetcher';
import { TaskCapturer } from './TaskCapturer';
import { TaskToggler } from './TaskToggler';
import { TaskArchiver } from './TaskArchiver';

export class TaskService {
    private app: App;
    private settingsManager: SettingsManager;
    private taskFetcher: TaskFetcher;
    private taskCapturer: TaskCapturer;
    private taskToggler: TaskToggler;
    private taskArchiver: TaskArchiver;

    constructor(app: App, settingsManager: SettingsManager) {
        this.app = app;
        this.settingsManager = settingsManager;
        this.taskFetcher = new TaskFetcher(app, settingsManager);
        this.taskCapturer = new TaskCapturer(app, settingsManager);
        this.taskToggler = new TaskToggler(app);
        this.taskArchiver = new TaskArchiver(app, settingsManager);
    }

    private getGlobalSettings() { return this.settingsManager.getSettings().taskManagement; }

    public async getTasks(config: TodoWidget): Promise<TaskItem[]> {
        return this.taskFetcher.getTasks(config);
    }

    public async quickAddTask(taskLine: string): Promise<void> {
        const globalSettings = this.getGlobalSettings();
        if (!globalSettings.captureInboxPath) { new Notice('请先配置收集箱'); return; }
        const inboxFile = this.app.vault.getAbstractFileByPath(globalSettings.captureInboxPath);
        if (!(inboxFile instanceof TFile)) { new Notice('收集箱文件不存在'); return; }
        await this.app.vault.append(inboxFile, `\n${taskLine}`);
        new Notice('任务已添加');
    }

    public async captureTasks(config: TodoWidget | null): Promise<void> {
        return this.taskCapturer.captureTasks(config);
    }

    public async archiveCompletedTasks(config: TodoWidget): Promise<void> {
        return this.taskArchiver.archiveCompletedTasks(config);
    }

    public async toggleTask(task: TaskItem): Promise<void> {
        return this.taskToggler.toggleTask(task);
    }
}