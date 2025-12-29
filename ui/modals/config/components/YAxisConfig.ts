// === FILE: ui/modals/config/components/YAxisConfig.ts ===
import { App, Setting, setIcon } from 'obsidian';
import { ChartWidget } from '../../../../core/types';
import { PropertySuggest, TagSuggest } from '../../../components/Suggesters';
import { ColorUtils } from '../../../../core/utils/ColorUtils';

export class YAxisConfig {
    private app: App;
    private onUpdate: () => void;
    private propSuggesters: PropertySuggest[] = [];
    private tagSuggesters: TagSuggest[] = [];

    constructor(app: App, onUpdate: () => void) {
        this.app = app;
        this.onUpdate = onUpdate;
    }

    public getSuggesters(): PropertySuggest[] { return this.propSuggesters; }
    public updateSuggesters(props: string[]) { this.propSuggesters.forEach(s => s.setSuggestions(props)); }

    public render(el: HTMLElement, w: ChartWidget) {
        this.propSuggesters = [];
        this.tagSuggesters = [];
        
        const source = w.dataSources[0];
        const isFileMode = source?.type === 'file';

        el.createEl('h3', { text: 'Y 轴 / 指标配置', style: 'margin-bottom: 10px;' });
        
        // [修复] 使用 Flex 布局
        const controls = el.createDiv({ cls: 'dl-y-axis-switches' });

        if (!isFileMode) {
            const totalContainer = controls.createDiv({ style: 'display: flex; align-items: center;' });
            const totalToggle = new Setting(totalContainer).addToggle(t => t.setValue(w.isTotalCount || false).onChange(v => { w.isTotalCount = v; this.onUpdate(); }));
            this.addIcon(totalToggle, 'sigma', '总数统计模式');
            totalToggle.settingEl.style.border = 'none'; 
            totalToggle.settingEl.style.padding = '0'; 
            totalToggle.nameEl.style.marginRight = '8px';
        }

        const cumContainer = controls.createDiv({ style: 'display: flex; align-items: center;' });
        const cumToggle = new Setting(cumContainer).addToggle(t => t.setValue(w.isCumulative || false).onChange(v => { w.isCumulative = v; this.onUpdate(); }));
        this.addIcon(cumToggle, 'trending-up', '累加模式');
        cumToggle.settingEl.style.border = 'none'; 
        cumToggle.settingEl.style.padding = '0'; 
        cumToggle.nameEl.style.marginRight = '8px';

        if (w.isTotalCount && !isFileMode) {
            el.createDiv({ text: 'ⓘ 当前模式将忽略具体属性配置，直接统计 X 轴分组下的文档数量。', style: 'color: var(--text-muted); font-style: italic; margin-bottom: 20px; padding: 10px; background-color: var(--background-secondary); border-radius: 4px;' });
        } else {
            this.renderPropertyMetrics(el, w, isFileMode);
        }
    }

    private renderPropertyMetrics(el: HTMLElement, w: ChartWidget, isFileMode: boolean) {
        const yContainer = el.createDiv({ style: 'margin-bottom: 20px;' });
        let labelText = isFileMode ? '表格列名 (数值列)' : (w.enableLinkPenetration ? '目标笔记属性名 (穿透)' : '当前笔记属性名');
        yContainer.createDiv({ text: labelText, style: 'color: var(--text-muted); font-size: 0.8em; margin-bottom: 8px;' });

        w.yAxisProperties.forEach((yProp, index) => {
            if (!yProp.type) yProp.type = 'field';

            const row = yContainer.createDiv();
            row.style.display = 'grid';
            const isLine = w.chartType === 'line';
            
            const gridCols = isFileMode 
                ? (isLine ? '1fr 70px 30px 40px 30px' : '1fr 70px 30px 30px')
                : (isLine ? '80px 1fr 70px 30px 40px 30px' : '80px 1fr 70px 30px 30px');

            row.style.gridTemplateColumns = gridCols;
            row.style.gap = '6px';
            row.style.marginBottom = '8px';
            row.style.alignItems = 'center';
            row.style.backgroundColor = 'var(--background-secondary)';
            row.style.padding = '6px';
            row.style.borderRadius = '4px';

            if (!isFileMode) {
                const typeSel = row.createEl('select');
                typeSel.style.width = '100%';
                typeSel.createEl('option', { value: 'field', text: '属性' }).selected = yProp.type === 'field';
                typeSel.createEl('option', { value: 'tag', text: '标签' }).selected = yProp.type === 'tag';
                typeSel.onchange = (e) => { yProp.type = (e.target as HTMLSelectElement).value as any; yProp.name = ''; this.onUpdate(); };
            }

            const input = row.createEl('input', { type: 'text' });
            input.value = yProp.name;
            input.style.width = '100%';
            
            if (!isFileMode && yProp.type === 'tag') {
                input.placeholder = '#标签';
                const ts = new TagSuggest(this.app, input);
                this.tagSuggesters.push(ts);
            } else {
                input.placeholder = isFileMode ? '列名' : '属性名';
                const ps = new PropertySuggest(this.app, input, []);
                this.propSuggesters.push(ps);
            }
            input.oninput = (e) => yProp.name = (e.target as HTMLInputElement).value;

            const sel = row.createEl('select');
            sel.style.width = '100%';
            const aggMap: Record<string, string> = { 'sum': '求和', 'count': '计数', 'avg': '平均', 'max': '最大', 'min': '最小' };
            Object.keys(aggMap).forEach(key => {
                const o = sel.createEl('option', { value: key, text: aggMap[key] });
                if (key === yProp.aggregation) o.selected = true;
            });
            sel.onchange = (e) => yProp.aggregation = (e.target as HTMLSelectElement).value as any;
            if (!isFileMode && yProp.type === 'tag') { sel.disabled = true; sel.value = 'sum'; }

            const colContainer = row.createDiv({ style: 'display: flex; justify-content: center;' });
            const col = colContainer.createEl('input', { type: 'color' });
            col.value = yProp.color || ColorUtils.getDefaultColor();
            col.style.width = '25px'; col.style.height = '25px'; col.style.padding = '0'; col.style.border = 'none'; col.style.cursor = 'pointer';
            col.onchange = (e) => yProp.color = (e.target as HTMLInputElement).value;

            if (isLine) {
                const toggleContainer = row.createDiv({ style: 'display: flex; align-items: center; justify-content: center; height: 100%; margin-top: 0;' });
                const s = new Setting(toggleContainer).addToggle(t => {
                    t.setValue(yProp.enablePercentage || false);
                    t.setTooltip('是否百分比显示');
                    t.onChange(v => { yProp.enablePercentage = v; this.onUpdate(); });
                });
                s.setName(''); s.infoEl.remove();
                s.settingEl.style.border = 'none'; s.settingEl.style.padding = '0'; s.settingEl.style.minHeight = 'auto';
                const toggleEl = s.controlEl.querySelector('.checkbox-container');
                if(toggleEl) (toggleEl as HTMLElement).style.margin = '0';
            }

            const rm = row.createSpan('dl-icon-btn');
            setIcon(rm, 'trash');
            rm.style.display = 'flex'; rm.style.justifyContent = 'center'; rm.style.cursor = 'pointer';
            rm.onclick = () => { w.yAxisProperties.splice(index, 1); this.onUpdate(); };
        });

        const addY = yContainer.createEl('button', { text: '+ 添加指标列' });
        addY.onclick = () => { w.yAxisProperties.push({ name: '', aggregation: 'sum', type: 'field', color: ColorUtils.getDefaultColor() }); this.onUpdate(); };
    }

    private addIcon(setting: Setting, icon: string, name: string) {
        const frag = document.createDocumentFragment();
        const container = frag.createDiv();
        container.style.display = 'flex'; container.style.alignItems = 'center';
        const iconSpan = container.createSpan();
        setIcon(iconSpan, icon);
        iconSpan.style.display = 'flex'; iconSpan.style.marginRight = '5px';
        container.createSpan({ text: name });
        setting.setName(frag);
    }
}