import { ParserStrategy, lineTypeChecker } from './parser';
import { showNotice } from './ui';

export class MultiSubparagraphParserStrategy implements ParserStrategy {
    private headingLevel: number;
    private allowSingleField: boolean;

    constructor(headingLevel: number, allowSingleField: boolean) {
        /*
        if (headingLevel < 1 || headingLevel > 5) {
            throw new Error('Heading level must be between 1 and 5');
        }
        */
        this.headingLevel = headingLevel;
        this.allowSingleField = allowSingleField;
    }

    parse(content: string, config: any): any[] {
        const cards = [];
        const lines = content.split('\n');
        let currentCard = [];
        let currentFied = '';
        let inCodeBlock = 0;
        let isInCard = false;
        let isInField = false;
        const minFieldsCount = this.allowSingleField ? 1 : 2;

        for (const line of lines) {
            const trimmedLine = line.trimEnd();
            const lineType = lineTypeChecker(line.trim())

            if (lineType.type=='heading') {
                let headingLevel = lineType.headingLevel ? lineType.headingLevel : 0;

                if(headingLevel<=this.headingLevel) {
                    if (currentFied)
                        currentCard.push(currentFied)
                    if (currentCard.length>=minFieldsCount)
                        cards.push(currentCard);

                    currentCard = [];
                    currentFied = '';
                    isInCard = true;
                    isInField = false;
                    continue;
                }

                if (!isInCard)
                    continue;
                
                if (headingLevel==this.headingLevel+1) {
                    if (isInField)
                        currentCard.push(currentFied);

                    currentFied = ''
                    isInField = true;
                    continue;
                }

                if (!isInField)
                    continue;
                
                if (currentFied)
                    currentFied += '\n' + line;
                else
                    currentFied = line;

                continue;
            }

            if (!isInCard || !isInField)
                continue;
  
            if (lineType.type=='code-symbol' && !inCodeBlock) {
                inCodeBlock = lineType.codeSymbolNumber ? lineType.codeSymbolNumber : 0;
                if (currentFied)
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

            if (currentFied)
                currentFied += '\n' + line;
            else
                currentFied = line;

        }

        if (currentFied.replace(/\n+$/, ""))
            currentCard.push(currentFied)
        if (currentCard.length>=minFieldsCount)
            cards.push(currentCard);

        return cards;
    }
}
