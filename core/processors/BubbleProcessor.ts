// === FILE: core/processors/BubbleProcessor.ts ===
import { ChartWidget, BubbleDataResult, BubblePoint } from '../types';
import { FileService } from '../services/FileService';
import { ValueService } from '../services/ValueService';

export class BubbleProcessor {
    private fileService: FileService;
    private valueService: ValueService;

    constructor(fileService: FileService, valueService: ValueService) {
        this.fileService = fileService;
        this.valueService = valueService;
    }

    public async process(widget: ChartWidget): Promise<BubbleDataResult> {
        if (widget.dataSources.length === 0) return { points: [] };
        const source = widget.dataSources[0];
        const files = this.fileService.getFiles(source);
        const points: BubblePoint[] = [];
        const xMap = new Map<string, number>();
        const yMap = new Map<string, number>();
        let xCounter = 0; let yCounter = 0;

        for (const file of files) {
            let xRaw: string | number = 'Unknown';
            if (widget.xAxisMode === 'frontmatter' && widget.xAxisProperty.length > 0) {
                const val = await this.valueService.resolveValue(file, widget.xAxisProperty[0]);
                if (typeof val === 'number') xRaw = val;
                else {
                    const str = await this.valueService.resolveAxisValue(file, 'frontmatter', widget.xAxisProperty[0]);
                    xRaw = String(str);
                }
            } else {
                xRaw = String(await this.valueService.resolveAxisValue(file, widget.xAxisMode));
            }

            let yRaw: string | number = 0;
            if (widget.yAxisMode === 'frontmatter' && widget.yAxisProperty) {
                const val = await this.valueService.resolveValue(file, widget.yAxisProperty);
                if (typeof val === 'number') yRaw = val;
                else {
                    const str = await this.valueService.resolveAxisValue(file, 'frontmatter', widget.yAxisProperty);
                    yRaw = String(str);
                }
            } else if (widget.yAxisMode) {
                yRaw = String(await this.valueService.resolveAxisValue(file, widget.yAxisMode));
            }

            let rVal = 1;
            if (widget.bubbleSizeProperty) {
                const v = await this.valueService.resolveValue(file, widget.bubbleSizeProperty);
                rVal = v !== null ? v : 1;
            }

            let label = file.basename;
            if (widget.bubbleLabelProperty) {
                const v = await this.valueService.resolveAxisValue(file, 'frontmatter', widget.bubbleLabelProperty);
                if (v && v !== 'Unknown') label = String(v);
            }

            let xNum: number;
            if (typeof xRaw === 'number') { xNum = xRaw; } else { if (!xMap.has(String(xRaw))) xMap.set(String(xRaw), xCounter++); xNum = xMap.get(String(xRaw))!; }
            let yNum: number;
            if (typeof yRaw === 'number') { yNum = yRaw; } else { if (!yMap.has(String(yRaw))) yMap.set(String(yRaw), yCounter++); yNum = yMap.get(String(yRaw))!; }

            points.push({ x: xNum, y: yNum, r: rVal, label: label, rawX: String(xRaw), rawY: String(yRaw) });
        }
        return { points, xLabels: xMap.size > 0 ? Array.from(xMap.keys()) : undefined, yLabels: yMap.size > 0 ? Array.from(yMap.keys()) : undefined };
    }
}