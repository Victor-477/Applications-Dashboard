# Application configuration

The `apps.json` file stores the list of applications displayed in the dashboard. It can be edited through the dashboard itself or manually.

## Complete example

```json
[
  {
    "id": "database",
    "name": "Database",
    "command": "mariadbd.exe",
    "args": "--datadir=./data --port=3307 --bind-address=127.0.0.1 --console",
    "port": "3307",
    "cwd": "database/mariadb/bin",
    "dependsOn": [],
    "shell": false
  },
  {
    "id": "backend",
    "name": "Backend API",
    "command": "npm",
    "args": "run dev",
    "port": "3000",
    "cwd": "../backend",
    "dependsOn": ["database"],
    "shell": true
  }
]
```

## Fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | Yes | Unique identifier. Use letters, numbers, and hyphens to make dependencies easier to read. |
| `name` | Yes | Name displayed in the interface. |
| `command` | Yes | Command or executable that will be started. |
| `args` | No | Command arguments. |
| `port` | No | Port used to detect whether the application is active and avoid duplicates. |
| `cwd` | No | Initial working directory for the process. If empty, the dashboard folder is used. |
| `dependsOn` | No | List of `id`s that must start before this app. |
| `shell` | No | `true` runs through the Windows shell; `false` runs the binary directly. |

## Relative directories

The `cwd` field accepts absolute or relative paths.

Examples:

```json
"cwd": "C:\\Projects\\backend"
```

```json
"cwd": "../backend"
```

When a relative path does not exist from the dashboard folder, the server tries to resolve it from the project root that contains folders such as `backend`, `erp`, and `loja`.

## Dependencies

Use `dependsOn` when a service depends on another service.

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

When `frontend` starts, the dashboard tries to start `backend` first.

## Port usage

When `port` is provided, the dashboard checks `127.0.0.1:<port>`.

If the port is already open, the service appears as active and the dashboard avoids starting a duplicate process. When stopping the app, the dashboard can also try to terminate the process occupying that port on Windows.

## When to use `shell`

Use `shell: true` for commands normally executed from a terminal, such as:

```json
{
  "command": "npm",
  "args": "run dev",
  "shell": true
}
```

Use `shell: false` for direct executables when you want to avoid shell interpretation:

```json
{
  "command": "C:\\Tools\\app.exe",
  "args": "--port 8080",
  "shell": false
}
```

## Logs

Everything the process writes to stdout and stderr appears in the selected application's log panel. The server keeps the last 1000 lines per app while it is running.
