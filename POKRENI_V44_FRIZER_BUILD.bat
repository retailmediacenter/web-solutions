@echo off
cd /d "%~dp0"
set "RMC_QA_LIVE_SLUGS=frizer"
echo QA BUILDER: frizer ima javni staging transport, ali NEMA privatnog koda u ZIP-u.
node scripts\publication\build.mjs
if errorlevel 1 (echo BUILD FAIL - NE objavljivati.) else (echo BUILD PASS - objaviti SAMO folder web-solutions-preview u javni Preview repo.)
pause
