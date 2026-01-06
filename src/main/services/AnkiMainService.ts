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
        'Connection': 'close' // 避免 ECONNRESET，强制短连接
      }
    };

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
          
          // 优化搜索查询：处理特殊字符和换行符
          const cleanFront = note.fields.Front
            .replace(/[\n\r]/g, ' ') // 换行转空格
            .replace(/[\\"]/g, '\\$&') // 转义反斜杠和引号
            .trim();

          // 等待一小会儿，确保 Anki 释放了上一个请求的资源
          await new Promise(resolve => setTimeout(resolve, 200));

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
          } else {
            console.warn('Duplicate error reported by Anki, but findNotes returned no results for query:', cleanFront);
          }
        }
        throw new Error(response.data.error);
      }
      return response.data.result;
    } catch (error: any) {
      console.error('AnkiConnect Main Process Error:', error.code || error.message);
      if (error.code === 'ECONNRESET') {
        throw new Error('与 Anki 的连接被重置 (ECONNRESET)。请检查 Anki 是否正常运行，并尝试重新点击同步。');
      }
      throw new Error(error.response?.data?.error || error.message);
    }
  });
}
