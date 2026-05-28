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
```

Expected:

- `/api/apps` returns the visible enabled instances.
- `/api/settings` returns public settings without exposing the API key.
- `/api/patch-notes` returns the current package version, notes, patch summary, and commits when available.

## Manual UI Checklist

Dashboard:

- Cards render correctly.
- Start and stop buttons do not resize the card.
- Selecting a card opens the terminal/log area.
- Disabled apps do not appear on the dashboard.

Instance form:

- Basic fields save correctly.
- Advanced mode is available during creation.
- Advanced mode is locked after creation.

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

- Light and dark themes apply.
- Accent color presets apply.
- Custom six-character hex color applies.
- Button text remains readable with light custom colors.

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

## 2.4.1 Validation Performed

The following checks were run during the 2.4.1 documentation update:

```bash
npm run lint
npm run build
npx electron scripts\verify-i18n.cjs
npx electron scripts\capture-readme-screenshots.cjs
```

The screenshot script generated updated images for:

- Dashboard.
- Instance form.
- Language selector.
- Settings General.
- Settings Style.
- Settings System logs.
- Patch Files.
- AI Chat.
- About system.
