# Release guide

This guide is for maintainers who publish Applications Dashboard versions on GitHub Releases.

## 1. Prepare the environment

Install dependencies:

```bash
npm install
```

Validate the project:

```bash
npm run lint
npm run build
```

## 2. Generate the portable version

Use:

```bash
npm run package:win:zip
```

The portable package folder is created at:

```text
release/APPDashboard/
```

The ZIP file ready to attach is created at:

```text
release/APPDashboard-windows-portable.zip
```

The main executable is:

```text
release/APPDashboard/APPDashboard.exe
```

## 3. Test before publishing

Open:

```text
release/APPDashboard/APPDashboard.exe
```

Check that:

- The window opens correctly.
- The application list appears.
- The dashboard can start and stop a test process.
- Logs appear in the log panel.

## 4. Compress for GitHub

If you used `npm run package:win:zip`, the ZIP file is already ready. If you prefer to compress manually, compress the entire folder:

```text
release/APPDashboard/
```

Suggested file name:

```text
APPDashboard-windows-portable.zip
```

Important: do not publish only `APPDashboard.exe`. The application depends on the Electron support files located in the same folder.

## 5. Create the GitHub release

On GitHub:

1. Open the **Releases** tab.
2. Click **Draft a new release**.
3. Create a tag, for example `v1.0.0`.
4. Attach `APPDashboard-windows-portable.zip`.
5. Describe the main changes and usage instructions.

Suggested short release text:

```text
Download APPDashboard-windows-portable.zip, extract the folder, and run APPDashboard.exe.

Node.js and the source code are not required to use this release version.
```

## Publishing checklist

- `npm run lint` passed.
- `npm run build` passed.
- `npm run package:win:zip` generated `release/APPDashboard`.
- The executable opened on Windows.
- The local API responded at `http://127.0.0.1:3764/api/apps`.
- The `.zip` contains the complete application folder.
