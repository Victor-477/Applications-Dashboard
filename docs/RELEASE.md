# Release Guide

This guide is for maintainers publishing Applications Dashboard on GitHub Releases.

## 1. Prepare

Install dependencies:

```bash
npm install
```

Confirm the version in:

- `package.json`
- `package-lock.json`
- `patch-notes.json`
- `PROJECT_PATCH_SUMMARY.md`
- App footer and Settings version display

## 2. Validate

Run:

```bash
npm run lint
npm run build
npx electron scripts\verify-i18n.cjs
```

If UI documentation changed, regenerate screenshots:

```bash
npx electron scripts\capture-readme-screenshots.cjs
```

## 3. Package

Generate the portable build and ZIP:

```bash
npm run package:win:zip
```

Output folder:

```text
release/APPDashboard/
```

ZIP file:

```text
release/APPDashboard-windows-portable.zip
```

Executable:

```text
release/APPDashboard/APPDashboard.exe
```

## 4. Test the Portable App

Open:

```text
release/APPDashboard/APPDashboard.exe
```

Check:

- Window opens.
- Application icon is correct.
- Dashboard loads.
- Local API responds at `http://127.0.0.1:3764/api/apps`.
- Patch notes report the expected version.
- Settings opens.
- Language selector works.
- A test instance can be started and stopped.

## 5. Publish on GitHub

On GitHub:

1. Open **Releases**.
2. Draft a new release.
3. Create a tag such as `v2.4.1`.
4. Attach `APPDashboard-windows-portable.zip`.
5. Add a short summary from `patch-notes.json`.

Suggested release text:

```text
Download APPDashboard-windows-portable.zip, extract the folder, and run APPDashboard.exe.

Node.js and the source code are not required to use this release version.
```

## Important

Do not publish only `APPDashboard.exe`. Electron needs the support files in the portable folder.

Do not commit generated folders:

- `build/`
- `dist/`
- `release/`
- `.cache/`
