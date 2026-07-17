@echo off
title TextPoint App
cd /d "%~dp0"
echo Starting TextPoint...
echo.
node dist/index.js
echo.
echo If TextPoint stopped, read the message above.
pause