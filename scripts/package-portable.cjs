const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// This script targets Windows portable builds. On macOS and Linux the
// electron-builder invocations use different tooling and typically run in
// their own CI runners; refuse early with a hint so the failure is obvious.
if (process.platform !== 'win32') {
  console.error(`Portable packaging script is Windows-only (host is ${process.platform}).`);
  console.error('For macOS/Linux, use "npx electron-builder --mac" or "--linux" on the target OS.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const electronDist = path.join(root, 'node_modules', 'electron', 'dist');
const releaseDir = path.join(root, 'release', 'APPDashboard');
const appDir = path.join(releaseDir, 'resources', 'app');
const appBuilder = path.join(root, 'node_modules', 'app-builder-bin', 'win', process.arch === 'ia32' ? 'ia32' : process.arch === 'arm64' ? 'arm64' : 'x64', 'app-builder.exe');
const iconPng = path.join(root, 'public', 'ind40-logo.png');
const iconDir = path.join(root, 'build');
const iconIco = path.join(iconDir, 'icon.ico');
const builderCacheDir = path.join(root, '.cache', 'electron-builder');
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDir(from, to);
      continue;
    }

    fs.copyFileSync(from, to);
  }
}

function removeDir(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function findFileByName(source, fileName) {
  if (!source || !fs.existsSync(source)) return undefined;

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const current = path.join(source, entry.name);
    if (entry.isFile() && entry.name === fileName) return current;
    if (entry.isDirectory()) {
      const nested = findFileByName(current, fileName);
      if (nested) return nested;
    }
  }

  return undefined;
}

function findCachedRcedit() {
  const exeName = process.arch === 'ia32' ? 'rcedit-ia32.exe' : 'rcedit-x64.exe';
  // The local builder cache (ELECTRON_BUILDER_CACHE) is searched first because
  // that is where this script extracts winCodeSign; fall back to the global cache.
  const searchRoots = [
    path.join(builderCacheDir, 'winCodeSign'),
    path.join(process.env.LOCALAPPDATA || '', 'electron-builder', 'Cache', 'winCodeSign'),
  ];

  for (const searchRoot of searchRoots) {
    const found = findFileByName(searchRoot, exeName);
    if (found) return found;
  }

  return undefined;
}

function sevenZipDir() {
  const archDir = process.arch === 'ia32' ? 'ia32' : process.arch === 'arm64' ? 'arm64' : 'x64';
  const dir = path.join(root, 'node_modules', '7zip-bin', 'win', archDir);
  return fs.existsSync(path.join(dir, '7za.exe')) ? dir : undefined;
}

// app-builder shells out to a bare "7za" to extract winCodeSign (which contains
// rcedit). 7za is not on the system PATH, so prepend the bundled 7zip-bin copy.
function builderEnv() {
  const env = { ...process.env, ELECTRON_BUILDER_CACHE: builderCacheDir };
  const dir = sevenZipDir();
  if (dir) {
    const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
    env[pathKey] = `${dir}${path.delimiter}${env[pathKey] || ''}`;
  }
  return env;
}

function ensureIcon() {
  if (!fs.existsSync(appBuilder) || !fs.existsSync(iconPng)) return undefined;

  fs.mkdirSync(iconDir, { recursive: true });
  fs.mkdirSync(builderCacheDir, { recursive: true });
  const result = spawnSync(appBuilder, ['icon', '--format', 'ico', '--out', iconDir, '--input', iconPng], {
    stdio: 'inherit',
    env: builderEnv(),
  });

  if (result.status !== 0 || !fs.existsSync(iconIco)) {
    console.warn('Nao foi possivel gerar o icone do executavel.');
    return undefined;
  }

  return iconIco;
}

function applyExecutableIcon(exePath, iconPath) {
  if (!fs.existsSync(appBuilder) || !iconPath || !fs.existsSync(exePath)) return;
  fs.mkdirSync(builderCacheDir, { recursive: true });

  const args = [
    exePath,
    '--set-icon',
    iconPath,
    '--set-version-string',
    'ProductName',
    'Applications Dashboard',
    '--set-version-string',
    'FileDescription',
    'Applications Dashboard',
    '--set-version-string',
    'ProductVersion',
    packageInfo.version,
    '--set-version-string',
    'FileVersion',
    packageInfo.version,
  ];

  let rcedit = findCachedRcedit();

  // On a clean cache, drive app-builder once so it downloads and extracts
  // winCodeSign. 7za fails to create the macOS symlinks inside that archive
  // (Windows needs admin/Developer Mode), but rcedit-x64.exe still lands on
  // disk, so we ignore that failure and call rcedit directly afterwards.
  if (!rcedit) {
    // Output is silenced: the macOS symlink extraction errors are expected and
    // non-fatal here, and would otherwise look alarming in the build log.
    spawnSync(appBuilder, ['rcedit', '--args', JSON.stringify(args)], {
      stdio: 'ignore',
      env: builderEnv(),
    });
    rcedit = findCachedRcedit();
  }

  if (!rcedit) {
    console.warn('Nao foi possivel localizar o rcedit para aplicar o icone no executavel portatil.');
    return;
  }

  const result = spawnSync(rcedit, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.warn('Nao foi possivel aplicar o icone no executavel portatil.');
  }
}

if (!fs.existsSync(path.join(electronDist, 'electron.exe'))) {
  console.error('Electron binario nao encontrado em node_modules/electron/dist.');
  console.error('Isso normalmente acontece quando o download pos-instalacao do Electron falhou.');
  console.error('Execute "npm install" novamente (com acesso a internet) e tente de novo.');
  process.exit(1);
}

const distSource = path.join(root, 'dist');
if (!fs.existsSync(path.join(distSource, 'server.cjs')) || !fs.existsSync(path.join(distSource, 'index.html'))) {
  console.error('Build de producao nao encontrado em dist/.');
  console.error('Execute "npm run build" antes de empacotar (ou use "npm run package:win:full").');
  process.exit(1);
}

removeDir(releaseDir);
copyDir(electronDist, releaseDir);

const electronExe = path.join(releaseDir, 'electron.exe');
const appExe = path.join(releaseDir, 'APPDashboard.exe');
if (fs.existsSync(electronExe)) {
  fs.renameSync(electronExe, appExe);
}
applyExecutableIcon(appExe, ensureIcon());

removeDir(path.join(releaseDir, 'resources', 'default_app.asar'));
copyDir(path.join(root, 'dist'), path.join(appDir, 'dist'));
copyDir(path.join(root, 'electron'), path.join(appDir, 'electron'));
copyFile(path.join(root, 'apps.json'), path.join(appDir, 'apps.json'));
copyFile(path.join(root, 'patch-notes.json'), path.join(appDir, 'patch-notes.json'));
copyFile(path.join(root, 'PROJECT_PATCH_SUMMARY.md'), path.join(appDir, 'PROJECT_PATCH_SUMMARY.md'));
copyFile(path.join(root, 'package.json'), path.join(appDir, 'package.json'));

console.log(`Aplicativo portatil criado em: ${releaseDir}`);
console.log(`Execute: ${appExe}`);
