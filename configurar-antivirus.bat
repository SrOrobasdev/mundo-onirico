@echo off
title Configurar Antivirus para Backups
echo.
echo Esto requiere permisos de administrador.
echo Windows pedira confirmacion (UAC)...
echo.
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy RemoteSigned -File \"C:\Users\Kaled\Desktop\mundo-onirico\configurar-antivirus.ps1\"' -Verb RunAs"
