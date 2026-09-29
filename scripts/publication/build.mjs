/**
 * RMC: generate two deployable GitHub Pages roots from the CURRENT private repo.
 * Pure static output, no persistent owner pairing and no API calls that mint codes.
 * CLI: node scripts/publication/build.mjs [--audit] [--skip-tests] [--out=ABSOLUTE_PATH]
 * --audit validates all 9 business fixtures without writing/publishing files.
 */
import {existsSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,renameSync,readdirSync,cpSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {inflateRawSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {renderHtml} from '../../server/src/render-site.js';
import {exportSiteZip} from '../../server/src/exporter.js';
import {scenarios,categories,buildQaPayload} from './scenarios.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const client=path.join(repo,'client');
const args=process.argv.slice(2),audit=args.includes('--audit'),skipTests=args.includes('--skip-tests');
const outputOpt=args.find(s=>s.startsWith('--out='));
const out=outputOpt?path.resolve(outputOpt.slice(6)):path.join(path.dirname(repo),'RMC_PUBLICATION_OUT');
const pub=path.join(out,'web-solutions-public'),preview=path.join(out,'web-solutions-preview');
const assetPrefix='assets/images/curated/';
const publicBase=process.env.RMC_PUBLIC_BASE_PATH||'/web-solutions-public/';
const apiBase=process.env.RMC_PUBLIC_API_URL||'https://rmc-web-solutions-api-staging.onrender.com';
const liveNames=(process.env.RMC_QA_LIVE_SLUGS||'').split(',').map(x=>x.trim()).filter(Boolean);
// An explicit operator-only "all" enables all nine test sites for a controlled QA run.
const liveQa=new Set(liveNames.length===1&&liveNames[0]==='all'?scenarios.map(s=>s.slug):liveNames);
function assertPublicConfig(){
 assert(/^\/[a-zA-Z0-9/_-]*\/$/.test(publicBase),`Neispravan RMC_PUBLIC_BASE_PATH: ${publicBase}`);
 const parsed=new URL(apiBase);
 assert(parsed.protocol==='https:'&&parsed.origin===apiBase,`RMC_PUBLIC_API_URL mora biti HTTPS origin bez putanje i bez završne kose crte: ${apiBase}`);
}
const fileExists=r=>existsSync(path.join(client,'public',r));
const assert=(ok,message)=>{if(!ok)throw Error(message)};
assertPublicConfig();
// V46: nine fixed QA IDs, with either Booking, Commerce, or both.
// No site becomes live without the explicit RMC_QA_LIVE_SLUGS operator flag.
const permittedLiveQa=new Set(['minimarket','butik','auto-servis','vodoinstalater',
 'vinoteka','mesara','frizer','restoran','konsultant']);
assert([...liveQa].every(slug=>permittedLiveQa.has(slug)),
 'Nepoznat QA scenario u RMC_QA_LIVE_SLUGS.');
if(liveQa.size)assert(apiBase==='https://rmc-web-solutions-api-staging.onrender.com'||apiBase.startsWith('http://localhost:'),
 'QA Booking transport sme se usmeriti samo na staging ili lokalni API.');
const status=s=>console.log('\n[RMC] '+s);
function htmlEscape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function command(name,command,args,options={}){
 status(name);
 // Node 22 on Windows cannot spawn .cmd/.bat directly with shell:false.
 // Prefer the installed npm JS entrypoint; keep a cmd.exe fallback for custom installs.
 if(process.platform==='win32' && /^npm(?:\.cmd)?$/i.test(command)){
  const candidates=[process.env.npm_execpath,
   path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js'),
   path.resolve(path.dirname(process.execPath),'..','node_modules','npm','bin','npm-cli.js')];
  const npmCli=candidates.find(p=>p&&/npm-cli\.js$/i.test(p)&&existsSync(p));
  if(npmCli){command=process.execPath;args=[npmCli,...args];}
  else{command=process.env.ComSpec||'cmd.exe';args=['/d','/s','/c',`npm ${args.join(' ')}`];}
 }
 const result=spawnSync(command,args,{cwd:repo,stdio:'inherit',shell:false,...options});
 if(result.error)throw Error(`${name}: ${result.error.message}`);
 assert(result.status===0,`${name}: exit code ${result.status}`);
}
function auditCode(repoDir){
 const must=[ 'package.json','client/src/main.jsx','client/src/landing-react.jsx','client/public/demo-previews/salon/index.html','server/src/site.js','server/src/exporter.js','server/src/booking-queue.js'];
 for(const p of must)assert(existsSync(path.join(repoDir,p)),`Nedostaje aktuelni fajl ${p}`);
 const landing=readFileSync(path.join(repoDir,'client/src/landing-react.jsx'),'utf8');
 assert(landing.includes('demo-previews/')&&landing.includes('src={sampleBase+staticDemo.demoPath'),
 'STOP: Nije potvrđen nezavisni iframe za šest marketing DEMO sajtova. Prvo primenite poslednju DEMO ispravku.');
 const booking=readFileSync(path.join(repoDir,'client/public/booking-runtime.js'),'utf8');
 assert(booking.includes('DEMONSTRACIONI')||booking.includes("setApiState('preview')"),
 'STOP: Lokalni booking-runtime ne garantuje demonstracioni režim bez pairing-a.');
}
function scenarioPayload(s){
 const p=buildQaPayload(s);
 const cap=p.siteConfig.capabilities,b=cap.booking;
 assert(Boolean(cap.commerce)===s.expect.commerce,`${s.slug}: Commerce capability mismatch`);
 assert(Boolean(b?.enabled)===s.expect.booking,`${s.slug}: Booking capability mismatch`);
 if(s.expect.timingMode)assert(b.timingMode===s.expect.timingMode,`${s.slug}: Booking timing mode mismatch`);
 if(s.expect.wineTastings)assert(cap.wineTastings===true,`${s.slug}: Degustacije nisu uključene`);
 if(s.expect.butcherGrillService)assert(cap.butcherGrillService===true,`${s.slug}: Nema posebne pripreme mesa`);
 assert(p.siteConfig.siteMode==='demo',`${s.slug}: Preview mora biti DEMO`);
 assert(!p.siteConfig.bookingTransport&&!p.siteConfig.bookingPairing,`${s.slug}: Nije dozvoljen vlasnički transport u javnom Preview-u`);
 const html=renderHtml(p);
 assert(html.includes('<!doctype html>')||html.includes('<!DOCTYPE html>'),`${s.slug}: HTML renderer nije vratio dokument`);
 if(s.expect.booking)assert(html.includes('booking'),`${s.slug}: Booking forma nije generisana`);
 const imageFields=[p.catalog?.hero,p.catalog?.tastingImage,
  ...(p.catalog?.services||p.catalog?.cards||p.catalog?.products||[]).map(x=>x.image),
  ...(p.secondary?.products||p.secondary?.services||[]).map(x=>x.image),p.secondary?.hero].filter(Boolean);
 const images=[...new Set(imageFields)];
 images.forEach(i=>assert(i.startsWith(assetPrefix)&&!i.includes('..'),`${s.slug}: Neispravna putanja slike`));
 return {p,html,images};
}
function listFiles(dir,prefix=''){
 return readdirSync(dir,{withFileTypes:true}).flatMap(f=>{const rel=prefix?prefix+'/'+f.name:f.name,full=path.join(dir,f.name);
 return f.isDirectory()?listFiles(full,rel):[rel];});
}
function scanSafe(root){
 for(const rel of listFiles(root)){
  const seg=rel.split('/');
  assert(!seg.some(x=>/^\.env(?:\.|$)/i.test(x)||/^(?:server|node_modules|v395|\.git)$/i.test(x)),`ZABRANJEN privatni folder/fajl u public artefaktu: ${rel}`);
  assert(!/(?:booking[_-]?uparivanje|private[_-]?key|access[_-]?token|redis|\.pem$|\.key$|\.ps1$|\.bat$|\.zip$|\.mjs$|\.map$)/i.test(path.basename(rel)),
    `ZABRANJEN fajl u public artefaktu: ${rel}`);
  assert(/\.(?:html|js|css|jpg|jpeg|png|svg|webp|woff2?|ico|json|txt|webmanifest)$/i.test(rel)||rel==='.nojekyll',
    `Nepoznat tip datoteke u public artefaktu: ${rel}`);
  if(/\.(?:json|html|js|txt)$/i.test(rel)){
    const text=readFileSync(path.join(root,rel),'utf8');
    assert(!/(?:UPSTASH_REDIS_REST_TOKEN|VAPID_PRIVATE_KEY|PUBLIC_DEPLOY_TOKEN)\s*[=:]\s*['"][^'"]+['"]/i.test(text),`Poverljiva vrednost u artefaktu: ${rel}`);
  }
 }
}
function extractZip(buffer,target){
 let pos=0,n=0;const written=[];
 while(pos<buffer.length){
  const sig=buffer.readUInt32LE(pos);if(sig===0x02014b50||sig===0x06054b50)break;
  assert(sig===0x04034b50,'Exporter nije vratio očekivani ZIP format.');
  const flags=buffer.readUInt16LE(pos+6),method=buffer.readUInt16LE(pos+8);
  const comp=buffer.readUInt32LE(pos+18),raw=buffer.readUInt32LE(pos+22),nameLen=buffer.readUInt16LE(pos+26),extra=buffer.readUInt16LE(pos+28);
  assert(!(flags&8)&&[0,8].includes(method),'ZIP format nije podržan za javnu objavu');
  const name=buffer.subarray(pos+30,pos+30+nameLen).toString('utf8');
  assert(name&&!name.startsWith('/')&&!name.includes('\\')&&!name.includes('..')&&!name.endsWith('/')&&name.split('/').every(Boolean),`Zabranjena ZIP putanja: ${name}`);
  assert(name!=='BOOKING_UPARIVANJE.txt'&&!name.toLowerCase().includes('pairing'),`STOP: vlasnički kod u exportu: ${name}`);
  const from=pos+30+nameLen+extra;
  assert(from+comp<=buffer.length,'ZIP je nepotpun');
  // The all-in-one iPhone HTML is delivered inside customer ZIPs only.
  // Public QA uses the standard index.html and individual assets; do not
  // unpack or publish this optional large file in the nine QA exports.
  // Still validate its declared size and actual HTML before skipping it.
  if(name==='PREGLED_NA_TELEFONU.html'){
    const previewLimit=32*1024*1024;
    assert(raw>0&&raw<=previewLimit&&comp>0&&comp<=previewLimit,
      'Offline preview size exceeds QA audit limit');
    const previewChunk=buffer.subarray(from,from+comp);
    const previewHtml=method===8
      ?inflateRawSync(previewChunk,{maxOutputLength:previewLimit}):previewChunk;
    assert(previewHtml.length===raw&&/^\s*<!doctype\s+html/i.test(previewHtml.subarray(0,256).toString('utf8')),
      'Offline preview is not a valid HTML ZIP entry');
    pos=from+comp;n++;
    assert(n<=70,'Previše fajlova u exportu');
    continue;
  }
  const chunk=buffer.subarray(from,from+comp),data=method===8?inflateRawSync(chunk):chunk;
  assert(data.length===raw&&data.length<=5*1024*1024,'ZIP sadržaj je neispravan/prevelik');
  const full=path.join(target,...name.split('/'));
  assert(full.startsWith(path.resolve(target)+path.sep),'ZIP pokušava izlaz van foldera');
  mkdirSync(path.dirname(full),{recursive:true});writeFileSync(full,data);
  written.push(name);pos=from+comp;n++;
  assert(n<=70,'Previše fajlova u exportu');
 }
 assert(written.includes('index.html')&&written.includes('site.css'),'Nedostaje kompletan statički izvoz.');
 return written;
}
function previewIndex(manifest){
 // The 9 site previews are public, but the existing page only displays the
 // secure QA login when the administrator elects to enter their secret.
 const cards=categories.map(g=>{const entries=manifest.scenarios.filter(e=>e.category===g.id);
 return `<section aria-labelledby="${g.id}"><div class="section-head"><h2 id="${g.id}">${htmlEscape(g.title)}</h2><p>${htmlEscape(g.description)}</p></div><div class="cards">${entries.map(e=>`<article class="card"><a class="card-link" href="sites/${e.slug}/index.html" target="_blank" rel="noopener noreferrer"><div class="image" style="background-image:url('sites/${e.slug}/${htmlEscape(e.hero)}')"></div><div class="content"><span>${htmlEscape(e.businessId)} · SITE ID <code>${htmlEscape(e.siteId)}</code></span><h3>${htmlEscape(e.label)}</h3><p>${htmlEscape(e.featureLabel)}</p><b>Otvori sajt ↗</b></div></a><div class="qa-controls" data-slug="${htmlEscape(e.slug)}" data-site-id="${htmlEscape(e.siteId)}">${e.qaLive?`<button class="qa-issue" type="button" disabled>Generiši kod</button><div class="qa-result" hidden><code class="qa-code"></code> <span class="qa-expiry"></span><div class="qa-actions"><button class="qa-copy" type="button">Kopiraj</button><a class="qa-portal" target="_blank" rel="noopener noreferrer">Otvori Portal ↗</a></div></div>`:`<span class="qa-pending">${e.capabilities.booking&&e.capabilities.commerce?'Booking i Commerce još nisu aktivirani':e.capabilities.booking?'Booking još nije aktiviran':'Commerce još nije aktiviran'}</span>`}</div></article>`).join('')}</div></section>`;
 }).join('');
 const apiOrigin=htmlEscape(manifest.stagingApiOrigin);
 return `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; connect-src 'self' ${apiOrigin}; img-src 'self'; style-src 'unsafe-inline' 'self'; base-uri 'none'; object-src 'none'; form-action 'none'"><title>RMC — 9 razvojnih scenarija</title><link rel="stylesheet" href="qa-console.css"><style>
:root{font-family:system-ui,Arial,sans-serif;color-scheme:dark;color:#f7f8fb;background:#101728}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 10% 0%,#263b5d 0%,#101728 52%);line-height:1.45}main{width:min(1200px,92vw);margin:auto;padding:30px 0 64px}header{border-bottom:1px solid #ffffff21;padding:22px 4vw;display:flex;justify-content:space-between;gap:16px;align-items:center}header a{color:#d8e8ff;text-decoration:none}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.12;margin:12px 0}.intro{color:#cbd7e8;max-width:870px}.top{background:#ffffff12;border:1px solid #ffffff20;border-radius:20px;padding:28px;margin:22px 0 46px}.note{font-size:.95rem;color:#e5ddac}.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:15px;flex-wrap:wrap}.section-head h2{margin-bottom:5px}.section-head p{color:#b8cce3;margin:0}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin:20px 0 52px}.card{min-width:0;color:inherit;border:1px solid #ffffff27;border-radius:18px;background:#ffffff0b;overflow:hidden;transition:transform .18s,background .18s}.card:hover,.card:focus-within{transform:translateY(-3px);background:#ffffff19}.image{height:185px;background-color:#253755;background-position:center;background-size:cover}.content{padding:20px}.content span{font-size:.78rem;letter-spacing:.04em;color:#9ec9f0}.content h3{font-size:1.5rem;margin:8px 0}.content p{color:#ced8e6;min-height:48px}.content b{color:#bcdcff;font-size:.93rem}footer{color:#bcc8d9;border-top:1px solid #ffffff27;padding-top:24px;font-size:.86rem}
</style></head><body data-api-origin="${apiOrigin}"><header><strong>RMC / WEB SOLUTIONS — QA</strong><a href="https://retailmediacenter.github.io/web-solutions-public/" target="_blank" rel="noopener noreferrer">Glavni Web Solutions ↗</a></header><main><div class="top"><p class="note">RAZVOJNO OKRUŽENJE • ${manifest.qaLive?'STAGING QA':'DEMONSTRACIJA'}</p><h1>Devet sajtova. Jedan sistem.</h1><p class="intro">SITE ID ostaje isti. Kod izdaješ ovde, kada je scenario aktivan.</p><p class="intro"><small>Izvor: ${htmlEscape(manifest.sourceCommit)} · ${htmlEscape(manifest.generatedAt)}</small></p><div class="qa-access" id="qa-access"><form id="qa-login"><label for="qa-password">QA pristup</label><input id="qa-password" type="password" autocomplete="off" placeholder="Administratorski ključ" required><button type="submit" id="qa-login-button">Otključaj</button></form><div id="qa-active" hidden><strong>QA je otključan</strong><button id="qa-logout" type="button">Odjavi</button></div><p id="qa-status" role="status" aria-live="polite"></p></div></div>${cards}<footer><a style="color:#bcdcff" href="manifest.json">Manifest generisanja ↗</a></footer></main><script defer src="qa-console.js"></script></body></html>`;
}
function writeQaConsole(dir,manifest){
 mkdirSync(dir,{recursive:true});
 writeFileSync(path.join(dir,'index.html'),previewIndex(manifest));
 for(const file of ['qa-console.js','qa-console.css'])cpSync(path.join(repo,'scripts','publication',file),path.join(dir,file));
 const html=readFileSync(path.join(dir,'index.html'),'utf8');
 assert(html.includes('qa-console.js')&&html.includes('id="qa-login"'),'STOP: QA ekran nedostaje');
 assert(!/RMC_QA_ADMIN_KEY|pairingCode\s*:/.test(html),'STOP: QA tajna u javnom HTML-u');
}

function featureLabel(p){
 const c=p.siteConfig.capabilities,b=c.booking;
 return [c.commerce?'Korpa i priprema porudžbine':null,
  c.wineTastings?'Degustacije — datum i vreme':null,
  c.butcherGrillService?'Posebna priprema mesa':null,
  b?.enabled&&!c.wineTastings?(b.timingMode==='DAY_PART'?'Zahtev — izbor dela dana':'Zahtev — datum i vreme'):null]
  .filter(Boolean).join(' · ');
}
function gitInfo(){
 let sha='local-snapshot',dirty=true;
 try{sha=execFileSync('git',['rev-parse','--short=12','HEAD'],{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  dirty=Boolean(execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim());
 }catch{}
 return {sha,dirty};
}
function clearPreparedTarget(){
 // Never rm an arbitrary directory: output root is protected with a marker.
 if(existsSync(out)&&!existsSync(path.join(out,'.rmc-publication-output')))
   throw Error(`STOP: Output lokacija već postoji i nije RMC build folder: ${out}`);
 mkdirSync(out,{recursive:true});
 writeFileSync(path.join(out,'.rmc-publication-output'),'RMC PUBLICATION OUTPUT\n');
 const temp=path.join(out,'.staging-build');
 rmSync(temp,{recursive:true,force:true});mkdirSync(temp,{recursive:true});
 return temp;
}
function requiredMarketing(){
 const file=path.join(repo,'scripts/publication/demo-required-assets.txt');
 const assets=readFileSync(file,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 assert(assets.length===47,'Marketinški DEMO manifest mora sadržati 47 putanja');
 for(const p of assets)assert(p.startsWith(assetPrefix)&&!p.includes('..'),`Neispravna putanja DEMO slike: ${p}`);
 return assets;
}
function auditAssets(scenariosReady,marketing){
 const refs=[...new Set([...scenariosReady.flatMap(x=>x.images),...marketing])];
 const broken=[];
 for(const rel of refs){
  const full=path.join(client,'public',rel);
  if(!existsSync(full)){broken.push(rel+' [NE POSTOJI]');continue;}
  const info=statSync(full);
  if(info.size<1024||info.size>5*1024*1024){broken.push(rel+' [NEISPRAVNA VELIČINA]');continue;}
  const bytes=readFileSync(full);
  if(bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff)broken.push(rel+' [NIJE VALIDAN JPEG]');
 }
 status(`Zahtevane fotografije: ${refs.length}; nedostaje ili je oštećeno: ${broken.length}.`);
 if(broken.length)console.error('PROBLEM SA FOTOGRAFIJAMA:\n'+broken.map(x=>'  '+x).join('\n'));
 return broken;
}
function checkPreviewExport(temp,ready){
 const manifest=[];
 for(const {s,p} of ready){
  // Stable QA site ID is public; no owner code or bearer token is generated here.
  const live=liveQa.has(s.slug);
  const bookingLive=live&&s.expect.booking,commerceLive=live&&s.expect.commerce;
  if(bookingLive){
   assert(p.siteConfig.bookingProfile?.services?.length&&p.siteConfig.capabilities.booking.enabled,
    `${s.slug}: QA Booking nema potpun profil`);
   p.siteConfig.bookingTransport={siteId:s.siteId,apiBaseUrl:apiBase};
  }
  if(commerceLive){
   assert(p.siteConfig.siteProfile?.commerce?.enabled&&p.siteConfig.siteProfile?.commerce?.products?.length,
    `${s.slug}: QA Commerce nema potpun katalog`);
   p.siteConfig.commerceTransport={siteId:s.siteId,apiBaseUrl:apiBase};
  }
  const archive=exportSiteZip(p);
  const target=path.join(temp,'web-solutions-preview','sites',s.slug);
  mkdirSync(target,{recursive:true});
  const fileList=extractZip(archive,target);
  assert(!fileList.includes('BOOKING_UPARIVANJE.txt'),`${s.slug}: kod u javnom ZIP-u`);
  const indexPath=path.join(target,'index.html');
  const site=readFileSync(indexPath,'utf8');
  assert(Boolean(/"bookingTransport"\s*:\s*\{/.test(site))===bookingLive,
   `${s.slug}: pogrešan Booking transport / javni QA status`);
  assert(Boolean(/"commerceTransport"\s*:\s*\{/.test(site))===commerceLive,
   `${s.slug}: pogrešan Commerce transport / javni QA status`);
  const badge=`<div class="rmc-qa-bar"><strong>RMC QA: ${htmlEscape(s.label)}</strong>`+
   `<span>SITE ID: <code>${htmlEscape(s.siteId)}</code></span>`+
   `<span>${live?'STAGING '+[bookingLive?'BOOKING':null,commerceLive?'COMMERCE':null].filter(Boolean).join(' + ')+' — moguće uparivanje':'DEMO — bez stvarnog slanja'}</span></div>`;
  const css='<style>.rmc-qa-bar{box-sizing:border-box;display:flex;flex-wrap:wrap;gap:8px 16px;'+
   'align-items:center;justify-content:center;padding:8px 12px;background:#131f32;color:#fff;'+
   'font:600 12px/1.4 system-ui,sans-serif;position:relative;z-index:1000}.rmc-qa-bar code{'+
   'font:600 11px/1.3 ui-monospace,monospace;color:#f6cf70;word-break:break-all}</style>';
  assert(/<body(?:\s[^>]*)?>/i.test(site)&&site.includes('</head>'),`${s.slug}: nema HTML QA insertion point`);
  writeFileSync(indexPath,site.replace('</head>',css+'</head>')
   .replace(/<body([^>]*)>/i,`<body$1>${badge}`));
  if(bookingLive)assert(fileList.includes('booking-submit.js'),`${s.slug}: nedostaje Booking pošiljalac`);
  if(commerceLive)assert(fileList.includes('commerce-submit.js'),`${s.slug}: nedostaje Commerce pošiljalac`);
  if(!bookingLive)assert(!fileList.includes('booking-submit.js'),`${s.slug}: nedozvoljen Booking pošiljalac`);
  if(!commerceLive)assert(!fileList.includes('commerce-submit.js'),`${s.slug}: nedozvoljen Commerce pošiljalac`);
  const hero=p.catalog.hero;
  assert(existsSync(path.join(target,hero)),`${s.slug}: hero slika nedostaje u ZIP-u`);
  const b=p.siteConfig.capabilities.booking;
  manifest.push({slug:s.slug,label:s.label,category:s.category,businessId:s.businessId,
    modules:p.siteConfig.modules,features:featureLabel(p),featureLabel:featureLabel(p),hero,
    capabilities:{commerce:Boolean(p.siteConfig.capabilities.commerce),
      booking:Boolean(b?.enabled),timingMode:b?.timingMode||null,
      wineTastings:Boolean(p.siteConfig.capabilities.wineTastings),butcherGrillService:Boolean(p.siteConfig.capabilities.butcherGrillService)},
    files:fileList.length,siteId:s.siteId,qaLive:live,bookingLive,commerceLive,paired:false});
  console.log(`[RMC] Export ${s.slug}: ${fileList.length} fajlova; ${featureLabel(p)}.`);
 }
 return manifest;
}
async function main(){
 auditCode(repo);
 assert(scenarios.length===9&&new Set(scenarios.map(x=>x.slug)).size===9,'Mora postojati tačno 9 različitih scenarija');
 assert(scenarios.every(x=>/^[A-Za-z0-9_-]{24}$/.test(x.siteId))&&new Set(scenarios.map(x=>x.siteId)).size===9,
  'Svaki od 9 QA scenarija mora imati stabilan JEDINSTVEN SITE ID');
 const ready=scenarios.map(s=>({s,...scenarioPayload(s)}));
 status('9/9 stvarnih Node/Advisor konfiguracija i renderer: OK');
 if(audit){
  const missing=auditAssets(ready,requiredMarketing());
  if(missing.length){status('Funkcionalni audit 9/9 prošao; ali pravi ZIP izvoz je blokiran oštećenim/nedostajućim fotografijama.');process.exitCode=2;return;}
  // Audit exports all NINE REAL ZIPs even when Vite/npm is not installed. All
  // output is temporary and removed; it cannot accidentally publish anything.
  const scratch=mkdtempSync(path.join(tmpdir(),'rmc-publication-audit-'));
  try{const entries=checkPreviewExport(scratch,ready);
    writeQaConsole(path.join(scratch,'web-solutions-preview'),{scenarios:entries,stagingApiOrigin:apiBase,qaLive:entries.some(e=>e.qaLive),bookingLive:entries.some(e=>e.bookingLive),sourceCommit:'audit',generatedAt:'audit'});
    scanSafe(path.join(scratch,'web-solutions-preview'));
    assert(entries.length===9,'Nije generisano svih 9 stvarnih ZIP-ova.');
    status('AUDIT PASS: 9/9 pravih Node ZIP-ova, stvarne fotografije i sigurnosna provera.');
  }finally{rmSync(scratch,{recursive:true,force:true});}
  return;
 }
 const missing=auditAssets(ready,requiredMarketing());
 assert(!missing.length,'STOP: ne objavljujem nepotpune sajtove. Fotografije proverite u svom postojećem projektu.');
 if(!skipTests)command('Postojeći Node regresioni testovi',process.platform==='win32'?'npm.cmd':'npm',['test']);
 const staged=clearPreparedTarget();
 try{
  status('Build javnog React Indexa sa BASE_URL='+publicBase);
  command('Vite build',process.platform==='win32'?'npm.cmd':'npm',['run','build','-w','client'],
   {env:{...process.env,VITE_BASE_PATH:publicBase,VITE_API_BASE_URL:apiBase}});
  const built=path.join(client,'dist'),dst=path.join(staged,'web-solutions-public');
  assert(existsSync(path.join(built,'index.html')),'Vite nije napravio index.html');
  mkdirSync(path.dirname(dst),{recursive:true});
  // An older local client/public/v395 directory can still exist for reference.
  // Vite copies public/ unconditionally: strip this legacy directory from
  // the GENERATED DIST only; never modify the user's actual source assets.
  if(existsSync(path.join(built,'v395'))){
   status('Uklanjam stari v395 iz javnog DIST-a (lokalni izvor ostaje netaknut).');
   rmSync(path.join(built,'v395'),{recursive:true,force:true});
  }
  assert(!existsSync(path.join(built,'v395')),'STOP: Legacy V39.5 JS je u javnom buildu');
  // Render uses _redirects for SPA fallback; GitHub Pages ignores it.
  // Remove it ONLY from generated Vite dist, keeping staging source unchanged.
  const renderRedirects=path.join(built,'_redirects');
  if(existsSync(renderRedirects)){
   status('Uklanjam Render-only _redirects iz GitHub Pages artefakta (izvor se ne menja).');
   rmSync(renderRedirects,{force:true});
  }
  for(const slug of ['salon','pizzeria','vinoteka','namestaj','optika','auto-service']){
    assert(existsSync(path.join(built,'demo-previews',slug,'index.html')),`Fali marketing DEMO: ${slug}`);
  }
  for(const file of requiredMarketing())assert(existsSync(path.join(built,file)),`Fali marketing fotografija u DIST: ${file}`);
  const index=readFileSync(path.join(built,'index.html'),'utf8');
  assert(index.includes(publicBase+'assets/'),'Vite je objavljen sa pogrešnim BASE_PATH');
  cpSync(built,dst,{recursive:true});
  writeFileSync(path.join(dst,'.nojekyll'),'');
  writeFileSync(path.join(dst,'robots.txt'),'User-agent: *\nAllow: /\n');
  status('Izvoz svih devet kompletnih statičkih ZIP-ova iz stvarnog Node exportera');
  const entries=checkPreviewExport(staged,ready);
  const git=gitInfo(),generatedAt=new Date().toISOString();
  const manifest={project:'RMC Web Solutions',type:'dev-preview',sourceCommit:git.sha,
    workingTreeDirty:git.dirty,generatedAt,stagingApiOrigin:apiBase,
    qaLive:entries.some(s=>s.qaLive),bookingLive:entries.some(s=>s.bookingLive),
    commerceLive:entries.some(s=>s.commerceLive),note:'Stabilni DEV QA SITE ID-jevi. Samo eksplicitno omogućeni scenariji imaju staging transport. Nikada nema koda ili vlasničkog tokena u javnim fajlovima.',
    scenarios:entries};
  const prev=path.join(staged,'web-solutions-preview');
  writeQaConsole(prev,manifest);
  writeFileSync(path.join(prev,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  writeFileSync(path.join(prev,'.nojekyll'),'');
  writeFileSync(path.join(prev,'robots.txt'),'User-agent: *\nDisallow: /\n');
  writeFileSync(path.join(dst,'publication-manifest.json'),JSON.stringify({type:'web-solutions-public',sourceCommit:git.sha,
    workingTreeDirty:git.dirty,generatedAt,api:apiBase,basePath:publicBase,
    marketingDemos:6,qaPreviewScenarios:9},null,2)+'\n');
  // Last safety gate before making either directory available for publication.
  scanSafe(dst);scanSafe(prev);
  assert(listFiles(prev).filter(x=>/\/index\.html$/.test(x)&&x.startsWith('sites/')).length===9,
    'STOP: Izvezeno je manje od devet sajtova');
  status('Bezbednosna provera, šest DEMO sajtova i devet Node izvoza: PASS');
  // Previously published bundles remain intact if ANY earlier stage fails.
  for(const name of ['web-solutions-public','web-solutions-preview']){
    const target=path.join(out,name);rmSync(target,{recursive:true,force:true});
    renameSync(path.join(staged,name),target);
  }
  rmSync(staged,{recursive:true,force:true});
  writeFileSync(path.join(out,'SPREMNO_ZA_GITHUB_DESKTOP.txt'),
   `RMC PUBLICATION PASS\nIzvor: ${git.sha}${git.dirty?' [lokalne izmene]':''}\n\n`+
   `1. ${pub}\n2. ${preview}\n\n`+
   'Kopirajte SADRZAJ prvog foldera u lokalni GitHub Desktop folder web-solutions-public.\n'+
   'Kopirajte SADRZAJ drugog foldera u lokalni GitHub Desktop folder web-solutions-preview.\n'+
   'Ne objavljujte ovaj RMC_PUBLICATION_OUT folder kao celinu.\n'+
   (liveQa.size?'Samo eksplicitno izabrani QA scenariji imaju STAGING transport; pojedinacni E2E proverava se rucno.\n':'Booking je DEMO, bez stvarnog slanja.\n')+
   'Vlasnicki pairing kod nikada nije deo ovog artefakta.\n');
  console.log('\n========= RMC PUBLICATION PASS =========');
  console.log('PUBLIC : '+pub+'\nPREVIEW: '+preview);
  console.log('GitHub Pages /web-solutions-public/ i /web-solutions-preview/');
  console.log('QA transport: '+(liveQa.size?'Izabrani Booking/Commerce scenariji spremni za pojedinačni E2E.':'DEMO; E2E nije uključen.'));
 }catch(error){
  status('BUILD STOP: '+error.message);
  rmSync(staged,{recursive:true,force:true});throw error;
 }
}
main().catch(error=>{console.error('[RMC] '+error.stack);process.exitCode=1});
