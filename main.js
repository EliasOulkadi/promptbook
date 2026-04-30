const { app, BrowserWindow, ipcMain, clipboard, Menu, nativeTheme } = require('electron')
const { join } = require('path')
const store = require('./src/store')

const windowStateKeeper = require('electron-window-state')

Menu.setApplicationMenu(null)

let mainWindow

function createWindow() {
  const isWin = process.platform !== 'darwin'

  let mainWindowState = windowStateKeeper({
    defaultWidth: 1140,
    defaultHeight: 740
  })

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 820,
    minHeight: 560,
    backgroundColor: '#0D0D0F',
    ...(isWin
      ? { frame: false }
      : { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 18 } }
    ),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.loadFile(join(__dirname, 'src', 'index.html'))

  mainWindowState.manage(mainWindow)

  mainWindow.on('maximize',   () => mainWindow.webContents.send('win-maximized', true))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('win-maximized', false))

  ipcMain.handle('get-prompts',    ()        => store.getAll())
  ipcMain.handle('get-tags',       ()        => store.getAllTags())
  ipcMain.handle('create-prompt',  (_, d)    => store.create(d))
  ipcMain.handle('update-prompt',  (_, i, f) => store.update(i, f))
  ipcMain.handle('delete-prompt',  (_, i)    => store.remove(i))
  ipcMain.handle('increment-uses', (_, i)    => store.incrementUses(i))
  ipcMain.handle('copy-text',      (_, t)    => { clipboard.writeText(t); return true })
  ipcMain.handle('set-theme',      (_, dark) => {
    nativeTheme.themeSource = dark ? 'dark' : 'light'
    if (mainWindow) mainWindow.setBackgroundColor(dark ? '#0D0D0F' : '#F5F5F7')
  })
  ipcMain.handle('win-minimize', () => mainWindow.minimize())
  ipcMain.handle('win-maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle('win-close', () => mainWindow.close())

  ipcMain.handle('start-auth', async (event, url) => {
    let parsed
    try { parsed = new URL(url) } catch { return null }
    const allowed = ['accounts.google.com', 'supabase.co', 'github.com', 'githubusercontent.com']
    if (parsed.protocol !== 'https:' || !allowed.some(h => parsed.hostname.endsWith(h))) return null

    return new Promise((resolve) => {
      const authWindow = new BrowserWindow({
        width: 600,
        height: 700,
        show: true,
        parent: mainWindow,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        }
      })

      authWindow.loadURL(url)

      let resolved = false
      function tryExtract(targetUrl) {
        if (resolved) return
        try {
          const urlObj = new URL(targetUrl)
          const hash = new URLSearchParams(urlObj.hash.substring(1))
          const query = new URLSearchParams(urlObj.search)
          const access_token = hash.get('access_token') || query.get('access_token')
          const refresh_token = hash.get('refresh_token') || query.get('refresh_token')
          if (access_token && refresh_token) {
            resolved = true
            authWindow.close()
            resolve({ access_token, refresh_token })
          }
        } catch {}
      }

      authWindow.webContents.on('will-redirect', (_, newUrl) => tryExtract(newUrl))
      authWindow.webContents.on('will-navigate', (_, newUrl) => tryExtract(newUrl))
      authWindow.webContents.on('did-navigate', (_, newUrl) => tryExtract(newUrl))

      authWindow.on('closed', () => {
        if (!resolved) resolve(null)
      })
    })
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
