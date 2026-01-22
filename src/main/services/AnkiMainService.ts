import axios from 'axios';
import { ipcMain } from 'electron';
import log from 'electron-log';
import fs from 'fs';
import { basename } from 'path';

const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';

export interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: {
    Front: string;
    Back: string;
  };
  audioPath?: string;
  tags?: string[];
}

export function setupAnkiHandlers() {
  ipcMain.handle('anki-check-connection', async () => {
    try {
      const response = await fetch(ANKI_CONNECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'version', version: 6 }),
        signal: AbortSignal.timeout(2000)
      });
      const data: any = await response.json();
      return data.result === 6;
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('anki-store-media', async (_, { filename, path }: { filename: string, path: string }) => {
    try {
      const base64Content = fs.readFileSync(path, { encoding: 'base64' });
      const response = await fetch(ANKI_CONNECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Connection': 'close' },
        body: JSON.stringify({
          action: 'storeMediaFile',
          version: 6,
          params: {
            filename: filename,
            data: base64Content
          }
        }),
        signal: AbortSignal.timeout(30000)
      });
      const data: any = await response.json();
      if (data.error) throw new Error(data.error);
      return data.result;
    } catch (error: any) {
      log.error('Failed to store media file:', error.message);
      throw error;
    }
  });

  ipcMain.handle('anki-add-note', async (_, note: AnkiNote) => {
    const maxRetries = 3;
    let lastError: any = null;

    // Handle audio if present
    if (note.audioPath && fs.existsSync(note.audioPath)) {
      try {
        const filename = basename(note.audioPath);
        const base64Content = fs.readFileSync(note.audioPath, { encoding: 'base64' });
        
        const mediaResponse = await fetch(ANKI_CONNECT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Connection': 'close' },
          body: JSON.stringify({
            action: 'storeMediaFile',
            version: 6,
            params: {
              filename: filename,
              data: base64Content
            }
          }),
          signal: AbortSignal.timeout(30000)
        });

        const mediaData: any = await mediaResponse.json();
        if (mediaData.error) {
          log.error('AnkiConnect storeMediaFile error:', mediaData.error);
        } else {
          // Add [sound:...] to the Back field (or wherever appropriate)
          note.fields.Back += `\n<div>[sound:${filename}]</div>`;
        }
      } catch (e: any) {
        log.error('Failed to sync audio to Anki:', e.message);
        // Continue adding the note even if audio sync fails
      }
    }

    for (let i = 0; i < maxRetries; i++) {
      try {
        // 使用原生 fetch 替代 axios，有时 axios 的连接池管理会导致 ECONNRESET
        const response = await fetch(ANKI_CONNECT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Connection': 'close'
          },
          body: JSON.stringify({
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
          }),
          // 设置超时
          signal: AbortSignal.timeout(10000)
        });

        const data: any = await response.json();

        if (data.error) {
          if (data.error.includes('duplicate')) {
            log.info('Duplicate detected, attempting to overwrite...');
            
            const cleanFront = note.fields.Front
              .replace(/[\n\r]/g, ' ')
              .replace(/[\\"]/g, '\\$&')
              .trim();

            await new Promise(resolve => setTimeout(resolve, i === 0 ? 300 : 500));

            const findResponse = await fetch(ANKI_CONNECT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Connection': 'close' },
              body: JSON.stringify({
                action: 'findNotes',
                version: 6,
                params: { query: `front:"${cleanFront}"` }
              }),
              signal: AbortSignal.timeout(5000)
            });
            const findData: any = await findResponse.json();

            const noteIds = findData.result;
            if (noteIds && noteIds.length > 0) {
              log.info(`Found existing note IDs: ${noteIds}. Updating the first one...`);
              await fetch(ANKI_CONNECT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Connection': 'close' },
                body: JSON.stringify({
                  action: 'updateNoteFields',
                  version: 6,
                  params: {
                    note: {
                      id: noteIds[0],
                      fields: note.fields
                    }
                  }
                }),
                signal: AbortSignal.timeout(5000)
              });
              return 'updated';
            }
          }
          throw new Error(data.error);
        }
        return data.result;
      } catch (error: any) {
        lastError = error;
        log.error(`AnkiConnect attempt ${i + 1} failed:`, error.message);
        
        // 如果是连接重置或超时，等待更久一点再重试
        if (error.message.includes('fetch failed') || error.name === 'AbortError' || error.message.includes('reset')) {
          await new Promise(resolve => setTimeout(resolve, 800 * (i + 1)));
          continue;
        }
        break;
      }
    }

    throw new Error(`与 Anki 的连接多次失败。错误信息: ${lastError.message}。请确保 Anki 保持开启状态，且 AnkiConnect 插件配置正确（默认端口 8765）。`);
  });
}
