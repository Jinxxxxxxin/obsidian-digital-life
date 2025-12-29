// === FILE: ui/modals/MoveWidgetModal.ts ===
import { App, Modal, Setting } from 'obsidian';
import { Dashboard } from '../../core/cr_def_type_main';

export class MoveWidgetModal extends Modal {
    private dashboards: Dashboard[];
    private currentDashboardId: string;
    private onChoose: (targetDashboardId: string) => void;

    constructor(app: App, dashboards: Dashboard[], currentDashboardId: string, onChoose: (id: string) => void) {
        super(app);
        this.dashboards = dashboards;
        this.currentDashboardId = currentDashboardId;
        this.onChoose = onChoose;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: '移动组件到...' });

        // 排除当前看板
        const targets = this.dashboards.filter(d => d.id !== this.currentDashboardId);

        if (targets.length === 0) {
            contentEl.createDiv({ text: '没有其他看板可供移动。', style: 'color: var(--text-muted); font-style: italic;' });
            return;
        }

        const list = contentEl.createDiv();
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '8px';

        targets.forEach(d => {
            new Setting(list)
                .setName(d.name)
                .addButton(btn => btn
                    .setButtonText('选择')
                    .onClick(() => {
                        this.onChoose(d.id);
                        this.close();
                    }));
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}