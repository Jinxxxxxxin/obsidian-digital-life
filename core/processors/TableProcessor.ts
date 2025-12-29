// === FILE: core/processors/TableProcessor.ts ===
import { ChartWidget, ChartDataResult, ChartDataset, FilterCondition } from '../types';
import { TableService } from '../services/TableService';
import { FileService } from '../services/FileService'; // Need for getFiles
import { Aggregator } from '../services/Aggregator';
import { FilterMatcher } from '../utils/FilterMatcher';
import { ColorUtils } from '../utils/ColorUtils';
import { NumberUtils } from '../utils/NumberUtils';

export class TableProcessor {
    private fileService: FileService;
    private tableService: TableService;

    constructor(fileService: FileService, tableService: TableService) {
        this.fileService = fileService;
        this.tableService = tableService;
    }

    public async process(widget: ChartWidget): Promise<ChartDataResult> {
        const source = widget.dataSources[0];
        const files = this.fileService.getFiles(source);
        if (files.length === 0) return { labels: [], datasets: [] };
        
        // 使用 TableService
        const { headers, rows: rawRows } = await this.tableService.getMarkdownTableData(files[0]);
        if (rawRows.length === 0) return { labels: [], datasets: [] };

        let xColKey = widget.xAxisProperty[0] || headers[0];
        const firstRow = rawRows[0] || {};
        const realXColKey = Object.keys(firstRow).find(k => k.trim() === xColKey.trim()) || xColKey;

        if (source.filterConfig && source.filterConfig.enableSplitSeries) {
            return this.processSplitSeries(widget, rawRows, realXColKey, source.filterConfig.conditions);
        }

        let rows = rawRows;
        if (source.filterConfig) {
            rows = rows.filter(r => FilterMatcher.match(r, source.filterConfig));
        } else if (source.tableFilterColumn && source.tableFilterValue) {
            const targetCol = source.tableFilterColumn.trim();
            const targetVal = source.tableFilterValue.trim();
            if (targetCol) {
                rows = rows.filter(r => {
                    let cellVal = r[targetCol];
                    if (cellVal === undefined) {
                        const k = Object.keys(r).find(key => key.trim() === targetCol);
                        if (k) cellVal = r[k];
                    }
                    return (cellVal || '').toString().trim() === targetVal;
                });
            }
        }

        const { labels, groupedRows } = this.groupRows(rows, realXColKey);
        const datasets = this.generateDatasets(widget, labels, groupedRows);
        return { labels, datasets };
    }

    // ... processSplitSeries, groupRows, generateDatasets 逻辑保持不变 ...
    // ... 唯一需要修改的是 parseNumber 调用改为 NumberUtils.parse ...
    
    private processSplitSeries(widget: ChartWidget, allRows: Record<string, string>[], xKey: string, conditions: FilterCondition[]): ChartDataResult {
        // ... (保持逻辑) ...
        const activeConditions = conditions.filter(c => c.enabled);
        if (activeConditions.length === 0) return { labels: [], datasets: [] };
        const unionLabelsSet = new Set<string>();
        activeConditions.forEach(cond => {
            const filtered = allRows.filter(r => FilterMatcher.match(r, { logic: 'AND', conditions: [cond] }));
            filtered.forEach(row => {
                let groupKey = row[xKey] || 'Unknown';
                const dateMatch = groupKey.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
                if (dateMatch) groupKey = dateMatch[1];
                unionLabelsSet.add(groupKey);
            });
        });
        const sortedLabels = Array.from(unionLabelsSet).sort();
        const datasets: ChartDataset[] = [];

        activeConditions.forEach((cond, index) => {
            const subRows = allRows.filter(r => FilterMatcher.match(r, { logic: 'AND', conditions: [cond] }));
            const { groupedRows } = this.groupRows(subRows, xKey);
            widget.yAxisProperties.forEach(yConf => {
                const data = sortedLabels.map(label => {
                    const currentGroupRows = groupedRows.get(label) || [];
                    let finalRows = currentGroupRows;
                    if (yConf.filterConfig) finalRows = finalRows.filter(r => FilterMatcher.match(r, yConf.filterConfig));
                    const values: number[] = [];
                    const colName = yConf.name.trim();
                    finalRows.forEach(row => {
                        let rawVal = row[yConf.name];
                        if (rawVal === undefined) { const k = Object.keys(row).find(key => key.trim() === colName); if (k) rawVal = row[k]; }
                        const num = NumberUtils.parse(rawVal); // [修改]
                        if (num !== null) values.push(num); else if (!widget.ignoreEmpty) values.push(0);
                    });
                    return Aggregator.aggregate(values, yConf.aggregation || 'sum');
                });
                const opMap: Record<string, string> = { 'eq': '=', 'neq': '!=', 'gt': '>', 'lt': '<', 'contains': '含' };
                const opStr = opMap[cond.operator] || cond.operator;
                const condLabel = `${cond.column} ${opStr} ${cond.value}`;
                const label = widget.yAxisProperties.length > 1 ? `${yConf.name} (${condLabel})` : condLabel;
                datasets.push({ label: label, data: data, enablePercentage: yConf.enablePercentage, color: ColorUtils.getColor(index) });
            });
        });
        this.applyPostProcessing(widget, datasets);
        return { labels: sortedLabels, datasets };
    }

    private groupRows(rows: Record<string, string>[], xKey: string) {
        const groupedRows = new Map<string, Record<string, string>[]>();
        const labelsSet = new Set<string>();
        rows.forEach(row => {
            let groupKey = row[xKey] || 'Unknown';
            const dateMatch = groupKey.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
            if (dateMatch) groupKey = dateMatch[1];
            labelsSet.add(groupKey);
            if (!groupedRows.has(groupKey)) groupedRows.set(groupKey, []);
            groupedRows.get(groupKey)!.push(row);
        });
        return { labels: Array.from(labelsSet).sort(), groupedRows };
    }

    private generateDatasets(widget: ChartWidget, labels: string[], groupedRows: Map<string, Record<string, string>[]>) {
        const datasets: ChartDataset[] = widget.yAxisProperties.map((yConf) => {
            const data = labels.map(label => {
                let currentGroupRows = groupedRows.get(label) || [];
                if (yConf.filterConfig) currentGroupRows = currentGroupRows.filter(r => FilterMatcher.match(r, yConf.filterConfig));
                const values: number[] = [];
                const colName = yConf.name.trim();
                currentGroupRows.forEach(row => {
                    let rawVal = row[yConf.name];
                    if (rawVal === undefined) { const k = Object.keys(row).find(key => key.trim() === colName); if (k) rawVal = row[k]; }
                    const num = NumberUtils.parse(rawVal); // [修改]
                    if (num !== null) values.push(num); else if (!widget.ignoreEmpty) values.push(0);
                });
                return Aggregator.aggregate(values, yConf.aggregation || 'sum');
            });
            return { label: yConf.name, data: data, enablePercentage: yConf.enablePercentage, color: yConf.color || '#4361ee' };
        });
        this.applyPostProcessing(widget, datasets);
        return datasets;
    }
    private applyPostProcessing(widget: ChartWidget, datasets: ChartDataset[]) { if (widget.isCumulative) { datasets.forEach(ds => { let runningTotal = 0; ds.data = ds.data.map(val => { const current = val === null ? 0 : val; runningTotal += current; return runningTotal; }); }); } }
}