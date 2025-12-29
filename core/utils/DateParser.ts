// === FILE: core/utils/DateParser.ts ===
import { moment } from 'obsidian';

export class DateParser {
    static parse(input: string): string | null {
        const today = moment();
        const text = input.trim().toLowerCase();

        if (text === '今天' || text === 'today' || text === 'td') {
            return today.format('YYYY-MM-DD');
        }
        
        if (text === '明天' || text === 'tomorrow' || text === 'tm') {
            return today.add(1, 'd').format('YYYY-MM-DD');
        }
        
        if (text === '后天') {
            return today.add(2, 'd').format('YYYY-MM-DD');
        }

        const weekMap: Record<string, number> = {
            '周一': 1, '星期一': 1, 'mon': 1,
            '周二': 2, '星期二': 2, 'tue': 2,
            '周三': 3, '星期三': 3, 'wed': 3,
            '周四': 4, '星期四': 4, 'thu': 4,
            '周五': 5, '星期五': 5, 'fri': 5,
            '周六': 6, '星期六': 6, 'sat': 6,
            '周日': 0, '星期日': 0, 'sun': 0, '天': 0
        };

        // 处理 "周X" / "下周X"
        for (const key in weekMap) {
            if (text.endsWith(key)) {
                let targetDay = weekMap[key];
                let currentDay = today.day();
                
                let diff = targetDay - currentDay;
                if (diff <= 0) diff += 7; // 默认是"下一个"周X

                if (text.startsWith('下周') || text.startsWith('next')) {
                    diff += 7;
                }
                
                return today.add(diff, 'd').format('YYYY-MM-DD');
            }
        }

        return null;
    }
}