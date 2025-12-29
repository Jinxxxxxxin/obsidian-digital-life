// === FILE: ui/modals/QuickTaskModal.ts ===
import { App, Modal, Setting, Notice } from 'obsidian';
import { DateParser } from '../../core/utils/DateParser';

export class QuickTaskModal extends Modal {
    private onSubmit: (result: string) => void;

    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: '快速创建任务' });
        contentEl.createDiv({ 
            text: '参数: -P [优先级] -D [日期] -p [项目名]', 
            style: 'color: var(--text-muted); font-size: 0.8em; margin-bottom: 10px;' 
        });

        const inputContainer = contentEl.createDiv();
        inputContainer.style.width = '100%';
        inputContainer.style.marginBottom = '15px';

        const input = inputContainer.createEl('input', { 
            type: 'text', 
            placeholder: '例如: 写代码 -P 高 -D 今天 -p 数字人生'
        });
        input.style.width = '100%'; 
        input.style.boxSizing = 'border-box';
        input.focus();

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.parseAndSubmit(input.value);
                this.close();
            }
        });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('创建')
                .setCta()
                .onClick(() => {
                    this.parseAndSubmit(input.value);
                    this.close();
                }));
    }

    private parseAndSubmit(raw: string) {
        if (!raw.trim()) return;

        let priority = '';
        let text = raw;
        const pMatch = text.match(/-P\s+(高|中|低|high|medium|low)/i);
        if (pMatch) {
            const pVal = pMatch[1].toLowerCase();
            if (['高', 'high'].includes(pVal)) priority = '🔺';
            else if (['中', 'medium'].includes(pVal)) priority = '⏫';
            else if (['低', 'low'].includes(pVal)) priority = '🔽';
            text = text.replace(pMatch[0], '');
        }

        let dateStr = '';
        const dMatch = text.match(/-D\s+(\S+)/i);
        if (dMatch) {
            const parsedDate = DateParser.parse(dMatch[1]);
            if (parsedDate) {
                dateStr = `📅 ${parsedDate}`;
            } else {
                new Notice(`无法识别日期: ${dMatch[1]}`);
            }
            text = text.replace(dMatch[0], '');
        }

        // [新增] 项目名称参数 -p
        let projectStr = '';
        const projMatch = text.match(/-p\s+(\S+)/i);
        if (projMatch) {
            projectStr = ` [[${projMatch[1]}]]`;
            text = text.replace(projMatch[0], '');
        }

        const cleanContent = text.replace(/\s+/g, ' ').trim();
        const taskLine = `- [ ] ${cleanContent}${projectStr} ${priority} ${dateStr}`.trim();

        this.onSubmit(taskLine);
    }

    onClose() {
        this.contentEl.empty();
    }
}