const { app, BrowserWindow, ipcMain, clipboard, Menu, nativeTheme } = require('electron')
const { join } = require('path')
const store = require('./src/store')

Menu.setApplicationMenu(null)

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1140,
    height: 740,
    minWidth: 820,
    minHeight: 560,
    backgroundColor: '#F7F7F8',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.loadFile(join(__dirname, 'src', 'ui.html'))

  ipcMain.handle('get-prompts',    ()        => store.getAll())
  ipcMain.handle('get-tags',       ()        => store.getAllTags())
  ipcMain.handle('create-prompt',  (_, d)    => store.create(d))
  ipcMain.handle('update-prompt',  (_, i, f) => store.update(i, f))
  ipcMain.handle('delete-prompt',  (_, i)    => store.remove(i))
  ipcMain.handle('increment-uses', (_, i)    => store.incrementUses(i))
  ipcMain.handle('copy-text',      (_, t)    => { clipboard.writeText(t); return true })
  ipcMain.handle('set-theme',      (_, dark) => {
    nativeTheme.themeSource = dark ? 'dark' : 'light'
    if (mainWindow) mainWindow.setBackgroundColor(dark ? '#0F0F10' : '#F7F7F8')
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
