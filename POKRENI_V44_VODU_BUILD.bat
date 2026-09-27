@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "RMC_QA_LIVE_SLUGS=frizer,vodoinstalater"
echo [RMC] STAGING QA: frizer EXACT_TIME + vodoinstalater DAY_PART.
echo [RMC] Ne menjam QA SITE ID, ne izdajem kod, ne objavljujem automatski.
node scripts\publication\build.mjs
if errorlevel 1 (
  echo BUILD FAIL - NISTA NE OBJAVLJIVATI.
) else (
  echo PUBLICATION PASS - kopiraj SAMO RMC_PUBLICATION_OUT\web-solutions-preview u javni Preview repo.
)
pause
