import {demoBrandFromEnvironment} from './site-system.js';
// Global V42 layer: independent of each business renderer and theme.
// Must be applied identically to React srcDoc preview and standalone ZIP HTML.
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const callLabel=id=>({plumber:'Pozovite majstora',electrician:'Pozovite majstora',
 'plumbing-supplies':'Pozovite za informacije','electrical-supplies':'Pozovite za informacije',
 'auto-parts':'Pozovite za dostupnost','auto-service':'Pozovite servis','furniture-store':'Pozovite salon',
 'hair-salon':'Pozovite salon','beauty-salon':'Pozovite salon',restaurant:'Pozovite restoran',
 cafe:'Pozovite lokal','pharmacy':'Pozovite apoteku',hotel:'Pozovite recepciju',
 'rent-a-car':'Pozovite rent-a-car'}[id]||'Pozovite nas');
const tel=p=>'tel:'+String(p).replace(/[^\d+]/g,'');
const maps=(x)=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([x.address,x.city].filter(Boolean).join(', '));
function locationCard(x,idx){
 const address=[x.address,x.city].filter(Boolean).join(', ');
 // Do not imply exact geolocation when only city is supplied.
 const exact=!!x.address&&!!x.city;
 const mapUrl=maps(x);
 return `<article class="ws-place"><h3>${esc(x.label||('Lokacija '+(idx+1)))}</h3><p class="ws-place-address">${esc(address)}</p>
 ${x.hours?`<p class="ws-place-hours">Radno vreme: ${esc(x.hours)}</p>`:''}
 <a class="ws-directions" href="${esc(mapUrl)}" target="_blank" rel="noopener noreferrer">${exact?'Prikaži lokaciju i navigaciju':'Prikaži oblast na mapi'} ↗</a></article>`;
}
function dynamicSection(data,site){
 const id=site.business.id,phone=data.phone;
 const call=phone?`<a class="ws-contact-link ws-call" href="${esc(tel(phone))}">${esc(callLabel(id))}: ${esc(phone)}</a>`:'';
 const mail=data.email?`<a class="ws-contact-link" href="mailto:${esc(data.email)}">${esc(data.email)}</a>`:'';
 const website=data.website?`<a class="ws-contact-link" href="${esc(data.website)}" target="_blank" rel="noopener noreferrer">Posetite naš sajt ↗</a>`:'';
 // WhatsApp and Viber are messaging channels for context-rich forms (V43),
 // NOT location data. Do not expose separate channel numbers beside the map.
 // Keep them in businessData; existing form renderers are deliberately untouched.
 const services=[call,mail,website].filter(Boolean).join('');
 const locs=data.locations.map(locationCard).join('');
 const mapLocation=data.locations.find(l=>l.address&&l.city);
 const mapQuery=mapLocation?[mapLocation.address,mapLocation.city].join(', '):'';
 // No geocoding API key, no fabricated pins. The external map is loaded only by explicit visitor click.
 const map=mapQuery?`<div class="ws-map-wrap"><button type="button" class="ws-map-load" data-ws-map="${esc(mapQuery)}">Učitaj mapu prve lokacije</button><p class="ws-map-hint">Mapa koristi spoljnu uslugu i učitava se samo na vaš zahtev.</p><div class="ws-map-host" aria-live="polite"></div></div>`:'';
 if(!services&&!locs)return '';
 return `<section class="site-section ws-location-section" id="${locs?'lokacije':'brzi-kontakt'}" aria-labelledby="ws-locations-title"><div class="kicker">${locs?'GDE SMO I KAKO NAS DOBITI':'KONTAKT'}</div><h2 id="ws-locations-title">${locs?'Kontakt i lokacije':'Brzi kontakt'}</h2><div class="ws-contact-grid">
 ${services?`<div class="ws-contacts" aria-label="Direktan kontakt">${services}</div>`:''}
 ${locs?`<div class="ws-place-grid">${locs}</div>`:''}</div>${map}</section>`;
}
export function renderSystemLayer(html,site){
 const data=site.businessData||{phone:site.contact?.phone||'',locations:[]};
 const isDemo=site.siteMode!=='production';
 let result=html;
 // Existing business-specific forms stay unchanged. V43 owns their final unification.
 const section=dynamicSection(data,site);
 if(section){const at=result.lastIndexOf('<section class="site-section contact');
  const atVertical=result.lastIndexOf('<section class="site-section contact vertical-contact');
  const insert=atVertical>=0?atVertical:at;
  if(insert>=0)result=result.slice(0,insert)+section+'\n'+result.slice(insert);
  else result=result.replace('</main>',section+'</main>');
  if(data.locations.length){result=result.replace('<a href="#kontakt">Kontakt</a>','<a href="#lokacije">Lokacije</a><a href="#kontakt">Kontakt</a>');}
 }
 const direct=data.phone?`<a class="ws-header-call" href="${esc(tel(data.phone))}">${esc(callLabel(site.business.id))}</a>`:'';
 if(direct){ // Header contact is supplementary: preserve primary business CTA.
   result=result.replace('</header>',direct+'</header>');
 }
 // Remove legacy placeholder phone hints and duplicate old generic tel buttons; shared layer owns phone display.
 if(section){
  result=result.replace(/<a\b[^>]*\bhref="tel:[^"]*"[^>]*>[^<]*<\/a>/g, m=>m.includes('ws-header-call')||m.includes('ws-call')?m:'');
  // restore dynamic header and contact entries if the regex also matched injected links
  // above includes `ws-header-call` and `ws-call`, so these remain untouched.
 }
 result=result.replace(/<p class="hint">(?:Unesite pravi telefon pre objavljivanja sajta\.|Telefon se dodaje pre objavljivanja sajta\.|Telefon nije unet — nema lažnog pozivnog dugmeta\.)<\/p>/g,'');
 // No hardcoded RMC text in the badge component. Brand comes from server-side config.
 const brand=site.demoBrand||demoBrandFromEnvironment();
 const badgeUrl=new URL(brand.url);
 badgeUrl.searchParams.set('source','demo-site');badgeUrl.searchParams.set('business',site.business.id);
 // The internal siteMode="demo" is not a visible label. All free sites show a discreet attribution.
 const badge=isDemo?`<a class="ws-demo-badge" data-system="demoBadge" href="${esc(badgeUrl.toString())}" target="_blank" rel="noopener noreferrer" aria-label="Kreirano uz ${esc(brand.label)}"><span class="ws-badge-intro">Kreirano uz</span><span class="ws-demo-label">${esc(brand.label)}</span></a>`:'';
 // Remove hard-coded legacy footers in BOTH modes; branding belongs only to the global system layer.
 result=result.replace(/<span>(?:Demo sajt · Kreirano pomoću RMC Web Solutions|DEMO · RMC Web Solutions)<\/span>/gi,'');
 result=result.replace('</head>','<link rel="stylesheet" href="site-system.css"></head>');
 if(badge)result=result.replace('</header>','</header>'+badge); // desktop CSS floats; mobile sticky follows header in document flow
 result=result.replace('</body>','<script src="site-system.js" defer></script></body>');
 return result;
}
