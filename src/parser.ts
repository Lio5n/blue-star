import { parseYaml } from 'obsidian';
import { BlueStarSettings } from './config';
import { CustomDelimiterParserStrategy } from './customDelimiterParserStrategy';
import { CustomSingleDelimiterParserStrategy } from './customSingleDelimiterParserStrategy';
import { HeadingParagraphParserStrategy } from './headingParagraphParserStrategy';
import { MultiSubparagraphParserStrategy } from './multiSubparagraphParserStrategy';
import { MultiSubsectionParserStrategy } from './multiSubsectionParserStrategy';
import { RegexParserStrategy } from './regexParserStrategy';
import { SectionSubSectionParserStrategy } from './sectionSubsectionParserStrategy';
import { showNotice } from './ui';

export interface ParserStrategy {
    parse(content: string, config: any): any[];
}

export interface AnkiConfig {
    deck: string;
    model: string;
    tag: string;
    parser: string;
    regex?: string;
    flags?: string;
    heading?: number;
    update: boolean;
    single: boolean;
    html: boolean;
    start: string;
    separator: string;
    end: string;
    ignore: boolean;
}

export class Parser {
    private strategy: ParserStrategy;

    constructor(parserType: string, config: AnkiConfig) {
        if (parserType === 'regex') {
            if (!config.regex) {
                showNotice('Regex pattern is required for "Regex" parser strategy');
                throw new Error('Regex pattern is required for RegexParserStrategy');
            }
            this.strategy = new RegexParserStrategy(config.regex, config.flags || 'g', config.single, config.html);
        } else if (parserType === 'section-subsection') {
            if (config.heading === undefined || !config.heading || config.heading <= 0) {
                showNotice('Heading level is required for "Section::Subsectioin" parser strategy');
                throw new Error('Heading level is required for SectionSubsectioinParserStrategy');
            }
            this.strategy = new SectionSubSectionParserStrategy(config.heading, config.single, config.html);
        } else if (parserType === 'heading-paragraph') {
            if (config.heading === undefined || !config.heading || config.heading <= 0) {
                showNotice('Heading level is required for "Heading::Paragraph" parser strategy');
                throw new Error('Heading level is required for HeadingParagraphParserStrategy');
            }
            this.strategy = new HeadingParagraphParserStrategy(config.heading, config.single, config.html);
        } else if (parserType === 'multi-subsection') {
            if (config.heading === undefined || !config.heading || config.heading <= 0) {
                showNotice('Heading level is required for "Multi-Subsection" parser strategy');
                throw new Error('Heading level is required for MultiSubsectionParserStrategy');
            }
            this.strategy = new MultiSubsectionParserStrategy(config.heading, config.single, config.html);
        } else if (parserType === 'multi-subparagraph') {
            if (config.heading === undefined || !config.heading || config.heading <= 0) {
                showNotice('Heading level is required for "Multi-Subparagraph" parser strategy');
                throw new Error('Heading level is required for MultiSubparagraphParserStrategy');
            }
            this.strategy = new MultiSubparagraphParserStrategy(config.heading, config.single, config.html);
        } else if (parserType === 'custom-delimiter') {
            if (!config.start.trim() || !config.separator.trim() || !config.end.trim()) {
                showNotice('Custom delimiter is required for "Custom delimiter" parser strategy');
                throw new Error('Custom delimiter is required for CustomDelimiterParserStrategy');
            }
            this.strategy = new CustomDelimiterParserStrategy(config.start, config.separator, config.end, config.single, config.html);
        } else if (parserType === 'single-delimiter') {
            if (!config.separator.trim()) {
                showNotice('Custom delimiter is required for "Single delimiter" parser strategy');
                throw new Error('Custom delimiter is required for CustomSingleDelimiterParserStrategy');
            }
            this.strategy = new CustomSingleDelimiterParserStrategy(config.separator, config.single, config.html);
        } else {
            showNotice(`Unknown parser type: ${parserType}`);
            throw new Error(`Unknown parser type: ${parserType}`);
        }
    }

    parse(content: string, config: AnkiConfig): any[] {
        return this.strategy.parse(content, config);
    }

    static extractConfig(content: string): Partial<AnkiConfig> | null {
        const configMatch = content.match(/```anki\s+([\s\S]*?)\s+```/);
        if (!configMatch) return null;

        try {
            const rawConfig = parseYaml(configMatch[1]) as Record<string, any>;
            const config: Partial<AnkiConfig> = {};

            const keyMap: Record<string, keyof AnkiConfig> = {
                'deck': 'deck',
                'anki-deck': 'deck',
                'model': 'model',
                'anki-model': 'model',
                'note-type': 'model',
                'anki-note-type': 'model',
                'tag': 'tag',
                'anki-tag': 'tag',
                'card-tag': 'tag',
                'anki-card-tag': 'tag',
                'parser': 'parser',
                'parser-mode': 'parser',
                'match': 'parser',
                'match-mode': 'parser',
                'regex': 'regex',
                'flags': 'flags',
                'regex-flags': 'flags',
                'flag': 'flags',
                'regex-flag': 'flags',
                'heading': 'heading',
                'heading-level': 'heading',
                'update': 'update',
                'upsert': 'update',
                'single': 'single',
                'single-field': 'single',
                'html': 'html',
                'html-break': 'html',
                'html-line-break': 'html',
                'card-start': 'start',
                'field': 'separator',
                'field-split': 'separator',
                'field-separator': 'separator',
                'card-end': 'end',
                'ignore': 'ignore'
            };

            for (const [key, value] of Object.entries(rawConfig)) {
                const lowerKey = key.toLowerCase();
                const mappedKey = keyMap[lowerKey];

                if (mappedKey) {
                    if (mappedKey === 'heading') {
                        config[mappedKey] = parseInt(value, 10);
                    } else if (['update', 'single', 'html', 'ignore'].includes(mappedKey)) {
                        if (typeof value === 'string') {
                            config[mappedKey] = this.parseBoolean(value) as any;
                        } else {
                            config[mappedKey] = Boolean(value) as any;
                        }
                    } else {
                        config[mappedKey] = value;
                    }
                }
            }

            return config;
        } catch (error) {
            showNotice('Document-level configuration error.');
            console.error('Failed to parse YAML config:', error);
            throw(error);
        }
    }

    private static parseBoolean(value: string): boolean {
        if (typeof value !== 'string') {
            throw new TypeError('Expected a string for parseBoolean');
        }
        const normalizedValue = value.trim().toLowerCase();
        return ['true', '1', 'yes', 'y'].includes(normalizedValue);
    }
}

export function lineTypeChecker(line: String) {
    if(line.startsWith('```')) {
        let n = 0;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '`') {
                n++;
            }
        }

        if (line.startsWith('    ') || !line.startsWith('`'.repeat(n)))
            return {type: 'content'};
        else if (line != '`'.repeat(line.length)) {
            return {type: 'code-symbol', codeSymbolType: 'only-begin', codeSymbolNumber: n};
        }
        else
            return {type: 'code-symbol', codeSymbolType: 'can-be-end', codeSymbolNumber: n};

    } else if (line.startsWith('#')) {
        const headingSymbol = line.split(' ')[0];

        if (headingSymbol != '#'.repeat(headingSymbol.length))
            return {type: 'content'}
        else
            return {type: 'heading', headingLevel: headingSymbol.length};
    } else
        return {type: 'content'};
}
