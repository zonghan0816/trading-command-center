@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo Starting Trading Command Center...
echo Open http://localhost:8765 in browser
pip install fastapi uvicorn anthropic python-dotenv > nul 2>&1
start "" "http://localhost:8765"
python server.py
pause
