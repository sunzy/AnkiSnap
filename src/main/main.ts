import { app, BrowserWindow, ipcMain, safeStorage } from 'electron'
import { join } from 'path'
import log from 'electron-log'
import fs from 'fs'

// Configure logging
log.transports.file.level = 'info'
log.transports.file.resolvePathFn = () => join(app.getPath('userData'), 'logs/main.log')
log.info('App starting...')

const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json')

// Helper to encrypt sensitive data
function encrypt(text: string) {
  if (!text) return ''
  try {
    if (!safeStorage.isEncryptionAvailable()) return text
    return safeStorage.encryptString(text).toString('base64')
  } catch (e) {
    log.error('Encryption failed', e)
    return text
  }
}

// Helper to decrypt sensitive data
function decrypt(encryptedText: string) {
  if (!encryptedText) return ''
  try {
    if (!safeStorage.isEncryptionAvailable()) return encryptedText
    return safeStorage.decryptString(Buffer.from(encryptedText, 'base64'))
  } catch (e) {
    // If decryption fails, it might be plain text or from another machine
    return encryptedText
  }
}

let mainWindow: BrowserWindow | null = null
// ... rest of imports (will be handled by rollup/vite)
import { LLMAdapter, LLMConfig } from './services/LLMAdapter'
import { setupSettingsHandlers } from './services/SettingsService'
import { setupAnkiHandlers } from './services/AnkiMainService'

const llmAdapter = new LLMAdapter()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 620,
    frame: false,
    alwaysOnTop: false,
    transparent: true,
    icon: join(__dirname, '../build/icon.ico'),
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

// Settings management
ipcMain.handle('get-settings', () => {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
      // Decrypt sensitive fields
      if (data.providers) {
        Object.keys(data.providers).forEach(key => {
          if (data.providers[key].apiKey) {
            data.providers[key].apiKey = decrypt(data.providers[key].apiKey)
          }
        })
      }
      return data
    }
  } catch (e) {
    log.error('Failed to read settings', e)
  }
  return null
})

ipcMain.handle('save-settings', (_, settings) => {
  try {
    const dataToSave = JSON.parse(JSON.stringify(settings))
    // Encrypt sensitive fields
    if (dataToSave.providers) {
      Object.keys(dataToSave.providers).forEach(key => {
        if (dataToSave.providers[key].apiKey) {
          dataToSave.providers[key].apiKey = encrypt(dataToSave.providers[key].apiKey)
        }
      })
    }
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(dataToSave, null, 2))
    return true
  } catch (e) {
    log.error('Failed to save settings', e)
    return false
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

