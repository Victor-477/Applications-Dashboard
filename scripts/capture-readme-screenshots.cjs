const fs = require('fs/promises');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'docs', 'images');
const targetUrl = process.argv[2] || 'http://127.0.0.1:48780';
const screenshotLanguage = process.argv[3] || 'en';

async function saveScreenshot(window, fileName) {
  const image = await window.webContents.capturePage();
  const targetPath = path.join(outputDir, fileName);
  await fs.writeFile(targetPath, image.toPNG());
  console.log(`Saved ${targetPath}`);
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
  await window.webContents.executeJavaScript(`
    window.localStorage.setItem('app-dashboard-language', ${JSON.stringify(screenshotLanguage)});
  `);
  await window.loadURL(targetUrl);
  await new Promise(resolve => setTimeout(resolve, 1200));
  await saveScreenshot(window, 'dashboard-overview.png');

  await window.webContents.executeJavaScript(`
    [...document.querySelectorAll('button')]
      .find(button => ['Novo App', 'New App', '新增应用'].some(label => button.textContent.includes(label)))
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
