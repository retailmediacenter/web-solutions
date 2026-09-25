// V41.8 - One schema-driven sector renderer; the Advisor owns business choices.
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const json=v=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028');
const labels={
 property:['Katalog nekretnina','Upit agentu'],construction:['Projekti','Upit za projekat'],
 enrollment:['Programi','Prijava za program'],kindergarten:['Program vrtića','Zahtev za obilazak'],
 stay:['Vrste smeštaja','Zahtev za dostupnost'],rental:['Klase vozila','Upit za najam'],
 travel:['Putovanja','Upit za putovanje'],clinical:['Usluge','Zahtev za pregled'],
 pharmacy:['Kategorije proizvoda','Upit za dostupnost'],lab:['Analize i usluge','Upit za uzorkovanje'],
 vet:['Usluge','Zahtev za pregled ljubimca'],quote:['Usluge','Zahtev za ponudu'],catalog:['Kategorije','Upit za opremu']
};
const field=(name,label,control,wide=false)=>`<label class="vertical-field${wide?' wide':''}"><span>${esc(label)}</span>${control}</label>`;
function inputField(spec){
 const {name,label,kind}=spec;
 if(kind==='textarea')return field(name,label,`<textarea name="${esc(name)}" maxlength="500" rows="3" required></textarea>`,true);
 if(kind.startsWith('select:')){
  const choices=kind.slice(7).split('|');
  return field(name,label,`<select name="${esc(name)}"${label.includes('(opciono)')?'':' required'}><option value="" selected>${label.includes('(opciono)')?'Bez izbora':'Izaberite'}</option>${choices.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>`);
 }
 const required=['arrival','departure','guests','pickup','returnLocation','pickupTime','returnTime','size','quantity','area','scope','pet','age','date','time'].includes(name);
 const min=kind==='number'?' min="1" max="200"':'';
 return field(name,label,`<input name="${esc(name)}" type="${esc(kind)}"${min} maxlength="180"${required?' required':''}>`);
}
function formMarkup(p,enabled){
 const choices=p.cards.filter(c=>c.requestable!==false).map(c=>c.title);
 // Info-only mode does not pretend to book a room, confirm a treatment, or sell a product.
 const primary=field('item',p.kind==='rental'?'Klasa / usluga':p.kind==='stay'?'Tip smeštaja':p.kind==='enrollment'?'Program':'Izaberite oblast',
 `<select name="item" required><option value="" selected disabled>Izaberite</option>${choices.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>`);
 const specialized=enabled?p.fields.filter(f=>!(p.kind==='kindergarten'&&f.name==='date'&&!enabled)).map(inputField).join('')
  :p.kind==='kindergarten'?p.fields.filter(f=>f.name==='age').map(inputField).join('')
  :'';
 const medical=['dentist','clinic','lab'].includes(p.id);
 const note=medical?'':field('note','Napomena (opciono)',`<textarea name="note" maxlength="300" rows="2" placeholder="Samo administrativne informacije — ne unosite zdravstvene podatke."></textarea>`,true);
 return `<form id="verticalForm" class="vertical-form" data-kind="${esc(p.kind)}" data-enabled="${enabled?'true':'false'}">${primary}${specialized}
 ${field('name','Ime',`<input name="name" autocomplete="name" maxlength="90" required>`) }
 ${field('phone','Telefon',`<input name="phone" type="tel" autocomplete="tel" maxlength="35" required>`) }
 ${note}
 <button class="primary wide" type="submit">${enabled?esc(labels[p.kind][1]):'Pripremi kontakt upit'}</button></form>`;
}
export function renderVerticalHtml({siteConfig:site,catalog:p}){
 if(!site?.capabilities?.vertical||!p||p.id!==site.business.id)throw new Error('Nedostaje sektorska konfiguracija.');
 const enabled=!!site.capabilities.verticalEnabled;
 const [sectionLabel,actionLabel]=labels[p.kind];
 const tagline=(p.hero?'':' no-photo');
 const cards=p.cards.map((c,i)=>`<article class="vertical-card" data-kind="${esc(p.kind)}" data-filter="${esc(c.title)}">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.title)} — ilustrativan prikaz" loading="lazy">`:`<div class="no-card-photo" role="img" aria-label="Fotografija biće dodata kada vlasnik dostavi materijal"><span>${String(i+1).padStart(2,'0')}</span><small>Fotografija se dodaje naknadno</small></div>`}<div class="vertical-card-copy"><small>${p.kind==='stay'||p.kind==='rental'||p.kind==='property'||p.kind==='construction'?'PRIMER PONUDE':'PONUDA / OBLAST'}</small><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p>${c.requestable===false?'<span class="vertical-muted">Informativni sadržaj</span>':`<a href="#upit" data-vertical-item="${esc(c.title)}" class="secondary">${enabled?'Pošalji zahtev':'Saznaj više'} →</a>`}</div></article>`).join('');
 const toolbar=['property','stay','rental','travel','catalog','pharmacy'].includes(p.kind)?`<div class="vertical-tools"><label>Pretražite ponudu<input id="verticalSearch" type="search" placeholder="Vrsta ili naziv" aria-label="Pretražite ponudu"></label><small id="verticalShown">Prikazano: ${p.cards.length}</small></div>`:'';
 const info=['property','construction','stay','rental','travel'].includes(p.kind)?'<p class="vertical-demo-info">Fotografije i kategorije predstavljaju ilustrativne primere, ne potvrđenu ponudu, cijene ili dostupnost. Pre objave unesite stvarne podatke.</p>':'';
 const healthcare=['clinical','lab','vet','pharmacy'].includes(p.kind);
 const clinicalNotice=healthcare?`<p class="vertical-demo-info">${p.kind==='pharmacy'?'Ne primamo porudžbine lekova na recept ili zdravstvene podatke preko kontakt obrasca.':p.kind==='vet'?'Zahtev nije potvrđen termin. Za hitna stanja koristite zvanični kontakt ambulante.':'Obrazac je samo za termin / informaciju. Ne unosite simptome, dijagnozu ni medicinsku dokumentaciju.'}</p>`:'';
 const noAssets=p.hero?'':'<p class="vertical-demo-info">Fotografije i reference vlasnik može dodati pre objavljivanja.</p>';
 const phone=site.contact?.phone||'';const tel=phone.replace(/[^\d+]/g,'');
 const externalUrl=site.capabilities?.externalBookingUrl||null;
 const cta=enabled?actionLabel:'Kontaktirajte nas';
 const publicData={business:{id:p.id,name:site.business.name},contact:{phone},enabled,kind:p.kind,labels:Object.fromEntries(p.fields.map(f=>[f.name,f.label]))};
 return `<!doctype html><html lang="sr" data-style="${esc(site.style)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(site.business.name)} | ${esc(sectionLabel)}</title><meta name="description" content="${esc(p.subtitle)}"><link rel="stylesheet" href="site.css"><link rel="stylesheet" href="vertical.css"></head><body>
 <header class="site-header"><div class="brandmark"><span class="monogram">${esc(site.business.name.slice(0,2).toUpperCase())}</span><span>${esc(site.business.name)}</span></div><nav aria-label="Glavna navigacija"><a href="#ponuda">${esc(sectionLabel)}</a><a href="#upit">${esc(cta)}</a><a href="#kontakt">Kontakt</a></nav><a class="header-cta" href="${externalUrl&&!enabled?esc(externalUrl):'#upit'}"${externalUrl&&!enabled?' target="_blank" rel="noopener noreferrer"':''}>${externalUrl&&!enabled?'Spoljna rezervacija':esc(cta)}</a></header>
 <main><section class="hero vertical-hero${tagline}" ${p.hero?`style="--hero-image:url('${esc(p.hero)}')"`:''}><div class="hero-content"><div class="kicker">${esc(p.label.toUpperCase())}</div><h1>${esc(p.headline)}</h1><p>${esc(p.subtitle)}</p><div class="hero-actions"><a href="#ponuda" class="primary">Pogledajte ponudu</a><a href="#upit" class="outline-light">${esc(cta)}</a>${externalUrl?`<a href="${esc(externalUrl)}" class="outline-light" target="_blank" rel="noopener noreferrer">Spoljni booking ↗</a>`:''}</div></div></section>
 <section class="site-section" id="ponuda"><div class="section-heading"><div><div class="kicker">${esc(p.group.toUpperCase())}</div><h2>${esc(sectionLabel)}</h2></div></div>${info}${noAssets}${toolbar}<div class="vertical-grid">${cards}</div></section>
 <section class="site-section vertical-inquiry" id="upit"><div class="section-heading"><div class="kicker">${enabled?'POŠALJITE ZAHTEV':'INFORMATIVNI KONTAKT'}</div><h2>${esc(cta)}</h2><p>${enabled?'Izaberite ponudu i unesite relevantne podatke. Firma naknadno odgovara — nema automatske potvrde termina, cene niti dostupnosti.':'Pogledajte oblasti rada i pripremite kontakt upit. Nisu uključene usluge koje firma nije potvrdila u Advisoru.'}</p></div>${clinicalNotice}${formMarkup(p,enabled)}</section>
 <section class="site-section contact vertical-contact" id="kontakt"><div class="kicker">KONTAKT</div><h2>Kontaktirajte nas</h2><p>Za detalje o stvarnoj ponudi i radnom vremenu obratite se firmi.</p>${phone?`<a href="tel:${esc(tel)}" class="primary">Pozovi ${esc(phone)}</a>`:'<p class="hint">Telefon nije unet — nema lažnog pozivnog dugmeta.</p>'}</section></main>
 <footer class="site-footer"><strong>${esc(site.business.name)}</strong></footer>
 <a href="#upit" class="vertical-mobile-cta">${esc(cta)} ↑</a>
 <dialog id="verticalDialog" class="site-dialog vertical-dialog" aria-label="Pripremljen zahtev"><button type="button" id="verticalClose" class="dialog-close" aria-label="Zatvori">×</button><div class="dialog-pad"><div class="kicker">${enabled?'POSLOVNI ZAHTEV':'KONTAKT'}</div><h2>Poruka je pripremljena</h2><p>Poruka još nije poslata. Izaberite kanal komunikacije.</p><pre id="verticalMessage"></pre><div class="dialog-actions"><button id="verticalCopy" class="primary" type="button">Kopiraj zahtev</button><a id="verticalViber" class="secondary" target="_blank" rel="noopener noreferrer">Viber</a><a id="verticalWhatsapp" class="secondary" target="_blank" rel="noopener noreferrer">WhatsApp</a></div><p id="verticalNotice" role="status" class="hint">Viber može skratiti duge poruke; po potrebi kopirajte kompletan zahtev.</p></div></dialog>
 <script type="application/json" id="verticalData">${json(publicData)}</script><script defer src="vertical-runtime.js"></script></body></html>`;
}
