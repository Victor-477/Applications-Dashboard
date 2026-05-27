const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
  return findFileByName(path.join(process.env.LOCALAPPDATA || '', 'electron-builder', 'Cache', 'winCodeSign'), exeName);
}

function ensureIcon() {
  if (!fs.existsSync(appBuilder) || !fs.existsSync(iconPng)) return undefined;

  fs.mkdirSync(iconDir, { recursive: true });
  fs.mkdirSync(builderCacheDir, { recursive: true });
  const result = spawnSync(appBuilder, ['icon', '--format', 'ico', '--out', iconDir, '--input', iconPng], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_BUILDER_CACHE: builderCacheDir },
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

  const cachedRcedit = findCachedRcedit();
  const result = cachedRcedit
    ? spawnSync(cachedRcedit, args, { stdio: 'inherit' })
    : spawnSync(appBuilder, ['rcedit', '--args', JSON.stringify(args)], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_BUILDER_CACHE: builderCacheDir },
  });

  if (result.status !== 0) {
    console.warn('Nao foi possivel aplicar o icone no executavel portatil.');
  }
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
