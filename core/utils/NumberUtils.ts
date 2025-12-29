// === FILE: core/utils/NumberUtils.ts ===
export class NumberUtils {
    static parse(val: any): number | null {
        if (typeof val === 'number') return isNaN(val) ? null : val;
        if (typeof val === 'string') { 
            const parsed = parseFloat(val); 
            return isNaN(parsed) ? null : parsed; 
        }
        return null;
    }
}