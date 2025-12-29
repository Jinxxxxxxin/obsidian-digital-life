// === FILE: core/utils/CsvParser.ts ===
export class CsvParser {
    static convertToMarkdown(csvContent: string, selectedIndices: number[]): string {
        const rows = this.parseCsv(csvContent);
        if (rows.length === 0) return '';
        if (!selectedIndices || selectedIndices.length === 0) return this.generateTable(rows);
        const filteredRows = rows.map(row => row.filter((_, index) => selectedIndices.includes(index)));
        return this.generateTable(filteredRows);
    }

    static getHeaders(csvContent: string): string[] {
        const rows = this.parseCsv(csvContent);
        return rows.length > 0 ? rows[0] : [];
    }

    static parseCsv(text: string): string[][] {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentValue = '';
        let inQuote = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];
            if (char === '"') {
                if (inQuote && nextChar === '"') { currentValue += '"'; i++; } else { inQuote = !inQuote; }
            } else if (char === ',' && !inQuote) {
                currentRow.push(currentValue); currentValue = '';
            } else if ((char === '\r' || char === '\n') && !inQuote) {
                if (char === '\r' && nextChar === '\n') i++;
                currentRow.push(currentValue); rows.push(currentRow); currentRow = []; currentValue = '';
            } else { currentValue += char; }
        }
        if (currentValue || currentRow.length > 0) { currentRow.push(currentValue); rows.push(currentRow); }
        return rows.filter(r => r.length > 0 && (r.length > 1 || r[0] !== ''));
    }

    static generateTable(rows: string[][]): string {
        if (rows.length === 0) return '';
        const header = rows[0];
        const body = rows.slice(1);
        const headerRow = `| ${header.map(cell => this.escapeMarkdown(cell)).join(' | ')} |`;
        const separatorRow = `| ${header.map(() => '---').join(' | ')} |`;
        const bodyRows = body.map(row => `| ${row.map(cell => this.escapeMarkdown(cell)).join(' | ')} |`).join('\n');
        return `${headerRow}\n${separatorRow}\n${bodyRows}`;
    }

    static escapeMarkdown(text: string): string {
        if (!text) return '';
        return text.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
    }
}