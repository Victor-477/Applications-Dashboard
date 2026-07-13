# Applications Dashboard Patch Summary

This file summarizes the main project changes so future GitHub commits can be prepared with less friction.

## Current version

- Version: 3.0.0
- Date: 2026-08-06
- Main area: milestone 3.0 — script runner, auto-start, alert center, and multi-platform packaging.

## 3.0.0

- Added a **general script runner** advanced feature. Users can save Python, JavaScript, and Rust snippets and run them from the dashboard. Sources persist in `scripts.json`; execution uses ephemeral files under the internal folder and captures stdout, stderr, exit code, and elapsed time.
- Added an **auto-start** flag on each instance. On server boot, all enabled instances with `autoStart: true` are launched in dependency order; failures raise alerts but never block panel startup.
- Added an **alert center**: bell icon sits in the top bar next to the language selector, with an unread badge that polls the backend. Errors from `pushSystemLog` and warnings from scripts populate the list with severity, source, timestamp, and mark-as-read state.
- Added an **auto-start selector** in Settings > General: a popup lets the user pick which instances should launch with the panel, with a live badge list of the current selection shown below the button. Backed by a new `PUT /api/apps/auto-start` bulk endpoint.
- Added a **terminal three-dot menu** on the log panel: detach into a floating window (`?floating=<id>`), open the command in the OS's default terminal (`POST /api/apps/:id/open-terminal`, cross-platform), or restart the terminal.
- The **Advanced Features tab** now hides entirely from Settings when the master toggle is off; the panel auto-redirects to General if the tab was active when it disappears.
- Added **multi-platform packaging**: `electron-builder` targets Windows (portable), macOS (`dir`), and Linux (`AppImage`); a POSIX launcher (`abrir-painel.sh`) mirrors the existing Windows batch file; `scripts/package-portable.cjs` refuses to run outside Windows with a clear message.
- New backend endpoints: `GET/POST/PUT/DELETE /api/scripts`, `POST /api/scripts/:id/run`, `GET /api/alerts`, `POST /api/alerts/:id/read`, `POST /api/alerts/read-all`, `POST /api/alerts/clear`. Scripts gate on both the master and individual feature flags; alert center honours its own flag.
- Translations in six languages (en, pt, zh, de, es, ja) for the new sidebar entries, feature toggles, form field, and patch notes.
- Updated application versioning to 3.0.0.

## 2.9.0

- Added an `instances/` folder that ships with the panel and lives beside the executable. Users can drop scripts, static assets, and support files here instead of using directories elsewhere on the computer.
- Added a **Store inside internal folder** option to the instance form. When enabled, the instance's working directory (and its advanced secondary cwd) is anchored to a sanitized subfolder inside the internal folder, ignoring the free-text Directory input.
- Added a **Settings > General > Internal instances folder** section that shows the folder path, lists its entries, and lets users create or delete subfolders.
- Added backend endpoints `GET /api/internal-folder`, `POST /api/internal-folder/mkdir`, and `DELETE /api/internal-folder/entry`. Every endpoint refuses paths that try to escape the folder root.
- Import/export normalizer preserves `useInternalFolder` and `internalFolder` so backups stay compatible with existing instances.
- Translations in six languages (en, pt, zh, de, es, ja) for the new form field, settings section, and patch notes.
- Updated application versioning to 2.9.0.

## 2.8.0

- Added a **Mini web server** advanced feature that publishes any local folder as a static site on a configurable port (start/stop/status endpoints plus a sidebar page with folder + port + open-in-browser controls).
- Added an **Advanced Features master toggle** in Settings > General that turns every advanced feature off at once while preserving each individual setting.
- Every advanced-feature endpoint (`/api/ai-chat`, `/api/api-tester`, `/api/connectivity-test`, `/api/web-server/*`) and its sidebar entry now checks both the master flag and its own toggle.
- Added `isFeatureEffectivelyEnabled` shared helper in `server/settingsUtils.ts` so backend and frontend agree on when a feature is truly active.
- Translations in six languages (en, pt, zh, de, es, ja) for the master toggle, the mini web server view, and the new patch notes.
- Updated application versioning to 2.8.0.

## 2.7.0

- Added a Settings > General > Internal API section that lets the user pick the panel's HTTP port and decide whether other devices on the network can reach it.
- Backend startup reads the persisted port and network policy before `app.listen`, falling back to the launch environment and built-in defaults when the values are missing or invalid.
- Electron main process reads the same settings first so the packaged desktop shell polls the correct port when the app boots.
- Added an in-UI hint explaining that internal API changes only take effect after the next application launch.
- Updated application versioning to 2.7.0.

## 2.6.0

- Added an Advanced features tab in Settings for enabling or disabling optional panel tools.
- Turned AI Chat into an optional feature. When disabled, its sidebar page and settings are hidden but saved values remain on disk.
- Added a new API Tester feature: a page for sending HTTP requests to local or external APIs and inspecting the response.
- Added a new Tests and Connectivity feature: a page for probing a device or service by IP and port over TCP, HTTP, HTTPS, or ping.
- Moved AI Chat provider, model, base URL, and API key settings from the General tab to the new Advanced features tab.
- Added backend gating for `/api/ai-chat`, `/api/api-tester`, and `/api/connectivity-test`, so each refuses work when its feature flag is off.
- Code-split secondary views (Settings, AI Chat, API Tester, Tests and Connectivity, Patch Files, About) with `React.lazy`, cutting the initial bundle by roughly 11 percent.
- Removed unused runtime dependencies (`motion`, `@google/genai`) so the packaged Windows build is smaller and installs faster.
- Memoized the accent color theme variables so the main App shell does not re-render them on every state update.
- Updated application versioning to 2.6.0.

## 2.5.0

- Added a Style setting to switch the home page instance presentation between cards and list view.
- Added an internal HomePage route served by the application so users can open a local web page without an external Apache server.
- Added General settings to choose between the internal HomePage server and a custom HomePage URL.
- Rebuilt the internal HomePage as an explanatory template that shows live instance status and follows the cards or list layout, theme, and accent color.
- Added support for uploading a custom HomePage template page, previewing it, and resetting back to the default.
- Added an optional per-instance web link so the instance link icon can open a custom URL instead of the local port.
- Hid instance web-link actions when no port or web link is configured for the instance.
- Hid advanced instance settings while editing instances that were created without advanced mode enabled.
- Clarified that saving settings applies both the General and Style tabs.
- Restored the portable executable export by pinning Electron to the working 33.4.11 build and adding clear preflight checks to the packaging script.
- Fixed the portable executable icon embedding so the project cube icon is applied without requiring 7za on the system PATH or administrator privileges.
- Updated application versioning to 2.5.0.

## 2.4.1

- Added German, Spanish, and Japanese to the language selector.
- Translated the main interface, navigation, settings, AI Chat, About, and Patch Files labels from the English source text.
- Updated HTML language metadata for each available language.
- Added translated patch note entries for the new languages.
- Restructured README into focused documentation guides.
- Regenerated screenshots for dashboard, settings, language selector, Patch Files, AI Chat, and About.
- Documented user workflows, configuration, localization, development, testing, release, and security guidance.
- Updated application versioning to 2.4.1.

## 2.4.0

- Split backend defaults, instance import validation, settings normalization, system log export, and patch note parsing into dedicated server modules.
- Split Settings dialogs and patch text translations into smaller frontend files.
- Changed the Electron desktop runtime to use a portable user-data and cache directory beside the executable.
- Kept the packaged executable icon aligned with the project cube icon.
- Applied the app version metadata to the portable executable during packaging.
- Updated application versioning to 2.4.0.

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
- `server.ts`: route orchestration, local execution, logs, import/export, and AI Chat.
- `server/`: backend modules for defaults, import validation, settings normalization, log export, file reads, and patch note parsing.
- `src/App.tsx`: main layout, sidebar navigation, and footer.
- `src/components/SettingsView.tsx`: settings tabs, logs, and general tools.
- `src/components/AppCard.tsx` and `src/components/AppListItem.tsx`: card and list dashboard presentations.
- `src/components/settings/`: smaller Settings dialog components.
- `src/i18n/patchTextTranslations.ts`: translated patch note text entries.
- `src/components/PatchFilesView.tsx`: version notes, patch summary, and commit display.
- `src/i18n.ts`: interface translations.
- `src/types.ts`: shared frontend/backend contracts.
- `scripts/package-portable.cjs`: portable Windows packaging and executable icon embedding.
- `scripts/capture-readme-screenshots.cjs`: documentation screenshot capture.

## Checklist before committing

1. Update `package.json` and `package-lock.json` with the new version.
2. Add a new entry to `patch-notes.json`.
3. Update this file with the new release summary.
4. Run `npm run lint`.
5. Run `npm run build`.
6. Run `npx electron scripts\verify-i18n.cjs` to validate translations across languages.
7. Regenerate documentation screenshots with `npx electron scripts\capture-readme-screenshots.cjs` when the UI changed.
8. Run `npm run package:win:full` to validate the portable executable build.
9. Validate `http://127.0.0.1:3000/` when the change affects the UI or API.
