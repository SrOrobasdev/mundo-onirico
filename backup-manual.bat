@echo off
title Backup Mundo Onirico
echo.
echo ============================================
echo    BACKUP MUNDO ONIRICO
echo    El resultado queda registrado en:
echo    backups\backup-log.txt
echo ============================================
echo.
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0backup-auto.ps1" -Manual
echo.
echo Codigo de salida: %ERRORLEVEL%  (0 = OK, 1 = ERROR)
echo.
pause
