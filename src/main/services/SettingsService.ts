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
  tts?: {
    currentProvider: string;
    providers: {
      [key: string]: {
        apiKey: string;
        region?: string;
        endpoint?: string;
        model?: string;
        voice?: string;
      };
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
    tts: {
      currentProvider: 'edge',
      providers: {
        edge: {
          apiKey: '',
          voice: 'en-US-AndrewNeural'
        },
        azure: { 
          apiKey: '', 
          region: 'eastasia', 
          endpoint: '', 
          model: 'tts-1', 
          voice: 'en-US-AndrewNeural' 
        },
        volcengine: { 
          apiKey: '', 
          region: '', 
          endpoint: 'https://openspeech.bytedance.com/api/v1/tts',
          voice: 'bv001_streaming' 
        },
        openai: {
          apiKey: '',
          endpoint: 'https://api.openai.com/v1/audio/speech',
          model: 'tts-1',
          voice: 'alloy'
        },
        google: {
          apiKey: '',
          voice: 'en'
        }
      }
    },
    currentProvider: 'openai',
    ankiDeckName: 'Default',
  },
});

export function setupSettingsHandlers() {
  ipcMain.handle('get-settings', () => {
    let settings = store.store;
    
    // Ensure TTS settings exist
    if (!settings.tts) {
      settings = {
        ...settings,
        tts: {
          currentProvider: 'edge',
          providers: {
            edge: { apiKey: '', voice: 'en-US-AndrewNeural' },
            azure: { apiKey: '', region: 'eastasia', endpoint: '', model: 'tts-1', voice: 'en-US-AndrewNeural' },
            volcengine: { apiKey: '', region: '', endpoint: 'https://openspeech.bytedance.com/api/v1/tts', voice: 'bv001_streaming' },
            openai: { apiKey: '', endpoint: 'https://api.openai.com/v1/audio/speech', model: 'tts-1', voice: 'alloy' }
          }
        }
      };
      store.store = settings;
    }

    // Ensure OpenAI TTS exists in providers if tts exists
    if (settings.tts && !settings.tts.providers.openai) {
      settings.tts.providers.openai = { apiKey: '', endpoint: 'https://api.openai.com/v1/audio/speech', model: 'tts-1', voice: 'alloy' };
      store.store = settings;
    }

    // Ensure Google TTS exists
    if (settings.tts && !settings.tts.providers.google) {
      settings.tts.providers.google = { apiKey: '', voice: 'en' };
      store.store = settings;
    }

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

    // Decrypt TTS API keys
    const decryptedTTS = settings.tts ? { ...settings.tts } : undefined;
    if (decryptedTTS) {
      const providers = { ...decryptedTTS.providers };
      for (const key in providers) {
        if (providers[key].apiKey && safeStorage.isEncryptionAvailable()) {
          try {
            providers[key].apiKey = safeStorage.decryptString(
              Buffer.from(providers[key].apiKey, 'base64')
            );
          } catch (e) {
            providers[key].apiKey = '';
          }
        }
      }
      decryptedTTS.providers = providers;
    }

    return { ...settings, providers: decryptedProviders, tts: decryptedTTS };
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

    // Encrypt TTS API keys
    const encryptedTTS = newSettings.tts ? { ...newSettings.tts } : undefined;
    if (encryptedTTS) {
      const providers = { ...encryptedTTS.providers };
      for (const key in providers) {
        if (providers[key].apiKey && safeStorage.isEncryptionAvailable()) {
          providers[key].apiKey = safeStorage.encryptString(
            providers[key].apiKey
          ).toString('base64');
        }
      }
      encryptedTTS.providers = providers;
    }

    store.store = { ...newSettings, providers: encryptedProviders, tts: encryptedTTS };
    return true;
  });
}
