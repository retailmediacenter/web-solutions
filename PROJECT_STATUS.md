# RMC Web Solutions — jedinstveni projektni status

**Verzija:** V41.5 — Universal Booking, 24.09.2026.  
**Status:** **37 funkcionalnih scenarija od 72** registrovane delatnosti. Preostalih **35** još nije kompletno migrirano. V39.5 ostaje referentna i rollback verzija.

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
