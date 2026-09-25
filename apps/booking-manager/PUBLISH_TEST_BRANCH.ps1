$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$repo = (& git -C $src rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or !$repo) { throw 'Nisam u Git repozitorijumu. Prvo pokreni INSTALL_V43_1_2.bat u React/Node projektu.' }
$remote = & git -C $repo remote get-url origin
if ($LASTEXITCODE -ne 0) { throw 'Nedostaje Git origin.' }
Write-Host "Repo: $repo"; Write-Host "Origin: $remote"
Write-Host 'Radi se ISKLJUCIVO sa apps/booking-manager. Lokalni main i ostale izmene ne diramo.'
$ok = Read-Host 'Upisi OBJAVI za slanje samo Booking Managera na NOVI test branch'
if ($ok -ne 'OBJAVI') { Write-Host 'Prekinuto bez izmena.'; exit 0 }
& git -C $repo fetch origin main
if ($LASTEXITCODE -ne 0) { throw 'Git fetch nije uspeo. Proveri prijavu na GitHub.' }
$stage = Join-Path (Split-Path $repo -Parent) 'web-solutions-booking-github-test'
if (Test-Path $stage) { throw "Folder za staging vec postoji: $stage. Ne prepisujem ga automatski." }
$branch = 'v43-booking-test'
$exists = & git -C $repo branch --list $branch
if ($exists) { throw "Lokalni branch $branch vec postoji. Proveri ga pre novog objavljivanja." }
& git -C $repo worktree add -b $branch $stage origin/main
if ($LASTEXITCODE -ne 0) { throw 'Nije uspelo pravljenje izolovanog worktree-ja.' }
$target = Join-Path $stage 'apps/booking-manager'
New-Item -ItemType Directory -Path $target -Force | Out-Null
# Izostavi lokalne podatke, node_modules i build.
foreach ($name in @('src','public','scripts')) { Copy-Item -Path (Join-Path $src $name) -Destination $target -Recurse -Force }
foreach ($name in @('index.html','package.json','vite.config.mjs','.gitignore','START_LOCAL.bat','TEST_BUILD.bat','README.md')) { Copy-Item -Path (Join-Path $src $name) -Destination $target -Force }
# Deploy doc unutar branch-a; bez promene postojecih Render API podesavanja.
& git -C $stage add apps/booking-manager
if ($LASTEXITCODE -ne 0) { throw 'Git add nije uspeo.' }
& git -C $stage commit -m 'Add isolated V43 booking manager Vite PWA test'
if ($LASTEXITCODE -ne 0) { throw 'Git commit nije uspeo.' }
& git -C $stage push -u origin $branch
if ($LASTEXITCODE -ne 0) { throw 'Git push nije uspeo; staging folder je sacuvan.' }
Write-Host 'USPEH. Na Render-u izaberi POSTOJECI repo, novi Static Site i branch v43-booking-test.'
Write-Host 'Root Directory: apps/booking-manager | Build: npm install && npm run build | Publish: dist'
