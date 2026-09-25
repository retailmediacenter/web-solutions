# Web Solutions — V43 razvojni checkpoint

## V43.3 — potvrđena Booking integracija i Web Push (25.09.2026.)

Faza B i Faza C su završene na razvojnoj grani `development/v43-3`:

- `19b7ca2` — automatski Booking profil iz postojećeg `siteConfig` i stabilni `serviceId` identifikatori. Kratko uparivanje prenosi izvorne poslovne podatke i usluge u Manager bez dupliranja lokalnih pravila, usluga ili rezervacija.
- `8c872a6` — standardni Web Push sa VAPID-om. Trenutno se šalje samo tip `BOOKING`; `ORDER` i `INQUIRY` su rezervisani za kasniji zajednički Business Portal transport.
- Potvrđen tok: generisani sajt → Node API → Redis → Booking Manager → Push. Testiran je na Windowsu i instaliranoj iPhone PWA aplikaciji.
- Redis sanduče i lokalni IndexedDB kalendar ostaju osnova sistema. `requestId` je idempotency ključ: ponovni submit ne duplira Redis zahtev, lokalnu rezervaciju ni Push obaveštenje. Greška Push dostave ne menja prihvatanje zahteva niti njegov Redis red.
- Service Worker verzionira samo Cache Storage pod prefiksom `rmc-booking-`; ne pristupa IndexedDB profilima ili lokalnim rezervacijama.
- Privatni Manager token i VAPID privatni ključ nisu deo generisanog sajta, ZIP-a ili Git-a. VAPID ključevi postoje samo kao staging/production environment vrednosti; prilikom rotacije oba ključa se menjaju zajedno i redeployuje se samo odgovarajući API.

**Operativna granica:** trenutni model ima jedan glavni uređaj. Drugi uređaj može preuzeti lokalnu kopiju profila, ali lokalni kalendari nisu međusobno sinhronizovani; za pravi rad sa više uređaja potreban je kasniji model više uređajskih tokena i centralizovana sinhronizacija. Faza D treba da uvede RMC Business Portal sa modulima Rezervacije, Porudžbine i Podešavanja/obaveštenja, ali se ne započinje pre poslovne matrice svih 72 scenarija.

**V42.1 funkcionalno potvrđena od korisnika.** Ovaj V43.0 paket je mali, bezbedan početni korak V43, **nije ceo Contact Engine niti Booking Manager**.

**U ovom patch-u:** sekcija Kontakt i lokacije prikazuje poslovni telefon, email, sajt, radno vreme, adresu, mapu na zahtev i navigaciju. Direktni Viber/WhatsApp linkovi uklonjeni su **samo iz lokacijskog prikaza**. Brojevi ostaju u `businessData` za buduće kontekstualno rutiranje odgovarajućih formulara.

**Ostaje za V43:** centralizacija `contact-basic`, `contact-inquiry`, `contact-booking`, `contact-showroom`, `contact-availability`, `contact-project`, `contact-service`, QR i vlasnički Booking Manager; siguran booking deep-link dizajn zahteva vlasničko uparivanje ključeva kako lični podaci ne bi bili izloženi kroz običan URL. Nema automatske potvrde termina niti tvrdnje da je već poslata poruka.

**Pravila:** ne menjati V42.1 contact podatke, URL mape, badge, postojeće forme, Preview/ZIP jednakost; nakon verifikacije nastaviti razvoj V43 po modulima. Projekat je na 72/72 osnovna scenarija uz preostali sistemski QA V44.

---

# RMC Web Solutions — jedinstveni projektni status

**Trenutni kandidat:** V41.9.2 — mala foto-korekcija GlobalModal-a (24.09.2026), nad korisnički proverenom V41.9.1 i sačuvanom V39.5 referencom. V42/V43/V44 još nisu implementirani.

## V41.9.2 — fotografija u modalu proizvoda (fokusirana CSS korekcija)

- Fotografija proizvoda sada koristi punu širinu definisanog gornjeg medija-bloka na desktopu i mobilnom. Ranije je `object-fit: contain` sa visinom `112px` unutar kraćeg mobilnog Preview iframe-a prikazivao meso kao sličicu široku oko 149px na raspoloživoj širini od 339px.
- Fotografije mesa iz originalnog `retail/butcher-shop/` asset namespace-a popunjavaju prostor kroz `object-fit: cover`, sa diskretnim 12px zaobljenjem; izolovani proizvodi (npr. obuća, telefoni, vina) zadržavaju `contain` kako se ne bi odsecao predmet.
- Gornji medija-blok: desktop `clamp(230px,35dvh,310px)`, mobilni `clamp(195px,42dvh,258px)`; u uskom Preview iframe-u 393×468 testirana slika zauzima 339×197px. Zaglavlje i postojeće footer akcije ostaju fiksirani, skroluje se samo sadržaj modala. To znači da na izrazito niskim ekranima cenu/varijante može biti potrebno skrolovati unutar sadržaja; dugmad ostaju dostupna.
- Izmena je namerno ograničena na `client/public/global-modal.css`, jedini neutralni vizuelni sloj učitan identično u React Preview-u i preuzetom ZIP-u; poslovna logika, Advisor, Commerce, Booking, ostali modali i struktura fajlova nisu menjani.
- Izolovana Chromium provera: 393×468 (niski Preview), 393×852 (telefon), 1250×900 (desktop); ispravno prikazana slika sa `cover`, modal ostaje u viewport-u, fiksni footer i korpa funkcionišu. Node testove i React/Vite build mora dodatno proveriti Windows instalaciona skripta na stvarnoj korisničkoj V41.9.1 bazi.

## Zašto je rađena V41.9.1

V41.9 je računao korpu na osnovu glavnog marketinškog cilja (`goal=purchase`), pa npr. Mesara koja želi više poseta, a prima internet porudžbine, nije dobijala korpu. Mobile screenshot je pokazivao kontrolu količine, ne dokaz da je Commerce uključen. U V41.9.1 marketing cilj, poslovni kanal i sposobnost stvarnog primanja zahteva za porudžbine razdvojeni su u Advisoru.

**Ispravljeno:**
1. SVIH **17 postojećih cenovno opremljenih katalog profila** dobija nezavisno DA/NE pitanje o poručivanju (`ordersEnabled`). Već postojeće pitanje u sedam profila nije duplirano. Mesara zadržava zasebno pitanje o sirovom/grilovanom mesu, a Vinoteka zasebno pitanje o degustacijama. Na sajtu korpa je posledica poslovnog DA, nezavisno od marketing cilja (`purchase`/`visit`/`catalog`). NE prikazuje katalog sa upitom o dostupnosti.
2. Novi React Advisor radi sa **listom specijalnih pitanja**, umesto tvrdog ograničenja na jedno dodatno pitanje. Zadržani su stari ID-jevi odgovora i ponašanje postojećih klijenata bez novog pitanja. Eksplicitni DA/NE odgovor, kada postoji, uvek ima prednost.
3. Stariji API klijenti bez novog pitanja dobijaju konzistentniji fallback kada stari odgovor nedvosmisleno kaže `Online prodaja` / `Online poručivanje` ili `Samo u radnji`. Za sedam već postojećih strogo eksplicitnih retail profila i dalje je obavezan odgovor DA/NE.
4. **Modal proizvod:** pri svakom otvaranju i ponovnom otvaranju početna scroll pozicija vraća se na vrh. Zaglavlje i fiksna footer dugmad ostaju dostupni na desktopu i mobilnom; naziv i fotografija ne ostaju skriveni zbog starog scroll stanja.
5. **Ciljevi Advisora:** nazivi tri marketing cilja sada odgovaraju tipu biznisa (trgovina, usluge, upiti/projekti, turizam, obrazovanje, zdravstvo), a ne isti tekst `termin` za sportske radnje, marketinške agencije i apartmane.
6. Sportska oprema u trenutnoj V41.8 strukturi ima samo kategorije/hero, **bez cenovno opremljenih proizvoda i odgovarajućih foto asseta**. Zato Advisor pošteno pita za *upit o opremi*, a ne obećava pravi checkout/korpu. Dovršavanje realnog sports Commerce-a zahteva konkretne artikle/fotografije i ostaje evidentirano kao posao, ne prikazuje se lažna kupovina.

## Svi poslovni scenariji — revizija 72/72

- **17 Commerce katalog scenarija:** nezavisno pitanje o poručivanju. Dva imaju i dodatno nezavisno funkcionalno pitanje (Mesara priprema; Vinoteka degustacija).
- **36 Booking/uslužnih:** zasebno pitanje da li stvarno nude zakazivanje ili rezervacije. `NE` ne sme da prikaže nedozvoljenu booking formu; vrste termina (`appointment`, `reservation`, `consultation`, `request-slot`) ostaju određene poslovnom logikom.
- **19 vertikalnih sektorskih profila (uključujući specijalno rešenu Apoteku):** mogućnost slanja konkretnog sektorskog upita uslovljena odgovorom. Apoteka ima **dva odvojena izbora**: dozvoljeni Commerce DA/NE preko operativnog pitanja i savetovanje DA/NE preko specijalnog pitanja.
- **10 dozvoljenih Hybrid parova** ostaje pod kontrolom Advisora: najviše jedna kompatibilna sekundarna delatnost; osnovna korpa/Booking se ne menja izborom sekundarne delatnosti.

**Testovi:** 89/89 Node regresionih testova PASS; novi automatizovani obilazak obuhvata **72 × 3 cilja × 2 odgovora = 432 server-render scenarija**, 17 × 3 × 2 Commerce kombinacije, 10 hibridnih parova i odvojeno testiranje Mesare/Vinoteke. Izolovani Chromium: desktop 1440×900 i mobile 393×852, uključivanje i isključivanje korpe, modal na početnoj poziciji, ponovno otvaranje nakon scroll-a i sticky korpa — PASS. Full React/Vite build i test u korisnikovom lokalnom studiju ostaju obavezni preko instalacione skripte; ovde `vite` nije instaliran i build nije potvrđen.

## Identifikovane granice za sledeće verzije

- **V42** treba da sakupi kompletne stvarne poslovne podatke, lokaciju, radno vreme, više lokacija i ispravan telefon; sada je unos telefona opcion. Bez stvarnog telefona ne sme biti lažnog `tel:` CTA. Globalni DEMO badge i siteMode deo su odobrenog V42–V44 plana.
- **V43** treba da poveže komunikacione kanale sa stvarnim poslovnim podacima i jasno razlikuje kopiranu/pripremljenu poruku od zaista poslatog upita. Trenutno nema automatskog email slanja, rezervacije ili potvrde dostupnosti.
- **V44** treba da pretoči unete odgovore **`businessMode` i `emphasis` u stvarni prioritizovani raspored i copy svih renderera**. Danas se već beleže, ali mnogi sektori ih još ne koriste u izgledu/sekcijama; ne proglašavati potpuni poslovni paritet dok orkestracija ne bude gotova.
- **Sports-shop:** postojeća kategorizacija + upit ne zamenjuje cenovni katalog; pravi Commerce tek kada postoje stvarni primeri artikala/asset namespace i prihvaćen Commerce model.
- Usvojena politika MODALA ostaje ista kroz pet stilova, sa neutralnom 97% neprozirnom površinom. Raspored foto bloka i sticky action area mora se ponovo proveriti na realnom iPhone/Android uređaju.

### Reviziona matrica svih 72 delatnosti

| Business ID | Naziv | Osnovni sistem | Specijalni odgovori | Dozvoljena sekundarna delatnost |
|---|---|---|---|---|
| `shoe-shop` | Prodavnica obuće | Commerce | `ordersEnabled` | - |
| `fashion-shop` | Modni butik | Commerce | `ordersEnabled` | - |
| `hair-salon` | Frizerski salon | Booking | `acceptsTimeRequests` | hair-cosmetics |
| `barber-shop` | Barber shop | Booking | `acceptsTimeRequests` | - |
| `beauty-salon` | Beauty salon | Booking | `acceptsTimeRequests` | - |
| `nail-salon` | Nail salon | Booking | `acceptsTimeRequests` | - |
| `massage` | Masaža / Spa / Wellness | Booking | `acceptsTimeRequests` | - |
| `restaurant` | Restoran | Booking | `tableReservations` | - |
| `cafe` | Kafić | Booking | `tableReservations` | - |
| `bakery` | Pekara | Commerce | `ordersEnabled` | - |
| `pastry` | Poslastičarnica | Commerce | `ordersEnabled` | - |
| `fast-food` | Brza hrana | Commerce | `ordersEnabled` | - |
| `catering` | Ketering | Booking | `eventReservations` | - |
| `wine-shop` | Vinoteka | Commerce | `wineTastings + ordersEnabled` | - |
| `liquor-store` | Prodavnica pića | Commerce | `ordersEnabled` | - |
| `butcher-shop` | Mesara | Commerce | `butcherGrillService + ordersEnabled` | - |
| `grocery-store` | Mini market | Commerce | `ordersEnabled` | - |
| `furniture-store` | Salon nameštaja | Commerce | `ordersEnabled` | carpenter |
| `home-decor` | Kućni dekor | Commerce | `ordersEnabled` | - |
| `gift-shop` | Cveće i pokloni | Commerce | `ordersEnabled` | - |
| `sports-shop` | Sportska prodavnica | Vertical | `verticalEnabled` | - |
| `auto-service` | Auto servis | Booking | `acceptsTimeRequests` | auto-parts, vehicle-sales |
| `auto-parts` | Auto delovi | Commerce | `ordersEnabled` | auto-service, vehicle-sales |
| `tire-shop` | Vulkanizer / gume | Booking | `acceptsTimeRequests` | - |
| `car-wash` | Auto perionica | Booking | `acceptsTimeRequests` | - |
| `appliance-repair` | Servis kućnih aparata | Booking | `acceptsTimeRequests` | - |
| `hvac` | Klima servis | Booking | `acceptsTimeRequests` | - |
| `plumber` | Vodoinstalater | Booking | `acceptsTimeRequests` | - |
| `plumbing-supplies` | Vodovodni materijal | Commerce | `ordersEnabled` | plumber |
| `electrician` | Električar | Booking | `acceptsTimeRequests` | - |
| `electrical-supplies` | Elektromaterijal | Commerce | `ordersEnabled` | electrician |
| `electronics-store` | Prodavnica elektronike | Commerce | `ordersEnabled` | - |
| `phone-store` | Prodavnica telefona | Commerce | `ordersEnabled` | repair-phone |
| `repair-phone` | Servis telefona | Booking | `acceptsTimeRequests` | phone-store |
| `optician` | Optika | Booking | `eyeExamAppointments` | - |
| `dentist` | Stomatološka ordinacija | Vertical | `verticalEnabled` | - |
| `pharmacy` | Apoteka | Pharmacy hybrid | `pharmacyConsultations` | - |
| `lab` | Medicinska laboratorija | Vertical | `verticalEnabled` | - |
| `physio` | Fizioterapija | Booking | `acceptsTimeRequests` | - |
| `clinic` | Privatna klinika | Vertical | `verticalEnabled` | - |
| `vet` | Veterinarska ambulanta | Vertical | `verticalEnabled` | - |
| `accounting` | Knjigovodstvo | Booking | `acceptsTimeRequests` | - |
| `consultant` | Poslovni konsultant | Booking | `acceptsTimeRequests` | - |
| `law-office` | Advokatska kancelarija | Booking | `acceptsTimeRequests` | - |
| `property-manager` | Profesionalni upravnik | Booking | `acceptsTimeRequests` | - |
| `marketing-agency` | Marketing agencija | Vertical | `verticalEnabled` | - |
| `software-company` | Softverska agencija | Booking | `acceptsTimeRequests` | - |
| `it-support` | IT podrška | Booking | `acceptsTimeRequests` | - |
| `security-systems` | Alarm i video nadzor | Booking | `acceptsTimeRequests` | - |
| `print-shop` | Štamparija | Vertical | `verticalEnabled` | - |
| `real-estate` | Agencija za nekretnine | Vertical | `verticalEnabled` | - |
| `construction` | Investitor / gradnja | Vertical | `verticalEnabled` | - |
| `interior-design` | Dizajn enterijera | Vertical | `verticalEnabled` | - |
| `language-school` | Škola jezika | Vertical | `verticalEnabled` | - |
| `training-center` | Centar za obuke | Vertical | `verticalEnabled` | - |
| `kindergarten` | Vrtić | Vertical | `verticalEnabled` | - |
| `kids-playroom` | Dečija igraonica | Booking | `eventReservations` | - |
| `event-venue` | Prostor za događaje | Booking | `eventReservations` | - |
| `apartments` | Apartmani | Vertical | `verticalEnabled` | - |
| `hotel` | Hotel | Vertical | `verticalEnabled` | - |
| `rent-a-car` | Rent-a-car | Vertical | `verticalEnabled` | - |
| `travel-agency` | Turistička agencija | Vertical | `verticalEnabled` | - |
| `fitness-center` | Fitness centar | Booking | `acceptsTimeRequests` | - |
| `fitness-trainer` | Personalni trener | Booking | `acceptsTimeRequests` | - |
| `yoga-pilates` | Joga i pilates studio | Booking | `acceptsTimeRequests` | - |
| `photo-video` | Foto i video studio | Vertical | `verticalEnabled` | - |
| `cleaning` | Servis za čišćenje | Booking | `acceptsTimeRequests` | - |
| `carpenter` | Stolar | Booking | `acceptsTimeRequests` | - |
| `locksmith` | Bravarski i metalni radovi | Booking | `acceptsTimeRequests` | - |
| `moving` | Selidbe | Booking | `acceptsTimeRequests` | - |
| `painter` | Moler / farbar | Booking | `acceptsTimeRequests` | - |
| `tiler` | Keramičar | Booking | `acceptsTimeRequests` | - |

---

# Prethodni projektni status — V41.9 i ranije

# RMC Web Solutions — jedinstveni projektni status

**Verzija:** V41.9 · React + Node · vizuelni sistem + sistemski modali. **Polazna tačka:** korisnički potvrđena V41.8.1; V39.5 je read-only referenca.

## Implementacija V41.9

- **Pet stilova:** tradicionalni, moderni, topli, tehnološki i premium; zajednički CSS tokeni za header, 16:9 hero, tipografiju, dugmad, kartice, forme, kontrast i stil-specifične animacije. Premium je tamna varijanta iz prihvaćene vizuelne mape, može se promeniti ako korisnik naknadno izabere svetlu.
- **Jedan GlobalModal:** postojeći `dialog.site-dialog` u svim rendererima dobija identičnu neutralnu površinu, sistemsku tipografiju, 3% providnosti i fiksne header/body/footer zone u desktop i mobile prikazu. Body je jedina skrol zona. Native `<dialog>` zadržava postojeći Escape/fokus okvir; event targeti se premeste, ne rekreiraju.
- **Deljene implementacije:** `client/public/visual-system.css`, `global-modal.css`, `global-modal.js` koriste i React iframe Preview i Node ZIP exporter. Stari moduli, Business Registry (72 zapisa), Advisor, Commerce, Booking, Hybrid i datumi nisu menjani.
- **Prilagođavanje teksta:** sektorski upiti, nekretnine, škola jezika, rent-a-car, specifična mobile form polja. Tradicionalni stil nema reveal animacije; `prefers-reduced-motion` se poštuje.
- **Welcome modal:** opciona završna kontrola u Advisoru; server upisuje `siteConfig.presentation.showWelcome` i dodaje isti neutralni modal u Preview i ZIP. Po podrazumevanom podešavanju je isključen. Kada je uključen, pri poseti pokušava da se prikaže jednom po sesiji (`sessionStorage` ako je dostupan).
- **DEMO badge, globalni kontakt, automatski email, Editor:** nisu deo V41.9; idu u dogovorene V42–V44. Nema prisilnog Welcome modala niti automatski poslatih poruka.
- **Font fallback:** generisani ZIP ne zavisi od spoljnih CDN fontova; koristi lokalno dostupni Montserrat/Inter ako postoje, inače stabilne sistemske zamene. Nismo uključivali tuđe/licencno nejasne font datoteke.

## QA / kriterijumi

- Sve iz V41.8.1 regresije mora ostati zeleno.
- Dodatni V41.9 testovi: svih pet stilova i tri različita renderera u Preview/ZIP; dijalozi u svakom tok-u; pet stilova sa istim neutralnim modal tokenima; dve pomerene akcije Order/Share bez gubitka događaja.
- Korisnička potvrda na Windowsu ostaje obavezna za puni React/Vite build, iPhone simulaciju, preuzeti ZIP i pregled svih pet stilova. Bez toga V41.9 je kandidat.
- Ne postavljati na GitHub `main`, Render ni Webglobe automatski.

---
# RMC Web Solutions — jedinstveni projektni status

**Verzija:** V41.8 · React + Node · 24.09.2026.  **Referenca i rollback:** V39.5; V41.7.1 je poslednji korisnički potvrđeni razvojni checkpoint.

**Status:** 72/72 osnovnih delatnosti imaju Advisor konfiguraciju i odgovarajući server-rendered DEMO scenario. Ovo označava pokrivenost osnovnih scenarija, **ne** potpuni vizuelni, lokacijski i dostavni paritet sa V39.5. Sve razlike su evidentirane radi V41.9–V44.

## V41.8 — novih 19 osnovnih scenarija

**Arhitektura:** V39.5 Business Registry V1 ostaje netaknut: 72 zapisa isključivo poslovnih i asset činjenica. `vertical-engine.js` poseduje poslovne odluke; `render-vertical.js` i `vertical-runtime.js` izvršavaju jedan sektorski podešiv UI za ovih 19 delatnosti. React Preview i ZIP pozivaju isti renderer. V41.7.1 Commerce, Booking, Hybrid i katalog od deset vozila nisu prepravljani.

| Delatnost | Poslovni DEMO prikaz i specifičan zahtev | Izvorna fotografija |
|---|---|---|
| Sportska prodavnica (`sports-shop`) | Trčanje i trening, Timski sportovi, Odeća i dodaci; forma: Veličina / broj, Količina | V39.5 |
| Marketing agencija (`marketing-agency`) | Digitalne kampanje, Strategija brenda, Kreativna produkcija; forma: Kratak opis projekta, Okvirni budžet (opciono) | Nema V39.5 asset paketa |
| Štamparija (`print-shop`) | Poslovna štampa, Reklamni materijal, Veliki formati; forma: Tiraž / količina, Format / dimenzije, Željeni rok | Nema V39.5 asset paketa |
| Agencija za nekretnine (`real-estate`) | Stanovi, Kuće, Poslovni prostor; forma: Željena lokacija / deo grada, Okvirni budžet (opciono) | V39.5 |
| Investitor / gradnja (`construction`) | Stambena gradnja, Poslovni objekti, Razvoj projekata; forma: Željena kvadratura, Tip prostora, Planirani budžet (opciono) | V39.5 |
| Dizajn enterijera (`interior-design`) | Projektovanje enterijera, Adaptacija prostora, 3D prikaz; forma: Vrsta i kvadratura prostora, Šta želite da uradite?, Okvirni budžet (opciono) | Nema V39.5 asset paketa |
| Škola jezika (`language-school`) | Engleski jezik, Individualna nastava, Jezici za decu; forma: Nivo znanja, Format nastave | V39.5 |
| Centar za obuke (`training-center`) | Stručni kursevi, Praktične radionice, Individualne obuke; forma: Format, Željeni početak (opciono) | V39.5 |
| Vrtić (`kindergarten`) | Jaslene grupe, Predškolski program, Aktivnosti i igra; forma: Uzrast deteta (grupa), Željeni datum posete | V39.5 |
| Apartmani (`apartments`) | Gradski apartman, Apartman / studio, Boravak u prirodi; forma: Datum dolaska, Datum odlaska, Broj gostiju | V39.5 |
| Hotel (`hotel`) | Sobe i apartmani, Doručak, Dodatni sadržaji; forma: Željeni tip sobe (opciono), Datum dolaska, Datum odlaska, Broj gostiju | V39.5 |
| Rent-a-car (`rent-a-car`) | Gradski automobil, Porodično vozilo, Preuzimanje vozila; forma: Preuzimanje: datum, Preuzimanje: vreme, Vraćanje: datum, Vraćanje: vreme, Mesto preuzimanja, Mesto vraćanja | V39.5 |
| Turistička agencija (`travel-agency`) | Odmor na moru, Planinski odmor, Gradski odmor; forma: Željena destinacija (opciono), Period putovanja (opciono), Broj putnika, Budžet (opciono) | V39.5 |
| Foto i video studio (`photo-video`) | Fotografisanje, Video produkcija, Montaža i postprodukcija; forma: Željeni datum (opciono), Lokacija snimanja (opciono), Opis događaja/projekta | Nema V39.5 asset paketa |
| Stomatološka ordinacija (`dentist`) | Pregledi, Dentalna higijena, Dijagnostika; forma: Željeni datum pregleda, Poželjno vreme | V39.5 |
| Apoteka (`pharmacy`) | Vitamini i dodaci, Biljni proizvodi, Nega i higijena; forma: Željena količina (opciono) | V39.5 |
| Medicinska laboratorija (`lab`) | Uzimanje uzoraka, Laboratorijske analize, Priprema uzorka; forma: Željeni datum uzorkovanja | V39.5 |
| Privatna klinika (`clinic`) | Specijalistički pregledi, Konsultacije, Dijagnostika; forma: Željeni datum pregleda, Poželjno vreme | V39.5 |
| Veterinarska ambulanta (`vet`) | Preventivni pregled, Vakcinacija, Konsultacije; forma: Vrsta ljubimca, Željeni datum pregleda | V39.5 |

**Ograničenja po vrsti posla:**
- **Nekretnine i investitori:** primeri tipova nekretnina/projekata i projektno specifičan upit; bez izmišljenih aktivnih oglasa, cena, agentovih imena ili napretka stvarnog gradilišta. Kasnije unos stvarnih portfolija i mapiranje uz V42/V43.
- **Obrazovanje:** škola jezika (jezik, nivo, grupna/individualna nastava), centar za obuke (program i format), vrtić (uzrasna grupa i opcioni zahtev za obilazak). U vrtiću se ne traži ime deteta.
- **Turizam:** apartmani/hotel (željeni dolazak–odlazak, tip smeštaja, broj gostiju, opcion stvarni HTTPS link za spoljni sistem umesto lažne integracije), rent-a-car (datum i vreme preuzimanja i vraćanja, lokacije), agencija (destinacija, mesec, broj putnika, budžet). Datumski opsezi proveravaju se u izvozu i Preview-u; bez izmišljene trenutne dostupnosti.
- **Zdravstvo:** stomatolog/klinika samo usluga i termin (bez simptoma i dijagnoze), laboratorija termin samo ako to korisnik potvrdi, apoteka samo upit za kategorije bezreceptnih proizvoda bez online lekova na recept; veterinari imaju vrstu ljubimca i zahtev za pregled.
- **Četiri delatnosti bez posebnih slika u originalu:** marketing agencija, štamparija, dizajn enterijera i foto/video. Imaju poslovno konkretne usluge i zahteve, bez izmišljenih fotografija, članova tima ili referenci. Sportska prodavnica ima samo izvorni hero, zato su proizvodne kategorije bez izmišljenih SKU fotografija/cena; stvarna korpa zahteva unos artikala.
- **Advisor DA/NE:** svih 19 eksplicitno pita može li firma da prima konkretnu vrstu zahteva. NE uklanja datumska/potvrdna polja i ostavlja informativan kontakt, bez lažne aktivne rezervacije.
**Asset poreklo:** 56 originalnih slika iz V39.5 provereno preko SHA-256 u `v418-source-assets.json`; sve su sačuvane u originalnom namespace-u i ulaze u ZIP samo kada ih dotični sajt koristi.
## V41.8 — matrica pariteta za svih 72
Mašinski čitljiv spisak nalazi se u `server/src/data/parity-matrix-v418.json` (72 entry-ja; originalni obavezni moduli, grupisani nedovršeni poslovi, naziv i asset namespace). **„Migrirano“ u ovoj verziji znači funkcionalan osnovni scenario**; svi originalni moduli koji pripadaju kasnijim fazama izričito ostaju otvoreni.
- **V41.9:** pre konačnog kodiranja uporediti kolorne/font/button/form/modal/hero/mobilne mape svih pet stilova; detaljan vizuelni paritet, animacije, galerije, originalni trust/reviews/team/FAQ samo uz proverene i realne podatke.
- **V42:** globalni businessData telefon/email/lokacije/radno vreme/mapa; business-specific pozivni CTA, DEMO/production `siteMode`, sistemski white-label DEMO badge koji ne blokira sticky elemente.
- **V43:** contact-basic, inquiry, booking, showroom, availability, project, service; stvarno slanje tek kad postoji dogovoren kanal; pripremljena poruka ≠ poslat zahtev.
- **V44:** kompletna SiteConfig/module orchestration, hibridi, isti Preview/ZIP/publish rezultat i završna QA matrica.
## Provera V41.8
- **72/72 Node automatska testa PASS:** uključuje 72 pojedinačna `Advisor → SiteConfig → HTML → ZIP` slučaja, 19 novih DA/NE grananja, zdravstvenu privatnost, date range, originalne fotografije i stare Commerce/Booking/Hybrid regresije.
- **7 ciljnih Chromium DOM interakcionih scenarija PASS:** nekretnine → zahtev i Viber, smeštaj nevalidan/ispravan datum, rent-a-car isti dan, lab bez dijagnoze, hotel bez lažnih rezervacionih polja, assetless marketing i vrtić mobile CTA. Lokalnu `http/file://` navigaciju Chromium administrativno blokira; interakcije su izvršene u izolovanom `page.set_content` sa istim HTML/CSS/JS. Ovo nije puna vizuelna/browser integraciona provera.
- **React/Vite production build nije pokrenut u ovom okruženju jer npm zavisnosti nisu lokalno dostupne.** `APPLY_V41_8.bat` ga zahteva na tvojoj Windows instalaciji; bez PASS ne prihvatamo V41.8.
- **Obavezna Windows praktična kontrola:** sportska prodavnica, nekretnine, centar za obuke, apartmani (validacija datuma), rent-a-car (od–do), apoteka bez recepta, jedna od četiri delatnosti bez slika i po jedan mobilni/ZIP test; pre ove potvrde V41.8 je kandidat, ne korisnički prihvaćena baza.
---
## Prethodne razvojne odluke (V41.1–V41.7.1) — istorija
## V41.6 — dodatne 16 delatnosti, bez izmene autoriteta arhitekture

**Četiri dodatna Commerce / katalog scenarija:** Pekara, Poslastičarnica, Brza hrana i Cveće/pokloni. Svaki obavezno pita da li prima porudžbine. DA aktivira demo korpu, NE zadržava katalog i upit, nezavisno od marketinškog cilja sajta. Sve cene su isključivo ilustrativne.

**Dvanaest dodatnih uslužnih scenarija:** Ketering (zahtev za događaj), Auto perionica (appointment), Servis za čišćenje (request-slot), Bravarski/metalni radovi (request-slot), Selidbe (request-slot sa polaznom i odredišnom lokacijom), Profesionalni upravnik (consultation), Softverska agencija (consultation), IT podrška (request-slot), Alarm/video nadzor (request-slot), Fitnes centar (appointment), Personalni trener (appointment), Joga/Pilates (appointment). Booking je uvek opcion i zavisi od eksplicitnog odgovora u Advisoru. Nijedna forma ne tvrdi da je termin potvrđen.

**Važno:** sačuvan je popravljen izbor usluge iz V41.5.2 (i početni izbornik i klik na karticu). Za brzu hranu izvorni V39.5 `assetRoot` sadrži razmak; Node katalog koristi bezbednu URL-kopiju originalnih fotografija, uz `v416-image-source-manifest.json` sa SHA-256 poreklom. Registry činjenice nisu promenjene.

**QA:** 49/49 Node testova i šest pokrenutih browser kontrola nad samostalnim HTML/JS prikazom. Kompletan React/Vite produkcioni build mora da prođe u Windows installer skripti pre lokalne potvrde. Produkcijski Render, GitHub `main` i stari V39.5 nisu automatski menjani.

**Sledećih 19, plan V41.7:** sports-shop, marketing-agency, print-shop, real-estate, construction, interior-design, language-school, training-center, kindergarten, apartments, hotel, rent-a-car, travel-agency, photo-video, dentist, pharmacy, lab, clinic, vet. Za medicinske, smeštajne i rental scenarije definišemo odgovarajuća polja i granice pre njihove migracije, bez lažne trenutne raspoloživosti.

## Autoritativna polazna tačka

- **V39.5 referenca:** `D:\RMC\AI - chat GPT (BOB)\web solutions\web-solutions` — ne menjati.
- **React + Node radni projekat:** `D:\RMC\AI - chat GPT (BOB)\web solutions\web-solutions-react-node`.
- **GitHub:** privatni `retailmediacenter/web-solutions`. V41.5 se šalje samo na testnu granu `migration/v41-5-booking` dok ne prođe lokalnu proveru.
- **Render:** `main` ostaje netaknut dok se V41.5 ne odobri; postojeći API nije automatski redeploy-ovan ovim paketom.
- **Business Registry V1:** i dalje sadrži samo business/data činjenice i asset namespace. **Booking mode, CTA, section order i modal ponašanje nisu u Registriju.**

## Stabilna osnova iz V41.4

Ostaju funkcionalni Mesara, Vinoteka, Obuća i 10 retail/catalog scenarija. Zadržani su Commerce, sticky cart, varijante, Viber/WhatsApp/kopiranje zahteva i dogovorena oznaka za auto-delove **„Zatraži potvrdu dostupnosti“**.

## V41.5 — Universal Booking Engine

Jedan data-driven Booking renderer pokriva četiri poslovna režima:

- `appointment` — usluga + datum + vreme;
- `reservation` — rezervacija + datum + vreme + broj osoba/gostiju;
- `consultation` — tema + način razgovora + datum + vreme;
- `request-slot` — zahtev za okvirni termin; kod terenskih/servisnih poslova koristi datum + doba dana, uz relevantne podatke (vozilo, lokacija, problem).

**Ključno pravilo:** Advisor uvek postavlja eksplicitno poslovno pitanje. Odgovor **NE** ne prikazuje lažnu booking formu ni datum/vreme; ostaje običan kontakt upit. Odgovor **DA** uključuje Booking modul. Sistem priprema zahtev; **ne tvrdi da je termin slobodan niti potvrđen**.

| Delatnost | Mode | Advisor pitanje |
|---|---|---|
| Frizerski salon | `appointment` | Da li klijenti mogu da zatraže termin preko sajta? |
| Barber shop | `appointment` | Da li prihvatate zahteve za termin ili radite samo bez zakazivanja? |
| Beauty salon | `appointment` | Da li klijenti mogu da zatraže termin za tretman? |
| Nail salon | `appointment` | Da li klijenti mogu da zakažu tretman noktiju? |
| Masaža / Spa / Wellness | `appointment` | Da li klijenti mogu da zatraže termin za masažu? |
| Fizioterapija | `appointment` | Da li pacijenti mogu da zatraže termin za tretman? |
| Optika | `appointment` | Da li u vašoj optici radite pregled vida i primate zahteve za termin? |
| Restoran | `reservation` | Da li primate rezervacije stolova? |
| Kafić | `reservation` | Da li gosti mogu da rezervišu sto? |
| Auto servis | `request-slot` | Da li klijenti preko sajta mogu da traže željeni termin za servis? |
| Vulkanizer / gume | `request-slot` | Da li klijenti mogu da zatraže termin u vulkanizerskoj radnji? |
| Servis kućnih aparata | `request-slot` | Da li prihvatate zahteve za termin intervencije preko sajta? |
| Klima servis | `request-slot` | Da li korisnici mogu da zatraže termin za klima-servis? |
| Vodoinstalater | `request-slot` | Da li korisnici mogu da traže okvirni termin izlaska na teren? |
| Električar | `request-slot` | Da li korisnici mogu da traže okvirni termin intervencije? |
| Servis telefona | `request-slot` | Da li primate zahteve za termin predaje telefona na servis? |
| Knjigovodstvo | `consultation` | Da li novi klijenti mogu da zatraže termin prvog razgovora? |
| Poslovni konsultant | `consultation` | Da li klijenti mogu da zatraže termin konsultacije? |
| Advokatska kancelarija | `consultation` | Da li primate zahteve za termin konsultacije preko sajta? |
| Dečija igraonica | `reservation` | Da li primate zahteve za rezervaciju rođendana? |
| Prostor za događaje | `reservation` | Da li primate upite za datum i termin događaja? |
| Stolar | `request-slot` | Da li klijenti mogu da zatraže termin za izlazak ili merenje? |
| Moler / farbar | `request-slot` | Da li klijenti mogu da zatraže termin obilaska i procene radova? |
| Keramičar | `request-slot` | Da li klijenti mogu da zatraže termin obilaska i procene radova? |

### Posebna pravila

- **Optika:** pregled vida i zakazivanje postoje samo ako korisnik potvrdi da optika zaista radi pregled vida.
- **Healthcare (fizioterapija):** nema polja za simptome, dijagnozu ili osetljive zdravstvene podatke; samo usluga, termin i kontakt.
- **Restoran/kafić:** rezervacija koristi broj osoba; nema izmišljene live dostupnosti.
- **Igraonica/event venue:** rezervacija može da prikupi tip događaja i broj gostiju.
- **Auto-servis/vulkanizer:** vozilo je relevantno polje; `request-slot` koristi željeni datum i doba dana umesto lažno preciznog raspoloživog termina.
- **Majstori/terenske intervencije:** lokacija i kratak opis posla se prikazuju gde imaju poslovnog smisla.
- **Profesionalne usluge:** konsultacije mogu biti u kancelariji, telefonom ili onlajn.

## Preview i ZIP

- React Preview i preuzeti ZIP koriste isti server-rendered HTML.
- `booking.css` i `booking-runtime.js` ulaze u svaki servisni ZIP.
- Interni anchor linkovi rade u Preview iframe-u bez napuštanja studija.
- Modal nakon submit-a nudi **Kopiraj zahtev / Viber / WhatsApp**.
- Mobile ima sticky CTA za termin/upit.

## Provere V41.5

U sandbox proveri:

- `npm test`: **37/37 PASS** (11 novih V41.5 booking testova + sve prethodne regresije).
- Provereno: 72 Registry entry-ja ostaju očuvana; V41.5 dodaje 24 servisna scenarija bez unošenja renderer/CTA logike u Registry.
- Provereni su appointment, reservation, consultation i request-slot HTML/field ugovori, uslovna optika, absence-of-booking scenario, ZIP sadržaj i originalni asset namespace.
- Vite produkcijski build **mora da prođe na Windows računaru** kroz `APPLY_V41_5.bat`, jer sandbox nema instalirane npm zavisnosti (`vite` nije dostupan bez `node_modules`). Skripta neće ponuditi push ako build padne.

## Kako primeniti V41.5

1. Raspakovati V41.5 paket **van** radnog projekta.
2. Zaustaviti stari `npm run dev` prozor.
3. Pokrenuti `APPLY_V41_5.bat`. Skripta zahteva čistu V41.4 bazu, pravi backup, otvara granu `migration/v41-5-booking`, kopira patch, zatim pokreće `npm test` i `npm run build`.
4. Restartovati `START_LOCAL_DEV.bat` i praktično proveriti bar: Frizerski salon, Restoran, Auto-servis, Konsultant, Optiku sa DA i NE, plus jedan majstorski scenario na mobile.
5. Push na GitHub je opcion i ide samo na testnu granu. **Render main i Webglobe se ne menjaju automatski.**

## Sledeće

Nakon odobrene V41.5 baze: migracija preostalih 35 delatnosti i hibrida, zatim reviews/trust/team/FAQ/lokacije/mapa i puni petostilski paritet. Nijedna delatnost nije „migrirana“ dok ne prođe Advisor → Generate → Preview → poslovna akcija → samostalan ZIP.


## V41.5.2 — ispravka stvarnog uzroka booking dropdown regresije

- V41.5.1 je ispravljao početne `<option>` vrednosti, ali kartice usluga su i dalje nosile doslovan atribut `data-service="${esc(s.title)}"` zato što je interpolacija bila unutar običnog stringa. Klik na karticu ubacivao je taj tekst u dropdown.
- Sada svaki `service-card` nosi stvarni, HTML-escaped naziv usluge. Booking runtime dodatno čita vidljivi naslov kartice ako naiđe na zastareli, neizračunati atribut.
- Regression pokriva svih 24 profila i konkretne vrednosti atributa. Chromium interaktivnim klikom proveren za frizera, konsultanta, auto-servis i optiku (i recovery nad starim, neispravnim HTML-om).
- Dodat `scripts/smoke-booking-v4152.mjs`: nakon ponovnog pokretanja lokalnih servera proverava stvarni HTTP API, verziju i izlaz generisanja za četiri scenarija, a ne samo kod na disku.
- Nisu menjani Commerce, Advisor odluke, booking podaci, Registry niti globalni dizajn. V39.5 ostaje netaknut. Render `main` se ne objavljuje ovom zakrpom.

---

## V41.7 — Advisor Hybrid Engine (24.09.2026.)

Polazna osnova je **V41.6 koji je korisnik praktično proverio** (pekara DA/NE, ketering, selidbe). Stari V39.5 ostaje nezavisna referenca, a činjenice u Business Registry V1 (72 zapisa) nisu menjane.

**Ne povećavati broj migriranih primarnih delatnosti zbog hibrida:** V41.6 pokriva 53/72 osnovna scenarija. V41.7 dodaje deset dozvoljenih kombinacija za osam već migriranih primarnih delatnosti, ne nove primarne entry-je.

| Primarna delatnost | Opciono dodatna delatnost | Dodatni modul |
|---|---|---|
| Vodooprema | Vodoinstalaterske usluge | zahtev za izlazak majstora |
| Elektromaterijal | Električarske usluge | zahtev za intervenciju |
| Auto delovi | Auto-servis | zahtev za servis |
| Auto delovi | Prodaja vozila | upit za vozilo, bez izmišljenog inventara |
| Auto-servis | Auto delovi | zasebni kataloški upit |
| Auto-servis | Prodaja vozila | upit za vozilo |
| Prodavnica telefona | Servis telefona | zahtev za popravku |
| Servis telefona | Prodavnica telefona | zasebni kataloški upit |
| Salon nameštaja | Stolarske i montažne usluge | zahtev za uslugu |
| Frizerski salon | Profesionalna kozmetika za kosu | izdvojeni katalog i upit; 4 originalne V39.5 fotografije |

**Advisor:** za kompatibilne primarne delatnosti pita „Kako poslujete?“ i nudi „Samo osnovna delatnost“ ili **jednu** kompatibilnu dodatnu delatnost. Ovo nije proizvoljno mešanje business ID-jeva. Zadržani su postojeći relevantni odgovori (Commerce DA/NE, termini DA/NE, itd.). Registry je i dalje data-only; kompatibilnost i module plan određuje `server/src/hybrid-engine.js`.

**Prikaz:** primarni katalog/Commerce ili primarne usluge/Booking ostaju isti. Dopunjuju se jednom samostalnom sekcijom (navigacija + drugi hero CTA) i **sopstvenom** formom, bez mešanja korpe i sekundarnih upita. Novi `hybrid-runtime.js` služi samo za sekundarni zahtev, pa ne prepisuje postojeće `export-runtime.js` i `booking-runtime.js`. U poruci su Kopiraj, Viber i WhatsApp; ne postoji naplata, lažna online dostupnost ni automatska potvrda termina. Viber može skratiti duge poruke.

**Prodaja vozila — istorijski propust V41.7:** u ovoj verziji je prikazan samo generički upit iako originalni V39.5 sadrži 10 ilustrativnih DEMO vozila sa fotografijama, cenama i specifikacijama. Taj nedovršeni prikaz je zamenjen u V41.7.1 punim demonstracionim katalogom. Podaci nisu stvarna dostupna vozila i moraju biti zamenjeni pre javnog objavljivanja.

**Preview i ZIP:** koriste isti HTML iz `renderHtml`, a hibridni ZIP uključuje samo dodatne stvarno prikazane fotografije i `hybrid.css`/`hybrid-runtime.js`. Nehibridni ZIP nema dodatni runtime. Biblioteka je dopunjena sa četiri originalne hair-salon product fotografije iz V39.5, bez menjanja postojećih slika.

**Automatska provera u sandbox-u:** 60/60 Node regression PASS (49 postojećih + 11 V41.7). Browser test u ovom okruženju nije mogao da se izvrši jer lokalnu navigaciju Chromium blokira administrator. Lokalna PowerShell skripta zato dodatno zahteva React production build; posle instalacije obavezno proći realni Preview + ZIP na Windowsu. Broj 60 je rezultat testova, **ne** potvrda vizuelnog QA.

**Obavezni praktični testovi na Windowsu:** Vodooprema: samo prodaja / prodaja + majstor. Auto-delovi: samo delovi / delovi + servis / delovi + vozila. Auto-servis + prodaja vozila; frizer + kozmetika; servis/prodavnica telefona u oba smera; jedan mobilni i jedan ZIP test. Proveriti da sekundarni zahtev ne kvari primarni checkout/Booking, i da link/CTA vodi unutar Preview-a.

**Granice:** apoteka + dodatne zdravstvene usluge i pune oglasne liste automobila nisu automatski migrirani; prvo podaci, zakonita obrada i stvarni moduli. Nema izmene Render `main`, Webglobe-a ili V39.5 prilikom primene zakrpe.


## V41.7.1 — vozila iz V39.5 i precizni nazivi proizvoda

V41.7 je nekompletno prikazivao generičke kategorije vozila bez 10 ranije pripremljenih V39.5 demonstracionih artikala. V41.7.1 vraća sve originalne fotografije i ranije podatke u poseban sekundarni katalog: fotografija, kategorija, demo cena u EUR, godište, kilometraža, gorivo, menjač i snaga. Kartica → detalji → zahtev za pregled konkretnog vozila. Ta vozila NISU stvarna ponuda; u prikazu i detaljnom modalu su jasno obeležena kao ilustrativna. Ne ulaze u korpu auto-delova i ne pokreću kupovinu ni rezervaciju kao potvrđenu činjenicu. Uslovni modul ostaje pod kontrolom Advisora i pojavljuje se samo posle eksplicitnog izbora 'Prodaja vozila'. Preview i ZIP koriste isti HTML i svih 10 slika.

Generičko Advisor pitanje više ne nudi 'Nova kolekcija' proizvodnim industrijama. Auto-delovi imaju 'Nove proizvode', vodooprema/elektromaterijal 'Nove proizvode i modele', telefoni/elektronika 'Nove modele'. Fashion čuva sopstveni jezik kolekcija; nameštaj u generisanom sajtu koristi 'Izbor nameštaja'. Business Registry se ne menja.

V41.7.1 je fokusirana korekcija V41.7, ne nova migracija primarne delatnosti. Status primarnih scenarija ostaje 53/72. V39.5, Render i GitHub main ne dirati dok lokalni testovi i praktičan pregled ne prođu.


## V41.8.1 — korekcija apoteke (uslovni hybrid)
Apoteka od V41.8.1 koristi standardni Commerce katalog i product modal: odvojeno pitanje o poručivanju dozvoljenog demo asortimana, standardna korpa ili upit o dostupnosti. Drugo pitanje uključuje ili isključuje opšte savetovanje o proizvodima; nema prikupljanja medicinskih podataka. Izvoz i Preview imaju isti HTML i kod. Cene su isključivo ilustrativne. Četiri nedovršena domena V41.9–V44 i dalje su otvorena; ovo nije tvrdnja o potpunom vizuelnom paritetu. Registri ostaju business/data-only.

### Evidencija praktičnog QA za V41.9
Korisnik je potvrdio osnovno ponašanje upita za nekretnine, školu jezika i rent-a-car. Screenshotovi V41.8 otkrili su neželjene prelome naslova i opisa u dvo- i trokolonskim sekcijama/formama. U V41.9 obavezno testirati `min-width: 0`, širinu grid kolona, `overflow-wrap` bez lomljenja svake reči, `clamp` za naslove i desktop/mobile prikaz u Preview-u i preuzetom ZIP-u. Ne menjati sada stilove da ne pomešamo ispravku logike sa vizuelnim redizajnom.

### V41.8.1 provere i ograničenja
- Automatski Node testovi: 75/75 PASS.
- Izolovani Chromium DOM/interakcioni test: desktop i mobile korpa + savetovanje, kao i informativna apoteka bez korpe i savetovanja — PASS. Test koristi inline identične runtime/CSS resurse; na korisnikovom Windows računaru potrebno je dodatno potvrditi stvarni React Preview i `npm run build`.
- Demonstracioni asortiman: tri ilustrativna proizvoda za negu i dodatke ishrani. Nema automatizovane online naplate, potvrde stanja niti funkcionalnosti za lekove na recept. Pre produkcije sadržaj i pravila poručivanja uskladiti sa realnom ponudom i primenljivim propisima.
- Korisničke kombinacije: online upiti/porudžbine za dozvoljeni asortiman DA/NE × opšte savetovanje DA/NE. Primarni marketinški cilj sajta ne sme da preskoči ni jedno poslovno pitanje.
