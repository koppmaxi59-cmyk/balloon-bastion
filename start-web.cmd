@echo off
title ST App RTS Game
echo Starting ST App dev server...
cd /d "%~dp0"
start "" http://localhost:5173
npx vite --port 5173
pause
