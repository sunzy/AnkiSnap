
import axios from 'axios';
import { ITTSAdapter, TTSConfig } from './ITTSAdapter';
import log from 'electron-log';

export class OpenAITTSAdapter implements ITTSAdapter {
  async synthesize(text: string, config?: TTSConfig): Promise<Buffer> {
    if (!config || !config.apiKey) {
      throw new Error('OpenAI TTS requires API Key');
    }
    
    log.info('TTS: Using OpenAI TTS API');
    
    const baseURL = config.endpoint || 'https://api.openai.com/v1/audio/speech';
    const model = config.model || 'tts-1';
    const voice = config.voice || 'alloy'; // alloy, echo, fable, onyx, nova, shimmer

    const response = await axios.post(
      baseURL,
      {
        model: model,
        input: text,
        voice: voice,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  }
}
