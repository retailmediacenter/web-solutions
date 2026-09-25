import {readFileSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderHtml} from './render-site.js';
import {zipFiles} from './zip.js';
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../');
const publicRoot=path.join(projectRoot,'client','public');
function staticFile(name){return readFileSync(path.join(publicRoot,name));}
export function exportSiteZip(payload,{pairingCode=null,expiresIn=0}={}){
  let siteHtml=renderHtml(payload);
  if(payload.siteConfig.bookingTransport){
    // Defer script while preserving pre-existing modules and their order.
    siteHtml=siteHtml.replace(/<script src="(booking-runtime|export-runtime)\.js" defer><\/script>/,
      '<script src="booking-submit.js" defer></script>$&');
  }
  const catalog=payload.catalog;
  const isService=!!payload.siteConfig.capabilities?.serviceProfile;
  const isVertical=!!payload.siteConfig.capabilities?.vertical;
  const requested=new Set([catalog.hero,...(isVertical?catalog.cards:isService?catalog.services:catalog.products).map(x=>x.image)].filter(Boolean));
  if(payload.siteConfig.capabilities.wineTastings&&catalog.tastingImage)requested.add(catalog.tastingImage);
  if(payload.secondary){for(const image of payload.secondary.type==='service'?payload.secondary.services.slice(0,3).map(x=>x.image):payload.secondary.type==='products'?payload.secondary.products.slice(0,4).map(x=>x.image):payload.secondary.type==='vehicles'?payload.secondary.products.map(x=>x.image):[])if(image)requested.add(image);}
  const files=[
    {name:'index.html',data:siteHtml},
    ...(pairingCode?[{name:'BOOKING_UPARIVANJE.txt',data:
      'RMC BOOKING MANAGER – UPARIVANJE\r\n\r\n'+
      'Jednokratni kod: '+pairingCode+'\r\n'+
      'Važi narednih '+Math.round(expiresIn/60)+' minuta od trenutka preuzimanja.\r\n'+
      'Unesite kod u Booking Manager na bilo kom podržanom uređaju.\r\n'+
      'Kod služi samo za uparivanje, nije trajna lozinka.\r\n'+
      'VAŽNO: fajl BOOKING_UPARIVANJE.txt uklonite sa javnog servera pre objave sajta.\r\n'+
      'Rezervacije sa objavljenog sajta rade kada su Node API i Booking Manager ažurirani i sajt uparen.\r\n'}]:[]),
    {name:'site.css',data:staticFile('site.css')},
    {name:'export-runtime.js',data:staticFile('export-runtime.js')},
    ...(payload.siteConfig.bookingTransport?[{name:'booking-submit.js',data:staticFile('booking-submit.js')}]:[]),
    {name:'visual-system.css',data:staticFile('visual-system.css')},
    {name:'global-modal.css',data:staticFile('global-modal.css')},
    {name:'global-modal.js',data:staticFile('global-modal.js')},
    {name:'site-system.css',data:staticFile('site-system.css')},
    {name:'site-system.js',data:staticFile('site-system.js')},
    ...((isService||payload.siteConfig.capabilities?.wineTastings)?[{name:'booking-link.js',data:staticFile('booking-link.js')}]:[]),
    ...(isService?[{name:'booking.css',data:staticFile('booking.css')},{name:'booking-runtime.js',data:staticFile('booking-runtime.js')}]:[]),
    ...(payload.siteConfig.capabilities?.pharmacyConsultations?[{name:'pharmacy-consult.css',data:staticFile('pharmacy-consult.css')},{name:'pharmacy-consult-runtime.js',data:staticFile('pharmacy-consult-runtime.js')}]:[]),
    ...(isVertical?[{name:'vertical.css',data:staticFile('vertical.css')},{name:'vertical-runtime.js',data:staticFile('vertical-runtime.js')}]:[]),
    ...(payload.secondary?[{name:'hybrid.css',data:staticFile('hybrid.css')},{name:'hybrid-runtime.js',data:staticFile('hybrid-runtime.js')}]:[])
  ];
  for(const image of requested){
    if(typeof image!=='string'||!/^assets\/images\/curated\/[a-z0-9/_-]+\.jpe?g$/.test(image))throw new Error('Asset putanja nije dozvoljena.');
    const abs=path.resolve(publicRoot,image);
    if(!abs.startsWith(path.resolve(publicRoot)+path.sep)||!existsSync(abs)||statSync(abs).size>5*1024*1024)throw new Error('Asset nije dostupan za export: '+image);
    files.push({name:image,data:readFileSync(abs)});
  }
  return zipFiles(files);
}
