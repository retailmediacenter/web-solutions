// Offline precache bez dodatnih build pluginova. Vite prvo napravi dist,
// zatim ova skripta uključi tačno stvarne verzionisane fajlove.
import {readdir, readFile, writeFile} from 'node:fs/promises';
import {join, relative, sep} from 'node:path';
import {createHash} from 'node:crypto';
const root = new URL('../dist/', import.meta.url);
const rootPath = (await import('node:url')).fileURLToPath(root);
async function files(dir) {
  const found=[];
  for(const item of await readdir(dir,{withFileTypes:true})) {
    const full=join(dir,item.name);
    if(item.isDirectory()) found.push(...await files(full));
    else if(item.isFile() && item.name!=='sw.js') found.push(full);
  }
  return found;
}
const resources=(await files(rootPath)).map(p=>'./'+relative(rootPath,p).split(sep).join('/')).sort();
if(!resources.includes('./index.html') || !resources.includes('./manifest.webmanifest')) throw new Error('Nepotpuna Vite izgradnja: nedostaje index ili manifest.');
const version=createHash('sha256');
for(const path of resources){version.update(path);version.update(await readFile(join(rootPath,path.slice(2))));}
const cache='rmc-booking-v43-1-2-'+version.digest('hex').slice(0,12);
const script=`const CACHE=${JSON.stringify(cache)};
const ASSETS=${JSON.stringify(resources)};
const SHELL='./index.html';
const urlFor=relative=>new URL(relative,self.registration.scope);
const KNOWN=new Set(ASSETS.map(path=>urlFor(path).pathname));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rmc-booking-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const request=e.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){e.respondWith(fetch(request).catch(()=>caches.match(urlFor(SHELL))));return;}
 if(!KNOWN.has(url.pathname))return;
 e.respondWith(caches.match(request,{ignoreSearch:true}).then(hit=>hit||fetch(request)));
});
`;
await writeFile(join(rootPath,'sw.js'),script,'utf8');
console.log('PWA cache:',cache,'fajlova:',resources.length);
