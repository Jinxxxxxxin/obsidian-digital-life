// === FILE: ui/modals/config/components/BubbleSettings.ts ===
import { App, Setting, setIcon } from 'obsidian';
import { ChartWidget } from '../../../../core/cr_def_type_main';
import { PropertySuggest } from '../../../components/Suggesters';

export class BubbleSettings {
    private app: App;
    private onUpdate: () => void;
    private suggesters: PropertySuggest[] = [];

    constructor(app: App, onUpdate: () => void) {
        this.app = app;
        this.onUpdate = onUpdate;
    }

    public getSuggesters() { return this.suggesters; }
    public updateSuggesters(props: string[]) { this.suggesters.forEach(s => s.setSuggestions(props)); }

    public render(el: HTMLElement, w: ChartWidget) {
        this.suggesters = [];
        
        el.createEl('h3', { text: '气泡图配置' });

        const addAxisOptions = (d: any) => d
            .addOption('frontmatter', '属性值')
            .addOption('created', '创建时间')
            .addOption('modified', '修改时间')
            .addOption('filename', '文件名')
            .addOption('tags', '标签');

        const zSetting = new Setting(el).setDesc('指定一个数值属性，用于决定气泡的大小（半径）');
        this.addIcon(zSetting, 'maximize', '气泡大小 (Z轴)');
        zSetting.addText(t => { 
            t.setValue(w.bubbleSizeProperty || ''); 
            this.addSuggest(t.inputEl); 
            t.onChange(v => w.bubbleSizeProperty = v); 
        });

        const ySetting = new Setting(el).setDesc('选择 Y 轴的数据来源');
        this.addIcon(ySetting, 'arrow-up-circle', 'Y 轴模式');
        ySetting.addDropdown(d => {
            addAxisOptions(d);
            d.setValue(w.yAxisMode || 'frontmatter');
            d.onChange((v: any) => { w.yAxisMode = v; this.onUpdate(); });
        });

        if (w.yAxisMode === 'frontmatter' || !w.yAxisMode) {
            new Setting(el).setName('   ↳ Y 属性名').addText(t => { 
                t.setValue(w.yAxisProperty || ''); 
                this.addSuggest(t.inputEl); 
                t.onChange(v => w.yAxisProperty = v); 
            });
        }

        const xSetting = new Setting(el).setDesc('选择 X 轴的数据来源');
        this.addIcon(xSetting, 'arrow-right-circle', 'X 轴模式');
        xSetting.addDropdown(d => {
            addAxisOptions(d);
            d.setValue(w.xAxisMode || 'created');
            d.onChange((v: any) => { w.xAxisMode = v; this.onUpdate(); });
        });

        if (w.xAxisMode === 'frontmatter') {
            new Setting(el).setName('   ↳ X 属性名').addText(t => { 
                t.setValue(w.xAxisProperty[0] || ''); 
                this.addSuggest(t.inputEl); 
                t.onChange(v => w.xAxisProperty = [v]); 
            });
        }

        const lblSetting = new Setting(el).setDesc('鼠标悬停气泡时显示的标题（默认显示文件名）');
        this.addIcon(lblSetting, 'tag', '标注字段');
        lblSetting.addText(t => { 
            t.setValue(w.bubbleLabelProperty || ''); 
            this.addSuggest(t.inputEl); 
            t.onChange(v => w.bubbleLabelProperty = v); 
        });
        
        el.createEl('hr');
        
        const colSetting = new Setting(el);
        this.addIcon(colSetting, 'palette', '气泡颜色');
        colSetting.addColorPicker(c => c
            .setValue(w.bubbleColor || '#4361ee')
            .onChange(v => w.bubbleColor = v));
    }

    private addSuggest(el: HTMLInputElement) {
        this.suggesters.push(new PropertySuggest(this.app, el, []));
    }

    // [修复] Flexbox 对齐
    private addIcon(setting: Setting, icon: string, name: string) {
        const frag = document.createDocumentFragment();
        const container = frag.createDiv();
        container.style.display = 'flex';
        container.style.alignItems = 'center';

        const iconSpan = container.createSpan();
        setIcon(iconSpan, icon);
        iconSpan.style.display = 'flex';
        iconSpan.style.marginRight = '5px';
        
        container.createSpan({ text: name });
        setting.setName(frag);
    }
}