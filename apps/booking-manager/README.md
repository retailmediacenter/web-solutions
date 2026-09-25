# V43.1.2 — RMC Booking Manager / Vite PWA / GitHub test branch

**Svrha:** samostalan statički Vite build postojećeg V43.1.1 Booking Managera. Ne prepravlja React/Node generator i ne objavljuje `main`.

## Lokalno

1. Raspakuj folder `V43_1_2_VITE_GITHUB_TEST` u glavni `web-solutions-react-node`.
2. Pokreni `INSTALL_V43_1_2.bat`; kopira samo `apps/booking-manager`.
3. Pokreni `apps/booking-manager/START_LOCAL.bat`. Otvori `http://localhost:4184`.
4. Za automatske testove i produkcioni PWA build koristi `TEST_BUILD.bat`.

Instalacija zavisi od interneta prilikom `npm install`. Podaci se čuvaju u browseru uređaja, ne na serveru.
Stari V43.1 na `localhost:4174` ostaje netaknut. Novi Vite koristi `4184` pa **ne nasleđuje rezervacije iz starog porta**. Stare podatke prenesi isključivo izvozom i uvozom backup JSON-a.

## Bez menjanja GitHub main brancha

Samo kada želiš da postaviš test, dvaput klikni na `apps/booking-manager/PUBLISH_TEST_BRANCH.bat` (alternativno u PowerShell-u pokreni `./PUBLISH_TEST_BRANCH.ps1`).
Skripta prikazuje remote i traži da upišeš `OBJAVI`. Pravi zaseban Git worktree od `origin/main`, kopira **samo** Booking Manager, pravi branch `v43-booking-test` i šalje ga u postojeći GitHub repo. Ništa iz tvojih lokalnih, još neobjavljenih React/Node promena ne ulazi u taj branch.
Ako PowerShell blokira skripte, u tom folderu pokreni `powershell -NoProfile -ExecutionPolicy Bypass -File .\PUBLISH_TEST_BRANCH.ps1`.
Nemoj ručno kopirati ceo React/Node projekat na `main` zbog ovog testa.

## HTTPS / Render Static Site

Na Render-u napravi **NOVI Static Site**, poveži isti GitHub repo i izaberi **branch `v43-booking-test`**.
- Root Directory: `apps/booking-manager`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Node: 22 (ako se traži, env `NODE_VERSION=22`)

Tvoj postojeći Render API i dalje koristi svoj postojeći branch i konfiguraciju. Novi statički servis dobija posebnu HTTPS adresu na kojoj otvaraš Manager na telefonu. Nema potrebe da javno postavljaš generator.

## Instalacija na telefon

Android: otvori HTTPS test-adresu u Chrome-u i izaberi `Install app` / `Dodaj na početni ekran` ako je ponuđeno.
iPhone: otvori HTTPS u Safariju, Share → Add to Home Screen.
Instalacija je opciona. Testiraj prvo u mobilnom browseru, potom sa ikone, potom slanje iz Vibera/WhatsAppa.
**Rezervacije u browseru i instaliranoj PWA možda nisu ista lokalna baza.** Izvezi/uvezi JSON i koristi jedan glavni uređaj. Obrati pažnju na Viber/WhatsApp ugrađeni browser.

## Proverene funkcije

V43.1.2 koristi V43.1.1 izvor sa WhatsApp/Viber dugmadima. Uklonjeno vidljivo `Kopiraj`, a `.ics` dugme preimenovano u `Dodaj u moj kalendar`. `.ics` generiše fajl — NE obećava automatsku sinhronizaciju, nego ga vlasnik uvozi ako njegov kalendar to podržava.
Na GitHub/Render-u je za sada samo **Booking Manager**, bez automatskih Booking Linkova, enkripcije ličnih podataka i povezanosti sa lokalnim generisanim sajtovima. To dolazi u V43.2.

**Bezbednost testa:** koristi isključivo izmišljene lične podatke. HTTPS serviranje samo po sebi ne štiti podatke u budućim Booking Linkovima. Ne šalji stvarne zahteve dok ne rešimo šifrovanje, uvoz i zaštitu od duplikata.
