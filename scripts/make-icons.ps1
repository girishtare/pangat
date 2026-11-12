# Makes the site icons from docs/brand/pangat-favicon-icon.png (Windows, built-in .NET imaging; nothing to install).
# Usage: pwsh scripts/make-icons.ps1 -Src docs/brand/pangat-favicon-icon.png -OutDir src/app
# Writes icon.png (512, transparent), apple-icon.png (180, on cream) and favicon.ico (32 + 48).
param([string]$Src, [string]$OutDir)
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$bmp = [System.Drawing.Bitmap]::FromFile($Src)
$w = $bmp.Width; $h = $bmp.Height

# White to transparent ("colour to alpha"), via LockBits for speed.
$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$src32 = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$data = $src32.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$n = $data.Stride * $h
$px = New-Object byte[] $n
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $px, 0, $n)
$minX = $w; $minY = $h; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $h; $y++) {
  $row = $y * $data.Stride
  for ($x = 0; $x -lt $w; $x++) {
    $i = $row + $x * 4
    # The source is already transparent: keep its alpha, clear faint specks.
    $a = $px[$i + 3] / 255.0
    if ($a -lt 0.10) { $px[$i + 3] = 0; $px[$i] = 0; $px[$i + 1] = 0; $px[$i + 2] = 0; continue }
    if ($a -ge 0.5) {
      if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
[System.Runtime.InteropServices.Marshal]::Copy($px, 0, $data.Scan0, $n)
$src32.UnlockBits($data)
"content box: $minX,$minY - $maxX,$maxY"

function Render([int]$size, [double]$pad, [string]$bg, [string]$path) {
  $cw = $maxX - $minX + 1; $ch = $maxY - $minY + 1
  $side = [Math]::Max($cw, $ch) * (1 + 2 * $pad)
  $sx = ($minX + $maxX) / 2.0 - $side / 2; $sy = ($minY + $maxY) / 2.0 - $side / 2
  $out = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gr = [System.Drawing.Graphics]::FromImage($out)
  $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gr.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gr.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  if ($bg) { $gr.Clear([System.Drawing.ColorTranslator]::FromHtml($bg)) } else { $gr.Clear([System.Drawing.Color]::Transparent) }
  $dst = New-Object System.Drawing.RectangleF 0, 0, $size, $size
  $srcR = New-Object System.Drawing.RectangleF ([single]$sx), ([single]$sy), ([single]$side), ([single]$side)
  $attr = New-Object System.Drawing.Imaging.ImageAttributes
  $attr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $gr.DrawImage($src32, [System.Drawing.Rectangle]::Round($dst), $srcR.X, $srcR.Y, $srcR.Width, $srcR.Height, [System.Drawing.GraphicsUnit]::Pixel, $attr)
  $gr.Dispose()
  $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
}

# Browser tab icon: transparent, little padding so it reads at 16-32 px.
Render 512 0.04 $null (Join-Path $OutDir 'icon.png')
# Apple touch icon: iOS fills transparency with black, so cream background and more padding.
Render 180 0.14 '#f5efe1' (Join-Path $OutDir 'apple-icon.png')
# favicon.ico: 32 and 48 px PNGs inside an ICO container.
$tmp32 = Join-Path $OutDir '_32.png'; $tmp48 = Join-Path $OutDir '_48.png'
Render 32 0.04 $null $tmp32
Render 48 0.04 $null $tmp48
$imgs = @([System.IO.File]::ReadAllBytes($tmp32), [System.IO.File]::ReadAllBytes($tmp48))
$sizes = @(32, 48)
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$imgs.Count)
$offset = 6 + 16 * $imgs.Count
for ($k = 0; $k -lt $imgs.Count; $k++) {
  $bw.Write([byte]$sizes[$k]); $bw.Write([byte]$sizes[$k]); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([UInt16]1); $bw.Write([UInt16]32); $bw.Write([UInt32]$imgs[$k].Length); $bw.Write([UInt32]$offset)
  $offset += $imgs[$k].Length
}
foreach ($im in $imgs) { $bw.Write($im) }
$bw.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $OutDir 'favicon.ico'), $ms.ToArray())
Remove-Item $tmp32, $tmp48
$src32.Dispose(); $bmp.Dispose()
Get-ChildItem $OutDir | Select-Object Name, Length
