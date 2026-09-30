import { readFileSync, existsSync } from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const images=JSON.parse(readFileSync(resolve(root,'data/images.json'),'utf8'));
const site=JSON.parse(readFileSync(resolve(root,'data/site.json'),'utf8'));
for(const [key,file] of Object.entries(images)) {
 if(key==='note'||(key==='videoDeepCleaning'&&!site.deepCleaning.videoEnabled)||(['beforeCleaning','afterCleaning'].includes(key)&&!site.deepCleaning.beforeAfter?.enabled))continue;
 if(!existsSync(resolve(root,file)))throw Error(`MISSING ${key}: ${file}`);
}
if(html.includes('{{'))throw Error('Unreplaced template tokens');
const expected=['class="site-header"','class="hero"','id="izdvajamo"','id="usluge"','id="objekti"','id="nas-rad"','id="dubinsko"','id="kontakt"'];
for(const needle of expected)if(!html.includes(needle))throw Error(`MISSING HTML ${needle}`);
if(!html.includes('name="phone"')||!html.includes('type="tel"')||!html.includes('required minlength="6"'))throw Error('Phone required missing');
if(html.includes('data-info-title'))throw Error('Feature popups should be absent');
for(const id of site.services.map(s=>s.id))if(!html.includes(`data-service-id="${id}"`))throw Error(`Missing service modal: ${id}`);
if(html.includes('data-photo="assets/images/cleaning'))throw Error('Deep gallery should not open photo popups');
console.log('NINA22 V3.3 STATIC CHECK OK — service popups, clean features, SEO assets valid.');
