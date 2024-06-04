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
            if (config.heading === undefined || !config.heading || config.heading<=0) {
                showNotice('Heading level is required for "Section::Subsectioin" parser strategy');
                throw new Error('Heading level is required for SectionSubsectioinParserStrategy');
            }
            this.strategy = new SectionSubSectionParserStrategy(config.heading, config.single, config.html);

        } else if (parserType === 'heading-paragraph') {
            if (config.heading === undefined || !config.heading || config.heading<=0) {
                showNotice('Heading level is required for "Heading::Paragraph" parser strategy');
                throw new Error('Heading level is required for HeadingParagraphParserStrategy');
            }
            this.strategy = new HeadingParagraphParserStrategy(config.heading, config.single, config.html);

        } else if (parserType === 'multi-subsection') {
            if (config.heading === undefined || !config.heading || config.heading<=0) {
                showNotice('Heading level is required for "Multi-Subsection" parser strategy');
                throw new Error('Heading level is required for MultiSubsectionParserStrategy');
            }
            this.strategy = new MultiSubsectionParserStrategy(config.heading, config.single, config.html);

        } else if (parserType === 'multi-subparagraph') {
            if (config.heading === undefined || !config.heading || config.heading<=0) {
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

        const configLines = configMatch[1].split('\n').map(line => line.trim());
        const config: Partial<AnkiConfig> = {};

        for (const line of configLines) {
            const [key, ...valueParts] = line.split(/[:：]/);
            const value = valueParts.join(':').trim();
            if (key && value) {
                const lowerKey = key.toLowerCase();
                if (lowerKey === 'deck') config.deck = value;
                if (lowerKey === 'anki-deck') config.deck = value;
                if (lowerKey === 'model') config.model = value;
                if (lowerKey === 'anki-model') config.model = value;
                if (lowerKey === 'note-type') config.model = value;
                if (lowerKey === 'anki-note-type') config.model = value;
                if (lowerKey === 'tag') config.tag = value;
                if (lowerKey === 'anki-tag') config.tag = value;
                if (lowerKey === 'card-tag') config.tag = value;
                if (lowerKey === 'anki-card-tag') config.tag = value;
                if (lowerKey === 'parser') config.parser = value;
                if (lowerKey === 'parser-mode') config.parser = value;
                if (lowerKey === 'match') config.parser = value;
                if (lowerKey === 'match-mode') config.parser = value;
                if (lowerKey === 'regex') config.regex = value;
                if (lowerKey === 'flags') config.flags = value;
                if (lowerKey === 'regex-flags') config.flags = value;
                if (lowerKey === 'flag') config.flags = value;
                if (lowerKey === 'regex-flag') config.flags = value;
                if (lowerKey === 'heading') config.heading = parseInt(value, 10);
                if (lowerKey === 'heading-level') config.heading = parseInt(value, 10);
                if (lowerKey === 'update') config.update = this.parseBoolean(value);
                if (lowerKey === 'upsert') config.update = this.parseBoolean(value);
                if (lowerKey === 'single') config.single = this.parseBoolean(value);
                if (lowerKey === 'single-field') config.single = this.parseBoolean(value);
                if (lowerKey === 'html') config.html = this.parseBoolean(value);
                if (lowerKey === 'html-break') config.html = this.parseBoolean(value);
                if (lowerKey === 'html-line-break') config.html = this.parseBoolean(value);
                if (lowerKey === 'card-start') config.start = value;
                if (lowerKey === 'field') config.separator = value;
                if (lowerKey === 'field-split') config.separator = value;
                if (lowerKey === 'field-separator') config.separator = value;
                if (lowerKey === 'card-end') config.end = value;
                if (lowerKey === 'ignore') config.ignore = this.parseBoolean(value);
            }
        }

        return config;
    }

    private static parseBoolean(value: string): boolean {
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
