// === FILE: core/FormulaManager.ts ===
import { App, TFile, Notice, parseYaml } from 'obsidian';
import { SettingsManager } from './SettingsManager';

export class FormulaManager {
    private app: App;
    private settingsManager: SettingsManager;

    constructor(app: App, settingsManager: SettingsManager) {
        this.app = app;
        this.settingsManager = settingsManager;
    }

    public updateHiddenPropertiesCSS() {
        const ghostStyle = document.getElementById('yaml-formula-hidden-props');
        if (ghostStyle) ghostStyle.remove();

        const settings = this.settingsManager.getSettings().formula;
        const styleId = 'dl-hidden-props';
        let styleEl = document.getElementById(styleId);
        
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        if (!settings.isHidingEnabled || !Array.isArray(settings.hiddenProperties)) {
            styleEl.textContent = '';
            return;
        }

        styleEl.textContent = settings.hiddenProperties
            .map(key => `.metadata-property[data-property-key="${key.toLowerCase()}"] { display: none !important; }`)
            .join('\n');
    }

    public async calculateFormulas(targetFile: TFile, manual = false) {
        if (!targetFile || targetFile.extension !== 'md') return;
        const cache = this.app.metadataCache.getFileCache(targetFile);
        if (!cache?.frontmatter) return;

        let sourceLinks = cache.frontmatter.formula_src || cache.frontmatter.formula_source;
        if (!sourceLinks) { if (manual) new Notice('未设置 formula_src'); return; }
        if (!Array.isArray(sourceLinks)) sourceLinks = [sourceLinks];

        let combinedFormulas: Record<string, string> = {};
        let foundAny = false;

        for (const linkText of sourceLinks) {
            const sourceFile = this.resolveFile(linkText, targetFile.path);
            if (sourceFile) {
                const formulas = await this.getFormulasFromNote(sourceFile);
                if (formulas) { Object.assign(combinedFormulas, formulas); foundAny = true; }
            } else if (manual) console.warn(`无法解析公式源: ${linkText}`);
        }

        if (!foundAny) { if (manual) new Notice(`未找到有效的公式定义`); return; }

        let hasChange = false;
        const settings = this.settingsManager.getSettings().formula;

        await this.app.fileManager.processFrontMatter(targetFile, (data) => {
            const contextData = { ...data };
            delete contextData.formula_src; delete contextData.formula_source; delete contextData.position;

            for (const targetKey of Object.keys(combinedFormulas)) {
                const expression = combinedFormulas[targetKey];
                try {
                    let rawResult = this.evaluateFormula(expression, contextData, targetFile.path);
                    if (typeof rawResult === 'number' && settings.enableRounding) {
                        const factor = Math.pow(10, settings.roundingPrecision);
                        rawResult = Math.round(rawResult * factor) / factor;
                    }
                    if (JSON.stringify(data[targetKey]) !== JSON.stringify(rawResult)) {
                        data[targetKey] = rawResult; hasChange = true; contextData[targetKey] = rawResult; 
                    }
                } catch (error) {
                    console.error(`计算错误 [${targetKey}]:`, error);
                    if (manual) new Notice(`计算错误 [${targetKey}]: ${error.message}`);
                }
            }
        });
        if (manual) new Notice(hasChange ? '✅ 计算完成' : '数值无变化');
    }

    private resolveFile(linkText: string, sourcePath: string): TFile | null {
        if (!linkText) return null;
        let cleanName = String(linkText).replace(/[\[\]"]/g, '').split('|')[0];
        return this.app.metadataCache.getFirstLinkpathDest(cleanName, sourcePath) as TFile;
    }

    private async getFormulasFromNote(file: TFile): Promise<Record<string, string> | null> {
        try {
            const content = await this.app.vault.read(file);
            const match = content.match(/```(?:formulas|yaml)\s*\n([\s\S]*?)\n\s*```/i);
            return (match && match[1]) ? parseYaml(match[1]) : null;
        } catch (e) { return null; }
    }

    private evaluateFormula(expression: string, context: any, sourcePath: string): any {
        Object.keys(context).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (lowerKey !== key && context[lowerKey] === undefined) context[lowerKey] = context[key];
        });

        const getSingleLinkValue = (linkText: string, targetPropName: string): number => {
            if (!linkText) return 0;
            const targetFile = this.resolveFile(linkText, sourcePath);
            if (!targetFile) return 0;
            const targetCache = this.app.metadataCache.getFileCache(targetFile);
            const val = targetCache?.frontmatter?.[targetPropName];
            const num = parseFloat(val);
            return isNaN(num) ? 0 : num;
        };

        const link = (field: string, targetProp: string) => {
            const val = context[field] || context[field.toLowerCase()];
            if (Array.isArray(val)) return getSingleLinkValue(val[0], targetProp);
            return getSingleLinkValue(val, targetProp);
        };

        const sum = (field: string, targetProp: string) => {
            const val = context[field] || context[field.toLowerCase()];
            if (!val) return 0;
            if (Array.isArray(val)) return val.reduce((acc: number, currLink: string) => acc + getSingleLinkValue(currLink, targetProp), 0);
            return getSingleLinkValue(val, targetProp);
        };

        const prop = (key: string) => context[key];
        
        const round = (num: number, decimals?: number) => {
            if (typeof num !== 'number') return num;
            const d = decimals !== undefined ? decimals : this.settingsManager.getSettings().formula.roundingPrecision;
            const factor = Math.pow(10, d);
            return Math.round(num * factor) / factor;
        };

        const isValidVarName = (name: string) => /^[\p{L}_$][\p{L}0-9_$]*$/u.test(name);
        const validKeys = Object.keys(context).filter(isValidVarName);
        const validValues = validKeys.map(k => context[k]);

        try {
            const func = new Function(...validKeys, 'Math', 'moment', 'prop', 'round', 'link', 'sum', 'ctx', `"use strict"; return (${expression});`);
            // @ts-ignore
            return func(...validValues, Math, window.moment, prop, round, link, sum, context);
        } catch (e) { throw e; }
    }
}