$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

$git = @(
  "$env:ProgramFiles\Git\bin\git.exe",
  "$env:ProgramFiles (x86)\Git\bin\git.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $git) {
  $git = (Get-Command git -ErrorAction SilentlyContinue).Source
}
if (-not $git) {
  Write-Host 'Git não encontrado. Instale em https://git-scm.com/'
  exit 1
}

$status = & $git status --porcelain
if (-not $status) {
  Write-Host 'Nada novo para enviar — nuvem já está em dia.'
  & $git push origin main 2>$null
  exit 0
}

$msg = if ($args[0]) { $args[0] } else { "Sync $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
& $git add -A
& $git commit -m $msg
& $git push origin main
Write-Host 'Enviado! O site atualiza em 1-2 min:'
Write-Host 'https://gabrielvarella7.github.io/gvs-fut-manager/'