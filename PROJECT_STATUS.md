# RMC Web Solutions — jedinstveni projektni status

**Verzija:** V41.4 — Commerce intent / Viber korekcije, 24.09.2026.  
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

## V41.3 — prethodnih 10 novih scenarija (ukupno 13)

| Delatnost | V39.5 osnova | Testna logika |
|---|---|---|
| Modni butik | 17 originalnih kuriranih proizvoda/slika | korpa + veličina/boja |
| Mini market | 12 originalnih proizvoda/slika | korpa + sticky total |
| Prodavnica pića | 15 originalnih proizvoda/slika | korpa + opciona varijanta |
| Kućni dekor | 6 originalnih proizvoda/slika | korpa + boja/dimenzije |
| Prodavnica elektronike | 7 originalnih proizvoda/slika | korpa + model/varijanta |
| Prodavnica telefona | 10 originalnih proizvoda/slika | korpa + model/boja |
| Salon nameštaja | 12 originalnih proizvoda/slika | **upit**, bez izmišljene kupovine |
| Auto delovi | 12 originalnih proizvoda/slika | porudžbine ili upit (poseban odgovor), marka/model/godište |
| Vodovodni materijal | 12 originalnih proizvoda/slika | **upit** + specifikacija |
| Elektromaterijal | 12 originalnih proizvoda/slika | **upit** + specifikacija |

V39.5 `business-commerce-registry-v39-5` čuva istorijski početni `cart`/`inquiry` model. U V41.4 Advisor za telefon, mini-market i auto-delove postavlja izričito DA/NE o porudžbinama; odgovor definiše operativni modul nezavisno od marketinškog cilja. Auto-delovi zadržavaju obavezne podatke o vozilu i zasebnu proveru kompatibilnosti. Testne pozitivne cene su **ilustrativne, nisu stvarni cenovnici**. Korisnik može da proveri prikaz i sumiranje; potvrda dostupnosti i plaćanje ne postoje. Model/boja/specifikacija pamte se zasebno po korpinoj stavci ili se šalju kao deo upita. Nove delatnosti koriste svoje originalne JPEG-ove iz V39.5 arhive, ne generičke placeholder slike.

**Granice:** izvorni V39.5 sadrži i dodatnu business-specific logiku, Trust, Reviews, razne uslužne/booking sekcije i 5 stilova. V41.4 još **ne dokazuje potpun vizuelni i poslovni paritet** tih dodatnih modula, niti uvodi Universal Booking za nove kategorije. Cena u testu se mora zameniti realnom pre objavljivanja klijenta. U produkciji se i dalje koristi stari frontend.

## V41.4 — kontrolisane UX izmene (24.09.2026)

- Obavezno **„Da li kupci mogu da naruče proizvode preko sajta?“** za telefon, mini-market i auto-delove. DA uključuje korpu nezavisno od primarnog marketinškog cilja; NE daje katalog i proveru dostupnosti.
- Auto-delovi: kada je korpa uključena, postoji i odvojeno dugme **Proveri kompatibilnost**, a marka, model i godište vozila su obavezni za slanje.
- Izbačena generička akcija „Podeli“. Nakon pripreme poruke nude se **Kopiraj / Viber / WhatsApp** za porudžbine i degustacije.
- **Ograničenje Vibera:** zvaničan deljeni tekst do 200 znakova i mobilni URL scheme; može biti blokiran u iframe Preview-u. Za duge poruke dugme Kopiraj čuva pun zahtev. Za pravo slanje testirati mobilni ZIP sa instaliranim Viberom; generisanje poruke nije potvrda porudžbine.
- Mesara, Vinoteka, Obuća i preostali V41.3 katalozi ne menjaju se; V39.5 i Render `main` ostaju netaknuti.

## Provera i primena

1. Raspakovati V41.4 ZIP **van** postojećih foldera.
2. Pokrenuti `APPLY_V41_4.bat` sa lokalnim V41.3 projektom (čist Git). Skripta pravi rezervnu kopiju i novu testnu granu, pokreće `npm test` i `npm run build` i nudi opciono slanje **samo te grane** na GitHub.
3. Restartovati lokalni server i testirati oba odgovora DA/NE za telefon, mini-market i auto-delove pri ciljevima kupovine, posete i kataloga. Proveriti Viber dugme i obaveznu kompatibilnost; isto proveriti i kroz preuzeti ZIP.
4. U ovom paketu Node regresija i generisani HTML testovi su pokrenuti lokalno u sandbox-u. Vite build na Windowsu ostaje obavezan pre eventualnog push-a; Render nije automatski ažuriran.

## Redosled završetka preostalih 59 delatnosti

1. **V41.5 – preostali retail/hibridne usluge:** kategorije s mešovitim Commerce i servisnim modelom (optika, servis telefona, farmacija, gume i dr.).
2. **V41.6 – Universal Booking** za beauty, ugostiteljstvo, healthcare, profesionalne usluge, majstore, događaje i rental. Svaka varijanta ima poslovno uslovno Advisor pitanje, polja i svoj request/confirmation model; nikad lažno potvrđivanje bez persistence/availability servisa.
3. **V41.7 – ostale industrije i puni modulni paritet** (reviews, trust, team, FAQ, hibridi, lokacije/mapa, svih pet stilova) i automatizovani QA za svih 72.
4. **V41.8 – Editor, export/publish i finalno usaglašavanje** sa originalnim V39.5 frontendom. Tek tada odluka o zameni javnog Webglobe sajta.

**Politika kvaliteta:** nijedna delatnost nije „migrirana“ samo zato što je u registru. Za svaki ID mora da prođe Advisor → završni korak → Node Generate → Preview → relevantna poslovna akcija → samostalan ZIP, plus bar jedna mobilna provera po vrsti modula.
