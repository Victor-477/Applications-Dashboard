const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron');

const root = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = '48782';
const targetUrl = `http://${host}:${port}`;

const checks = [
  { language: 'en', expectedText: 'Registered Applications' },
  { language: 'pt', expectedText: 'Aplicacoes Registradas' },
  { language: 'zh', expectedText: 'Registered Applications' },
  { language: 'de', expectedText: 'Registrierte Anwendungen' },
  { language: 'es', expectedText: 'Aplicaciones registradas' },
  { language: 'ja', expectedText: '登録済みアプリケーション' },
];

function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const tryRequest = () => {
      const req = http.get(`${targetUrl}/api/apps`, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error('Timed out waiting for the local server.'));
          return;
        }
        setTimeout(tryRequest, 250);
      });
    };

    tryRequest();
  });
}

async function assertBodyContains(window, expectedText) {
  const result = await window.webContents.executeJavaScript(`
    (() => {
      const bodyText = document.body.innerText;
      const expectedText = ${JSON.stringify(expectedText)};
      return {
        containsText: bodyText.toLocaleLowerCase().includes(expectedText.toLocaleLowerCase()),
        bodyText: bodyText.slice(0, 500)
      };
    })();
  `);

  if (!result.containsText) {
    throw new Error(`Expected page to contain "${expectedText}". Current text: ${result.bodyText}`);
  }
}

async function loadWithLanguage(window, language) {
  await window.loadURL(targetUrl);
  await new Promise(resolve => setTimeout(resolve, 800));
  await window.webContents.executeJavaScript(`
    window.localStorage.setItem('app-dashboard-language', ${JSON.stringify(language)});
  `);
  await window.loadURL('about:blank');
  await window.loadURL(targetUrl);
  await new Promise(resolve => setTimeout(resolve, 800));
}

async function main() {
  const server = spawn('node', ['dist/server.cjs'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PANEL_HOST: host,
      PANEL_PORT: port,
      SMART40_PANEL_DIR: root,
    },
    stdio: 'ignore',
    windowsHide: true,
  });

  try {
    await waitForServer();

    const window = new BrowserWindow({
      width: 1366,
      height: 820,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    for (const check of checks) {
      await loadWithLanguage(window, check.language);
      await assertBodyContains(window, check.expectedText);
    }

    console.log(JSON.stringify({ success: true, checked: checks.map(check => check.language) }));
  } finally {
    server.kill();
  }
}

app.whenReady()
  .then(main)
  .then(() => app.quit())
  .catch(error => {
    console.error(error);
    app.exit(1);
  });
