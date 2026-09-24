# RMC Web Solutions — jedinstveni projektni status

**Verzija:** V41.3 — Retail / Commerce migracioni kandidat, 24.09.2026.  
**Status:** 13 funkcionalnih testnih scenarija od 72 registrovane delatnosti. Nije potpuna zamena za V39.5.

## Autoritativna polazna tačka

- **V39.5 je zamrznuta referenca:** `D:\RMC\AI - chat GPT (BOB)\web solutions\web-solutions` — ne menjati.
- **Nova aplikacija:** `D:\RMC\AI - chat GPT (BOB)\web solutions\web-solutions-react-node` — React/Vite frontend, Express/Node backend, jedan izvorni SiteConfig, isti HTML za iframe Preview i ZIP.
- **GitHub:** privatni `retailmediacenter/web-solutions`. V41.3 instalirati na novu testnu granu `migration/v41-3-retail`, ne na `main`.
- **Render:** postojeći API na `main` ostaje netaknut do odobrenog spajanja nove grane. **Webglobe** ostaje na postojećoj verziji tokom migracije.
- **Business Registry V1:** 72 fakta: ID, domain, assetRoot/roles, catalogDimensions, productAttributes. **Ne sadrži CTA, renderer, style, module plan ni modal ponašanje.** Advisor je autoritet za cilj i module plan.

## Šta je već radilo u V41.2 i ostaje neizmenjeno

1. Mesara: obavezno DA/NE za pripremu, Sirovo/Grilovano samo gde ima smisla, kg ±0,5, cena i sticky subtotal.
2. Vinoteka: obavezno DA/NE za degustacije, sekcija i forma samo ako je DA; link „Vođena degustacija“ radi i unutar React Preview iframe-a, kao i u preuzetom ZIP-u.
3. Obuća: veličine, korpa ako je cilj kupovina, odnosno upit o dostupnosti ako nije. 
4. Jedinstveni statički renderer i pregled bez propuštanja Advisor/Registry/Generator izvornog koda u export.

## V41.3 — novih 10 scenarija (ukupno 13)

| Delatnost | V39.5 osnova | Testna logika |
|---|---|---|
| Modni butik | 17 originalnih kuriranih proizvoda/slika | korpa + veličina/boja |
| Mini market | 12 originalnih proizvoda/slika | korpa + sticky total |
| Prodavnica pića | 15 originalnih proizvoda/slika | korpa + opciona varijanta |
| Kućni dekor | 6 originalnih proizvoda/slika | korpa + boja/dimenzije |
| Prodavnica elektronike | 7 originalnih proizvoda/slika | korpa + model/varijanta |
| Prodavnica telefona | 10 originalnih proizvoda/slika | korpa + model/boja |
| Salon nameštaja | 12 originalnih proizvoda/slika | **upit**, bez izmišljene kupovine |
| Auto delovi | 12 originalnih proizvoda/slika | **upit** + marka/model/godište |
| Vodovodni materijal | 12 originalnih proizvoda/slika | **upit** + specifikacija |
| Elektromaterijal | 12 originalnih proizvoda/slika | **upit** + specifikacija |

V39.5 `business-commerce-registry-v39-5` ostaje autoritet za izvorni `cart`/`inquiry` način. Testne pozitivne cene su **ilustrativne, nisu stvarni cenovnici**. Korisnik može da proveri prikaz i sumiranje; potvrda dostupnosti i plaćanje ne postoje. Model/boja/specifikacija pamte se zasebno po korpinoj stavci ili se šalju kao deo upita. Nove delatnosti koriste svoje originalne JPEG-ove iz V39.5 arhive, ne generičke placeholder slike.

**Granice:** izvorni V39.5 sadrži i dodatnu business-specific logiku, Trust, Reviews, razne uslužne/booking sekcije i 5 stilova. V41.3 još **ne dokazuje potpun vizuelni i poslovni paritet** tih dodatnih modula, niti uvodi Universal Booking za nove kategorije. Cena u testu se mora zameniti realnom pre objavljivanja klijenta. U produkciji se i dalje koristi stari frontend.

## Provera

- **Node regresije:** 22/22 PASS, uključujući sve iz V41.2, novu grupu 10, proveru izvornih asset putanja, V39.5 cart/inquiry granica, 10 ZIP-ova i prepoznavanje srpskog opisa.
- **Chromium funkcionalni test bez mreže:** 13/13 samostalnih HTML verzija otvara proizvod i modal bez JS exception; dodatno testirani telefon varijanta/korpa, auto delovi specifikacija/upit i sticky cart mini-marketa na 393×852. Test je rađen sa inline identičnim izvoznim CSS/JS radi mrežnih ograničenja sandbox-a. Slike su potvrđene kao prisutne i ZIP ih pakuje, ali browser screenshot ovde ne dokazuje konačan izgled na korisnikovom Windowsu.
- **Kompletan Vite React build nije pokrenut u ovom kontejneru** zbog nedostupnog npm paketa; lokalna Windows skripta obavezno izvršava `npm test` i `npm run build` pre opcije GitHub push.

## Kako primeniti ovu verziju

1. Raspakovati `WEB_SOLUTIONS_V41_3_RETAIL_WAVE.zip` u zaseban folder, van postojećeg projekta.
2. Pokrenuti `APPLY_V41_3.bat`. Skripta proverava da li je postojeća baza V41.2, čisto Git stanje i pravi rezervnu kopiju **nove** aplikacije pre nego što menja fajlove.
3. Kreira se nova lokalna Git grana `migration/v41-3-retail` iz trenutno testirane V41.2 verzije. Pokreću se Node testovi i kompletan React build. **Nema automatskog objavljivanja na Renderu ni izmene V39.5**. Opcioni GitHub push je isključivo na novoj testnoj grani.
4. Ponovo pokrenuti `START_LOCAL_DEV.bat`, zatim lokalno otvoriti React sajt i testirati: Mini market sticky subtotal; Telefon model/boja u korpi; Auto delovi upit; ponovno proveriti Mesaru, Vinoteku i Obuću; preuzeti ZIP iz najmanje jednog novog scenarija.

## Redosled završetka preostalih 59 delatnosti

1. **V41.4 – preostali retail/hibridne usluge:** kategorije s mešovitim Commerce i servisnim modelom (optika, servis telefona, farmacija, gume i dr.).
2. **V41.5 – Universal Booking** za beauty, ugostiteljstvo, healthcare, profesionalne usluge, majstore, događaje i rental. Svaka varijanta ima poslovno uslovno Advisor pitanje, polja i svoj request/confirmation model; nikad lažno potvrđivanje bez persistence/availability servisa.
3. **V41.6 – ostale industrije i puni modulni paritet** (reviews, trust, team, FAQ, hibridi, lokacije/mapa, svih pet stilova) i automatizovani QA za svih 72.
4. **V41.7 – Editor, export/publish i finalno usaglašavanje** sa originalnim V39.5 frontendom. Tek tada odluka o zameni javnog Webglobe sajta.

**Politika kvaliteta:** nijedna delatnost nije „migrirana“ samo zato što je u registru. Za svaki ID mora da prođe Advisor → završni korak → Node Generate → Preview → relevantna poslovna akcija → samostalan ZIP, plus bar jedna mobilna provera po vrsti modula.
