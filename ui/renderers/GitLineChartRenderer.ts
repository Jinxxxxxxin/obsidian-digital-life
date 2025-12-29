// === FILE: ui/renderers/GitLineChartRenderer.ts ===
import { App } from 'obsidian';
import { BaseChartRenderer } from './BaseChartRenderer';
import { TaskItem } from '../../core/types';
import { GitLineDrawer } from './GitLineDrawer';
import { GitLineInteractions } from './GitLineInteractions';

type Side = -1 | 0 | 1;

type Node = {
    index: number;
    task: TaskItem;

    // = task.indentation, 文件节点为 -1
    depth: number;

    parentIndex: number | null;

    // 同文件内子树结束 index（按文档顺序扫描）
    subtreeEnd: number;

    // 自己 + 所有后代是否都 completed
    subtreeDone: boolean;

    // 子树节点数量（用于左右平衡）
    subtreeSize: number;

    // 子树最大深度（用于射线结束位置）
    subtreeMaxDepth: number;

    // 思维导图左右侧：root=0, 左=-1, 右=+1
    side: Side;
};

export class GitLineChartRenderer extends BaseChartRenderer {
    private drawer = new GitLineDrawer();
    private interactions = new GitLineInteractions();
    private app: App;

    constructor(app: App) {
        super();
        this.app = app;
    }

    render(rawTasks: TaskItem[]): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.overflow = 'auto';

        const svg = document.createElementNS(this.ns, 'svg');
        const g = document.createElementNS(this.ns, 'g');
        svg.setAttribute('width', '100%');
        svg.appendChild(g);
        wrapper.appendChild(svg);

        // ===== 1) 单文件限制 =====
        const tasks = (rawTasks || []).slice().sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
        const targetFile = tasks[0]?.file?.path;

        if (!targetFile) {
            svg.setAttribute('height', '200');
            svg.setAttribute('viewBox', '0 0 800 200');
            this.interactions.setSvgGroup(g);
            this.interactions.setupInteractions(wrapper);
            return wrapper;
        }

        const singleFileTasks = tasks.filter(t => t.file?.path === targetFile);

        // ===== 2) 文件主节点（Root） =====
        const fileName = targetFile.split('/').pop() || targetFile;
        const fileNode: Node = {
            index: 0,
            task: {
                id: `file-${targetFile}`,
                text: fileName,
                completed: false,
                file: singleFileTasks[0]?.file,
                line: 0,
            },
            depth: -1,
            parentIndex: null,
            subtreeEnd: singleFileTasks.length,
            subtreeDone: false,
            subtreeSize: 1,
            subtreeMaxDepth: -1,
            side: 0,
        };

        // ===== 3) 任务节点（索引从1开始） =====
        const taskNodes: Node[] = singleFileTasks.map((t, i) => ({
            index: i + 1,
            task: t,
            depth: Math.max(0, t.indentation ?? 0),
            parentIndex: null,
            subtreeEnd: i + 1,
            subtreeDone: false,
            subtreeSize: 1,
            subtreeMaxDepth: Math.max(0, t.indentation ?? 0),
            side: 0,
        }));

        const nodes: Node[] = [fileNode, ...taskNodes];

        // ===== 4) parent / subtree / children =====
        buildParentIndexByIndentation(nodes);
        computeSubtreeEndByIndentation(nodes);

        const childrenMap = buildChildrenMap(nodes);

        computeSubtreeSize(nodes, childrenMap);
        computeSubtreeDone(nodes, childrenMap);
        computeSubtreeMaxDepth(nodes, childrenMap);

        // ===== 5) 左右分配：root children 左右平衡，后代继承父侧 =====
        assignMindmapSides(nodes, childrenMap);

        // ===== 6) 金字塔布局：同层同一排（y=level），x=子树宽度分配 + 左右镜像 =====
        const paddingX = 70;
        const paddingY = 70;

        const levelStep = 90;      // “层级行距”（同层同y）
        const slotStep = 150;      // “同侧横向槽位宽度”
        const baseGap = 120;       // root 到左右区域的间隔
        const labelPad = 220;      // 预留文本空间（防止 viewBox 裁切）

        const colors = ['#e06c75', '#98c379', '#61afef', '#e5c07b', '#c678dd', '#56b6c2'];
        const nodeRadius = 6;

        const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);

        // 计算每侧占用的“槽位总宽”
        const rootKids = childrenMap.get(0) ?? [];
        const leftKids = rootKids.filter(i => nodes[i].side === -1);
        const rightKids = rootKids.filter(i => nodes[i].side === 1);

        const widthMemo = new Map<number, number>();
        const slotCenter = new Map<number, number>(); // 仅对非root有意义（同侧局部坐标）

        const subtreeWidth = (i: number): number => {
            if (widthMemo.has(i)) return widthMemo.get(i)!;
            const kids = childrenMap.get(i) ?? [];
            if (kids.length === 0) {
                widthMemo.set(i, 1);
                return 1;
            }
            let sum = 0;
            for (const c of kids) sum += subtreeWidth(c);
            const w = Math.max(1, sum);
            widthMemo.set(i, w);
            return w;
        };

        const assignSlots = (i: number, start: number) => {
            const w = subtreeWidth(i);
            slotCenter.set(i, start + w / 2);
            let cur = start;
            const kids = childrenMap.get(i) ?? [];
            for (const c of kids) {
                const cw = subtreeWidth(c);
                assignSlots(c, cur);
                cur += cw;
            }
        };

        let leftSlots = 0;
        for (const k of leftKids) leftSlots += subtreeWidth(k);
        let rightSlots = 0;
        for (const k of rightKids) rightSlots += subtreeWidth(k);

        // 给左右两侧分别从0开始分配槽位（局部坐标）
        let acc = 0;
        for (const k of leftKids) {
            assignSlots(k, acc);
            acc += subtreeWidth(k);
        }
        acc = 0;
        for (const k of rightKids) {
            assignSlots(k, acc);
            acc += subtreeWidth(k);
        }

        const leftSpan = baseGap + leftSlots * slotStep + labelPad;
        const rightSpan = baseGap + rightSlots * slotStep + labelPad;

        const rootX = paddingX + leftSpan;

        const yOfDepth = (depth: number) => {
            const level = depth + 1; // depth=-1 => level0 (root)
            return paddingY + level * levelStep;
        };

        const nodeColor = (n: Node) => colors[(Math.max(0, n.depth) + 1) % colors.length];

        const pos = (n: Node) => {
            if (n.depth === -1) return { x: rootX, y: yOfDepth(-1) };

            const sc = slotCenter.get(n.index) ?? 0.5; // leaf默认0.5
            const localX = sc * slotStep;

            if (n.side === 1) return { x: rootX + baseGap + localX, y: yOfDepth(n.depth) };
            if (n.side === -1) return { x: rootX - (baseGap + localX), y: yOfDepth(n.depth) };

            // 极端兜底：没分配到side的节点
            return { x: rootX + baseGap + localX, y: yOfDepth(n.depth) };
        };

        const bottomY = yOfDepth(maxDepth) + 140;

        // ===== A) 每个节点自己的“实线射线” =====
        for (const n of nodes) {
            const p = pos(n);
            const color = nodeColor(n);

            // 未完成子树：延伸到底；子树完成：到子树最深层
            let endY = bottomY;
            if (n.depth !== -1 && n.subtreeDone) {
                endY = yOfDepth(n.subtreeMaxDepth);
            }

            // root 主射线始终到底
            if (n.depth === -1) endY = bottomY;

            this.drawer.drawPath(g, `M ${p.x} ${p.y} L ${p.x} ${endY}`, color, false);
        }

        // ===== B) 分叉连线：父射线映射点 -> 子节点（实线） =====
        for (const n of nodes) {
            if (n.parentIndex == null) continue;
            if (n.depth === -1) continue;

            const parent = nodes[n.parentIndex];
            const parentPos = pos(parent);
            const childPos = pos(n);

            // 父射线在 child.y 的映射点
            const mapX = parentPos.x;
            const y = childPos.y;

            this.drawer.drawPath(g, `M ${mapX} ${y} L ${childPos.x} ${y}`, nodeColor(parent), false);
        }

        // ===== C) 回收线：仅完成时，回到“上一层射线映射点”（虚线） =====
        for (const n of nodes) {
            if (n.parentIndex == null) continue;
            if (n.depth === -1) continue;

            // ✅ 默认：子树完成才回收（更稳定）
            if (!n.subtreeDone) continue;

            // 如果你坚持“只要当前节点 completed 就回收”，改成：
            // if (!n.task.completed) continue;

            const parent = nodes[n.parentIndex];
            const parentPos = pos(parent);

            const endY = yOfDepth(n.subtreeMaxDepth);
            const fromX = pos(n).x;
            const toX = parentPos.x;

            this.drawer.drawPath(g, `M ${fromX} ${endY} L ${toX} ${endY}`, nodeColor(n), true);
        }

        // ===== D) 节点 + 文本（左右侧分别左右对齐） =====
        for (const n of nodes) {
            const p = pos(n);
            const color = nodeColor(n);

            const r = n.depth === -1 ? nodeRadius + 2 : nodeRadius;
            this.drawer.drawNode(g, p.x, p.y, r, color, !!n.task.completed);

            drawLabel(g, n, p.x, p.y);
        }

        // ===== E) viewBox / 尺寸（避免裁切） =====
        const totalHeight = bottomY + paddingY;
        const totalWidth = paddingX + leftSpan + rightSpan + paddingX;

        svg.setAttribute('height', `${totalHeight}`);
        svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
        wrapper.style.maxHeight = '100%';

        this.interactions.setSvgGroup(g);
        this.interactions.setupInteractions(wrapper);

        return wrapper;
    }
}

/* ---------------- label ---------------- */

function drawLabel(g: SVGGElement, n: Node, x: number, y: number) {
    const text = n.task.text || '';
    if (!text) return;

    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    const isRoot = n.depth === -1;
    const side = isRoot ? 1 : n.side;

    const dx = isRoot ? 14 : (side === -1 ? -14 : 14);

    t.setAttribute('x', String(x + dx));
    t.setAttribute('y', String(y));
    t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('text-anchor', side === -1 ? 'end' : 'start');

    t.style.fontSize = '14px';
    t.style.userSelect = 'none';
    t.style.pointerEvents = 'none';

    if (n.task.completed) {
        t.style.opacity = '0.55';
        t.style.textDecoration = 'line-through';
    }

    t.textContent = text;
    g.appendChild(t);
}

/* ---------------- parent / subtree / children ---------------- */

function buildParentIndexByIndentation(nodes: Node[]) {
    const stack: Array<{ depth: number; index: number }> = [];

    for (let i = 0; i < nodes.length; i++) {
        const d = nodes[i].depth;

        if (d === -1) {
            nodes[i].parentIndex = null;
            stack.push({ depth: d, index: i });
            continue;
        }

        while (stack.length && stack[stack.length - 1].depth >= d) stack.pop();

        let parentIndex: number | null = null;
        const targetParentDepth = d - 1;

        for (let s = stack.length - 1; s >= 0; s--) {
            if (stack[s].depth === targetParentDepth) {
                parentIndex = stack[s].index;
                break;
            }
        }

        nodes[i].parentIndex = parentIndex;
        stack.push({ depth: d, index: i });
    }
}

function computeSubtreeEndByIndentation(nodes: Node[]) {
    for (let i = 0; i < nodes.length; i++) {
        const d = nodes[i].depth;
        const file = nodes[i].task.file?.path ?? '';

        let end = i;
        for (let j = i + 1; j < nodes.length; j++) {
            const fileJ = nodes[j].task.file?.path ?? '';
            if (fileJ !== file) break;
            if (nodes[j].depth <= d) break;
            end = j;
        }
        nodes[i].subtreeEnd = end;
    }
}

function buildChildrenMap(nodes: Node[]) {
    const map = new Map<number, number[]>();
    for (const n of nodes) {
        if (n.parentIndex == null) continue;
        const arr = map.get(n.parentIndex) ?? [];
        arr.push(n.index);
        map.set(n.parentIndex, arr);
    }
    return map;
}

function computeSubtreeSize(nodes: Node[], childrenMap: Map<number, number[]>) {
    const memo = new Map<number, number>();

    const dfs = (i: number): number => {
        if (memo.has(i)) return memo.get(i)!;
        const kids = childrenMap.get(i) ?? [];
        let size = 1;
        for (const c of kids) size += dfs(c);
        memo.set(i, size);
        nodes[i].subtreeSize = size;
        return size;
    };

    for (let i = 0; i < nodes.length; i++) dfs(i);
}

function computeSubtreeDone(nodes: Node[], childrenMap: Map<number, number[]>) {
    const memo = new Map<number, boolean>();

    const dfs = (i: number): boolean => {
        if (memo.has(i)) return memo.get(i)!;

        const selfDone = !!nodes[i].task.completed;
        const kids = childrenMap.get(i) ?? [];

        let ok = selfDone;
        for (const c of kids) ok = ok && dfs(c);

        memo.set(i, ok);
        nodes[i].subtreeDone = ok;
        return ok;
    };

    for (let i = 0; i < nodes.length; i++) dfs(i);
}

function computeSubtreeMaxDepth(nodes: Node[], childrenMap: Map<number, number[]>) {
    const memo = new Map<number, number>();

    const dfs = (i: number): number => {
        if (memo.has(i)) return memo.get(i)!;
        const kids = childrenMap.get(i) ?? [];
        let md = nodes[i].depth;
        for (const c of kids) md = Math.max(md, dfs(c));
        memo.set(i, md);
        nodes[i].subtreeMaxDepth = md;
        return md;
    };

    for (let i = 0; i < nodes.length; i++) dfs(i);
}

/**
 * root children 左右平衡分配，后代继承父侧
 */
function assignMindmapSides(nodes: Node[], childrenMap: Map<number, number[]>) {
    nodes[0].side = 0;

    const rootKids = childrenMap.get(0) ?? [];
    let leftW = 0;
    let rightW = 0;

    for (const kid of rootKids) {
        const w = nodes[kid].subtreeSize || 1;
        const side: Side = leftW <= rightW ? -1 : 1;

        nodes[kid].side = side;
        if (side === -1) leftW += w;
        else rightW += w;

        propagate(kid, side);
    }

    function propagate(i: number, side: Side) {
        const kids = childrenMap.get(i) ?? [];
        for (const c of kids) {
            nodes[c].side = side;
            propagate(c, side);
        }
    }
}
