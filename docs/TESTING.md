# Testing

This document describes the validation flow used for Applications Dashboard.

## Automated Checks

Run TypeScript validation:

```bash
npm run lint
```

Run a production build:

```bash
npm run build
```

Run the i18n smoke test:

```bash
npx electron scripts\verify-i18n.cjs
```

The i18n smoke test opens the app in Electron and validates visible text for:

- English.
- Portuguese.
- Chinese.
- German.
- Spanish.
- Japanese.

## API Smoke Test

After `npm run build`, start the compiled server:

```bash
npm run start
```

Check:

```text
http://127.0.0.1:3000/api/apps
http://127.0.0.1:3000/api/settings
http://127.0.0.1:3000/api/patch-notes
http://127.0.0.1:3000/api/homepage-template
http://127.0.0.1:3000/internal-homepage
```

Expected:

- `/api/apps` returns the visible enabled instances.
- `/api/settings` returns public settings without exposing the API key, including `homepageMode` and `dashboardLayout`.
- `/api/patch-notes` returns the current package version, notes, patch summary, and commits when available.
- `/api/homepage-template` returns `{ "custom": false }` until a template is uploaded.
- `/internal-homepage` returns the generated HomePage HTML, or the uploaded template when one is present.

## Manual UI Checklist

Dashboard:

- Cards render correctly.
- List layout renders correctly when selected in Style settings.
- Start and stop buttons do not resize the card.
- Selecting an instance opens the terminal/log area.
- Disabled apps do not appear on the dashboard.
- The link action is hidden for instances without a port or web link.

Instance form:

- Basic fields save correctly.
- The optional web link saves and is used by the link action.
- Advanced mode is available during creation.
- Advanced mode is locked after creation.
- The advanced section is hidden when editing an instance created without advanced mode.

HomePage:

- Internal mode opens the generated HomePage and lists instances with status.
- The internal HomePage follows the selected layout, theme, and accent color.
- Uploading a custom template replaces the page; resetting restores the default.
- Custom mode opens the configured URL and enables the URL field.

Settings:

- Enable / Disable Apps can hide and show instances.
- Edit works from Settings.
- Delete is available only in Settings.
- JSON import accepts valid payloads.
- JSON import rejects invalid payloads.
- Backup downloads the current instance list.
- Logs export in CSV, TXT, JSON, NDJSON, and LOG.
- Optional log cleanup works after export.

Style:

- Card and list layout selection applies to the dashboard.
- Light and dark themes apply.
- Accent color presets apply.
- Custom six-character hex color applies.
- Button text remains readable with light custom colors.
- Saving from the Style tab also persists General tab changes.

Localization:

- Language selection persists after reload.
- English remains the default.
- German, Spanish, and Japanese appear in the selector.
- Patch Files text follows the selected language when translations exist.

AI Chat:

- Not-configured state is shown when no API key is set.
- Chat requests are sent through the backend only.
- Conversation context remains bounded.

Patch Files:

- Version notes render.
- Project patch summary renders.
- Commit entries are clickable.
- Commit details are readable.

About:

- Project description appears.
- GitHub profile link works.
- Repository link works.

## Portable Executable Test

After packaging, the portable build is smoke-tested by launching it and checking the internal server:

```text
release/APPDashboard/APPDashboard.exe
http://127.0.0.1:3764/internal-homepage
http://127.0.0.1:3764/api/settings
```

The executable should also carry the embedded application icon and report version `2.5.0` in its file properties.

## 2.5.0 Validation Performed

The following checks were run during the 2.5.0 update:

```bash
npm run lint
npm run build
npx electron scripts\verify-i18n.cjs
npm run package:win:full
```

This covered TypeScript checks, the production build, the i18n smoke test for all six languages, and the portable executable export with its embedded icon and an internal-server smoke test.
