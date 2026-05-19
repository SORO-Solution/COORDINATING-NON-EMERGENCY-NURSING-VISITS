@echo off
title NurseConnect Launcher
echo.
echo  =============================================
echo   NurseConnect - Starting Platform
echo  =============================================
echo.

echo [1/2] Starting Django ASGI Backend (Daphne)...
start cmd /k "title NurseConnect Backend && cd /d "%~dp0backend" && .\venv\Scripts\activate.bat && python -m daphne -b 0.0.0.0 -p 8000 config.asgi:application"

timeout /t 2 /nobreak >nul

echo [2/2] Starting React Frontend (Vite)...
start cmd /k "title NurseConnect Frontend && cd /d "%~dp0frontend" && npm run dev --host"

echo.
echo  =============================================
echo   Both servers are starting...
echo.
echo   Frontend : http://localhost:5173
echo   API      : http://localhost:8000/api/
echo   WebSocket: ws://localhost:8000/ws/chat/
echo  =============================================
echo.
echo  Close this window or press any key to exit.
pause >nul
