# Applications Dashboard

Windows desktop dashboard for running local applications, services, and terminal commands from a single interface.

It is designed for workflows where several programs need to be started often and sometimes in a specific order, such as databases, backends, frontends, and support tools. The app lets you register commands, start and stop processes, watch logs in real time, and configure dependencies between services.

## Screenshots

### Dashboard

![Applications Dashboard overview](docs/images/dashboard-overview.png)

### Application form

![Application form](docs/images/app-form.png)

## For users who only want to run the app

Download the latest version from the **Releases** section on GitHub.

1. Download the release `.zip` file.
2. Extract the folder anywhere on Windows.
3. Open `APPDashboard.exe`.
4. Use the add application button in the header to register the programs you want to run.

You do not need to download the source code, install Node.js, or run development commands to use the release version.

## Features

- Electron desktop interface.
- Local Express API started together with the desktop app.
- Create, edit, and delete application entries.
- Start and stop local processes.
- Real-time log viewer.
- Process status detection by port.
- Windows process tree termination.
- Dependency support between applications.
- Interface language selector with Portuguese, English, and Chinese.
- Portable Windows build for distribution.

## How it works

The dashboard reads registered applications from `apps.json`. Each item describes the command, arguments, working directory, monitored port, and dependencies.

When an application is started, the local server:

1. Starts dependencies configured in `dependsOn` first.
2. Checks whether the configured port is already in use.
3. Runs the command in the configured working directory.
4. Streams stdout/stderr to the log viewer.
5. Allows the process to be stopped from the dashboard.

## Application configuration

Example `apps.json`:

```json
[
  {
    "id": "backend-local",
    "name": "Backend API",
    "command": "npm",
    "args": "run dev",
    "port": "3000",
    "cwd": "../backend",
    "dependsOn": [],
    "shell": true
  }
]
```

Main fields:

- `id`: unique identifier used internally and by dependencies.
- `name`: display name shown in the dashboard.
- `command`: executable or base command.
- `args`: command arguments.
- `port`: port used to detect whether the service is running.
- `cwd`: working directory. It can be absolute or relative.
- `dependsOn`: list of `id`s that must start before this application.
- `shell`: when `true`, runs through the Windows shell; when `false`, runs the executable directly.

More details are available in [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Development

Requirements:

- Windows
- Node.js 20 or newer
- npm

Install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm run dev
```

Generate a production build:

```bash
npm run build
```

Validate TypeScript:

```bash
npm run lint
```

Open as a local desktop app:

```bash
npm run desktop
```

Generate the portable Windows build:

```bash
npm run package:win:full
```

Generate the portable Windows build and ZIP file for GitHub Releases:

```bash
npm run package:win:zip
```

The executable is created at:

```text
release/APPDashboard/APPDashboard.exe
```

## Release publishing

To publish a version on GitHub Releases, generate the portable package and attach the ZIP file created at:

```text
release/APPDashboard-windows-portable.zip
```

End users must receive the full ZIP package, not only the `.exe`, because Electron depends on the support files placed next to the executable.

The recommended step-by-step release process is available in [docs/RELEASE.md](docs/RELEASE.md).

## Available scripts

- `npm run dev`: starts the server with Vite in development mode.
- `npm run lint`: runs TypeScript validation without emitting files.
- `npm run build`: builds the frontend and server into `dist`.
- `npm run start`: runs the compiled server from `dist/server.cjs`.
- `npm run desktop`: builds the app and opens Electron.
- `npm run package:win`: packages the portable folder using the current build.
- `npm run package:win:full`: builds the app and packages the portable folder.
- `npm run package:win:zip`: builds the app, packages the portable folder, and creates `release/APPDashboard-windows-portable.zip`.
- `npm run clean`: removes `dist`.

## Tests performed

Validations performed on this project:

- `npm run lint`
- `npm run build`
- HTTP test of the compiled server in production mode.
- Functional test for starting/stopping a local process and capturing logs.
- `npm run package:win`
- `npm run package:win:zip`
- Opened `release/APPDashboard/APPDashboard.exe` and checked the local API.

## Project structure

```text
.
|-- electron/              # Electron startup
|-- scripts/               # Packaging and support scripts
|-- src/                   # React interface
|-- public/                # Public files copied to the build
|-- docs/                  # Additional documentation and screenshots
|-- server.ts              # Local API and process control
|-- apps.json              # Registered applications
|-- package.json           # Scripts and dependencies
`-- README.md              # Main repository documentation
```

## Security notes

This application executes local commands configured by the user. Only use trusted configurations and review commands before starting processes, especially when `shell` is enabled.
