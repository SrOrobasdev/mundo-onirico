param([switch]$Manual)

$ErrorActionPreference = 'Continue'

$projectDir  = "C:\Users\Kaled\Desktop\mundo-onirico"
$backupRoot  = Join-Path $projectDir "backups"
$lockFile    = Join-Path $backupRoot "backup.lock"
$logFile     = Join-Path $backupRoot "backup-log.txt"
$keepAuto    = 5
$minFreeMB   = 200

if (-not (Test-Path $backupRoot)) { New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null }

# Escritura de log resiliente: algunos antivirus bloquean el archivo brevemente.
# Usamos .NET con FileShare.ReadWrite y reintentos para no romper el backup.
function Write-Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | $msg"
    Write-Output $msg
    for ($i = 0; $i -lt 5; $i++) {
        try {
            $fs = [System.IO.File]::Open($logFile, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
            try {
                $sw = New-Object System.IO.StreamWriter($fs, [System.Text.Encoding]::UTF8)
                $sw.WriteLine($line)
                $sw.Flush()
            } finally {
                if ($sw) { $sw.Dispose() }
                $fs.Dispose()
            }
            return
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }
    Write-Output "AVISO: log bloqueado por otro proceso, no se pudo escribir: $line"
}

# Rotar log: conservar solo las ultimas 100 lineas
function Trim-Log {
    if (Test-Path $logFile) {
        try {
            $lines = @(Get-Content -LiteralPath $logFile -ErrorAction Stop)
            if ($lines.Count -gt 100) {
                $lines | Select-Object -Last 100 | Set-Content -LiteralPath $logFile -Encoding UTF8
            }
        } catch { }
    }
}

# Contar archivos/tamano EXCLUYENDO por nombre de carpeta en cualquier nivel (rutas relativas)
function Get-FileStats($root) {
    $all = @(Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue)
    $files = @($all | Where-Object {
        $rel = $_.FullName.Substring($root.Length).TrimStart('\')
        $rel -notmatch '(^|\\)(node_modules|\.git|respaldos|backups)(\\|$)'
    })
    $bytes = ($files | Measure-Object -Property Length -Sum).Sum
    return [pscustomobject]@{ Count = $files.Count; Bytes = $bytes }
}

# --- Candado anti-concurrencia ---
if (Test-Path $lockFile) {
    Write-Log "ERROR: Ya hay otro backup en curso. Abortado."
    exit 1
}
try { New-Item -ItemType File -Path $lockFile -Force | Out-Null } catch { }

$ok = $false
try {
    Trim-Log
    Write-Log "=== BACKUP MUNDO ONIRICO ==="

    # --- Chequeo de espacio en disco ---
    $drive = (Get-PSDrive -Name ($projectDir.Substring(0,1))).Free
    $srcStats = Get-FileStats $projectDir
    $needBytes = [long]($srcStats.Bytes * 1.2) + ($minFreeMB * 1MB)
    if ($drive -lt $needBytes) {
        $freeTxt = "{0:N0}" -f ($drive/1MB)
        $needTxt = "{0:N0}" -f ($needBytes/1MB)
        Write-Log "ERROR: Espacio insuficiente (libre: $freeTxt MB, necesario: $needTxt MB). Abortado."
        exit 1
    }

    $date = Get-Date -Format "yyyy-MM-dd_HHmmss"
    $backupDir = Join-Path $backupRoot "backup-$date"
    Write-Log "Creando backup en: $backupDir"

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    robocopy $projectDir $backupDir /E /MT:8 /XD "$backupRoot" "node_modules" ".git" "respaldos" /R:2 /W:3 /NJH /NJS /NP
    $rc = $LASTEXITCODE
    $sw.Stop()

    if ($rc -lt 8) {
        # --- Verificacion de integridad: comparar cantidad y tamano ---
        $dstStats = Get-FileStats $backupDir
        $info = "Backup completado: backup-$date ($($dstStats.Count) archivos, {0:N2} MB, $($sw.Elapsed.TotalSeconds.ToString('F1'))s)" -f ($dstStats.Bytes/1MB)
        if ($dstStats.Count -eq $srcStats.Count -and $dstStats.Bytes -eq $srcStats.Bytes) {
            Write-Log "$info - VERIFICADO OK"
            $ok = $true
            $sizeTxt = "{0:N2} MB" -f ($dstStats.Bytes/1MB)
            $durTxt = "{0:F1}s" -f $sw.Elapsed.TotalSeconds
            $infoContent = @(
                "Backup de Mundo Onirico",
                "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
                "Origen: $projectDir",
                "Destino: $backupDir",
                "Archivos: $($dstStats.Count)",
                "Tamano: $sizeTxt",
                "Duracion: $durTxt",
                "Verificacion: OK (misma cantidad y tamano de archivos)"
            )
            $infoContent | Set-Content -LiteralPath (Join-Path $backupDir "backup-info.txt") -Encoding UTF8
        } else {
            Write-Log "$info - PERO VERIFICACION FALLIDA (origen $($srcStats.Count)/$($srcStats.Bytes) vs destino $($dstStats.Count)/$($dstStats.Bytes))"
        }
    } else {
        Write-Log "ERROR: Fallo el backup (robocopy codigo $rc)"
    }

    if ($ok -and -not $Manual) {
        # --- Rotacion: conservar los ultimos $keepAuto backups automaticos ---
        $removed = 0
        Get-ChildItem "$backupRoot\backup-*" -Directory | Sort-Object Name -Descending | Select-Object -Skip $keepAuto | ForEach-Object {
            Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
            $removed++
        }
        if ($removed -gt 0) { Write-Log "Rotacion: eliminados $removed backup(s) antiguos (se conservan los ultimos $keepAuto)." }
    }

    if ($ok) { Write-Log "Resultado: OK" } else { Write-Log "Resultado: ERROR" }
} finally {
    Remove-Item -LiteralPath $lockFile -Force -ErrorAction SilentlyContinue
}

if ($ok) { exit 0 } else { exit 1 }
