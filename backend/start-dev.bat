@echo off
title Backend Dev Server
echo ========================================================
echo   Starting Backend Dev Server
echo ========================================================
cd /d "%~dp0"
echo Current Directory: %CD%
echo Executing: npm run start:dev
echo ========================================================
npm run start:dev
pause
