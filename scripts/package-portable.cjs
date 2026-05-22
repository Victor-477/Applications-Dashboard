const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const electronDist = path.join(root, 'node_modules', 'electron', 'dist');
const releaseDir = path.join(root, 'release', 'APPDashboard');
const appDir = path.join(releaseDir, 'resources', 'app');

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

removeDir(releaseDir);
copyDir(electronDist, releaseDir);

const electronExe = path.join(releaseDir, 'electron.exe');
const appExe = path.join(releaseDir, 'APPDashboard.exe');
if (fs.existsSync(electronExe)) {
  fs.renameSync(electronExe, appExe);
}

removeDir(path.join(releaseDir, 'resources', 'default_app.asar'));
copyDir(path.join(root, 'dist'), path.join(appDir, 'dist'));
copyDir(path.join(root, 'electron'), path.join(appDir, 'electron'));
copyFile(path.join(root, 'apps.json'), path.join(appDir, 'apps.json'));
copyFile(path.join(root, 'package.json'), path.join(appDir, 'package.json'));

console.log(`Aplicativo portatil criado em: ${releaseDir}`);
console.log(`Execute: ${appExe}`);
