import { Notice } from 'obsidian';

export function showNotice(message: string) {
    new Notice(message);
}

import { App, Modal } from 'obsidian';

export class InputPromptModal extends Modal {
    private message: string;
    private onSubmit: () => void;

    constructor(app: App, message: string, onSubmit: () => void) {
        super(app);
        this.message = message;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: this.message });
        
        const button = contentEl.createEl('button', { text: 'Confirm' });
        button.addEventListener('click', () => {
            this.onSubmit();
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
