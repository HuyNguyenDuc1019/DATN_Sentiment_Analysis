$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot

Push-Location -LiteralPath (Join-Path $repositoryRoot 'frontend')
try {
    npm run check
}
finally {
    Pop-Location
}

Push-Location -LiteralPath (Join-Path $repositoryRoot 'scraper')
try {
    npm test
}
finally {
    Pop-Location
}

$backendPython = Join-Path $repositoryRoot 'backend/venv/Scripts/python.exe'
if (Test-Path -LiteralPath $backendPython) {
    Push-Location -LiteralPath (Join-Path $repositoryRoot 'backend')
    try {
        & $backendPython -m unittest discover -s tests -v
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Warning 'Không tìm thấy backend/venv; đã bỏ qua kiểm tra unit test backend.'
}

Write-Host 'Đã hoàn tất kiểm tra dự án.'
