import { App, Modal, Setting } from 'obsidian';

export class RenameModal extends Modal {
    private currentName: string;
    private onSubmit: (newName: string) => void;

    constructor(app: App, currentName: string, onSubmit: (newName: string) => void) {
        super(app);
        this.currentName = currentName;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: '重命名看板' });

        let nameValue = this.currentName;

        new Setting(contentEl)
            .setName('名称')
            .addText(text => text
                .setValue(nameValue)
                .onChange(value => nameValue = value)
                .inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') this.submit(nameValue);
                }));

        const footer = contentEl.createDiv('dl-modal-footer');
        const btn = footer.createEl('button', { text: '确认', cls: 'mod-cta' });
        btn.onclick = () => this.submit(nameValue);
    }

    private submit(name: string) {
        if (name.trim()) {
            this.onSubmit(name);
            this.close();
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}