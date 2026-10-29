#requires -Version 5
<#
  Remove dsh-ui-tidy from a DSH profile (dependency + bundle id) and undo the
  hot-reload override this plugin's enable-hmr.ps1 wrote into cordis.patch.yml.
  The plugin's own settings and your sessions are left alone.
  A package.json.ui-tidy-backup-* copy is restored when one exists.
#>
param(
    [ValidateSet('desktop', 'web', 'acp')]
    [string]$Profile = 'desktop',
    [switch]$DryRun,
    [switch]$KeepHmr,
    [string]$DshHome = (Join-Path $env:USERPROFILE '.dsh')
)

$ErrorActionPreference = 'Stop'
$pkgName = 'dsh-ui-tidy'
$pkgJson = Join-Path $DshHome "profiles\$Profile\package.json"
if (-not (Test-Path $pkgJson)) { throw "No profile at $pkgJson" }

if ($DryRun) {
    Write-Host "[dry-run] would remove $pkgName from dependencies and dsh.profile.bundles"
    if (-not $KeepHmr) { Write-Host "[dry-run] would also undo the hmr block in cordis.patch.yml" }
    return
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $pkgJson "$pkgJson.ui-tidy-uninstall-$stamp"

$script = @'
const fs = require('fs');
const [pkgPath, name] = process.argv.slice(1);
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (pkg.dependencies) delete pkg.dependencies[name];
const bundles = pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles;
if (Array.isArray(bundles)) {
    const next = bundles.filter((b) => b !== name);
    pkg.dsh.profile.bundles = next;
    console.log('bundles:', next.length);
}
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
'@
$tmp = Join-Path $env:TEMP "dsh-ui-tidy-uninstall-$stamp.cjs"
Set-Content -Path $tmp -Value $script -Encoding UTF8
try { node $tmp $pkgJson $pkgName } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }

Write-Host "Removed. Restart DSH to drop the entry."

# The hmr override is profile-wide (it watches the whole dsh-plugins folder), so
# leaving it behind means the host keeps hot-reloading sources for a plugin that
# is no longer installed. enable-hmr.ps1 already knows how to undo it safely.
if (-not $KeepHmr) {
    $hmr = Join-Path $PSScriptRoot 'enable-hmr.ps1'
    if (Test-Path $hmr) {
        try { & $hmr -Profile $Profile -DshHome $DshHome -Disable }
        catch { Write-Warning "hmr override not removed: $($_.Exception.Message)" }
    }
}

Write-Host ''
Write-Host 'Optional: clear the plugin settings stored in the page (run in the DSH devtools console):'
Write-Host '  Object.keys(localStorage).filter(k => /uidy|ui-tidy/i.test(k)).forEach(k => localStorage.removeItem(k))'
