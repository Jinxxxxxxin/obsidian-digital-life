import { App, setIcon, TFile } from 'obsidian';
import { NoteCreatorModal } from '../modals/NoteCreatorModal';
import { SettingsManager } from '../../core/cr_man_set_store';

export class Header {
    private container: HTMLElement;
    private app: App;
    private settingsManager: SettingsManager;
    private onToggleSidebar: () => void;
    private onEditLayout: () => void;
    private onAddWidget: () => void;
    
    // Internal State
    private isEditing = false;
    private isSidebarVisible = true;
    private editBtnText: HTMLElement | null = null;
    private sidebarBtnText: HTMLElement | null = null;

    private searchInput: HTMLInputElement;
    private searchResultsContainer: HTMLElement;
    private selectedIndex = -1;
    private matchedFiles: TFile[] = [];

    constructor(
        container: HTMLElement,
        app: App,
        settingsManager: SettingsManager,
        onToggleSidebar: () => void,
        onEditLayout: () => void,
        onAddWidget: () => void
    ) {
        this.container = container;
        this.app = app;
        this.settingsManager = settingsManager;
        this.onToggleSidebar = onToggleSidebar;
        this.onEditLayout = onEditLayout;
        this.onAddWidget = onAddWidget;
    }

    render() {
        this.container.empty();
        this.container.addClass('dl-header');

        // Left
        const left = this.container.createDiv('dl-header-left');
        const sidebarBtn = left.createSpan('dl-header-btn');
        setIcon(sidebarBtn.createSpan('dl-icon'), 'panel-left');
        this.sidebarBtnText = sidebarBtn.createSpan({ text: '收起侧边栏' });
        
        sidebarBtn.onclick = () => {
            this.isSidebarVisible = !this.isSidebarVisible;
            this.sidebarBtnText?.setText(this.isSidebarVisible ? '收起侧边栏' : '展开侧边栏');
            this.onToggleSidebar();
        };

        // Right
        const right = this.container.createDiv('dl-header-right');
        const btnGroup = right.createDiv('dl-btn-group');

        const createNoteBtn = btnGroup.createDiv('dl-header-btn');
        setIcon(createNoteBtn.createSpan('dl-icon'), 'file-plus');
        createNoteBtn.createSpan({ text: '新建笔记' });
        createNoteBtn.onclick = () => new NoteCreatorModal(this.app, this.settingsManager).open();

        const addWidgetBtn = btnGroup.createDiv({ cls: 'dl-header-btn', attr: { title: '添加组件' } });
        setIcon(addWidgetBtn.createSpan('dl-icon'), 'plus-square');
        addWidgetBtn.createSpan({ text: '添加组件' });
        addWidgetBtn.onclick = () => this.onAddWidget();

        const editBtn = btnGroup.createDiv('dl-header-btn');
        setIcon(editBtn.createSpan('dl-icon'), 'edit');
        this.editBtnText = editBtn.createSpan({ text: '编辑布局' });
        
        editBtn.onclick = () => {
            this.isEditing = !this.isEditing;
            this.container.toggleClass('is-editing', this.isEditing);
            this.editBtnText!.setText(this.isEditing ? '保存布局' : '编辑布局');
            if (this.isEditing) editBtn.addClass('is-active');
            else editBtn.removeClass('is-active');
            this.onEditLayout();
        };

        // Search
        const searchWrapper = right.createDiv('dl-search-wrapper');
        searchWrapper.style.position = 'relative';
        this.searchInput = searchWrapper.createEl('input', { type: 'text', cls: 'dl-search-box', placeholder: '搜索文件...' });
        this.searchResultsContainer = searchWrapper.createDiv('dl-search-results');
        this.searchResultsContainer.style.display = 'none';
        this.searchResultsContainer.style.position = 'absolute';
        this.searchResultsContainer.style.top = '100%';
        this.searchResultsContainer.style.left = '0';
        this.searchResultsContainer.style.width = '100%';
        this.searchResultsContainer.style.background = 'var(--background-primary)';
        this.searchResultsContainer.style.zIndex = '1000';
        this.searchResultsContainer.style.maxHeight = '300px';
        this.searchResultsContainer.style.overflowY = 'auto';

        this.attachSearchListeners();
    }

    private attachSearchListeners() {
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.matchedFiles.length - 1);
                this.updateSelection();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.updateSelection();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.openSelectedFile();
            } else if (e.key === 'Escape') {
                this.clearSearch();
            }
        });
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target as Node) && !this.searchResultsContainer.contains(e.target as Node)) {
                this.clearSearch();
            }
        });
    }

    private handleSearch() {
        const query = this.searchInput.value.toLowerCase();
        if (query.length < 2) {
            this.clearSearch();
            return;
        }
        const allFiles = this.app.vault.getMarkdownFiles();
        this.matchedFiles = allFiles
            .filter(f => f.basename.toLowerCase().includes(query) || f.path.toLowerCase().includes(query))
            .slice(0, 10);
        this.selectedIndex = 0;
        this.renderSearchResults();
    }

    private renderSearchResults() {
        this.searchResultsContainer.empty();
        if (this.matchedFiles.length > 0) {
            this.searchResultsContainer.style.display = 'block';
            this.matchedFiles.forEach((file, index) => {
                const item = this.searchResultsContainer.createDiv('dl-search-item');
                if (index === this.selectedIndex) item.style.backgroundColor = 'var(--background-modifier-hover)';
                item.createDiv({ text: file.basename, style: 'font-weight: bold' });
                item.createDiv({ text: file.path, style: 'font-size: 0.8em; color: var(--text-muted)' });
                item.addEventListener('mouseenter', () => {
                    this.selectedIndex = index;
                    this.updateSelection();
                });
                item.addEventListener('click', () => {
                    this.openSelectedFile();
                });
            });
        } else {
            this.searchResultsContainer.style.display = 'none';
        }
    }

    private updateSelection() {
        const items = this.searchResultsContainer.children;
        for (let i = 0; i < items.length; i++) {
            (items[i] as HTMLElement).style.backgroundColor = 
                i === this.selectedIndex ? 'var(--background-modifier-hover)' : 'transparent';
        }
    }

    private openSelectedFile() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.matchedFiles.length) {
            const file = this.matchedFiles[this.selectedIndex];
            this.app.workspace.getLeaf(false).openFile(file);
            this.clearSearch();
        }
    }

    private clearSearch() {
        this.matchedFiles = [];
        this.searchResultsContainer.empty();
        this.searchResultsContainer.style.display = 'none';
        this.selectedIndex = -1;
    }
}