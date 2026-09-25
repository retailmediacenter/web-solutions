// Same extension is composed into both React preview HTML and exported ZIP HTML.
// Secondary capabilities never re-run Advisor or modify the primary storefront.
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028');
function select(name,labels){return `<select name="${esc(name)}" required><option value="" disabled selected>Izaberite...</option>${labels.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select>`;}
function card({title,description,image}){
 return `<article class="hybrid-card">${image?`<img src="${esc(image)}" loading="lazy" alt="${esc(title)}">`:''}<div><h3>${esc(title)}</h3><p>${esc(description||'Detalje dogovaramo po upitu.')}</p><a class="hybrid-action" href="#hybrid-upit" data-hybrid-item="${esc(title)}">Pošalji upit →</a></div></article>`;
}
function vehicleCard(product,{featured=false}={}){
 return `<article class="hybrid-card vehicle-card${featured?' vehicle-card--featured':''}" data-vehicle-category="${esc(product.category)}">
  <button type="button" class="vehicle-photo" data-vehicle-detail="${esc(product.id)}" aria-label="Detalji: ${esc(product.title)}"><img src="${esc(product.image)}" alt="${esc(product.title)}" loading="lazy"><span>PRIMER</span></button>
  <div><small>${esc(product.category)}</small><h3>${esc(product.title)}</h3><strong class="vehicle-price">${esc(product.priceLabel)} <small>primer cene</small></strong>
  <p>${esc(product.fields.year)} · ${esc(product.fields.mileage)} · ${esc(product.fields.fuel)}</p>
  <div class="vehicle-card-actions"><button type="button" class="hybrid-action" data-vehicle-detail="${esc(product.id)}">Detalji vozila →</button><a class="hybrid-action" href="#hybrid-upit" data-hybrid-item="${esc(product.title)}">Upit →</a></div></div></article>`;
}
function vehicleModal(){
 return `<dialog id="vehicleDetailDialog" class="site-dialog vehicle-detail-dialog" aria-label="Detalji vozila"><button type="button" class="dialog-close" id="vehicleDetailClose" aria-label="Zatvori">×</button>
  <div class="vehicle-detail-layout"><img id="vehicleDetailPhoto" alt=""><div class="vehicle-detail-content"><span class="kicker">PRIMER VOZILA</span><h2 id="vehicleDetailName"></h2><strong class="vehicle-price" id="vehicleDetailPrice"></strong>
  <p id="vehicleDetailDescription"></p><dl id="vehicleDetailSpecs" class="vehicle-specs"></dl><p class="vehicle-disclaimer">Ilustrativni podaci i cene iz V39.5. Zameniti stvarnom ponudom pre objave.</p><button type="button" class="primary" id="vehicleRequest">Zatraži pregled vozila</button></div></div></dialog>`;
}
function formBody(secondary){
 const common=`<label>Ime<input name="name" autocomplete="name" maxlength="90" required></label>
  <label>Telefon<input name="phone" autocomplete="tel" type="tel" maxlength="35" required></label>
  <label class="hybrid-wide">Napomena (opciono)<textarea name="note" maxlength="500" rows="3"></textarea></label>`;
 if(secondary.type==='service')return `<label>Vrsta usluge${select('item',secondary.offerings)}</label>
  ${secondary.label==='Auto-servis'?'<label>Vozilo (marka, model, godište)<input name="vehicle" maxlength="120" required placeholder="npr. Škoda Octavia 2018"></label>':''}
  <label class="hybrid-wide">Opis problema / zahteva<textarea name="issue" maxlength="600" rows="3" required></textarea></label>
  <label>Željeni datum<input name="date" type="date" required></label>
  <label>Poželjno doba dana${select('daypart',['Prepodne','Popodne','Bilo kada'])}</label>
  ${common}`;
 if(secondary.type==='products')return `<label>Proizvod${select('item',secondary.products.map(x=>x.title))}</label>
  <label>Količina<input name="quantity" type="number" min="1" max="50" value="1" required></label>
  ${secondary.label==='Auto-delovi'?'<label class="hybrid-wide">Vozilo (marka, model, godište)<input name="vehicle" maxlength="120" required placeholder="npr. Opel Astra 2017"></label>':''}
  ${common}`;
 return `<label>Vozilo iz primera ponude${select('item',secondary.products.map(x=>x.title).concat(['Drugo / konkretan model po dogovoru']))}</label>
  <label>Željena marka / model<input name="vehicle" maxlength="120" placeholder="Npr. Golf 7 ili slično; ako nije iz primera ponude"></label>
  <label>Okvirni budžet (opciono)<input name="budget" maxlength="65" placeholder="Npr. do 10.000 EUR"></label>
  ${common}`;
}
function section(h,sec){
 const vehicles=sec.type==='vehicles';
 const cards=sec.type==='service'?sec.services.slice(0,3).map(s=>card(s)):
  sec.type==='products'?sec.products.slice(0,4).map(p=>card({title:p.title,description:p.category,image:p.image})):
  sec.products.map(p=>vehicleCard(p));
 const featured=vehicles?sec.products.slice(0,4).map(p=>vehicleCard(p,{featured:true})).join(''):'';
 const categories=vehicles?[...new Set(sec.products.map(p=>p.category))]:[];
 const vehicleToolbar=vehicles?`<div class="vehicle-featured"><h3>Izdvajamo iz primera ponude</h3><div class="vehicle-featured-rail">${featured}</div></div>
  <div class="vehicle-toolbar"><label>Pretražite vozila<input id="vehicleSearch" type="search" placeholder="Model ili kategorija"></label><label>Kategorija<select id="vehicleCategory"><option value="">Sva vozila</option>${categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></label></div><p id="vehicleCount" class="hint">Prikazano: ${sec.products.length} primer vozila</p>`:'';
 const title=sec.label;
 const explanation=sec.type==='service'?'Pored osnovne ponude, zatražite dodatnu uslugu. Firma naknadno potvrđuje termin.':
  sec.type==='products'?'Istražite povezane proizvode i pošaljite upit. Sekundarni katalog nije dodat u glavnu korpu.':
  'Primeri vozila, cene i specifikacije su ilustrativni. Zamenite ih stvarnom ponudom pre objavljivanja.';
 return `<section class="site-section hybrid-section" id="dodatna-delatnost" data-secondary="${esc(h.secondaryId)}"><div class="kicker">JOŠ JEDNA DELATNOST</div><h2>${esc(title)}</h2><p>${esc(explanation)}</p>
 ${vehicles?'<p class="vehicle-disclaimer">Prikazana vozila i cene su ilustrativni primeri. Stvarna ponuda se unosi pre javne prodaje.</p>':''}
 ${vehicleToolbar}
 <div class="hybrid-grid${vehicles?' vehicle-inventory-grid':''}"${vehicles?' id="vehicleInventory"':''}>${cards.join('')}</div>
 <div class="hybrid-request" id="hybrid-upit"><h3>${sec.type==='service'?'Zatražite uslugu':sec.type==='vehicles'?'Pošaljite upit za vozilo':'Proverite dostupnost'}</h3>
 <p>Zahtev se priprema za slanje. Nije rezervacija, automatska provera stanja niti potvrđena kupovina.</p>
 <form id="hybridForm" class="hybrid-form" data-hybrid-mode="${esc(sec.type)}">${formBody(sec)}<button class="primary hybrid-wide" type="submit">Pripremi upit</button></form></div>
 </section>${vehicles?vehicleModal():''}<dialog id="hybridDialog" class="site-dialog hybrid-dialog" aria-label="Pripremljen dodatni zahtev"><button type="button" class="dialog-close" id="hybridClose" aria-label="Zatvori">×</button>
 <div class="hybrid-dialog-inner"><div class="kicker">DODATNA DELATNOST</div><h2>Zahtev je spreman</h2><p>Izaberite način slanja. Zahtev još nije poslat.</p>
 <pre id="hybridMessage"></pre><div class="hybrid-actions"><button id="hybridCopy" class="primary" type="button">Kopiraj poruku</button><a id="hybridViber" class="secondary" rel="noopener noreferrer" target="_blank">Viber</a><a id="hybridWhatsapp" class="secondary" rel="noopener noreferrer" target="_blank">WhatsApp</a></div><p id="hybridNotice" class="hint" role="status">Viber može skratiti duge poruke. Kopirajte celu poruku po potrebi.</p></div></dialog>`;
}
export function addHybridToHtml(html,payload){
 const hybrid=payload?.siteConfig?.capabilities?.hybrid;
 if(!hybrid)return html;
 if(!payload.secondary ||payload.secondary.type!==hybrid.kind)throw new Error('Nepotpuna hibridna konfiguracija.');
 if(html.includes('id="dodatna-delatnost"'))throw new Error('Hibridna sekcija već postoji.');
 // Keep existing navigation/primary CTA untouched. Add only a secondary nav item.
 const navAnchor='<a href="#kontakt">Kontakt</a>';
 const navPosition=html.indexOf(navAnchor);
 if(navPosition<0)throw new Error('Primarna navigacija nije pronađena.');
 html=html.slice(0,navPosition)+'<a href="#dodatna-delatnost">'+esc(hybrid.label)+'</a>'+html.slice(navPosition);
 const insert=html.indexOf('<section class="site-section contact');
 if(insert<0)throw new Error('Primarna kontakt sekcija nije pronađena.');
 html=html.slice(0,insert)+section(hybrid,payload.secondary)+'\n'+html.slice(insert);
 html=html.replace('<div class="hero-actions">', '<div class="hero-actions"><a class="outline-light" href="#dodatna-delatnost">'+esc(hybrid.label)+'</a>');
 html=html.replace('</head>','<link rel="stylesheet" href="hybrid.css"></head>');
 const publicData={business:{name:payload.siteConfig.business.name},label:hybrid.label,secondary:hybrid.secondaryId,
   kind:hybrid.kind,contact:{phone:payload.siteConfig.contact.phone||''},
   vehicles:payload.secondary.type==='vehicles'?payload.secondary.products:[]};
 html=html.replace('</body>',`<script type="application/json" id="hybridData">${safeJson(publicData)}</script><script defer src="hybrid-runtime.js"></script></body>`);
 return html;
}
