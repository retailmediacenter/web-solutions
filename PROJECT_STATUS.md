# V41.2 — Preview / Commerce UX stabilization (24.09.2026)

**Osnova:** lokalno instalirana V41.1; ne dirati V39.5 i ne objavljivati automatski na Render MAIN.

## Popravke
- **Vinoteka u React preview-u:** uklonjen je privremeni `<base href>` iz `iframe srcDoc` jer je menjao odredište `#degustacije` u URL nadređene React aplikacije i ostavljao prazan preview. `site.css` i `export-runtime.js` sada koriste potpune adrese u preview-u, a svi `#` linkovi skroluju unutar svog dokumenta. Izvezeni ZIP i dalje koristi relativne adrese kako bi radio samostalno.
- **Sticky korpa tokom pregleda:** radna visina ugrađenog iframe-a prilagođava se vidljivom delu ekrana; uklonjena je neprimerena minimalna visina unutrašnjeg preview kontejnera. Samostalni sajt i njegova mobilna korpa nisu redizajnirani.
- **Prodavnica obuće, bez korpe:** `catalog`/`visit` goal sada prikazuje akciju *Proveri dostupnost*, sa izborom veličine i porukom za upit. Samo kupovni `purchase` cilj daje *Dodaj u korpu / Poruči sada*; različiti ciljevi se ne mešaju.
- **Degustacije i porudžbine:** postojeći zahtevi i dalje su poruke, a ne automatski potvrđene rezervacije ili naplata.

## Provere u ovom paketu
- 15/15 Node regresionih testova PASS, uključujući tri pilotska poslovanja, ZIP, i razlikovanje upita od kupovine.
- Headless Chromium: verifikovana navigacija `Vođena degustacija → Pronađi termin` **unutar izolovanog iframe srcDoc-a**, uspešno slanje test forme; obuća `Proveri dostupnost → validacija → pripremljena poruka`. Lokalni HTTP browser server nije bio dostupan u izvršnom test okruženju, pa su HTML, CSS i JS umetnuti u test da bi se izolovala navigacija i interakcije.
- React `npm run build` **mora proći lokalno u instalacionoj skripti pre bilo kakvog Git push-a**.

## Obuhvat
Samo V41.2 popravke za tri pilotska scenarija. Preostalih 69 delatnosti još nije migrirano. V39.5 i Render MAIN ostaju netaknuti. Nema punog React redizajna ili univerzalnog Booking engine-a u ovom paketu.

---

# RMC Web Solutions — glavni status dokument

**Poslednja ažurirana verzija:** V41.1, 24.09.2026.  
**Status:** funkcionalni React + Node pilot (3 od 72 delatnosti). Nije potpuna zamena za V39.5.

## Odluka i izvor istine

- **Zamrznut V39.5:** `D:\RMC\AI - chat GPT (BOB)\web solutions\web-solutions`. Ne menjati ga; predstavlja referencu za izgled, poslovnu logiku, module i postojeće regresione scenarije.
- **Novi V41:** `D:\RMC\AI - chat GPT (BOB)\web solutions\web-solutions-react-node`.
- **GitHub:** privatni repo `retailmediacenter/web-solutions`. Promene iz ovog paketa prvo stavljati na granu `migration/v41-1-functional`; **ne** spajati u `main` pre lokalnog ručnog testa.
- **Render:** postojeći Web Service `rmc-web-solutions-api`, trenutno objavljen sa V41 početnom verzijom. Deployment ostaje na main dok se nova grana ne proveri.
- **Webglobe:** postojeći retailmediacenter.com/web-solutions/ ne dirati tokom migracije.

## Autoritativna arhitektura

- **Business Registry V1:** originalne 72 činjenice iz V39.5; samo domen, identitet i namespace asseta, katalog dimenzije i atributi proizvoda. Bez CTA-a, stila, renderera, redosleda sekcija, ponašanja modala ili business decisions.
- **Advisor (Node):** identifikacija delatnosti, originalni profil pitanja (59 opštih scenarija preneto iz V39.5 data sloja), poseban flow za Mesaru / Vinoteku, cilj, stil i module plan. Preostalih 13 profila nema punu migraciju pitanja.
- **Commerce podaci:** 20 konfiguracija iz V39.5 registry-ja; runtime Commerce trenutno izveden samo za 3 testirana scenarija. Cene su demonstracione.
- **SiteConfig:** Node autoritet. React Studio ga dobija preko API-ja. Pregled generisanog sajta je sandbox iframe sa **istim statičkim HTML-om/CSS-om/JS-om koji ide u ZIP**. Ovo smanjuje mogućnost razilaženja preview-a i exporta.
- **Editor:** menjaće SiteConfig, još nije prenesen.
- **Images:** 29 originalnih, kuriranih JPEG-ova samo za 3 pilot scenarija uključeno u novi repo. Ostatak velike V39.5 biblioteke ostaje u postojećem direktorijumu/Webglobe-u.

## V41.1 — već urađeno i dokazano

### Mesara

- Originalni naziv/kategorije/asset slike 12 proizvoda iz V39.5.
- Odvojeno Advisor pitanje o načinu poručivanja **i obavezno** pitanje da li se meso priprema (`raw`/`grilled`). Server ne dozvoljava da se obavezno pitanje preskoči.
- Priprema `Sirovo / Grilovano` samo ako je aktivirana, i samo kod smislenih proizvoda.
- Cena po kg, količina +/- u koracima 0,5 kg, obračun ukupnog iznosa, cart modal i sticky bar sa totalom.

### Vinoteka

- Originalnih 6 proizvoda i vizuali iz V39.5 sa demonstracionim cenama.
- Uslovna degustacija: Advisor **pita** da li postoje degustacije. Ne podrazumevamo je.
- Ako DA: kartica „Vođena degustacija” vodi na sekciju „Degustacije” sa formom vrsta, datum, vreme, broj osoba, ime, telefon i napomena. Ovo je **zahtev** bez potvrde zauzetosti/rezervacije od strane servera.
- Ako NE: nema sekcije degustacije ni pripadajućeg CTA-a.

### Prodavnica obuće

- Kurirane slike sa postojećim V39.5 `shoe-shop` putanjama, demonstracione cene i izbor veličine. Korpa sa brojem i ukupnom vrednošću.

### Zajednički engine

- Server validira sve obavezne odgovore, dozvoljeni stil/cilj/naziv.
- Cene su ispisane jednom kada je količina 1; kada je veća, cena × količina i subtotal.
- Cart prilagođen mobilnom, uključujući vidljiva oba `−/+` dugmeta na 393 px.
- Korpa i degustacija generišu poruku za kopiranje/deljenje/WhatsApp; nema API naplate niti backend potvrđivanja dostupnosti.
- `POST /api/site/generate` vraća SiteConfig i identičan HTML koji Node koristi u `POST /api/site/export`.
- ZIP sadrži `index.html`, `site.css`, `export-runtime.js` i **samo** relevantne pilot slike. Nema kompletnog Advisor koda, Registry-ja ni Node izvornog koda u preuzetom sajtu.
- Cilj `purchase` uključuje korpu; `visit` ili `catalog` u ovom pilotu ne uključuju korpu.

## Status provera — precizno

- **Node testovi:** 13/13 PASS (izvornih 72 registry faktova, pitanja za obuću, prepoznavanje, obavezni special odgovori, sirovo/grilovano, DA/NE degustacije, sigurnost imenovanja, ZIP i primeri generisanja).
- **ZIP kontrola:** tri testna paketa (mesara, vinoteka, obuća) prošla `unzip -t`, bez grešaka.
- **Headless Chromium:** testiran render istog eksportovanog HTML/CSS/JS, korpa (računanje i sticky total), qty +/- na 393×852, izbor Grilovano, veličina obuće, navigacija ka degustaciji, forma i generisanje poruka. Browser QA je pokrenut sa inline CSS/JS i ugrađenim demo slikama jer je lokalna navigacija u test okruženju blokirana.
- **React parser:** `tsc --jsx preserve --noEmit` prolazi bez JSX sintaksnih grešaka.
- **NIJE potvrđeno u ovom okruženju:** pun `npm run build`/React + Express test uživo, jer ovaj kontejner nema pristup npm registru. Windows skripta korisnika **zahteva oba** (`npm test` + `npm run build`) pre nego što ponudi GitHub push.
- **NIJE migrirano:** preostalih 69 preview-a, dodatni V39.5 moduli, univerzalni Booking modovi osim degustacije, Editor, automatski publish i pravi podaci svih retail cena.

## Koraci za korisnika

1. Raspakovati `WEB_SOLUTIONS_V41_1_FUNCTIONAL_MIGRATION.zip` van postojećih projekata.
2. Pokrenuti `APPLY_V41_1.bat`: pravi backup nove V41 osnove, novu Git granu, kopira potrebne fajlove i pokreće oba testa.
3. Ako testovi prođu, skripta pita za **push na test granu**, nikada ne šalje direktno u `main`.
4. `START_LOCAL_DEV.bat` u `web-solutions-react-node`; otvoriti localhost:5173.
5. Ručno pregledati: Mesara DA/NE priprema, količina +/- i sticky total; Vinoteka DA/NE degustacije i booking forma; Obuća veličina i cart; završetak Advisora i preuzeti ZIP.
6. Tek potom napraviti Pull Request u main. Render automatski redeploy-uje svoj main servis. Zadržati Webglobe frontend netaknut do potpune migracije.

## Naredne migracione faze

1. Uvesti ostalih 69 poslovnih scenarija i njihove specifične Advisor odgovore, kataloge, proizvode i usluge. Stari `Business Registry` se **ne** proširuje UI logikom.
2. Universal Booking: `appointment`, `reservation`, `consultation`, `request-slot`, `pickup-slot`, `rental` (sa odgovarajućim tipovima polja); realna raspoloživost samo uz stvarnu backend persistenciju.
3. Portovati stari izgled indeks strane, 5 stilova kroz sve scenarije, ostale modulare (trust, reviews, lokacije, hibridi).
4. Editor iz SiteConfig-a i workflow za Publish/Export, uključujući bezbedno autentifikovano objavljivanje na Webglobe-u.
5. Realne cene i upravljanje katalogom; produkcijska sigurnost i stres testovi.

**Princip:** ni jedan scenario nije „migriran” samo zato što Business Registry sadrži njegov unos. Potrebno je da kompletan Advisor → Generate → Preview → poslovna interakcija → ZIP prođe test.
