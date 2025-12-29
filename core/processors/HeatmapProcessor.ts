// === FILE: core/processors/HeatmapProcessor.ts ===
import { ChartWidget, HeatmapDataResult } from '../types';
import { FileService } from '../services/FileService';
import { ValueService } from '../services/ValueService';
import { Aggregator } from '../services/Aggregator';

export class HeatmapProcessor {
    private fileService: FileService;
    private valueService: ValueService;

    constructor(fileService: FileService, valueService: ValueService) {
        this.fileService = fileService;
        this.valueService = valueService;
    }

    public async process(widget: ChartWidget): Promise<HeatmapDataResult> {
        const source = widget.dataSources[0];
        const files = this.fileService.getFiles(source);
        const grid = new Map<string, Map<string, number[]>>();
        const xSet = new Set<string>();
        const ySet = new Set<string>();

        for (const file of files) {
            const xKey = await this.valueService.resolveAxisValue(file, widget.xAxisMode, widget.xAxisProperty[0]);
            const yKey = await this.valueService.resolveAxisValue(file, widget.yAxisMode || 'frontmatter', widget.yAxisProperty);
            const val = await this.valueService.resolveValue(file, widget.bubbleSizeProperty || 'value'); 

            if (val === null) continue;
            const xStr = String(xKey);
            const yStr = String(yKey);
            xSet.add(xStr);
            ySet.add(yStr);
            if (!grid.has(xStr)) grid.set(xStr, new Map());
            if (!grid.get(xStr)!.has(yStr)) grid.get(xStr)!.set(yStr, []);
            grid.get(xStr)!.get(yStr)!.push(val);
        }
        const xLabels = Array.from(xSet).sort();
        const yLabels = Array.from(ySet).sort();
        const matrix: number[][] = [];
        let min = Infinity; let max = -Infinity;
        for (let i = 0; i < yLabels.length; i++) {
            const row: number[] = [];
            for (let j = 0; j < xLabels.length; j++) {
                const values = grid.get(xLabels[j])?.get(yLabels[i]) || [];
                const finalVal = values.length > 0 ? Aggregator.aggregate(values, 'sum') : 0;
                row.push(finalVal);
                if (finalVal < min) min = finalVal;
                if (finalVal > max) max = finalVal;
            }
            matrix.push(row);
        }
        return { matrix, xLabels, yLabels, min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
    }
}