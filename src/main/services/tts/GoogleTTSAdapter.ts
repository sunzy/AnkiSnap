import axios from 'axios';
import { ITTSAdapter, TTSConfig } from './ITTSAdapter';
import log from 'electron-log';

export class GoogleTTSAdapter implements ITTSAdapter {
  async synthesize(text: string, config?: TTSConfig): Promise<Buffer> {
    log.info('TTS: Using Google Translate TTS (Free)');
    
    // Google Translate TTS URL
    // client=tw-ob is essential for bypassing some restrictions
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${config?.voice || 'en'}&client=tw-ob`;

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      log.error('Google TTS failed:', error);
      throw new Error(`Google TTS synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
