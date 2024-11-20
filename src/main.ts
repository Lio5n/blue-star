import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, setIcon } from 'obsidian';
import { BlueStarSettings, DEFAULT_SETTINGS } from './config';
import { BlueStarSettingTab } from './settingsTab';
import { readCurrentFileContent } from './fileReader';
import { Parser } from './parser';
import { createAnkiCards, checkAnkiModelExists } from './ankiConnector';
import { InputPromptModal, showNotice } from './ui';

export default class BlueStar extends Plugin {
    settings: BlueStarSettings;
    currentFileIconEl: HTMLElement;
    directoryIconEl: HTMLElement;
    isProcessingCurrentFile: boolean = false;
    isProcessingDirectory: boolean = false;

    async onload() {
        console.log('Loading Blue Star plugin');
        
        await this.loadSettings();

        // Add ribbon icon for current file
        this.currentFileIconEl = this.addRibbonIcon('star', 'Create Anki cards from current file', async () => {
            if (!this.isProcessingCurrentFile && !this.isProcessingDirectory) {
                await this.createAnkiCardsFromCurrentFile();
            } else {
                showNotice('Generating Anki flashcards...');
            }
        });

        // Add ribbon icon for directory
        this.directoryIconEl = this.addRibbonIcon('moon-star', 'Create Anki cards from directory', async () => {
            if (!this.isProcessingCurrentFile && !this.isProcessingDirectory) {
                await this.createAnkiCardsFromDirectory();
            } else {
                showNotice('Generating Anki flashcards...');
            }
        });

        // Update command to only handle current file
        this.addCommand({
            id: 'create-anki-cards-from-current-file',
            name: 'Create Anki cards from current file',
            callback: async () => {
                if (!this.isProcessingCurrentFile && !this.isProcessingDirectory) {
                    await this.createAnkiCardsFromCurrentFile();
                } else {
                    showNotice('Generating Anki flashcards...');
                }
            }
        });

        // Add new command for directory
        this.addCommand({
            id: 'create-anki-cards-from-directory',
            name: 'Create Anki cards from directory',
            callback: async () => {
                if (!this.isProcessingCurrentFile && !this.isProcessingDirectory) {
                    await this.createAnkiCardsFromDirectory();
                } else {
                    showNotice('Generating Anki flashcards...');
                }
            }
        });

        this.addSettingTab(new BlueStarSettingTab(this.app, this));
    }

    onunload() {
        console.log('Unloading Blue Star plugin');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        const defaultPatterns = DEFAULT_SETTINGS.regexPatterns;
        defaultPatterns.forEach(defaultPattern => {
            if (!this.settings.regexPatterns.some(p => p.alias === defaultPattern.alias)) {
                this.settings.regexPatterns.push(defaultPattern);
            }
        });

        await this.saveSettings();
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async createAnkiCardsFromCurrentFile() {
        this.isProcessingCurrentFile = true;
        this.toggleRibbonIcon('current-file', 'loading');

        try {
            showNotice('Generating flashcards...\n\nPlease do not click repeatedly or execute the command multiple times.');
            const fileContent = await readCurrentFileContent(this.app);
            const activeFile = this.app.workspace.getActiveFile();
            if (!fileContent || !activeFile) return;

            const fileConfig = Parser.extractConfig(fileContent) || {};
            const config = { ...this.getDefaultConfig(), ...fileConfig };

            let parser = new Parser(config.parser.toLowerCase(), config);
            const parsedContent = parser.parse(fileContent, config);

            if (parsedContent.length === 0) {
                showNotice(`No content matched the pattern in file "${activeFile.name}".`);
                return;
            }

            try {
                await createAnkiCards(
                    parsedContent, 
                    { ...config, updateExisting: config.update }, 
                    activeFile.path,
                    this.app
                );
            } catch (error) {
                showNotice(`Error: ${error.message}\n\nWhen creating Anki cards from file "${activeFile.name}".`);
            }
        } finally {
            this.toggleRibbonIcon('current-file', 'done');
            this.isProcessingCurrentFile = false;
        }
    }

    async createAnkiCardsFromDirectory() {
        this.isProcessingDirectory = true;
        this.toggleRibbonIcon('directory', 'loading');

        try {
            showNotice('Generating flashcards...\n\nPlease do not click repeatedly or execute the command multiple times.');
            
            const folderPath = this.settings.directoryPath;
            if (!folderPath || !folderPath.trim()) {
                showNotice('Directory path must be specified.');
                new InputPromptModal(this.app, 'Directory path must be specified.', () => {}).open();
                return;
            }

            const folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!(folder instanceof TFolder)) {
                showNotice('Invalid directory path.');
                new InputPromptModal(this.app, 'Invalid directory path.', () => {}).open();
                return;
            }

            const files = this.getFilesFromFolder(folder);
            const totalFiles = files.length;
            let processedFiles = 0;
            let skippedFiles = 0;

            let includeTag = this.settings.includeFileTag.trim();
            if (includeTag.startsWith('#')) {
                includeTag = includeTag.slice(1);
            }

            let excludedTag = this.settings.excludeFileTag.trim();
            if (excludedTag.startsWith('#')) {
                excludedTag = excludedTag.slice(1);
            }

            for (const file of files) {
                const fileContent = await this.app.vault.read(file);

                const frontMatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                const tags = frontMatter?.tags || [];

                if (includeTag && !tags.includes(includeTag)) {
                    continue;
                }

                if (excludedTag && tags.includes(excludedTag)) {
                    continue;
                }

                const fileConfig = Parser.extractConfig(fileContent) || {};
                const config = { ...this.getDefaultConfig(), ...fileConfig };

                if (config.ignore) {
                    continue;
                }

                let parser = new Parser(config.parser.toLowerCase(), config);
                const parsedContent = parser.parse(fileContent, config);

                if (parsedContent.length > 0) {
                    try {
                        await createAnkiCards(
                            parsedContent, 
                            { ...config, updateExisting: config.update }, 
                            file.path,
                            this.app
                        );
                        processedFiles++;
                    } catch (error) {
                        showNotice(`Error creating Anki cards from file "${file.name}": ${error.message}`);
                    }
                } else {
                    skippedFiles++;
                }
            }

            showNotice(`Processing completed. Total files: ${totalFiles}, Processed files: ${processedFiles}, Skipped files: ${skippedFiles}.`);
        } finally {
            this.toggleRibbonIcon('directory', 'done');
            this.isProcessingDirectory = false;
        }
    }

    getFilesFromFolder(folder: TFolder): TFile[] {
        const files: TFile[] = [];
        for (const child of folder.children) {
            if (child instanceof TFile) {
                files.push(child);
            } else if (child instanceof TFolder) {
                files.push(...this.getFilesFromFolder(child));
            }
        }
        return files;
    }

    getDefaultConfig(): any {
        return {
            deck: this.settings.ankiDeck,
            model: this.settings.ankiModel,
            tag: this.settings.ankiTag,
            parser: this.settings.matchMode,
            regex: this.settings.regexPatterns.find(pattern => pattern.enabled)?.pattern || '',
            flags: this.settings.regexPatterns.find(pattern => pattern.enabled)?.flags || 'g',
            heading: this.settings.currentHeadingLevel || 2,
            update: this.settings.updateExisting,
            single: this.settings.allowSingleField,
            html: this.settings.htmlLineBreak,
            start: this.settings.customDelimiters.cardStart,
            separator: this.settings.fieldSeparator,
            end: this.settings.customDelimiters.cardEnd,
            ignore: false,
        }
    }

    private toggleRibbonIcon(type: 'current-file' | 'directory', state: 'loading' | 'done') {
        if (type === 'current-file') {
            setIcon(this.currentFileIconEl, state === 'loading' ? 'star-half' : 'star');
        } else {
            setIcon(this.directoryIconEl, state === 'loading' ? 'moon' : 'moon-star');
        }
    }
}
