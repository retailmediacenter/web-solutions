import {readFileSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderHtml} from './render-site.js';
import {zipFiles} from './zip.js';
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../');
const publicRoot=path.join(projectRoot,'client','public');
function staticFile(name){return readFileSync(path.join(publicRoot,name));}
export function exportSiteZip(payload){
  const siteHtml=renderHtml(payload);
  const catalog=payload.catalog;
  const isService=!!payload.siteConfig.capabilities?.serviceProfile;
  const requested=new Set([catalog.hero,...(isService?catalog.services:catalog.products).map(x=>x.image)]);
  if(payload.siteConfig.capabilities.wineTastings&&catalog.tastingImage)requested.add(catalog.tastingImage);
  const files=[
    {name:'index.html',data:siteHtml},
    {name:'site.css',data:staticFile('site.css')},
    {name:'export-runtime.js',data:staticFile('export-runtime.js')},
    ...(isService?[{name:'booking.css',data:staticFile('booking.css')},{name:'booking-runtime.js',data:staticFile('booking-runtime.js')}]:[])
  ];
  for(const image of requested){
    if(typeof image!=='string'||!/^assets\/images\/curated\/[a-z0-9/_-]+\.jpe?g$/.test(image))throw new Error('Asset putanja nije dozvoljena.');
    const abs=path.resolve(publicRoot,image);
    if(!abs.startsWith(path.resolve(publicRoot)+path.sep)||!existsSync(abs)||statSync(abs).size>5*1024*1024)throw new Error('Asset nije dostupan za export: '+image);
    files.push({name:image,data:readFileSync(abs)});
  }
  return zipFiles(files);
}
