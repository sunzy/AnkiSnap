import Store from 'electron-store';
import { ipcMain, safeStorage } from 'electron';

interface Settings {
  providers: {
    [key: string]: {
      apiKey: string;
      baseURL: string;
      model: string;
    };
  };
  currentProvider: string;
  ankiDeckName: string;
}

const store = new Store<Settings>({
  defaults: {
    providers: {
      openai: { apiKey: '', baseURL: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
      dashscope: { apiKey: '', baseURL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', model: 'qwen-vl-max' },
      deepseek: { apiKey: '', baseURL: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-vl-chat' },
    },
    currentProvider: 'openai',
    ankiDeckName: 'Default',
  },
});

export function setupSettingsHandlers() {
  ipcMain.handle('get-settings', () => {
    const settings = store.store;
    // Decrypt API keys before sending to renderer
    const decryptedProviders = { ...settings.providers };
    for (const key in decryptedProviders) {
      if (decryptedProviders[key].apiKey && safeStorage.isEncryptionAvailable()) {
        try {
          decryptedProviders[key].apiKey = safeStorage.decryptString(
            Buffer.from(decryptedProviders[key].apiKey, 'base64')
          );
        } catch (e) {
          decryptedProviders[key].apiKey = '';
        }
      }
    }
    return { ...settings, providers: decryptedProviders };
  });

  ipcMain.handle('save-settings', (_, newSettings: Settings) => {
    const encryptedProviders = { ...newSettings.providers };
    for (const key in encryptedProviders) {
      if (encryptedProviders[key].apiKey && safeStorage.isEncryptionAvailable()) {
        encryptedProviders[key].apiKey = safeStorage.encryptString(
          encryptedProviders[key].apiKey
        ).toString('base64');
      }
    }
    store.store = { ...newSettings, providers: encryptedProviders };
    return true;
  });
}
