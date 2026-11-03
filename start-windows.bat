@echo off
REM Double-click to open the Sound Arcade setup page. Needs Node.js from https://nodejs.org
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org then try again. & pause & exit /b 1)
node setup\server.mjs
pause
