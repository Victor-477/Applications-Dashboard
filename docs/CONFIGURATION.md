# Configuration

Applications Dashboard stores local instance configuration in `apps.json` and program preferences in `settings.json`.

`settings.json` is ignored by Git because it can contain local preferences and API key configuration. An uploaded HomePage template is stored as `homepage.html` and is also ignored by Git.

## Instance Configuration

Instances can be edited through the UI or manually in `apps.json`.

Example:

```json
[
  {
    "id": "backend-local",
    "name": "Backend API",
    "command": "npm",
    "args": "run dev",
    "port": "3000",
    "cwd": "../backend",
    "webLink": "",
    "dependsOn": [],
    "shell": true,
    "enabled": true,
    "advancedEnabled": false
  }
]
```

## Basic Fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | Yes | Unique internal identifier. It is also used by dependencies. |
| `name` | Yes | Name shown on cards and lists. |
| `command` | Yes | Executable or base command. |
| `args` | No | Arguments passed to the command. |
| `port` | No | Port used for status detection and duplicate prevention. |
| `cwd` | No | Working directory. Empty means the dashboard folder. |
| `webLink` | No | Custom URL opened by the instance link action. When empty, the link falls back to `http://127.0.0.1:<port>`. With neither a web link nor a port, no link action is shown. |
| `dependsOn` | No | Array of instance IDs that should start first. |
| `shell` | No | `true` runs through the Windows shell. `false` runs the executable directly. |
| `enabled` | No | `false` hides the instance from the main dashboard. |

## Advanced Fields

Advanced fields are active only when `advancedEnabled` is `true`.

| Field | Description |
| --- | --- |
| `advancedEnabled` | Enables advanced execution fields. This should be chosen during creation and is locked after creation. |
| `alternatePorts` | Alternative ports checked when the primary port is unavailable. |
| `secondaryCwd` | Optional second working directory for advanced execution flows. |
| `advancedCommand` | Optional advanced command. |
| `advancedArgs` | Arguments for the advanced command. |
| `advancedShell` | Shell mode for the advanced command. |

## Working Directories

`cwd` accepts absolute and relative paths.

Absolute example:

```json
"cwd": "C:\\Projects\\backend"
```

Relative example:

```json
"cwd": "../backend"
```

If a relative path does not exist from the dashboard folder, the backend tries to resolve it from a nearby project root containing known project folders.

## Dependencies

Use `dependsOn` when one service must start before another.

```json
{
  "id": "frontend",
  "name": "Frontend",
  "command": "npm",
  "args": "run dev",
  "port": "5173",
  "cwd": "../frontend",
  "dependsOn": ["backend"],
  "shell": true
}
```

Starting `frontend` attempts to start `backend` first.

## Port Detection

When `port` is provided, the dashboard checks `127.0.0.1:<port>`.

If the port is open:

- The service can appear as running.
- The dashboard avoids starting a duplicate process.
- Stop actions can try to terminate the process occupying that port on Windows.

## Shell Mode

Use `shell: true` for commands usually run from a terminal:

```json
{
  "command": "npm",
  "args": "run dev",
  "shell": true
}
```

Use `shell: false` for direct executables:

```json
{
  "command": "C:\\Tools\\service.exe",
  "args": "--port 8080",
  "shell": false
}
```

## Importing Instances

Settings > General > Instance settings can import JSON.

Accepted formats:

```json
[
  {
    "name": "Worker",
    "command": "npm",
    "args": "run worker"
  }
]
```

Or:

```json
{
  "apps": [
    {
      "name": "Worker",
      "command": "npm",
      "args": "run worker"
    }
  ]
}
```

The import tool validates the payload and supports replacing the current instance list.

## Backing Up Instances

Settings > General > Instance settings can export the current instance list as JSON.

Backups are useful before:

- Replacing all instances.
- Moving the dashboard to another machine.
- Preparing a release or demo.

## Program Settings

Program settings are stored in `settings.json`.

Common fields:

| Field | Description |
| --- | --- |
| `homepageMode` | `internal` serves the application's own HomePage; `custom` opens `homepageUrl`. |
| `homepageUrl` | URL opened by the HomePage sidebar button when `homepageMode` is `custom`. |
| `aiProvider` | `openai`, `gemini`, `anthropic`, or `openai-compatible`. |
| `aiModel` | Model name used by AI Chat. |
| `aiBaseUrl` | Custom base URL for OpenAI-compatible providers. |
| `aiApiKey` | Local API key. It is not exposed to the browser. |
| `themeMode` | `light` or `dark`. |
| `accentColor` | Six-digit hex color with `#`, such as `#009dea`. |
| `dashboardLayout` | `cards` or `list`, controlling how instances are presented on the dashboard. |

## Internal HomePage

When `homepageMode` is `internal`, the HomePage button opens a page served by the application at `/internal-homepage`. By default this is a generated template that explains the dashboard and lists instances with live status, following the selected layout, theme, and accent color.

Uploading a custom page (Settings > General > HomePage > Template page) stores it as `homepage.html` and serves it exactly as provided. Resetting removes that file and restores the default template.
