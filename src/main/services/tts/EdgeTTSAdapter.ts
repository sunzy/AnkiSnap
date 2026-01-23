import { Buffer } from 'node:buffer';
import { WebSocket } from 'ws';
import { ITTSAdapter, TTSConfig } from './ITTSAdapter';
import log from 'electron-log';
import crypto from 'node:crypto';

export class EdgeTTSAdapter implements ITTSAdapter {
  async synthesize(text: string, config?: TTSConfig): Promise<Buffer> {
    log.error('Edge TTS: Currently unavailable due to 403 Forbidden error from Microsoft servers.');
    throw new Error('Edge TTS (Free) is currently unavailable. Please switch to OpenAI TTS or Azure TTS in settings.');
  }
}
