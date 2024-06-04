export interface RegexPattern {
    alias: string;
    pattern: string;
    flags: string;
    enabled: boolean;
}

export interface BlueStarSettings {
    updateExisting: boolean;
    allowSingleField: boolean;
    htmlLineBreak: boolean,
    fileScope: 'currentFile' | 'directory';
    directoryPath: string;
    includeFileTag: string;
    excludeFileTag: string;
    ankiDeck: string;
    ankiModel: string;
    ankiTag: string;
    matchMode: 'section-subsection' | 'heading-paragraph' | 'multi-subsection' | 'multi-subparagraph' | 'regex' | 'custom-delimiter' | 'single-delimiter';
    headingLevel: { [key: string]: number };
    currentHeadingLevel: number;
    regexPatterns: RegexPattern[];
    customDelimiters: {
        cardStart: string;
        fieldSeparator: string;
        cardEnd: string;
    };
    signleDelimiter: {
        fieldSeparator: string;
    }
    fieldSeparator: string;
}

export const DEFAULT_SETTINGS: BlueStarSettings = {
    updateExisting: false,
    allowSingleField: true,
    htmlLineBreak: false,
    fileScope: 'currentFile',
    directoryPath: 'Anki',
    includeFileTag: '',
    excludeFileTag: '',
    ankiDeck: 'Default',
    ankiModel: 'Basic',
    ankiTag: 'blue-star',
    matchMode: 'section-subsection',
    currentHeadingLevel: 2,
    headingLevel: {
        'section-subsection': 2,
        'heading-paragraph': 2,
        'multi-subsection': 2,
        'multi-subparagraph': 2
    },
    regexPatterns: [
        {
            alias: 'Single line separated by ::',
            pattern: '^(.*[^\n:]{1}):{2}([^\n:]{1}.*)',
            flags: 'gm',
            enabled: false
        },
        {
            alias: 'Multi-line Q&A starting with Q: and A:',
            pattern: '^Q: ((?:.+\n)*)\n*A: (.+(?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)',
            flags: 'gm',
            enabled: false
        },
        {
            alias: 'Multi-line text separated by \'#flashcard\'',
            pattern: '((?:[^\n][\n]?)+) #flashcard ?\n*((?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))+)',
            flags: 'gm',
            enabled: false
        },
        {
            alias: 'Multi-line text separated by ---',
            pattern: '((?:[^\n][\n]?)+\n)-{3,}((?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)',
            flags: 'gm',
            enabled: false
        },
        {
            alias: 'Cloze paragraph format',
            pattern: '((?:.+\n)*(?:.*{{c.*)(?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)',
            flags: 'gm',
            enabled: false
        },
        {
            alias: 'All headings and paragraph, starting from h1',
            pattern: '^#+(.+)\n*((?:\n(?:^[^\n#].{0,2}$|^[^\n#].{3}(?<!<!--).*))+)',
            flags: 'gm',
            enabled: false
        },
        {
            alias: 'All headings and paragraph, starting from h2',
            pattern: '^#{2,}(.+)\n*((?:\n(?:^[^\n#].{0,2}$|^[^\n#].{3}(?<!<!--).*))+)',
            flags: 'gm',
            enabled: false
        },
        {
            alias: 'All headings and paragraph, starting from h3',
            pattern: '^#{3,}(.+)\n*((?:\n(?:^[^\n#].{0,2}$|^[^\n#].{3}(?<!<!--).*))+)',
            flags: 'gm',
            enabled: false
        }
    ],
    customDelimiters: {
        cardStart: '<!-- card start -->',
        fieldSeparator: '<!-- field separator -->',
        cardEnd: '<!-- card end -->'
    },
    signleDelimiter: {
        fieldSeparator: '<!-- field separator -->',
    },
    fieldSeparator: '<!-- field separator -->'
}
