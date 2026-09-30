// NINA 22 — no dependencies. Build static HTML from data/*.json. Original Web Solutions unaffected.
import {readFileSync, writeFileSync, existsSync, rmSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=key=>JSON.parse(readFileSync(resolve(root,'data',key),'utf8'));
const site=read('site.json'),images=read('images.json'),theme=read('theme.json');
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const icon=id=>`<svg aria-hidden="true"><use href="#i-${esc(id)}"/></svg>`;
const img=key=>{let path=images[key];if(!path || !path.startsWith('assets/')) throw Error(`Missing image mapping ${key}`);if(!existsSync(resolve(root,path))) throw Error(`Image not found: ${path}`);return path;};
const features=site.features.map(f=>`<article class="feature-card shine-card"><span class="feature-icon">${icon(f.icon)}</span><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></article>`).join('');
const services=site.services.map(s=>`<button type="button" class="service-card shine-card" data-service-id="${esc(s.id)}" aria-label="Detalji o usluzi i slanje upita: ${esc(s.title)}"><span class="service-photo"><img loading="lazy" decoding="async" src="${esc(img(s.imageKey))}" alt="${esc(s.imageAlt||`Ilustrativni prikaz: ${s.title}`)}"></span><span class="service-body"><span class="service-icon">${icon(s.icon)}</span><span class="service-text"><strong>${esc(s.title)}</strong><small>${esc(s.text)}</small></span><span class="round-arrow">${icon('arrow')}</span></span></button>`).join('');
const gallery=site.gallery.items.map((g,i)=>{
  const actual=g.actual===true;
  const thumbnail=img(g.imageKey);
  const full=img(g.fullImageKey||g.imageKey);
  const label=actual?(g.label||g.caption):'Demo fotografija';
  const sublabel=actual?(g.sublabel||'Stvarna referenca'):'Ilustrativni prikaz · čeka se original';
  return `<div class="gallery-entry${actual?' gallery-entry--actual':''}">
    <button type="button" class="gallery-item image-frame" data-photo="${esc(full)}" data-caption="${esc(g.caption)}" data-actual="${actual}" aria-label="${esc(actual?'Pogledajte stvarnu fotografiju objekta '+g.caption:'Otvori ilustrativnu fotografiju '+(i+1))}">
      <img src="${esc(thumbnail)}" alt="${esc(g.alt||g.caption)}" loading="lazy" decoding="async"><span class="gallery-zoom">+</span>
    </button>
    <div class="gallery-caption"><strong>${esc(label)}</strong><small>${esc(sublabel)}</small></div>
  </div>`;
}).join('');
const deepPics=site.deepCleaning.imageKeys.map((k,i)=>`<div class="deep-pic image-frame deep-pic-${i+1}"><img src="${esc(img(k))}" alt="${esc(site.deepCleaning.imageAlts?.[i]||`Ilustrativni primer ${i+1} — čišćenje`)}" loading="lazy" decoding="async"></div>`).join('');
// True pre/after requires TWO original photos of the SAME piece from the SAME angle.
// Keep it hidden in the demo; never pretend generic stock photos are real results.
let beforeAfter='';
const ba=site.deepCleaning.beforeAfter||{};
if(ba.enabled){
  const before=img(ba.beforeImageKey),after=img(ba.afterImageKey);
  beforeAfter=`<div class="wrap ba-wrap"><div class="ba-heading"><div><p class="kicker">STVARNI REZULTATI</p><h3>${esc(ba.title||'Pre i posle čišćenja')}</h3></div><p>${esc(ba.caption||'')}</p></div><div class="before-after" style="--comparison:50%"><img class="ba-base" src="${esc(after)}" alt="${esc(ba.afterAlt||'Posle čišćenja')}" loading="lazy"><div class="ba-overlay"><img src="${esc(before)}" alt="${esc(ba.beforeAlt||'Pre čišćenja')}" loading="lazy"></div><span class="ba-tag ba-tag-before">PRE</span><span class="ba-tag ba-tag-after">POSLE</span><span class="ba-divider" aria-hidden="true"></span><input type="range" class="ba-slider" min="0" max="100" step="1" value="50" aria-label="Pomerite klizač za poređenje pre i posle čišćenja"></div></div>`;
}
let deepVideo='';
if (site.deepCleaning.videoEnabled){
  const vid=images.videoDeepCleaning;if(!vid||!existsSync(resolve(root,vid))) throw Error('Deep video enabled but not present.');
  deepVideo=`<button type="button" class="deep-video-link" data-open-video="deep">${icon('play')} ${esc(site.deepCleaning.videoTitle)}</button>`;
}
const contact=site.contact;
// SEO: demos must not be indexed. Enable only when Marina confirms her live domain + content.
const seo=site.seo;
const canonical=String(seo.productionUrl||'').trim();
const publish=seo.indexable===true;
if(publish&&!/^https:\/\/[a-z0-9.-]+(?:\:[0-9]+)?\/$/i.test(canonical))
  throw Error('Production SEO requires a VERIFIED absolute HTTPS productionUrl ending in /');
if(publish&&/(example|github\.io|retailmediacenter)/i.test(canonical))
  throw Error('Do not enable client SEO indexing on an example/showcase domain');
if(!existsSync(resolve(root,seo.ogImage)))throw Error('Social preview image missing');
const seoHead=publish?[
  `<link rel="canonical" href="${esc(canonical)}">`,
  `<meta property="og:url" content="${esc(canonical)}">`,
  `<meta property="og:image" content="${esc(canonical+seo.ogImage)}">`,
  `<meta property="og:image:alt" content="${esc(seo.imageAlt)}">`,
  `<meta name="twitter:image" content="${esc(canonical+seo.ogImage)}">`
].join('\n  '):'<!-- DEMO: canonical and absolute social image are enabled with the verified client domain. -->';
const jsonLD=publish?JSON.stringify({
  '@context':'https://schema.org',
  '@type':'ProfessionalService',
  '@id':canonical+'#business',
  name:site.brand.name,
  url:canonical,
  description:seo.description,
  image:canonical+seo.ogImage,
  telephone:contact.phoneE164,
  email:contact.email,
  areaServed:{'@type':'Place',name:seo.serviceArea},
  sameAs:[contact.instagram],
  hasOfferCatalog:{'@type':'OfferCatalog',name:'Usluge NINA 22',itemListElement:[...site.services.map(s=>({'@type':'OfferCatalog',name:s.title})),{'@type':'OfferCatalog',name:site.deepCleaning.title}]}
}).replaceAll('<','\\u003c'):'null';
const runtime=JSON.stringify({videos:{maintenance:img('videoMaintenance'),...(site.deepCleaning.videoEnabled?{deep:images.videoDeepCleaning}:{})},services:site.services.map(x=>({id:x.id,title:x.title,text:x.text,details:x.details,highlights:x.highlights||[],subject:x.subject||x.title,image:img(x.imageKey),imageAlt:x.imageAlt})),email:contact.email,isDemo:!publish}).replaceAll('<','\\u003c').replaceAll('&','\\u0026');
const replacements={
  META_TITLE:seo.title,META_DESCRIPTION:seo.description,DEMO_BADGE:publish?'':'<span class="hero-photo-tag">DEMO FOTOGRAFIJA</span>',GALLERY_NOTE:publish?'Objekti u našem portfoliju':'Dva stvarna objekta · ostale fotografije su demo prikazi',FOOTER_DEMO_NOTE:publish?'':'<span>DEMO · Prva referenca je stvarna; ostale fotografije su ilustrativne.</span>',ROBOTS:publish?'index, follow, max-image-preview:large':'noindex, follow',PRODUCTION_SEO_HEAD:seoHead,BUSINESS_JSON_LD:publish?`<script type="application/ld+json">${jsonLD}</script>`:'<!-- JSON-LD enabled only for approved production content. -->',LOGO:img('logo'),HERO_IMAGE:img('hero'),HERO_LINE_1:site.hero.line1,HERO_LINE_2:site.hero.line2,HERO_TEXT:site.hero.text,HERO_BUTTON_1:site.hero.button1,HERO_BUTTON_2:site.hero.button2,
  FEATURES_HTML:features,SERVICES_HTML:services,GALLERY_TITLE:site.gallery.title,GALLERY_HTML:gallery,
  VIDEO_TITLE:site.video.title,VIDEO_TEXT:site.video.text,VIDEO_BUTTON:site.video.button,VIDEO_POSTER:img('videoPoster'),LIGHTING_THUMB:img(site.work.lighting.thumbKey),LIGHTING_FULL:img(site.work.lighting.fullKey),LIGHTING_CAPTION:site.work.lighting.caption,
  DEEP_TITLE:site.deepCleaning.title,DEEP_SUBTITLE:site.deepCleaning.subtitle,DEEP_TEXT:site.deepCleaning.text,DEEP_BUTTON:site.deepCleaning.button,DEEP_IMAGES_HTML:deepPics,DEEP_VIDEO_HTML:deepVideo,BEFORE_AFTER_HTML:beforeAfter,
  ABOUT_TITLE:site.about.title,ABOUT_TEXT:site.about.text,ABOUT_PERSON:site.about.signature,ABOUT_ROLE:site.about.role,
  CONTACT_TITLE:contact.title,CONTACT_TEXT:contact.text,CONTACT_PHONE_E164:contact.phoneE164,CONTACT_PHONE_DISPLAY:contact.phoneDisplay,CONTACT_EMAIL:contact.email,CONTACT_LOCATION:contact.location,CONTACT_INSTAGRAM:contact.instagram,
  SUBJECT_OPTIONS:contact.subjects.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join(''),RUNTIME_JSON:runtime
};
const htmlParts=new Set(['FEATURES_HTML','SERVICES_HTML','GALLERY_HTML','DEEP_IMAGES_HTML','DEEP_VIDEO_HTML','BEFORE_AFTER_HTML','SUBJECT_OPTIONS','RUNTIME_JSON','PRODUCTION_SEO_HEAD','BUSINESS_JSON_LD','DEMO_BADGE','FOOTER_DEMO_NOTE']);
let template=readFileSync(resolve(root,'template.html'),'utf8');
const html=template.replace(/\{\{([A-Z_0-9]+)\}\}/g,(all,key)=>{if(!(key in replacements))throw Error(`Unknown token ${key}`);return htmlParts.has(key)?replacements[key]:esc(replacements[key]);});
if(/\{\{[A-Z_0-9]+\}\}/.test(html))throw Error('Unreplaced token');
writeFileSync(resolve(root,'index.html'),html);
const themeCSS=':root{\n'+Object.entries(theme).map(([k,v])=>{if(!/^#[a-f0-9]{6}$/i.test(v))throw Error(`Invalid color ${k}`);return `  --${k}:${v};`;}).join('\n')+'\n}\n';
writeFileSync(resolve(root,'assets/css/theme.css'),themeCSS);
if(publish){
  const stamp=new Date().toISOString().slice(0,10);
  writeFileSync(resolve(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(canonical)}</loc><lastmod>${stamp}</lastmod></url></urlset>\n`);
  writeFileSync(resolve(root,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${canonical}sitemap.xml\n`);
}else{
  rmSync(resolve(root,'sitemap.xml'),{force:true});
  writeFileSync(resolve(root,'robots.txt'),'User-agent: *\nAllow: /\n# DEMO pages have their own noindex meta tag.\n');
}
console.log(`NINA 22 V3 — BUILD OK (${publish?'PRODUCTION SEO':'DEMO noindex'}).`);
