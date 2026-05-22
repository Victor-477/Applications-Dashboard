const { app, BrowserWindow, shell } = require('electron');
const http = require('http');
const path = require('path');

const PANEL_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = process.defaultApp ? PANEL_DIR : path.dirname(process.execPath);
const HOST = '127.0.0.1';
const PORT = Number(process.env.PANEL_PORT || 3764);
const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA || RUNTIME_DIR, 'AppDashboard');

let mainWindow;

process.env.NODE_ENV = 'production';
process.env.PANEL_HOST = HOST;
process.env.PANEL_PORT = String(PORT);
process.env.SMART40_PANEL_DIR = PANEL_DIR;

app.setPath('userData', USER_DATA_DIR);
app.setPath('cache', path.join(USER_DATA_DIR, 'Cache'));
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-features', 'NetworkService,NetworkServiceInProcess,NetworkServiceSandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function startInternalServer() {
  require(path.join(PANEL_DIR, 'dist', 'server.cjs'));
}

function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const tryRequest = () => {
      const req = http.get(`http://${HOST}:${PORT}/api/apps`, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error('Servidor interno nao iniciou no tempo esperado.'));
          return;
        }
        setTimeout(tryRequest, 250);
      });
    };

    tryRequest();
  });
}

async function createWindow() {
  startInternalServer();
  await waitForServer();
  app.setName('Applications Dashboard');

  const iconPath = path.join(PANEL_DIR, 'dist', 'ind40-logo.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 780,
    minWidth: 1024,
    minHeight: 640,
    title: 'Applications Dashboard',
    icon: iconPath,
    backgroundColor: '#f9fafb',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://${HOST}:${PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
