// === FILE: ui/widgets/WidgetFactory.ts ===
import { App, Component } from 'obsidian';
import { Widget } from '../../core/types';
import { DataEngine } from '../../core/DataEngine';
import { SettingsManager } from '../../core/SettingsManager'; // [新增]
import { ChartWidget } from './ChartWidget';
import { ListWidget } from './ListWidget'; 
import { TodoWidget } from './TodoWidget';
import { MarkdownWidget } from './MarkdownWidget';

export class WidgetFactory {
    private app: App;
    private component: Component; 
    private dataEngine: DataEngine;
    private settingsManager: SettingsManager; // [新增]
    private onDelete: (id: string) => void;
    private onEdit: (id: string) => void;
    private onMove: (id: string) => void;

    constructor(
        app: App,
        component: Component,
        dataEngine: DataEngine, 
        settingsManager: SettingsManager, // [新增]
        onDelete: (id: string) => void,
        onEdit: (id: string) => void,
        onMove: (id: string) => void
    ) {
        this.app = app;
        this.component = component;
        this.dataEngine = dataEngine;
        this.settingsManager = settingsManager; // [新增]
        this.onDelete = onDelete;
        this.onEdit = onEdit;
        this.onMove = onMove;
    }

    create(widget: Widget): any {
        const deleteHandler = () => this.onDelete(widget.id);
        const editHandler = () => this.onEdit(widget.id);
        const moveHandler = () => this.onMove(widget.id);

        switch (widget.type) {
            case 'chart':
                return new ChartWidget(widget as any, this.app, this.dataEngine, deleteHandler, editHandler, moveHandler);
            
            case 'list':
                return new ListWidget(widget as any, this.app, deleteHandler, editHandler, moveHandler);
            
            case 'todo':
                // [修复] 传递 settingsManager
                return new TodoWidget(widget as any, this.app, this.settingsManager, deleteHandler, editHandler, moveHandler);
            
            case 'markdown':
                return new MarkdownWidget(widget as any, this.app, this.component, deleteHandler, editHandler, moveHandler);
            
            default:
                return {
                    render: (parent: HTMLElement) => {
                        const div = parent.createDiv('dl-widget-card');
                        div.createDiv('dl-widget-header').setText(widget.title);
                        div.createDiv('dl-widget-content').setText(`Unknown widget type: ${widget.type}`);
                    }
                };
        }
    }
}