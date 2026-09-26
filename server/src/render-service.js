// V41.5 — one renderer, independent of industry IDs and booking mode branching.
// Advisor resolves the mode/fields; this renderer handles schema-driven layout only.
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const safeJson=v=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028');
const field=(name,label,content,{wide=false}={})=>`<label class="${wide?'wide':''}">${esc(label)}${content}</label>`;
function select(name,choices){
  // Explicit offerings are rendered as safe strings. Multi-choice booking always
  // requires a deliberate selection; a single choice is preselected.
  const options=choices.map(x=>String(x??'').trim()).filter(Boolean);
  const placeholder=options.length>1?'<option value="" disabled selected>Izaberite uslugu</option>':'';
  return `<select name="${esc(name)}" required>${placeholder}${options.map((c,i)=>`<option value="${esc(c)}"${options.length===1&&i===0?' selected':''}>${esc(c)}</option>`).join('')}</select>`;
}
const input=(name,type='text',props='')=>`<input name="${esc(name)}" type="${type}" ${props}>`;
function serviceForm(booking){
  const {enabled,mode,fields,offerings}=booking;
  const f=[];
  f.push(field('service',mode==='reservation'?'Vrsta rezervacije':mode==='consultation'?'Tema konsultacije':mode==='request-slot'?'Vrsta usluge / intervencije':'Usluga', select('service',offerings)));
  if(enabled){
    if(fields.eventType)f.push(field('eventType','Tip događaja',select('eventType',['Rođendan','Porodična proslava','Poslovni događaj','Drugo'])));
    if(fields.partySize)f.push(field('partySize',mode==='reservation'?'Broj osoba':'Broj gostiju',input('partySize','number','min="1" max="250" value="2" required')));
    if(fields.locationMode)f.push(field('locationMode','Način razgovora',select('locationMode',['U kancelariji','Telefonom','Onlajn'])));
    if(fields.vehicle)f.push(field('vehicle','Vozilo (marka, model, godište)',input('vehicle','text','required maxlength="100" placeholder="Npr. Škoda Octavia 2018"'),{wide:true}));
    if(fields.issue)f.push(field('issue','Kratak opis posla ili problema',input('issue','text','required maxlength="180" placeholder="Šta treba da uradimo?"'),{wide:true}));
    if(fields.location)f.push(field('location',mode==='reservation'?'Lokacija događaja':'Lokacija intervencije / obilaska',input('location','text','required maxlength="140" placeholder="Mesto / deo grada"'),{wide:true}));
    if(fields.destination)f.push(field('destination','Odredište selidbe',input('destination','text','required maxlength="140" placeholder="Ulica i mesto istovara"'),{wide:true}));
    if(fields.date)f.push(field('date','Željeni datum',input('date','date','required')));
    if(fields.time)f.push(field('time','Željeno vreme',input('time','time','required')));
    if(fields.daypart)f.push(field('daypart','Poželjno doba dana',select('daypart',['Prepodne','Popodne','Bilo kada'])));
  }
  f.push(field('name','Ime',input('name','text','autocomplete="name" required maxlength="90"')));
  f.push(field('phone','Telefon',input('phone','tel','autocomplete="tel" required maxlength="35"')));
  f.push(field('note','Napomena (opciono)','<textarea name="note" rows="2" maxlength="350" placeholder="Dodatne informacije"></textarea>',{wide:true}));
  return `<form class="service-request-form" id="requestForm" data-mode="${esc(mode)}">
    ${f.join('')}<button type="submit" class="primary wide">${enabled?mode==='reservation'?'Pošalji zahtev za rezervaciju':mode==='consultation'?'Pošalji zahtev za konsultaciju':'Pošalji zahtev za termin':'Pripremi kontakt upit'}</button>
  </form>`;
}
export function renderServiceHtml({siteConfig:site,catalog}){
  if(!site?.capabilities?.serviceProfile||!Array.isArray(catalog?.services))throw new Error('Nepotpuna servisna konfiguracija.');
  const {business,capabilities,style,contact}=site;
  const book=capabilities.booking;
  const actionTarget=book.enabled?'zakazivanje':'kontakt';
  const actionLabel=book.enabled?book.mode==='appointment'?'Zatraži termin':book.mode==='reservation'?'Pošalji rezervaciju':book.mode==='consultation'?'Zatraži konsultaciju':'Zatraži termin':'Kontaktirajte nas';
  // Only public-facing presentation data crosses the server/browser boundary.
  const publicData={business:{name:business.name,id:business.id},contact:{phone:contact.phone||''},
    booking:{enabled:book.enabled,mode:book.mode,timingMode:book.timingMode||'EXACT_TIME',offerings:book.offerings,services:book.services||[]},bookingTransport:site.bookingTransport||null,...(site.bookingPairing?{bookingManager:site.bookingPairing}:{})};
  const cards=catalog.services.map(s=>`<article class="service-card"><img src="${esc(s.image)}" loading="lazy" alt="${esc(s.title)}"><div class="service-card-body"><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p><a href="#${actionTarget}" class="secondary" ${book.mode==='reservation'?'':`data-service="${esc(s.title)}"`}>${book.enabled?book.mode==='reservation'?'Pošalji rezervaciju':'Zatraži termin':'Pošalji upit'} →</a></div></article>`).join('');
  const form=serviceForm(book);
  const booking=book.enabled?`<section class="site-section booking-service" id="zakazivanje"><div class="section-heading"><div class="kicker">${book.mode==='reservation'?'REZERVACIJE':book.mode==='consultation'?'KONSULTACIJE':'ZAKAZIVANJE'}</div><h2>${actionLabel}</h2><p>Izaberite željeni termin. Nakon objavljivanja i povezivanja sajta, zahtev se šalje firmi ${esc(business.name)} preko Business Portala. Termin nije potvrđen dok vam firma ne odgovori.</p></div>${form}</section>`:'';
  const contactForm=book.enabled?'':`<div class="service-contact-form"><h3>Pošaljite kontakt upit</h3><p>Ova firma trenutno ne nudi zakazivanje putem sajta.</p>${form}</div>`;
  const requestDialog=book.enabled&&!(site.bookingPairing&&!site.bookingTransport)
    ? `<dialog id="requestDialog" class="site-dialog service-dialog booking-submit-dialog" aria-label="Status zahteva"><div class="dialog-pad booking-submit-state"><section id="bookingSubmitPreview" hidden aria-live="polite"><div class="kicker">DEMONSTRACIONI PREGLED</div><h2>Ovako radi slanje rezervacije</h2><p>Zahtev nije poslat. Preuzmite sajt i povežite ga sa Business Portalom da biste aktivirali prijem rezervacija.</p><button type="button" class="primary" data-close>Zatvori</button></section><section id="bookingSubmitSending" aria-live="polite"><div class="kicker">SLANJE ZAHTEVA</div><h2>Šaljemo zahtev…</h2><p>Sačekajte potvrdu sistema.</p></section><section id="bookingSubmitSuccess" hidden aria-live="polite"><div class="kicker">ZAHTEV JE POSLAT</div><h2>Zahtev je uspešno poslat!</h2><p class="booking-code-label">Vaš rezervacioni kod:</p><strong id="bookingReservationCode" class="booking-confirmation-code"></strong><p>Termin još nije potvrđen. ${esc(business.name)} će vas kontaktirati radi potvrde.</p><button type="button" class="primary" data-close>Zatvori</button></section><section id="bookingSubmitError" hidden aria-live="polite"><div class="kicker">SLANJE NIJE USPELO</div><h2>Zahtev nije poslat</h2><p id="bookingSubmitErrorText"></p><div class="dialog-actions"><button type="button" class="secondary" data-close>Zatvori</button><button type="button" class="primary" data-booking-retry>Pokušajte ponovo</button></div></section></div></dialog>`
    : `<dialog id="requestDialog" class="site-dialog service-dialog" aria-label="Pripremljen zahtev"><button class="dialog-close" type="button" data-close aria-label="Zatvori">×</button><div class="dialog-pad"><div class="kicker">${book.enabled?'ZAHTEV ZA TERMIN':'KONTAKT UPIT'}</div><h2>Poruka je spremna</h2><p>Zahtev još nije poslat. Izaberite kanal komunikacije.</p><pre id="requestMessage"></pre><div class="dialog-actions"><button id="copyRequest" class="primary" type="button">Kopiraj zahtev</button><a id="viberRequest" class="secondary" rel="noopener noreferrer" target="_blank">Viber</a><a id="waRequest" class="secondary" rel="noopener noreferrer" target="_blank">WhatsApp</a></div><p class="hint">Viber može skratiti dugu poruku. Potpun zahtev je dostupan preko dugmeta Kopiraj. Termin nije automatski potvrđen.</p><p id="copyRequestStatus" role="status"></p></div></dialog>`;
  return `<!doctype html><html lang="sr" data-style="${esc(style)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#16243a"><title>${esc(business.name)} | Usluge</title><meta name="description" content="${esc(catalog.subtitle)}"><link rel="stylesheet" href="site.css"><link rel="stylesheet" href="booking.css"></head><body>
<header class="site-header"><div class="brandmark"><span class="monogram">${esc(business.name.slice(0,2).toUpperCase())}</span><span>${esc(business.name)}</span></div><nav aria-label="Glavna navigacija"><a href="#usluge">Usluge</a>${book.enabled?'<a href="#zakazivanje">Termini</a>':''}<a href="#kontakt">Kontakt</a></nav><a class="header-cta" href="#${actionTarget}">${actionLabel}</a></header>
<main><section class="hero service-hero" style="--hero-image:url('${esc(catalog.hero)}')"><div class="hero-content"><h1>${esc(catalog.headline)}</h1><p>${esc(catalog.subtitle)}</p><div class="hero-actions"><a href="#${actionTarget}" class="primary">${actionLabel}</a><a href="#usluge" class="outline-light">Pogledajte usluge</a></div></div></section>
<section class="site-section services-section" id="usluge"><div class="section-heading"><div><div class="kicker">PONUDA</div><h2>${esc(catalog.offerTitle||'Naše usluge')}</h2><p>Izaberite uslugu i pošaljite zahtev ili nas kontaktirajte.</p></div></div><div class="service-grid">${cards}</div></section>
${booking}
<section class="site-section contact service-contact" id="kontakt"><div class="kicker">KONTAKT</div><h2>Čujemo se!</h2><p>Kontaktirajte nas za dodatne informacije.</p>${contact.phone?`<a class="primary" href="tel:${esc(contact.phone.replace(/[^+\d]/g,''))}">Pozovi ${esc(contact.phone)}</a>`:'<p class="hint">Telefon se dodaje pre objavljivanja sajta.</p>'}${contactForm}</section></main>
<footer class="site-footer"><strong>${esc(business.name)}</strong></footer>
<a class="service-mobile-cta" href="#${actionTarget}">${actionLabel} ↑</a>
${requestDialog}
<script id="bookingData" type="application/json">${safeJson(publicData)}</script>${site.bookingPairing?'<script src="booking-link.js" defer></script>':''}<script src="booking-runtime.js" defer></script></body></html>`;
}