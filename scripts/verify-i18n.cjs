const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron');

const root = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = '48782';
const targetUrl = `http://${host}:${port}`;

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

async function clickButtonContaining(window, label) {
  const clicked = await window.webContents.executeJavaScript(`
    (() => {
      const button = [...document.querySelectorAll('button')]
        .find(item => item.textContent.includes(${JSON.stringify(label)}));
      if (button) button.click();
      return Boolean(button);
    })();
  `);

  if (!clicked) {
    throw new Error(`Could not click button containing "${label}".`);
  }
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
  await window.webContents.executeJavaScript(`
    window.localStorage.setItem('app-dashboard-language', ${JSON.stringify(language)});
  `);
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

    await loadWithLanguage(window, 'pt');
    await assertBodyContains(window, 'Aplicações Registradas');

    await clickButtonContaining(window, 'Português');
    await clickButtonContaining(window, 'English');
    await new Promise(resolve => setTimeout(resolve, 300));
    await assertBodyContains(window, 'Registered Applications');

    await clickButtonContaining(window, 'English');
    await clickButtonContaining(window, '中文');
    await new Promise(resolve => setTimeout(resolve, 300));
    await assertBodyContains(window, '已注册应用');

    await clickButtonContaining(window, '中文');
    await clickButtonContaining(window, 'Português');
    await new Promise(resolve => setTimeout(resolve, 300));
    await assertBodyContains(window, 'Aplicações Registradas');

    console.log(JSON.stringify({ success: true, checked: ['pt', 'en', 'zh'] }));
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
