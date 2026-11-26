$ErrorActionPreference = 'Stop'
$stockInvestKeyring = Join-Path (npm.cmd root -g) '@napi-rs/keyring'
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $stockInvestKeyring)) {
    throw 'The Windows Credential Manager library was not found.'
}
# Pass JavaScript on stdin so Windows PowerShell 5.1 cannot strip the quotes.
$stockInvestReader = @'
const { Entry } = require(process.argv[2]);
const entry = new Entry("StockInvest Family Records", "whanny74.github.io/StockInvest");
const value = entry.getPassword();
if (!value) process.exit(1);
process.stdout.write(value);
'@
try {
    $stockInvestCode = $stockInvestReader | node.exe - $stockInvestKeyring
    if ($LASTEXITCODE -ne 0 -or -not $stockInvestCode) {
        throw 'No StockInvest family code was found for this Windows account.'
    }
    Set-Clipboard -Value $stockInvestCode
} finally {
    Remove-Variable stockInvestCode -ErrorAction SilentlyContinue
}
Write-Output 'Family code copied. Paste it into the StockInvest record page.'
