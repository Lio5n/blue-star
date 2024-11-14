import { App, PluginSettingTab, Setting } from 'obsidian';
import BlueStar from './main';
import { BlueStarSettings } from './config';

export class BlueStarSettingTab extends PluginSettingTab {
    plugin: BlueStar;

    constructor(app: App, plugin: BlueStar) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('File scope')
            .setDesc('Select the scope for generating Anki cards.')
            .addDropdown(dropdown => dropdown
                .addOption('currentFile', 'Current file')
                .addOption('directory', 'Directory')
                .setValue(this.plugin.settings.fileScope)
                .onChange(async (value) => {
                    this.plugin.settings.fileScope = value as 'currentFile' | 'directory';
                    await this.plugin.saveSettings();
                    this.display();
                }));

        if (this.plugin.settings.fileScope === 'directory') {
            new Setting(containerEl)
                .setName('Directory path')
                .setDesc('Specify the directory path to scan for files.')
                .addText(text => text
                    .setPlaceholder('Anki')
                    .setValue(this.plugin.settings.directoryPath)
                    .onChange(async (value) => {
                        this.plugin.settings.directoryPath = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Include file tag')
                .setDesc('Specify the tag for files that need to be included in the specified directory.')
                .addText(text => text
                    .setPlaceholder('anki')
                    .setValue(this.plugin.settings.includeFileTag)
                    .onChange(async (value) => {
                        this.plugin.settings.includeFileTag = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Exclude file tag')
                .setDesc('Specify the tag for files that need to be excluded in the specified directory.')
                .addText(text => text
                    .setPlaceholder('anki-ignore')
                    .setValue(this.plugin.settings.excludeFileTag)
                    .onChange(async (value) => {
                        this.plugin.settings.excludeFileTag = value;
                        await this.plugin.saveSettings();
                    }));
        }

        new Setting(containerEl)
            .setName('Update existing cards')
            .setDesc('If enabled, existing cards in Anki will be updated. Otherwise, only new cards will be added.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.updateExisting)
                .onChange(async (value) => {
                    this.plugin.settings.updateExisting = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Allow single field cards')
            .setDesc('If enabled, allows generating Anki cards with a single field.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.allowSingleField)
                .onChange(async (value) => {
                    this.plugin.settings.allowSingleField = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Add HTML break')
            .setDesc('If enabled, add HTML line break <br>.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.htmlLineBreak)
                .onChange(async (value) => {
                    this.plugin.settings.htmlLineBreak = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Image max width')
            .setDesc('Maximum width of images in Anki cards, expressed as a percentage without using the % symbol.')
            .addText(text => text
                .setPlaceholder('100')
                .setValue(this.plugin.settings.imageMaxWidth.toString())
                .onChange(async (value) => {
                    this.plugin.settings.imageMaxWidth = parseInt(value);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Anki deck')
            .setDesc('The default deck to add cards to.')
            .addText(text => text
                .setPlaceholder('Default')
                .setValue(this.plugin.settings.ankiDeck)
                .onChange(async (value) => {
                    this.plugin.settings.ankiDeck = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Anki model (note type)')
            .setDesc('The default model (note type) to use for cards.')
            .addText(text => text
                .setPlaceholder('Basic')
                .setValue(this.plugin.settings.ankiModel)
                .onChange(async (value) => {
                    this.plugin.settings.ankiModel = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Anki tag')
            .setDesc('The default tag to add to cards.')
            .addText(text => text
                .setPlaceholder('blue-star')
                .setValue(this.plugin.settings.ankiTag)
                .onChange(async (value) => {
                    this.plugin.settings.ankiTag = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Match mode')
            .setDesc('The mode to use for matching content.')
            .addDropdown(dropdown => dropdown
                .addOption('section-subsection', 'Section :: Subsection')
                .addOption('heading-paragraph', 'Heading :: Paragraph')
                .addOption('multi-subsection', 'Multi-Subsection')
                .addOption('multi-subparagraph', 'Multi-Subparagraph')
                .addOption('regex', 'Regex')
                .addOption('custom-delimiter', 'Custom delimiter')
                .addOption('single-delimiter', 'Single delimiter')
                .setValue(this.plugin.settings.matchMode)
                .onChange(async (value) => {
                    this.plugin.settings.matchMode = value as 'section-subsection' | 'heading-paragraph' | 'multi-subsection' | 'multi-subparagraph' | 'regex' | 'custom-delimiter' | 'single-delimiter';
                    await this.plugin.saveSettings();
                    this.display();
                }));

        if (this.plugin.settings.matchMode === 'section-subsection') {
            new Setting(containerEl)
                .setName('Heading level')
                .setDesc('Select the title level to match for "section-subsection" mode.')
                .addDropdown(dropdown => dropdown
                    .addOption('1', 'Heading 1')
                    .addOption('2', 'Heading 2')
                    .addOption('3', 'Heading 3')
                    .addOption('4', 'Heading 4')
                    .addOption('5', 'Heading 5')
                    // .addOption('6', 'Heading 6')
                    .setValue(this.plugin.settings.headingLevel['section-subsection'].toString())
                    .onChange(async (value) => {
                        this.plugin.settings.headingLevel['section-subsection'] = parseInt(value);
                        this.plugin.settings.currentHeadingLevel = parseInt(value);
                        await this.plugin.saveSettings();
                    }));
            this.plugin.settings.currentHeadingLevel = this.plugin.settings.headingLevel['section-subsection'];
            this.plugin.saveSettings();
        } else if (this.plugin.settings.matchMode === 'heading-paragraph') {
            new Setting(containerEl)
                .setName('Heading level')
                .setDesc('Select the heading level to match for "heading-paragraph" mode.')
                .addDropdown(dropdown => dropdown
                    .addOption('1', 'Heading 1')
                    .addOption('2', 'Heading 2')
                    .addOption('3', 'Heading 3')
                    .addOption('4', 'Heading 4')
                    .addOption('5', 'Heading 5')
                    // .addOption('6', 'Heading 6')
                    .setValue(this.plugin.settings.headingLevel['heading-paragraph'].toString())
                    .onChange(async (value) => {
                        this.plugin.settings.headingLevel['heading-paragraph'] = parseInt(value);
                        this.plugin.settings.currentHeadingLevel = parseInt(value);
                        await this.plugin.saveSettings();
                    }));
            this.plugin.settings.currentHeadingLevel = this.plugin.settings.headingLevel['heading-paragraph'];
            this.plugin.saveSettings();
        } else if (this.plugin.settings.matchMode === 'multi-subsection') {
            new Setting(containerEl)
                .setName('Heading level')
                .setDesc('Select the title heading to match for "multi-section" mode.')
                .addDropdown(dropdown => dropdown
                    .addOption('1', 'Heading 1')
                    .addOption('2', 'Heading 2')
                    .addOption('3', 'Heading 3')
                    .addOption('4', 'Heading 4')
                    .addOption('5', 'Heading 5')
                    // .addOption('6', 'Heading 6')
                    .setValue(this.plugin.settings.headingLevel['multi-subsection'].toString())
                    .onChange(async (value) => {
                        this.plugin.settings.headingLevel['multi-subsection'] = parseInt(value);
                        this.plugin.settings.currentHeadingLevel = parseInt(value);
                        await this.plugin.saveSettings();
                    }));
            this.plugin.settings.currentHeadingLevel = this.plugin.settings.headingLevel['multi-subsection'];
            this.plugin.saveSettings();
        } else if (this.plugin.settings.matchMode === 'multi-subparagraph') {
            new Setting(containerEl)
                .setName('Heading level')
                .setDesc('Select the title heading to match for "multi-paragraph" mode.')
                .addDropdown(dropdown => dropdown
                    .addOption('1', 'Heading 1')
                    .addOption('2', 'Heading 2')
                    .addOption('3', 'Heading 3')
                    .addOption('4', 'Heading 4')
                    .addOption('5', 'Heading 5')
                    // .addOption('6', 'Heading 6')
                    .setValue(this.plugin.settings.headingLevel['multi-subparagraph'].toString())
                    .onChange(async (value) => {
                        this.plugin.settings.headingLevel['multi-subparagraph'] = parseInt(value);
                        this.plugin.settings.currentHeadingLevel = parseInt(value);
                        await this.plugin.saveSettings();
                    }));
            this.plugin.settings.currentHeadingLevel = this.plugin.settings.headingLevel['multi-subparagraph'];
            this.plugin.saveSettings();
        } else if (this.plugin.settings.matchMode === 'regex') {
            new Setting(containerEl)
                .setName('Regex patterns')
                .setDesc('Add or edit regex patterns.')
                .addButton(button => {
                    button.setButtonText('+').onClick(() => {
                        this.plugin.settings.regexPatterns.push({ alias: '', pattern: '', flags: '', enabled: false });
                        this.display();
                    });
                });

            this.plugin.settings.regexPatterns.forEach((pattern, index) => {
                const patternSetting = new Setting(containerEl)
                    .addText(text => {
                        text.setPlaceholder('Regex pattern')
                            .setValue(pattern.pattern)
                            .onChange(async (value) => {
                                this.plugin.settings.regexPatterns[index].pattern = value;
                                await this.plugin.saveSettings();
                            });
                    })
                    .addText(text => {
                        text.setPlaceholder('Flags')
                            .setValue(pattern.flags)
                            .onChange(async (value) => {
                                this.plugin.settings.regexPatterns[index].flags = value;
                                await this.plugin.saveSettings();
                            });
                        text.inputEl.addClass('blue-star-regex-input-flags');
                    })
                    .addText(text => {
                        text.setPlaceholder('Desc')
                            .setValue(pattern.alias)
                            .onChange(async (value) => {
                                this.plugin.settings.regexPatterns[index].alias = value;
                                await this.plugin.saveSettings();
                            });
                        text.inputEl.addClass('blue-star-regex-input-alias');
                    })
                    .addToggle(toggle => {
                        toggle.setValue(pattern.enabled)
                            .onChange(async (value) => {
                                if (value) {
                                    this.plugin.settings.regexPatterns.forEach((p, i) => {
                                        this.plugin.settings.regexPatterns[i].enabled = i === index;
                                    });
                                } else {
                                    this.plugin.settings.regexPatterns[index].enabled = false;
                                }
                                await this.plugin.saveSettings();
                                this.display();
                            });
                    })
                    .addButton(button => {
                        button.setButtonText('Remove').onClick(() => {
                            this.plugin.settings.regexPatterns.splice(index, 1);
                            this.display();
                        });
                    });
            });
        } else if (this.plugin.settings.matchMode === 'custom-delimiter') {
            new Setting(containerEl)
                .setName('Card start delimiter')
                .setDesc('Specify the delimiter to mark the start of a card.')
                .addText(text => text
                    .setPlaceholder('card start symbol')
                    .setValue(this.plugin.settings.customDelimiters.cardStart)
                    .onChange(async (value) => {
                        this.plugin.settings.customDelimiters.cardStart = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Field separator')
                .setDesc('Specify the delimiter to separate fields within a card.')
                .addText(text => text
                    .setPlaceholder('field separator')
                    .setValue(this.plugin.settings.customDelimiters.fieldSeparator)
                    .onChange(async (value) => {
                        this.plugin.settings.customDelimiters.fieldSeparator = value;
                        this.plugin.settings.fieldSeparator = value;
                        await this.plugin.saveSettings();
                    }));
            this.plugin.settings.fieldSeparator = this.plugin.settings.customDelimiters.fieldSeparator;
            this.plugin.saveSettings();

            new Setting(containerEl)
                .setName('Card end delimiter')
                .setDesc('Specify the delimiter to mark the end of a card.')
                .addText(text => text
                    .setPlaceholder('card en symbol')
                    .setValue(this.plugin.settings.customDelimiters.cardEnd)
                    .onChange(async (value) => {
                        this.plugin.settings.customDelimiters.cardEnd = value;
                        await this.plugin.saveSettings();
                    }));
        } else if (this.plugin.settings.matchMode === 'single-delimiter') {
            new Setting(containerEl)
                .setName('Field separator')
                .setDesc('Specify the delimiter to separate fields within a card.')
                .addText(text => text
                    .setPlaceholder('field separator')
                    .setValue(this.plugin.settings.signleDelimiter.fieldSeparator)
                    .onChange(async (value) => {
                        this.plugin.settings.signleDelimiter.fieldSeparator = value;
                        this.plugin.settings.fieldSeparator = value;
                        await this.plugin.saveSettings();
                    }));
            this.plugin.settings.fieldSeparator = this.plugin.settings.signleDelimiter.fieldSeparator;
            this.plugin.saveSettings();
        }

        new Setting(containerEl)
            .setName('Usage Instructions')
            .setDesc('1. You can specify Anki\'s multi-level decks using ::, for example: Deck::SubDeck');
        const usageHint = containerEl.createEl('p', { text: '2. For usage instructions, please refer to: ' });
        usageHint.createEl('a', { href: 'https://github.com/Lio5n/blue-star', text: 'https://github.com/Lio5n/blue-star' });
        usageHint.addClass('blue-star-usage-instructions');
        const usageHint2 = containerEl.createEl('p', { text: '3. Obsidian_2_Anki is a powerful Obsidian plugin for generating Anki flashcards. Our Regex come from '});
        usageHint2.createEl('a', { href: 'https://github.com/ObsidianToAnki/Obsidian_to_Anki/wiki/Regex', text: 'Obsidian_2_Anki'});
        usageHint2.addClass('blue-star-usage-instructions');
    }
}
