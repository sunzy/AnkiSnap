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
    const payload = {
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
    };

    try {
      const response = await axios.post(ANKI_CONNECT_URL, payload);
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data.result;
    } catch (error: any) {
      console.error('AnkiConnect Main Process Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  });
}
