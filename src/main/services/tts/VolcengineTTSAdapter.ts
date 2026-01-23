import axios from 'axios';
import { ITTSAdapter, TTSConfig } from './ITTSAdapter';
import log from 'electron-log';
import crypto from 'crypto';

export class VolcengineTTSAdapter implements ITTSAdapter {
  async synthesize(text: string, config: TTSConfig): Promise<Buffer> {
    log.info('TTS: Using Volcengine TTS');
    
    const url = 'https://openspeech.bytedance.com/api/v1/tts';
    const appid = config.region; // AppID is stored in region field
    const token = config.apiKey;
    const cluster = config.endpoint || 'volcano_tts'; // Use endpoint field for Cluster ID
    
    if (!appid || !token) {
      throw new Error('Volcengine TTS requires AppID and Access Token (API Key)');
    }

    try {
      const requestData = {
        app: {
          appid: appid,
          token: token,
          cluster: cluster
        },
        user: {
          uid: 'ankisnap_user'
        },
        audio: {
          voice_type: config.voice || 'bv001_streaming',
          encoding: 'mp3',
          speed_ratio: 1.0,
          volume_ratio: 1.0,
          pitch_ratio: 1.0,
        },
        request: {
          reqid: crypto.randomUUID(),
          text: text,
          text_type: 'plain',
          operation: 'query'
        }
      };

      log.info(`Volcengine TTS Request: AppID=${appid}, Cluster=${cluster}, Voice=${requestData.audio.voice_type}`);

      const response = await axios.post(
        url,
        requestData,
        {
          headers: {
            'Authorization': `Bearer;${token}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      // Check if response is actually JSON (error) despite arraybuffer responseType
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const decoder = new TextDecoder('utf-8');
        const jsonText = decoder.decode(response.data);
        const errorJson = JSON.parse(jsonText);
        log.error('Volcengine TTS API Error:', errorJson);
        throw new Error(`Volcengine Error ${errorJson.code}: ${errorJson.message}`);
      }

      log.info(`Volcengine TTS Success: Received ${response.data.byteLength} bytes`);
      return Buffer.from(response.data);
    } catch (error: any) {
      if (error.response && error.response.data instanceof ArrayBuffer) {
        const decoder = new TextDecoder('utf-8');
        const errorText = decoder.decode(error.response.data);
        log.error('Volcengine TTS Error Response:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(`Volcengine TTS failed (401/4xx): ${errorJson.message || errorText}`);
        } catch {
          throw new Error(`Volcengine TTS failed: ${errorText}`);
        }
      }
      log.error('Volcengine TTS failed:', error.message);
      throw error;
    }
  }
}
