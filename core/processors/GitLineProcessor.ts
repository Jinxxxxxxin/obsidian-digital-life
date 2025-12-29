// === FILE: core/processors/GitLineProcessor.ts ===
import { ChartWidget, TaskItem } from '../types';
import { TaskService } from '../services/TaskService';

export class GitLineProcessor {
    private taskService: TaskService;

    constructor(taskService: TaskService) {
        this.taskService = taskService;
    }

    public async process(widget: ChartWidget): Promise<TaskItem[]> {
        const source = widget.dataSources[0];
        
        // 复用 TodoWidget 的查询逻辑
        const todoConfig: any = {
            sourceType: source.type,
            folderPath: source.folderPath,
            filePath: source.filePath,
            hideCompleted: false, // GitLine 需要历史数据
            sortBy: 'default'
        };

        const tasks = await this.taskService.getTasks(todoConfig);
        
        // [修复] 处理缩进层级 (Visual Hierarchy)
        tasks.forEach(task => {
            if (task.indentation === undefined) task.indentation = 0;

            // 逻辑 1.1: 任务笔记作为主线，其子任务作为支线
            // 如果一个任务被标记为 isTaskNoteSubtask，说明它属于某个“任务笔记”文件
            // 我们将它的缩进 + 1，这样 Level 0 (Master) 留给隐形的“文件节点”，Level 1+ 为任务
            if (task.isTaskNoteSubtask) {
                task.indentation += 1;
            }
            
            // 逻辑 1.2: 行内任务
            // 未缩进 (indentation=0) -> 主线
            // 缩进 (indentation>0) -> 支线
            // (无需额外处理，TaskService 解析的 indentation 已经符合此逻辑)
        });

        // 排序：按文件路径 + 行号，保证树状结构顺序
        tasks.sort((a, b) => {
            if (a.file.path !== b.file.path) {
                return a.file.path.localeCompare(b.file.path);
            }
            return a.line - b.line;
        });

        return tasks;
    }
}