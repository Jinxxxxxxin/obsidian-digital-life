// === FILE: core/services/TaskParser.ts ===
import { TFile } from 'obsidian';
import { TaskItem } from '../types';

export class TaskParser {
    
    static parseLine(text: string, file: TFile, lineNumber: number): TaskItem | null {
        // [修复] 支持 - [ ] 和 * [ ]
        const match = text.match(/^\s*[-*]\s*\[([ xX])\]\s*(.*)$/);
        if (!match) return null;

        const isCompleted = match[1] !== ' ';
        let content = match[2].trim();

        // 1. 解析优先级
        let priority: 'high' | 'medium' | 'low' | undefined;
        if (content.includes('🔺')) { priority = 'high'; content = content.replace('🔺', ''); }
        else if (content.includes('⏫')) { priority = 'medium'; content = content.replace('⏫', ''); }
        else if (content.includes('🔽')) { priority = 'low'; content = content.replace('🔽', ''); }

        // 2. 解析日期 (📅 YYYY-MM-DD)
        let dueDate: string | undefined;
        // [修复] 提取日期后，从内容中移除它
        const dateMatch = content.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            dueDate = dateMatch[1];
            content = content.replace(dateMatch[0], ''); 
        }

        // 清理可能残留的多余空格
        content = content.trim();

        return {
            id: `${file.path}-${lineNumber}`,
            text: content,
            completed: isCompleted,
            file: file,
            line: lineNumber,
            priority,
            dueDate,
            isTaskNote: false
        };
    }

    static parseTaskNote(file: TFile, fm: any): TaskItem {
        const isCompleted = fm.status === 'done' || fm.completed === true;
        
        let priority: 'high' | 'medium' | 'low' | undefined;
        if (fm.priority === 'high' || fm.priority === 'High') priority = 'high';
        else if (fm.priority === 'medium') priority = 'medium';
        else if (fm.priority === 'low') priority = 'low';

        return {
            id: file.path,
            text: file.basename,
            completed: isCompleted,
            file: file,
            line: -1,
            priority,
            dueDate: fm.due_date || fm.dueDate,
            isTaskNote: true
        };
    }
}