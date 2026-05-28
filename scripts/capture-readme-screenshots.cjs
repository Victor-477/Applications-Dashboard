const fs = require('fs/promises');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'docs', 'images');
const host = '127.0.0.1';
const port = process.env.SCREENSHOT_PORT || '48780';
const targetUrl = process.argv[2] || `http://${host}:${port}`;
const screenshotLanguage = process.argv[3] || 'en';
const shouldStartServer = !process.argv[2];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
          reject(new Error('Timed out waiting for the screenshot server.'));
          return;
        }
        setTimeout(tryRequest, 250);
      });
    };

    tryRequest();
  });
}

async function saveScreenshot(window, fileName) {
  await wait(500);
  const image = await window.webContents.capturePage();
  const targetPath = path.join(outputDir, fileName);
  await fs.writeFile(targetPath, image.toPNG());
  console.log(`Saved ${targetPath}`);
}

async function loadDashboard(window) {
  await window.loadURL(targetUrl);
  await wait(800);
  await window.webContents.executeJavaScript(`
    window.localStorage.setItem('app-dashboard-language', ${JSON.stringify(screenshotLanguage)});
  `);
  await window.loadURL('about:blank');
  await window.loadURL(targetUrl);
  await wait(1000);
}

async function clickByTitle(window, title) {
  const clicked = await window.webContents.executeJavaScript(`
    (() => {
      const button = [...document.querySelectorAll('button')]
        .find(item => item.getAttribute('title') === ${JSON.stringify(title)});
      if (button) button.click();
      return Boolean(button);
    })();
  `);

  if (!clicked) {
    throw new Error(`Could not click button with title "${title}".`);
  }
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

async function captureSettingsTab(window, tabLabel, fileName) {
  await loadDashboard(window);
  await clickByTitle(window, 'Settings');
  await wait(700);
  await clickButtonContaining(window, tabLabel);
  await saveScreenshot(window, fileName);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const server = shouldStartServer
    ? spawn('node', ['dist/server.cjs'], {
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
    })
    : undefined;

  try {
    if (shouldStartServer) await waitForServer();

    const window = new BrowserWindow({
      width: 1366,
      height: 820,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    await loadDashboard(window);
    await saveScreenshot(window, 'dashboard-overview.png');

    await clickButtonContaining(window, 'New App');
    await saveScreenshot(window, 'app-form.png');

    await loadDashboard(window);
    await clickByTitle(window, 'Language');
    await saveScreenshot(window, 'language-selector.png');

    await captureSettingsTab(window, 'General', 'settings-general.png');
    await captureSettingsTab(window, 'Style', 'settings-style.png');
    await captureSettingsTab(window, 'System logs', 'settings-logs.png');

    await loadDashboard(window);
    await clickByTitle(window, 'Patch Files');
    await saveScreenshot(window, 'patch-files.png');

    await loadDashboard(window);
    await clickByTitle(window, 'AI Chat');
    await saveScreenshot(window, 'ai-chat.png');

    await loadDashboard(window);
    await clickByTitle(window, 'About system');
    await saveScreenshot(window, 'about-system.png');
  } finally {
    if (server) server.kill();
  }
}

app.whenReady()
  .then(main)
  .then(() => app.quit())
  .catch(error => {
    console.error(error);
    app.quit();
    process.exitCode = 1;
  });
