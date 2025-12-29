// === FILE: ui/modals/FilterConfigModal.ts ===
import { App, Modal, Setting, ButtonComponent, setIcon } from 'obsidian';
import { FilterConfig, FilterCondition } from '../../core/types';
import { PropertySuggest } from '../components/Suggesters';
import { DataEngine } from '../../core/DataEngine';

export class FilterConfigModal extends Modal {
    private config: FilterConfig;
    private onSave: (config: FilterConfig) => void;
    private dataEngine: DataEngine;
    private filePath?: string;

    constructor(
        app: App, 
        dataEngine: DataEngine, 
        initialConfig: FilterConfig | undefined, 
        filePath: string | undefined,
        onSave: (config: FilterConfig) => void
    ) {
        super(app);
        this.dataEngine = dataEngine;
        this.filePath = filePath;
        this.onSave = onSave;
        
        this.config = initialConfig ? JSON.parse(JSON.stringify(initialConfig)) : { logic: 'AND', conditions: [] };
        if (!this.config.conditions) this.config.conditions = [];
        if (!this.config.logic) this.config.logic = 'AND';
    }

    onOpen() {
        this.render();
    }

    onClose() {
        this.contentEl.empty();
    }

    private render() {
        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl('h2', { text: '配置过滤条件' });

        // [新增] 对比模式开关
        new Setting(contentEl)
            .setName('多维对比模式 (Split Series)')
            .setDesc('开启后，每一条过滤规则将生成一条独立的曲线/柱状图，用于数据对比。')
            .addToggle(t => t
                .setValue(this.config.enableSplitSeries || false)
                .onChange(v => {
                    this.config.enableSplitSeries = v;
                    this.render(); // 刷新界面状态
                }));

        // 如果开启了对比模式，隐藏逻辑选择（因为每条规则独立）
        if (!this.config.enableSplitSeries) {
            new Setting(contentEl)
                .setName('组合逻辑')
                .setDesc('多条规则之间的关系')
                .addDropdown(d => d
                    .addOption('AND', '满足所有条件 (AND)')
                    .addOption('OR', '满足任一条件 (OR)')
                    .setValue(this.config.logic)
                    .onChange(v => { this.config.logic = v as any; }));
        }

        const listContainer = contentEl.createDiv('dl-filter-list');
        listContainer.style.maxHeight = '400px';
        listContainer.style.overflowY = 'auto';
        listContainer.style.margin = '10px 0';
        listContainer.style.border = '1px solid var(--background-modifier-border)';
        listContainer.style.borderRadius = '4px';
        listContainer.style.padding = '10px';

        if (this.config.conditions.length === 0) {
            listContainer.createDiv({ text: '暂无过滤条件', style: 'text-align: center; color: var(--text-muted); padding: 20px;' });
        } else {
            this.config.conditions.forEach((cond, index) => {
                this.renderConditionRow(listContainer, cond, index);
            });
        }

        const footer = contentEl.createDiv('dl-modal-footer');
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.marginTop = '20px';

        new ButtonComponent(footer)
            .setButtonText('+ 添加条件')
            .onClick(() => {
                this.config.conditions.push({
                    id: crypto.randomUUID(),
                    column: '',
                    operator: 'eq',
                    value: '',
                    enabled: true
                });
                this.render();
            });

        const actionGroup = footer.createDiv({ style: 'display: flex; gap: 10px;' });
        
        new ButtonComponent(actionGroup)
            .setButtonText('取消')
            .onClick(() => this.close());

        new ButtonComponent(actionGroup)
            .setButtonText('保存')
            .setCta()
            .onClick(() => {
                this.onSave(this.config);
                this.close();
            });
    }

    private renderConditionRow(container: HTMLElement, cond: FilterCondition, index: number) {
        const row = container.createDiv('dl-filter-row');
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.alignItems = 'center';
        row.style.marginBottom = '8px';
        row.style.background = 'var(--background-primary)';
        row.style.padding = '8px';
        row.style.borderRadius = '4px';
        row.style.border = '1px solid var(--background-modifier-border)';

        const toggle = row.createEl('input', { type: 'checkbox' });
        toggle.checked = cond.enabled;
        toggle.onchange = (e) => cond.enabled = (e.target as HTMLInputElement).checked;

        const colInput = row.createEl('input', { type: 'text' });
        colInput.placeholder = '列名';
        colInput.value = cond.column;
        colInput.style.flex = '2';
        colInput.oninput = (e) => cond.column = (e.target as HTMLInputElement).value;
        
        try {
            const colSuggest = new PropertySuggest(this.app, colInput, []);
            if (this.filePath) {
                this.dataEngine.getTableHeadersByPath(this.filePath)
                    .then(headers => colSuggest.setSuggestions(headers))
                    .catch(e => console.error(e));
            }
        } catch (e) {}

        const opSelect = row.createEl('select');
        opSelect.style.width = '110px';
        const ops: Record<string, string> = {
            'eq': '等于 (=)', 'neq': '不等于 (!=)', 
            'contains': '包含', 'not_contains': '不包含',
            'gt': '大于 (>)', 'gte': '大于等于 (>=)', 'lt': '小于 (<)', 'lte': '小于等于 (<=)'
        };
        Object.entries(ops).forEach(([k, v]) => {
            const o = opSelect.createEl('option', { value: k, text: v });
            if (k === cond.operator) o.selected = true;
        });
        opSelect.onchange = (e) => cond.operator = (e.target as HTMLSelectElement).value as any;

        const valInput = row.createEl('input', { type: 'text' });
        valInput.placeholder = '值';
        valInput.value = cond.value;
        valInput.style.flex = '2';
        valInput.oninput = (e) => cond.value = (e.target as HTMLInputElement).value;
        
        try {
            const valSuggest = new PropertySuggest(this.app, valInput, []);
            colInput.addEventListener('blur', () => {
                if (this.filePath && colInput.value) {
                    this.dataEngine.getTableColumnValuesByPath(this.filePath!, colInput.value)
                        .then(vals => valSuggest.setSuggestions(vals))
                        .catch(e => console.error(e));
                }
            });
        } catch (e) {}

        const delBtn = row.createSpan('dl-icon-btn');
        setIcon(delBtn, 'trash');
        delBtn.style.cursor = 'pointer';
        delBtn.onclick = () => {
            this.config.conditions.splice(index, 1);
            this.render();
        };
    }
}