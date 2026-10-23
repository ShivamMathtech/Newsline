@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 LTS from https://nodejs.org/ first.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])!==24){console.error('Node.js 24.x is required.');process.exit(1)}"
if errorlevel 1 goto fail
call npm ci --no-audit --no-fund
if errorlevel 1 goto fail
call npm run build
if errorlevel 1 goto fail
echo Setup complete. Open START-WINDOWS.cmd to run Newsline.
pause
exit /b 0
:fail
echo Setup failed. Read the error above. Check Node version and internet access.
pause
exit /b 1
