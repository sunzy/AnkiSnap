import axios from 'axios';
import { ITTSAdapter, TTSConfig } from './ITTSAdapter';
import log from 'electron-log';

export class AzureTTSAdapter implements ITTSAdapter {
  async synthesize(text: string, config: TTSConfig): Promise<Buffer> {
    // If endpoint contains 'openai', assume Azure OpenAI TTS
    if (config.endpoint?.includes('openai')) {
      return this.synthesizeOpenAI(text, config);
    } else {
      // Otherwise assume Azure AI Speech
      return this.synthesizeAzureSpeech(text, config);
    }
  }

  private async synthesizeOpenAI(text: string, config: TTSConfig): Promise<Buffer> {
    log.info('TTS: Using Azure OpenAI TTS');
    const url = `${config.endpoint}/openai/deployments/${config.model}/audio/speech?api-version=2024-02-15-preview`;
    
    const response = await axios.post(
      url,
      {
        input: text,
        voice: config.voice || 'alloy',
        model: 'tts'
      },
      {
        headers: {
          'api-key': config.apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data);
  }

  private async synthesizeAzureSpeech(text: string, config: TTSConfig): Promise<Buffer> {
    log.info('TTS: Using Azure AI Speech');
    const region = config.region || 'eastus';
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    
    const ssml = `
      <speak version='1.0' xml:lang='en-US'>
        <voice xml:lang='en-US' xml:gender='Female' name='${config.voice || 'en-US-AvaMultilingualNeural'}'>
          ${text}
        </voice>
      </speak>`;

    const response = await axios.post(
      url,
      ssml,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': config.apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'AnkiSnap'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data);
  }
}
