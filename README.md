# Applications Dashboard

Applications Dashboard is a Windows desktop control panel for running local applications, services, and terminal commands from one interface.

Current documented version: **2.4.1**.

The project is designed for development and operation environments where databases, APIs, frontends, Node-RED flows, worker processes, and support tools need to be started, monitored, stopped, and documented with less friction.

## What It Does

- Registers local applications as reusable service cards.
- Starts and stops commands from the dashboard.
- Shows process status and live terminal logs.
- Supports dependencies between instances.
- Allows instance import/export through JSON backups.
- Keeps system logs with CSV, TXT, JSON, NDJSON, and LOG export formats.
- Provides Settings, AI Chat, Patch Files, About, and HomePage shortcuts.
- Supports English as the primary language, plus Portuguese, Chinese, German, Spanish, and Japanese.
- Packages as a portable Windows Electron application.

## Screenshots

### Dashboard

![Dashboard overview](docs/images/dashboard-overview.png)

### Instance Form

![Application form](docs/images/app-form.png)

### Language Selector

![Language selector](docs/images/language-selector.png)

### Settings

![Settings general tab](docs/images/settings-general.png)

### Patch Files

![Patch files](docs/images/patch-files.png)

More screenshots are available in [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## Documentation

| Document | Purpose |
| --- | --- |
| [User Guide](docs/USER_GUIDE.md) | Explains every page and user-facing workflow. |
| [Configuration](docs/CONFIGURATION.md) | Explains `apps.json`, instance fields, advanced options, settings, and JSON import/export. |
| [Localization](docs/LOCALIZATION.md) | Explains the language system and how translations are maintained. |
| [Development](docs/DEVELOPMENT.md) | Explains project structure, local development, scripts, and screenshots. |
| [Testing](docs/TESTING.md) | Lists validation commands and manual QA flows. |
| [Release Guide](docs/RELEASE.md) | Explains portable packaging and GitHub release publishing. |
| [Security](docs/SECURITY.md) | Explains local-command, API key, and configuration safety notes. |

## For End Users

Download the latest release ZIP from GitHub Releases, extract the folder, and open:

```text
APPDashboard.exe
```

Do not run only the `.exe` outside its folder. The portable build needs the Electron support files located beside it.

Node.js is not required to use a published release.

## For Developers

Install dependencies:

```bash
npm install
```

Validate the code:

```bash
npm run lint
npm run build
```

Run the local server:

```bash
npm run dev
```

Open the desktop app:

```bash
npm run desktop
```

Create a portable Windows build:

```bash
npm run package:win:full
```

## Project Structure

```text
.
|-- docs/                  # User, developer, release, testing, and security docs
|-- electron/              # Electron desktop entry point
|-- public/                # Static assets copied into the build
|-- scripts/               # Packaging, screenshot, and validation scripts
|-- server/                # Backend helper modules
|-- src/                   # React frontend
|-- apps.json              # Local instance configuration
|-- patch-notes.json       # Version notes rendered in the app
|-- PROJECT_PATCH_SUMMARY.md
|-- server.ts              # Express API and local process orchestration
`-- package.json
```

## Latest Validation

The 2.4.1 documentation update was validated with:

```bash
npm run lint
npm run build
npx electron scripts\verify-i18n.cjs
npx electron scripts\capture-readme-screenshots.cjs
```

The i18n validation checked English, Portuguese, Chinese, German, Spanish, and Japanese.
