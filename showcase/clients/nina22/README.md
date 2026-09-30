# NINA 22 — V3.7 PREMIUM / SEO (glavni status)

**Status:** Samostalni demonstracioni sajt, spreman za postavljanje u `web-solutions-showcase`. Web Solutions generator/Editor V47 nije menjan niti kopiran. Ovaj projekat sadrži *pripremne* klijentske podatke, lokalne slike, CSS i JS; **nije već integrisan sa Editorom**. `data-editor-key` markeri su priprema, ne funkcionalni Editor.

## Pokretanje i objavljivanje
- Lokalno otvoriti `index.html` (najbolje preko lokalnog servera) ili `python -m http.server 8080` iz ovog foldera.
- Showcase repo: sadržaj ZIP paketa ide u **koren** `web-solutions-showcase`, a ovaj sajt ostaje u `clients/nina22/`.
- GitHub Pages: `Settings → Pages → Deploy from branch → main → /(root)`. Showcase otvara NINA 22 preko relativne putanje.
- Za izmenu tekstova: urediti `data/site.json`, za putanje slika `data/images.json`, za boje `data/theme.json`. Posle izmena konfiguracije, iz foldera `clients/nina22` pokrenuti `npm run build`. **Nisu potrebni `npm install` ni dodatne zavisnosti.** Postojeći `index.html` je već generisan, pa GitHub Pages ne zahteva Node build.

## Zamena fotografija bez Editora i bez builda
Zameniti fotografiju u **istom folderu pod istim nazivom i ekstenzijom**. Nije potrebno menjati HTML, CSS, JS ili pokretati build. Ako Marina dostavi JPG/PNG, najpre konvertovati u WEBP i sačuvati pod postojećim imenom. Za promenu putanje koristiti `data/images.json` pa `npm run build`.

| Folder | Uloga | Preporučen odnos | Primer |
|---|---|---|---|
| `assets/images/hero/` | HERO i preview za Showcase | 16:9 | `nina22_hero_01.webp` |
| `assets/images/services/` | 3 kartice usluga | 4:3 | `nina22_service_upravljanje_01.webp` |
| `assets/images/buildings/` | Dva stvarna objekta + 3 demo prikaza | 16:9 kartica, puni original za popup | `nina22_building_01.webp` + `nina22_building_01_full.webp` |
| `assets/images/cleaning/` | Dubinsko čišćenje, 3 fotografije | 4:3 | `nina22_cleaning_sofa_01.webp` |
| `assets/images/brand/` | Originalni simbol iz Marinine slike | transparentni PNG | `nina22_original_mark.png` |
| `assets/images/video-posters/` | Cover video-snimka | 4:3 | `nina22_video_odrzavanje_01.webp` |
| `assets/images/social/` | Deljenje linka na društvenim mrežama | 1200 × 630 | `nina22-og.jpg` |
| `assets/video/` | Video klipovi | originalni format | `odrzavanje-hodnika.mp4` |

Prve dve slike u galeriji zgrada su **stvarne fotografije** objekata na adresama Miladina Pećinara 127G i Drinske Divizije 16, Zlatibor, prema dostavljenim materijalima. Preostale tri slike zgrada, kao i slike nameštaja i usluga, **ilustrativni su demo isečci** i ne smeju se objavljivati kao stvarne reference NINA 22. Jedini autentični video trenutno je dostavljeni snimak mašinskog čišćenja hodnika. Posle zamene slika prilagoditi i `alt` opise u `data/site.json` da tačno opisuju stvarne fotografije.

## SEO: demo je zaštićen od indeksiranja
- Sajt ima srpski `lang`, jedan H1, deskriptivne H2/H3 naslove, Title i meta opis orijentisane na **upravljanje i održavanje zgrada na Zlatiboru**, odgovarajuće `alt` opise, optimizovane lokalne WEBP fajlove, responsive layout i OG/Twitter meta oznake.
- **Showcase demo ima `noindex, follow`.** Namerno nema canonical na tuđi/nepotvrđeni domen niti prikazuje demonstracione objekte kao stvarne reference. Root `robots.txt` omogućava pristup kako bi Google video noindex tag. Ne stavljati `Disallow` za demo ako se oslanjamo na noindex.
- `data/site.json` → `seo.productionUrl` je prazno dok Marina ne potvrdi vlasništvo nad finalnim domenom; `seo.indexable` je `false`. Navedeni `nina22.rs` sa promotivnog materijala **nije pretpostavljen kao potvrđeni produkcioni domen**.

### SEO aktivacija na STVARNOM klijentskom domenu
1. Marina treba da potvrdi i odobri: tačan javni naziv firme, usluge, oblast rada, kontakt, domen, pravo na originalne fotografije i autentične reference. Ne dodavati adresu ili radno vreme koje nije potvrdila.
2. Ubaciti njene fotografije / logo / sadržaj i ažurirati `alt` opise. Zameniti `assets/images/social/nina22-og.jpg` originalnim social preview vizualom; ukloniti svaku oznaku ilustracije u opisima.
3. U `data/site.json`, podesiti `seo.productionUrl` npr. **samo zaista potvrđeni** `https://vas-podvrdjeni-domen.rs/`, a `seo.indexable` na `true`. **Production URL mora imati završnu kosu crtu.** Build blokira poznate showcase i test domene.
4. `npm run build` iz `clients/nina22` generiše canonical, punu OG/Twitter sliku, JSON-LD `ProfessionalService` bez nepotvrđenih ocena/adrese, `sitemap.xml`, produkcioni `robots.txt` i uklanja oznake DEMO. Za produkciju objaviti **sadržaj foldera `clients/nina22` direktno kao root potvrđenog domena**, ne u showcase podfolder.
5. Povezati i verifikovati Google Search Console za klijentski domen, poslati sitemap i pratiti indeksiranje i performanse. Google Business Profile povezivati tek uz verificiranu poslovnu lokaciju ili odgovarajuću service-area konfiguraciju po njihovim pravilima.
6. Revidirati tekstove svake usluge, dopuniti stvarnim referencama/odgovorima na česta pitanja; za dve zasebne delatnosti kasnije pripremiti zasebne sadržajno jedinstvene stranice ako ima dovoljno potvrđenih detalja. SEO ne garantuje mesto na Google-u.

## Funkcionalnosti / QA
- Sticky polutransparentan header sa vidljivim CTA i mobilnim hamburgerom, HERO sa tekstom preko slike, diskretna animacija zlatnih kartica, usluge, horizontalna swipe galerija na telefonu, originalni video u modalu, placeholderi za dubinsko čišćenje, kontakt, modali sa Escape + fokus kontrolom.
- Formi je **obavezan telefon** i ona trenutno otvara korisnikov email (`mailto:`) uz mogućnost kopiranja. **Nema pozadinskog slanja, baze, CAPTCHA ni potvrde prijema**. Pre produkcije dogovoriti serverski kanal za prijem upita ili pošteno zadržati objašnjenje da aplikacija otvara email.
- Za proveru lokalno: `npm run check` i vizuelno testiranje 320/390/820/1440 px. Na iOS mobilnom nema fixed background-a niti je CTA unutar hamburger menija.
- Nema izmišljenih ocena korisnika, brojki o objektima ili Google zvezdica; tvrdnje poput dostupnosti 24/7 ostavljene su kao istorijski navod iz promotivnog materijala za klijentkinu potvrdu.

## Sledeće
Čekaju se Marinine originalne fotografije zgrada, originalni vektorski ili PNG logo (postojeći simbol je izdvojen iz dostavljenog JPEG-a), fotografije i video dubinskog čišćenja, verifikacija domena i usluga. Potom mapirati u **postojeće** Web Solutions komponente kada V47 bude stabilan; bez paralelnog razvoja generatora u ovom repou.

### V3.2 — HERO ispravka za lokalno otvaranje
HERO fotografija sada je običan `<img src="assets/images/hero/nina22_hero_01.webp">` ispod gradijenta. Time uklanjamo oslanjanje na `background-attachment:fixed` i CSS promenljivu za lokaciju slike, što je moglo praviti problem pri `file://` otvaranju na Windowsu. Fotografija je dostupna i bez JavaScripta; diskretni parallax dodat je samo na desktopu, a isključen na telefonu i kod `prefers-reduced-motion`. Pri zameni fotografije staviti novi WEBP na ISTU putanju; ili izmeniti `data/images.json` pa pokrenuti `npm run build`. Raspakovati CELOKUPAN ZIP pre otvaranja.

### V3.3 — završna izmena interakcija (29.09.2026)
- **Izdvajamo:** četiri statične kartice, bez strelica i popupova; diskretna zlatna hover animacija ostaje.
- **Usluge:** svaka kartica otvara modal sa fotografijom, potvrđivim opisom usluge, stavkama i obaveznim dugmetom **„Pošaljite upit”**. Dugme zatvara modal, bira odgovarajuću vrstu upita i vodi na kontakt-formular. Kontakt i dalje otvara korisnikovu email aplikaciju, **nije automatsko slanje**.
- **Naši objekti:** popup sa velikim fotografijama ostaje. Prva kartica prikazuje stvarni objekat (127G), ostale su jasno označene kao ilustracije; zamena originalima ide kroz `assets/images/buildings/`.
- **Video:** originalni video mašinskog čišćenja ostaje u istom popup-u. Za dubinsko čišćenje budući video uključuje se postojećom opcijom `deepCleaning.videoEnabled` posle dodavanja fajla u `assets/video/`.
- **Dubinsko čišćenje:** 3 demo slike sada su dekorativna galerija bez bespotrebnih popupova. Kod za **PRE/POSLE** klizač je pripremljen, ali je **namerno isključen** dok Marina ne pošalje dve autentične fotografije istog komada nameštaja iz istog ugla.
  1. Staviti konvertovane WEBP fotografije u `assets/images/cleaning/before-after/` kao `nina22_pre_01.webp` i `nina22_posle_01.webp` (ili ažurirati `data/images.json`).
  2. Proveriti pravo na objavu i opise u `data/site.json`; podesiti `deepCleaning.beforeAfter.enabled: true`.
  3. Pokrenuti `npm run build && npm run check` u folderu `clients/nina22`. Bez pravog materijala klizač se ne prikazuje i ne prikazuje lažan rezultat.
- SEO i organizacija slika iz V3.2 ostaju. Za zamenu postojećih slika ISTIM imenima nije potreban build.
- Sledeće: čekamo Marinine fotografije, video dubinskog čišćenja, originalni logo i potvrdu teksta/domena. Do tada nema dodatnog razvoja.

### V3.4 — prva stvarna referenca (29.09.2026)
- Izabrana originalna fotografija `Ovo je Miladina Pecinara 127G - 004.jpeg` za prvi objekat. Pripremljeni su optimizovani WEBP fajlovi: `assets/images/buildings/nina22_building_01.webp` (horizontalni kadar 16:9 za karticu) i `assets/images/buildings/nina22_building_01_full.webp` (cela uspravna fotografija za popup). Nije izmišljan ili generisan sadržaj fotografije.
- Ispod kartice je natpis **Miladina Pećinara 127G — Zlatibor**, a u popup-u puna adresa. Ovo je adresa **objekta pod upravljanjem**, ne adresa sedišta agencije. Ne unositi je u lokalni SEO `LocalBusiness.address` kao adresu firme.
- Preostale četiri ilustrativne slike su zadržane, ali jasno označene kao demo, kako se ne bi predstavljale kao stvarne reference. Prilikom pristizanja fotografija menjati odgovarajući `buildingN` zapis u `data/images.json` i dopuniti `data/site.json` (caption, alt, actual).
- Showcase glavna strana i njen CSS nisu menjani. Sajt i dalje ima **noindex** do završetka i odobrenja produkcionog materijala.


## V3.7 — druga stvarna referenca i kompaktni prikaz radova
- `assets/images/buildings/nina22_building_02.webp` — odabrana vodoravna fotografija objekta Drinske Divizije 16, Zlatibor; naslov/adresa stoje ispod galerijske kartice.
- `assets/images/buildings/nina22_building_02_full.webp` — isti kadar u većoj rezoluciji za **postojeći V3.5 foto-modal**. HTML/JS foto-modala nisu menjani.
- `assets/images/maintenance/nina22_rasveta_pre_posle_thumb.webp` i `...full.webp` su dva izvoza ISTE AI-stilizovane slike koju je korisnik odabrao. U odeljku *Održavanje na delu* video i slika stoje kao dva ravnopravna mala pregleda; klik na sliku otvara postojeći foto-modal. Opis: „Zamena neispravne rasvete u zajedničkim prostorijama stambene zgrade.“
- Stilizovana slika je ilustrativna, nije autentična fotografija završnih radova; zato je kao takva označena. Ne mešati sa izvornim fotografijama bez eksplicitne saglasnosti.
- `data/images.json`, `data/site.json`, `template.html` i `scripts/build.mjs` ažurirani su da **sledeći build ne obriše** stvarne reference i novi prikaz radova.
- Showcase naslovna strana i Web Solutions generator nisu menjani. Pred produkciju potvrditi sve reference i objavu materijala s Marinom.
