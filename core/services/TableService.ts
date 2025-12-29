// === FILE: core/services/TableService.ts ===
import { App, TFile } from 'obsidian';

export class TableService {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    public async getMarkdownTableData(file: TFile): Promise<{ headers: string[], rows: Record<string, string>[] }> {
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        let headerLine: string | null = null;
        let separatorLineIndex = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.endsWith('|')) {
                if (i + 1 < lines.length && lines[i+1].trim().match(/^\|(\s*:?-+:?\s*\|)+$/)) {
                    headerLine = line; separatorLineIndex = i + 1; break;
                }
            }
        }
        if (!headerLine || separatorLineIndex === -1) return { headers: [], rows: [] };

        const parseRow = (line: string) => line.split('|').slice(1, -1).map(c => c.trim());
        const headers = parseRow(headerLine);
        const rows: Record<string, string>[] = [];

        for (let i = separatorLineIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.startsWith('|')) break; 
            const cells = parseRow(line);
            if (cells.length !== headers.length) continue;
            const rowData: Record<string, string> = {};
            headers.forEach((h, idx) => { rowData[h] = cells[idx]; });
            rows.push(rowData);
        }
        return { headers, rows };
    }

    public async getColumnValues(file: TFile, columnName: string): Promise<string[]> {
        const { rows } = await this.getMarkdownTableData(file);
        const values = new Set<string>();
        rows.forEach(r => { if (r[columnName]) values.add(r[columnName]); });
        return Array.from(values).sort();
    }
}