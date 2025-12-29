// === FILE: ui/DigitalLifeSettingTab.ts ===
import { App, PluginSettingTab, Setting, setIcon } from 'obsidian';
import DigitalLifePlugin from '../main';
import { FileSuggest, FolderSuggest } from './components/Suggesters';

export class DigitalLifeSettingTab extends PluginSettingTab {
    plugin: DigitalLifePlugin;

    constructor(app: App, plugin: DigitalLifePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        containerEl.createEl('h2', { text: '数字人生 (Digital Life) 设置' });

        // --- Task Management (Global) ---
        containerEl.createEl('h3', { text: '✅ 任务管理 (Global)' });
        
        const taskSettings = this.plugin.settingsManager.getSettings().taskManagement;

        const inboxSetting = new Setting(containerEl)
            .setDesc('所有“快速捕获”的任务将默认追加到此文件');
        this.addIconToSetting(inboxSetting, 'download-cloud', '收集箱路径 (Inbox)');
        inboxSetting.addText(text => {
            text.setValue(taskSettings.captureInboxPath)
                .setPlaceholder('00.Inbox/Tasks.md')
                .onChange(async (value) => {
                    taskSettings.captureInboxPath = value;
                    await this.plugin.settingsManager.saveSettings();
                });
            new FileSuggest(this.app, text.inputEl);
        });

        const archiveSetting = new Setting(containerEl)
            .setDesc('完成的任务将以表格形式归档到此文件');
        this.addIconToSetting(archiveSetting, 'archive', '归档路径 (Archive)');
        archiveSetting.addText(text => {
            text.setValue(taskSettings.archivePath)
                .setPlaceholder('99.Archive/Done.md')
                .onChange(async (value) => {
                    taskSettings.archivePath = value;
                    await this.plugin.settingsManager.saveSettings();
                });
            new FileSuggest(this.app, text.inputEl);
        });

        const attrSetting = new Setting(containerEl)
            .setDesc('包含此属性的笔记将被视为“任务笔记”，看板将深入解析其子任务');
        this.addIconToSetting(attrSetting, 'tag', '任务笔记标识');
        attrSetting.addText(text => text
            .setValue(taskSettings.taskNoteAttribute)
            .setPlaceholder('type=task')
            .onChange(async (value) => {
                taskSettings.taskNoteAttribute = value;
                await this.plugin.settingsManager.saveSettings();
            }));

        const autoSetting = new Setting(containerEl)
            .setDesc('在看板中点击完成时，自动归档该任务');
        this.addIconToSetting(autoSetting, 'zap', '自动归档');
        autoSetting.addToggle(t => t
            .setValue(taskSettings.autoArchive)
            .onChange(async (v) => {
                taskSettings.autoArchive = v;
                await this.plugin.settingsManager.saveSettings();
            }));

        const captureSetting = new Setting(containerEl)
            .setDesc('修改任意笔记时，自动识别并将未完成的任务移动到收集箱 (智能合并)');
        this.addIconToSetting(captureSetting, 'magnet', '自动捕获');
        captureSetting.addToggle(t => t
            .setValue(taskSettings.autoCapture)
            .onChange(async (v) => {
                taskSettings.autoCapture = v;
                await this.plugin.settingsManager.saveSettings();
            }));

        // --- Note Creation ---
        containerEl.createEl('hr');
        containerEl.createEl('h3', { text: '📝 笔记创建' });
        
        const tmplSetting = new Setting(containerEl).setDesc('模板文件目录');
        this.addIconToSetting(tmplSetting, 'layout-template', '模板路径');
        tmplSetting.addText(text => {
            text.setValue(this.plugin.settingsManager.getSettings().noteCreator.templatePath)
                .onChange(async (value) => {
                    this.plugin.settingsManager.getSettings().noteCreator.templatePath = value;
                    await this.plugin.settingsManager.saveSettings();
                });
            new FolderSuggest(this.app, text.inputEl);
        });

        // --- Formula ---
        containerEl.createEl('hr');
        containerEl.createEl('h3', { text: '🧮 数据工具' });
        
        new Setting(containerEl).setName('启用公式计算').addToggle(t => t
            .setValue(this.plugin.settingsManager.getSettings().formula.isHidingEnabled)
            .onChange(async v => {
                this.plugin.settingsManager.getSettings().formula.isHidingEnabled = v;
                await this.plugin.settingsManager.saveSettings();
            }));
    }

    private addIconToSetting(setting: Setting, iconId: string, name: string) {
        const frag = document.createDocumentFragment();
        const container = frag.createDiv();
        container.style.display = 'flex'; container.style.alignItems = 'center';
        const iconSpan = container.createSpan();
        setIcon(iconSpan, iconId);
        iconSpan.style.display = 'flex'; iconSpan.style.marginRight = '5px';
        container.createSpan({ text: name });
        setting.setName(frag);
    }
}