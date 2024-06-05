import { ParserStrategy, lineTypeChecker } from './parser';
import { showNotice } from './ui';

export class SectionSubSectionParserStrategy implements ParserStrategy {
    private headingLevel: number;
    private allowSingleField: boolean;
    private htmlBreak: string;

    constructor(headingLevel: number, allowSingleField: boolean, html: boolean) {
        /*
        if (headingLevel < 1 || headingLevel > 5) {
            throw new Error('Heading level must be between 1 and 5');
        }
        */
        this.headingLevel = headingLevel;
        this.allowSingleField = allowSingleField;
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
        let isFront = false;
        const minFieldsCount = this.allowSingleField ? 1 : 2;

        for (const line of lines) {
            const trimmedLine = line.trimEnd();
            const lineType = lineTypeChecker(line.trim())

            if (lineType.type=='heading') {
                let headingLevel = lineType.headingLevel ? lineType.headingLevel : 0;

                if(headingLevel==this.headingLevel) {
                    if (currentFied)
                        currentCard.push(currentFied)
                    if (currentCard.length>=minFieldsCount)
                        cards.push(currentCard);

                    currentCard = [];
                    currentFied = line;
                    isFront = true;
                    isInCard = true;
                    continue;
                }

                if (!isInCard)
                    continue;
                
                if (headingLevel<this.headingLevel) {
                    if (currentFied)
                        currentCard.push(currentFied)
                    if (currentCard.length>=minFieldsCount)
                        cards.push(currentCard);

                    currentCard = [];
                    currentFied = '';
                    isFront = false;
                    isInCard = false;
                    continue;
                }

                if (isFront) {
                    currentCard.push(currentFied)
                    currentFied = line
                    isFront = false;
                    continue
                }

                currentFied += '\n' + this.htmlBreak + line;

                continue
            }

            if (!isInCard)
                continue;

            if (lineType.type=='code-symbol' && !inCodeBlock) {
                inCodeBlock = lineType.codeSymbolNumber ? lineType.codeSymbolNumber : 0;
                currentFied += '\n' + this.htmlBreak + line;
                continue;
            }

            if (inCodeBlock) {
                if (lineType.type=='code-symbol' && lineType.codeSymbolType=='can-be-end' && inCodeBlock<=lineType.codeSymbolNumber)
                    inCodeBlock = 0;
                    currentFied += '\n' + line;

                continue;
            }

            currentFied += '\n' + this.htmlBreak + line;
        }

        if (currentFied)
            currentCard.push(currentFied)
        if (currentCard.length>=minFieldsCount)
            cards.push(currentCard);

        return cards;
    }
}
