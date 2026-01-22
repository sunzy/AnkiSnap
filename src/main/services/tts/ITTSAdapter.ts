export interface TTSConfig {
  apiKey: string;
  region?: string;
  endpoint?: string;
  model?: string;
  voice?: string;
}

export interface ITTSAdapter {
  synthesize(text: string, config: TTSConfig): Promise<Buffer>;
}
