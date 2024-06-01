import { ParserStrategy } from './parser';
import { showNotice } from './ui';

export class RegexParserStrategy implements ParserStrategy {
    private regex: RegExp;
    private allowSingleField: boolean;

    constructor(pattern: string, flags: string, allowSingleField: boolean) {
        try {
            this.regex = new RegExp(pattern, flags || 'g');
        } catch (error) {
            showNotice(error);
            throw new Error(error);
        }
        this.allowSingleField = allowSingleField;
    }

    parse(content: string, config: any): any[] {
        const minFieldsCount = this.allowSingleField ? 1 : 2;

        const matches = [...content.matchAll(this.regex)];

        const cards = matches.map((match, index) => {
            const card = [];
            for (let i = 1; i < match.length; i++)
                card.push(match[i]);
            if (card.length>=minFieldsCount)
                return card;
            else
                return [];
        })

        return cards;
    }
}
