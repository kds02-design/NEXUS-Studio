param(
    [Parameter(Mandatory=$true)][string]$Path,
    [string]$Search,
    [switch]$Pairs,
    [switch]$PairsOnly,
    [ValidateSet('pt-BR','es-MX')][string]$Locale = 'pt-BR',
    [int]$SampleLimit = 25
)

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
try {
    function Read-ZipXml([string]$entryName) {
        $entry = $zip.GetEntry($entryName)
        if (-not $entry) { return $null }
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
    }

    $shared = @()
    $sharedXml = Read-ZipXml 'xl/sharedStrings.xml'
    if ($sharedXml) {
        foreach ($si in $sharedXml.sst.si) { $shared += [string]$si.InnerText }
    }

    $book = Read-ZipXml 'xl/workbook.xml'
    $rels = Read-ZipXml 'xl/_rels/workbook.xml.rels'
    $relMap = @{}
    foreach ($rel in $rels.Relationships.Relationship) { $relMap[[string]$rel.Id] = [string]$rel.Target }

    $result = @()
    foreach ($sheet in $book.workbook.sheets.sheet) {
        $rid = [string]$sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
        $target = $relMap[$rid] -replace '^/', ''
        if ($target -notmatch '^xl/') { $target = 'xl/' + $target.TrimStart('/') }
        $xml = Read-ZipXml $target
        $rowsOut = @()
        $pairsOut = @()
        foreach ($row in @($xml.worksheet.sheetData.row)) {
            $cells = [ordered]@{}
            foreach ($cell in $row.c) {
                $value = $null
                $type = [string]$cell.t
                if ($type -eq 's' -and $null -ne $cell.v) { $value = $shared[[int]$cell.v] }
                elseif ($type -eq 'inlineStr') {
                    $value = [string]$cell.is.InnerText
                }
                elseif ($null -ne $cell.v) { $value = [string]$cell.v }
                if ($null -ne $value -and $value -ne '') { $cells[[string]$cell.r] = $value }
            }
            if ($cells.Count -gt 0) {
                if ($Pairs -and [string]$sheet.name -eq 'L10n') {
                    $localeColumns = if ($Locale -eq 'es-MX') {
                        @(@('Q','K'), @('R','L'), @('BW','AM'), @('CA','AQ'))
                    } else {
                        @(@('Q','M'), @('R','N'), @('BW','AY'), @('CA','BC'))
                    }
                    foreach ($cols in $localeColumns) {
                        $krRef = $cols[0] + [string]$row.r
                        $ptRef = $cols[1] + [string]$row.r
                        if ($cells.Contains($krRef) -and $cells.Contains($ptRef)) {
                            $kr = [string]$cells[$krRef]
                            $pt = [string]$cells[$ptRef]
                            if ($kr.Trim() -and $pt.Trim() -and $kr.Trim() -ne $pt.Trim()) {
                                $pairsOut += [pscustomobject]@{ row = [int]$row.r; krCell = $krRef; targetCell = $ptRef; kr = $kr; target = $pt }
                            }
                        }
                    }
                }
                $matches = -not $Search
                if ($Search) { foreach ($v in $cells.Values) { if ([string]$v -like "*$Search*") { $matches = $true; break } } }
                if ($matches -and ($Search -or $rowsOut.Count -lt $SampleLimit)) { $rowsOut += [pscustomobject]@{ row = [int]$row.r; cells = $cells } }
            }
        }
        $result += [pscustomobject]@{
            name = [string]$sheet.name
            state = [string]$sheet.state
            dimension = if ($xml.worksheet.dimension) { [string]$xml.worksheet.dimension.ref } else { $null }
            sampleRows = $rowsOut
            pairs = $pairsOut
        }
    }
    if ($PairsOnly) {
        @($result | Where-Object { $_.name -eq 'L10n' } | Select-Object -ExpandProperty pairs | ForEach-Object {
            [pscustomobject]@{ kr = $_.kr.Trim(); target = $_.target.Trim() }
        }) | ConvertTo-Json -Depth 4 -Compress
    } else {
        $result | ConvertTo-Json -Depth 8
    }
}
finally { $zip.Dispose() }
