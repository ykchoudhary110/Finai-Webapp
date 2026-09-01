@echo off
title FinAI Platform Launcher
cd /d "%~dp0"

echo ===================================================
echo     FinAI — Next-Gen AI CA & Stock Risk Platform
echo ===================================================
echo.

if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example...
        copy .env.example .env >nul
    )
)

echo [1/3] Checking Python dependencies...
python -m pip install -r backend/requirements.txt --quiet

echo [2/3] Starting FastAPI Backend on http://localhost:8000...
start "FinAI Backend (FastAPI)" cmd /k "cd /d \"%~dp0backend\" && python main.py"

echo [3/3] Starting Vite React Frontend on http://localhost:5173...
start "FinAI Frontend (React)" cmd /k "cd /d \"%~dp0frontend\" && npm.cmd run dev"

echo.
echo ===================================================
echo   FinAI is running!
echo   Frontend: http://localhost:5173
echo   Backend API: http://localhost:8000/docs
echo ===================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
