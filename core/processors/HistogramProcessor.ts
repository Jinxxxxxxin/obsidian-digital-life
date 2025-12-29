// === FILE: core/processors/HistogramProcessor.ts ===
import { ChartWidget, ChartDataResult } from '../types';
import { FileService } from '../services/FileService';
import { ValueService } from '../services/ValueService';

export class HistogramProcessor {
    private fileService: FileService;
    private valueService: ValueService;

    constructor(fileService: FileService, valueService: ValueService) {
        this.fileService = fileService;
        this.valueService = valueService;
    }

    public async process(widget: ChartWidget): Promise<ChartDataResult> {
        const source = widget.dataSources[0];
        const files = this.fileService.getFiles(source);
        const propName = widget.xAxisProperty[0];
        if (!propName) return { labels: [], datasets: [] };

        const values: number[] = [];
        for (const file of files) {
            const fileValues = await this.valueService.resolveNumericArray(file, propName);
            values.push(...fileValues);
        }

        if (values.length === 0) return { labels: [], datasets: [] };
        // ... (分箱逻辑保持不变)
        const min = Math.min(...values);
        const max = Math.max(...values);
        let binSize = widget.binSize;
        if (!binSize || binSize <= 0) {
            const k = Math.ceil(Math.log2(values.length) + 1);
            binSize = (max - min) / k;
            if (binSize === 0) binSize = 1;
        }
        const start = Math.floor(min / binSize) * binSize;
        const bucketCount = Math.floor((max - start) / binSize) + 1;
        const buckets = new Array(bucketCount).fill(0);
        const labels: string[] = [];
        for(let i=0; i<bucketCount; i++) {
            const bStart = start + i * binSize;
            const bEnd = bStart + binSize;
            const l1 = Number.isInteger(bStart) ? bStart : bStart.toFixed(1);
            const l2 = Number.isInteger(bEnd) ? bEnd : bEnd.toFixed(1);
            labels.push(`${l1}-${l2}`);
        }
        values.forEach(v => {
            let idx = Math.floor((v - start) / binSize);
            if (idx >= bucketCount) idx = bucketCount - 1;
            if (idx < 0) idx = 0;
            buckets[idx]++;
        });
        return { labels, datasets: [{ label: '频次', data: buckets, enablePercentage: false, color: '#4361ee' }] };
    }
}