import { ParserStrategy, lineTypeChecker } from './parser';
import { showNotice } from './ui';

export class CustomSingleDelimiterParserStrategy implements ParserStrategy {
    private fieldSeparator: string;
    private allowSingleField: boolean;
    private htmlBreak: string;

    constructor(fieldSeparator: string, allowSingleField: boolean, html: boolean) {
        this.allowSingleField = allowSingleField;
        this.fieldSeparator = fieldSeparator.trim();
        if (html)
            this.htmlBreak = '<br>';
        else
            this.htmlBreak = '';
    }

    parse(content: string, config: any): any[] {
        const cards = [];
        const lines = content.split('\n');
        let currentCard = [];
        let currentFied = '';
        let inCodeBlock = 0;
        let isInCard = false;
        const minFieldsCount = this.allowSingleField ? 1 : 2;

        for (const line of lines) {
            const trimmedLine = line.trim();
            const lineType = lineTypeChecker(trimmedLine)

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

            if (!trimmedLine) {
                if(currentFied)
                    currentCard.push(currentFied);
                if (currentCard.length>=minFieldsCount && isInCard)
                    cards.push(currentCard);

                currentCard = [];
                currentFied = '';
                isInCard = false;
                continue;
            }

            if (trimmedLine.startsWith(this.fieldSeparator)) {
                if (currentCard.length==0 && currentFied)
                    currentCard.push(currentFied);
                else
                    currentCard.push(currentFied);

                currentFied = '';
                isInCard = true;
                continue;
            }

            if(currentFied)
                currentFied += '\n' + this.htmlBreak + line;
            else
                currentFied = line;
        }

        if (currentFied)
            currentCard.push(currentFied);
        if (currentCard.length>=minFieldsCount && isInCard)
            cards.push(currentCard);

        return cards;
    }
}
