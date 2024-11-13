import { Notice } from 'obsidian';
import { BlueStarSettings } from './config';
import { request } from './utils';
import { InputPromptModal, showNotice } from './ui';
import { AnkiConfig } from './parser';

export async function createAnkiCards(parsedContent: any[], settings: AnkiConfig, fileName: string) {
    
    const modelExists = await checkAnkiModelExists(settings.model);
    if (!modelExists) {
        showNotice(`Anki model "${settings.model}" does not exist.`);
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
    let addedCount = 0;
    let skippedCount = 0;

    // Process notes one by one to handle duplicates
    for (const note of notes) {
        try {
            const response = await request('addNote', { note });
            if (response) {
                addedCount++;
            }
        } catch (error) {
            // Check if the error is due to duplicate note
            if (error.message.includes('duplicate')) {
                skippedCount++;
            } else {
                throw error; // Re-throw if it's a different error
            }
        }
    }

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
    let addedCount = 0;
    let updatedCount = 0;
    let skipCount = 0;
    const failedNotes: Note[] = [];

    // Try to add notes one by one
    for (const note of notes) {
        try {
            const response = await request('addNote', { note });
            if (response) {
                addedCount++;
            }
        } catch (error) {
            if (error.message.includes('duplicate')) {
                failedNotes.push(note);
            } else {
                throw error;
            }
        }
    }

    if (failedNotes.length > 0) {
        const firstFieldKey = Object.keys(failedNotes[0].fields)[0];
        const queries = failedNotes.map(note => `"${firstFieldKey}:${note.fields[firstFieldKey]}"`);
        const noteIdsResponse: number[] = await request('findNotes', { query: queries.join(' OR ') });

        if (noteIdsResponse.length > 0) {
            const notesInfo: NoteInfo[] = await request('notesInfo', { notes: noteIdsResponse });

            const notesToUpdate: { id: number; fields: { [key: string]: string }; tags: string[] }[] = [];

            notesInfo.forEach((noteInfo, index) => {
                if (index < failedNotes.length) {  // 确保不会超出 failedNotes 范围
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
                }
            });

            if (notesToUpdate.length > 0) {
                for (const note of notesToUpdate) {
                    try {
                        await request('updateNoteFields', { note });
                        updatedCount++;
                    } catch (error) {
                        console.error('Failed to update note:', error);
                        skipCount++;
                    }
                }
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
