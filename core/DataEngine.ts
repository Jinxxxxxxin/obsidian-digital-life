// === FILE: core/DataEngine.ts ===
import { App, TFile } from 'obsidian';
import { ChartWidget, ChartDataResult, BubbleDataResult, HeatmapDataResult, TaskItem } from './types';
import { FileService } from './services/FileService';
import { TableService } from './services/TableService';
import { ValueService } from './services/ValueService';
import { GroupingService } from './services/GroupingService';
import { TagService } from './services/TagService';
import { TaskService } from './services/TaskService'; // [新增]
import { LinkResolver } from './services/LinkResolver';

import { StandardProcessor } from './processors/StandardProcessor';
import { BubbleProcessor } from './processors/BubbleProcessor';
import { HeatmapProcessor } from './processors/HeatmapProcessor';
import { GitLineProcessor } from './processors/GitLineProcessor'; // [新增]
import { SettingsManager } from './SettingsManager';

export class DataEngine {
    private fileService: FileService;
    private tableService: TableService;
    private valueService: ValueService;
    private groupingService: GroupingService;
    private tagService: TagService;
    private linkResolver: LinkResolver;
    private taskService: TaskService; 

    private standardProcessor: StandardProcessor;
    private bubbleProcessor: BubbleProcessor;
    private heatmapProcessor: HeatmapProcessor;
    private gitLineProcessor: GitLineProcessor; 

    private app: App;

    constructor(app: App, settingsManager?: SettingsManager) {
        this.app = app;
        
        this.fileService = new FileService(app);
        this.tableService = new TableService(app);
        this.tagService = new TagService(app);
        this.linkResolver = new LinkResolver(app);
        
        // 关键：初始化 TaskService
        if (settingsManager) {
            this.taskService = new TaskService(app, settingsManager);
            this.gitLineProcessor = new GitLineProcessor(this.taskService);
        }
        
        this.valueService = new ValueService(app, this.linkResolver, this.tagService);
        this.groupingService = new GroupingService(this.tagService, this.valueService);
        
        this.standardProcessor = new StandardProcessor(this.fileService, this.tableService, this.valueService, this.groupingService, this.tagService);
        this.bubbleProcessor = new BubbleProcessor(this.fileService, this.valueService);
        this.heatmapProcessor = new HeatmapProcessor(this.fileService, this.valueService);
    }

    public async getGitLineData(widget: ChartWidget): Promise<TaskItem[]> {
        if (this.gitLineProcessor) return this.gitLineProcessor.process(widget);
        return [];
    }

    public async getChartData(w: ChartWidget) { return this.standardProcessor.process(w); }
    public async getBubbleData(w: ChartWidget) { return this.bubbleProcessor.process(w); }
    public async getHeatmapData(w: ChartWidget) { return this.heatmapProcessor.process(w); }
    
    public async getMarkdownTableData(f: TFile) { return this.tableService.getMarkdownTableData(f); }
    public getAvailableProperties(p: string) { return this.fileService.getAvailableProperties(p); }
    public getAvailableTags(p: string) { return this.fileService.getAvailableTags(p); }
    public getAvailableLinkedProperties(p: string, l: string[]) { return this.fileService.getAvailableLinkedProperties(p, l); }
}