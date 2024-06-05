import { ParserStrategy, lineTypeChecker } from './parser';
import { showNotice } from './ui';

export class RegexParserStrategy implements ParserStrategy {
    private regex: RegExp;
    private allowSingleField: boolean;
    private htmlBreak: string;

    constructor(pattern: string, flags: string, allowSingleField: boolean, html: boolean) {
        try {
            this.regex = new RegExp(pattern, flags || 'g');
        } catch (error) {
            showNotice(error);
            throw new Error(error);
        }
        this.allowSingleField = allowSingleField;
        if (html)
            this.htmlBreak = '<br>';
        else
            this.htmlBreak = '';
    }

    parse(content: string, config: any): any[] {
        const minFieldsCount = this.allowSingleField ? 1 : 2;

        const matches = [...content.matchAll(this.regex)];

        const cards = matches.map((match, index) => {
            const card = [];
            for (let i = 1; i < match.length; i++)
                if (this.htmlBreak) {
                    const lines = match[i].split('\n');
                    let inCodeBlock = 0;
                    let currentFied = '';

                    for (const line of lines) {
                        const trimedLine = line.trim();
                        const lineType = lineTypeChecker(trimedLine);

                        if (lineType.type=='code-symbol' && !inCodeBlock) {
                            inCodeBlock = lineType.codeSymbolNumber ? lineType.codeSymbolNumber : 0;
                            if(currentFied)
                                currentFied += '\n' + this.htmlBreak + line;
                            else
                                currentFied = line;
                            continue;
                        }
            
                        if (inCodeBlock) {
                            if (lineType.type=='code-symbol' && lineType.codeSymbolType=='can-be-end' && inCodeBlock<=lineType.codeSymbolNumber)
                                inCodeBlock = 0;
                            currentFied += '\n' + line;
                            continue;
                        }

                        if(currentFied)
                            currentFied += '\n' + this.htmlBreak + line;
                        else
                            currentFied = line;
                    }

                    card.push(currentFied);
                }
                else
                    card.push(match[i]);
            if (card.length>=minFieldsCount)
                return card;
            else
                return [];
        })

        return cards;
    }
}
