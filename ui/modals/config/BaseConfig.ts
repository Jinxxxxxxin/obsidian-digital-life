// === FILE: ui/modals/config/BaseConfig.ts ===
import { App, Setting } from 'obsidian';
import { ChartWidget } from '../../../../core/types';
import { DataEngine } from '../../../../core/DataEngine';
import { FolderSuggest, FileSuggest, TagSuggest } from '../../components/Suggesters';
import { FilterConfigModal } from '../FilterConfigModal';

export class BaseConfig {
    private app: App;
    private dataEngine: DataEngine;
    private onUpdate: () => void;
    private filterColumnSuggestions: string[] = [];

    constructor(app: App, dataEngine: DataEngine, onUpdate: () => void) {
        this.app = app;
        this.dataEngine = dataEngine;
        this.onUpdate = onUpdate;
    }

    public updateFilterColumnSuggestions(props: string[]) {
        this.filterColumnSuggestions = props;
    }

    public render(el: HTMLElement, w: ChartWidget, onSourceChange: () => void) {
        el.createEl('h3', { text: '基础配置' });

        new Setting(el).setName('图表类型')
            .addDropdown(d => d
                .addOption('bar', '柱状图 (Bar)')
                .addOption('line', '折线图 (Line)')
                .addOption('pie', '饼图 (Pie)')
                .addOption('scatter', '散点图 (Scatter)')
                .addOption('radar', '雷达图 (Radar)')
                .addOption('heatmap', '热力图 (Heatmap)')
                .addOption('bubble', '气泡图 (Bubble)')
                .addOption('histogram', '直方图 (Histogram)')
                .addOption('gitline', '任务分支图 (GitLine)')
                .setValue(w.chartType)
                .onChange(v => {
                    w.chartType = v as any;
                    this.onUpdate();
                }));

        // [新增] GitLine 也支持方向切换
        if (w.chartType === 'bar' || w.chartType === 'gitline') {
            const dirSetting = new Setting(el).setName('布局方向');
            if (w.chartType === 'bar') dirSetting.setDesc('水平条形图');
            if (w.chartType === 'gitline') dirSetting.setDesc('开启后为水平时间轴模式');
            
            dirSetting.addToggle(t => t
                .setValue(w.isHorizontal || false)
                .onChange(v => {
                    w.isHorizontal = v;
                    this.onUpdate();
                }));
        }

        if (w.chartType === 'bar') {
            new Setting(el).setName('堆叠模式').addToggle(t => t.setValue(w.isStacked || false).onChange(v => { w.isStacked = v; this.onUpdate(); }));
        }

        el.createEl('h3', { text: '数据源配置' });

        if (!w.dataSources || w.dataSources.length === 0) {
            w.dataSources = [{ id: crypto.randomUUID(), folderPath: '/', filter: { tags: [] } }];
        }
        const source = w.dataSources[0];

        new Setting(el).setName('数据源类型')
            .addDropdown(d => d
                .addOption('folder', '文件夹聚合')
                .addOption('file', '单文件表格')
                .setValue(source.type || 'folder')
                .onChange(v => {
                    source.type = v as any;
                    w.xAxisMode = source.type === 'file' ? 'frontmatter' : 'created';
                    w.xAxisProperty = [''];
                    this.onUpdate();
                    onSourceChange();
                }));

        if (source.type === 'file') {
            new Setting(el).setName('文件路径')
                .addText(t => {
                    t.setValue(source.filePath || '');
                    try { new FileSuggest(this.app, t.inputEl); } catch(e) {}
                    t.onChange(v => { source.filePath = v; onSourceChange(); });
                });
        } else {
            new Setting(el).setName('数据源文件夹')
                .addText(t => {
                    t.setValue(source.folderPath || '/');
                    try { new FolderSuggest(this.app, t.inputEl); } catch(e) {}
                    t.onChange(v => { source.folderPath = v; onSourceChange(); });
                });

            new Setting(el).setName('标签过滤')
                .addText(t => {
                    if (!source.filter) source.filter = { tags: [] };
                    t.setValue(source.filter.tags.join(', '));
                    try { new TagSuggest(this.app, t.inputEl); } catch(e) {}
                    t.onChange(v => {
                        source.filter.tags = v.split(/[,，]/).map(s => s.trim()).filter(Boolean);
                    });
                });
        }

        const filterContainer = el.createDiv({ style: 'margin-top: 10px; padding: 10px; background: var(--background-secondary); border-radius: 4px;' });
        const infoText = source.filterConfig && source.filterConfig.conditions.length > 0 ? `已启用 ${source.filterConfig.conditions.length} 条规则` : '未配置过滤规则';
        const btnRow = filterContainer.createDiv({ style: 'display: flex; justify-content: space-between; align-items: center;' });
        btnRow.createSpan({ text: infoText, style: 'color: var(--text-muted); font-size: 0.9em;' });
        const editBtn = btnRow.createEl('button', { text: '配置过滤条件' });
        editBtn.onclick = () => {
            new FilterConfigModal(this.app, this.dataEngine, source.filterConfig, source.type === 'file' ? source.filePath : undefined, (newConfig) => {
                source.filterConfig = newConfig;
                this.onUpdate();
            }).open();
        };
    }
}