@echo off
chcp 65001 >nul
REM Drag image files or a folder onto this .bat to chroma-key + align them.
python "%~dp0tools\char_keyer.py" %*
echo.
pause
