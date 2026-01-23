import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { ITTSAdapter, TTSConfig } from './ITTSAdapter';
import log from 'electron-log';

export class AzureTTSAdapter implements ITTSAdapter {
  async synthesize(text: string, config?: TTSConfig): Promise<Buffer> {
    if (!config || !config.apiKey || !config.region) {
      throw new Error('Azure TTS requires API Key and Region');
    }
    log.info('TTS: Using Azure Speech SDK');
    
    return new Promise((resolve, reject) => {
      try {
        const speechConfig = sdk.SpeechConfig.fromSubscription(
          config.apiKey, 
          config.region
        );
        
        // Set voice name
        speechConfig.speechSynthesisVoiceName = config.voice || 'en-US-AndrewNeural';
        
        // Use a PullAudioOutputStream to get the buffer directly without writing to a real file on disk here
        // (TTSService will handle the final file writing)
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined);

        synthesizer.speakTextAsync(
          text,
          (result) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              const { audioData } = result;
              synthesizer.close();
              resolve(Buffer.from(audioData));
            } else {
              const details = result.errorDetails || 'Unknown error';
              log.error('Azure TTS SDK synthesis failed:', details);
              synthesizer.close();
              reject(new Error(details));
            }
          },
          (err) => {
            log.error('Azure TTS SDK error:', err);
            synthesizer.close();
            reject(err);
          }
        );
      } catch (error: any) {
        log.error('Azure TTS SDK setup failed:', error.message);
        reject(error);
      }
    });
  }
}
