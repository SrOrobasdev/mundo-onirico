param()

$projectDir = "C:\Users\Kaled\Desktop\mundo-onirico"

Write-Output "=============================================="
Write-Output "  CONFIGURACION ANTIVIRUS PARA BACKUPS"
Write-Output "=============================================="
Write-Output ""

# 1) Windows Defender: exclusion de la carpeta del proyecto
try {
    Add-MpPreference -ExclusionPath $projectDir -ErrorAction Stop
    Write-Output "[OK] Windows Defender: exclusion agregada para:"
    Write-Output "     $projectDir"
} catch {
    Write-Output "[FALLO] Windows Defender: no se pudo agregar la exclusion."
    Write-Output "        $_"
}

Write-Output ""
Write-Output "Abre ahora cada antivirus e agrega la misma exclusion"
Write-Output "(la carpeta C:\Users\Kaled\Desktop\mundo-onirico):"
Write-Output ""

Write-Output "--- AVAST ---"
Write-Output "  1. Abre Avast -> Menu -> Configuracion -> General -> Exclusiones"
Write-Output "  2. 'Agregar exclusion' -> Carpeta -> C:\Users\Kaled\Desktop\mundo-onirico"
Write-Output "  3. Guardar"
Write-Output ""

Write-Output "--- REASON CYBERSECURITY (ReasonLabs) ---"
Write-Output "  1. Abre Reason Cybersecurity -> Configuracion"
Write-Output "  2. Busca 'Exclusiones' o 'Allowlist'"
Write-Output "  3. Agrega la carpeta C:\Users\Kaled\Desktop\mundo-onirico"
Write-Output ""

Write-Output "=============================================="
Write-Output "  LISTO. Cierra esta ventana."
Write-Output "=============================================="
Read-Host "Pulsa una tecla para salir..." | Out-Null
