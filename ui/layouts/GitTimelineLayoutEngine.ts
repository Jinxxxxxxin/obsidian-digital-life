// === FILE: ui/layouts/GitTimelineLayoutEngine.ts ===
// (基本保持上一版逻辑，但为了稳健性，确保 connectedParentIndices 准确)

import { TaskItem } from '../../core/types';

export interface TaskLayout {
    task: TaskItem;
    index: number;
    lane: number;          
    connectedParentIndices: number[];
    isBranchStart: boolean; // 方便渲染器识别
    isBranchEnd: boolean;   // 方便渲染器识别
}

export class GitTimelineLayoutEngine {
    build(tasks: TaskItem[]): TaskLayout[] {
        const layouts: TaskLayout[] = [];
        let lastFilePath = '';
        
        // 记录父任务索引到车道的映射
        const parentToLane = new Map<number, number>();
        
        // 记录每个父任务下每个缩进层级的最后任务索引
        // 键格式：`${parentIndex}-${indent}`
        const lastTaskByParentAndIndent = new Map<string, number>();
        
        // 记录每个父任务下的子任务状态
        const parentSubtasks = new Map<number, { count: number; completed: number }>();
        
        // 记录每个任务的父任务索引和缩进层级
        const taskInfo = new Map<number, { parentIndex: number; indent: number }>();
        
        // 记录每个父任务的子任务结束位置
        const parentSubtaskEnds = new Map<number, number>();
        
        // 记录每个任务的索引和位置信息
        const taskPositions = new Map<number, number>();

        tasks.forEach((task, index) => {
            // 文件切换检测
            // @ts-ignore
            const currentFilePath = task.file?.path || '';
            if (currentFilePath !== lastFilePath) {
                lastFilePath = currentFilePath;
                parentToLane.clear();
                lastTaskByParentAndIndent.clear();
                parentSubtasks.clear();
                taskInfo.clear();
                parentSubtaskEnds.clear();
                taskPositions.clear();
            }

            const currentIndent = task.indentation || 0;
            let lane: number;
            let isBranchStart = false;
            let isBranchEnd = false;
            
            // 查找最近的父任务（缩进比当前小的第一个任务）
            let parentIndex = -1;
            for (let j = index - 1; j >= 0; j--) {
                const prevTask = tasks[j];
                const prevIndent = prevTask.indentation || 0;
                if (prevIndent < currentIndent) {
                    parentIndex = j;
                    break;
                }
            }
            
            // 1. 分配车道
            if (currentIndent === 0) {
                // 不带缩进的任务，始终在lane 0
                lane = 0;
            } else if (parentIndex !== -1) {
                // 带缩进的任务，检查是否已有同父任务的子任务车道
                if (parentToLane.has(parentIndex)) {
                    // 同一父任务的子任务，使用相同车道
                    lane = parentToLane.get(parentIndex)!;
                } else {
                    // 新的父任务，分配新车道
                    const parentLayout = layouts[parentIndex];
                    lane = parentLayout.lane + 1;
                    parentToLane.set(parentIndex, lane);
                    isBranchStart = true;
                }
            } else {
                // 没有父任务但有缩进，默认lane 1
                lane = 1;
                isBranchStart = true;
            }
            
            // 2. 跟踪子任务状态
            if (parentIndex !== -1) {
                if (!parentSubtasks.has(parentIndex)) {
                    parentSubtasks.set(parentIndex, { count: 0, completed: 0 });
                }
                const subtaskState = parentSubtasks.get(parentIndex)!;
                subtaskState.count++;
                if (task.completed) {
                    subtaskState.completed++;
                }
                
                // 更新父任务的子任务结束位置
                parentSubtaskEnds.set(parentIndex, index);
            }
            
            // 3. 回归检测：只有当同一层级的所有子任务都完成时才回归
            if (index > 0) {
                const prevTask = tasks[index - 1];
                const prevIndent = prevTask.indentation || 0;
                
                // 检查是否从高缩进回到低缩进
                if (prevIndent > currentIndent) {
                    // 检查是否是同一父任务的最后一个子任务
                    const prevParentIndex = taskInfo.get(index - 1)?.parentIndex || -1;
                    if (prevParentIndex !== -1 && parentSubtasks.has(prevParentIndex)) {
                        const subtaskState = parentSubtasks.get(prevParentIndex)!;
                        // 只有当所有子任务都完成时才回归
                        if (subtaskState.completed === subtaskState.count) {
                            isBranchEnd = true;
                        }
                    } else {
                        // 没有子任务状态跟踪，默认回归
                        isBranchEnd = true;
                    }
                }
            }

            // 4. 连线计算
            const connectedParentIndices: number[] = [];
            
            // 生成唯一键：父任务索引 + 缩进层级
            const parentIndentKey = `${parentIndex}-${currentIndent}`;
            
            // 连接到同一父任务的上一个同缩进任务
            if (lastTaskByParentAndIndent.has(parentIndentKey)) {
                const lastTaskIndex = lastTaskByParentAndIndent.get(parentIndentKey)!;
                connectedParentIndices.push(lastTaskIndex);
            } else {
                // 连接到父任务（只在分支开始时）
                if (isBranchStart && parentIndex !== -1) {
                    connectedParentIndices.push(parentIndex);
                }
            }
            
            // 回归连接：连接到直接父任务，而不是根任务
            if (isBranchEnd && index > 0) {
                // 获取直接父任务索引
                const directParentIndex = taskInfo.get(index - 1)?.parentIndex || -1;
                if (directParentIndex !== -1) {
                    // 连接到直接父任务
                    connectedParentIndices.push(directParentIndex);
                } else {
                    // 没有父任务信息，连接到上一个任务
                    connectedParentIndices.push(index - 1);
                }
            }

            layouts.push({
                task,
                index,
                lane,
                connectedParentIndices,
                isBranchStart,
                isBranchEnd
            });
            
            // 更新记录
            lastTaskByParentAndIndent.set(parentIndentKey, index);
            taskInfo.set(index, { parentIndex: parentIndex, indent: currentIndent });
            taskPositions.set(index, index); // 简化处理，实际位置由渲染器计算
        });

        // 5. 添加父任务延伸逻辑：确保父任务线延伸到其最下方子任务的位置
        // 这里我们需要在渲染器中处理父任务延伸，因为位置计算依赖于渲染器的参数

        return layouts;
    }
}