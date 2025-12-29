// === FILE: core/processors/MultiColumnProcessor.ts ===
import { ChartWidget, ChartDataResult, ChartDataset } from '../types';
import { FileService } from '../services/FileService';
import { ValueService } from '../services/ValueService';
import { Aggregator } from '../services/Aggregator';

export class MultiColumnProcessor {
    private fileService: FileService;
    private valueService: ValueService;

    constructor(fileService: FileService, valueService: ValueService) {
        this.fileService = fileService;
        this.valueService = valueService;
    }

    public async process(files: any[], widget: ChartWidget): Promise<ChartDataResult> {
        const labels = widget.xAxisProperty.filter(p => !!p);
        const buckets = new Map<string, number[]>();
        labels.forEach(l => buckets.set(l, []));
        const yConfig = widget.yAxisProperties[0];
        const targetPropName = yConfig ? yConfig.name : ''; 
        const aggType = yConfig ? yConfig.aggregation : (widget.chartType === 'radar' ? 'avg' : 'sum');

        for (const file of files) {
            for (const xProp of labels) {
                let val: number | null = null;
                if (widget.enableLinkPenetration && targetPropName) {
                    val = await this.valueService.resolveValue(file, targetPropName, [xProp]);
                } else {
                    val = await this.valueService.resolveValue(file, xProp);
                }
                if (val !== null && val !== undefined && !isNaN(val)) buckets.get(xProp)?.push(val);
            }
        }
        
        const data: number[] = [];
        for (const label of labels) {
            const values = buckets.get(label) || [];
            data.push(Aggregator.aggregate(values, aggType));
        }
        const datasets: ChartDataset[] = [{
            label: widget.chartType === 'radar' ? '数值分布' : (targetPropName || '数值'),
            data: data,
            enablePercentage: false,
            color: '#4361ee'
        }];
        return { labels, datasets };
    }
}