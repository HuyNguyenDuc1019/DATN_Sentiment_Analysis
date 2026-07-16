$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repositoryRoot

if (-not (Test-Path -LiteralPath '.git')) {
    throw 'Hãy chạy script trong bản sao Git của dự án.'
}

# Chỉ bỏ theo dõi trong Git; các file cục bộ vẫn được giữ nguyên trên máy.
git rm -r --cached --ignore-unmatch -- 'scraper/chrome_profile'
git rm --cached --ignore-unmatch -- 'scraper/ngrok.exe'
git rm --cached --ignore-unmatch -- 'ml_training/*.mp4'

Write-Host 'Đã bỏ theo dõi cache Chrome, ngrok.exe và video huấn luyện khỏi Git.'
Write-Host 'Hãy kiểm tra bằng git status rồi commit các thay đổi này.'
