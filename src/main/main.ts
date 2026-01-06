import { app, BrowserWindow, ipcMain, safeStorage } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null
// ... rest of imports (will be handled by rollup/vite)
import { LLMAdapter, LLMConfig } from './services/LLMAdapter'
import { setupSettingsHandlers } from './services/SettingsService'
import { setupAnkiHandlers } from './services/AnkiMainService'

const llmAdapter = new LLMAdapter()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 700,
    frame: false,
    alwaysOnTop: false,
    transparent: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })


  // Default to not always on top
  mainWindow.setAlwaysOnTop(false)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}


app.whenReady().then(() => {
  setupSettingsHandlers()
  setupAnkiHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC Handlers
ipcMain.handle('ping', () => 'pong')

ipcMain.handle('analyze-image', async (_, { provider, base64Image, config }: { provider: string, base64Image: string, config: LLMConfig }) => {
  try {
    return await llmAdapter.analyze(provider, base64Image, config)
  } catch (error: any) {
    console.error('Analysis error:', error)
    throw error
  }
})

ipcMain.handle('toggle-always-on-top', () => {
  if (mainWindow) {
    const isAlwaysOnTop = mainWindow.isAlwaysOnTop()
    mainWindow.setAlwaysOnTop(!isAlwaysOnTop, 'screen-saver')
    return !isAlwaysOnTop
  }
  return false
})

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize()
  }
})

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close()
  }
})

// Security Handlers
ipcMain.handle('encrypt', (_, text: string) => {
  if (!text) return ''
  if (!safeStorage.isEncryptionAvailable()) return text
  return safeStorage.encryptString(text).toString('base64')
})

ipcMain.handle('decrypt', (_, encryptedText: string) => {
  if (!encryptedText) return ''
  if (!safeStorage.isEncryptionAvailable()) return encryptedText
  try {
    return safeStorage.decryptString(Buffer.from(encryptedText, 'base64'))
  } catch (e) {
    console.error('Decryption failed:', e)
    return ''
  }
})

