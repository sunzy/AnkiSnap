import axios from 'axios';
import { ipcMain } from 'electron';

const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';

export interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: {
    Front: string;
    Back: string;
  };
  tags?: string[];
}

export function setupAnkiHandlers() {
  ipcMain.handle('anki-check-connection', async () => {
    try {
      // Use a proper version request to check connection
      const response = await axios.post(ANKI_CONNECT_URL, {
        action: 'version',
        version: 6
      }, { timeout: 2000 });
      return response.data.result === 6;
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('anki-add-note', async (_, note: AnkiNote) => {
    try {
      // 1. Try to add the note
      const response = await axios.post(ANKI_CONNECT_URL, {
        action: 'addNote',
        version: 6,
        params: {
          note: {
            ...note,
            options: {
              allowDuplicate: false,
            },
          },
        },
      });

      if (response.data.error) {
        // 2. If it's a duplicate error, try to update the existing note
        if (response.data.error.includes('duplicate')) {
          console.log('Duplicate detected, attempting to overwrite...');
          
          // Find the existing note ID by the first field (Front)
          const findResponse = await axios.post(ANKI_CONNECT_URL, {
            action: 'findNotes',
            version: 6,
            params: {
              query: `"${note.fields.Front.replace(/"/g, '\\"')}"`
            }
          });

          const noteIds = findResponse.data.result;
          if (noteIds && noteIds.length > 0) {
            // Update the first matching note
            await axios.post(ANKI_CONNECT_URL, {
              action: 'updateNoteFields',
              version: 6,
              params: {
                note: {
                  id: noteIds[0],
                  fields: note.fields
                }
              }
            });
            return 'updated';
          }
        }
        throw new Error(response.data.error);
      }
      return response.data.result;
    } catch (error: any) {
      console.error('AnkiConnect Main Process Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  });
}
