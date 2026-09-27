# RMC WEB SOLUTIONS — MASTER PROJECT DOCUMENT

**Datum konsolidacije:** 26.09.2026.  
**Namena:** dugoročni, prenosivi poslovno-tehnički kontekst projekta; čita se pre svake nove faze, razgovora ili rada na repozitorijumu.  
**Poslednja dopuna:** 27.09.2026 — korigovan popis već razvijenih modula, preostali Node/React UX paritet i precizirana veza SITE ID ↔ Portal (Dodatak E). **Čitati najpre Dodatak E, zatim Dodatke D i C** za aktuelne odluke; prethodni odeljci ostaju kao istorija. Novi QA zahtevi ne znače da su sve integracije već implementirane.  
**Odgovorni princip:** razlikovati izvorni dokaz iz arhive/koda, istorijski dokumentovani checkpoint, Codexov prijavljeni status i korisnički potvrđenu praktičnu proveru. Ne tvrditi da je nešto završeno samo zato što postoji kod ili prolaze testovi.

> **PAŽNJA — MASTER nije zamena za aktuelni repozitorijum.** Ovo je dokument projekta, poslovnih pravila, projektnih odluka, razvojne istorije, poznatih rizika i sledećih koraka. Poslednja istina o linijama koda, Git SHA, stanju working tree i Render build-u utvrđuje se iz stvarne razvojne grane i logova. Dated istorijski statusi su navedeni kao istorija; ne prepisivati njihov „trenutni status“ preko novijeg stanja.

## 0. POREKLO I OPSEG INFORMACIJA

Korišćeni podaci:
1. **Stvarni dostavljeni originalni V39.5 fajlovi:** arhiva `V39_5_ADVISOR.zip` (originalni `index.html`, kompletni `assets/js/` i `assets/css/` delovi koji su dostavljeni). U njoj su stvarni V31–V39.5 slojevi, originalni AI Advisor i `business-registry-v1.js` sa 72 unosa. Ovo **nije kompletna originalna foto-biblioteka** niti garantovano kompletna distribucija V39.5.
2. **Stvarni dostavljeni React UI fajlovi:** `REACT_ADVISOR.zip` (`main.jsx`, `style.css`, `index.html`, `package.json`) i kasnije pripremljeni AI UI patch-evi. Oni su preseci određene lokalne verzije, ne garantovano današnje stanje celog monorepoa.
3. **Raniji projektni checkpoint-i:** `PROJECT_STATUS.md` (V41.5–V41.9 i V43.3 checkpoint), `PROJECT_HANDOVER.md` (V43.2.1), `README.md` V41.8 i prethodni dugi master handover tekst iz projektnih razgovora.
4. **Poslovne odluke i izveštaji iz tekućeg projekta:** D1–D5.1, dogovor o D6, Git/Render staging infrastruktura, univerzalni Portal i ONLINE FIRST/PREVIEW plan do 26.09.2026.

**Neprovereno/nepotpuno:** nisu svi originalni, zasebni ZIP-ovi *svake* istorijske međuvrzije V31–V39.5 trenutno ovde dostupni za red-po-red poređenje. Originalni V39.5 JS i CSS sadrže njihove verzionisane slojeve, a checkpoint dokumenti pokrivaju kasnije ključne migracije. Nisu nezavisno pregledane sve lokalne promene koje ostaju na korisnikovom računaru. Verzije posle potvrđenih V43.3/D5.1 ne proglašavati implementiranim bez Git dokaza.

## 1. PROIZVOD I OSNOVNA POSLOVNA IDEJA

RMC Web Solutions je poslovno orijentisan generator kompletnih samostalnih web sajtova. Ne prodaje samo generički dizajn: **Advisor razume vrstu poslovanja, prikuplja ključne odgovore i oblikuje ispravnu kombinaciju modula, sadržaja, formulаra i poslovnih akcija**. Rezultat se pregleda u aplikaciji i izvozi kao potpuno funkcionalan statički ZIP sa pripadajućim slikama, stilovima i JavaScript runtime-ovima; pojedine funkcije po potrebi komuniciraju sa zaštićenim RMC serverom.

Jedna firma može biti prodaja, usluga ili hibrid, npr. prodavnica auto-delova + servis, vinoteka + degustacije ili salon nameštaja + stolar. Marketinški cilj sajta **nije isto što i poslovna sposobnost primanja porudžbina**. Korisnik može želeti više poseta, ali ipak dozvoliti online poručivanje; to su nezavisne odluke.

**Javni prodajni koncept (dogovorene okvirne cene):** besplatan potpuno funkcionalan sajt/ZIP sa diskretnom RMC oznakom (0 RSD); Publish 14.900 RSD; Business 29.900 RSD; Commerce od 59.900 RSD. Business i Commerce se komercijalno razlikuju od besplatnog ZIP-a dodatnim uslugama, personalizacijom, katalogom i kompleksnošću. Bez lažne tvrdnje da besplatni ZIP uključuje online naplatu, stvarni lager, automatizovan email ili nepripremljene integracije. Partnerstvo za hosting ranije razmatrano sa Webglobe-om; produkciona javna adresa još nije konačno zaključana.

**Brand/UX:** primarno srpski tekst. Originalni javni landing V39.5 „Napravite svoj sajt. Besplatno.“ treba da bude verna vizuelna referenca; ne menjati staro iskustvo novom generičkom „AI studio“ formom. Šest originalnih demo primera na glavnom landingu nije isto što i devet trajnih PREVIEW testnih sajtova.

## 2. NEPROMENLJIVI ARHITEKTONSKI PRINCIPI

```
Korisnikov prirodan opis posla
          ↓
AI/heurističko razumevanje i ADVISOR (poslovno značenje i odluke)
          ↓
BUSINESS REGISTRY V1 (72 poslovna zapisa: činjenice i foto-namespace)
          ↓
Domen-specifičan plan i capabilities + odgovori korisnika
          ↓
siteConfig / zajednički render/export model
          ├─ React Preview (koristi isti serverski izlaz)
          └─ samostalni izvezeni ZIP sa svim aktivnim modulima
                ├─ Commerce / katalog / Pick & Collect ili direktan upit
                ├─ Booking / Redis ako konfiguracija zaista aktivira Booking
                ├─ Availability / WhatsApp/Viber gde je relevantno
                └─ ostale sekcije: header, hero, trust, about, FAQ, location itd.
```

- **Advisor** poseduje poslovno značenje, primarni i sekundarni posao, cilj, `businessMode`, `emphasis`, koja pitanja postaviti, capabilities i plan modula.
- **Registry V1** čuva **samo** `business ID`, `domain`, `assetRoot`, `assetExists`, `assetRoles`, `catalogDimensions`, `productAttributes`. Ne sme sadržati renderer, CTA, vizuelni stil, redosled sekcija, modalnu interakciju ili business goal.
- **Renderer/runtime** pretvara Advisorove podatke u stvaran izlaz. Nasleđenu business-specifičnu UI logiku ukloniti tek kada odgovarajuća nova zamena postoji i testirana je.
- **Preview/ZIP paritet:** identični poslovni izlaz i runtime; Preview ne sme ulepšavati ili glumiti funkcionalnost koju ZIP ne poseduje.
- **Pet stilova** utiču na sistemske vizuelne tokene i odgovarajuće animacije, ne menjaju poslovne ugovore niti pravila sistemskih modala.
- **Samo serverska privatna logika**: frontend HTML/CSS/JS može se videti u svakom browseru bez obzira na domen ili hosting. Komercijalno osetljivi generator, poverljivi ključevi i Redis pristup ostaju u Node API-ju na Renderu. Nikad ne objavljivati `.env`, privatne tokene, VAPID private key ili pairing kod u javnoj distribuciji.

## 3. ORIGINALNI JAVASCRIPT PROJEKAT — V31 DO V39.5

**Originalna Windows referenca:** `D:\RMC\AI - chat GPT (BOB)\web solutions\web-solutions` (korisnikova originalna kopija/read-only; jedna arhivirana kopija sa nazivom nalik `web-solutions-V39_5_BACKUP_SAFE`). Nikada je ne prepisivati novim React fajlovima.

### 3.1. Modularna evolucija originala

| Oznaka | Originalni sloj | Namena i nepromenljive UX odluke |
|---|---|---|
| V31 | Header/Menu | Light/dark/overlay režimi, sticky navigacija, mobilni meni, CTA vidljiv na telefonu. |
| V32 | Hero | Full-bleed/16:9 vizuelni blok, tekst koji odgovara biznisu, do dva CTA; bez generičkog nepotrebnog eyebrow u generisanim sajtovima. |
| V33 | Izdvajamo | Kontekstualni naslov/stavke, originalni popup i odgovarajući podaci za kasniji Welcome/Carousel. |
| V34.x | Catalog/Shop, neutralni modal, retail registry/controller i handoff | Artikli, grid/list, varijante, količine, detalji, poruka/narudžbina; ne mešati dostupnost i stvarno plaćanje. |
| V35.x | Showcase/Portfolio, asset contracts | Obilazak ponuđenih radova/proizvoda i odgovarajuće kurirane slike. |
| V36.x | Trust/Proof, univerzalna orkestracija | Dokazne poruke i poslovne prednosti vezane za delatnost. |
| V37 | Reviews | Komponenta ocena/utisaka uz pravila ilustrativnog sadržaja u DEMO verzijama. |
| V38 | About/Team | Uloga ljudi, poslovna priča i timske fotografije; jedna osoba po team assetu. |
| V39 | FAQ | Layered/sector FAQ prema poslovnom profilu; poslovno prilagođena pitanja. |
| V39.5 | Stabilan javni Index + AI Advisor + retail integracija | Finalizovana javna prezentacija, AI razgovorni modal, šest primera, preview modal i razvijena JS poslovna logika. |

Verzionisani originali stvarno prisutni u dostavljenom V39.5 paketu: `assets/js/core/module-builder-v34-4.js` ... `module-builder-v39.js`, `universal-orchestrator-v36-0-3.js` i `v39-0-1.js`, `assets/js/ui/{header-v31,hero-v32,featured-v33,showcase-v35,trust-v36,reviews-v37,about-team-v38,faq-v39}.js`, odgovarajući CSS slojevi i poslovni data registri. Među starijim slojevima postoje i specifični maloprodajni moduli za mesaru, vinoteku, minimarket, vodovodnu/elektro opremu, telefone, auto-delove i nameštaj.

### 3.2. Originalni Index — tačno UX ponašanje

Referenca je stvarni stari `index.html` sa `ws-header`, dark header/hero, stvarnim **browser snapshotom picerije**, dokaznim pokazateljima, „kako radi“ sekcijom, šest primera, punim paketima, mobilnim karticama paketa, hosting blokom, pet FAQ stavki, završnim CTA i footerom. Mobilni meni nije prosto sakrivena desktop navigacija. Postoje `data-reveal` animacije i brojači, s poštovanjem mobile/safe-area detalja.

**Šest glavnih demo primera:** frizerski salon, picerija, vinoteka, salon nameštaja, optika, auto-servis. Na glavnom landingu otvaraju **jedan zajednički interni preview dijalog** sa tabovima i iframe-om. Ovo nisu devet budućih PREVIEW integracionih testova.

### 3.3. Originalni AI Advisor — posebno važno

Original koristi `#advisorOverlay` i `.advisor-card`, fiksni overlay sa blur pozadinom, modal do oko 860px, header s Nazad/progresom/korakom/zatvaranjem, fokus u modalu, interni skrol i iOS `100dvh`/safe-area. Originalni JS `assets/js/ui/advisor-ai-v1.js` dokazuje faze poput `description`, `goal`, `featured`, uslovni `operations`, `style`, `company` i `clarify`; AI acknowledgment animacija (typewriter) pa sledeće pitanje/odgovori; kontekstualni predlozi u chip/option formi, AI naglašavanje i različite ciljeve zavisno od posla. `advisor-ai-v1.css` i `advisor.css` su izvori vizuelne istine.

**Princip korisničkog toka:** jedan razgovorni korak u jednom trenutku, korisnik opisuje posao prirodnim jezikom, dobija potvrdu šta je prepoznato, zatim relevantne izbore sa preporukom. **Ne** predstavljati stalnu developersku formu levo i prazan iframe desno. Tek na kraju se otvara **poseban velik preview modal**, sa nazivom sajta, stilom, izborom uređaja i ZIP akcijom. Originalni primeri koriste svoj sample modal, nezavisan od završnog generisanog previewa.

Nova React implementacija zadržava samo **aktuelnu poslovnu logiku** i API pozive, dok rekreira jasno dokazano staro UX ponašanje; ne kopirati staru JS poslovnu logiku direktno u React.

### 3.4. Dizajn generisanih sajtova i mediji

Usvojeno: pet stilova **Tradicionalni, Moderni, Topli, Tehnološki, Premium**. Tradicionalni bez agresivnih reveal efekata; ostali stilovi imaju primerene animacije. Hero asset tipično 16:9, usluge 4:3, fotografije tima 3:4 jedna osoba, retail proizvodi 4:3; bez nepotrebnih kolaža. Preferirati originalni `assets/images/curated/<business>/` namespace kada postoji. Stara biblioteka je obuhvatala desetine paketa i više stotina slika, ali tačan trenutni broj iz aktuelnog monorepoa treba proveriti — ne tretirati stare procene kao live inventar.

## 4. REACT/NODE MIGRACIJA — ISTORIJA I PARITET

**Aktuelni radni monorepo:** `D:\RMC\AI - chat GPT (BOB)\web solutions\web-solutions-react-node`. Git repo `retailmediacenter/web-solutions`, trenutno se radi na razvojnoj grani `development/v43-3` (prijavljeno). Stara V39.5 verzija je read-only referenca, a ne mesto razvoja.

Historijski checkpoint dokument `PROJECT_STATUS.md` razlikuje:

- **V41.4:** već funkcionalni Commerce primeri: mesara, vinoteka, obuća i niz retail/catalog scenarija, sa sticky cart, varijantama, Viber/WhatsApp/kopiranjem i originalnim maloprodajnim specifičnostima.
- **V41.5:** Universal Booking Engine — četiri režima `appointment`, `reservation`, `consultation`, `request-slot`, s industrijski relevantnim poljima; pitanje u Advisoru eksplicitno uključuje Booking; DA/NE ne sme kreirati lažnu booking formu. Ovo je prvobitno koristilo pripremu poruke, pre kasnije Redis integracije.
- **V41.5.2:** regresija `data-service` atributa na karticama i izboru usluga — stvarni escaped nazivi i fallback umesto doslovnog `${esc(...)}` stringa.
- **V41.6:** do 53/72 primarna scenarija u toj istorijskoj fazi (provereni pekara DA/NE, ketering, selidbe; ne mešati sa kasnijih 72/72).
- **V41.7:** deset dozvoljenih Hybrid kombinacija za osam već migriranih primarnih delatnosti; zasebni sekundarni UI/runtime, bez kvarenja primarnog Commerce/Booking procesa.
- **V41.7.1:** deset originalnih demonstracionih vozila vraćeno u katalog za odgovarajući auto hibrid; jasno označeno da nisu realan lager.
- **V41.8:** svih 72/72 *osnovnih* scenarija dobijaju Advisor/server-render scenario, uključujući 19 vertikalnih sektorskih formulara. To nije potvrda potpunog vizuelnog/poslovnog pariteta originala.
- **V41.8.1:** apoteka — uslovni dozvoljeni Commerce katalog/korpa/upit + odvojeno opšte savetovanje, bez prikupljanja dijagnoza ili podataka o terapiji; bez lažne online prodaje lekova.
- **V41.9 / V41.9.1:** pet stilova, jedan neutralni GlobalModal, detalji responsive/sticky akcija; Commerce `ordersEnabled` kao nezavisno pitanje za 17 cenovno opremljenih retail profila; marketing goal ≠ kanal poručivanja; prilagođena pitanja po vertikali.
- **V41.9.2:** fokusirana korekcija produktske fotografije u sistemskom modalu; originalne slike mesa mogu koristiti `cover`, izolovani predmeti `contain`; sticky modal footer ostaje dostupan.
- **V42/V42.1:** objedinjavanje realnih kontakata, lokacije, mape na zahtev, radnog vremena i odgovarajućih generisanih kontakt sekcija; direktni Viber/WhatsApp se ne dupliraju u sekciji lokacije ako služe uz formu.
- **V43.2–V43.3:** nezavisan Booking Manager/Business Portal, Node/Redis transport, staging i kasniji D1–D5.1 rad (videti dalje).

Različiti tekstovi istovremeno nose naziv V43 i referišu na stariji koncept modula Contact/Booking; **verziono označavanje nije uvek linearno**. Pri odlučivanju o najnovijem kodu koristiti konkretnu granu i SHA, a ne samo naslov statusnog dokumenta.

### 4.1. Deset podržanih Hybrid parova iz V41.7

| Primarni posao | Opciono sekundarno | Pravilo |
|---|---|---|
| Vodovodni materijal | Vodoinstalater | zasebna forma zahteva intervencije |
| Elektromaterijal | Električar | zasebna forma zahteva intervencije |
| Auto-delovi | Auto-servis | zaseban servisni zahtev |
| Auto-delovi | Prodaja vozila | demonstracioni katalog vozila/upit |
| Auto-servis | Auto-delovi | zaseban kataloški upit |
| Auto-servis | Prodaja vozila | zaseban katalog/upit |
| Prodavnica telefona | Servis telefona | zaseban servisni zahtev |
| Servis telefona | Prodavnica telefona | zaseban kataloški upit |
| Nameštaj | Stolar/montaža | zaseban uslužni zahtev |
| Frizer | Profesionalna kozmetika | sekundarni katalog/upit |

Advisor dopušta maksimalno **jednu kompatibilnu** sekundarnu delatnost. Primarna korpa ili Booking ne sme biti zamenjena sekundarnim formularom. `hybrid-runtime.js` služi posebnom sekundarnom zahtevu.

## 5. BUSINESS REGISTRY — ORIGINALNIH 72 ID-JEVA

Originalni `assets/js/data/business-registry-v1.js` sadrži **72 stvarna zapisa**. Sledeća matrica direktno je izvučena iz priloženog V39.5 koda; **oznaka u koloni tip** opisuje kasniju V41.8 klasifikaciju, nije dokaz da V39.5 svaki od njih poseduje završni Node renderer. `assetExists` opisuje **istorijski V39.5** paket, ne garantuje današnju dostupnost svih fotografija u React repozitorijumu.

| Business ID | Sistem (V41.8) | Domena (V39.5) | Asset V39.5 | Dimenzije kataloga | Atributi proizvoda |
|---|---|---|---|---|---|
| `shoe-shop` | Commerce/catalog | `footwear` | Da | category | size, color |
| `fashion-shop` | Commerce/catalog | `fashion` | Da | category | size, color, model |
| `hair-salon` | Booking | `hair` | Da | — | — |
| `barber-shop` | Booking | `hair` | Da | — | — |
| `beauty-salon` | Booking | `beauty` | Da | — | — |
| `nail-salon` | Booking | `nails` | Da | — | — |
| `massage` | Booking | `spa` | Da | — | — |
| `restaurant` | Booking | `restaurant` | Da | — | — |
| `cafe` | Booking | `cafe` | Da | — | — |
| `bakery` | Commerce/catalog | `bakery` | Da | — | — |
| `pastry` | Commerce/catalog | `pastry` | Da | — | — |
| `fast-food` | Commerce/catalog | `restaurant` | Da | — | — |
| `catering` | Booking | `catering` | Da | — | — |
| `wine-shop` | Commerce/catalog | `wine` | Da | category, type, producer | volume, vintage |
| `liquor-store` | Commerce/catalog | `wine` | Da | category | volume |
| `butcher-shop` | Commerce/catalog | `meat` | Da | category | quantity, weight, preparation |
| `grocery-store` | Commerce/catalog | `grocery` | Da | category | quantity |
| `furniture-store` | Commerce/catalog | `furniture` | Da | category, room, style | color, material, dimensions |
| `home-decor` | Commerce/catalog | `interior` | Da | category | color, material |
| `gift-shop` | Commerce/catalog | `gifts` | Da | category | — |
| `sports-shop` | Vertical / special | `sports` | Da | category | size, color |
| `auto-service` | Booking | `automotive` | Da | — | — |
| `auto-parts` | Commerce/catalog | `autoParts` | Da | category, vehicle, oem | compatibility, oem, brand |
| `tire-shop` | Booking | `tires` | Da | category | size, season |
| `car-wash` | Booking | `carWash` | Da | — | — |
| `appliance-repair` | Booking | `appliances` | Da | — | — |
| `hvac` | Booking | `hvac` | Da | — | — |
| `plumber` | Booking | `plumbing` | Da | — | — |
| `plumbing-supplies` | Commerce/catalog | `plumbing` | Da | category, dimension | dimension, material |
| `electrician` | Booking | `electrical` | Da | — | — |
| `electrical-supplies` | Commerce/catalog | `electricalSupplies` | Da | category | specification, dimension, brand |
| `electronics-store` | Commerce/catalog | `electronics` | Da | category, brand | model, color |
| `phone-store` | Commerce/catalog | `phones` | Da | category, brand | model, color, storage |
| `repair-phone` | Booking | `phones` | Da | — | — |
| `optician` | Booking | `optics` | Da | — | — |
| `dentist` | Vertical / special | `dentistry` | Da | — | — |
| `pharmacy` | Vertical / special | `pharmacy` | Da | category | — |
| `lab` | Vertical / special | `healthcare` | Da | — | — |
| `physio` | Booking | `healthcare` | Da | — | — |
| `clinic` | Vertical / special | `healthcare` | Da | — | — |
| `vet` | Vertical / special | `healthcare` | Da | — | — |
| `accounting` | Booking | `accounting` | Da | — | — |
| `consultant` | Booking | `consulting` | Da | — | — |
| `law-office` | Booking | `legal` | Da | — | — |
| `property-manager` | Booking | `property` | Da | — | — |
| `marketing-agency` | Vertical / special | `marketing` | Ne | — | — |
| `software-company` | Booking | `software` | Da | — | — |
| `it-support` | Booking | `itSupport` | Da | — | — |
| `security-systems` | Booking | `security` | Da | — | — |
| `print-shop` | Vertical / special | `printing` | Ne | — | — |
| `real-estate` | Vertical / special | `realEstate` | Da | — | — |
| `construction` | Vertical / special | `construction` | Da | — | — |
| `interior-design` | Vertical / special | `interior` | Ne | — | — |
| `language-school` | Vertical / special | `language` | Da | — | — |
| `training-center` | Vertical / special | `training` | Da | — | — |
| `kindergarten` | Vertical / special | `kindergarten` | Da | — | — |
| `kids-playroom` | Booking | `playroom` | Da | — | — |
| `event-venue` | Booking | `eventVenue` | Da | — | — |
| `apartments` | Vertical / special | `accommodation` | Da | — | — |
| `hotel` | Vertical / special | `accommodation` | Da | — | — |
| `rent-a-car` | Vertical / special | `rental` | Da | — | — |
| `travel-agency` | Vertical / special | `travel` | Da | — | — |
| `fitness-center` | Booking | `fitness` | Da | — | — |
| `fitness-trainer` | Booking | `fitness` | Da | — | — |
| `yoga-pilates` | Booking | `fitness` | Da | — | — |
| `photo-video` | Vertical / special | `photography` | Ne | — | — |
| `cleaning` | Booking | `service` | Da | — | — |
| `carpenter` | Booking | `service` | Da | — | — |
| `locksmith` | Booking | `service` | Da | — | — |
| `moving` | Booking | `service` | Da | — | — |
| `painter` | Booking | `service` | Da | — | — |
| `tiler` | Booking | `service` | Da | — | — |

Napomena: sportska radnja u relevantnom starijem checkpointu poseduje sektorski upit/kategorije, ne garantovano realan cenovni inventar i checkout. Apoteka je zaseban uslovni slučaj. Uslovne nezavisne opcije za mesaru (priprema mesa) i vinoteku (degustacije) ne smeju se prepisati generičkim retail pravilima.

## 6. OPERATIVNI MODULI I NJIHOVI UGOVORI

### 6.1. Zajednički sloj generisanog sajta

- Header/sticky menu i kontekstualni CTA; Hero sa poslovno usklađenom fotografijom/tekstom; Izdvajamo; katalog/usluge; Showcase; Trust; Reviews; About/Team; FAQ; Contact/Location/Map; Footer.
- Renderovati **samo** modul koji je Advisor zaista aktivirao i za koji poslovni podaci postoje. Pet stilova menja vizuelnu izvedbu, ne redosled poslovnih potvrda i transport.
- Kontakt telefon/email/adresa/radno vreme moraju biti stvarni ili jasno označeni kao demonstracioni. Nema lažnog `tel:` broja. Lokacijsku mapu učitati po potrebi.
- Jedinstven sistemski GlobalModal: neutralna približno 97% neprozirna površina, fiksni header/footer, skroluje se sadržaj; mobilni safe-area, fokus/Escape i sticky korpa se proveravaju.
- V41+ React Preview i ZIP moraju koristiti **isti serverski render/export**, a ne jedan set skripti za iframe i drugi za ZIP.

### 6.2. Commerce / Catalog / Pick & Collect

- Cena, varijante, kategorije, količina, product popup, korpa i poslovna poruka samo gde postoje pravi podaci i aktivno `ordersEnabled`.
- `ordersEnabled` se pita odvojeno od glavnog marketinškog cilja; NE znači katalog + upit o dostupnosti, ne korpu; DA omogućava poručivanje prema postojećem modu.
- Nema automatske online naplate, potvrde lagera, fiskalizacije ili automatskog prihvatanja porudžbine dok ne postoji odgovarajući backend i ugovorena pravila.
- Availability (WhatsApp/Viber/copy) je zaseban direktan upit. Ne pretvarati ga u Booking ili četvrti „poslovni engine“.
- Posebne karakteristike: mesara težina/priprema, vino zapremina/godište + opciona degustacija; obuća/odeća broj/boja; auto-delovi kompatibilnost/OEM; nameštaj soba/stil/dimenzije.
- **Planirani sledeći korak (NIJE sada implementirano):** Commerce porudžbine i Pick & Collect transport prema istom Business Portalu koji prima Booking, s modulom „Porudžbine“. Zadržati jedan sajt/profil/identitet, bez drugog postupka uparivanja.

### 6.3. Booking — četiri poslovna formulara, dva vremenska režima

Poslovni formulari:
1. `appointment` — izabrana usluga + tačan datum/vreme (frizer itd.).
2. `reservation` — datum/vreme i broj osoba/gostiju (restoran/događaji).
3. `consultation` — tema, način razgovora, datum/vreme (profesionalne usluge).
4. `request-slot` — datum + željeni deo dana + relevantni detalji (servisi/terenski rad), bez izmišljanja vremena.

Transportni režimi uvedeni u D5.1:
- `EXACT_TIME`: važeći `date` + validno `time`.
- `DAY_PART`: važeći `date` + `dayPart ∈ {MORNING,AFTERNOON,ANY}`; **nema** izmišljenog vremena. Zahtevi bez `timingMode` za kompatibilnost se tumače kao EXACT_TIME.

Sajt šalje **zahtev, ne potvrđenu rezervaciju**. Osmokarakterni javni `reservationCode` iz API-ja je ID za razgovor sa korisnikom, a interni UUID `requestId` ostaje ključ idempotentnosti/ACK. D5 success modal: „Zahtev je uspešno poslat“, stvarni kod, termin nije potvrđen, Zatvori. Bez internog UUID ili starih WhatsApp/Viber instrukcija za API/Redis Booking. Ako submit padne, retry sa istim nepromenjenim zahtevom koristi isti `requestId`.

`DAY_PART` ulazi kao otvoren zahtev i **ne** rezerviše kalendar. Vlasnik šalje konkretan predlog preko WhatsApp/Viber, tek po dogovoru i vlasnikovoj potvrdi postaje lokalni kalendarski termin. Kod EXACT_TIME vlasnik može potvrditi traženi ili ponuditi drugi termin. Otvaranje WhatsApp/Viber aplikacije nije dokaz da je poruka poslata ili da je klijent prihvatio predlog.

### 6.4. Vertikalni sektorski formulari

V41.8 19 sektorskih scenarija koristi `render-vertical.js`/`vertical-runtime.js` ili poseban apotekarski runtime; primeri obrazovanje (program/nivo), turizam (datumi/gosti, rent-a-car preuzimanje), nekretnine (lokacija/budžet), marketing/štampa/dizajn (obim/budžet/rok), medicina (minimalni neosetljivi upiti). **Nisu automatski Redis Booking** i trenutno ne dobijaju Business Portal rezervaciju samo zato što imaju datum u formularu.

**V44 audit zadatak:** odlučiti na osnovu dokumentovane poslovne logike koji dodatni vertikalni sektori treba da postanu Booking; ne menjati sve naslepo.

## 7. RMC BUSINESS PORTAL — ZASEBNA PWA

Izvorno Booking Manager, potom brendiran **RMC Business Portal**. Nezavisan Vite/PWA frontend koji koristi Node API. Primarni korisnik je vlasnik biznisa na telefonu, uz podršku desktopu/Windowsu.

**Trenutna Booking funkcionalnost:** Početna; Rezervacije → Zahtevi/Dan/Nedelja; Podešavanja; preuzimanje zahteva; poslovni profil/usluge sa sajta; lokalni operativni parametri gde još postoje; predlog termina; potvrda/odbijanje; WhatsApp/Viber sa fallback kopiranjem; lokalni IndexedDB; backup/restore; ICS; PWA Web Push. Commerce navigacija ne treba da se lažno predstavlja kao funkcionalna dok porudžbine nisu integrisane.

**Podaci:** Redis nije centralni kalendar. Redis čuva privremeni red nepreuzetih zahteva; tek nakon uspešnog lokalnog upisa i ACK server čisti zahtev. Lokalni kalendar na jednom glavnom uređaju; nema sinhronizacije dva nezavisna telefona bez posebnog budućeg rada. Backup nije isto što i sinhronizacija.

**D1–D5.1:**
- D1: Početna/Rezervacije/Podešavanja umesto developer menija; Commerce skriven.
- D2: čitljiv profil preuzet iz siteConfig, usluge i lokalni operativni parametri, uparivanje/Push/backup; bez slučajnog gubitka starih profila.
- D3: WhatsApp/Viber predlošci za potvrdu, alternativni termin i odbijanje, kod i normalizacija telefona; aplikacija **ne šalje poruku samostalno**.
- D3.1: API izdaje stabilan jedinstven osmokarakterni `reservationCode` po prvom SUBMIT-u; isti kod za retry/duplikat/posle ACK unutar propisanog perioda mapiranja. UUID ne izlagati kao korisnički kod.
- D4: pravi RMC logo i PWA ikonice bez promene SW scope/IndexedDB.
- D5: kompaktan generated-site API Booking success modal, jasna slanja/greške/retry, bez starih direktnih komunikacionih instrukcija.
- D5.1: `DAY_PART` i integracija degustacija vinoteke sa istim Booking transportom i profilom; pripadajući testovi. Konkretan Git status vidi §10.

**Namerno NEIMPLEMENTIRANO / otvoreno:** kompletan Commerce Inbox u Portalu; dugme „Prekini vezu sa sajtom“ i odgovarajuće autorizovano odjavljivanje Push uređaja; univerzalno uparivanje Commerce-only sajtova; pouzdani obnovljivi testni identiteti; centralna višekorisnička sinhronizacija.

## 8. RENDER NODE API + UPSTASH REDIS + PUSH

```
Generisani HTTPS sajt (javni siteId, nikad privatni token)
        │ POST booking request {siteId,requestId,...}
        ▼
Render Node API ── privatan Upstash Redis staging/production
        │ queue/poll na osnovu Manager bearer tokena
        ▼
Business Portal PWA ── lokalni IndexedDB kalendar
        │ lokalni commit pa ACK
        ▼
Node API potvrđuje preuzimanje; izbacuje poruku iz reda
```

**Pairing — ISTORIJSKI OPIS, NE CILJNO PRAVILO:** dosadašnji Booking-only export izdaje jednokratni kod na 30 minuta tokom pouzdanog export-a, prikazuje ga u generatoru i (još u postojećem exporter-u) pakuje `BOOKING_UPARIVANJE.txt` u ZIP. **To poslednje je prepoznat bezbednosni dug:** prema konačnoj odluci iz Dodatka C kod ne sme biti ni u javnom sajtu ni u preuzetom javnom ZIP-u, čak ni u TXT-u. Redis `GETDEL` je osnova atomarnog jednokratnog claim-a, validirati profil pre nepovratnog trošenja; prenositi `siteId`, poslovni profil, usluge, bearer token; token se čuva privatno u Portalu, na serveru njegov SHA-256 hash. Do 72h za privremeni red zahteva; SHA mapiranje odgovarajućeg korisničkog rezervacionog koda proveriti u aktuelnom API-ju.

**Push:** VAPID standardni Web Push, Windows i instalirana iPhone PWA praktično provereni. Push neuspeh **ne sme** oboriti uspešno prihvaćen Redis zahtev; `requestId` duplikat ne sme izazvati dupli Push. SW menja samo odgovarajući Cache Storage, **ne sme brisati IndexedDB profile/rezervacije**. VAPID privatni materijal čuva se isključivo u odgovarajućem Render env; ne kopirati u repo, javni ZIP ili master dokument.

**CORS:** `CLIENT_ORIGIN` na staging API-ju čuva postojeće origin-e (staging Portal, lokalni dev origin-i, glavni staging static site). Nove adrese se **dodaju**, ne prepisuju celu listu. Puni staging `VITE_API_BASE_URL` mora biti eksplicitno podešen; lokalni Vite bez njega može preko `/api` proxy-ja pogrešno izdati kod u drugom Redis okruženju. Nikad ne mešati lokalni API i staging Portal pri uparivanju.

## 9. REPOZITORIJUM, ENVIRONMENTS, DOMENI

**Privatni repo:** `retailmediacenter/web-solutions`; razvoj `development/v43-3`; produkcionu `main` i staru `v43-booking-test` ne dirati tokom staging popravki. GitHub privatni izvori ne treba da budu javni samo zbog Pages hostinga. Render Static Site može čitati privatni repo.

**Poznate staging adrese prema dogovorenoj konfiguraciji:**
- API `https://rmc-web-solutions-api-staging.onrender.com` (Express/Node, repo root, build `npm ci --omit=dev`, start `npm run start -w server`).
- Business Portal `https://rmc-booking-manager-staging.onrender.com` (static, `apps/booking-manager`, build `npm run build`, publish `dist`).
- Glavni Web Solutions static `https://rmc-web-solutions-staging.onrender.com` (repo root, build `npm ci && npm run build -w client`, publish `client/dist`, `VITE_API_BASE_URL=...api-staging...`, `VITE_BASE_PATH=/`, Node `22.15.0`).

**Buduće produkciono odredište:** može biti `retailmediacenter.com/web-solutions/` na postojećem hostingu ili poseban domen `biznisweb.rs`. Sadašnji statički staging koristi root `/`, budući podsajt podešava `VITE_BASE_PATH=/web-solutions/`; ne hardkodovati base u poslovnu logiku. Render API i Upstash ostaju odvojeno konfigurisani za staging/production. Klijentov generisani sajt je zaseban ZIP i ne zahteva preseljenje javnog generatora.

**VAŽNO: browser JS nikad nije tajan.** Zaštićen je serverski generator/poslovna tajna/Redis token; CSS/frontend je vidljiv posetiocu na svakom domenu.

## 10. ZABELEŽENI GIT I LIVE STATUS — 26.09.2026.

### 10.1. Ključni potvrđeni/prijavljeni checkpoint-i

| Commit | Značenje | Nivo potvrde |
|---|---|---|
| `19b7ca2` | V43.3 B — Booking profil iz siteConfig i stabilni serviceId | istorijski PROJECT_STATUS + Codex |
| `8c872a6` | V43.3 C — Web Push | istorijski PROJECT_STATUS + praktičan Windows/iPhone test |
| `6a53234` | D3.1 kratki kodovi rezervacija | prethodni Codex izveštaj |
| `ffcc269` | D2/D3 Portal profil i komunikacija | prethodni Codex izveštaj |
| `d20a7be` | D5.1 funkcionalnosti | Codex prijavio push |
| `dccf235` | DAY_PART korekcija; staging API ručno objavljen na toj verziji u trenutku prijave | Codex prijavio |
| `cfee1ad` | Etapa B React landing i šest starih demo primera | Codex prijavio push |
| `4bb5459` | Render staging konfiguracija | Codex prijavio push |
| `4bb6799` | staging/production build šabloni | Codex prijavio push |
| `f1c33ec` | AI Advisor UI iz lokalne zakrpe, tri fajla commit/push preko GitHub Desktopa | korisnik poslao screenshot GitHub Desktop i Render deploy |

Navedeni commitovi nisu garancija da je sadržaj ispravan ili da je svaki servis istog SHA. Render API, Portal i React Static mogu koristiti različite deploy revizije; pre integracionog testa evidentirati tri SHA odvojeno.

### 10.2. Trenutni BLOKER i ograničenja provere

**26.09.2026:** korisnik je potvrdio da Render Static Site za Web Solutions prikazuje uspešan build/deploy na commitu `f1c33ec`, ali glavna online stranica vraća `Not Found`, kao i pokušaj preko `/index.html`. `Root Directory` je prikazan kao prazan, Build Command kao `npm ci && npm run build -w client`, Publish Directory `client/dist`; deploy log screenshot pokazuje build i deploy uspešne. Razlog *nije potvrđen*. Ne tvrditi bez dokaza da je kriv React, publish path ili keš. Ranije dat „direktan CSS link“ nije bio verifikovan iz stvarnog hasha, pa njegov 404 nije dijagnostički dokaz. Izbegavati kružno slanje istih provera i nasumične izmene. Rešavati jednim konciznim, instrumentiranim dokaznim korakom ili kroz odgovarajući pristup stvarnim Render logovima/konfiguraciji.

**Veliki lokalni working tree:** GitHub Desktop je prikazivao ~1009 promena, nakon izdvajanja tri fajla ~1006, uključujući mnoge rezervne/untracked fajlove. Ovo **nisu automatski 1006 namernih modifikacija aplikacije**. Ne raditi „Commit all“, `git clean`, reset ili masovni overwrite. Poznata su četiri odvojena nedovršena mala D6 lokalna popravka (radna vremena u Portalu, DAY_PART modal i Booking CSS prema Codexu) koja nisu uključena u UI commit. Stanje fajl-po-fajl pre sledećeg commita mora se potvrditi lokalno.

**Pristup kroz ChatGPT GitHub konektor:** pokušaj čitanja `client/src/main.jsx` na privatnoj razvojnoj grani vratio je 404 u ovoj sesiji. To ne dokazuje da GitHub repo/fajl ne postoji; pristup/permisije mogu biti uzrok. Ne obećavati direktne Git izmene dok se pristup ne verifikuje.

## 11. ONLINE FIRST — ODOBRENI CILJ ZA ETAPE A–E I D6

Umesto stalnog lokalnog pokretanja Vite, tri BAT fajla i tri prozora, razvojni tim priprema kod lokalno ili kroz git, ali **korisnik praktično testira jedinstvene usklađene online staging verzije prvenstveno telefonom**. Ne uvoditi ponovo lokalni staging kao obavezan vizuelni QA za korisnika.

### Etapa A — vizuelna mapa originalne V39.5

Codex je pripremio mapu za header, hero, šest primera, Advisor overlay, final preview, mobilne interakcije; original postoji u read-only direktorijumu. Etapa A je korisnički odobrena.

### Etapa B — glavni Web Solutions staging

**Cilj:** verna React reprodukcija originalnog **celog** javnog Indexa i **AI razgovornog modalnog UX-a**, uz sve nove React poslovne odluke, API i ZIP export. Etapa B ranije pogrešno interpretirana kao novi landing + developer `.studio` u modalu; korisnik je izričito odbio tu interpretaciju. Kasnije je zasebno pripremljena AI Advisor UI zakrpa i commitovana, ali je online vizuelni QA **blokiran `Not Found` problemom**. Etapu B ne proglašavati završenom bez stvarnog pregleda desktop/iPhone rada i D5.1 kompatibilnosti.

Šest originalnih javnih demo primera ostaju deo glavnog sajta i otvaraju se u zajedničkom preview modalu. Nema mešanja sa devet nezavisnih testnih ZIP sajtova. Render static je izabran umesto Pages jer je razvojni GitHub repo privatan, a trenutni Pages plan ne ispunjava uslove za privatno objavljivanje.

### Etapa C — DEVET TRAJNIH **STVARNIH** PREVIEW SAJTOVA

**Preview katalog na istom staging statičkom sajtu:** `/preview/` s horizontalno skrolujućim karticama unutar četiri kategorije, jedna stalna URL adresa za telefon. Svaka kartica vodi do kompletnog, funkcionalnog raspakovanog **stvarnog ZIP-a** koji je izvezao postojeći Advisor/Node generator; apsolutno bez posebnog demo renderera ili ručno sklepanog HTML-a. Svaki sajt mora imati SVE module iz konkretne Advisor konfiguracije (header, hero, Trust/FAQ, Commerce/Pick&Collect, Booking, lokacija, modal, runtime, fotografije, footer). Šta ne postoji u outputu = stvarni testni nedostatak, ne ručno popravljati preview.

| Kategorija | Devet fiksnih scenarija | Ključni test |
|---|---|---|
| Prodaja | Minimarket, odeća | katalog/varijante/porudžbine/Pick&Collect |
| Servisi | Auto-servis, vodoinstalater | industrijska polja + DAY_PART |
| Hibridi | Vinoteka, mesara | vino/katalog + degustacije Booking; mesara/priprema + porudžbine (mesari ne izmišljati Booking) |
| Usluge | Frizer, restoran, poslovni konsultant | EXACT_TIME, gosti, konsultacije |

Deveto-scenarijske config JSON datoteke treba da pređu kroz **stvarni `buildSitePayload()` i `exportSiteZip()`**, sa zajedničkom verifikacijom ZIP/preview pariteta i jednakosti realnom klijentskom exportu. Identifikacioni `preview/manifest.json` s commitom, datumom i aktivnim modulima se objavljuje tek sa kompletnim paketom; static hosting treba atomarni deploy artefakt (generator + preview početna + devet sajtova). Datum/commit omogućava jasno prepoznavanje verzije.

**Stalni Preview identiteti i kodovi — DOGOVORENO, NEIMPLEMENTIRANO:** svaki od devet staging sajtova dobija stalni server-side testni `siteId` i **privatni višekratni testni pairing kod** koji se koristi samo u zaštićenom stagingu. Za korisnika lokalno/privatno `PRIVATE_PREVIEW_CODES.txt` sa nazivima i kodovima (nikad repo, javni ZIP, manifest, Action log, Pages, screenshot). Ograničiti pokušaje, koristiti dugu nasumičnu vrednost, mogućnost opoziva, ne uticati na produkcijsko jednokratno uparivanje. Svaki nov Preview deploy ažurira dati testni profil bez generisanja druge firme i bez ponovnog uparivanja. Ova odluka zahteva zaseban projektni/bezbednosni pregled pre implementacije; ne staviti višekratni tajni kod direktno u javni frontend.

### Etapa D — Business Portal „Prekini vezu“

Dugme u podešavanjima odjavljuje **samo trenutnu instalaciju/uređaj**: prekida aktivni profil, uređajsku Push pretplatu i pristupni token, ali **ne** briše ranije rezervacije/lokalnu arhivu/serverski sajt/ostale uređaje. Sprečiti automatsko ponovno aktiviranje „poslednjeg profila“ bez autorizovanog novog povezivanja. Devet staging Preview firmi može se ponovo povezivati istim privatnim testnim kodom kada odgovarajući model bude implementiran. Za javnu produkciju i dalje važi siguran jednokratni kod ili drugog odobrenog onboarding procesa; bez univerzalnog trajnog produkcijskog koda.

### Etapa E — D6 završna V43.3 regresija kroz online sistem

D6 nije novo poslovno proširenje. Potvrditi generisanje/ZIP/preview svih devet, celokupnu 72-scenarijsku automatizovanu regresiju, stvarni EXACT_TIME i DAY_PART, degustacije vinoteke, Redis/ACK/dedup/Push, WhatsApp/Viber i Calendar samo nakon odgovarajuće potvrde; proveriti iPhone, Windows, PWA i netaknuti Commerce/Availability. Razdvojiti: automatizovano, vizuelno ručno, online end-to-end i neprovereno. Odvojeno evidentirati nedovršenu Commerce integraciju i univerzalni pairing.

## 12. JEDNA FIRMA → JEDAN SAJT → JEDAN KOD → JEDAN BUSINESS PORTAL [ISTORIJSKI NAZIV; ZAMENJEN DODATKOM C]

Ovo je raniji koncept koji je dodatno razdvojen u Dodatku C na trajni SITE ID i privremeni PAIRING CODE. Advisor određuje da li firma ima Booking, Commerce ili oba. Identitet/uparivanje pripada **sajtu**, ne Booking modulu; jedan vlasnik ne treba dva koda samo zato što prodaje i prima termine. **Trenutno:** Booking pairing implementiran za validne Booking profile. **Otvoreno:** univerzalno uparivanje Commerce-only sajtova i aktiviranje modula „Porudžbine“ u istom Portalu. Ne simulirati kao već završeno. Stalni Preview testni kodovi su posebna staging alatka i ne menjaju pravilo bezbednog produkcionog onboarding-a.

Kada se Commerce integriše, prodaja i Booking za vinoteku ulaze u **isti** profil Business Portala; mesara zadržava poslovno smislen model porudžbine/posebnog zahteva bez veštačke rezervacije. Availability zadržava direktnu komunikaciju ako Advisor tako odluči.

## 13. V44 — ŠTA JE REZERVISANO ZA FINALNU ORKESTRACIJU

V44 početi tek kad su Etapa B/C/D + D6 stabilizovani. Predviđeni audit: 72/72 različitih scenario konfiguracija; stvarno preslikavanje `businessMode`, `emphasis`, goal, primarna/sekundarna delatnost i aktivnih capabilities u sadržaj i prioritizovani redosled sekcija; originalni AI Advisor UX i optimalna pitanja; pet stilova i svi moduli od V31; izjednačavanje React previewa sa samostalnim ZIP-om; poštena kontakt/transport objašnjenja; inkluzija poslovnih podataka i stvarni demo vs produkcija; priprema Commerce inboxa i univerzalnog pairing-a u Portalu. V44 ne sme biti blanket redizajn niti skriveni novi projekat.

**Poseban raniji nalaz:** dokaz 72/72 osnovnog renderovanja ≠ dokaz da svih 72 delatnosti imaju sve konačno željene poslovne funkcije. Booking trenutno obuhvata relevantnih 36 servisnih/Booking scenarija + uslovne degustacije; vertikalni sektor ne postaje Redis Booking samo zato što ima datum u formi. Pripremiti razlike kao matrice, pa odlučiti i implementirati samo odobrene izmene.

## 14. QA I DISCIPLINA RADA

- Ne prepisivati staro preko novog, naročito originalni V39.5, aktuelni `main.jsx`, lokalni IndexedDB i 4 nezavršene Portal/Booking izmene.
- Pre UI patch-a proveriti stvarni `main.jsx`/CSS verziju; izmena iz starijeg trenutnog ZIP-a može imati konflikt sa daljim Codex lokalnim izmenama. Potrebna je hash/diff provera, ne slepo lepljenje.
- Ne raditi `Commit all` kada GitHub Desktop pokazuje mnoštvo backup/untracked fajlova. Commits male, odobrene, jasno identifikovane; ne menjati `main`, produkcioni Render ili Upstash produkciju u staging fazama.
- Kad Codex limit nije dostupan, ChatGPT može pripremiti izolovan, verziono proveravan patch; ali ne obećavati direktan Git push dok povezani GitHub pristup ne može stvarno čitati ciljnu granu.
- Render Live status dokazuje uspeh platformskog procesa, ne dokaz da `/` služi ispravan UI. Stvarni online HTTP, vidljivost Advisora i ponašanje na telefonu moraju se proveriti.
- Ne otvarati novu razvojnu fazu pre zatvaranja blokerа; dokumentovati **šta je potvrđeno**, **šta je prijavljeno**, **šta je planirano**.
- Korisnik želi jedan glavni statusni dokument, ne zaseban `.md` za svaku sitnu verziju. Ovaj dokument treba ažurirati nakon svakog odobrenog checkpoint-a.

## 15. NEPOSREDNI NEXT STEPS, BEZ PONAVLJANJA PRETHODNIH GREŠAKA

1. **Dijagnostika objavljenog Static Site-a:** fokus na dokazni kontrast build output-a i Render isporuke istog SHA; izbegavati izmišljene hashed asset URL-ove i kružne incognito testove. Potvrditi realan hostname, deploy artefakt, alias/path/routing i status servera, idealno uz instrumentirano jednokratno logovanje iz deployment komande. Ne širiti zahvat na Booking/Advisor bez izvornog dokaza.
2. **Potvrda Etape B:** kad online sajt zaista bude dostupan, pregledati originalni AI modal V39.5 naspram stvarnog React UI-a; potvrdа tipografije/chips/typewriter/1-pitanje/close/back/progress/safe-area/preview modal; provući realan Advisor flow u desktop/iPhone. `f1c33ec` sam po sebi nije UX odobrenje.
3. **Etapa C:** devet kompletnih ZIP preview rezultata iz istog export-a, bez lažnih demonstracionih skripti; stalni URL/identity bez izlaganja privatnih kodova.
4. **Etapa D:** bezbedan uređajski disconnect i retry povezivanje testnih profila.
5. **Etapa E:** D6 kompletna regresija; tek potom V44.

---

## DODATAK A — ORIGINALNI PRISUTNI JS MODULI V39.5 (selektovano)

- `assets/js/core/hybrid-business.js`
- `assets/js/core/module-builder-v34-4.js`
- `assets/js/core/module-builder-v34-5.js`
- `assets/js/core/module-builder-v35.js`
- `assets/js/core/module-builder-v36.js`
- `assets/js/core/module-builder-v37.js`
- `assets/js/core/module-builder-v38.js`
- `assets/js/core/module-builder-v39.js`
- `assets/js/core/site-generator.js`
- `assets/js/core/universal-orchestrator-v36-0-3.js`
- `assets/js/core/universal-orchestrator-v39-0-1.js`
- `assets/js/core/zip-export.js`
- `assets/js/data/business-about-team-registry-v38.js`
- `assets/js/data/business-commerce-registry-v39-5.js`
- `assets/js/data/business-faq-registry-v39.js`
- `assets/js/data/business-registry-v1.js`
- `assets/js/data/business-reviews-registry-v37.js`
- `assets/js/data/business-showcase-registry-v35.js`
- `assets/js/data/business-trust-registry-v36.js`
- `assets/js/ui/advisor-ai-v1.js`
- `assets/js/ui/retail-controller-v34-5.js`

## DODATAK B — REFERENTNI FAJLOVI I PUTANJE

- V39.5 Original: `V39_5_ADVISOR.zip`: `index.html`, `assets/css/`, `assets/js/`. Primer: `assets/js/ui/advisor-ai-v1.js`, `assets/css/advisor-ai-v1.css`, `assets/js/data/business-registry-v1.js`, `assets/js/core/universal-orchestrator-v39-0-1.js`, `assets/js/core/module-builder-v39.js`.
- Aktuelni React UI snapshot iz razgovora: `REACT_ADVISOR.zip` (`main.jsx`, `style.css`, `index.html`, `package.json`). Online UI patch `RMC_ADVISOR_SAFE_APPLY.zip` je **specifičan za taj snapshot**, ne pokretati nad proizvoljno izmenjenim `main.jsx` bez predprovere.
- Istorijski projektni checkpoint-i: `PROJECT_STATUS.md`, `PROJECT_HANDOVER.md`, prethodni `MASTER HANDOVER` tekst (sadrži neke zastarele „trenutne“ tvrdnje — koristiti kao istoriju).
- Trenutna lokalna putanja: `web-solutions-react-node` monorepo; stvarne `server/src` i `apps/booking-manager/src` strukture validirati iz aktuelnog repozitorijuma.
- Ovaj dokument **ne sadrži** korisničke ili serverske tajne, privatne ključeve, lične tokene ni privatne testne pairing kodove.

**Dodatni cilj za budući revizijski dokument:** pri obezbeđenom read pristupu privatnoj razvojnoj grani automatski dopuniti stvarnu mapu React komponenti, `server/src` ruta, payload/renderer ugovora i novi Git SHA; napraviti strojnu matrica pariteta stara V39.5 logika ↔ novi Node servis po modulima. Ne obećavati takvu verifikaciju dok privatni repo vraća 404.


---

## DODATAK C — STALNI SITE ID, JEDNOKRATNI PAIRING CODE I STANJE TRI JAVNE PLATFORME (26.09.2026, VEČE)

**STATUS OVOG DODATKA:** poslovna i arhitektonska odluka USVOJENA u razgovoru, **nije potvrđeno da je svaka promena implementirana u kodu**. U slučaju sukoba sa starijim opisima iz §8, §10–12 ili ranijim handover-ima, ovaj dodatak je novija odluka. Ne „popravljati“ istorijske checkpoint-e retroaktivno — jasno razlikovati postojeći Booking `siteId` od budućeg univerzalnog, trajnog SITE ID-ja dok kod ne bude proverен.

### C.1. Usvojene tri potpuno različite stvari

| Naziv | Svrha | Javnost / ovlašćenja | Životni vek |
|---|---|---|---|
| **SITE ID** | Trajan javni identifikator **konkretnog sajta/projekta**. Povezuje generisani sajt, njegov Project Record, budući Editor, paket, izdanje i istoriju domena. | Može se pojaviti u javnom sajtu i javnom Booking zahtevu; **nikad sam po sebi ne daje pravo izmene**. | Trajan kroz re-export, promene modula, pretplatu i domen. |
| **PAIRING CODE** | Kratkotrajna, jednokratna **dozvola za prvo povezivanje** sajta sa Business Portalom, kako bi Portal primao Booking, a kasnije Commerce zahteve. | **Tajna**: samo vlasnik unosi u privatni Portal. **NEMA je ni u javnom HTML-u, ni u javnom ZIP-u, ni u javnom Preview-u, ni u manifestu, logu ili screenshotu.** | Postojeći Booking ugovor: 30 min i jednokratna upotreba. Za ponavljanje kreira se NOVI kod pod odgovarajućim ovlašćenjem; stari nije trajni identifikator. |
| **PROJECT RECORD** | Trajan serverski zapis sa početnom i izmenjenom konfiguracijom koju je odobrio Advisor: delatnost, ciljevi, poslovni odgovori, aktivni moduli/capabilities, stil, sadržaj, assets, domen, paket i verzija. | Čuva se na **privatnom** backend-u; pristup Editoru i izmene proveravaju zaseban nalog/RMC administrativno ovlašćenje, ne samo SITE ID. | Trajan, verzionisan i sa oporavkom/backup-om. **Još nije dokazano da takva perzistencija postoji.** |

**Ne mešati termine:** `reservationCode` iz Booking potvrde korisniku je ČETVRTI, zaseban podatak za praćenje **pojedinačne rezervacije**, nikada SITE ID niti PAIRING CODE. `requestId` je tehnički idempotency UUID, nije korisnički rezervacioni kod.

### C.2. Jedan sajt → isti identitet u svim fazama

```
BESPLATNI GENERATOR / ADVISOR
   ├── SITE ID (trajni javni identitet jednog sajta)
   │     └── privatni PROJECT RECORD (Advisor konfiguracija + verzije)
   │            ├── budući EDITOR (zasebna autentifikacija/autorizacija)
   │            ├── FREE → PUBLISH → BUSINESS → COMMERCE
   │            ├── dodatni/izmenjeni moduli i sadržaj
   │            └── domen A → domen B, bez promene SITE ID-ja
   │
   └── PAIRING CODE (samo ako postoji aktivan modul za prijem u Portal)
         └── jednokratan CLAIM u BUSINESS PORTALU
               └── trajno povezivanje sa SITE ID-jem + privatni Portal token
                     ├── BOOKING inbox / Redis / kalendar
                     └── budući COMMERCE inbox / porudžbine
```

1. **Besplatan generator** po uspešnom završetku/odobrenju Advisora dodeljuje jedan SITE ID i upisuje početni Project Record, pre nego što se obeća mogućnost kasnijeg editovanja. Ponavljanje export-a ISTOG projekta mora očuvati taj SITE ID; novi sajt je novi projekat. Trenutni generator možda još ne čuva ceo zapis — ne deklarisati ovo kao implementirano.
2. **PAIRING CODE** je potreban samo kada aktivni poslovni modul treba da prima zahteve preko Portala: danas Booking, kasnije Commerce, ili oba. Kod se izdaje na osnovu postojećeg SITE ID-ja i ovlašćenog vlasničkog toka. Ne praviti dodatne trajne identifikatore za module niti zasebne kodove za Booking i Commerce iste firme.
3. **Portal CLAIM** jednokratnim kodom bezbedno uspostavlja vezu sa SITE ID-jem. U postojećem Booking API-ju Portal dobija poseban privatni pristupni token; njegova bezbedna lokalna pohrana i serverska autorizacija ostaju nepromenljivi. CODE se troši, ali veza opstaje. Commerce će koristiti **istu vezu i profil**, kada se njegov transport/inbox stvarno implementira.
4. **Javni izvozni ZIP** sadrži SITE ID, javne HTML/CSS/JS/foto fajlove i API endpoint za aktivne funkcije. **Ne sme** sadržati PAIRING CODE, vlasnički token, `BOOKING_UPARIVANJE.txt` niti drugi zasebni fajl sa tajnom. Prikaz kratkotrajnog koda je dozvoljen u **spoljašnjem privatnom rezultatu generatora**, van iframe-a generisanog sajta, uz bezbednu kontrolu ponovnog izdavanja. Ako korisnik ZIP stavi direktno na hosting, ništa poverljivo ne sme postati javno.
5. **SITE ID nije nalog, lozinka ni pristupno pravo**. Editor mora pri svakom čitanju/izmeni proveriti autentifikovanog korisnika, RMC administratora i vezu sa dozvoljenim Project Record-om. Paket (`free`/`publish`/`business`/`commerce`) je serversko pravo/entitlement, ne parametar koji frontend sam sebi može dodeliti.
6. **Promena domena** menja vezu domen ↔ SITE ID i odgovarajuću konfiguraciju dozvoljenih origin-a; ne menja projekat, Portal vezu, istoriju, niti postojeće rezervacije. Javna API adresa se menja samo ako API selimo. Ne vezivati identitet za GitHub/Render URL ili IP adresu.
7. **Jedna firma/sajt → jedan Portal profil** je ciljni model. Više sajtova iste firme, transfer vlasništva, više admina ili centralna sinhronizacija uređaja su zasebna buduća pitanja, ne implicitno podržane mogućnosti.

**Tehnička kompatibilnost sa postojećim Booking `siteId`:** prvo pregledati stvarni server/Redis/export ugovor. Poželjno je iskoristiti današnji javni `siteId` kao kanonski budući SITE ID **ako je zaista trajno i bezbedno dodeljen**. Ako nije, napraviti kontrolisanu migraciju ili interno mapiranje `canonicalSiteId ↔ legacyBookingSiteId`, bez prekida postojećih Portal profila, tokena i već primljenih rezervacija. NE uvoditi naslepo drugi nepovezani javni `siteId`.

### C.3. Projektni zapis i budući EDITOR — ugovor, ne gotova funkcija

Obavezna minimalna polja konceptualnog zapisa:

```text
siteId                      trajni identifikator
businessId, primary/secondary odgovori i kompatibilna hibridna delatnost
advisorAnswers, goal         poslovni izbori korisnika; marketinški cilj odvojen
capabilities, modulePlan     aktivni Booking/Commerce/ostali moduli i njihov redosled
style, content, assets       verzionisan prikaz i odobrene promene
plan, entitlements          FREE / PUBLISH / BUSINESS / COMMERCE (serverska prava)
domainMappings              postojeći i prethodni domeni/aliasi
version, publishedVersion    verzionisane konfiguracije i aktuelna objava
createdAt, updatedAt        auditna vremenska polja
ownership / permissions      privatna veza sa ovlašćenim upravljačima
```

Ovaj zapis je **po projektu**, odvojen od **Business Registry V1**, koji zauvek ostaje faktografski katalog 72 delatnosti i asset namespace-a. Ne dodavati korisničke odgovore, licencne planove, design, renderer ili vlasnička prava u Business Registry. Podatke čuvati u trajnoj privatnoj bazi s backup-om; kratkotrajni Redis Booking red ne sme glumiti trajnu Editor bazu. Izbor konkretne baze i migracija su otvoreni implementacioni zadaci.

**Naplatni upgrade:** FREE → plaćeni paket je promena prava i Project Record-a (uz odobrenu izmenu sadržaja/modula) pa novo serversko renderovanje/objava ISTOG SITE ID-ja. Nema zahteva da se pravi novi sajt, novi domen ili novi Portal pairing samo zbog upgrade-a.

### C.4. Tri linka — večernji checkpoint, naspram istorijskih §9–11

**Stari jutarnji `Not Found` incident iz §10.2 je istorija; nije aktuelni status.** Korisnik je potvrdio rad glavnog Render staginga, vraćanje šest originalnih nezavisnih V39.5 marketinških DEMO sajtova u `client/public/demo-previews/` i zatim uspešno otvaranje javnog GitHub Pages generatora nakon dodavanja GitHub Pages origin-a u postojeći API `CLIENT_ORIGIN` (ostali origin-i sačuvani).

| Platforma | Ciljni / trenutno objavljeni link | Granica odgovornosti |
|---|---|---|
| **Javni Web Solutions** | `https://retailmediacenter.github.io/web-solutions-public/` | Kompajlirani Vite/React Index, Advisor, šest *marketinških*, potpuno izolovanih V39.5 demo sajtova; privatni Node generator ostaje na Renderu. Korisnik potvrdio da Advisor radi nakon CORS ispravke. |
| **DEV Preview — 9 kartica** | `https://retailmediacenter.github.io/web-solutions-preview/` | Devet punih statičkih Node export-a, iz istog render/export sistema kao korisnički ZIP. Namenjeno regresiji po fazama; trenutno **Booking DEMO**, bez stvarne Redis isporuke. |
| **Business Portal PWA** | `https://rmc-booking-manager-staging.onrender.com/` | Jedan Portal, trenutno Booking; Commerce inbox kasnije. Ne menjati postojeću produkcionu/raniju PWA instancu. |
| **Privatni staging API** | `https://rmc-web-solutions-api-staging.onrender.com/` | React Advisor backend, privatni Node generator, Booking API i Upstash Redis; API nikada ne objavljivati u javnim Pages izvorima. |

Repozitorijumi: privatni `retailmediacenter/web-solutions` (`development/v43-3` je kontrolisana razvojna grana); javni `retailmediacenter/web-solutions-public` i `retailmediacenter/web-solutions-preview` sadrže **samo deploy artefakte**, ne monorepo niti privatne tokene. GitHub Desktop je sada potvrđen manualni način objavljivanja oba javna repozitorijuma. Predviđena `.github/workflows/publish-public-sites.yml` automatizacija je **pripremljena u lokalnoj radnoj kopiji**, ali njen bezbedan rad, autorizacija i buduće automatsko objavljivanje JOŠ nisu nezavisno potvrđeni. Ne tvrditi da novi commit već automatski osvežava oba Pages sajta.

**Log potvrđen lokalno:** `RMC_PUBLICATION_OUT` nakon Windows V3 patch-a izvezao je oba javna artefakta; `147/147` postojeća Node regresiona testa prošla; 9/9 Node ZIP-ova je izvezeno; svih 105 foto-referenci upotrebljenih u tim testnim scenarijima nađeno je. Broj 105 NIJE broj cele kurirane biblioteke (~406 fajlova prema korisnikovom Explorer snimku). Build ima CSS minifier upozorenje `Unexpected @media` koje nije zaustavilo objavu; vredi ga zasebno proveriti ako izaziva vizuelnu grešku.

**Repo provera javnog Preview-a:** `manifest.json` navodi 9 scenarija, `bookingLive: false`, sve stavke `paired: false`; frizerski izvozni `index.html` sadrži `bookingTransport: null`. To potvrđuje da je javni Preview za sada **demonstracioni**, iako su stvarni HTML/CSS/JS/ZIP-ovi generisani iz Node engine-a. Nikada ne tvrditi da `147/147` offline testova dokazuje realni Redis→Portal E2E.

**Četiri grupe devet Preview scenarija:** Commerce (minimarket, butik); DAY_PART (auto-servis, vodoinstalater); kombinacije (vinoteka: Commerce + EXACT_TIME degustacija; mesara: Commerce + posebna priprema BEZ Booking-a); EXACT_TIME (frizer, restoran, poslovni konsultant). Šest DEMO sajtova glavnog Indexa su poseban, statički marketing asset i nikada se ne regenerišu iz Advsiorovog devet-scenario Preview-a.

### C.5. Plan realizacije bez narušavanja već objavljenih sajtova

**1. Prvo ukloniti tajnu iz public ZIP-a.** U stvarnom `server/src/exporter.js`/povezanom export toku ukloniti `BOOKING_UPARIVANJE.txt` i sve kopije pairing koda iz javne ZIP distribucije. Ne ukloniti korisniku privatni prikaz koda **izvan iframe-a**. Testirati pregled ZIP sadržaja, ne samo HTML; regresija starih testova koji eksplicitno očekuju TXT mora se svesno ažurirati. Po potrebi omogućiti *zasebno* privatno preuzimanje instrukcija van deploy ZIP-a, ali bez mešanja sa objavljivim fajlovima.

**2. Audit identiteta i perzistencije.** Utvrditi da li trenutni Booking `siteId` ostaje stabilan između renderovanja/izvoza i da li postoji trajni Project Record. Definisati/migrirati kanonski SITE ID bez prekida postojećeg API-ja i PWA profila. SITE ID mora biti dokumentovan u export manifestu/sajtu, bez tajni. Project Record i owner-authority kreirati pre nego što obećamo Editor/upgrade.

**3. Jedno privatno uparivanje po test sajtu.** Zadržati devet javnih Preview URL-ova; generisati stabilne testne SITE ID-jeve i dovesti odgovarajući staging profil do Portala. Kodove prikazivati/prenositi isključivo privatno; ne čuvati ih u javnom repo/manifestu. Razmotriti bezbedan obnovljiv testni pairing, ali **ne uvoditi trajni javni kod** niti automatsko ponovno kreiranje SITE ID-ja pri svakoj regeneraciji.

**4. Zatvoriti B2 stvarnim online E2E**, a ne samo demonstracionim formularom: frizer EXACT_TIME → staging API → Redis → Portal lokalni save → ACK; auto-servis DAY_PART bez lažnog sata; vinoteka EXACT_TIME degustacija uz nezavisnu postojeću Commerce korpu. Proveriti retry/dedup, ponovljene zahteve, Push i mali, jednoznačni potvrđujući modal (ranije kod frizera viđena su duplirana dugmad „Zatvori“ i neprimereni „Pokušajte ponovo“ u DEMO stanju). Vlasnički test u zasebnom browser profilu da se ne izbrišu stare rezervacije.

**5. Zatvoriti C automatizaciju:** dozvoliti bezbedno, kontrolisano objavljivanje dva *isključivo javna* artefakta iz privatne grane (least-privilege GitHub credentials; secrets samo u privatnim GitHub Actions settings), proveriti kompletno automatsko ponovno generisanje devet sajtova i šest statičkih marketinških DEMO primera. Render i Pages koriste različit `BASE_PATH`, ali isti staging API origin; pri selidbi domena aktualizovati CORS dozvoljene origin-e.

**6. Tek nakon B2 + C, stati i revidirati Advisor** (previše koraka, transparentna poslovna pitanja i nezavisne capabilities); definisati Commerce transport u istom Portalu i prava paketa; zatim započeti Editor nad potvrđenim SITE ID/Project Record modelom. Ne lažno proglašavati Editor, trajni Project Record, Commerce inbox ili automatske Pages redeploy-e postojećim funkcijama.

### C.6. Handover pravila i zabranjene prečice

- **Svaki put razlikovati:** USVOJENO / IMPLEMENTIRANO u kodu / TESTIRANO offline / TESTIRANO stvarno online. Tri linka postoje, ali to nije dokaz live Bookinga svih devet scenarija.
- Ne slati vlasnički pairing kod u chat niti ga od korisnika tražiti za deploy; za test je bitan javni SITE ID i provera server-side povezanog vlasničkog profila. Kad je vlasnički kod istrošen, potrebna je bezbedna procedura za novi kod.
- Nove module aktivira Advisor; Registry ostaje 72 faktografska unosa. Jedan fizički poslovni subjekt može imati jedinstven sajt identitet, ali `reservationCode` je po rezervaciji i nikada se ne koristi kao identitet biznisa.
- Ne prenositi privatni Node/Redis kod ili tokene u javni Pages; ne resetovati Business Portal IndexedDB radi testiranja; ne dirati produkciju.
- Posle svakog potvrđenog checkpoint-a ažurirati **OVAJ JEDAN MASTER DOKUMENT** (ne generisati odvojeni `.md` za svaku verziju) i evidentirati konkretan Git SHA tek kada je verifikovan.


---

## DODATAK D — DEVET STALNIH QA BIZNISA, STABILNI SITE ID I OBNAVLJANJE BUSINESS PORTALA (27.09.2026, JUTRO)

**STATUS:** ovo su korisnikovi novi precizni poslovni zahtevi i predlog ciljane arhitekture. Nisu automatski implementirani samo zato što su navedeni u master dokumentu. Novija očekivanja u ovom dodatku menjaju ranije QA fixture-e iz C.4 (naročito AUTO-SERVIS prelazi sa DAY_PART na EXACT_TIME uz pregled automobila). Šest originalnih marketinških DEMO sajtova na glavnom Web Solutions Indexu ostaju nezavisni, ne prepisivati ih ovim promenama. Cilj je da QA Preview-ovih devet sajtova postanu stvaran, zajednički regresioni poligon **za funkcije, redosled modula i budući Business Portal**, a ne devet ručnih forkova.

### D.1. Poslovni ugovor devet trajnih QA scenarija

| QA biznis | Obavezna poslovna logika i modulacija | Provera / očekivani Portal tok |
|---|---|---|
| **1. Minimarket** | Standardni Commerce: proizvodi → veći modal sa slikom/thumbnailom → korpa → sticky sažetak količine i ukupnog novčanog iznosa; fokus na proizvode. Opcioni Welcome modal horizontalno skroluje tačno tri odabrana proizvoda iz postojeće sekcije **IZDVAJAMO**, bez duplog izvora podataka. | Pick & Collect upit/porudžbina, nikakva online naplata; kada Commerce transport postoji, zahtev ide u zajednički Portal. |
| **2. Modni butik / obuća** | Isti Commerce runtime kao minimarket; dodatna zasebna mogućnost **upita o dostupnosti**, sa obaveznim kontekstom artikla i odgovarajuće veličine/boje kada varijante postoje. Korpa i upit ne smeju se pogrešno stopiti. | Pick & Collect ili upit o varijanti/dostupnosti, bez online naplate i bez izmišljanja realnog lagera. |
| **3. Auto-mehaničar + moguća prodaja vozila (HYBRID)** | **Servisni termin po tačnom satu — EXACT_TIME** (novo pravilo koje nadjačava prethodni QA DAY_PART), plus po eksplicitnom izboru katalog automobila: izgled kartica/detaljnog modala poput proizvoda, ali **bez shopping cart-a**. CTA na automobilu vodi na **zahtev za termin fizičkog razgledanja**, ne na poručivanje vozila. | U istom Portalu razlikovati vrste zahteva `servis` i `razgledanje` i sačuvati izabrano vozilo / uslugu; tačno vreme zahteva, ne obećavati stvarnu dostupnost dok vlasnik ne potvrdi. |
| **4. Vodoinstalater** | Klasična uslužna prezentacija/opisi i Booking sa izborom **datuma + dela dana** (DAY_PART, jutro/popodne), bez fiktivnog sata. | Poseban zahtev za terenski posao; Portal mora zadržati DAY_PART, ne smeti dopisati 09:00 ili drugi proizvoljan sat. |
| **5. Vinoteka + degustacije (HYBRID)** | Commerce proizvodi + Booking degustacije (EXACT_TIME); iznad kataloga elegantni **Selector** za vrstu vina: crveno/belo/roze; njegova konfiguracija postaje kasnije osnova filter kategorija. Isti deljivi Selector koncept primenljiv na salon nameštaja (po sobama). | Jedan SITE ID / jedno Portal povezivanje: porudžbina i rezervacija su različiti tipovi događaja, u istom vlasničkom okruženju. Katalog i degustacija ne utiču negativno jedno na drugo. |
| **6. Mesara** | Commerce + Selector po vrstama mesa ili namenskim paketima (slava, roštilj itd). U porudžbini varijanta izvršenja po odgovarajućoj stavci/porudžbini: **sirovo ili pečeno**, uz izbor preuzimanja ili isporuke samo kada biznis izričito nudi tu opciju. Jasno čuvati šta je izabrano u korpi/sažetku. | Commerce/Pick & Collect i posebna obrada stavki; **pečenje nije Booking**, a isporuka nije automatski logistička usluga ni online naplata. |
| **7. Frizerski salon** | Zakazivanje je dominantan, često korišćen tok: istaknuti CTA, usluga + datum + tačan sat (EXACT_TIME), brz prikaz i zahtev za pomeranje postojećeg termina. Ne glumiti automatsku potvrdu ili raspoloživost. | Portal životni ciklus zahteva: primljeno → odgovor/potvrda/odbijanje → zahtev za pomeranje → nova odluka; istorija i referenca na originalnu rezervaciju, bez duplikata. Stavke pomeranja nisu postojeća potvrđena funkcija dok ne prođu stvarni E2E. |
| **8. Restoran** | Katalog nalik Shop-u sa bogatijim opisima jela, **bez korpe, poručivanja i naplate**; glavni poslovni CTA je rezervacija stola sa brojem osoba, datumom i tačnim vremenom (EXACT_TIME). | Booking vrste `table_reservation`: broj osoba obavezno ulazi u payload i prikaz Portala; rezervacija je zahtev, a ne potvrđen slobodan sto. |
| **9. Poslovni konsultant / klasične usluge** | Izbor unapred definisanih tema/konsultativnih usluga + slobodno tekstualno pitanje i tačan termin; modularno kao generički stručni sektor, bez izmišljanja konkretne teme ako korisnik nije odobrio. | Portal prikazuje izabranu temu, napomenu/pitanje, datum i vreme; bez neprikladnog obaveznog polja za proizvode. |

**Reusabilnost (ne devet hardkodiranih prezentacija):** cilj su zajednički Commerce/Product modal/Cart, konfigurabilni Selector, Featured→Welcome horizontalni carousel, univerzalni Booking sa jasno tipiziranim zahtevima, katalog bez korpe, opciono sekundarni vozni katalog/razgledanje, te kompozicioni plan sekcija koji poseduje Advisor. Poslovne odluke su u Advisor/config sloju, ne u facts-only Business Registry-ju; pet stilova ne sme promeniti prirodu transakcije. U svim QA sajtovima pratiti pravilno pojavljivanje i redosled modula i očekivani izgled nakon svake promene renderera.

### D.2. Stabilan identitet naspram jednokratnog uparivanja

**SITE ID (trajni, javni):** svih **devet** Preview fixture-a dobija **po jedan STABILAN QA SITE ID** koji se čuva pri regenerisanju, promeni dizajna, modula ili domena. To nije identitet jedne generisane datoteke ili URL-a. U redovnom proizvodu SITE ID nastaje pri kreiranju projekta uz trajan privatni PROJECT RECORD; vezuje Advisor odgovore, `businessId`, capabilities, modulePlan/redosled, stil/sadržaj, plan/entitlements, domen i verzije. Sam SITE ID **ne daje** vlasnička ili administratorska prava i nije kod za uparivanje. Postojeći Booking `siteId` mora se pre reuse-a auditovati/migrirati bez prekidanja već uparenih profila.

**PAIRING CODE (privatan, jednokratan):** privremeni 30-minutni kod samo ovlašćuje da Business Portal **jednom preuzme i potvrdi** vezu sa konkretnim SITE ID-jem. Posle uspešnog claim-a kod je potrošen i **nikad više nije potrebno niti bezbedno čuvati isti kod**. Korisnik unosi kod direktno u Portal; ne šalje ga modelu, ne stavlja u javni ZIP/HTML/GitHub/manifest niti u online dostupan TXT. UI generatora daje zaseban privatni prikaz ili odvojene upute van objavljivog ZIP-a.

**Trajna vezanost nije isto što i trajni kod.** Nakon claim-a potrebno je server-side trajno zabeležiti SITE ID ↔ ovlašćeni Business Portal nalog/poslovni identitet. Trenutni B2 istorijski ugovor izdaje `accessToken` PWA-u i kratkotrajan kod koristi kao jednokratni claim. Nije potvrđeno da današnji sistem već ima nezavisni vlasnički nalog i autentifikovani recovery; to je obavezna nova funkcija pre pouzdanog ponovnog povezivanja nakon brisanja PWA. Jedno vlasničko povezivanje važi za sadašnji Booking i kasnije odobreni Commerce modul istog SITE ID-ja; nova poslovna funkcija sama po sebi ne sme zahtevati novo vlasničko uparivanje.

**Devet QA primeraka:** svih devet zadržava svoje stalne test SITE ID-jeve; izdavanje testa za Portal obavlja se **privatno, na zahtev, novim jednokratnim kodom** za konkretan QA SITE ID. Ne uvoditi devet fiksnih večnih pairing kodova niti TXT sa takvim kodovima. Sam SITE ID i tipovi modula mogu biti u javnom test manifestu; autentikacioni tokeni i vlasnički testni kodovi ne mogu. Dok postoji samo Booking inbox, prioritet live pairing-a imaju frizer, servis, vodoinstalater, vinoteka, restoran i konsultant; Commerce-only biznisi se priključuju kad Commerce inbox bude stvarno implementiran.

### D.3. Reinstalacija PWA i dugme za razdvajanje — ciljna bezbedna procedura

**A) Normalan rad, prvo povezivanje:** generator ili ovlašćeni vlasnički interfejs zatraži jednokratni kod za svoj stabilni SITE ID; vlasnik ga unese u Portal. Backend proverava kod i vezuje sajt sa autentifikovanim vlasničkim profilom; PWA dobija zasebnu poverljivu autorizaciju uređaja, ne isti kod za trajnu autentifikaciju. Kod ističe/uništava se nakon preuzimanja.

**B) PWA deinstalirana / novi telefon:** vlasnik se prvo ponovo autentifikuje vlasničkim nalogom (npr. potvrđena e-adresa uz odgovarajuću proveru ili passkey; konkretan mehanizam izabrati i implementirati). Backend prepoznaje njegove SITE ID-jeve, pa dozvoljava **novo ovlašćenje uređaja ili izdavanje NOVOG jednokratnog koda** za postojeći SITE ID — ne pravi novi sajt i ne ponavlja javno izloženi stari kod. Ako sistem još nema vlasničke naloge/recovery, ne tvrditi da automatski oporavak već postoji; dizajnirati i testirati pre lansiranja. Alternativne privatne rezervne recovery kodove razmotriti samo ako je to izvodljivo uz audit/revokaciju.

**C) Portal ima dve odvojene radnje, ne jedno dvosmisleno Unpair:**
1. **Odjavi ovaj uređaj / ukloni lokalni Portal profil**: po potvrdi ukinuti lokalni token i, gde server podržava, povući SAMO taj uređaj iz ovlašćenja. Trajni SITE ID ↔ vlasnički nalog ostaje. Ne brisati postojeći kalendar/istoriju bez eksplicitne nezavisne operacije i upozorenja. Novi uređaj se autentifikuje putem sigurnog recovery-ja.
2. **Prekini vezu sajta sa Portalom**: zasebna jasno označena i potvrđena vlasnička operacija. Server opoziva relevantne tokene, onemogućava isporuku za taj SITE ID dok nije ponovo vezan, i definiše postupanje sa zahtevima u redu i istorijom. Ugraditi kontrolu da tuđi ili izgubljeni uređaj ne preuzme nalog. Za ponovno povezivanje generisati NOVI privatni jednokratni kod za ISTI SITE ID.

**KRITIČNA lokalna istorija:** dosadašnji Portal čuva kalendar u IndexedDB na uređaju, a Booking red ima vremenski ograničen TTL (istorijski 72 sata za nepreuzete stavke). Reinstaliranje/brisanjem lokalnih podataka može nepovratno izgubiti već ACK-ovane lokalne rezervacije; iz trajne veze sajta i vlasništva **ne proizlazi automatski oporavak kalendara**. Pre obećanja o bezbednoj reinstalaciji potrebni su testirani backup/export-import ili autentifikovana serverska sinhronizacija/istorija, sa jasnim konflikt pravilima. Ne resetovati postojeće PWA IndexedDB profile pri QA testiranju.

### D.4. Redosled implementacije, granice i završni dokazi

1. **Audit koda i migracioni ugovor:** potvrditi način dodele sadašnjeg Booking `siteId`, tokena i API-ja; ukloniti `BOOKING_UPARIVANJE.txt` iz javnog ZIP-a i prilagoditi regresione testove koji ga danas očekuju. Ne menjati naslepo aktivne Redis/PWA identitete.
2. **Stabilni fixture-i:** uspostaviti trajan QA Project Record i po jedan SITE ID za 9 slučajeva; prepraviti stvarne Advisor/renderer ulaze, ne ručno editovati objavljene HTML kopije. Novi zahtevi kao auto EXACT_TIME, car-viewing, restoran broj osoba, Selector, Welcome carousel i pomeranje frizerskih termina imaju poseban implementacioni i test status.
3. **Portal vlasništvo i recovery:** odvojiti business ownership od uređajskog tokena; podržati rotaciju kodova, registrovanje uređaja i dva jasna načina razdvajanja. Sačuvati ili posebno arhivirati istoriju kalendara, testirati reinstalaciju pre tvrdnje da je bezbedna.
4. **E2E testovi na QA Preview-u:** prvo frizer EXACT_TIME i reschedule, zatim auto servis EXACT_TIME + pregled vozila, vodoinstalater DAY_PART, vinoteka degustacija i neporemećena korpa, restoran broj osoba, konsultant odabrana tema i pitanje; Commerce inbox kasnije za minimarket/butik/mesaru. Test zahtev → Redis → Portal local-save → ACK → idempotent retry. Javni QA sajtovi su dostupni svima: live staging Booking mora imati odgovarajuću zaštitu od zloupotrebe/rate-limit i ne sme slati stvarne testne notifikacije nepoznatim korisnicima.
5. **Automatsko ponovno objavljivanje:** iz jedinstvenog privatnog Node generatora regenerisati oba javna artefakta tek nakon testova i odobrenja, bez otkrivanja izvornog poslovnog koda/tajni. Regression posmatra poslovnu funkcionalnost **i** vizuelni raspored svih devet scenarija. Šest originalnih marketinških DEMO sajtova ostaju zaseban zamrznuti izvor na glavnom Indexu.

**Ne proglašavati završnim dok ne postoji stvarni dokaz:** devet stabilnih SITE ID-jeva ne znači devet uparenih Portala; trenutni javni QA manifest ima `bookingLive: false` i `paired: false`; postojeći rezultat 147/147 je offline regresija, ne live E2E. Nova poslovna matrica je zahtev, ne trenutno stanje javnih devet sajtova.


---

## DODATAK E — ISPRAVKA STATUSA MODULA, ZAVRŠNI UX PARITET I IDENTITET/PORTAL (27.09.2026)

**Autoritativna korekcija korisnika:** Dodatak D definiše devet ciljnih QA poslovnih kombinacija, ali **ne predstavlja spisak novih modula koje treba razviti od nule**. Prethodni V31–V39.5 rad i V41–V43 Node/React migracija već sadrže modularnu strukturu do Kontakta/Lokacija/Mape, Selector/kategorije, katalog i modal artikla, korpu, IZDVAJAMO, opcionu Welcome kontrolu i četiri univerzalne vrste Booking formulara sa `EXACT_TIME` i `DAY_PART`. Za svaki novi QA zahtev prvo proveriti mogućnost **konfiguracije i povezivanja postojećeg modula**, zatim proveriti React/Node/ZIP paritet. Novi modul praviti samo za dokazano nepokriveno ponašanje. Devet sajtova se generiše iz zajedničkog koda; ne održavati devet posebnih HTML forkova.

### E.1. Postojeće funkcije i preostali UX poslovi migracije

- **Selector nije novi modul**: postoje sektorske kategorije/selektori za različite retail biznise i njihova modularna organizacija. Treba proveriti da ih aktuelni Node renderer, Advisor konfiguracija, svih pet stilova i export pozivaju tamo gde su već potrebni; ne praviti paralelan Selector za vinoteku/mesaru/nameštaj.
- **Commerce nije novi modul**: modal detalja proizvoda, varijante, kategorije, količine i sticky korpa već postoje. Zahtevi za devet QA slučajeva primarno proveravaju konfiguraciju i poslovnu semantiku postojećih tokova. Transport porudžbine ka Portalu je odvojen budući posao; dosadašnji Commerce Copy/WhatsApp/Viber tok nije Redis Commerce inbox.
- **Universal Booking je već razvijen**: četiri forme `appointment`, `reservation`, `consultation`, `request-slot`, vremenski režimi `EXACT_TIME` i `DAY_PART`, Node/Redis tok i PWA nisu predmet ponovnog projektovanja. Nova QA matrica bira postojeći tip/režim prema biznisu (npr. auto servis: EXACT_TIME umesto ranije demonstracione postavke DAY_PART); proveriti samo dodatna polja i konkretne slučajeve koji nisu potvrđeni (npr. pomeranje termina i razgledanje vozila).
- **IZDVAJAMO i opciona Welcome modal kontrola već postoje.** Konkretno preslikavanje 3–4 stavke iz istog `featured` izvora u horizontalni Welcome scroller, bez duplirane baze, bilo je odloženo za V44. Ne tvrditi da je ta veza implementirana bez provere. Ne implementirati novi featured izvor.
- **Preostali UI/UX dug iz React/Node migracije (primeniti na sve odgovarajuće rendere i u Preview i u ZIP-u):**
  1. Očistiti suvišne navigacione kartice/dugmad i naročito duplirani link „Prikaži lokaciju i navigaciju“ kad postoji mapa; ne uklanjati poslovno potrebne CTA ni forme.
  2. Jedinstveni blok **Kontakt i lokacije**: korisnički klik „Prikaži mapu“ pokreće spoljašnji zahtev; bez automatskog učitavanja mapa pri početnom renderu. Na trenutnim javnim primerima postoji dugme za lazy mapu, ali auditirati sve druge renderer putanje i ukloniti suvišne navigacione linkove.
  3. **Ukloniti nasleđenu duplu završnu sekciju „Čujemo se!“** kada su kontakti već u bloku Kontakt i lokacije; sačuvati posebne funkcionalne forme za stvarnu poslovnu potrebu (Booking, kataloški upit, vertikalna forma). Ne brisati te forme globalnim CSS skrivanjem.
  4. Proveriti redosled postojećih modula i njihove kartice po poslovnom profilu/pet stilova; Advisor poseduje raspored, Registry ostaje samo činjenice i foto namespace.
- **Dokaz da je čišćenje još otvoreno:** javni QA primer `sites/frizer/index.html` (izdanje 26.09.2026) istovremeno ima `data-ws-map` dugme koje učitava mapu na zahtev, poseban navigacioni link „Prikaži lokaciju i navigaciju“ i zasebnu završnu sekciju „Čujemo se!“. Zato nije ispravno ni ponovo praviti mapu ni proglasiti njen kontakt UX potpuno dovršenim.

### E.2. Precizna podela: SITE ID, PAIRING CODE i trajna Portal veza

**SITE ID je trajni javni primarni ključ jednog konkretnog sajta.** Sam niz znakova nije baza i ne „sadrži“ poslovne podatke. Na serveru preko `SITE ID` nalazimo:

1. **Project Record** — sačuvani Advisor odgovori, `businessId`, aktivni moduli i njihove capability opcije, njihov redosled, poslovni katalog/usluge, stil, izmene, paket/entitlements, istoriju verzija i domene. Ovo služi Editoru i komercijalnim nadogradnjama, uz posebno provereno pravo vlasnika/RMC admina.
2. **Portal Binding Record** — da li je sajt povezan, sa kojim ovlašćenim poslovnim identitetom/Portal nalogom i koje module prima (`BOOKING`, kasnije `ORDER`/eventualno `INQUIRY`). Ovaj zapis je **server-side veza indeksirana SITE ID-jem**, a ne podatak ugrađen u javni identifikator. Posle validnog uparivanja veza traje dok se ne raskine; novododati Commerce istog sajta koristi već potvrđeno vlasništvo.
3. **Javni transport** — objavljeni HTML/JS može sadržati `SITE ID` za usmeravanje javnih zahteva; server odlučuje da li je odgovarajući modul aktivan i vezan, uz CORS, validaciju i zaštitu od zloupotrebe. SITE ID sam po sebi nikada ne daje pristup Editoru ili privatnom Portal inboxu.

**PAIRING CODE je privremena privatna dozvola za STVARANJE/OBNAVLJANJE te veze, a ne ID naloga, ID sajta niti stalni transportni podatak.** Izdaje se na zahtev za već postojeći SITE ID, važi 30 minuta, jednokratno se unosi u PWA i server atomarno potvrđuje claim. Po uspešnom claim-u je beskoristan; server zadržava sigurnu Portal vezu i privatne tokene/ovlašćenja van javnog sajta. **Nema PAIRING CODE-a u javnom ZIP-u, HTML-u, GitHubu, javnom manifestu ili korisničkom browser runtime-u; ne održavati listu devet permanentnih kodova.** Novi privatni kod za isti SITE ID izdaje se samo nakon dokazivanja vlasništva kada je potrebno ponovno povezivanje. Reinstalacija PWA ne sme da glumi oporavak lokalne istorije: backup/restore ili zaštićena sinhronizacija moraju biti zasebno potvrđeni.

**Jedna firma/sajt → jedno vlasničko Portal povezivanje → više aktivnih poslovnih modula**. Ovo je ciljna arhitektura; postojeći B2 Booking je prvi transport. Commerce-only Portal pairing, trajni vlasnički nalog/recovery, trajni Project Record i stabilna ponovna upotreba današnjeg Booking `siteId` **zahtevaju pregled implementacije/migracioni rad pre tvrdnje da rade**.

### E.3. Ponovna upotreba ranije dogovorene Booking ↔ Commerce analogije

Ne praviti potpuno odvojene sisteme za primanje Booking i Commerce zahteva. **Predloženi zajednički transportni okvir** za budući Portal je `siteId`, `requestId` (idempotentnost), `type` (`BOOKING` / `ORDER` / gde je potrebno `INQUIRY`), `customer`, `payload` i serverski status obrade; konkretna imena i kompatibilnost moraju se uskladiti sa postojećim B2 API ugovorom, a ne naslepo zameniti njegova polja.

- Booking poslovne stavke: `serviceId` + naziv iz postojeće Advisor/site konfiguracije; `bookingType` (`appointment`/`reservation`/`consultation`/`request-slot`), `timingMode`, datum + vreme ili deo dana i domen-specifična dodatna polja.
- Commerce stavke: proizvod/artikal identifikator + naziv, odabrana varijanta (npr. veličina/boja ili priprema mesa), količina, relevantna prikazana cena i ukupni iznos; **ne** prenositi logiku online naplate ni pretpostavljati stvarno stanje zaliha.
- Zajednička analogija: `serviceId` ili `productId` identifikuju izabranu poslovnu stavku, `customer` korisnika, `additionalFields`/tipizovani detalji čuvaju specifičnosti, a `siteId` određuje kompaniju/Portal. Korpa i rezervacioni kalendar ostaju **dve različite poslovne obrade** unutar istog Portala; jedan transportni okvir ne znači ista obavezna polja ili iste statusne promene.

### E.4. Konkretni naredni redosled bez dupliranja razvoja

1. Audit postojećeg koda na razliku **gotov modul / nedostajuća konfiguracija / migracioni UX dug / zaista nova poslovna operacija**. Bez novog Selectora, Booking engine-a, izmišljanja dodatnih mapa ili novih kloniranih katalog modula.
2. Odvojiti i stabilizovati SITE ID/Project Record/Portal Binding i ukloniti tekst sa pairing kodom iz javnog ZIP-a uz test postojećeg Booking toka.
3. Primeniti postojeće module na devet stvarnih QA poslovnih konfiguracija; ukloniti višak kartica, kontakt/directions duplikate i proveriti lazy mapu. Specifičan redosled sekcija pripada Advisor-u.
4. Dokazati Booking live E2E u Portalu; potom integrisati Commerce putem istog SITE ID-ja i već dogovorenog zajedničkog transportnog okvira, bez ponovnog vlasničkog uparivanja za novu poslovnu funkciju.
5. Posle odobrenih izmena obnoviti oba javna artefakta, bez diranja šest izolovanih marketinških DEMO sajtova i bez javnog izlaganja privatnih podataka.


---

## DODATAK F — ODLUKA: DEVET PREVIEW SAJTOVA KAO JEDINSTVENI B TEST POLIGON (27.09.2026)

**Status: PREDLOG REDOSLEDA ZA POTVRDU I IZVRŠENJE.** Nijedna tačka ovog dodatka nije dokaz da su promene koda već sprovedene. Koristimo **postojeći** `web-solutions-preview` sa devet kartica i postojeći privatni Node/React generator, a **ne** pravimo novi paralelni testing flow, ručne kopije HTML sajtova ili nove javne repozitorijume. Šest izolovanih marketinških DEMO primera u javnom Web Solutions Indexu ne diramo. V39.5 je referenca za potvrđenu modularnost i izgled, ali ga ne vraćamo kao stari JS runtime.

### F.1. Redosled rada: konfiguracija → postepeni B E2E → regresija → automatska objava

**0. Kratak audit bez refaktorisanja.** Iz postojećeg mastera i aktuelnih source fajlova napraviti poređenje za svih devet: što je već u Node rendereru, što je samo pogrešno uključeno/isključeno ili poređano u Advisor fixture-u, koji je preostali V39.5→React UX dug, a koja nova specifična operacija zahteva mali dodatak. Snapshot postojećeg Preview-a služi samo za poređenje; ne održava se kao druga implementacija.

**1. Prilagoditi devet konfiguracija na zajedničkom izvoru.** U `scripts/publication/scenarios.mjs` ili kanonskoj odgovarajućoj fixture konfiguraciji preslikati *postojeće* module po matrici D.1, kroz Advisor/Node renderer. Proveriti Selector, Featured→Welcome, proizvodni modal, sticky Cart, hibrid vozila bez Cart-a, uslužni katalog, četiri Booking tipa i oba režima. Auto-servis test mora biti **EXACT_TIME**, vodoinstalater **DAY_PART**, vinoteka degustacija **EXACT_TIME**, restoran katalog **bez naručivanja**. Redosled sekcija i nav kartice pratiti po poslovnom profilu; ukloniti kontakt/navigacione duplikate i završno „Čujemo se!“, mapu učitavati samo posle klika. Ne pretpostavljati da je Featured→Welcome povezivanje već gotovo — dokazati ga kroz render. Ne praviti devet ručnih forkova.

**2. Pre stvarnog slanja obezbediti identitet i bezbedno uparivanje.** Dodeliti svakom QA primeru **stabilan SITE ID** koji preživljava regeneraciju; auditovati kompatibilnost sa postojećim Booking `siteId` i Redis rutama kako ne bi nastao duplikat identiteta. Privatni jednokratni PAIRING CODE od 30 minuta prikazati vlasniku odvojeno od objavljivog ZIP-a, nikada u Pages manifestu/HTML-u/ZIP-u/TXT-u koji može završiti na serveru. Ne menjati tajno `siteId` već uparenog sajta. Za QA mora postojati bezbedno izdavanje novog koda za isti SITE ID kada je potrebno, ne permanentan tekstualni spisak kodova. Pre javnog live testa ograničiti potencijalnu zloupotrebu staging formi i testni poslovni profil izolovati od stvarnih korisnika.

**3. Testirati B odmah čim prvi reprezentativni sajt bude spreman — ne čekati vizuelno poliranje svih devet.** Prvo frizer: `EXACT_TIME`, stvarni javni zahtev → staging API → Redis → upareni Portal → IndexedDB upis → ACK; potvrditi jedan prijem, nema dupliranja na retry/refresh, javni kod rezervacije ostaje stabilan, nema lažne automatske potvrde. Postojeći demo modal ne predstavlja dokaz live slanja. Proveriti i prepoznatu UX grešku duplog „Zatvori“/neprimerenog „Pokušajte ponovo“ u demo stanju. Svaki problem popravljati u zajedničkom modulu, ne u javnom HTML-u jednog primera.

**4. B regresija na ostalih pet Booking primera.** Vodoinstalater `DAY_PART` bez fiktivnog sata; auto-servis `EXACT_TIME`, zasebne oznake `servis` i `razgledanje` s izabranim vozilom; vinoteka `EXACT_TIME` degustacija bez kvarenja Cart-a; restoran tačno vreme i broj osoba bez Commerce poručivanja; konsultant usluga/tema, pitanje i termin. Frizersko *pomeranje termina* testirati tek kad je dokazano da je zahtevan lifecycle zaista implementiran — ne proglašavati to postojećom funkcijom. Za svaki relevantan zahtev proveriti isti transport/ACK i tipizovana poslovna polja.

**5. Commerce i vizuelna regresija svih devet.** Minimarket, butik i mesara (kao i vinoteka) prolaze postojeći Cart, varijante i Pick & Collect/upit bez lažne naplate; **ne** prijavljivati njihov Portal `ORDER` transport kao završen dok se zasebno ne implementira i prođe E2E. Svih devet proveriti i vizuelno (redosled modula, mobile sticky CTA/Cart, modal, Selector, Welcome, kontakt/mapa), u istom Node Preview/ZIP renderu.

**6. Tek posle potvrđenih testova ponovo generisati i objaviti oba javna artefakta.** Automatsko objavljivanje iz privatnog projekta je zaseban otvoren zadatak: lokalni PUBLICATION PASS i postojanje `.github/workflows` sami nisu dokaz da je bezbedni deploy token/CI aktiviran. Za svaki objavljeni QA sajt u manifestu evidentirati verziju/commit, stabilni javni SITE ID (kad je implementiran), capability i status `DEMO` naspram stvarno live testiranog B. Ne objavljivati privatne token-e niti pairing kodove. Šest marketinških DEMO sajtova ostaje netaknuto.

### F.2. Pravilo prihvatanja faza

- **B završena** tek kada live end-to-end najvažnijih Booking oblika i ACK/idempotentnost prođu, a zahtevane dodatne informacije za pojedinačne biznise stignu u Portal bez izmišljanja podataka. Jasno izdvojiti nove operacije koje još nisu implementirane (npr. reschedule) ako su potrebne za pun poslovni obuhvat.
- **C funkcionalna infrastruktura** već ima javna dva repozitorijuma i devet generisanih QA sajtova, ali sadašnji QA Booking je DEMO (`bookingLive: false`, `paired: false`). **C automatska isporuka** se posebno zaključuje posle proverenog GitHub Actions/deploy ciklusa, ne na osnovu ručnog GitHub Desktop push-a.
- **Portal recovery** i Commerce inbox nisu unapred rešeni ponovnim uparivanjem ili vizuelnim QA testom; čuvanje kalendara posle reinstalacije traži zaseban potvrđen backup/sync. Jedno vezivanje SITE ID-ja treba buduće module da opslužuje bez novog vlasničkog uparivanja.
- Svaka promene koda/regresija dobija zapis u *ovom* MASTER dokumentu sa statusom: usvojeno, implementirano, offline testirano, online E2E potvrđeno; konkretan Git SHA navesti tek posle verifikacije.


### F.3. QA zaglavlje: javni SITE ID, privatni kratkotrajni PAIRING CODE (27.09.2026)

**Zahtev:** korisnik želi da na svakom od devet Preview sajtova uvek lako prepozna identitet scenarija i dobije kod kada odluči da ga poveže s Business Portalom. **Bezbednosno razdvajanje:** devet Preview sajtova nalazi se na javnom GitHub Pages hostingu; pravi PAIRING CODE je jednokratan (30 minuta) i ne sme stajati u njihovom HTML-u, zaglavlju, javnom JS-u, manifestu, repo-u ili trajnom TXT spisku. Statičan „stalni pairing kod“ protivreči dogovorenom modelu.

- **Javno QA zaglavlje** (samo dev Preview, ne korisnički produkcioni sajtovi): oznaka scenarija i **stabilan, javni SITE ID** iz kanonskog dev fixture-a, uz oznaku da li je Booking u demonstracionom režimu ili je live test spreman. Status „uparen“ prikazati samo ako je pouzdano očitan iz autorizovanog backend-a; ne hardkodirati statičku tvrdnju o trenutnom statusu. Trenutni javni QA sajtovi NEMAJU stabilne SITE ID-jeve (`paired: false`); ne izmišljati njihove vrednosti pre migracije.
- **Privatni QA ekran za vlasnika/RMC**: za odabrani od devet postojećih SITE ID-jeva, nakon autentifikacije, ponudi „Generiši novi kod za Portal“ i pokaži privremeni PAIRING CODE sa istekom (30 min) i dugmetom „Kopiraj“; kroz njega vlasnik može upariti scenario kada mu zatreba. Za ponovno uparivanje izdati NOVI kod samo uz potvrđeno vlasništvo; ne skladištiti otvoreni kod kao trajnu lozinku.
- **Do implementacije privatnog QA izdavanja koda:** prihvatljiv je dosadašnji vlasnički generator/export ekran koji prikazuje svež kod van javnog sajta, pod uslovom da je kod uklonjen iz javnog ZIP-a. Ne predstavljati budući QA panel ili oporavak naloga kao već implementiran.
- **Ne menjati Booking/Commerce transport:** javni sajt šalje `siteId`, a server poznaje Portal binding i ovlašćenja. PAIRING CODE koristi se isključivo za kreiranje/obnavljanje veze, nikada za redovno slanje zahteva.

**STATUS:** zahtev i ciljna UX odluka dokumentovani; nije još izvršena izmena QA zaglavlja niti izrada privatnog QA ekrana. Sledeći rad počinje auditom sadašnjeg izvora SITE ID-ja i kompatibilnosti sa postojećim B2 Redis uparivanjem.

---

## DODATAK G — V44/B0: STABILNI QA IDENTITETI I BEZBEDNI POČETAK BOOKING E2E (27.09.2026)

**Vrsta zapisa:** sprovedene lokalne izmene iz pripremljenog V44/B0 paketa, ne potvrđen produkcioni ili staging deploy. Ovaj dodatak menja raniji status u F.3 (zahtev za QA zaglavlje), ali **ne** tvrdi da su promene primenjene na korisnikov Windows projekat, GitHub ili Render. Tek nakon lokalnog `V44 B0 PASS`, commita, staging deploy-a i QA uparivanja ažurirati status online.

### G.1. Šta se menja u kodu (pripremljeno i lokalno fokusirano testirano)

1. **Javni ZIP bez tajnog koda:** `server/src/exporter.js` više nikada ne uključuje `BOOKING_UPARIVANJE.txt`; ranije javno izdavanje rezervacionog koda ostaje isključivo u `X-RMC-Booking-Code` HTTP zaglavlju (`Cache-Control: no-store`) i React vlasničkom prikazu izvan iframe-a sajta. Ovim se uklanja rizik slučajnog objavljivanja koda pri unzip/upload postupku. To NE rešava trajni oporavak vlasništva niti uklanja potrebu za dodatnom proverom zaštite javnog generatora.
2. **Devet fiksnih QA SITE ID-jeva:** `scripts/publication/scenarios.mjs` je jedini kanonski DEV skup identifikatora. Svaki od devet javnih Preview sajtova prikazuje naziv scenarija i svoj ID na jasno označenoj QA traci. ID je **javan**, nije lozinka i ne daje Editor/Portal ovlašćenje. Ne rotirati ID posle uparivanja! Ovi DEV identiteti nisu implementacija trajnog PROJECT RECORD-a za stvarne kupce, niti dokaz da redovni javni generator čuva SITE ID između više izvoza.
3. **Privatno, obnavljivo QA uparivanje:** postojeći `createBookingQueue().issue(profile)` dobija opcioni kontrolisani `siteId`. Novi `POST /api/qa/pairing/:slug` zahteva `RMC_QA_MODE=1` i tajni `RMC_QA_ADMIN_KEY` (najmanje 32 znaka), podešene **samo na staging API-ju**. Rute bez tih promenljivih vraćaju 404; ne objavljivati ključ u kodu, Gitu ili Preview-u. API izdaje svež jednokratni 30-minutni kod za postojeći QA SITE ID i uzima trenutni Booking profil direktno iz iste Advisor QA konfiguracije. Jedno uparivanje postavlja vlasničku vezu; novo korišćenje koda za već upareni ID rotira aktivni PWA token i može odjaviti prethodni uređaj. Stvarni UX za više uređaja, nalog/recovery i dugme „Prekini vezu“ su otvoreni zasebni zadaci.
4. **Privatna privremena QA kontrola:** lokalni `POKRENI_QA_KOD.bat` / PowerShell bez zapisivanja koda u fajl; tajni staging admin ključ se unosi kroz secure prompt i ostaje samo u memoriji procesa. Ovo je privremeno rešenje dok ne nastane odgovarajući zaštićeni vlasnički UI.
5. **Jedan po jedan E2E:** `RMC_QA_LIVE_SLUGS=frizer` aktivira B2 sender samo na QA frizerskom sajtu i vezuje ga za njegov stalni QA SITE ID. Preostali primeri u ovoj iteraciji ostaju u demonstracionom režimu, premda svi imaju javni stalni QA SITE ID. Slanje nije omogućeno bez prethodnog privatnog uparivanja na stagingu. Ova opcija sme koristiti samo staging API, nikada produkciju.
6. **Bez novih modula:** V39.5/React migrirani Commerce, Hybrid, Selector/category, Booking, system modal i šest izolovanih marketinških DEMO sajtova ne menjaju se ovim paketom. Dev build i Node export ostaju jedini izvor svih javnih Preview HTML artefakata. `scripts/publication/build.mjs` proširen je samo za QA identitet, opcioni jedan live staging scenario, jasne statuse i bezbednosne provere.

### G.2. Stvarni audit sadašnjih devet fixture-a — ovo još nije puna poslovna matrica D.1

| QA slučaj | U aktuelnom Node/Advisor fixture-u potvrđeno | Još nije potvrđeno / potrebno usklađivanje |
|---|---|---|
| Minimarket | `hero, featured, catalog, cart, contact`; Commerce upit/korpa | Izbor tačno tri stavke u Welcome horizontalnom skroleru iz istog Featured izvora; pregled detalja i sticky cart na realnom uređaju. |
| Butik | Commerce/korpa, varijanta (`variantLabel`) | Zaseban upit za dostupnost konkretne veličine/boje uz istovremenu korpu, bez fiktivnog lagera. |
| Auto-servis | Booking `request-slot/DAY_PART` već radi u opštem servisu; kompatibilan dodatni `vehicle-sales` Hybrid postoji u engine-u | **Trenutni QA fixture je pogrešan za finalnu matricu:** promeniti na EXACT_TIME i uključiti postojeći Hybrid. Razgledanje vozila mora preći na isti stvarni Booking transport uz identifikator vozila (bez Cart-a), ne ostati samo lokalni kontakt upit. |
| Vodoinstalater | Service + Booking `DAY_PART` | Stvarni Portal E2E/ACK; proveriti da nije upisano izmišljeno precizno vreme. |
| Vinoteka | Commerce + degustacija Booking `EXACT_TIME` | Vizuelni Selector preko već postojećih kategorija i eventualno Featured→Welcome; Portal E2E degustacije. |
| Mesara | Commerce, posebna priprema i izbor varijanti u postojećem proizvodnom modalnom toku | Potvrditi krajnju korpu i sirovo/pečeno po stavci, dodatni jasni Selector paketa/vrsta; Portal ORDER transport još ne postoji. |
| Frizer | Booking `appointment/EXACT_TIME`, stabilne usluge i B2 javni sender | **Prvi stvarni E2E** (HTML→API→Redis→PWA→IndexedDB→ACK, idempotentnost); ispravka duplog `Zatvori`/pogrešnog `Retry` u demo modalu; pomeranje termina je zasebna operacija. |
| Restoran | Booking `reservation/EXACT_TIME`, polje za broj osoba u booking config-u | Detaljan katalog jela kao informativni katalog **bez Cart-a** još nije uključen u QA fixture koji trenutno ima `services`; stvarni E2E/Party Size. |
| Konsultant | Booking `consultation/EXACT_TIME`, tema/usluga i slobodna napomena | Proveriti stručni tekst/pitanje i realni E2E, bez dodatnih formulara. |

**Preostali zajednički vizuelni migracioni dug (nije razlog za ponovno kodiranje modula):** očistiti nav kartice i njihov redosled po Advisor planu, proveriti postojeći lazy map button (mapa se već inicijalno ne učitava), ukloniti nepotrebne direktne directions linkove po dogovoru i duplu završnu sekciju „Čujemo se!“ uz očuvanje stvarnog kontakta. Welcome je već opciono kreiran, ali njegov postojeći renderer ima jednu ilustrativnu fotografiju — dogovoreni Featured/IZDVAJAMO horizontalni 3-stavke tok još nije dokazan u aktuelnom Node source-u.

### G.3. Provere i pravilan redosled aktivacije

**Lokalno na rekonstruisanom poznatom izvoru:** 9/9 fokusiranih Node testova prošlo (Queue, odvojeni tajni kod iz ZIP-a, stalni QA identitet); oba oblika `build.mjs --audit` (9 DEMO i opcioni frizer live) prošla su izvoz svih devet ZIP struktura. Za strukturni audit na izdvojenom Linux radnom prostoru korišćene su PRIVREMENE TEST JPG zamene (nema prave korisničke biblioteke u ovom sandbox-u), zato to **nije nova provera autentičnih 105 fotografija**. Poslednji korisnikov prethodni Windows build pre V44 imao je 147/147 regresionih testova i 105/105 pravih fotografija. Finalni Windows V44 regresioni test tek treba da prođe.

Redosled bez rizika: **(a)** pokrenuti zaštićeni instalacioni ZIP na lokalnom privatnom source-u; **(b)** `V44 B0 PASS` + jedan GitHub Desktop commit/push samo u privatnu `development/v43-3`; **(c)** Render API staging deploy i `RMC_QA_MODE=1` + `RMC_QA_ADMIN_KEY` (tajna samo Render env); **(d)** pripremiti nov Preview build sa `RMC_QA_LIVE_SLUGS=frizer`, ažurirati samo javni Preview repozitorijum; **(e)** privatno izdati novi QA kod, uneti u staging PWA u izolovanom browser profilu, stvarni booking i ACK, proveriti idempotentnost. Ne prepisivati stari PWA IndexedDB, ne menjati produkciju.

**Nije još implementirano:** trajni PROJECT RECORD za sve korisničke sajtove i redovne upgrade-ove, pouzdan multi-device/reinstall oporavak Portala, stvarni `unpair` server endpoint/dugme, ORDER inbox, devet kompletno usklađenih QA poslovnih fixture-a, sva live B regresija i automatski public CI deploy. Ove stavke nisu smele da budu prijavljene kao završene samo zbog 9/9 generisanih ZIP-ova ili stabilnih DEV ID-jeva.
