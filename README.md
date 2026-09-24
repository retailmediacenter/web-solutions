# RMC Web Solutions — React + Node

**V41.4: Commerce intent + Viber korekcija na V41.3 migracionoj osnovi sa 13 testnih scenarija iz V39.5.**

- **React + Vite:** Advisor tok i interaktivni preview u studiju.
- **Node + Express:** Advisor odluke, Business Registry V1 (72 činjenice), priprema konfiguracije i ZIP export.
- **Jedan generator sajta:** isti HTML/CSS/JS dobija React preview i preuzeti ZIP. Posetiocu se ne šalju Advisor, Registry i kod generatora.
- **Radi trenutno:** Mesara, Vinoteka, Prodavnica obuće i 10 dodatnih Retail/Catalogue scenarija. Preostalih 59 scenarija i ostali moduli još nisu kompletno migrirani.

Lokalno pokretanje iz ovog foldera na Windowsu:

```cmd
npm test
npm run build
npm run dev
```

Otvori **http://localhost:5173**. Node API radi na **http://localhost:3000/api/health**. Originalni V39.5 ostaje na disku zasebno; u lokalnom studiju postoji link za otvaranje preko Node servera.

**Render:** produkcijski API je `rmc-web-solutions-api.onrender.com`. Za React na Webglobe-u postaviti `CLIENT_ORIGIN=https://retailmediacenter.com` na Renderu (ili odgovarajući novi domen) radi CORS-a. Ne objavljivati stari izvorni kod V39.5 na Render.

**Pre objavljivanja:** sve demo cene moraju biti zamenjene stvarnim cenama. Korpa i degustacija pripremaju poruke, bez automatske naplate ili potvrđivanja raspoloživosti. React može statički da se objavi u `/web-solutions/` nakon `npm run build`, ali to *ne treba uraditi* dok kompletan proizvod ne zameni stari sajt.

Za arhitekturu, trenutno stanje, testove i sledeće korake koristiti **PROJECT_STATUS.md** (jedini glavni projektni status dokument).

V41.4: telefon, mini-market i auto-delovi dobijaju eksplicitno Advisor pitanje o porudžbinama. Viber share može biti ograničen na 200 znakova i zavisi od uređaja; ceo zahtev može se kopirati.
