import { App, Notice } from 'obsidian';

export async function readCurrentFileContent(app: App): Promise<string | null> {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice('No active file found');
        return null;
    }

    return await app.vault.read(activeFile);
}
