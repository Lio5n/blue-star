import { Notice } from 'obsidian';
import { BlueStarSettings } from './config';
import { request } from './utils';
import { InputPromptModal, showNotice } from './ui';
import { AnkiConfig } from './parser';
import { TFile } from 'obsidian';

// Add helper function to convert image to base64
async function getImageBase64(app: any, imagePath: string): Promise<string> {
    try {
        const imageFile = app.vault.getAbstractFileByPath(imagePath);
        if (imageFile instanceof TFile) {
            const arrayBuffer = await app.vault.readBinary(imageFile);
            const base64 = arrayBufferToBase64(arrayBuffer);
            const extension = imagePath.split('.').pop()?.toLowerCase() || 'png';
            return `data:image/${extension};base64,${base64}`;
        }
    } catch (error) {
        // Handle error silently or log to a file if needed
    }
    return '';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Add helper function to check if file is an image
function isImageFile(filename: string): boolean {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? imageExtensions.includes(extension) : false;
}

// Add function to decode URL-encoded path
function decodeImagePath(path: string): string {
    try {
        return decodeURIComponent(path);
    } catch (error) {
        // Handle error silently or log to a file if needed
        return path;
    }
}

// Add function to get attachment folder path
function getAttachmentFolderPath(app: any, currentFileDir: string): string {
    const attachmentFolderPath = app.vault.getConfig("attachmentFolderPath");
    
    // If it's a specific folder path
    if (attachmentFolderPath && !attachmentFolderPath.startsWith('./')) {
        return attachmentFolderPath;
    }
    
    // If it's relative to current file
    if (attachmentFolderPath && attachmentFolderPath.startsWith('./')) {
        return `${currentFileDir}/${attachmentFolderPath.slice(2)}`;
    }
    
    // If not specified, attachments are stored in vault root
    return '';
}

// Add function to process markdown content and handle images
async function processContent(app: any, content: string, filePath: string, settings: BlueStarSettings): Promise<string> {
    // Get the directory of current file
    const currentFileDir = filePath.substring(0, filePath.lastIndexOf('/'));
    
    // Get attachment folder path
    const attachmentFolder = getAttachmentFolderPath(app, currentFileDir);
    
    // Match both standard markdown image syntax and Obsidian internal link syntax
    const imageRegex = /!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)|!\[\[(.*?)(?:\s*\|\s*(\d+)(?:\s*x\s*(\d+))?)?\]\]/g;
    let processedContent = content;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
        const [fullMatch, mdAlt, mdPath, mdTitle, obsidianPath, obsidianWidth, obsidianHeight] = match;

        // Handle different image syntax
        const imagePath = obsidianPath || mdPath;
        if (!imagePath) continue;

        // First decode the URL-encoded path
        const decodedPath = decodeImagePath(imagePath);

        // Check if it's an image file
        if (!isImageFile(decodedPath)) {
            continue;
        }

        // Remove leading/trailing quotes if present
        const cleanPath = decodedPath.replace(/^["'](.+)["']$/, '$1');
        
        // Try different path resolutions
        const possiblePaths = [
            cleanPath, // Original path
            `${currentFileDir}/${cleanPath}`, // Relative to current file
            cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath, // Remove leading slash if exists
            attachmentFolder ? `${attachmentFolder}/${cleanPath}` : cleanPath, // Check in attachment folder
        ];
        
        let imageFile = null;
        let workingPath = null;

        // Try each possible path until we find the image
        for (const path of possiblePaths) {
            try {
                const file = app.vault.getAbstractFileByPath(path);
                
                if (file instanceof TFile && isImageFile(file.path)) {
                    imageFile = file;
                    workingPath = path;
                    break;
                }
            } catch (error) {
                // Handle error silently or log to a file if needed
            }
        }

        if (imageFile && workingPath) {
            try {
                const base64Data = await getImageBase64(app, workingPath);
                if (base64Data) {
                    processedContent = processedContent.replace(
                        fullMatch,
                        `<img src="${base64Data}" style="max-width: ${settings.imageMaxWidth}%;">`
                    );
                }
            } catch (error) {
                // Handle error silently or log to a file if needed
            }
        }
    }

    return processedContent;
}

export async function createAnkiCards(parsedContent: any[], settings: AnkiConfig & BlueStarSettings, fileName: string, app: any) {
    const modelExists = await checkAnkiModelExists(settings.model);
    if (!modelExists) {
        showNotice(`Anki model "${settings.model}" does not exist.`);
        return;
    }

    await checkOrCreateDeck(settings.deck);
    const modelFields = await getModelFields(settings.model);

    // Process each note's content to handle images
    const processedNotes = await Promise.all(parsedContent.map(async content => {
        const fields: { [key: string]: string } = {};
        for (let i = 0; i < modelFields.length; i++) {
            const fieldContent = content[i] || '';
            fields[modelFields[i]] = await processContent(app, fieldContent, fileName, settings);
        }

        return {
            deckName: settings.deck,
            modelName: settings.model,
            fields,
            tags: [settings.tag]
        };
    }));

    if (settings.update) {
        await upsertAnkiNotes(processedNotes, fileName);
    } else {
        await addAnkiNotes(processedNotes, fileName);
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
                if (index < failedNotes.length) {
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
                        // Handle error silently or log to a file if needed
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
