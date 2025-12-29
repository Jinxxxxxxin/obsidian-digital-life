// === FILE: core/constants.ts ===
import { WidgetType, ChartWidget, ListWidget, TodoWidget, MarkdownWidget } from './types';
import { ColorUtils } from './utils/ColorUtils';

export const WIDGET_DEFAULTS = {
    chart: (): Partial<ChartWidget> => ({
        type: 'chart',
        chartType: 'bar',
        title: '新建统计图表',
        dataSources: [{ 
            id: crypto.randomUUID(), 
            folderPath: '/', 
            filter: { tags: [] },
            filterConfig: { logic: 'AND', conditions: [] }
        }],
        xAxisMode: 'created',
        xAxisProperty: [''],
        yAxisProperties: [{ name: '', aggregation: 'sum', type: 'field', color: ColorUtils.getDefaultColor() }],
        refLines: [],
        enableTooltip: true,
        showLegend: true,
        showDataLabels: true,
        isDonut: false,
        enableLinkPenetration: false
    }),

    list: (): Partial<ListWidget> => ({
        type: 'list',
        title: '新建文件列表',
        folderPath: '/',
        filterTags: [],
        sortBy: 'modified',
        sortOrder: 'desc',
        limit: 10
    }),

    todo: (): Partial<TodoWidget> => ({
        type: 'todo',
        title: '新建待办清单',
        folderPath: '/',
        includeSubfolders: true,
        hideCompleted: false
    }),

    markdown: (): Partial<MarkdownWidget> => ({
        type: 'markdown',
        title: '新建 Markdown 面板',
        filePath: '',
        mode: 'preview'
    })
};

export const DEFAULT_WIDGET_TYPE: WidgetType = 'chart';