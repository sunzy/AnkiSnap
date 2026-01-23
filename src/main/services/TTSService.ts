import { AzureTTSAdapter } from './tts/AzureTTSAdapter';
import { VolcengineTTSAdapter } from './tts/VolcengineTTSAdapter';
import { OpenAITTSAdapter } from './tts/OpenAITTSAdapter';
import { ITTSAdapter, TTSConfig } from './tts/ITTSAdapter';
import log from 'electron-log';
import { app, ipcMain } from 'electron';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

export class TTSService {
  private adapters: Record<string, ITTSAdapter> = {
    azure: new AzureTTSAdapter(),
    volcengine: new VolcengineTTSAdapter(),
    openai: new OpenAITTSAdapter(),
  };

  constructor() {
    // Initialize audio directory on startup
    this.getAudioDir();
  }

  private getAudioDir() {
    const dir = join(app.getPath('userData'), 'temp_audio');
    if (!existsSync(dir)) {
      log.info(`TTSService: Creating temp audio directory at ${dir}`);
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async synthesize(text: string, provider: string, config: TTSConfig): Promise<string> {
    const adapter = this.adapters[provider];
    if (!adapter) {
      throw new Error(`TTS provider ${provider} not supported`);
    }

    log.info(`TTSService: Synthesizing text with ${provider}`);
    const buffer = await adapter.synthesize(text, config);
    
    // Save to temp file
    const filename = `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const audioDir = this.getAudioDir();
    const filepath = join(audioDir, filename);
    writeFileSync(filepath, buffer);
    
    log.info(`TTSService: Audio saved to ${filepath}`);
    log.info(`TTSService: Temp audio directory is ${audioDir}`);
    return filepath;
  }
}

const ttsService = new TTSService();

export function setupTTSHandlers() {
  ipcMain.handle('tts-synthesize', async (_, { text, provider, config }) => {
    try {
      return await ttsService.synthesize(text, provider, config);
    } catch (error: any) {
      log.error('TTS synthesis failed:', error.message);
      throw error;
    }
  });
}
