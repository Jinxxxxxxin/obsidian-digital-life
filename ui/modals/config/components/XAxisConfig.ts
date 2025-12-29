// === FILE: ui/modals/config/components/XAxisConfig.ts ===
import { App, Setting, setIcon } from 'obsidian';
import { ChartWidget } from '../../../../core/types';
import { PropertySuggest, TagSuggest } from '../../../components/Suggesters';
import { DataEngine } from '../../../../core/DataEngine';

export class XAxisConfig {
    private app: App;
    private dataEngine: DataEngine;
    private onUpdate: () => void;
    private suggesters: PropertySuggest[] = [];

    constructor(app: App, dataEngine: DataEngine, onUpdate: () => void) {
        this.app = app;
        this.dataEngine = dataEngine;
        this.onUpdate = onUpdate;
    }

    public getSuggesters() { return this.suggesters; }
    public updateSuggesters(props: string[]) { this.suggesters.forEach(s => s.setSuggestions(props)); }

    public render(el: HTMLElement, w: ChartWidget, onPropChange?: () => void) {
        this.suggesters = [];
        el.createEl('h3', { text: 'X 轴 / 分组配置' });
        
        const source = w.dataSources[0];
        const isFileMode = source?.type === 'file'; 

        if (isFileMode) {
            this.renderFileModeSettings(el, w, onPropChange);
        } else {
            this.renderFolderModeSettings(el, w, onPropChange);
        }
    }

    private renderFileModeSettings(el: HTMLElement, w: ChartWidget, onPropChange?: () => void) {
        const container = el.createDiv({ style: 'margin-bottom: 5px;' });
        if (!Array.isArray(w.xAxisProperty) || w.xAxisProperty.length === 0) w.xAxisProperty = [''];

        w.xAxisProperty.forEach((prop, index) => {
            const row = container.createDiv();
            row.style.display = 'grid'; row.style.gridTemplateColumns = '1fr 30px'; row.style.gap = '8px'; row.style.marginBottom = '8px'; row.style.alignItems = 'center';
            
            const input = row.createEl('input', { type: 'text' });
            input.value = prop; input.style.width = '100%'; input.placeholder = '输入表头列名';
            
            const ps = new PropertySuggest(this.app, input, []);
            this.suggesters.push(ps);

            input.oninput = (e) => w.xAxisProperty[index] = (e.target as HTMLInputElement).value;
            input.onblur = () => { if (onPropChange) onPropChange(); };
            
            const rm = row.createSpan('dl-icon-btn');
            setIcon(rm, 'trash');
            rm.style.display = 'flex'; rm.style.justifyContent = 'center'; rm.style.cursor = 'pointer';
            rm.onclick = () => { 
                if (w.xAxisProperty.length > 1) { w.xAxisProperty.splice(index, 1); this.onUpdate(); } 
                else { w.xAxisProperty[0] = ''; this.onUpdate(); }
            };
        });
        
        const s = new Setting(el).setDesc('提示：请输入 Markdown 表格的第一行表头名称作为 X 轴。');
        s.settingEl.style.paddingTop = '0';
    }

    private renderFolderModeSettings(el: HTMLElement, w: ChartWidget, onPropChange?: () => void) {
        const modeSetting = new Setting(el).setDesc('选择用于分组的维度');
        this.addIcon(modeSetting, 'arrow-right-circle', 'X 轴模式');
        modeSetting.addDropdown(d => d
            .addOption('created', '创建日期')
            .addOption('modified', '修改时间')
            .addOption('filename', '文件名')
            .addOption('frontmatter', '属性值')
            .addOption('tags', '标签')
            .setValue(w.xAxisMode).onChange(v => { w.xAxisMode = v as any; this.onUpdate(); }));
        
        if (w.xAxisMode === 'frontmatter' || w.xAxisMode === 'tags') {
            const container = el.createDiv({ style: 'margin-bottom: 5px;' });
            if (!Array.isArray(w.xAxisProperty) || w.xAxisProperty.length === 0) w.xAxisProperty = [''];

            // [核心修复] 增加 Try-Catch 并提供默认空数组，防止 DataEngine 异常导致渲染中断
            let availableProps: string[] = [];
            try {
                const folderPath = w.dataSources?.[0]?.folderPath || '/';
                availableProps = this.dataEngine.getAvailableProperties(folderPath);
            } catch (e) {
                console.error("[DigitalLife] Failed to load available properties:", e);
                // 保持 availableProps 为空，允许界面继续渲染
            }

            w.xAxisProperty.forEach((prop, index) => {
                const row = container.createDiv();
                row.style.display = 'grid'; row.style.gridTemplateColumns = '1fr 30px'; row.style.gap = '8px'; row.style.marginBottom = '8px'; row.style.alignItems = 'center';
                
                const input = row.createEl('input', { type: 'text' });
                input.value = prop; input.style.width = '100%';
                
                if (w.xAxisMode === 'tags') {
                    input.placeholder = '输入标签 (#tag)';
                    new TagSuggest(this.app, input);
                } else {
                    input.placeholder = '输入属性名';
                    const ps = new PropertySuggest(this.app, input, availableProps);
                    this.suggesters.push(ps);
                }

                input.oninput = (e) => w.xAxisProperty[index] = (e.target as HTMLInputElement).value;
                input.onblur = () => { if (onPropChange) onPropChange(); };
                
                const rm = row.createSpan('dl-icon-btn');
                setIcon(rm, 'trash');
                rm.style.display = 'flex'; rm.style.justifyContent = 'center'; rm.style.cursor = 'pointer';
                rm.onclick = () => { w.xAxisProperty.splice(index, 1); this.onUpdate(); };
            });
            
            const btnText = w.xAxisMode === 'tags' ? '+ 标签' : '+ 维度';
            const addBtn = container.createEl('button', { text: btnText });
            addBtn.onclick = () => { w.xAxisProperty.push(''); this.onUpdate(); };

            if (w.xAxisMode === 'frontmatter') {
                 const linkSetting = new Setting(el).setDesc('是否追踪双链笔记中的属性值');
                 this.addIcon(linkSetting, 'link', '双链穿透');
                 linkSetting.addToggle(t => t.setValue(w.enableLinkPenetration || false).onChange(v => { w.enableLinkPenetration = v; this.onUpdate(); }));
                 linkSetting.settingEl.style.borderTop = 'none'; linkSetting.settingEl.style.borderBottom = 'none';
                 if (w.xAxisProperty.length > 1) {
                     const transSetting = new Setting(el).setDesc('将每个属性作为一个独立的分组进行横向对比');
                     this.addIcon(transSetting, 'columns', '转置 X 轴属性');
                     transSetting.addToggle(t => t.setValue(w.enableTranspose || false).onChange(v => { w.enableTranspose = v; this.onUpdate(); }));
                 }
            }
        }
    }

    private addIcon(setting: Setting, icon: string, name: string) {
        const frag = document.createDocumentFragment();
        const container = frag.createDiv();
        container.style.display = 'flex'; container.style.alignItems = 'center';
        const iconSpan = container.createSpan(); setIcon(iconSpan, icon);
        iconSpan.style.display = 'flex'; iconSpan.style.marginRight = '5px';
        container.createSpan({ text: name });
        setting.setName(frag);
    }
}