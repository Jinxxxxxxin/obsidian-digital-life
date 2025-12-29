// === FILE: core/types.ts ===
import { TFile } from 'obsidian';

// --- Filter ---
export type FilterOperator = 'eq' | 'neq' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'gte' | 'lte';
export type FilterLogic = 'AND' | 'OR';

export interface FilterCondition {
    id: string;
    column: string;
    operator: FilterOperator;
    value: string;
    enabled: boolean;
}

export interface FilterConfig {
    logic: FilterLogic;
    conditions: FilterCondition[];
    enableSplitSeries?: boolean;
}

// --- DataSource ---
export interface DataSource {
    id: string;
    type?: 'folder' | 'file'; 
    folderPath: string;
    filePath?: string;
    
    // 高级过滤配置
    filterConfig?: FilterConfig;
    
    // 兼容旧字段
    tableFilterColumn?: string;
    tableFilterValue?: string;
    
    filter: DataSourceFilter;
}

export interface PropertyConfig { 
    type: 'field' | 'tag'; 
    name: string; 
    aggregation: AggregationType; 
    color?: string; 
    enablePercentage?: boolean;
    filterConfig?: FilterConfig;
}

// --- [新增] 任务管理全局配置 ---
export interface TaskManagementSettings {
    captureInboxPath: string;
    archivePath: string;
    taskNoteAttribute: string; // e.g. "type=task"
    autoArchive: boolean;
    autoCapture: boolean; // [新增] 自动捕获开关
}

// --- Settings ---
export interface DigitalLifePluginSettings {
    dashboards: Dashboard[];
    widgets: Widget[];
    activeDashboardId: string | null;
    noteCreator: { templatePath: string; savePath: string; };
    formula: { hiddenProperties: string[]; isHidingEnabled: boolean; enableRounding: boolean; roundingPrecision: number; };
    
    // [新增]
    taskManagement: TaskManagementSettings;
}

export interface Dashboard { id: string; name: string; layout: LayoutItem[]; createdAt: number; updatedAt: number; isPinned?: boolean; }
export interface LayoutItem { i: string; x: number; y: number; w: number; h: number; widgetId: string; }
export type WidgetType = 'chart' | 'list' | 'todo' | 'markdown';
export interface WidgetBase { id: string; type: WidgetType; title: string; dashboardId: string; }

// [修改] 增加 gitline 类型
export type ChartType = 'line' | 'bar' | 'scatter' | 'pie' | 'radar' | 'heatmap' | 'histogram' | 'gitline';
export type AggregationType = 'sum' | 'count' | 'max' | 'min' | 'avg' | 'raw';
export type XAxisMode = 'frontmatter' | 'created' | 'modified' | 'filename' | 'tags';
export interface DataSourceFilter { tags: string[]; }
export interface RefLine { value: number; label?: string; color?: string; enableRegion?: boolean; regionColor?: string; regionPosition?: 'above' | 'below'; }

export interface ChartWidget extends WidgetBase {
    type: 'chart';
    chartType: ChartType;
    isDonut?: boolean;
    dataSources: DataSource[];
    xAxisMode: XAxisMode;
    xAxisProperty: string[]; 
    xAxisColors?: string[];
    enableLinkPenetration?: boolean; 
    separateAxes?: boolean; 
    enableTranspose?: boolean;
    isTotalCount?: boolean; 
    isCumulative?: boolean;
    yAxisProperties: PropertyConfig[]; 
    yAxisMode?: XAxisMode; 
    yAxisProperty?: string; 
    bubbleSizeProperty?: string; 
    bubbleLabelProperty?: string; 
    bubbleColor?: string; 
    binSize?: number;
    yAxisMin?: number;
    yAxisMax?: number; 
    refLines: RefLine[];
    enableRefLineZones?: boolean;
    enableTooltip: boolean;
    showLegend: boolean;
    showDataLabels: boolean;
    enableSmoothCurve: boolean;
    ignoreEmpty: boolean;
    isStacked?: boolean;
    isHorizontal?: boolean;
}

export interface ListWidget extends WidgetBase { type: 'list'; folderPath: string; filterTags: string[]; sortBy: 'created' | 'modified' | 'name'; sortOrder: 'asc' | 'desc'; limit: number; }
export interface MarkdownWidget extends WidgetBase { type: 'markdown'; filePath: string; mode: 'preview' | 'edit'; }

export interface TodoWidget extends WidgetBase { 
    type: 'todo'; 
    
    sourceType?: 'folder' | 'file'; 
    folderPath: string; 
    filePath?: string;

    includeSubfolders: boolean; 
    hideCompleted: boolean; 
    
    groupBy?: 'file' | 'none'; 
    sortBy?: 'priority' | 'date' | 'default';
}

export interface TaskItem {
    id: string;
    text: string;
    completed: boolean;
    file: TFile;
    line: number;
    priority?: 'high' | 'medium' | 'low';
    dueDate?: string;
    isTaskNoteSubtask?: boolean; 
    indentation?: number; // [新增] 用于 GitLine 绘制层级
    /** Gitto 语义 */
    branchStart?: boolean;  // 是否开启新分支
    branchEnd?: boolean;    // 是否结束当前分支（merge）
}

export type Widget = ChartWidget | ListWidget | TodoWidget | MarkdownWidget;

export const DEFAULT_SETTINGS: DigitalLifePluginSettings = {
    dashboards: [], widgets: [], activeDashboardId: null,
    noteCreator: { templatePath: '', savePath: '' },
    formula: { hiddenProperties: [], isHidingEnabled: true, enableRounding: true, roundingPrecision: 2 },
    taskManagement: { captureInboxPath: '', archivePath: '', taskNoteAttribute: '', autoArchive: false, autoCapture: false }
};