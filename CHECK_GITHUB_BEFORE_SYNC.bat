@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "OUT=%~dp0GITHUB_SYNC_CHECK_RESULT.txt"
where git >nul 2>&1
if errorlevel 1 (echo GRESKA: Git nije dostupan u PATH-u.& pause & exit /b 1)
if not exist ".git" (echo GRESKA: BAT mora biti u glavnom folderu web-solutions-react-node.& pause & exit /b 1)
(
 echo WEB SOLUTIONS - GITHUB SYNC PREDPROVERA
 echo Datum i vreme: %date% %time%
 echo Projekat: %CD%
 echo ==========================================================
 echo [LOKALNA GRANA I COMMIT]
 git branch --show-current
 git log -1 --format="%%h %%s"
 echo.
 echo [GRANE I VEZE]
 git branch -vv
 echo.
 echo [WORKTREE - PROVERA POSEBNE V43 GRANE]
 git worktree list
 echo.
 echo [LOKALNO IZMENJENI FAJLOVI - BEZ FOTOGRAFIJA]
 git diff --name-status -- . ":(exclude)client/public/assets" ":(exclude)client/dist"
 echo.
 echo [STAGED FAJLOVI - BEZ FOTOGRAFIJA]
 git diff --cached --name-status -- . ":(exclude)client/public/assets" ":(exclude)client/dist"
 echo.
 echo [NEPRAĆENI FAJLOVI - BROJ I RELEVANTNI PUTOKAZI]
 for /f %%A in ('git ls-files --others --exclude-standard ^| find /c /v ""') do echo Nepraćenih: %%A
 if exist "server\src\booking-queue.js" echo OK: server/src/booking-queue.js
 if exist "server\src\booking-routes.js" echo OK: server/src/booking-routes.js
 if exist "client\public\booking-submit.js" echo OK: client/public/booking-submit.js
 if exist "apps\booking-manager\src\queue-client.mjs" echo OK: apps/booking-manager/src/queue-client.mjs
 echo.
 echo [REMOTE BRANCHES - LIVE GITHUB PROVERA]
 git ls-remote --heads origin
 echo.
 echo [RENDER DEFINICIJA U LOKALNOM PROJEKTU]
 if exist render.yaml type render.yaml
 echo.
 echo [NAPOMENA]
 echo Ovaj alat ne pravi commit, ne radi pull, push, reset ili checkout.
 echo Ne salji .env, Upstash tokene niti GitHub pristupne podatke.
) > "%OUT%" 2>&1

echo Provera zavrsena. Rezultat: GITHUB_SYNC_CHECK_RESULT.txt
echo Ako sekcija LIVE GITHUB PROVERA sadrzi gresku, to je signal da pristup nije dostupan.
pause
