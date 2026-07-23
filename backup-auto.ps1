param([switch]$Manual)

$projectDir = "C:\Users\Kaled\Desktop\mundo-onirico"
$backupRoot = Join-Path $projectDir "backups"
if (-not (Test-Path $backupRoot)) { New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null }
$date = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = Join-Path $backupRoot "backup-$date"

Write-Output "=== BACKUP MUNDO ONIRICO ==="
Write-Output "Creando backup en: $backupDir"

robocopy $projectDir $backupDir /E /XD "node_modules" ".git" "backup-*" /R:2 /W:3 /NJH /NJS /NP

$ok = $LASTEXITCODE -lt 8
if ($ok) {
    Write-Output "Backup completado: backup-$date"
    if (-not $Manual) {
        # Mantener solo los últimos 5 backups automáticos
        Get-ChildItem "$backupRoot\backup-*" -Directory | Sort-Object Name -Descending | Select-Object -Skip 5 | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Output "ERROR: Falló el backup"
}