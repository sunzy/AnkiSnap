import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  encrypt: (text: string) => ipcRenderer.invoke('encrypt', text),
  decrypt: (encryptedText: string) => ipcRenderer.invoke('decrypt', encryptedText),
  analyzeImage: (provider: string, base64Image: string, config: any) => ipcRenderer.invoke('analyze-image', { provider, base64Image, config }),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  ankiCheckConnection: () => ipcRenderer.invoke('anki-check-connection'),
  ankiAddNote: (note: any) => ipcRenderer.invoke('anki-add-note', note),
  ttsSynthesize: (params: { text: string, provider: string, config: any }) => ipcRenderer.invoke('tts-synthesize', params),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
})


