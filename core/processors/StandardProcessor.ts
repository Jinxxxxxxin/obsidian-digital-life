// === FILE: core/processors/StandardProcessor.ts ===
import { ChartWidget, ChartDataResult } from '../types';
import { FileService } from '../services/FileService';
import { TableService } from '../services/TableService';
import { ValueService } from '../services/ValueService';     // [新增]
import { GroupingService } from '../services/GroupingService'; // [新增]
import { TagService } from '../services/TagService';         // [新增]

import { TableProcessor } from './TableProcessor';
import { FolderProcessor } from './FolderProcessor';
import { MultiColumnProcessor } from './MultiColumnProcessor';
import { HistogramProcessor } from './HistogramProcessor';

export class StandardProcessor {
    private tableProcessor: TableProcessor;
    private folderProcessor: FolderProcessor;
    private multiColumnProcessor: MultiColumnProcessor;
    private histogramProcessor: HistogramProcessor;
    private fileService: FileService; 

    constructor(
        fileService: FileService, 
        tableService: TableService,
        valueService: ValueService,
        groupingService: GroupingService,
        tagService: TagService
    ) {
        this.fileService = fileService;
        
        this.tableProcessor = new TableProcessor(fileService, tableService);
        this.folderProcessor = new FolderProcessor(fileService, valueService, groupingService, tagService);
        this.multiColumnProcessor = new MultiColumnProcessor(fileService, valueService);
        this.histogramProcessor = new HistogramProcessor(fileService, valueService);
    }

    public async process(widget: ChartWidget): Promise<ChartDataResult> {
        const source = widget.dataSources[0];
        if (source.type === 'file' && source.filePath) {
            return this.tableProcessor.process(widget);
        }
        if (widget.chartType === 'histogram') {
            return this.histogramProcessor.process(widget);
        }
        const isMultiColumnMode = 
            (widget.enableTranspose && widget.xAxisMode === 'frontmatter' && widget.xAxisProperty.length > 0) ||
            (widget.chartType === 'radar');

        if (isMultiColumnMode) {
            const files = this.fileService.getFiles(source);
            return this.multiColumnProcessor.process(files, widget);
        }
        return this.folderProcessor.process(widget);
    }
}