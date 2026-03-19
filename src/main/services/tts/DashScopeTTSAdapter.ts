import axios from 'axios';
import { ITTSAdapter, TTSConfig } from './ITTSAdapter';
import log from 'electron-log';

export class DashScopeTTSAdapter implements ITTSAdapter {
  async synthesize(text: string, config: TTSConfig): Promise<Buffer> {
    if (!config || !config.apiKey) {
      throw new Error('DashScope TTS requires API Key');
    }

    log.info('TTS: Using DashScope TTS API');

    const baseURL = config.endpoint || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/text2audio';
    const model = config.model || 'cosyvoice-v1';
    // CosyVoice default voice, sambert can use others
    const voice = config.voice || 'longxiaochun';

    try {
      const response = await axios.post(
        baseURL,
        {
          model: model,
          input: {
            text: text,
          },
          parameters: {
            voice: voice,
            format: 'mp3',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-IsRunInWebsocket': 'false',
          },
          responseType: 'arraybuffer',
        }
      );

      // Check if response is actually JSON error message (when status 200 but application/json)
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const jsonStr = new TextDecoder('utf-8').decode(response.data);
        let errorData;
        try {
          errorData = JSON.parse(jsonStr);
        } catch (e) {
          throw new Error('DashScope TTS Error: ' + jsonStr);
        }
        throw new Error(errorData.message || 'DashScope TTS Error');
      }

      return Buffer.from(response.data);
    } catch (error: any) {
      if (error.response && error.response.data) {
        try {
          const jsonStr = new TextDecoder('utf-8').decode(error.response.data);
          const errorData = JSON.parse(jsonStr);
          log.error('DashScope TTS Error:', errorData);
          throw new Error(`DashScope TTS Error: ${errorData.message || errorData.code || jsonStr}`);
        } catch (e) {
          // Ignore
        }
      }
      throw error;
    }
  }
}
