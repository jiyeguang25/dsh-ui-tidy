#requires -Version 5
<#
  Remove dsh-ui-tidy from a DSH profile (dependency + bundle id).
  Leaves cordis.patch.yml, the plugin's own settings and your sessions untouched.
  A package.json.ui-tidy-backup-* copy is restored when one exists.
#>
param(
    [ValidateSet('desktop', 'web', 'acp')]
    [string]$Profile = 'desktop',
    [switch]$DryRun,
    [string]$DshHome = (Join-Path $env:USERPROFILE '.dsh')
)

$ErrorActionPreference = 'Stop'
$pkgName = 'dsh-ui-tidy'
$pkgJson = Join-Path $DshHome "profiles\$Profile\package.json"
if (-not (Test-Path $pkgJson)) { throw "No profile at $pkgJson" }

if ($DryRun) {
    Write-Host "[dry-run] would remove $pkgName from dependencies and dsh.profile.bundles"
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
