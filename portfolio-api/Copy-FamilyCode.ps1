$ErrorActionPreference = 'Stop'
$stockInvestKeyring = Join-Path (npm root -g) '@napi-rs/keyring'
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $stockInvestKeyring)) {
    throw 'Windows 자격 증명 보관함 라이브러리를 찾을 수 없습니다.'
}
try {
    $stockInvestCode = node -e 'const { Entry } = require(process.argv[1]); const value = new Entry("StockInvest Family Records", "whanny74.github.io/StockInvest").getPassword(); if (!value) process.exit(1); process.stdout.write(value);' $stockInvestKeyring
    if ($LASTEXITCODE -ne 0 -or -not $stockInvestCode) {
        throw '이 Windows 계정에 보관된 가족 공용 코드가 없습니다.'
    }
    Set-Clipboard -Value $stockInvestCode
} finally {
    Remove-Variable stockInvestCode -ErrorAction SilentlyContinue
}
Write-Output '가족 공용 코드를 클립보드에 복사했습니다. 기록지의 코드 입력칸에 붙여넣으세요.'
