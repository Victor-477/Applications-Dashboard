# Applications Dashboard Patch Summary

This file summarizes the main project changes so future GitHub commits can be prepared with less friction.

## Current version

- Version: 2.3.1
- Date: 2026-05-27
- Main area: application icon packaging and reliable patch note rendering.

## 2.3.1

- Applied the project cube image as the Electron window and packaged executable icon.
- Updated the portable packaging script to copy patch notes and project patch summary files.
- Added a Patch Files fallback that renders version notes from PROJECT_PATCH_SUMMARY.md when patch-notes.json is unavailable.
- Updated application versioning to 2.3.1.

## 2.3.0

- Added a Style tab in Settings for light and dark themes.
- Added custom accent color selection with free color input and preset swatches.
- Persisted appearance settings through the backend settings file.
- Applied the selected accent color to buttons, active navigation states, cards, and form focus states.
- Reset stale dashboard selection and side panels after importing instances.
- Updated application versioning to 2.3.0.

## 2.2.1

- Connected PROJECT_PATCH_SUMMARY.md to the Patch Files page.
- Added an About system page with translated content and GitHub links.
- Added backend parsing for the project patch summary markdown file.
- Added translated interface labels for the patch summary sections.
- Reworked the patch summary file so English is the primary language.
- Updated application versioning to 2.2.1.

## 2.2.0

- Added an instance settings category under Settings > General.
- Added JSON backup export for configured instances.
- Added JSON import support to configure multiple instances at once.
- Added an option to replace the current instance list during import.
- Added backend validation for imported payloads.
- Added system logs for backup export, import success, and import failure.
- Updated application versioning to 2.2.0.

## 2.1.0

- Reorganized the General settings tab into clear categories.
- Made the Settings and Patch Files headers fixed.
- Restricted scrolling to the tab/page content areas.
- Made Patch Files commit entries clickable.
- Added commit details with hash, date, subject, and description.
- Added a fallback for commit history when the git executable cannot be called.

## 0.1.0

- Added sidebar navigation with Home, HomePage, AI Chat, Patch Files, and Settings.
- Added configurable HomePage URL.
- Added AI Chat with local provider, model, and API key configuration.
- Added Patch Files with version notes and recent commits.
- Added system log filters and export formats.
- Removed instance deletion from the main screen and kept it only in Settings.

## Initial baseline

- Created the service card layout.
- Added the side terminal for the selected instance.
- Added the side panel for instance creation and editing.
- Added enable and disable controls for instances.
- Added local system logs.

## Important files for commits

- `package.json`: application version and scripts.
- `package-lock.json`: locked root package version.
- `patch-notes.json`: version history displayed on the Patch Files page.
- `PROJECT_PATCH_SUMMARY.md`: English-first project patch summary rendered on the Patch Files page.
- `server.ts`: endpoints, local execution, logs, import/export, patch summary parsing, and AI Chat.
- `src/App.tsx`: main layout, sidebar navigation, and footer.
- `src/components/SettingsView.tsx`: settings tabs, logs, and general tools.
- `src/components/PatchFilesView.tsx`: version notes, patch summary, and commit display.
- `src/i18n.ts`: interface translations.
- `src/types.ts`: shared frontend/backend contracts.

## Checklist before committing

1. Update `package.json` and `package-lock.json` with the new version.
2. Add a new entry to `patch-notes.json`.
3. Update this file with the new release summary.
4. Run `npm run lint`.
5. Run `npm run build`.
6. Validate `http://127.0.0.1:3000/` when the change affects the UI or API.
