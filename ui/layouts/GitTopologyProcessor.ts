import { TaskItem } from '../../core/types';

/**
 * GitTopologyProcessor.process
 * 目标：
 * - 不改变任务顺序（顺序就是时间轴）
 * - 给每个 TaskItem 填充 depth（层级）
 * - 不在这里做 lane（lane 交给 renderer/layout）
 */
export class GitTopologyProcessor {
    static process(rawTasks: TaskItem[]): TaskItem[] {
        const tasks = (rawTasks || []).slice();

        for (const t of tasks) {
            // 如果上游已经给了 depth，就不覆盖
            const anyT: any = t as any;
            if (typeof anyT.depth === 'number' && Number.isFinite(anyT.depth)) continue;

            const line =
                anyT.rawLine ??
                anyT.sourceLine ??
                anyT.textWithIndent ??
                // 兜底：如果 text 里还保留了缩进也能算
                (typeof anyT.text === 'string' ? anyT.text : '');

            anyT.depth = inferDepthFromLine(String(line ?? ''));
        }

        return tasks;
    }
}

/**
 * 从一行 checklist 文本推断层级 depth
 * - Tab 视为一个层级
 * - 空格：按“每 4 个空格 = 1 层”折算（兼容多数 markdown 编辑器）
 * - 如果行里出现 "- [ ]" 或 "- [x]"，只看它之前的缩进
 */
function inferDepthFromLine(line: string): number {
    if (!line) return 0;

    // 截断到 checklist 标记前（更稳定）
    const m = line.match(/^(\s*)([-*+]?\s*\[[ xX]\]\s*)/);
    let indentPart: string;

    if (m) {
        indentPart = m[1] ?? '';
    } else {
        // 没匹配到 checklist，就用整行开头空白
        const m2 = line.match(/^(\s*)/);
        indentPart = m2 ? (m2[1] ?? '') : '';
    }

    let tabs = 0;
    let spaces = 0;

    for (const ch of indentPart) {
        if (ch === '\t') tabs++;
        else if (ch === ' ') spaces++;
    }

    // 4 spaces ≈ 1 depth（常见 markdown 缩进）
    const spaceDepth = Math.floor(spaces / 4);

    return tabs + spaceDepth;
}
