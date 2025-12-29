// === FILE: ui/modals/config/components/RefLineConfig.ts ===
import { Setting, setIcon } from 'obsidian';
import { ChartWidget } from '../../../../core/types';

export class RefLineConfig {
    public render(el: HTMLElement, w: ChartWidget, onUpdate: () => void) {
        el.createEl('h3', { text: '参考线 (Reference Lines)' });
        const container = el.createDiv({ style: 'margin-bottom: 20px;' });

        if (!w.refLines) w.refLines = [];

        w.refLines.forEach((line, index) => {
            const row = container.createDiv();
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '80px 1fr 40px 30px';
            row.style.gap = '8px';
            row.style.marginBottom = '8px';
            row.style.alignItems = 'center';
            row.style.background = 'var(--background-secondary)';
            row.style.padding = '5px';
            row.style.borderRadius = '4px';

            const valInput = row.createEl('input', { type: 'number' });
            valInput.placeholder = '值';
            valInput.value = String(line.value);
            valInput.style.width = '100%';
            valInput.oninput = (e) => {
                line.value = Number((e.target as HTMLInputElement).value);
                onUpdate();
            };

            const labelInput = row.createEl('input', { type: 'text' });
            labelInput.placeholder = '标签 (可选)';
            labelInput.value = line.label || '';
            labelInput.style.width = '100%';
            labelInput.oninput = (e) => {
                line.label = (e.target as HTMLInputElement).value;
                onUpdate();
            };

            const colContainer = row.createDiv();
            const col = colContainer.createEl('input', { type: 'color' });
            col.value = line.color || '#ff0000';
            col.style.width = '25px'; col.style.height = '25px'; col.style.border = 'none'; col.style.padding = '0'; col.style.cursor = 'pointer';
            col.onchange = (e) => {
                line.color = (e.target as HTMLInputElement).value;
                onUpdate();
            };

            const rm = row.createSpan('dl-icon-btn');
            setIcon(rm, 'trash');
            rm.style.cursor = 'pointer';
            rm.onclick = () => {
                w.refLines.splice(index, 1);
                onUpdate();
            };
        });

        const addBtn = container.createEl('button', { text: '+ 添加参考线' });
        addBtn.onclick = () => {
            w.refLines.push({ value: 0, label: 'Target', color: '#ff0000' });
            onUpdate();
        };
        
        // 区域着色选项
        if (w.chartType === 'line' || w.chartType === 'bar') {
             const zoneSetting = new Setting(el).setName('启用参考线区域着色').setDesc('在参考线之间填充颜色');
             zoneSetting.addToggle(t => t.setValue(w.enableRefLineZones || false).onChange(v => { w.enableRefLineZones = v; onUpdate(); }));
             zoneSetting.settingEl.style.padding = '0'; zoneSetting.settingEl.style.border = 'none';
        }
    }
}