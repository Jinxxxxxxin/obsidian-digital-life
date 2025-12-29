// === FILE: core/services/GroupingService.ts ===
import { TFile } from 'obsidian';
import { ChartWidget } from '../types';
import { TagService } from './TagService';
import { ValueService } from './ValueService';

export class GroupingService {
    private tagService: TagService;
    private valueService: ValueService;

    constructor(tagService: TagService, valueService: ValueService) {
        this.tagService = tagService;
        this.valueService = valueService;
    }

    public async resolveGroupKeys(file: TFile, widget: ChartWidget): Promise<string[]> {
        // 模式 A: 标签分组 (可能属于多个组)
        if (widget.xAxisMode === 'tags') {
            const matchedKeys: string[] = [];
            widget.xAxisProperty.forEach(configTag => {
                if (configTag && this.tagService.hasTag(file, configTag)) {
                    matchedKeys.push(configTag);
                }
            });
            return matchedKeys;
        }

        // 模式 B: Frontmatter 多字段组合 (例如: 地区-部门)
        if (widget.xAxisMode === 'frontmatter') {
            const values: string[] = [];
            // 注意：这里我们简化处理，通常只取第一个属性作为主分组，除非是组合键需求
            // 这里为了兼容多列配置，我们遍历所有属性
            for (const prop of widget.xAxisProperty) {
                if (!prop) continue;
                const val = await this.valueService.resolveAxisValue(file, 'frontmatter', prop);
                values.push(String(val));
            }
            return [values.join('-') || 'Unknown'];
        }

        // 模式 C: 标准单值分组 (日期、文件名等)
        const val = await this.valueService.resolveAxisValue(file, widget.xAxisMode);
        return [String(val)];
    }
}