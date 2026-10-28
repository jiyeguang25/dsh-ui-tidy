#requires -Version 5
<#
  Roll the profile package.json back to a copy taken by install.ps1 / uninstall.ps1.

  Usage:
    pwsh -File scripts\restore.ps1                 # list the backups
    pwsh -File scripts\restore.ps1 -Latest         # restore the newest one
    pwsh -File scripts\restore.ps1 -Name package.json.ui-tidy-backup-20261028-201500
    pwsh -File scripts\restore.ps1 -Latest -DryRun # show what would happen

  Only package.json is touched. cordis.patch.yml, the plugin's settings and your
  sessions are never modified by this script.
#>
param(
    [ValidateSet('desktop', 'web', 'acp')]
    [string]$Profile = 'desktop',
    [switch]$Latest,
    [string]$Name,
    [switch]$DryRun,
    [string]$DshHome = (Join-Path $env:USERPROFILE '.dsh')
)

$ErrorActionPreference = 'Stop'
$dir = Join-Path $DshHome "profiles\$Profile"
$target = Join-Path $dir 'package.json'
if (-not (Test-Path $dir)) { throw "No profile at $dir" }

$backups = Get-ChildItem $dir -Filter 'package.json.ui-tidy-*' |
    Sort-Object LastWriteTime -Descending

if (-not $backups -or $backups.Count -eq 0) {
    Write-Host "No backups found in $dir"
    return
}

if (-not $Latest -and -not $Name) {
    Write-Host "Backups in ${dir}:"
    $backups | ForEach-Object { "  {0}  {1:yyyy-MM-dd HH:mm}  {2} bytes" -f $_.Name, $_.LastWriteTime, $_.Length }
    Write-Host ""
    Write-Host "Restore one with:  pwsh -File scripts\restore.ps1 -Latest"
    return
}

$pick = if ($Name) { $backups | Where-Object { $_.Name -eq $Name } | Select-Object -First 1 } else { $backups | Select-Object -First 1 }
if (-not $pick) { throw "Backup not found: $Name" }

Write-Host "restore : $($pick.Name)  ($($pick.Length) bytes, $($pick.LastWriteTime.ToString('yyyy-MM-dd HH:mm')))"
if ($DryRun) { Write-Host "[dry-run] would overwrite $target"; return }

# Keep the current file too: rolling back is itself reversible.
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $target "$target.before-restore-$stamp"
Copy-Item $pick.FullName $target -Force
Write-Host "done    : restart DSH to pick it up"
