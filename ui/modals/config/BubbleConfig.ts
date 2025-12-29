import { App } from 'obsidian';
import { ChartWidget } from '../../../core/cr_def_type_main';
import { BubbleSettings } from './components/BubbleSettings';

export class BubbleConfig {
    private app: App;
    private onUpdate: () => void;
    private settings: BubbleSettings;

    constructor(app: App, onUpdate: () => void) {
        this.app = app;
        this.onUpdate = onUpdate;
        this.settings = new BubbleSettings(app, onUpdate);
    }

    public updateSuggesters(props: string[]) {
        this.settings.updateSuggesters(props);
    }

    public render(el: HTMLElement, w: ChartWidget) {
        this.settings.render(el, w);
    }
}