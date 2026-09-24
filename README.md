# RMC Web Solutions — React + Node

**V41.5 — Universal Booking.** Trenutno je funkcionalno migrirano **37/72** business scenarija iz V39.5.

- **React + Vite:** Advisor i Preview studio.
- **Node + Express:** Advisor odluke, 72-entry fact-only Business Registry, SiteConfig, renderer i ZIP export.
- **Commerce:** nasleđen i regresiono čuvan iz V41.4.
- **Universal Booking:** `appointment`, `reservation`, `consultation`, `request-slot`; uvek uslovljen eksplicitnim Advisor odgovorom.
- **Bez lažnih potvrda:** forme pripremaju zahtev; termin/rezervacija nije potvrđena dok firma ne odgovori.

Lokalno na Windowsu:

```cmd
npm test
npm run build
npm run dev
```

Frontend: `http://localhost:5173`  
API: `http://localhost:3000/api/health`

V39.5 ostaje odvojena referenca. Produkcijski Render `main` i Webglobe ne menjati dok testna V41.5 grana ne prođe praktičan QA.

Za kompletno stanje, spisak booking industrija i pravila koristiti **PROJECT_STATUS.md** kao jedini glavni status dokument.
