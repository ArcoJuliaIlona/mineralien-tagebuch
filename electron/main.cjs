const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

const APP_URL = 'https://mineralien-tagebuch.lovable.app';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 360,
    minHeight: 600,
    title: 'Mineraliensammlung',
    backgroundColor: '#e8f0f8',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null);
  win.loadURL(APP_URL);

  // Externe Links im Standardbrowser öffnen
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
