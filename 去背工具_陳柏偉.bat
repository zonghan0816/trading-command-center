@echo off
chcp 65001 >nul
REM Drag 陳柏偉 (char_3q) image files or a folder onto this .bat.
REM Aligns to assets/char_3q/emo_idle.png (the male host's position), NOT the female default.
python "%~dp0tools\char_keyer.py" --ref "%~dp0assets\char_3q\emo_idle.png" %*
echo.
pause
