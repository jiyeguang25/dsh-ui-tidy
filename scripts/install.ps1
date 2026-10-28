#requires -Version 5
<#
  One-command registration of dsh-ui-tidy into a DSH profile.

  What it does (and nothing else):
    1. backs the profile package.json up,
    2. points the profile's dependency at this checkout (or at the npm package),
    3. adds the bundle id to dsh.profile.bundles,
    4. tells you to restart DSH.

  It never touches cordis.patch.yml, the plugin's own settings, or your sessions.

  Usage:
    pwsh -File scripts\install.ps1                  # link this checkout (default)
    pwsh -File scripts\install.ps1 -Mode npm        # use the published npm package
    pwsh -File scripts\install.ps1 -Profile web     # register in another profile
    pwsh -File scripts\install.ps1 -DryRun          # show the plan, write nothing
#>
param(
    [ValidateSet('desktop', 'web', 'acp')]
    [string]$Profile = 'desktop',
    [ValidateSet('link', 'npm')]
    [string]$Mode = 'link',
    [switch]$DryRun,
    [switch]$SkipVerify,
    [string]$DshHome = (Join-Path $env:USERPROFILE '.dsh')
)

$ErrorActionPreference = 'Stop'
$pkgName = 'dsh-ui-tidy'
$source = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$profileDir = Join-Path $DshHome "profiles\$Profile"
$pkgJson = Join-Path $profileDir 'package.json'

# Verify before writing, not after restarting: a plugin that cannot activate is
# otherwise only discovered as "the top bar never appeared".
if (-not $SkipVerify) {
    $client = Join-Path $source 'client.js'
    if (-not (Test-Path $client)) { throw "client.js not found next to scripts\: $client" }
    node --check $client
    if ($LASTEXITCODE -ne 0) { throw "client.js failed node --check; nothing was written." }
    $smoke = Join-Path $source 'smoke\smoke-boot.mjs'
    if (Test-Path $smoke) {
        Push-Location $source
        try { node smoke\smoke-boot.mjs | Select-Object -Last 1 }
        finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) { throw "boot smoke failed; nothing was written." }
    }
    Write-Host "verify  : client.js parses, boot smoke passes"
}

Write-Host "profile : $profileDir"
Write-Host "mode    : $Mode"
if (-not (Test-Path $pkgJson)) {
    throw "No profile at $profileDir. Start DSH with that profile once, then re-run."
}

$depValue = if ($Mode -eq 'npm') { '^0.4.7' } else { 'link:' + ($source -replace '\\', '/') }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "$pkgJson.ui-tidy-backup-$stamp"

if ($DryRun) {
    Write-Host "[dry-run] dependency $pkgName -> $depValue"
    Write-Host "[dry-run] bundles += $pkgName"
    return
}

Copy-Item $pkgJson $backup
Write-Host "backup  : $backup"

$script = @'
const fs = require('fs');
const [pkgPath, name, dep] = process.argv.slice(1);
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies[name] = dep;
pkg.dsh = pkg.dsh || {};
pkg.dsh.profile = pkg.dsh.profile || {};
const bundles = pkg.dsh.profile.bundles = pkg.dsh.profile.bundles || [];
if (!bundles.includes(name)) bundles.push(name);
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('dependency:', pkg.dependencies[name]);
console.log('bundles   :', bundles.length);
'@
$tmp = Join-Path $env:TEMP "dsh-ui-tidy-install-$stamp.cjs"
Set-Content -Path $tmp -Value $script -Encoding UTF8
try {
    node $tmp $pkgJson $pkgName $depValue
} finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host "Registered. Now fully quit DSH and start it again (a page reload is not enough:"
Write-Host "the client bundle list is computed at boot)."
if ($Mode -eq 'link') {
    Write-Host "If activation fails, run this first:  pwsh -File scripts\install.ps1 -Mode npm"
}
Write-Host "To undo:  pwsh -File scripts\uninstall.ps1 -Profile $Profile"
