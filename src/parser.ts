import { BlueStarSettings } from './config';
import { CustomDelimitersParserStrategy } from './customDelimitersParserStrategy';
import { HeadingParagraphParserStrategy } from './headingParagraphParserStrategy';
import { MultiSubparagraphParserStrategy } from './multiSubparagraphParserStrategy';
import { MultiSubsectionParserStrategy } from './multiSubsectionParserStrategy';
import { RegexParserStrategy } from './regexParserStrategy';
import { SectionSubSectionParserStrategy } from './sectionSubsectionParserStrategy';

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
    start: string;
    separator: string;
    end: string;
}

export class Parser {
    private strategy: ParserStrategy;

    constructor(parserType: string, config: AnkiConfig) {

        if (parserType === 'regex') {
            if (!config.regex) {
                throw new Error('Regex pattern is required for RegexParserStrategy');
            }
            this.strategy = new RegexParserStrategy(config.regex, config.flags || 'g', config.single);

        } else if (parserType === 'section-subsection') {
            if (config.heading === undefined) {
                throw new Error('Heading level is required for SectionSubsectioinParserStrategy');
            }
            this.strategy = new SectionSubSectionParserStrategy(config.heading, config.single);

        } else if (parserType === 'heading-paragraph') {
            if (config.heading === undefined) {
                throw new Error('Heading level is required for HeadingParagraphParserStrategy');
            }
            this.strategy = new HeadingParagraphParserStrategy(config.heading, config.single);

        } else if (parserType === 'multi-subsection') {
            if (config.heading === undefined) {
                throw new Error('Heading level is required for MultiSubsectionParserStrategy');
            }
            this.strategy = new MultiSubsectionParserStrategy(config.heading, config.single);

        } else if (parserType === 'multi-subparagraph') {
            if (config.heading === undefined) {
                throw new Error('Heading level is required for MultiSubparagraphParserStrategy');
            }
            this.strategy = new MultiSubparagraphParserStrategy(config.heading, config.single);

        } else if (parserType === 'custom-delimiter') {
            if (config.start === undefined || config.separator === undefined || config.end === undefined) {
                throw new Error('Custom delimiter is required for HeadingParserStrategy');
            }
            this.strategy = new CustomDelimitersParserStrategy(config.start, config.separator, config.end, config.single);

        } else {
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
                if (lowerKey === 'tag') config.tag = value;
                if (lowerKey === 'anki-tag') config.tag = value;
                if (lowerKey === 'parser') config.parser = value;
                if (lowerKey === 'match') config.parser = value;
                if (lowerKey === 'match-model') config.parser = value;
                if (lowerKey === 'regex') config.regex = value;
                if (lowerKey === 'flags') config.flags = value;
                if (lowerKey === 'regex-flags') config.flags = value;
                if (lowerKey === 'flag') config.flags = value;
                if (lowerKey === 'regex-flag') config.flags = value;
                if (lowerKey === 'heading') config.heading = parseInt(value, 10);
                if (lowerKey === 'heading-level') config.heading = parseInt(value, 10);
                if (lowerKey === 'update') config.update = this.parseBoolean(value);
                if (lowerKey === 'upsert') config.update = this.parseBoolean(value);
                if (lowerKey === 'single') config.update = this.parseBoolean(value);
                if (lowerKey === 'single-line') config.update = this.parseBoolean(value);
                if (lowerKey === 'card-start') config.start = value;
                if (lowerKey === 'field-separator') config.separator = value;
                if (lowerKey === 'card-end') config.end = value;
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
