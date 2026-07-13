# Roadmap 2.7 → 3.0

Planned work between the current 2.6.0 release and the 3.0.0 milestone. Each version is landed as a single Git commit after implementation and validation.

## v2.7 — Internal API configuration ✅

**Focus:** give the user explicit control over the panel's HTTP interface.

- [x] New Settings › General › **Internal API** section.
- [x] Configurable **port** (number input, saved to `settings.json`; requires app restart to apply).
- [x] Toggle **Allow remote connections** — when off, the API binds to `127.0.0.1`; when on, it binds to `0.0.0.0` so other devices on the LAN can reach it.
- [x] Backend (`server.ts`) reads the settings before `app.listen`, falling back to environment variables and then the built-in defaults.
- [x] Electron main (`electron/main.cjs`) reads the same settings first so the packaged app polls the correct port.
- [x] Translations in all six languages, patch notes, and version bump.

## v2.8 — Apache mini-server + advanced-features master toggle ✅

**Focus:** add another advanced feature and simplify the on/off story.

- [x] New advanced feature: **Mini web server** — the user can serve a local folder of static web pages under a configurable port, useful for testing markup and CSS.
- [x] New page (behind an Advanced Features toggle) for the mini-server: pick a folder, set a port, start/stop the server, preview the mounted URL.
- [x] New **General settings master toggle** for Advanced Features — turns all optional tools off at once without losing their individual settings.
- [x] Translations, patch notes, version bump.

## v2.9 — Internal instance folder ✅

**Focus:** stop touching arbitrary directories on the user's machine when the user does not need to.

- [x] Bundled **internal instances folder** created beside the executable on first run.
- [x] Instance form gains a "Store inside internal folder" option that redirects `cwd` (and advanced secondary cwd) to this internal folder.
- [x] Settings > General section for browsing, creating, and deleting subfolders under the internal folder.
- [x] Import/export normalizer preserves `useInternalFolder` and `internalFolder`.
- [x] Translations, patch notes, version bump.

## v3.0 — Scripts, autostart, alerts, multi-platform

**Focus:** big-picture upgrade — this is the milestone release.

- [ ] **General script runner** — the app can execute stand-alone scripts (not tied to a specific instance) written in **Python**, **JavaScript**, or **Rust**, from a dedicated page.
- [ ] **Auto-start** — each instance can be flagged to start automatically when the panel launches; the app respects a defined order for dependencies.
- [ ] **Alert center** — a centralised UI for system and instance errors, with severity, timestamp, and a "mark as read" action.
- [ ] **Multi-platform** — the packaging pipeline and the runtime support **Linux** and **macOS** in addition to Windows (portable and native launchers per platform).
- [ ] Translations, patch notes, version bump to 3.0.0.

## Working notes

- Every version keeps translations in sync across `en`, `pt`, `zh`, `de`, `es`, `ja`.
- Screenshots are refreshed with `scripts/capture-readme-screenshots.cjs` whenever the UI changes.
- The portable Windows executable is smoke-tested (`npm run package:win:full` → run `.exe` → hit `/api/settings`) before each release commit.
- New settings ship with sensible defaults so existing `settings.json` files keep working without editing.
