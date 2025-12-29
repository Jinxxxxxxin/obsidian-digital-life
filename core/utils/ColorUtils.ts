// === FILE: core/utils/ColorUtils.ts ===
export class ColorUtils {
    // 默认色板
    private static defaultPalette: string[] = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
        '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
        '#bcbd22', '#17becf'
    ];

    private static customPalette: string[] = [];

    /** 设置自定义色板，覆盖默认 */
    public static setCustomPalette(palette: string[]) {
        this.customPalette = palette.slice(); // 克隆
    }

    /** 获取当前色板（优先自定义色板） */
    public static getPalette(): string[] {
        return this.customPalette.length > 0 ? this.customPalette : this.defaultPalette;
    }

    /** 根据索引获取颜色 */
    public static getColor(index: number): string {
        const palette = this.getPalette();
        return palette[index % palette.length];
    }

    /** 生成对比色（高亮/辅助色） */
    public static getContrastColor(hex: string): string {
        // 转成RGB
        const rgb = this.hexToRgb(hex);
        if (!rgb) return '#000000';
        // 亮度公式: https://www.w3.org/TR/AERT/#color-contrast
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    /** 生成辅助色（浅色或透明高亮） */
    public static getAccentColor(hex: string, opacity: number = 0.2): string {
        return this.hexToRgba(hex, opacity);
    }

    /** HEX 转 RGB */
    public static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const sanitized = hex.replace('#', '');
        const bigint = parseInt(sanitized, 16);
        if (sanitized.length === 6) {
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return { r, g, b };
        } else if (sanitized.length === 3) {
            const r = (bigint >> 8) & 15;
            const g = (bigint >> 4) & 15;
            const b = bigint & 15;
            return { r: r * 17, g: g * 17, b: b * 17 };
        }
        return null;
    }

    /** HEX 转 RGBA */
    public static hexToRgba(hex: string, alpha: number = 1): string {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return `rgba(0,0,0,${alpha})`;
        return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    }
}
