import express from 'express';
import 'dotenv/config';
import { spawn, ChildProcess, execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import net from 'net';

const app = express();
app.use(express.json());

const PORT = Number(process.env.PANEL_PORT || 3000);
const HOST = process.env.PANEL_HOST || '127.0.0.1';
const PANEL_DIR = process.env.SMART40_PANEL_DIR || process.cwd();
const PROJECT_ROOT = findProjectRoot(PANEL_DIR);
const APPS_FILE = path.join(PANEL_DIR, 'apps.json');
const SETTINGS_FILE = path.join(PANEL_DIR, 'settings.json');
const PATCH_NOTES_FILE = path.join(PANEL_DIR, 'patch-notes.json');
const PACKAGE_FILE = path.join(PANEL_DIR, 'package.json');
interface AppConfig {
  id: string;
  name: string;
  command: string;
  args: string;
  port: string;
  cwd: string;
  dependsOn?: string[];
  shell?: boolean;
  enabled?: boolean;
  advancedEnabled?: boolean;
  alternatePorts?: string[];
  secondaryCwd?: string;
  advancedCommand?: string;
  advancedArgs?: string;
  advancedShell?: boolean;
}

interface ProgramSettingsFile {
  homepageUrl: string;
  aiProvider: 'openai' | 'gemini' | 'anthropic' | 'openai-compatible';
  aiModel: string;
  aiBaseUrl: string;
  aiApiKey: string;
}

const runningProcesses = new Map<string, ChildProcess[]>();

// Log history and active clients
const logHistory = new Map<string, { timestamp: string; type: string; message: string }[]>();
const systemLogHistory: { id: string; timestamp: string; type: 'info' | 'error' | 'system'; source: string; message: string }[] = [];
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

function getDefaultSettings(): ProgramSettingsFile {
  return {
    homepageUrl: 'http://localhost',
    aiProvider: 'openai',
    aiModel: 'gpt-4o-mini',
    aiBaseUrl: '',
    aiApiKey: '',
  };
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

function publicSettings(settings: ProgramSettingsFile) {
  return {
    homepageUrl: settings.homepageUrl,
    aiProvider: settings.aiProvider,
    aiModel: settings.aiModel,
    aiBaseUrl: settings.aiBaseUrl,
    aiApiKeySet: Boolean(settings.aiApiKey),
  };
}

function getDefaultApps() {
  return [
    {
      id: "smart40-database",
      name: "Banco de Dados Local",
      command: "mariadbd.exe",
      args: "--datadir=..\\..\\..\\data --port=3307 --bind-address=127.0.0.1 --console",
      port: "3307",
      cwd: "../database/mariadb/mariadb-11.4.5-winx64/bin",
      shell: false,
      enabled: true,
    },
    {
      id: "smart40-backend",
      name: "Backend API",
      command: "node",
      args: "-r dotenv/config -r ts-node/register -r tsconfig-paths/register src/index.ts",
      port: "5448",
      cwd: "../backend",
      dependsOn: ["smart40-database"],
      shell: false,
      enabled: true,
    },
    {
      id: "smart40-erp",
      name: "ERP",
      command: "node",
      args: "node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173",
      port: "5173",
      cwd: "../erp",
      dependsOn: ["smart40-backend"],
      shell: false,
      enabled: true,
    },
    {
      id: "smart40-loja",
      name: "Loja Virtual",
      command: "node",
      args: "node_modules/vite/bin/vite.js --host 127.0.0.1 --port 8000",
      port: "8000",
      cwd: "../loja",
      dependsOn: ["smart40-backend"],
      shell: false,
      enabled: true,
    },
    {
      id: "smart40-nodered",
      name: "Node-RED",
      command: "cmd.exe",
      args: "/c iniciar-node-red.bat",
      port: "1880",
      cwd: "../NodeRed",
      dependsOn: ["smart40-backend"],
      shell: false,
      enabled: true,
    },
  ];
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

function csvEscape(value: string) {
  return `"${String(value || '').replace(/"/g, '""')}"`;
}

function getSystemLogsForExport(query: express.Request['query']) {
  const source = String(query.source || 'all');
  const limit = Number(query.limit);
  let logs = systemLogHistory.filter(log => source === 'all' || log.source === source);

  if (Number.isInteger(limit) && limit > 0) {
    logs = logs.slice(-limit);
  }

  return logs;
}

function serializeSystemLogs(logs: typeof systemLogHistory, format: string) {
  const normalizedFormat = ['csv', 'txt', 'json', 'ndjson', 'log'].includes(format) ? format : 'csv';

  if (normalizedFormat === 'json') {
    return {
      body: JSON.stringify(logs, null, 2),
      contentType: 'application/json; charset=utf-8',
      extension: 'json',
    };
  }

  if (normalizedFormat === 'ndjson') {
    return {
      body: logs.map(log => JSON.stringify(log)).join('\n'),
      contentType: 'application/x-ndjson; charset=utf-8',
      extension: 'ndjson',
    };
  }

  if (normalizedFormat === 'txt') {
    return {
      body: logs.map(log => `${log.timestamp}\t${log.type}\t${log.source}\t${log.message}`).join('\n'),
      contentType: 'text/plain; charset=utf-8',
      extension: 'txt',
    };
  }

  if (normalizedFormat === 'log') {
    return {
      body: logs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] [${log.source}] ${log.message}`).join('\n'),
      contentType: 'text/plain; charset=utf-8',
      extension: 'log',
    };
  }

  const rows = [
    ['timestamp', 'type', 'source', 'message'],
    ...logs.map(log => [log.timestamp, log.type, log.source, log.message])
  ];

  return {
    body: rows.map(row => row.map(csvEscape).join(',')).join('\n'),
    contentType: 'text/csv; charset=utf-8',
    extension: 'csv',
  };
}

function clearExportedSystemLogs(logs: typeof systemLogHistory) {
  const exportedIds = new Set(logs.map(log => log.id));
  for (let index = systemLogHistory.length - 1; index >= 0; index -= 1) {
    if (exportedIds.has(systemLogHistory[index].id)) {
      systemLogHistory.splice(index, 1);
    }
  }
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

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function readRecentGitCommitsFallback() {
  try {
    const headLog = await fs.readFile(path.join(PANEL_DIR, '.git', 'logs', 'HEAD'), 'utf-8');
    return headLog
      .split(/\r?\n/)
      .filter(Boolean)
      .reverse()
      .slice(0, 12)
      .map(line => {
        const match = line.match(/^([0-9a-f]{40}) ([0-9a-f]{40}) .*? (\d{10}) [+-]\d{4}\t(?:commit(?: \(.*\))?: )?(.*)$/i);
        if (!match) return undefined;

        const [, , fullHash, timestamp, subject] = match;
        return {
          hash: fullHash.slice(0, 7),
          date: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10),
          subject: subject || fullHash.slice(0, 7),
          body: subject || '',
        };
      })
      .filter((commit): commit is { hash: string; date: string; subject: string; body: string } => Boolean(commit));
  } catch {
    return [];
  }
}

function getRecentGitCommits() {
  return new Promise<{ hash: string; date: string; subject: string; body: string }[]>((resolve) => {
    const resolveFallback = async () => {
      resolve(await readRecentGitCommitsFallback());
    };

    try {
      execFile('git', ['log', '--max-count=12', '--pretty=format:%h%x1f%ad%x1f%s%x1f%b%x1e', '--date=short'], { cwd: PANEL_DIR }, (error, stdout) => {
        if (error) {
          resolveFallback();
          return;
        }

        resolve(stdout.split('\x1e').map(record => record.trim()).filter(Boolean).map(record => {
          const [hash, date, subject, ...bodyParts] = record.split('\x1f');
          return {
            hash,
            date,
            subject,
            body: bodyParts.join('\x1f').trim(),
          };
        }));
      });
    } catch {
      resolveFallback();
    }
  });
}

// API Routes
app.get('/api/settings', async (req, res) => {
  res.json(publicSettings(await getSettings()));
});

app.put('/api/settings', async (req, res) => {
  const current = await getSettings();
  const next: ProgramSettingsFile = {
    homepageUrl: String(req.body.homepageUrl || current.homepageUrl || 'http://localhost').trim(),
    aiProvider: ['openai', 'gemini', 'anthropic', 'openai-compatible'].includes(req.body.aiProvider)
      ? req.body.aiProvider
      : current.aiProvider,
    aiModel: String(req.body.aiModel || current.aiModel || '').trim(),
    aiBaseUrl: String(req.body.aiBaseUrl || '').trim(),
    aiApiKey: typeof req.body.aiApiKey === 'string' && req.body.aiApiKey.trim()
      ? req.body.aiApiKey.trim()
      : current.aiApiKey,
  };

  await saveSettings(next);
  pushSystemLog('Program settings updated', 'info', 'settings');
  res.json(publicSettings(next));
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
  const packageInfo = await readJsonFile(PACKAGE_FILE, { version: '0.0.0' });
  const notes = await readJsonFile(PATCH_NOTES_FILE, []);
  const commits = await getRecentGitCommits();
  res.json({
    version: (packageInfo as any).version || '0.0.0',
    notes,
    commits,
  });
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
  const logs = getSystemLogsForExport(req.query);
  const output = serializeSystemLogs(logs, format);

  if (req.query.clear === 'true') {
    clearExportedSystemLogs(logs);
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
