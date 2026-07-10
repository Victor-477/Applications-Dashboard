const { app, BrowserWindow, shell } = require('electron');
const fs = require('fs');
const http = require('http');
const path = require('path');

const PANEL_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = process.defaultApp ? PANEL_DIR : path.dirname(process.execPath);

// Read the persisted internal-API settings before the server boots so this
// process and the internal Express server agree on the same host and port. Bad
// values collapse silently to the built-in defaults so a broken settings.json
// never blocks launch.
function readInternalApiSettings() {
  const defaults = { port: 3764, remoteAccess: false };
  try {
    const raw = fs.readFileSync(path.join(PANEL_DIR, 'settings.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    const port = Number(parsed && parsed.internalApiPort);
    if (Number.isFinite(port) && port > 0 && port <= 65535) {
      defaults.port = Math.trunc(port);
    }
    defaults.remoteAccess = Boolean(parsed && parsed.internalApiRemoteAccess);
  } catch {
    /* fall back to defaults */
  }
  return defaults;
}

const INTERNAL_API = readInternalApiSettings();
const HOST = INTERNAL_API.remoteAccess ? '0.0.0.0' : '127.0.0.1';
// BrowserWindow always loads over loopback even when the API accepts LAN
// connections — remote access only affects how the server binds, not how the
// desktop shell reaches it.
const LOOPBACK_HOST = '127.0.0.1';
const PORT = Number(process.env.PANEL_PORT || INTERNAL_API.port);
const USER_DATA_DIR = path.join(RUNTIME_DIR, 'user-data');
const CACHE_DIR = path.join(USER_DATA_DIR, 'Cache');

let mainWindow;

process.env.NODE_ENV = 'production';
process.env.PANEL_HOST = HOST;
process.env.PANEL_PORT = String(PORT);
process.env.SMART40_PANEL_DIR = PANEL_DIR;

fs.mkdirSync(USER_DATA_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

app.commandLine.appendSwitch('user-data-dir', USER_DATA_DIR);
app.setPath('userData', USER_DATA_DIR);
app.setPath('cache', CACHE_DIR);
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-features', 'NetworkService,NetworkServiceInProcess,NetworkServiceSandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

if (process.platform === 'win32') {
  app.setAppUserModelId('local.applicationsdashboard.desktopcontrolpanel');
}

function startInternalServer() {
  require(path.join(PANEL_DIR, 'dist', 'server.cjs'));
}

function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const tryRequest = () => {
      const req = http.get(`http://${LOOPBACK_HOST}:${PORT}/api/apps`, (res) => {
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
  mainWindow.loadURL(`http://${LOOPBACK_HOST}:${PORT}`);

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
