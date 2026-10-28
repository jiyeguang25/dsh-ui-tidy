<#
.SYNOPSIS
    在 DSH profile 的 cordis.patch.yml 里打开热加载（@deepseek-ai/dsh-hmr）。

.DESCRIPTION
    hmr 条目本身由宿主的 base bundle 提供（id: hmr, name: @deepseek-ai/dsh-hmr），
    默认 `root: []` 只监听 profile 配置变化。本脚本按 id 覆盖该条目，把源码根目录加进
    `root`，这样改 client.js 不用重启宿主。

    脚本只追加/替换自己那一段（以注释标记定位），改动前先备份成
    cordis.patch.yml.good-<时间戳>；-DryRun 只打印将要写入的内容。

.PARAMETER Disable
    反向操作：把本脚本写入的那一段摘掉，恢复成宿主默认（改代码需重启）。

.PARAMETER Profile
    profile 名，默认 desktop。

.PARAMETER DryRun
    只打印结果，不写盘。

.EXAMPLE
    pwsh -File scripts\enable-hmr.ps1 -DryRun
    pwsh -File scripts\enable-hmr.ps1
    pwsh -File scripts\enable-hmr.ps1 -Disable
#>
[CmdletBinding()]
param(
    [switch]$Disable,
    [string]$Profile = "desktop",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$profileDir = Join-Path $env:USERPROFILE ".dsh\profiles\$Profile"
$patch = Join-Path $profileDir "cordis.patch.yml"
if (-not (Test-Path $patch)) { throw "找不到 $patch" }

$begin = "# >>> dsh-ui-tidy: hmr (managed by enable-hmr.ps1) >>>"
$end   = "# <<< dsh-ui-tidy: hmr <<<"

$text = [System.IO.File]::ReadAllText($patch)
$eol = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }

# 摘掉旧段（幂等）
$pattern = [regex]::Escape($begin) + ".*?" + [regex]::Escape($end) + "\r?\n?"
$stripped = [regex]::Replace($text, $pattern, "", "Singleline")

if ($Disable) {
    $next = $stripped
    if ($next -eq $text) { Write-Host "没有找到本脚本写入的段落，未改动。" -ForegroundColor Yellow; return }
    if ($DryRun) { Write-Host "[-DryRun] 将删除 hmr 段："; Write-Host $begin; return }
    Copy-Item $patch "$patch.good-$(Get-Date -Format yyyyMMdd-HHmmss)"
    [System.IO.File]::WriteAllText($patch, $next)
    Write-Host "已关闭热加载：重启 DSH Desktop 后生效。" -ForegroundColor Green
    return
}

# 依赖检查：hmr 包必须在 profile 里可解析
$pkg = Join-Path $profileDir "node_modules\@deepseek-ai\dsh-hmr\package.json"
if (-not (Test-Path $pkg)) {
    Write-Host "profile 里没有 @deepseek-ai/dsh-hmr。先装它：" -ForegroundColor Yellow
    Write-Host "  dsh plugin --profile $Profile add @deepseek-ai/dsh-hmr" -ForegroundColor Yellow
    Write-Host "（版本要与宿主一致；本机宿主是 0.2.1-rc.3）"
    return
}
$ver = (Get-Content $pkg -Raw | ConvertFrom-Json).version

$rootList = '".", "C:/Users/' + $env:USERNAME + '/DSH/dsh-plugins"'
$lines = @(
    $begin,
    "# 热加载：hmr 条目由 base bundle 提供，这里按 id 覆盖，把源码监听打开。",
    "# '.' = profile 目录；插件是 link 装的，实际代码在工作区，须一并监听。",
    "- id: hmr",
    "  disabled: false",
    "  config:",
    ("    root: [" + $rootList + "]"),
    $end
)
$block = $lines -join $eol

$base = $stripped
if (-not $base.EndsWith($eol)) { $base += $eol }
$next = $base + $block + $eol

if ($DryRun) {
    Write-Host "[-DryRun] 检测到 dsh-hmr $ver，将写入 $patch ：" -ForegroundColor Cyan
    Write-Host $block
    return
}

Copy-Item $patch "$patch.good-$(Get-Date -Format yyyyMMdd-HHmmss)"
[System.IO.File]::WriteAllText($patch, $next)
Write-Host "已打开热加载（dsh-hmr $ver）。" -ForegroundColor Green
Write-Host "重启 DSH Desktop 一次后生效；此后改 client.js 约 2 秒自动重载。" -ForegroundColor Green
Write-Host "想撤销：pwsh -File scripts\enable-hmr.ps1 -Disable"
