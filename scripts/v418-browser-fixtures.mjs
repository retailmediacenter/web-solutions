import {writeFileSync,mkdirSync,cpSync,symlinkSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSitePayload} from '../server/src/site.js';
import {renderHtml} from '../server/src/render-site.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../');
const out=process.argv[2]||path.resolve(root,'../v418_browser');
mkdirSync(out,{recursive:true});
for(const name of ['site.css','vertical.css','vertical-runtime.js','export-runtime.js','pharmacy-consult.css','pharmacy-consult-runtime.js'])cpSync(path.join(root,'client/public',name),path.join(out,name));
const assets=path.join(out,'assets');if(!existsSync(assets))symlinkSync(path.join(root,'client/public/assets'),assets,'dir');
for(const id of ['sports-shop','real-estate','kindergarten','apartments','hotel','rent-a-car','lab','pharmacy','marketing-agency']){
 for(const enabled of [true,false]){
  const p=buildSitePayload({businessId:id,businessName:'Test '+id,description:'Test '+id,goal:'visit',style:'modern',answers:id==='pharmacy'?{businessMode:enabled?'Porudžbine proizvoda za negu i dozvoljenog bezreceptnog asortimana':'Katalog proizvoda i upiti o dostupnosti',pharmacyConsultations:enabled,contactPhone:'+381 60 123456'}:{verticalEnabled:enabled,contactPhone:'+381 60 123456'}});
  writeFileSync(path.join(out,`${id}-${enabled?'yes':'no'}.html`),renderHtml(p));
 }
}
console.log('Fixtures ready:',out);
