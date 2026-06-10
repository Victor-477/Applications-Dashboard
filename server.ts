import express from 'express';
import 'dotenv/config';
import { spawn, ChildProcess, execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import net from 'net';
import { getImportAppsFromPayload, normalizeImportedApp } from './server/appImport';
import { getDefaultApps } from './server/defaultApps';
import { readJsonFile } from './server/fileUtils';
import { getPatchNotesPayload } from './server/patchNotes';
import {
  getDefaultSettings,
  normalizeAccentColor,
  normalizeDashboardLayout,
  normalizeHomepageMode,
  normalizeThemeMode,
  publicSettings
} from './server/settingsUtils';
import { clearExportedSystemLogs, getSystemLogsForExport, serializeSystemLogs } from './server/systemLogs';
import type { AppConfig, ProgramSettingsFile, SystemLogEntry } from './server/types';

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PANEL_PORT || 3000);
const HOST = process.env.PANEL_HOST || '127.0.0.1';
const PANEL_DIR = process.env.SMART40_PANEL_DIR || process.cwd();
const PROJECT_ROOT = findProjectRoot(PANEL_DIR);
const APPS_FILE = path.join(PANEL_DIR, 'apps.json');
const SETTINGS_FILE = path.join(PANEL_DIR, 'settings.json');
const PATCH_NOTES_FILE = path.join(PANEL_DIR, 'patch-notes.json');
const PATCH_SUMMARY_FILE = path.join(PANEL_DIR, 'PROJECT_PATCH_SUMMARY.md');
const PACKAGE_FILE = path.join(PANEL_DIR, 'package.json');
const HOMEPAGE_TEMPLATE_FILE = path.join(PANEL_DIR, 'homepage.html');

const runningProcesses = new Map<string, ChildProcess[]>();

// Log history and active clients
const logHistory = new Map<string, { timestamp: string; type: string; message: string }[]>();
const systemLogHistory: SystemLogEntry[] = [];
const logClients = new Set<express.Response>();

async function getApps(): Promise<AppConfig[]> {
  try {
    const data = await fs.readFile(APPS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      const defaultApps = getDefaultApps();
      await saveApps(defaultApps);
      return defaultApps;
    }
    return [];
  }
}

async function saveApps(apps: any[]) {
  await fs.writeFile(APPS_FILE, JSON.stringify(apps, null, 2), 'utf-8');
}

async function getSettings(): Promise<ProgramSettingsFile> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...getDefaultSettings(), ...JSON.parse(data) };
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      const defaultSettings = getDefaultSettings();
      await saveSettings(defaultSettings);
      return defaultSettings;
    }
    return getDefaultSettings();
  }
}

async function saveSettings(settings: ProgramSettingsFile) {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

function resolveCwd(cwd?: string) {
  if (!cwd) return PANEL_DIR;
  if (path.isAbsolute(cwd)) return cwd;

  const panelRelative = path.resolve(PANEL_DIR, cwd);
  if (fsExists(panelRelative)) return panelRelative;

  const projectRelative = cwd.replace(/^(\.\.[\\/])+/, '');
  return path.resolve(PROJECT_ROOT, projectRelative);
}

function findProjectRoot(start: string) {
  let current = path.resolve(start);
  while (true) {
    if (
      fsExists(path.join(current, 'backend')) &&
      fsExists(path.join(current, 'erp')) &&
      fsExists(path.join(current, 'loja'))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) return path.resolve(PANEL_DIR, '..');
    current = parent;
  }
}

function fsExists(target: string) {
  try {
    return require('fs').existsSync(target);
  } catch {
    return false;
  }
}

function splitArgs(args?: string) {
  if (!args) return [];
  const matches = args.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return matches.map(arg => arg.replace(/^"|"$/g, ''));
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function readCustomHomepage(): Promise<string | null> {
  try {
    const html = await fs.readFile(HOMEPAGE_TEMPLATE_FILE, 'utf-8');
    return html.trim() ? html : null;
  } catch {
    return null;
  }
}

function instanceWebLink(config: AppConfig, activePort?: string) {
  const link = String(config.webLink || '').trim();
  if (link) return link;
  const port = String(activePort || config.port || '').trim();
  return port ? `http://127.0.0.1:${port}` : '';
}

function homepageTheme(settings: ProgramSettingsFile) {
  const accent = normalizeAccentColor(settings.accentColor);
  if (normalizeThemeMode(settings.themeMode) === 'dark') {
    return {
      accent,
      scheme: 'dark',
      bg: '#0f172a',
      surface: '#1e293b',
      surfaceAlt: '#172033',
      text: '#f1f5f9',
      muted: '#94a3b8',
      border: '#334155',
    };
  }
  return {
    accent,
    scheme: 'light',
    bg: '#edf0f2',
    surface: '#ffffff',
    surfaceAlt: '#f8fafc',
    text: '#111827',
    muted: '#64748b',
    border: '#d4dde5',
  };
}

async function renderInternalHomepage(settings: ProgramSettingsFile) {
  const apps = (await getApps()).filter(config => config.enabled !== false);
  const states = await Promise.all(apps.map(async config => {
    const activePort = await getFirstOpenPort(config);
    const running = getRunningAppProcesses(config.id).length > 0 || Boolean(activePort);
    return { config, running, href: instanceWebLink(config, activePort) };
  }));

  const layout = normalizeDashboardLayout(settings.dashboardLayout);
  const theme = homepageTheme(settings);
  const runningCount = states.filter(state => state.running).length;

  const renderItem = (state: typeof states[number]) => {
    const { config, running, href } = state;
    const meta = `${escapeHtml(config.command)} ${escapeHtml(config.args || '')}`.trim();
    const badge = `<span class="badge ${running ? 'is-running' : 'is-stopped'}"><span class="dot"></span>${running ? 'Running' : 'Stopped'}</span>`;
    const action = href
      ? `<a class="open" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Open</a>`
      : '<span class="muted">No web link</span>';
    return `
          <article class="service">
            <div class="service-main">
              <h3>${escapeHtml(config.name)}</h3>
              <p class="cmd">${meta || '&mdash;'}</p>
            </div>
            <div class="service-side">${badge}${action}</div>
          </article>`;
  };

  const items = states.length > 0
    ? states.map(renderItem).join('')
    : '<p class="empty">No enabled instances are configured yet. Add instances from the control panel.</p>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="20" />
    <title>Applications Dashboard HomePage</title>
    <style>
      :root {
        color-scheme: ${theme.scheme};
        --accent: ${theme.accent};
        --bg: ${theme.bg};
        --surface: ${theme.surface};
        --surface-alt: ${theme.surfaceAlt};
        --text: ${theme.text};
        --muted: ${theme.muted};
        --border: ${theme.border};
        font-family: Inter, Segoe UI, Arial, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--text); }
      header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 26px 40px; background: var(--surface); border-bottom: 1px solid var(--border); }
      h1 { margin: 0; font-size: 24px; }
      .subtitle { margin: 6px 0 0; color: var(--muted); font-size: 14px; }
      .panel-link { color: #fff; background: var(--accent); text-decoration: none; border-radius: 6px; padding: 10px 16px; font-weight: 700; font-size: 14px; white-space: nowrap; }
      main { max-width: 1080px; margin: 0 auto; padding: 32px 24px 48px; }
      .intro { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 22px 24px; margin-bottom: 26px; }
      .intro h2 { margin: 0 0 10px; font-size: 18px; }
      .intro ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 14px; line-height: 1.7; }
      .intro b { color: var(--text); }
      .section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
      .section-head h2 { margin: 0; font-size: 16px; }
      .count { color: var(--muted); font-size: 13px; font-weight: 600; }
      .grid { display: grid; gap: 14px; }
      .grid.cards { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
      .grid.list { grid-template-columns: 1fr; }
      .service { display: flex; gap: 18px; align-items: center; justify-content: space-between; padding: 18px 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
      .grid.cards .service { flex-direction: column; align-items: stretch; }
      .service h3 { margin: 0; font-size: 17px; }
      .cmd { margin: 6px 0 0; color: var(--muted); font-family: Consolas, monospace; font-size: 12px; word-break: break-word; }
      .service-side { display: flex; align-items: center; gap: 14px; }
      .grid.cards .service-side { justify-content: space-between; }
      .badge { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--muted); }
      .badge .dot { width: 9px; height: 9px; border-radius: 50%; background: #9aa6b2; }
      .badge.is-running { color: #2f9e44; } .badge.is-running .dot { background: #62b43d; }
      .badge.is-stopped .dot { background: #9aa6b2; }
      .open { color: #fff; background: var(--accent); text-decoration: none; border-radius: 6px; padding: 8px 16px; font-weight: 700; font-size: 13px; }
      .muted { color: var(--muted); font-size: 13px; font-weight: 600; }
      .empty { color: var(--muted); font-size: 14px; font-weight: 600; }
      footer { max-width: 1080px; margin: 0 auto; padding: 0 24px 40px; color: var(--muted); font-size: 12px; }
      @media (max-width: 680px) {
        header { flex-direction: column; align-items: flex-start; }
        .panel-link { width: 100%; text-align: center; }
        .service { flex-direction: column; align-items: stretch; }
      }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>Applications Dashboard HomePage</h1>
        <p class="subtitle">Internal web page served by the local dashboard server &mdash; no external Apache required.</p>
      </div>
      <a class="panel-link" href="/">Open control panel</a>
    </header>
    <main>
      <section class="intro">
        <h2>How this dashboard works</h2>
        <ul>
          <li>Each <b>instance</b> is a local service the panel can start, stop, and monitor for you.</li>
          <li>The <b>control panel</b> manages instances, logs, AI Chat, and settings &mdash; open it from the button above.</li>
          <li>This HomePage is served by the panel itself; you can replace it with your own template or point to a custom URL in <b>Settings &gt; General</b>.</li>
          <li>Use the <b>Open</b> action on a running instance to jump straight to its web address.</li>
        </ul>
      </section>
      <div class="section-head">
        <h2>Configured instances</h2>
        <span class="count">${runningCount} running / ${states.length} total</span>
      </div>
      <section class="grid ${layout === 'list' ? 'list' : 'cards'}">${items}</section>
    </main>
    <footer>This page refreshes automatically every 20 seconds.</footer>
  </body>
</html>`;
}

function runCommand(command: string, args: string[], cwd: string, appId: string, timeoutMs = 120000) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn([command, ...args].join(' ').trim(), {
      cwd,
      shell: true,
      env: { ...process.env },
    });

    const timer = setTimeout(() => {
      stopProcessTreeByPid(proc.pid).finally(() => reject(new Error(`Timeout while running ${command} ${args.join(' ')}`)));
    }, timeoutMs);

    proc.stdout.on('data', data => broadcastLog(appId, data.toString(), 'info'));
    proc.stderr.on('data', data => broadcastLog(appId, data.toString(), 'error'));
    proc.on('error', reject);
    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

function stopProcessTree(proc: ChildProcess) {
  return stopProcessTreeByPid(proc.pid);
}

function stopProcessTreeByPid(pid?: number) {
  if (!pid) return Promise.resolve();

  if (process.platform === 'win32') {
    return new Promise<void>((resolve) => {
      try {
        execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => {
          try {
            process.kill(pid, 'SIGTERM');
          } catch {
            // Already stopped or owned by another process.
          }
          resolve();
        });
      } catch {
        try {
          process.kill(pid, 'SIGTERM');
        } catch {
          // Already stopped or owned by another process.
        }
        resolve();
      }
    });
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // Already stopped.
  }
  return Promise.resolve();
}

function findPidsByPort(port?: string) {
  const parsedPort = Number(port);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || process.platform !== 'win32') {
    return Promise.resolve<number[]>([]);
  }

  return new Promise<number[]>((resolve) => {
    try {
      execFile('netstat', ['-ano'], (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }

        const pids = new Set<number>();
        for (const line of stdout.split(/\r?\n/)) {
          if (!line.includes('LISTENING')) continue;
          const parts = line.trim().split(/\s+/);
          const localAddress = parts[1] || '';
          const pid = Number(parts[parts.length - 1]);
          if (localAddress.endsWith(`:${parsedPort}`) && Number.isInteger(pid) && pid > 0) {
            pids.add(pid);
          }
        }
        resolve([...pids]);
      });
    } catch {
      resolve([]);
    }
  });
}

async function stopPidsByPort(port?: string, appId?: string) {
  const pids = await findPidsByPort(port);
  for (const pid of pids) {
    if (appId) broadcastLog(appId, `--- Stopping PID ${pid} on port ${port} ---`, 'system');
    await stopProcessTreeByPid(pid);
  }
  return pids.length;
}

function isPortOpen(port?: string) {
  const parsedPort = Number(port);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(500);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(parsedPort, '127.0.0.1');
  });
}

async function waitForPort(port?: string, timeoutMs = 20000) {
  if (!port) return true;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(port)) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

function getConfiguredPorts(appConfig?: Pick<AppConfig, 'port' | 'alternatePorts'>) {
  if (!appConfig) return [];
  return [appConfig.port, ...(appConfig.alternatePorts || [])]
    .map(port => String(port || '').trim())
    .filter(Boolean);
}

async function getFirstOpenPort(appConfig?: Pick<AppConfig, 'port' | 'alternatePorts'>) {
  for (const port of getConfiguredPorts(appConfig)) {
    if (await isPortOpen(port)) return port;
  }
  return undefined;
}

async function getRuntimePort(appConfig: AppConfig) {
  const primaryPort = String(appConfig.port || '').trim();
  if (!primaryPort || !(await isPortOpen(primaryPort))) return primaryPort;

  for (const port of appConfig.alternatePorts || []) {
    const candidate = String(port || '').trim();
    if (candidate && !(await isPortOpen(candidate))) return candidate;
  }

  return undefined;
}

async function waitForAnyConfiguredPort(appConfig: AppConfig, timeoutMs = 20000) {
  const ports = getConfiguredPorts(appConfig);
  if (ports.length === 0) return true;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await getFirstOpenPort(appConfig)) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

function getRunningAppProcesses(id: string) {
  return (runningProcesses.get(id) || []).filter(proc => !proc.killed);
}

function removeRunningProcess(id: string, proc: ChildProcess) {
  const remaining = getRunningAppProcesses(id).filter(item => item !== proc);
  if (remaining.length > 0) runningProcesses.set(id, remaining);
  else runningProcesses.delete(id);
}

function trackRunningProcess(id: string, proc: ChildProcess) {
  const current = runningProcesses.get(id) || [];
  runningProcesses.set(id, [...current, proc]);
}

function spawnTrackedProcess(options: {
  id: string;
  command: string;
  args?: string;
  cwd: string;
  shell: boolean;
  env: NodeJS.ProcessEnv;
  label: string;
}) {
  const argsArray = splitArgs(options.args);
  const fullCmd = `${options.command} ${options.args || ''}`.trim();
  const proc = options.shell
    ? spawn(fullCmd, {
        cwd: options.cwd,
        shell: true,
        env: options.env
      })
    : spawn(options.command, argsArray, {
        cwd: options.cwd,
        shell: false,
        env: options.env
      });

  trackRunningProcess(options.id, proc);
  broadcastLog(options.id, `--- Starting ${options.label}: ${fullCmd} (PID: ${proc.pid}) ---`, 'system');

  proc.stdout.on('data', (data) => {
    broadcastLog(options.id, data.toString(), 'info');
  });

  proc.stderr.on('data', (data) => {
    broadcastLog(options.id, data.toString(), 'error');
  });

  proc.on('close', (code) => {
    removeRunningProcess(options.id, proc);
    broadcastLog(options.id, `--- ${options.label} process exited with code ${code} ---`, 'system');
  });

  proc.on('error', (err) => {
    broadcastLog(options.id, `Failed to start ${options.label} process: ${err.message}`, 'error');
    removeRunningProcess(options.id, proc);
  });

  return proc;
}

async function stopConfiguredApp(id: string, appConfig?: AppConfig) {
  const processes = getRunningAppProcesses(id);
  if (processes.length > 0) {
    broadcastLog(id, '--- Stop requested for process ---', 'system');
    await Promise.all(processes.map(proc => stopProcessTree(proc)));
    runningProcesses.delete(id);
    return { stopped: true, stoppedByPort: 0 };
  }

  let stoppedByPort = 0;
  for (const port of getConfiguredPorts(appConfig)) {
    stoppedByPort += await stopPidsByPort(port, id);
  }

  return { stopped: stoppedByPort > 0, stoppedByPort };
}

async function ensureDatabasePrepared(appId = 'smart40-database') {
  const backendDir = path.join(PROJECT_ROOT, 'backend');
  if (!fsExists(backendDir)) {
    broadcastLog(appId, `Backend not found at ${backendDir}`, 'error');
    return;
  }

  broadcastLog(appId, '--- Preparing MES database schema ---', 'system');
  await runCommand('npm', ['run', 'db:migrate'], backendDir, appId, 180000);
  broadcastLog(appId, '--- Inserting/updating MES default data ---', 'system');
  await runCommand('npm', ['run', 'seed:test-data'], backendDir, appId, 180000);
  broadcastLog(appId, '--- MES database ready for Backend, ERP, and Store ---', 'system');
}

async function startConfiguredApp(id: string, apps: any[], visited = new Set<string>()) {
  if (visited.has(id)) {
    throw new Error(`Circular dependency detected at ${id}`);
  }
  visited.add(id);

  const appConfig = apps.find(a => a.id === id);
  if (!appConfig) throw new Error(`App not found: ${id}`);
  if (appConfig.enabled === false) throw new Error(`App disabled: ${id}`);

  for (const dependencyId of appConfig.dependsOn || []) {
    broadcastLog(id, `--- Ensuring dependency: ${dependencyId} ---`, 'system');
    await startConfiguredApp(dependencyId, apps, visited);
  }

  const currentProcesses = getRunningAppProcesses(id);
  if (currentProcesses.length > 0) {
    if (id === 'smart40-database') {
      await ensureDatabasePrepared(id);
    }
    return { success: true, pid: currentProcesses[0]?.pid, alreadyRunning: true };
  }

  const runtimePort = await getRuntimePort(appConfig);
  if (!runtimePort && getConfiguredPorts(appConfig).length > 0) {
    const openPort = await getFirstOpenPort(appConfig);
    broadcastLog(id, `--- Port ${openPort || appConfig.port} is already active. Start skipped to avoid duplication. ---`, 'system');
    if (id === 'smart40-database') {
      await ensureDatabasePrepared(id);
    }
    return { success: true, external: true };
  }

  const cwd = resolveCwd(appConfig.cwd);
  const env = {
    ...process.env,
    PORT: runtimePort || appConfig.port || process.env.PORT,
    ALTERNATE_PORTS: (appConfig.alternatePorts || []).join(',')
  };

  if (runtimePort && runtimePort !== appConfig.port) {
    broadcastLog(id, `--- Primary port unavailable. Trying alternative port ${runtimePort}. ---`, 'system');
  }

  const proc = spawnTrackedProcess({
    id,
    command: appConfig.command,
    args: appConfig.args,
    cwd,
    shell: appConfig.shell !== false,
    env,
    label: 'main'
  });

  if (appConfig.advancedEnabled && appConfig.advancedCommand) {
    spawnTrackedProcess({
      id,
      command: appConfig.advancedCommand,
      args: appConfig.advancedArgs,
      cwd: resolveCwd(appConfig.secondaryCwd || appConfig.cwd),
      shell: appConfig.advancedShell !== false,
      env,
      label: 'advanced'
    });
  }

  if (getConfiguredPorts(appConfig).length > 0) {
    await waitForAnyConfiguredPort(appConfig, 25000);
  }

  if (id === 'smart40-database') {
    await ensureDatabasePrepared(id);
  }

  return { success: true, pid: proc.pid };
}

function broadcastLog(appId: string, message: string, type: 'info' | 'error' | 'system' = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = { appId, timestamp, message, type };
  
  if (!logHistory.has(appId)) {
    logHistory.set(appId, []);
  }
  const history = logHistory.get(appId)!;
  history.push({ timestamp, type, message });
  if (history.length > 1000) history.shift(); // Keep last 1000 lines

  if (type === 'system' || type === 'error') {
    pushSystemLog(message.replace(/\n$/, ''), type, appId);
  }

  const data = JSON.stringify(logEntry);
  logClients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

function pushSystemLog(message: string, type: 'info' | 'error' | 'system' = 'info', source = 'system') {
  systemLogHistory.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    source,
    message,
  });
  if (systemLogHistory.length > 2000) systemLogHistory.shift();
}

function clampChatMessages(messages: any[]) {
  return (Array.isArray(messages) ? messages : [])
    .filter(message => message && (message.role === 'user' || message.role === 'assistant'))
    .slice(-8)
    .map(message => ({
      role: message.role,
      content: String(message.content || '').slice(0, 2000),
    }));
}

async function callOpenAICompatible(settings: ProgramSettingsFile, messages: { role: string; content: string }[]) {
  const baseUrl = settings.aiProvider === 'openai-compatible'
    ? settings.aiBaseUrl.replace(/\/$/, '')
    : 'https://api.openai.com/v1';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.aiApiKey}`,
    },
    body: JSON.stringify({
      model: settings.aiModel || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a concise assistant inside a local control panel. Keep answers short and practical.' },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 450,
    }),
  });

  if (!response.ok) throw new Error(`AI request failed with status ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(settings: ProgramSettingsFile, messages: { role: string; content: string }[]) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.aiApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: settings.aiModel || 'claude-3-5-haiku-latest',
      max_tokens: 450,
      system: 'You are a concise assistant inside a local control panel. Keep answers short and practical.',
      messages,
    }),
  });

  if (!response.ok) throw new Error(`AI request failed with status ${response.status}`);
  const data = await response.json();
  return data.content?.map((item: any) => item.text || '').join('\n') || '';
}

async function callGemini(settings: ProgramSettingsFile, messages: { role: string; content: string }[]) {
  const model = settings.aiModel || 'gemini-1.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.aiApiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: messages.map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 450,
      },
      systemInstruction: {
        parts: [{ text: 'You are a concise assistant inside a local control panel. Keep answers short and practical.' }],
      },
    }),
  });

  if (!response.ok) throw new Error(`AI request failed with status ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('\n') || '';
}

// API Routes
app.get('/api/settings', async (req, res) => {
  res.json(publicSettings(await getSettings()));
});

app.put('/api/settings', async (req, res) => {
  const current = await getSettings();
  const next: ProgramSettingsFile = {
    homepageMode: normalizeHomepageMode(req.body.homepageMode || current.homepageMode),
    homepageUrl: String(req.body.homepageUrl || current.homepageUrl || 'http://localhost').trim(),
    aiProvider: ['openai', 'gemini', 'anthropic', 'openai-compatible'].includes(req.body.aiProvider)
      ? req.body.aiProvider
      : current.aiProvider,
    aiModel: String(req.body.aiModel || current.aiModel || '').trim(),
    aiBaseUrl: String(req.body.aiBaseUrl || '').trim(),
    aiApiKey: typeof req.body.aiApiKey === 'string' && req.body.aiApiKey.trim()
      ? req.body.aiApiKey.trim()
      : current.aiApiKey,
    themeMode: normalizeThemeMode(req.body.themeMode || current.themeMode),
    accentColor: normalizeAccentColor(req.body.accentColor, current.accentColor),
    dashboardLayout: normalizeDashboardLayout(req.body.dashboardLayout || current.dashboardLayout),
  };

  await saveSettings(next);
  pushSystemLog('Program settings updated', 'info', 'settings');
  res.json(publicSettings(next));
});

app.get('/internal-homepage', async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const custom = await readCustomHomepage();
  if (custom) {
    res.send(custom);
    return;
  }
  const settings = await getSettings();
  res.send(await renderInternalHomepage(settings));
});

app.get('/api/homepage-template', async (req, res) => {
  const custom = await readCustomHomepage();
  res.json({ custom: Boolean(custom) });
});

app.post('/api/homepage-template', async (req, res) => {
  const html = typeof req.body?.html === 'string' ? req.body.html : '';
  if (!html.trim()) {
    res.status(400).json({ error: 'A non-empty HTML document is required.' });
    return;
  }
  await fs.writeFile(HOMEPAGE_TEMPLATE_FILE, html, 'utf-8');
  pushSystemLog('Custom HomePage template uploaded', 'info', 'settings');
  res.json({ custom: true });
});

app.delete('/api/homepage-template', async (req, res) => {
  try {
    await fs.unlink(HOMEPAGE_TEMPLATE_FILE);
    pushSystemLog('Custom HomePage template reset to default', 'info', 'settings');
  } catch (error) {
    if ((error as any).code !== 'ENOENT') throw error;
  }
  res.json({ custom: false });
});

app.post('/api/ai-chat', async (req, res) => {
  const settings = await getSettings();
  const messages = clampChatMessages(req.body.messages);

  if (!settings.aiApiKey) {
    res.status(400).json({ error: 'AI API key is not configured.' });
    return;
  }

  if (settings.aiProvider === 'openai-compatible' && !settings.aiBaseUrl) {
    res.status(400).json({ error: 'Custom base URL is required for OpenAI-compatible providers.' });
    return;
  }

  if (messages.length === 0) {
    res.status(400).json({ error: 'No chat messages provided.' });
    return;
  }

  try {
    let reply = '';
    if (settings.aiProvider === 'gemini') reply = await callGemini(settings, messages);
    else if (settings.aiProvider === 'anthropic') reply = await callAnthropic(settings, messages);
    else reply = await callOpenAICompatible(settings, messages);

    res.json({ reply: reply || 'No response returned.' });
  } catch (error) {
    const message = (error as Error).message;
    pushSystemLog(`AI chat error: ${message}`, 'error', 'ai-chat');
    res.status(500).json({ error: message });
  }
});

app.get('/api/patch-notes', async (req, res) => {
  res.json(await getPatchNotesPayload({
    panelDir: PANEL_DIR,
    packageFile: PACKAGE_FILE,
    patchNotesFile: PATCH_NOTES_FILE,
    patchSummaryFile: PATCH_SUMMARY_FILE,
  }));
});

app.get('/api/apps', async (req, res) => {
  const apps = (await getApps()).filter(config => config.enabled !== false);
  const state = await Promise.all(apps.map(async config => {
    const processes = getRunningAppProcesses(config.id);
    const activePort = await getFirstOpenPort(config);
    return {
      config,
      status: processes.length > 0 || activePort ? 'running' : 'stopped',
      pid: processes[0]?.pid,
      activePort
    };
  }));
  res.json(state);
});

app.get('/api/apps/all', async (req, res) => {
  const apps = await getApps();
  const state = await Promise.all(apps.map(async config => {
    const processes = getRunningAppProcesses(config.id);
    const activePort = await getFirstOpenPort(config);
    return {
      config,
      status: processes.length > 0 || activePort ? 'running' : 'stopped',
      pid: processes[0]?.pid,
      activePort
    };
  }));
  res.json(state);
});

app.get('/api/apps/export', async (req, res) => {
  const packageInfo = await readJsonFile(PACKAGE_FILE, { version: '0.0.0' });
  const apps = await getApps();
  const exportedAt = new Date().toISOString();
  const date = exportedAt.slice(0, 10);

  pushSystemLog(`Instance backup exported: ${apps.length} instances`, 'info', 'settings');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="instances-backup-${date}.json"`);
  res.json({
    schema: 'applications-dashboard.instances.v1',
    version: (packageInfo as any).version || '0.0.0',
    exportedAt,
    apps,
  });
});

app.post('/api/apps/import', async (req, res) => {
  try {
    const incomingApps = getImportAppsFromPayload(req.body);
    const replace = req.body?.replace === true;
    const existingApps = await getApps();
    const usedIds = new Set((replace ? [] : existingApps).map(app => app.id));
    const importedApps = incomingApps.map((item, index) => normalizeImportedApp(item, index, usedIds));

    if (replace) {
      await Promise.all(existingApps.map(appConfig => stopConfiguredApp(appConfig.id, appConfig)));
    }

    const nextApps = replace ? importedApps : [...existingApps, ...importedApps];
    await saveApps(nextApps);
    pushSystemLog(`Instance import completed: ${importedApps.length} instances ${replace ? 'replaced current configuration' : 'added to current configuration'}`, 'system', 'settings');
    res.json({ imported: importedApps.length, total: nextApps.length, replaced: replace });
  } catch (error) {
    const message = (error as Error).message;
    pushSystemLog(`Instance import failed: ${message}`, 'error', 'settings');
    res.status(400).json({ error: message });
  }
});

app.post('/api/apps', async (req, res) => {
  const advancedEnabled = Boolean(req.body.advancedEnabled);
  const newApp = {
    id: crypto.randomUUID(),
    ...req.body,
    enabled: req.body.enabled !== false,
    advancedEnabled,
    alternatePorts: advancedEnabled ? (req.body.alternatePorts || []) : [],
    secondaryCwd: advancedEnabled ? (req.body.secondaryCwd || '') : '',
    advancedCommand: advancedEnabled ? (req.body.advancedCommand || '') : '',
    advancedArgs: advancedEnabled ? (req.body.advancedArgs || '') : '',
    advancedShell: advancedEnabled ? req.body.advancedShell !== false : true,
  };
  const apps = await getApps();
  apps.push(newApp);
  await saveApps(apps);
  pushSystemLog(`Instance created: ${newApp.name}`, 'info', newApp.id);
  res.json(newApp);
});

app.put('/api/apps/:id', async (req, res) => {
  const id = req.params.id;
  const apps = await getApps();
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'App not found' });
    return;
  }

  const current = apps[index];
  const updated = {
    ...current,
    name: req.body.name,
    command: req.body.command,
    args: req.body.args,
    port: req.body.port,
    cwd: req.body.cwd,
    webLink: String(req.body.webLink || '').trim(),
    dependsOn: req.body.dependsOn || [],
    shell: req.body.shell,
    id,
  };

  apps[index] = updated;
  await saveApps(apps);
  pushSystemLog(`Instance updated: ${updated.name}`, 'info', id);
  broadcastLog(id, '--- Instance configuration updated. Restart the service to apply command, port, or directory changes. ---', 'system');
  res.json(updated);
});

app.put('/api/apps/:id/enabled', async (req, res) => {
  const id = req.params.id;
  const apps = await getApps();
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'App not found' });
    return;
  }

  const enabled = Boolean(req.body.enabled);
  const updated = { ...apps[index], enabled };
  apps[index] = updated;
  await saveApps(apps);

  if (!enabled) {
    await stopConfiguredApp(id, updated);
  }

  pushSystemLog(`Instance ${enabled ? 'enabled' : 'disabled'}: ${updated.name}`, 'system', id);
  res.json(updated);
});

app.delete('/api/apps/:id', async (req, res) => {
  const id = req.params.id;
  let apps = await getApps();
  const deletedApp = apps.find(a => a.id === id);
  await stopConfiguredApp(id, deletedApp);
  apps = apps.filter(a => a.id !== id);
  await saveApps(apps);
  pushSystemLog(`Instance removed: ${deletedApp?.name || id}`, 'system', id);
  res.json({ success: true });
});

app.post('/api/apps/:id/start', async (req, res) => {
  const id = req.params.id;
  const apps = await getApps();

  try {
    const result = await startConfiguredApp(id, apps);
    const appConfig = apps.find(a => a.id === id);
    pushSystemLog(`Start requested: ${appConfig?.name || id}`, 'system', id);
    res.json(result);
  } catch (error) {
    const message = (error as Error).message;
    const status = message.startsWith('App not found') ? 404 : 500;
    pushSystemLog(`Failed to start ${id}: ${message}`, 'error', id);
    res.status(status).json({ error: message });
  }
});

app.post('/api/apps/:id/stop', async (req, res) => {
  const id = req.params.id;
  const apps = await getApps();
  const appConfig = apps.find(a => a.id === id);
  const result = await stopConfiguredApp(id, appConfig);
  if (result.stopped) {
    pushSystemLog(`Stop requested: ${appConfig?.name || id}`, 'system', id);
    res.json({ success: true, stoppedByPort: result.stoppedByPort });
    return;
  }

  res.status(400).json({ error: 'Not running' });
});

app.get('/api/system-logs', (req, res) => {
  res.json(systemLogHistory.slice().reverse());
});

app.get('/api/system-logs/export', (req, res) => {
  const format = String(req.query.format || 'csv').toLowerCase();
  const logs = getSystemLogsForExport(systemLogHistory, req.query);
  const output = serializeSystemLogs(logs, format);

  if (req.query.clear === 'true') {
    clearExportedSystemLogs(systemLogHistory, logs);
  }

  res.setHeader('Content-Type', output.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="system-logs.${output.extension}"`);
  res.send(output.body);
});

app.get('/api/system-logs.csv', (req, res) => {
  const output = serializeSystemLogs(systemLogHistory, 'csv');
  res.setHeader('Content-Type', output.contentType);
  res.setHeader('Content-Disposition', 'attachment; filename="system-logs.csv"');
  res.send(output.body);
});

app.get('/api/apps/:id/logs', (req, res) => {
    const id = req.params.id;
    res.json(logHistory.get(id) || []);
});

// SSE endpoint
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  logClients.add(res);

  req.on('close', () => {
    logClients.delete(res);
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(PANEL_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
