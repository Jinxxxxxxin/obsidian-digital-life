// === FILE: ui/configs/IConfigView.ts ===
import { Widget } from '../../core/types';

export interface IConfigView<T extends Widget> {
    render(container: HTMLElement, widget: T): void;
}