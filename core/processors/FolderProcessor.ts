// === FILE: core/processors/FolderProcessor.ts ===
import { ChartWidget, ChartDataResult, ChartDataset } from '../types';
import { FileService } from '../services/FileService';
import { ValueService } from '../services/ValueService';     // [新增]
import { GroupingService } from '../services/GroupingService'; // [新增]
import { TagService } from '../services/TagService';         // [新增]
import { Aggregator } from '../services/Aggregator';

export class FolderProcessor {
    private fileService: FileService;
    private valueService: ValueService;
    private groupingService: GroupingService;
    private tagService: TagService;

    constructor(
        fileService: FileService, 
        valueService: ValueService, 
        groupingService: GroupingService,
        tagService: TagService
    ) {
        this.fileService = fileService;
        this.valueService = valueService;
        this.groupingService = groupingService;
        this.tagService = tagService;
    }

    public async process(widget: ChartWidget): Promise<ChartDataResult> {
        const source = widget.dataSources[0];
        const files = this.fileService.getFiles(source);
        
        const groupedData = new Map<string, (number | null)[][]>();
        const labelsSet = new Set<string>();

        if (widget.xAxisMode === 'tags') {
            widget.xAxisProperty.forEach(tag => { if (tag) labelsSet.add(tag); });
        }

        for (const file of files) {
            // 使用 GroupingService
            const groupKeys = await this.groupingService.resolveGroupKeys(file, widget);
            
            for (const groupKey of groupKeys) {
                labelsSet.add(groupKey);

                if (!groupedData.has(groupKey)) {
                    const bucketCount = widget.isTotalCount ? 1 : widget.yAxisProperties.length;
                    groupedData.set(groupKey, Array(bucketCount).fill(null).map(() => []));
                }

                const groupValues = groupedData.get(groupKey)!;

                if (widget.isTotalCount) {
                    groupValues[0].push(1);
                } else {
                    for (let i = 0; i < widget.yAxisProperties.length; i++) {
                        const prop = widget.yAxisProperties[i];
                        
                        if (prop.type === 'tag') {
                            // 使用 TagService
                            const hasTag = this.tagService.hasTag(file, prop.name);
                            groupValues[i].push(hasTag ? 1 : 0);
                            continue;
                        }

                        const linkProps = widget.enableLinkPenetration && widget.xAxisProperty.length > 0 
                            ? widget.xAxisProperty 
                            : undefined;

                        // 使用 ValueService
                        const val = await this.valueService.resolveValue(file, prop.name, linkProps);

                        if (val !== null && val !== undefined && !isNaN(val)) {
                            groupValues[i].push(val);
                        } else if (!widget.ignoreEmpty) {
                            groupValues[i].push(0);
                        }
                    }
                }
            }
        }
        
        const sortedLabels = Array.from(labelsSet).sort();
        let datasets: ChartDataset[] = [];

        if (widget.isTotalCount) {
            datasets = [{ label: '文档总数', data: [], enablePercentage: false }];
        } else {
            datasets = widget.yAxisProperties.map(p => ({
                label: p.name || (p.type === 'tag' ? `标签: ${p.name}` : '未命名'),
                data: [],
                enablePercentage: p.enablePercentage
            }));
        }

        for (const label of sortedLabels) {
            const groupValues = groupedData.get(label) || (widget.isTotalCount ? [[]] : widget.yAxisProperties.map(() => []));
            for (let i = 0; i < datasets.length; i++) {
                const rawValues = groupValues[i];
                if (rawValues.length === 0) {
                    if (widget.ignoreEmpty && !widget.isTotalCount) datasets[i].data.push(null);
                    else datasets[i].data.push(0);
                } else {
                    let aggregation = widget.isTotalCount ? 'sum' : widget.yAxisProperties[i].aggregation;
                    if (!widget.isTotalCount && widget.yAxisProperties[i].type === 'tag') aggregation = 'sum';
                    const finalVal = Aggregator.aggregate(rawValues as number[], aggregation);
                    datasets[i].data.push(finalVal);
                }
            }
        }
        if (widget.isCumulative) {
            datasets.forEach(ds => {
                let runningTotal = 0;
                ds.data = ds.data.map(val => {
                    const current = val === null ? 0 : val;
                    runningTotal += current;
                    return runningTotal;
                });
            });
        }
        return { labels: sortedLabels, datasets };
    }
}