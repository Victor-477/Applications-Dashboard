# Security Notes

Applications Dashboard is a local command runner. Treat configuration as executable behavior.

## Local Commands

Each instance can run a local command or executable. Review configuration before starting any service.

Be especially careful with:

- `shell: true`.
- Commands imported from JSON.
- Absolute paths from untrusted sources.
- Arguments that include scripts, network calls, or destructive operations.

## Import Safety

JSON import is intended for trusted backups and known project configurations.

Before importing:

- Read the commands.
- Check working directories.
- Check dependency chains.
- Decide whether replacing all current instances is safe.

## Deleting Instances

Deleting an instance is available only from Settings. This keeps destructive actions away from the main dashboard cards.

## Advanced Settings

Advanced settings are locked after creation. This reduces the chance of changing execution behavior accidentally after an instance is already in use.

## API Keys

AI API keys are stored in local settings and are sent only from the backend to the configured provider when AI Chat is used.

The public settings endpoint reports only whether a key is configured. It does not return the key to the browser.

## System Logs

System logs are local records. Exported logs can include instance names, command-related messages, and error details.

Review exported files before sharing them.

## Portable Builds

The portable executable uses local files next to `APPDashboard.exe`, including user data and cache directories. Keep the full extracted folder together.
