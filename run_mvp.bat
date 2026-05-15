@echo off
echo Starting NurseConnect MVP...

echo [1/2] Starting Django Backend...
start cmd /k "cd backend && .\venv\Scripts\activate.bat && python manage.py runserver"

echo [2/2] Starting Vite React Frontend...
start cmd /k "cd frontend && npm run dev"

echo Both servers are starting up!
echo The React app should open automatically or be available at http://localhost:5173
echo The Django API is available at http://localhost:8000/api/
pause
