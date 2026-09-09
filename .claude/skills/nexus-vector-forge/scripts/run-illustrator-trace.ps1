# nexus-vector-forge — 로컬 Illustrator 로 Image Trace 실행 (Windows COM)
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File run-illustrator-trace.ps1 `
#       -InputPng <bw.png> -OutDir <dir> -Name <base> [-Threshold 128] [-Paths 50] [-Corners 75] [-Noise 25] [-TimeoutSec 300]
#
# 산출: <OutDir>\<Name>.svg, <Name>.ai, <Name>_trace.png (QA 용 1:1 래스터). stdout 마지막 줄 = result JSON.
# Illustrator 가 꺼져 있으면 COM 이 자동 실행하고, 작업 후 종료하지 않는다(사용자 세션 보존).
# 입력은 vectorize.mjs 가 만든 이진화 PNG(검정 잉크/흰 배경) 를 쓴다. 반전·알파 처리는 여기서 하지 않는다.

param(
  [Parameter(Mandatory = $true)][string]$InputPng,
  [string]$OutDir = '',
  [string]$Name = '',
  [int]$Threshold = 128,
  [int]$Paths = 50,
  [int]$Corners = 75,
  [int]$Noise = 25,
  [int]$TimeoutSec = 300,
  [int]$Snap = 1   # 1 = Image Trace '곡선을 직선에 스냅' 켬 (정리 단계 대응)
)

$ErrorActionPreference = 'Stop'
# 한글 경로가 stdout 에서 깨지지 않도록 UTF-8 고정 (Node 가 JSON 을 파싱함)
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false); $OutputEncoding = [Console]::OutputEncoding } catch {}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
  [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}
function Emit-Result($obj) { Write-Output ($obj | ConvertTo-Json -Compress) }

$InputPng = (Resolve-Path $InputPng).Path
if (-not $OutDir) { $OutDir = Split-Path $InputPng -Parent }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force $OutDir | Out-Null }
$OutDir = (Resolve-Path $OutDir).Path
if (-not $Name) { $Name = [System.IO.Path]::GetFileNameWithoutExtension($InputPng) -replace '_bw$', '' }

$jobDir = Join-Path $env:TEMP 'nexus-vector-forge'
if (-not (Test-Path $jobDir)) { New-Item -ItemType Directory -Force $jobDir | Out-Null }
$jobPath = Join-Path $jobDir 'job.json'
$resultPath = Join-Path $jobDir ('result_' + [DateTime]::Now.ToString('yyyyMMdd_HHmmss') + '.json')
if (Test-Path $resultPath) { Remove-Item $resultPath -Force }

$svgPath = Join-Path $OutDir ($Name + '.svg')
$aiPath = Join-Path $OutDir ($Name + '.ai')
$tracePng = Join-Path $OutDir ($Name + '_trace.png')
foreach ($p in @($svgPath, $aiPath, $tracePng)) { if (Test-Path $p) { Remove-Item $p -Force } }

$job = [ordered]@{
  input = $InputPng; svg = $svgPath; ai = $aiPath; tracePng = $tracePng; result = $resultPath
  threshold = $Threshold; paths = $Paths; corners = $Corners; noise = $Noise; snap = ($Snap -ne 0)
}
Write-Utf8NoBom $jobPath ($job | ConvertTo-Json -Compress)

$jsx = Join-Path $PSScriptRoot 'illustrator-trace.jsx'
if (-not (Test-Path $jsx)) { Emit-Result @{ ok = $false; error = "JSX 없음: $jsx" }; exit 1 }

try {
  $ai = New-Object -ComObject 'Illustrator.Application'
} catch {
  Emit-Result @{ ok = $false; error = "Illustrator COM 실행 실패 (설치·라이선스 확인): $($_.Exception.Message)" }
  exit 1
}

try {
  # 세 번째 인자(ExecuteContext) 는 생략 — 기본 컨텍스트. 인자 배열로 job 경로 전달, JSX 는 없으면 기본 경로를 읽는다.
  $null = $ai.DoJavaScriptFile($jsx, @($jobPath))
} catch {
  # 일부 환경은 인자 전달을 거부 — 인자 없이 재시도 (JSX 가 기본 job.json 경로를 읽음)
  try { $null = $ai.DoJavaScriptFile($jsx) } catch {
    Emit-Result @{ ok = $false; error = "DoJavaScriptFile 실패: $($_.Exception.Message)" }
    exit 1
  }
}

$deadline = (Get-Date).AddSeconds($TimeoutSec)
while (-not (Test-Path $resultPath) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
if (-not (Test-Path $resultPath)) {
  Emit-Result @{ ok = $false; error = "결과 대기 시간 초과 ($TimeoutSec s). Illustrator 대화상자가 떠 있는지 확인" }
  exit 1
}
$res = Get-Content $resultPath -Raw -Encoding UTF8 | ConvertFrom-Json
$obj = [ordered]@{}
foreach ($prop in $res.PSObject.Properties) { $obj[$prop.Name] = $prop.Value }
Emit-Result $obj
if ($res.ok) { exit 0 } else { exit 1 }
