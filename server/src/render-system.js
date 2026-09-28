import {demoBrandFromEnvironment} from './site-system.js';
// V45.4: shared presentation layer. Business/Booking/Commerce rules remain elsewhere.
// Exactly the same renderHtml result is used for srcDoc Preview and exported ZIP.
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const callLabel=id=>({plumber:'Pozovite majstora',electrician:'Pozovite majstora',
 'plumbing-supplies':'Pozovite za informacije','electrical-supplies':'Pozovite za informacije',
 'auto-parts':'Pozovite za dostupnost','auto-service':'Pozovite servis','furniture-store':'Pozovite salon',
 'hair-salon':'Pozovite salon','beauty-salon':'Pozovite salon',restaurant:'Pozovite restoran',
 cafe:'Pozovite lokal','pharmacy':'Pozovite apoteku',hotel:'Pozovite recepciju',
 'rent-a-car':'Pozovite rent-a-car'}[id]||'Pozovite nas');
const tel=p=>'tel:'+String(p).replace(/[^\d+]/g,'');
const contactCss=`<style id="ws-v454-contact-css">
.ws-location-section,.ws-v454-contact{clear:both;scroll-margin-top:110px}
.ws-v454-contact{max-width:1280px;margin:0 auto;padding:clamp(30px,5vw,72px) clamp(20px,4vw,64px);background:var(--section-bg,#f8fafc);color:var(--ink,#17263c);font-family:var(--body-font,Arial,sans-serif)}
.ws-v454-contact h2{font:750 clamp(24px,3vw,38px)/1.25 var(--display-font,Arial,sans-serif);color:var(--ink,#17263c);margin:10px 0 18px}
.ws-v454-contact-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.ws-v454-contact .ws-v454-phone{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:12px 20px;border-radius:var(--button-radius,11px);background:var(--accent,#1e5bca);color:var(--on-accent,#fff)!important;border:0;text-decoration:none;font-weight:800;white-space:normal;overflow-wrap:anywhere}
.ws-v454-contact .ws-v454-phone:focus-visible{outline:3px solid #6fa6ff;outline-offset:3px}
.ws-v454-contact .ws-v454-extra{display:inline-flex;align-items:center;color:var(--accent,#264e88);overflow-wrap:anywhere;min-height:44px}
.ws-v454-contact .service-contact-form{width:100%;margin-top:22px}
.ws-v454-map-title{font-size:clamp(20px,2.2vw,30px)!important}
@media(max-width:690px){.ws-v454-contact{padding:32px 17px}.ws-v454-contact .ws-v454-phone{width:100%;text-align:center}}
</style>`;
function locationCard(x,idx){
 const address=[x.address,x.city].filter(Boolean).join(', ');
 return `<article class="ws-place"><h3>${esc(x.label||('Lokacija '+(idx+1)))}</h3><p class="ws-place-address">${esc(address)}</p>
 ${x.hours?`<p class="ws-place-hours">Radno vreme: ${esc(x.hours)}</p>`:''}</article>`;
}
function sections(data,site,retainedForm=''){
 const phone=data.phone||'';
 const locations=Array.isArray(data.locations)?data.locations:[];
 const firstExact=locations.find(l=>l.address&&l.city);
 const mapQuery=firstExact?[firstExact.address,firstExact.city].join(', '):'';
 // Existing site-system.js creates the iframe only when the visitor clicks.
 // No Google Maps navigation links or imaginary pins for city-only businesses.
 const map=mapQuery?`<div class="ws-map-wrap"><button type="button" class="ws-map-load" data-ws-map="${esc(mapQuery)}">Prikaži mapu</button><p class="ws-map-hint">Mapa se učitava samo na vaš zahtev.</p><div class="ws-map-host" aria-live="polite"></div></div>`:'';
 const places=locations.length?`<section class="site-section ws-location-section" id="lokacije" aria-labelledby="ws-locations-title">
 <div class="kicker">LOKACIJA</div><h2 class="ws-v454-map-title" id="ws-locations-title">${map?'Pronađite nas':'Područje rada'}</h2>
 <div class="ws-place-grid">${locations.map(locationCard).join('')}</div>${map}</section>`:'';
 const mainContact=phone?`<a class="ws-v454-phone" href="${esc(tel(phone))}">${esc(callLabel(site.business.id))}: ${esc(phone)}</a>`:
 '<p>Kontakt telefon nije unet.</p>';
 const mail=data.email?`<a class="ws-v454-extra" href="mailto:${esc(data.email)}">${esc(data.email)}</a>`:'';
 const website=data.website?`<a class="ws-v454-extra" href="${esc(data.website)}" target="_blank" rel="noopener noreferrer">Naš sajt ↗</a>`:'';
 const contact=`<section class="site-section ws-v454-contact" id="kontakt" aria-labelledby="ws-v454-contact-heading">
 <div class="kicker">KONTAKT</div><h2 id="ws-v454-contact-heading">Kontaktirajte nas</h2>
 <div class="ws-v454-contact-row">${mainContact}${mail}${website}</div>${retainedForm}</section>`;
 return places+contact;
}
/** Replaces only the three known old GENERIC contact wrappers. Never removes a
 * booking section, Booking IDs, or the inactive-service inquiry form. */
function removeLegacyContact(html){
 const match=/<section class="site-section contact(?: [^\"]*)?" id="kontakt">[\s\S]*?<\/section>/.exec(html);
 if(!match) return {html,retainedForm:''};
 const old=match[0];
 const inquiry=old.match(/<div class="service-contact-form">[\s\S]*?<\/form><\/div>/);
 // The non-booking service inquiry is pre-existing. Retain it, including its
 // original requestForm ID and JavaScript handlers, in the new final contact.
 return {html:html.replace(old,''),retainedForm:inquiry?.[0]||''};
}
export function renderSystemLayer(html,site){
 const data=site.businessData||{phone:site.contact?.phone||'',locations:[]};
 const isDemo=site.siteMode!=='production';
 const cleaned=removeLegacyContact(html);
 let result=cleaned.html;
 const locations=Array.isArray(data.locations)?data.locations:[];
 const unified=sections({...data,locations},site,cleaned.retainedForm);
 result=result.replace('</main>',unified+'</main>');
 if(locations.length)result=result.replace('<a href="#kontakt">Kontakt</a>','<a href="#lokacije">Lokacije</a><a href="#kontakt">Kontakt</a>');
 // The header call is independent of the final section; preserve the old
 // business-specific header CTA and avoid changing booking action targets.
 const direct=data.phone?`<a class="ws-header-call" href="${esc(tel(data.phone))}">${esc(callLabel(site.business.id))}</a>`:'';
 if(direct)result=result.replace('</header>',direct+'</header>');
 // Do not invent placeholder phone numbers when a legacy API omits business data.
 result=result.replace(/<p class="hint">(?:Unesite pravi telefon pre objavljivanja sajta\.|Telefon se dodaje pre objavljivanja sajta\.|Telefon nije unet — nema lažnog pozivnog dugmeta\.)<\/p>/g,'');
 const brand=site.demoBrand||demoBrandFromEnvironment();
 const badgeUrl=new URL(brand.url);
 badgeUrl.searchParams.set('source','demo-site');badgeUrl.searchParams.set('business',site.business.id);
 const badge=isDemo?`<a class="ws-demo-badge" data-system="demoBadge" href="${esc(badgeUrl.toString())}" target="_blank" rel="noopener noreferrer" aria-label="Kreirano uz ${esc(brand.label)}"><span class="ws-badge-intro">Kreirano uz</span><span class="ws-demo-label">${esc(brand.label)}</span></a>`:'';
 result=result.replace(/<span>(?:Demo sajt · Kreirano pomoću RMC Web Solutions|DEMO · RMC Web Solutions)<\/span>/gi,'');
 result=result.replace('</head>',contactCss+'<link rel="stylesheet" href="site-system.css"></head>');
 if(badge)result=result.replace('</header>','</header>'+badge);
 result=result.replace('</body>','<script src="site-system.js" defer></script></body>');
 return result;
}
