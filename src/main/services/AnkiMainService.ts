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
    const axiosConfig = {
      timeout: 10000,
      headers: {
        'Connection': 'close'
      }
    };

    const maxRetries = 3;
    let lastError: any = null;

    for (let i = 0; i < maxRetries; i++) {
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
        }, axiosConfig);

        if (response.data.error) {
          // 2. If it's a duplicate error, try to update the existing note
          if (response.data.error.includes('duplicate')) {
            console.log('Duplicate detected, attempting to overwrite...');
            
            const cleanFront = note.fields.Front
              .replace(/[\n\r]/g, ' ')
              .replace(/[\\"]/g, '\\$&')
              .trim();

            await new Promise(resolve => setTimeout(resolve, 300));

            const findResponse = await axios.post(ANKI_CONNECT_URL, {
              action: 'findNotes',
              version: 6,
              params: {
                query: `front:"${cleanFront}"`
              }
            }, axiosConfig);

            const noteIds = findResponse.data.result;
            if (noteIds && noteIds.length > 0) {
              console.log(`Found existing note IDs: ${noteIds}. Updating the first one...`);
              await axios.post(ANKI_CONNECT_URL, {
                action: 'updateNoteFields',
                version: 6,
                params: {
                  note: {
                    id: noteIds[0],
                    fields: note.fields
                  }
                }
              }, axiosConfig);
              return 'updated';
            }
          }
          throw new Error(response.data.error);
        }
        return response.data.result;
      } catch (error: any) {
        lastError = error;
        console.error(`AnkiConnect attempt ${i + 1} failed:`, error.code || error.message);
        
        // 如果是连接重置，等待更久一点再重试
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
          continue;
        }
        // 其他错误直接抛出
        break;
      }
    }

    if (lastError.code === 'ECONNRESET') {
      throw new Error('与 Anki 的连接多次重置 (ECONNRESET)。请检查 Anki 是否已开启 AnkiConnect 且没有被防火墙拦截，然后重试。');
    }
    throw new Error(lastError.response?.data?.error || lastError.message);
  });
}
