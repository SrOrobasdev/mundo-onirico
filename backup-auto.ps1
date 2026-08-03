param([switch]$Manual)

$projectDir = "C:\Users\Kaled\Desktop\mundo-onirico"
$backupRoot = Join-Path $projectDir "backups"
if (-not (Test-Path $backupRoot)) { New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null }
$date = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = Join-Path $backupRoot "backup-$date"
$logFile = Join-Path $backupRoot "backup-log.txt"

function Write-Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | $msg"
    Write-Output $msg
    Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
}

Write-Log "=== BACKUP MUNDO ONIRICO ==="
Write-Log "Creando backup en: $backupDir"

# /XD excluye: backups (destino, por ruta completa), node_modules, .git, respaldos (sistema viejo)
robocopy $projectDir $backupDir /E /XD "$backupRoot" "node_modules" ".git" "respaldos" /R:2 /W:3 /NJH /NJS /NP

$ok = $LASTEXITCODE -lt 8
if ($ok) {
    Write-Log "Backup completado: backup-$date"
    if (-not $Manual) {
        # Mantener solo los últimos 5 backups automáticos
        Get-ChildItem "$backupRoot\backup-*" -Directory | Sort-Object Name -Descending | Select-Object -Skip 5 | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Log "ERROR: Falló el backup"
}

if ($Manual) {
    Write-Output ""
    Write-Output "Pulsa una tecla para cerrar..."
    Read-Host | Out-Null
}
