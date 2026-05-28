# Development

This document explains how to work on the project locally.

## Requirements

- Windows.
- Node.js 20 or newer.
- npm.

## Install

```bash
npm install
```

## Run Locally

Development server:

```bash
npm run dev
```

Desktop app:

```bash
npm run desktop
```

Production server after build:

```bash
npm run build
npm run start
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Starts the Express/Vite development server. |
| `npm run lint` | Runs TypeScript validation without emitting files. |
| `npm run build` | Builds the React frontend and bundled Node server into `dist`. |
| `npm run start` | Runs `dist/server.cjs`. |
| `npm run desktop` | Builds and opens the Electron desktop app. |
| `npm run package:win` | Packages the current build into `release/APPDashboard`. |
| `npm run package:win:full` | Builds and then packages the portable app. |
| `npm run package:win:zip` | Builds, packages, and creates the release ZIP. |
| `npm run clean` | Removes `dist`. |

## Architecture

The application has three major parts:

- **React frontend** in `src/`.
- **Express backend** in `server.ts` with helpers in `server/`.
- **Electron shell** in `electron/main.cjs`.

The Electron app starts the local backend and loads the UI from the local server.

## Backend Modules

| Path | Purpose |
| --- | --- |
| `server/appImport.ts` | Validates and normalizes imported instance JSON. |
| `server/defaultApps.ts` | Default app list used when `apps.json` is missing. |
| `server/fileUtils.ts` | Safe JSON/text file helpers. |
| `server/patchNotes.ts` | Patch notes and project summary parsing. |
| `server/settingsUtils.ts` | Program settings defaults and normalization. |
| `server/systemLogs.ts` | System log filtering and export serialization. |
| `server/types.ts` | Shared backend types. |

## Frontend Structure

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Main shell, navigation, state, and layout. |
| `src/components/AppCard.tsx` | Service card. |
| `src/components/AppForm.tsx` | Instance create/edit panel. |
| `src/components/LogViewer.tsx` | Terminal/log view. |
| `src/components/SettingsView.tsx` | Settings page and tabs. |
| `src/components/settings/` | Smaller Settings dialog components. |
| `src/components/PatchFilesView.tsx` | Patch notes and commit view. |
| `src/components/AIChatView.tsx` | AI Chat page. |
| `src/components/AboutView.tsx` | About system page. |
| `src/i18n.ts` | Interface translations. |

## Screenshots

Generate documentation screenshots:

```bash
npm run build
npx electron scripts\capture-readme-screenshots.cjs
```

The script saves images to `docs/images/`.

## Generated Files

The following folders are generated and ignored:

- `build/`
- `dist/`
- `release/`
- `.cache/`
- `node_modules/`

Do not commit generated folders.
