$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pasoNode = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($pasoNode) {
    $pasoMajor = [int]((& $pasoNode --version).TrimStart('v').Split('.')[0])
} else { $pasoMajor = 0 }
if ($pasoMajor -lt 24) {
    $pasoBundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $pasoBundledNode) { $pasoNode = $pasoBundledNode }
    else { throw 'Instalá Node.js 24 o superior para iniciar Paso.' }
}
Write-Host 'Paso: http://localhost:5173 — Ctrl+C para detener.'
& $pasoNode (Join-Path $PSScriptRoot 'server\index.js')
