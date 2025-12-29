// === FILE: core/services/Aggregator.ts ===
import { AggregationType } from '../types';

export class Aggregator {
    static aggregate(values: number[], type: AggregationType): number {
        if (values.length === 0) return 0;

        switch (type) {
            case 'sum':
                return values.reduce((a, b) => a + b, 0);
            case 'avg':
                return values.reduce((a, b) => a + b, 0) / values.length;
            case 'max':
                return Math.max(...values);
            case 'min':
                return Math.min(...values);
            case 'count':
                return values.length;
            case 'raw':
                return values.length > 0 ? values[0] : 0;
            default:
                return values.reduce((a, b) => a + b, 0);
        }
    }
}