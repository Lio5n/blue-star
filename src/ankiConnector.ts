import { Notice } from 'obsidian';
import { BlueStarSettings } from './config';
import { request } from './utils';
import { InputPromptModal, showNotice } from './ui';
import { AnkiConfig } from './parser';

export async function createAnkiCards(parsedContent: any[], settings: AnkiConfig, fileName: string) {
    
    const modelExists = await checkAnkiModelExists(settings.model);
    if (!modelExists) {
        showNotice(`Anki model "${settings.model}" does not exist.`);
        // new InputPromptModal(this.app, `Anki model "${settings.model}" does not exist.`, () => {}).open();
        return;
    }

    await checkOrCreateDeck(settings.deck);

    const modelFields = await getModelFields(settings.model);

    const notes = parsedContent.map(content => {
        const fields: { [key: string]: string } = {};
        modelFields.forEach((field, index) => {
            fields[field] = content[index] || '';
        });

        return {
            deckName: settings.deck,
            modelName: settings.model,
            fields,
            tags: [settings.tag]
        };
    });

    if (settings.update) {
        await upsertAnkiNotes(notes, fileName);
    } else {
        await addAnkiNotes(notes, fileName);
    }
}

async function addAnkiNotes(notes: any[], fileName: string) {
    const response = await request('addNotes', { notes });

    if (!response || !Array.isArray(response)) {
        throw new Error('Invalid response from AnkiConnect');
    }

    const addedCount = response.filter((id: number) => id !== null).length;
    const skippedCount = response.filter((id: number) => id === null).length;

    console.log(response);
    showNotice(`Added ${addedCount} Anki cards and\nSkipped ${skippedCount} Anki cards\nfrom file "${fileName}".`);
}

type Note = {
    deckName: string;
    modelName: string;
    fields: { [key: string]: string };
    tags: string[];
};

type NoteInfo = {
    noteId: number;
    fields: { [key: string]: { value: string } };
};

async function upsertAnkiNotes(notes: Note[], fileName: string) {

    const response: (number | null)[] = await request('addNotes', { notes });

    if (!response || !Array.isArray(response)) {
        throw new Error('Invalid response from AnkiConnect');
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skipCount = 0;
    const failedNotes: Note[] = [];

    response.forEach((id, index) => {
        if (id === null) {
            failedNotes.push(notes[index]);
        } else {
            addedCount++;
        }
    });

    if (failedNotes.length > 0) {
        
        const firstFieldKey = Object.keys(failedNotes[0].fields)[0];
        const queries = failedNotes.map(note => `"${firstFieldKey}:${note.fields[firstFieldKey]}"`);
        const noteIdsResponse: number[] = await request('findNotes', { query: queries.join(' OR ') });

        if (noteIdsResponse.length > 0) {
            
            const notesInfo: NoteInfo[] = await request('notesInfo', { notes: noteIdsResponse });

            const notesToUpdate: { id: number; fields: { [key: string]: string }; tags: string[] }[] = [];

            notesInfo.forEach((noteInfo, index) => {
                const failedNote = failedNotes[index];
                const fieldsDifferent = Object.keys(failedNote.fields).some(
                    key => failedNote.fields[key] !== noteInfo.fields[key].value
                );

                if (fieldsDifferent) {
                    notesToUpdate.push({
                        id: noteInfo.noteId,
                        fields: failedNote.fields,
                        tags: failedNote.tags
                    });
                } else {
                    skipCount++;
                }
            });

            if (notesToUpdate.length > 0) {
                await Promise.all(notesToUpdate.map(note => 
                    request('updateNoteFields', { note })
                ));
                updatedCount += notesToUpdate.length;
            }
        }
    }

    showNotice(`Added ${addedCount} Anki cards\nUpdated ${updatedCount} Anki cards\nSkipped ${skipCount} Anki cards\nfrom file "${fileName}".`);
}

export async function checkAnkiModelExists(modelName: string): Promise<boolean> {
    const response = await request('modelNames');
    return response.includes(modelName);
}

async function checkOrCreateDeck(deckName: string): Promise<void> {
    const response = await request('deckNames');
    if (!response.includes(deckName)) {
        await request('createDeck', { deck: deckName });
    }
}

async function getModelFields(modelName: string): Promise<string[]> {
    const response = await request('modelFieldNames', { modelName });
    return response;
}
