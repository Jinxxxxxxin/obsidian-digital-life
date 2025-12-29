// === FILE: ui/modals/PropertyVisibilityModal.ts ===
import { App, Modal, Setting, TFile } from 'obsidian';
import { SettingsManager } from '../../core/cr_man_set_store';
import { FormulaManager } from '../../core/FormulaManager';

export class PropertyVisibilityModal extends Modal {
    private settingsManager: SettingsManager;
    private formulaManager: FormulaManager;
    private file: TFile;

    constructor(app: App, settingsManager: SettingsManager, formulaManager: FormulaManager, file: TFile) {
        super(app);
        this.settingsManager = settingsManager;
        this.formulaManager = formulaManager;
        this.file = file;
    }

    onOpen() {
        this.contentEl.empty();
        this.contentEl.createEl('h3', { text: `管理属性可见性: ${this.file.basename}` });

        const cache = this.app.metadataCache.getFileCache(this.file);
        const fm = cache ? cache.frontmatter : {};
        const keys = Object.keys(fm || {}).filter(k => k !== 'position');

        if (!keys.length) {
            this.contentEl.createEl('div', { text: '当前笔记无 Frontmatter 属性', cls: 'dl-no-data' });
            return;
        }

        const settings = this.settingsManager.getSettings().formula;
        const hiddenList = settings.hiddenProperties || [];

        const container = this.contentEl.createDiv();
        container.style.maxHeight = '400px';
        container.style.overflowY = 'auto';

        keys.forEach(k => {
            const kLow = k.toLowerCase();
            const isHidden = hiddenList.includes(kLow);

            new Setting(container)
                .setName(k)
                .setDesc(isHidden ? '当前状态: 隐藏' : '当前状态: 显示')
                .addToggle(t => t
                    .setValue(isHidden)
                    .onChange(async (v) => {
                        const currentSettings = this.settingsManager.getSettings();
                        const s = new Set(currentSettings.formula.hiddenProperties);
                        
                        if (v) s.add(kLow); 
                        else s.delete(kLow);
                        
                        currentSettings.formula.hiddenProperties = Array.from(s);
                        await this.settingsManager.saveSettings();
                        
                        // 实时生效 CSS
                        this.formulaManager.updateHiddenPropertiesCSS();
                        
                        // 刷新 UI
                        this.onOpen();
                    }));
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}