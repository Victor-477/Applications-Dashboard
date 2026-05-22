@echo off
setlocal
cd /d "%~dp0"

if not exist "dist\server.cjs" (
  call npm run build
  if errorlevel 1 exit /b %errorlevel%
)

start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0"
