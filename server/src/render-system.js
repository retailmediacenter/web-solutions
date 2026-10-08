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
.ws-editor-section{clear:both;max-width:1280px;margin:0 auto;padding:clamp(30px,5vw,72px) clamp(20px,4vw,64px);background:var(--section-bg,#f8fafc);color:var(--ink,#17263c);font-family:var(--body-font,Arial,sans-serif)}.ws-editor-section h2{font:750 clamp(24px,3vw,38px)/1.25 var(--display-font,Arial,sans-serif);margin:10px 0 14px}.ws-editor-section p{max-width:760px;line-height:1.65}.ws-editor-section .primary{display:inline-flex;margin-top:10px}
.ws-editor-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;max-width:760px;margin-top:24px}.ws-editor-form label{display:grid;gap:7px;font-weight:700}.ws-editor-form input,.ws-editor-form textarea,.ws-editor-form select{padding:12px;border:1px solid #cad5e2;border-radius:8px;font:inherit;background:#fff}.ws-editor-form .wide{grid-column:1/-1}.ws-editor-form .check{display:flex;align-items:center;gap:8px}.ws-editor-form .form-status{grid-column:1/-1;margin:0;color:#27645d;font-weight:700}
@media(max-width:690px){.ws-v454-contact{padding:32px 17px}.ws-v454-contact .ws-v454-phone{width:100%;text-align:center}}
</style>`;
function locationCard(x,idx){
 const address=[x.address,x.city].filter(Boolean).join(', ');
 return `<article class="ws-place"><h3>${esc(x.label||('Lokacija '+(idx+1)))}</h3><p class="ws-place-address">${esc(address)}</p>
 ${x.hours?`<p class="ws-place-hours">Radno vreme: ${esc(x.hours)}</p>`:''}</article>`;
}
function creatorField(field){const required=field.required?' required':'';const placeholder=field.placeholder?` placeholder="${esc(field.placeholder)}"`:'';if(field.type==='textarea')return `<label class="wide">${esc(field.label)}<textarea name="${esc(field.id)}" rows="4" maxlength="1000"${placeholder}${required}></textarea></label>`;if(field.type==='select')return `<label>${esc(field.label)}<select name="${esc(field.id)}"${required}><option value="">Izaberite</option>${field.options.map(option=>`<option value="${esc(option)}">${esc(option)}</option>`).join('')}</select></label>`;if(field.type==='checkbox')return `<label class="wide check"><input type="checkbox" name="${esc(field.id)}" value="Da"${required}> ${esc(field.label)}</label>`;return `<label${field.type==='text'||field.type==='email'||field.type==='tel'||field.type==='date'||field.type==='number'?'':' class="wide"'}>${esc(field.label)}<input name="${esc(field.id)}" type="${esc(field.type)}" maxlength="${field.type==='number'?'12':'180'}"${placeholder}${required}></label>`;}
function creatorForm(entry){const form=entry.form||{};return `<form class="ws-editor-form" data-rmc-creator-form data-recipient="${esc(form.recipient)}" data-title="${esc(entry.title)}" data-success="${esc(form.successMessage)}">${form.fields.map(creatorField).join('')}<button class="primary wide" type="submit">${esc(form.submitLabel)}</button><p class="form-status" aria-live="polite"></p></form>`;}
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
 const editor=site.editorModules||{},contactCopy=editor.contact||{},custom=Array.isArray(editor.customSections)?editor.customSections:[];
 const customSections=custom.map((entry,index)=>`<section class="site-section ws-editor-section" id="${esc(entry.id||`custom-${index+1}`)}"><div class="kicker">${esc(entry.kicker||'VIŠE INFORMACIJA')}</div><h2>${esc(entry.title)}</h2>${entry.body?`<p>${esc(entry.body)}</p>`:''}${entry.type==='form'?creatorForm(entry):entry.linkLabel&&entry.linkHref?`<a class="primary" href="${esc(entry.linkHref)}"${/^https:/i.test(entry.linkHref)?' target="_blank" rel="noopener noreferrer"':''}>${esc(entry.linkLabel)}</a>`:''}</section>`).join('');
 const structured=editor.structured||{},active=new Set(site.modulePlan?.active||[]);
 const cards=(id,heading,rows,kind='cards')=>!active.has(id)||!rows?.length?'':`<section class="site-section ws-editor-section ws-structured ${esc(kind)}" id="${esc(id)}"><div class="kicker">${esc(heading)}</div><h2>${esc(heading)}</h2><div class="ws-structured-grid">${rows.map(row=>`<article><h3>${esc(row.title)}</h3>${row.label?`<strong>${esc(row.label)}</strong>`:''}${row.rating?`<p aria-label="Ocena ${esc(row.rating)} od 5">${'★'.repeat(row.rating)}${'☆'.repeat(5-row.rating)}</p>`:''}${row.body?`<p>${esc(row.body)}</p>`:''}${row.linkLabel&&row.linkHref?`<a class="primary" href="${esc(row.linkHref)}">${esc(row.linkLabel)}</a>`:''}</article>`).join('')}</div></section>`;
 const portfolio=cards('portfolio','Portfolio',structured.portfolio,'portfolio');
 const trust=cards('trust','Zašto nam veruju',structured.trust,'trust');
 const reviews=cards('reviews','Utisci klijenata',structured.reviews,'reviews');
 const faq=!active.has('faq')||!structured.faq?.length?'':`<section class="site-section ws-editor-section ws-structured faq" id="faq"><div class="kicker">FAQ</div><h2>Česta pitanja</h2>${structured.faq.map(row=>`<details><summary>${esc(row.title)}</summary><p>${esc(row.body)}</p></details>`).join('')}</section>`;
 const booking=!active.has('booking')?'':`<section class="site-section ws-editor-section ws-structured booking" id="zakazivanje"><div class="kicker">${esc(structured.booking?.kicker||'ZAKAZIVANJE')}</div><h2>${esc(structured.booking?.title||'Zakažite termin')}</h2><p>${esc(structured.booking?.body||'')}</p>${structured.booking?.linkLabel&&structured.booking?.linkHref?`<a class="primary" href="${esc(structured.booking.linkHref)}">${esc(structured.booking.linkLabel)}</a>`:''}</section>`; const contact=`<section class="site-section ws-v454-contact" id="kontakt" aria-labelledby="ws-v454-contact-heading">
 <div class="kicker">${esc(contactCopy.kicker||'KONTAKT')}</div><h2 id="ws-v454-contact-heading">${esc(contactCopy.title||'Kontaktirajte nas')}</h2>${contactCopy.description?`<p>${esc(contactCopy.description)}</p>`:''}
 <div class="ws-v454-contact-row">${mainContact}${mail}${website}</div>${retainedForm}</section>`;
 return places+portfolio+trust+reviews+faq+booking+customSections+contact;
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
 result=result.replace('</body>','<script src="site-system.js" defer></script><script>document.addEventListener("submit",function(e){const f=e.target.closest("[data-rmc-creator-form]");if(!f)return;e.preventDefault();if(!f.reportValidity())return;const lines=[f.dataset.title,"",...Array.from(new FormData(f).entries()).map(x=>x[0]+": "+x[1])];const status=f.querySelector(".form-status");status.textContent=f.dataset.success;location.href="mailto:"+encodeURIComponent(f.dataset.recipient)+"?subject="+encodeURIComponent(f.dataset.title)+"&body="+encodeURIComponent(lines.join("\\n"));});</script></body>');
 return result;
}
