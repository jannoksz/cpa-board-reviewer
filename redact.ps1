<#
redact.ps1

Search and replace helper for local repositories.
- Usage examples:
    # Dry-run, show files that would change
    .\redact.ps1 -Pattern 'OLD_SECRET' -Replacement '[REDACTED]' -WhatIf

    # Perform replacement and commit changes
    .\redact.ps1 -Pattern 'OLD_SECRET' -Replacement '[REDACTED]' -Commit

- Safety:
  * Creates a backup directory .redact_backup/<timestamp>/ with original files
  * Skips .git, node_modules, binary files by extension
  * Default is dry-run (WhatIf). Use -Commit to automatically commit changes.

WARNING: Do NOT pass real secrets to public channels. This script edits files in-place.
#>

param(
    [Parameter(Mandatory=$true)]
    [string] $Pattern,

    [Parameter(Mandatory=$true)]
    [string] $Replacement,

    [string] $Path = '.' ,

    [switch] $Commit,

    [switch] $WhatIf
)

function IsBinaryFile($filePath) {
    # Simple binary detection: check for NUL bytes in first 1024 bytes
    try {
        $fs = [System.IO.File]::Open($filePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
        $buffer = New-Object byte[] 1024
        $read = $fs.Read($buffer, 0, $buffer.Length)
        $fs.Close()
        for ($i=0; $i -lt $read; $i++) { if ($buffer[$i] -eq 0) { return $true } }
        return $false
    } catch {
        return $true
    }
}

# Normalize absolute paths
$repoRoot = Resolve-Path -Path $Path
$backupRoot = Join-Path -Path $repoRoot -ChildPath ".redact_backup"
$timestamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$backupDir = Join-Path -Path $backupRoot -ChildPath $timestamp

$excludeDirs = @('.git', 'node_modules', '.redact_backup')
$excludeExt = @('.png','.jpg','.jpeg','.gif','.ico','.zip','.gz','.7z','.exe','.dll','.bin','.pdf')

$changedFiles = @()

Write-Host "Searching for pattern:`n  Pattern: $Pattern`n  Replacement: $Replacement`n  Path: $repoRoot" -ForegroundColor Cyan

Get-ChildItem -Path $repoRoot -Recurse -File -Force | ForEach-Object {
    $file = $_
    $relative = $file.FullName.Substring($repoRoot.Path.Length).TrimStart('\')

    # Skip excluded directories
    if ($excludeDirs | Where-Object { $relative -like "$_*" }) { return }

    # Skip excluded extensions
    if ($excludeExt -contains $file.Extension.ToLower()) { return }

    if (IsBinaryFile $file.FullName) { return }

    # Read content
    try {
        $text = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
    } catch {
        return
    }

    if ($text -match [regex]::Escape($Pattern)) {
        Write-Host "Match found: $relative" -ForegroundColor Yellow
        $changedFiles += $file.FullName

        if (-not $WhatIf) {
            # Ensure backup directory exists and copy original
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            $dest = Join-Path -Path $backupDir -ChildPath $relative
            $destDir = Split-Path -Path $dest -Parent
            if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
            Copy-Item -Path $file.FullName -Destination $dest -Force

            # Perform replacement (literal replacement)
            $newText = $text -replace [regex]::Escape($Pattern), [System.Text.RegularExpressions.Regex]::Escape($Replacement)

            # Write back
            Set-Content -LiteralPath $file.FullName -Value $newText -Encoding UTF8
            Write-Host "Replaced in: $relative" -ForegroundColor Green
        } else {
            Write-Host "(WhatIf) Would replace in: $relative" -ForegroundColor DarkYellow
        }
    }
}

if ($WhatIf) {
    Write-Host "Dry run complete. Use the script without -WhatIf to apply changes." -ForegroundColor Cyan
    exit 0
}

if ($changedFiles.Count -eq 0) {
    Write-Host "No files changed." -ForegroundColor Green
    exit 0
}

Write-Host "Backup of originals saved to: $backupDir" -ForegroundColor Cyan

if ($Commit) {
    # Commit changes if in a git repository
    try {
        if (Get-Command git -ErrorAction SilentlyContinue) {
            Push-Location $repoRoot.Path
            git add -A
            git commit -m "redact: replace sensitive pattern '$Pattern' (automated)" --no-verify
            Write-Host "Committed changes to git." -ForegroundColor Green
            Pop-Location
        } else {
            Write-Host "Git not found on PATH; skipping commit." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error committing changes: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Changes applied but not committed. Use -Commit to automatically commit." -ForegroundColor Yellow
}
