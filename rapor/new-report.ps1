param(
  [Parameter(Mandatory = $true)]
  [string]$Title
)

$root = Split-Path -Parent $PSScriptRoot
$dateFolder = Get-Date -Format 'yyyy-MM-dd'
$timeStamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$safeTitle = ($Title.ToLower() -replace '[^a-z0-9]+','-').Trim('-')
$reportDir = Join-Path $PSScriptRoot $dateFolder
$fileName = "{0}_{1}.md" -f $timeStamp, $safeTitle
$filePath = Join-Path $reportDir $fileName

New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

$content = @"
# $Title

- Zaman: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- Kapsam: `proptrex_radar`

## Ozet

## Degisen Dosyalar

"@

Set-Content -Path $filePath -Value $content -Encoding UTF8
Write-Output $filePath

