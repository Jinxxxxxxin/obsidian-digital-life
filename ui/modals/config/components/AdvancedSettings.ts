// === FILE: ui/modals/config/components/AdvancedSettings.ts ===
import { App, Setting, setIcon } from 'obsidian';
import { ChartWidget } from '../../../../core/cr_def_type_main';
import { PropertySuggest, TagSuggest } from '../../../components/Suggesters';

export class RadarSettings {
    private app: App;
    private onUpdate: () => void;
    private propSuggesters: PropertySuggest[] = [];
    private tagSuggesters: TagSuggest[] = [];

    constructor(app: App, onUpdate: () => void) {
        this.app = app;
        this.onUpdate = onUpdate;
    }

    public updateSuggesters(props: string[], tags: string[]) {
        this.propSuggesters.forEach(s => s.setSuggestions(props));
        this.tagSuggesters.forEach(s => s.setSuggestions(tags));
    }

    public render(el: HTMLElement, w: ChartWidget) {
        this.propSuggesters = [];
        this.tagSuggesters = [];

        el.createEl('h3', { text: '雷达维度配置' });
        
        const container = el.createDiv({ style: 'margin-bottom: 10px;' });
        if (!Array.isArray(w.xAxisProperty)) w.xAxisProperty = [];

        w.xAxisProperty.forEach((prop, index) => {
            const row = container.createDiv();
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '80px 1fr 30px';
            row.style.gap = '8px';
            row.style.marginBottom = '8px';
            row.style.alignItems = 'center';

            const isTag = prop.startsWith('#');
            const typeSel = row.createEl('select');
            typeSel.style.width = '100%';
            typeSel.createEl('option', { value: 'field', text: '属性' }).selected = !isTag;
            typeSel.createEl('option', { value: 'tag', text: '标签' }).selected = isTag;

            const input = row.createEl('input', { type: 'text' });
            input.value = prop;
            input.style.width = '100%';

            const bindSuggester = (type: string) => {
                if (type === 'tag') {
                    input.placeholder = '#标签';
                    const ts = new TagSuggest(this.app, input);
                    this.tagSuggesters.push(ts);
                } else {
                    input.placeholder = '属性名';
                    const ps = new PropertySuggest(this.app, input, []);
                    this.propSuggesters.push(ps);
                }
            };
            
            bindSuggester(isTag ? 'tag' : 'field');

            typeSel.onchange = (e) => {
                const newType = (e.target as HTMLSelectElement).value;
                input.value = newType === 'tag' ? '#' : '';
                w.xAxisProperty[index] = input.value;
                this.onUpdate(); 
            };

            input.oninput = (e) => {
                let val = (e.target as HTMLInputElement).value;
                if (typeSel.value === 'tag' && !val.startsWith('#')) {
                    val = '#' + val.replace(/^#+/, '');
                }
                w.xAxisProperty[index] = val;
            };
            
            const rm = row.createSpan('dl-icon-btn');
            setIcon(rm, 'trash');
            rm.style.display = 'flex'; rm.style.justifyContent = 'center'; rm.style.cursor = 'pointer';
            rm.onclick = () => { w.xAxisProperty.splice(index, 1); this.onUpdate(); };
        });

        const addBtn = container.createEl('button', { text: '+ 添加维度' });
        addBtn.onclick = () => { w.xAxisProperty.push(''); this.onUpdate(); };
    }
}

export class HeatmapSettings {
    private app: App;
    private onUpdate: () => void;
    private suggesters: PropertySuggest[] = [];

    constructor(app: App, onUpdate: () => void) { this.app = app; this.onUpdate = onUpdate; }
    
    public getSuggesters() { return this.suggesters; }
    public updateSuggesters(props: string[]) { this.suggesters.forEach(s => s.setSuggestions(props)); }

    public render(el: HTMLElement, w: ChartWidget) {
        this.suggesters = [];
        const addAxisOptions = (d: any) => d
            .addOption('created', '创建日期')
            .addOption('modified', '修改时间')
            .addOption('frontmatter', '属性值')
            .addOption('filename', '文件名')
            .addOption('tags', '标签');

        const xSetting = new Setting(el).setDesc('选择 X 轴维度');
        this.addIcon(xSetting, 'arrow-right-circle', 'X 轴');
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
        
        const ySetting = new Setting(el).setDesc('选择 Y 轴维度');
        this.addIcon(ySetting, 'arrow-up-circle', 'Y 轴');
        ySetting.addDropdown(d => {
            addAxisOptions(d);
            d.setValue(w.yAxisMode || 'frontmatter');
            d.onChange((v: any) => { w.yAxisMode = v; this.onUpdate(); });
        });

        if (w.yAxisMode === 'frontmatter') {
            new Setting(el).setName('   ↳ Y 属性名').addText(t => { 
                t.setValue(w.yAxisProperty || ''); 
                this.addSuggest(t.inputEl); 
                t.onChange(v => w.yAxisProperty = v); 
            });
        }
        
        const vSetting = new Setting(el).setDesc('决定颜色的数值属性');
        this.addIcon(vSetting, 'thermometer', '热力值');
        vSetting.addText(t => { 
            t.setValue(w.bubbleSizeProperty || ''); 
            this.addSuggest(t.inputEl); 
            t.onChange(v => w.bubbleSizeProperty = v); 
        });
    }

    private addSuggest(el: HTMLInputElement) { this.suggesters.push(new PropertySuggest(this.app, el, [])); }
    
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

export class HistogramSettings {
    private app: App;
    private onUpdate: () => void;
    private suggesters: PropertySuggest[] = [];
    
    constructor(app: App, onUpdate: () => void) { this.app = app; this.onUpdate = onUpdate; }
    
    public getSuggesters() { return this.suggesters; }
    public updateSuggesters(props: string[]) { this.suggesters.forEach(s => s.setSuggestions(props)); }
    
    public render(el: HTMLElement, w: ChartWidget) {
        this.suggesters = [];
        
        el.createEl('h3', { text: '直方图配置' });
        
        const stSetting = new Setting(el).setDesc('选择要统计分布的数值属性（支持单个数值或数组）');
        this.addIcon(stSetting, 'bar-chart-2', '统计字段');
        stSetting.addText(t => { 
                t.setValue(w.xAxisProperty[0] || ''); 
                this.addSuggest(t.inputEl); 
                t.onChange(v => w.xAxisProperty = [v]); 
            });
    }
    private addSuggest(el: HTMLInputElement) { this.suggesters.push(new PropertySuggest(this.app, el, [])); }
    
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