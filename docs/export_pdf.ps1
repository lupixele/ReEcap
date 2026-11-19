$src = (Resolve-Path 'docs/documentation.docx').Path
$pdf = $src -replace '\.docx$', '.pdf'
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $doc = $word.Documents.Open($src)
    $doc.Fields.Update()
    foreach ($toc in $doc.TablesOfContents) {
        $toc.Update()
    }
    $doc.SaveAs([ref]$pdf, [ref]17) # 17 = wdFormatPDF
    $doc.Close([ref]0)
    $word.Quit()
    Write-Host "Successfully generated $pdf with updated TOC!"
} catch {
    Write-Host "Word COM export error: $($_.Exception.Message)"
}
