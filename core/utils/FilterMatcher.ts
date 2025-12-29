// === FILE: core/utils/FilterMatcher.ts ===
import { FilterConfig, FilterCondition } from '../types';

export class FilterMatcher {
    /**
     * 判断某一行数据是否符合过滤配置
     * @param row 数据行 (Key: 列名, Value: 单元格值)
     * @param config 过滤配置对象
     * @returns true: 保留该行; false: 过滤掉
     */
    static match(row: Record<string, string>, config?: FilterConfig): boolean {
        // 如果没有配置或没有启用的条件，默认不过滤
        if (!config || !config.conditions || config.conditions.length === 0) return true;

        const activeConditions = config.conditions.filter(c => c.enabled);
        if (activeConditions.length === 0) return true;

        // 计算每个条件的结果
        const results = activeConditions.map(condition => this.checkCondition(row, condition));

        // 根据逻辑组合结果
        if (config.logic === 'AND') {
            return results.every(r => r === true);
        } else {
            // OR Logic
            return results.some(r => r === true);
        }
    }

    private static checkCondition(row: Record<string, string>, condition: FilterCondition): boolean {
        const colName = condition.column.trim();
        
        // 1. 获取单元格值 (支持模糊匹配表头，处理空格)
        let cellVal = row[colName];
        if (cellVal === undefined) {
            const matchedKey = Object.keys(row).find(k => k.trim() === colName);
            if (matchedKey) cellVal = row[matchedKey];
        }

        const valStr = (cellVal || '').toString().trim();
        const targetStr = condition.value.trim();
        const op = condition.operator;

        // 2. 数值比较准备
        const numVal = parseFloat(valStr);
        const numTarget = parseFloat(targetStr);
        const isNumComp = !isNaN(numVal) && !isNaN(numTarget) && targetStr !== '';

        // 3. 执行比较
        switch (op) {
            case 'eq': return valStr === targetStr;
            case 'neq': return valStr !== targetStr;
            case 'contains': return valStr.toLowerCase().includes(targetStr.toLowerCase());
            case 'not_contains': return !valStr.toLowerCase().includes(targetStr.toLowerCase());
            
            case 'gt': return isNumComp ? numVal > numTarget : valStr > targetStr;
            case 'lt': return isNumComp ? numVal < numTarget : valStr < targetStr;
            case 'gte': return isNumComp ? numVal >= numTarget : valStr >= targetStr;
            case 'lte': return isNumComp ? numVal <= numTarget : valStr <= targetStr;
            
            default: return true;
        }
    }
}