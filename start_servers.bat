@echo off
echo Starting Comment Moderation System Servers...

start cmd /k "cd /d "%~dp0backend\gateway_django" && python manage.py runserver 8000"
start cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Servers are starting in separate windows.
echo Frontend: http://localhost:5173
echo Backend: http://127.0.0.1:8000
