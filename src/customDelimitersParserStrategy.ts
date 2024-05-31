import { ParserStrategy, lineTypeChecker } from './parser';
import { showNotice } from './ui';

export class CustomDelimitersParserStrategy implements ParserStrategy {
    private cardStart: string;
    private fieldSeparator: string;
    private cardEnd: string;
    private allowSingleField: boolean;

    constructor(cardStart: string, fieldSeparator: string, cardEnd: string, allowSingleField: boolean) {
        this.allowSingleField = allowSingleField;
        this.cardStart = cardStart.trim();
        this.fieldSeparator = fieldSeparator.trim();
        this.cardEnd = cardEnd.trim();
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

            if (trimmedLine.startsWith(this.cardStart)) {
                if(currentFied)
                    currentCard.push(currentFied);
                if (currentCard.length>=minFieldsCount)
                    cards.push(currentCard);

                currentCard = [];
                currentFied = '';
                isInCard = true;
                continue;
            }

            if(!isInCard)
                continue;

            if (trimmedLine.startsWith(this.fieldSeparator)) {
                currentCard.push(currentFied);

                currentFied = '';
                continue;
            }

            if (trimmedLine.startsWith(this.cardEnd)) {
                if (currentFied)
                        currentCard.push(currentFied);
                if (currentCard.length>=minFieldsCount)
                    cards.push(currentCard);

                currentCard = [];
                currentFied = '';
                isInCard = false;
                continue;
            }

            if (lineType.type=='code-symbol' && !inCodeBlock) {
                inCodeBlock = lineType.codeSymbolNumber ? lineType.codeSymbolNumber : 0;
                if(currentFied)
                    currentFied += '\n' + line;
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
                currentFied += '\n' + line;
            else
                currentFied = line;
        }

        if (currentFied.replace(/\n+$/, ""))
            currentCard.push(currentFied);
        if (currentCard.length>=minFieldsCount)
            cards.push(currentCard);

        return cards;
    }
}
