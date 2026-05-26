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
interface AppConfig {
  id: string;
  name: string;
  command: string;
  args: string;
  port: string;
  cwd: string;
  dependsOn?: string[];
  shell?: boolean;
  advancedEnabled?: boolean;
  alternatePorts?: string[];
  secondaryCwd?: string;
  advancedCommand?: string;
  advancedArgs?: string;
  advancedShell?: boolean;
}

const runningProcesses = new Map<string, ChildProcess[]>();

// Log history and active clients
const logHistory = new Map<string, { timestamp: string; type: string; message: string }[]>();
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
      stopProcessTreeByPid(proc.pid).finally(() => reject(new Error(`Timeout executando ${command} ${args.join(' ')}`)));
    }, timeoutMs);

    proc.stdout.on('data', data => broadcastLog(appId, data.toString(), 'info'));
    proc.stderr.on('data', data => broadcastLog(appId, data.toString(), 'error'));
    proc.on('error', reject);
    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} finalizou com codigo ${code}`));
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
    if (appId) broadcastLog(appId, `--- Encerrando PID ${pid} pela porta ${port} ---`, 'system');
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
  broadcastLog(options.id, `--- Iniciando ${options.label}: ${fullCmd} (PID: ${proc.pid}) ---`, 'system');

  proc.stdout.on('data', (data) => {
    broadcastLog(options.id, data.toString(), 'info');
  });

  proc.stderr.on('data', (data) => {
    broadcastLog(options.id, data.toString(), 'error');
  });

  proc.on('close', (code) => {
    removeRunningProcess(options.id, proc);
    broadcastLog(options.id, `--- Processo ${options.label} encerrado com codigo ${code} ---`, 'system');
  });

  proc.on('error', (err) => {
    broadcastLog(options.id, `Erro ao iniciar processo ${options.label}: ${err.message}`, 'error');
    removeRunningProcess(options.id, proc);
  });

  return proc;
}

async function ensureDatabasePrepared(appId = 'smart40-database') {
  const backendDir = path.join(PROJECT_ROOT, 'backend');
  if (!fsExists(backendDir)) {
    broadcastLog(appId, `Backend nao encontrado em ${backendDir}`, 'error');
    return;
  }

  broadcastLog(appId, '--- Preparando schema do banco MES ---', 'system');
  await runCommand('npm', ['run', 'db:migrate'], backendDir, appId, 180000);
  broadcastLog(appId, '--- Inserindo/atualizando dados padrao do MES ---', 'system');
  await runCommand('npm', ['run', 'seed:test-data'], backendDir, appId, 180000);
  broadcastLog(appId, '--- Banco MES pronto para Backend, ERP e Loja ---', 'system');
}

async function startConfiguredApp(id: string, apps: any[], visited = new Set<string>()) {
  if (visited.has(id)) {
    throw new Error(`Dependencia circular detectada em ${id}`);
  }
  visited.add(id);

  const appConfig = apps.find(a => a.id === id);
  if (!appConfig) throw new Error(`App not found: ${id}`);

  for (const dependencyId of appConfig.dependsOn || []) {
    broadcastLog(id, `--- Garantindo dependencia: ${dependencyId} ---`, 'system');
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
    broadcastLog(id, `--- Porta ${openPort || appConfig.port} ja esta ativa. Start ignorado para evitar duplicidade. ---`, 'system');
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
    broadcastLog(id, `--- Porta principal indisponivel. Tentando porta alternativa ${runtimePort}. ---`, 'system');
  }

  const proc = spawnTrackedProcess({
    id,
    command: appConfig.command,
    args: appConfig.args,
    cwd,
    shell: appConfig.shell !== false,
    env,
    label: 'principal'
  });

  if (appConfig.advancedEnabled && appConfig.advancedCommand) {
    spawnTrackedProcess({
      id,
      command: appConfig.advancedCommand,
      args: appConfig.advancedArgs,
      cwd: resolveCwd(appConfig.secondaryCwd || appConfig.cwd),
      shell: appConfig.advancedShell !== false,
      env,
      label: 'avancado'
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

  const data = JSON.stringify(logEntry);
  logClients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

// API Routes
app.get('/api/apps', async (req, res) => {
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
  broadcastLog(id, '--- Configuracao da instancia atualizada. Reinicie o servico para aplicar comandos, portas ou diretorios alterados. ---', 'system');
  res.json(updated);
});

app.delete('/api/apps/:id', async (req, res) => {
  const id = req.params.id;
  const processes = getRunningAppProcesses(id);
  if (processes.length > 0) {
    await Promise.all(processes.map(proc => stopProcessTree(proc)));
    runningProcesses.delete(id);
  }
  let apps = await getApps();
  apps = apps.filter(a => a.id !== id);
  await saveApps(apps);
  res.json({ success: true });
});

app.post('/api/apps/:id/start', async (req, res) => {
  const id = req.params.id;
  const apps = await getApps();

  try {
    const result = await startConfiguredApp(id, apps);
    res.json(result);
  } catch (error) {
    const message = (error as Error).message;
    const status = message.startsWith('App not found') ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

app.post('/api/apps/:id/stop', async (req, res) => {
  const id = req.params.id;
  const apps = await getApps();
  const appConfig = apps.find(a => a.id === id);
  const processes = getRunningAppProcesses(id);
  if (processes.length > 0) {
    broadcastLog(id, '--- Solicitando parada do processo ---', 'system');
    await Promise.all(processes.map(proc => stopProcessTree(proc)));
    runningProcesses.delete(id);
    res.json({ success: true });
    return;
  }

  let stoppedByPort = 0;
  for (const port of getConfiguredPorts(appConfig)) {
    stoppedByPort += await stopPidsByPort(port, id);
  }
  if (stoppedByPort > 0) {
    res.json({ success: true, stoppedByPort });
    return;
  }

  res.status(400).json({ error: 'Not running' });
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
