import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, setIcon } from 'obsidian';
import { BlueStarSettings, DEFAULT_SETTINGS } from './config';
import { BlueStarSettingTab } from './settingsTab';
import { readCurrentFileContent } from './fileReader';
import { Parser } from './parser';
import { createAnkiCards, checkAnkiModelExists } from './ankiConnector';
import { InputPromptModal, showNotice } from './ui';

export default class BlueStar extends Plugin {
    settings: BlueStarSettings;
    ribbonIconEl: HTMLElement;
    isProcessing: boolean = false;

    async onload() {
        console.log('Loading Blue Star plugin');
        
        await this.loadSettings();

        this.ribbonIconEl = this.addRibbonIcon('star', 'Create Anki cards', async () => {
            if (!this.isProcessing) {
                await this.createAnkiCardsFromFile();
            }
        });

        this.addCommand({
            id: 'create-anki-cards',
            name: 'Create Anki cards',
            callback: async () => {
                if (!this.isProcessing) {
                    await this.createAnkiCardsFromFile();
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

    async createAnkiCardsFromFile() {
        this.isProcessing = true;
        this.toggleRibbonIcon('loading');

        if (this.settings.fileScope === 'currentFile') {
            showNotice('Generating flashcards...\n\nPlease do not click repeatedly or execute the command multiple times.');
            await this.createAnkiCardsFromCurrentFile();
        } else if (this.settings.fileScope === 'directory') {
            showNotice('Generating flashcards...\n\nPlease do not click repeatedly or execute the command multiple times.');
            await this.createAnkiCardsFromDirectory();
        }

        this.toggleRibbonIcon('done');
        this.isProcessing = false;
    }

    async createAnkiCardsFromCurrentFile() {
        const fileContent = await readCurrentFileContent(this.app);
        const activeFile = this.app.workspace.getActiveFile();
        if (!fileContent || !activeFile) return;

        const fileConfig = Parser.extractConfig(fileContent) || {};
        const config = { ...this.getDefaultConfig(), ...fileConfig };

        let parser = new Parser(config.parser.toLowerCase(), config);

        const parsedContent = parser.parse(fileContent, config);

        console.log('Parsed content:', parsedContent);

        if (parsedContent.length === 0) {
            showNotice(`No content matched the pattern in file "${activeFile.name}".`);
            return;
        }

        try {
            await createAnkiCards(parsedContent, { ...config, updateExisting: config.update }, activeFile.name);
        } catch (error) {
            showNotice(`Error: ${error.message}\n\nWhen creating Anki cards from file "${activeFile.name}".`);
        }
    }

    async createAnkiCardsFromDirectory() {
        const folderPath = this.settings.directoryPath;
        if (!folderPath || !folderPath.trim()) {
            showNotice('Directory path must be specified.');
            new InputPromptModal(this.app, 'Directory path must be specified.', () => {}).open();
            return;
        } else if (folderPath.trim() === '/') {
            showNotice('It is not recommended to scan the entire vault, so the directory should not be set to "/".');
            new InputPromptModal(this.app, 'It is not recommended to scan the entire vault, so the directory should not be set to "/".', () => {}).open();
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
                    await createAnkiCards(parsedContent, { ...config, updateExisting: config.update }, file.name);
                    processedFiles++;
                } catch (error) {
                    showNotice(`Error creating Anki cards from file "${file.name}": ${error.message}`);
                }
            } else {
                skippedFiles++;
            }
        }

        showNotice(`Processing completed. Total files: ${totalFiles}, Processed files: ${processedFiles}, Skipped files: ${skippedFiles}.`);
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
            start: this.settings.customDelimiters.cardStart,
            separator: this.settings.customDelimiters.fieldSeparator,
            end: this.settings.customDelimiters.cardEnd,
            ignore: false,
        }
    }

    private toggleRibbonIcon(state: 'loading' | 'done') {
        if (state === 'loading') {
            setIcon(this.ribbonIconEl, 'star-half');
        } else {
            setIcon(this.ribbonIconEl, 'star');
        }
    }
}
