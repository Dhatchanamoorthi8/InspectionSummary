@echo off
title Frontend Dev Server (Vite)
echo ========================================================
echo   Starting Frontend Dev Server
echo ========================================================
cd /d "%~dp0"
echo Current Directory: %CD%
echo Executing: npm run dev
echo ========================================================
npm run dev
pause
