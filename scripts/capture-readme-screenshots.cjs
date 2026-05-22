const fs = require('fs/promises');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'docs', 'images');
const targetUrl = process.argv[2] || 'http://127.0.0.1:48780';

async function saveScreenshot(window, fileName) {
  const image = await window.webContents.capturePage();
  await fs.writeFile(path.join(outputDir, fileName), image.toPNG());
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const window = new BrowserWindow({
    width: 1366,
    height: 820,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await window.loadURL(targetUrl);
  await new Promise(resolve => setTimeout(resolve, 1200));
  await saveScreenshot(window, 'dashboard-overview.png');

  await window.webContents.executeJavaScript(`
    [...document.querySelectorAll('button')]
      .find(button => button.textContent.includes('Novo App'))
      ?.click();
  `);
  await new Promise(resolve => setTimeout(resolve, 500));
  await saveScreenshot(window, 'app-form.png');
}

app.whenReady()
  .then(main)
  .then(() => app.quit())
  .catch(error => {
    console.error(error);
    app.quit();
    process.exitCode = 1;
  });
