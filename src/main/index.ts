import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAuthHandlers } from './ipc/auth'
import { registerProjectHandlers } from './ipc/projects'
import { registerPlotHandlers } from './ipc/plots'
import { registerBuyerHandlers } from './ipc/buyers'
import { registerOwnershipHandlers } from './ipc/ownership'
import { registerDocumentHandlers } from './ipc/documents'
import { registerPaymentHandlers } from './ipc/payments'
import { registerBackupHandlers } from './ipc/backup'
import { registerSettingsHandlers } from './ipc/settings'
import { registerSearchHandlers } from './ipc/search'
import { registerAuditHandlers } from './ipc/audit'
import { initDatabase } from './db/database'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#060907',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  Menu.setApplicationMenu(null)

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Window control IPC
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.optionaldevelopers.ims')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  initDatabase()

  // Register all IPC handlers
  registerAuthHandlers()
  registerProjectHandlers()
  registerPlotHandlers()
  registerBuyerHandlers()
  registerOwnershipHandlers()
  registerDocumentHandlers()
  registerPaymentHandlers()
  registerBackupHandlers()
  registerSettingsHandlers()
  registerSearchHandlers()
  registerAuditHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
