import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 768,
    title: '古建瓦作排瓦计算与防漏校核系统',
    backgroundColor: '#1a1f2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    frame: true,
    autoHideMenuBar: true
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:23249')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const dataDir = path.join(app.getPath('userData'), 'data')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function getFilePath(filename: string) {
  return path.join(dataDir, filename)
}

ipcMain.handle('save-data', async (_event, filename: string, data: string) => {
  ensureDataDir()
  fs.writeFileSync(getFilePath(filename), data, 'utf-8')
  return { success: true }
})

ipcMain.handle('load-data', async (_event, filename: string) => {
  ensureDataDir()
  const filePath = getFilePath(filename)
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8')
  }
  return null
})

ipcMain.handle('list-files', async (_event, pattern: string) => {
  ensureDataDir()
  const files = fs.readdirSync(dataDir)
  if (pattern) {
    return files.filter(f => f.includes(pattern))
  }
  return files
})

ipcMain.handle('delete-data', async (_event, filename: string) => {
  ensureDataDir()
  const filePath = getFilePath(filename)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
    return { success: true }
  }
  return { success: false }
})

ipcMain.handle('export-data', async (_event, defaultName: string, data: string) => {
  const result = await dialog.showSaveDialog({
    title: '导出数据',
    defaultPath: defaultName,
    filters: [{ name: 'JSON 文件', extensions: ['json'] }]
  })
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, data, 'utf-8')
    return { success: true, path: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('import-data', async () => {
  const result = await dialog.showOpenDialog({
    title: '导入数据',
    filters: [{ name: 'JSON 文件', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    return { success: true, data: content, path: result.filePaths[0] }
  }
  return { success: false }
})

app.whenReady().then(() => {
  ensureDataDir()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
