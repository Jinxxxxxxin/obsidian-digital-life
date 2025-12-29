// === FILE: ui/modals/CsvImportModal.ts ===
import { App, FuzzySuggestModal, Modal, Setting, TFile } from 'obsidian';

export class CsvSelectionModal extends FuzzySuggestModal<TFile> {
    private onChoose: (file: TFile) => void;

    constructor(app: App, onChoose: (file: TFile) => void) {
        super(app);
        this.onChoose = onChoose;
        this.setPlaceholder('选择 CSV 文件...');
    }

    getItems(): TFile[] {
        return this.app.vault.getFiles().filter(f => f.extension.toLowerCase() === 'csv');
    }

    getItemText(item: TFile): string {
        return item.path;
    }

    onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent) {
        this.onChoose(item);
    }
}

export class ColumnSelectionModal extends Modal {
    private headers: string[];
    private onSubmit: (indices: number[]) => void;
    private selectedIndices: Set<number>;

    constructor(app: App, headers: string[], onSubmit: (indices: number[]) => void) {
        super(app);
        this.headers = headers;
        this.onSubmit = onSubmit;
        this.selectedIndices = new Set(headers.map((_, i) => i)); // 默认全选
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: '选择要导入的列' });

        const listContainer = contentEl.createDiv({ cls: 'dl-csv-column-list' });
        listContainer.style.maxHeight = '300px';
        listContainer.style.overflowY = 'auto';
        listContainer.style.marginBottom = '20px';
        listContainer.style.border = '1px solid var(--background-modifier-border)';
        listContainer.style.padding = '10px';

        this.headers.forEach((header, index) => {
            new Setting(listContainer)
                .setName(header || `Column ${index + 1}`)
                .addToggle(toggle => toggle
                    .setValue(true)
                    .onChange(value => {
                        if (value) this.selectedIndices.add(index);
                        else this.selectedIndices.delete(index);
                    }));
        });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('插入表格')
                .setCta()
                .onClick(() => {
                    const sortedIndices = Array.from(this.selectedIndices).sort((a, b) => a - b);
                    this.onSubmit(sortedIndices);
                    this.close();
                }));
    }

    onClose() {
        this.contentEl.empty();
    }
}