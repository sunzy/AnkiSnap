export interface ElectronAPI {
  ping: () => Promise<string>;
  encrypt: (text: string) => Promise<string>;
  decrypt: (encryptedText: string) => Promise<string>;
  analyzeImage: (provider: string, base64Image: string, config: any) => Promise<any[]>;
  toggleAlwaysOnTop: () => Promise<boolean>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  ankiCheckConnection: () => Promise<boolean>;
  ankiAddNote: (note: any) => Promise<any>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
}


declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
