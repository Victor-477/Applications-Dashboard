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
const appsFile = path.join(root, 'apps.json');

// Representative instances used only while capturing screenshots, so the
// documentation shows a realistic dashboard. The real apps.json is restored
// afterwards. The set is varied on purpose: instances with ports, an instance
// with a custom web link, and one without either (no link action).
const demoApps = [
  { id: 'backend-api', name: 'Backend API', command: 'npm', args: 'run dev', port: '3000', cwd: '../backend', shell: true },
  { id: 'frontend', name: 'Frontend', command: 'npm', args: 'run dev', port: '5173', cwd: '../frontend', dependsOn: ['backend-api'], shell: true },
  { id: 'database', name: 'Database', command: 'docker', args: 'start local-postgres', port: '5432', shell: true },
  { id: 'background-worker', name: 'Background Worker', command: 'node', args: 'worker.js', port: '', cwd: '../worker', shell: true },
  { id: 'monitoring', name: 'Monitoring', command: 'node', args: 'server.js', port: '', webLink: 'http://127.0.0.1:9090', shell: true },
];

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

async function setDashboardLayout(window, layout) {
  await window.webContents.executeJavaScript(`
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardLayout: ${JSON.stringify(layout)} }),
    }).then(response => response.json());
  `);
  await wait(300);
}

// SettingsView resets the active tab to its initial tab once the async settings
// load (which includes TCP port checks) finishes, and that completion time
// varies. So re-click the tab on every tick and only finish once the expected
// content has stayed on screen for several consecutive ticks, which guarantees
// the late reset has already happened and been clicked past.
async function activateTab(window, label, needle) {
  const ok = await window.webContents.executeJavaScript(`
    new Promise((resolve) => {
      let attempts = 0;
      let stable = 0;
      const tick = () => {
        attempts += 1;
        const button = [...document.querySelectorAll('button')]
          .find(item => item.textContent.trim() === ${JSON.stringify(label)});
        if (button) button.click();
        const ready = document.body.innerText.toLowerCase()
          .includes(${JSON.stringify(needle.toLowerCase())});
        stable = ready ? stable + 1 : 0;
        if (stable >= 7) { resolve(true); return; }
        if (attempts > 80) { resolve(false); return; }
        setTimeout(tick, 150);
      };
      tick();
    });
  `);

  if (!ok) {
    throw new Error(`Could not activate the "${label}" settings tab.`);
  }
}

async function captureSettingsTab(window, tabLabel, fileName, verifyNeedle) {
  await loadDashboard(window);
  await clickByTitle(window, 'Settings');
  await activateTab(window, tabLabel, verifyNeedle);
  await saveScreenshot(window, fileName);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  // Seed demo instances for the capture, remembering the real file to restore.
  let originalApps;
  if (shouldStartServer) {
    try {
      originalApps = await fs.readFile(appsFile, 'utf-8');
    } catch {
      originalApps = undefined;
    }
    await fs.writeFile(appsFile, `${JSON.stringify(demoApps, null, 2)}\n`, 'utf-8');
  }

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

    // Force the card layout for the default dashboard shot, regardless of any
    // previously saved preference.
    await loadDashboard(window);
    await setDashboardLayout(window, 'cards');
    await loadDashboard(window);
    await saveScreenshot(window, 'dashboard-overview.png');

    await clickButtonContaining(window, 'New App');
    await saveScreenshot(window, 'app-form.png');

    await loadDashboard(window);
    await clickByTitle(window, 'Language');
    await saveScreenshot(window, 'language-selector.png');

    await captureSettingsTab(window, 'General', 'settings-general.png', 'Internal server');
    await captureSettingsTab(window, 'Style', 'settings-style.png', 'Instance presentation');
    await captureSettingsTab(window, 'System logs', 'settings-logs.png', 'Download records');

    await loadDashboard(window);
    await clickByTitle(window, 'Patch Files');
    await saveScreenshot(window, 'patch-files.png');

    await loadDashboard(window);
    await clickByTitle(window, 'AI Chat');
    await saveScreenshot(window, 'ai-chat.png');

    await loadDashboard(window);
    await clickByTitle(window, 'About system');
    await saveScreenshot(window, 'about-system.png');

    // List layout: switch the dashboard presentation, capture, then restore cards.
    await setDashboardLayout(window, 'list');
    await loadDashboard(window);
    await saveScreenshot(window, 'dashboard-list.png');
    await setDashboardLayout(window, 'cards');

    // Internal HomePage served by the application.
    await window.loadURL(`${targetUrl}/internal-homepage`);
    await wait(1000);
    await saveScreenshot(window, 'internal-homepage.png');
  } finally {
    if (server) server.kill();
    if (shouldStartServer && originalApps !== undefined) {
      await fs.writeFile(appsFile, originalApps, 'utf-8');
    }
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
