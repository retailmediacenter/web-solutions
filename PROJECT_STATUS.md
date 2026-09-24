# RMC WEB SOLUTIONS — V41 MIGRATION STATUS

## Referenca

**V39.5 je poslednja potvrđena funkcionalna browser verzija**. Nalazi se lokalno u sibling folderu `../web-solutions`. Automatizovana Windows skripta pravi dodatnu kopiju pre bilo kakvog rada. Original se ne menja. V40.x se NE koristi kao razvojna baza.

## Trenutni rezultat ovog paketa (Foundation, NE završena migracija)

- React/Vite frontend se pokreće lokalno na portu 5173, Node/Express API na 3000.
- Server-side Business Registry V1 sadrži svih **72 originalnih entry-ja** iz V39.5. Registry poseduje samo poslovne i asset činjenice; Advisor zadržava module i odluke.
- Prva **pilot** verzija API-ja čuva eksplicitne odgovore Mesara (sirovo/grilovano) i Vinoteka (degustacije da/ne); obuća služi kao običan retail scenario.
- Ovo još NE migrira ceo Advisor, nijedan renderer, produkt modal, cart, Booking, Editor, generisanje ZIP-a ili Publish. React ekran je test API ugovora, a ne novi gotov Web Solutions.
- Originalni V39.5 moguće je lokalno otvoriti na `http://localhost:3000/legacy/` ako je i dalje u izvornom folderu.
- Root `render.yaml` omogućava naknadno testiranje Node API-ja na Renderu; pre povezivanja produkcionog frontenda treba podesiti `CLIENT_ORIGIN`, autentifikaciju, rate-limit i produkciono odvojiti interno/public API.

## Lokalni razvoj

Iz korena repozitorijuma:

```bat
npm install
npm test
npm run dev
```

Otvori `http://localhost:5173`. API je na `http://localhost:3000/api/health`, a referentni stari sajt na `http://localhost:3000/legacy/`.

## Predviđeni lokalni folderi

- `../web-solutions`: originalni V39.5 — **READ ONLY**.
- `../web-solutions-V39_5_BACKUP_SAFE`: dodatna lokalna backup kopija.
- `./`: V41 React/Node Git repozitorijum, bez velike biblioteke slika.

## Arhitektura / šta Codex sledeće migrira

1. Snimiti stvarni end-to-end V39.5 Advisor flow i data strukture, ne pretpostavljati da se faze svode na tri polja. Preneti punu state machine u Node i React.
2. Definisati produkcijski `SiteConfig` schema kao contract između Advisora, React preview-a, Editora i Node eksportera (ovde je namerno samo `41.0-pilot`).
3. Reprodukovati i testirati V39.5 Commerce pre bilo kakvog Booking portovanja; cenovnik, image resolver, modal, variant/preparation, cart line, sticky total i naručivanje.
4. Booking modul sa configurable modes, wine tasting pitanje, validacija i UAT testiranje bez business-specific DOM zakrpa.
5. Generator i ZIP transfer server-side; nikad ne slati originalne generator/registry skripte u produkcijski `dist/`.
6. Asset biblioteka ostaje lokalno i na Webglobe-u; originalni `assetRoot` mora biti mapiran na javne slike bez dupliranja sadržaja u GitHub-u.
7. Pre objave: mobile i desktop E2E testovi za Mesara, Vinoteka, Obuća, i kompletna validacija svih 72 business entry-ja.

## Uslovi prihvatanja prve migracione etape

- `npm test` prolazi, `npm run build` prolazi, React i API rade lokalno.
- V39.5 ostaje netaknut, dodatni backup postoji.
- Pilot Advisor ne preskače poslovna pitanja i daje server-side konfiguraciju.
- Ne proglašavati produkcijski React builder završenim dok stvarni generator i komercijalni UI ne prođu E2E.

## Render i Webglobe

Render: Node backend u zasebnom Web Service-u, minimalno `/api/health`. GitHub privatni repo `retailmediacenter/web-solutions`, branch `main`. Webglobe: postojeći frontend ostaje nepromenjen sve dok novi React build nije verifikovan; za novi build podesiti `client/.env.production` sa `VITE_API_BASE_URL` i na Render servisu `CLIENT_ORIGIN` na tačan Webglobe origin; nakon toga `client/dist` sadržaj ide u `public_html/web-solutions/` (Vite već koristi `/web-solutions/` base u produkciji).
