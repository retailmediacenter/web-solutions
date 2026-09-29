import {randomBytes} from 'node:crypto';

const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
const validSiteId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{24}$/.test(value);
const id=()=>randomBytes(18).toString('base64url');
const text=(value,max)=>String(value??'').trim().slice(0,max);
const image=value=>{
 const valueText=text(value,260);
 if(!valueText)return '';
 if(!/^assets\/[A-Za-z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/i.test(valueText)||valueText.includes('..'))throw invalid('Putanja slike mora biti lokalna assets/ putanja iz paketa.');
 return valueText;
};
const href=value=>{
 const valueText=text(value,400);if(!valueText)return '';
 if(!/^(?:https:\/\/|mailto:|tel:|#[A-Za-z][A-Za-z0-9_-]*$)/i.test(valueText))throw invalid('Link mora biti HTTPS adresa, tel:, mailto: ili interna #sekcija.');
 return valueText;
};
const moduleText=(value,max,fallback='')=>text(value,max)||fallback;
const listKey=catalog=>Array.isArray(catalog?.services)?'services':Array.isArray(catalog?.products)?'products':Array.isArray(catalog?.cards)?'cards':null;

// The editor deliberately accepts a narrow content document instead of a raw
// export payload. It can never change a business type, enabled package, API
// transport or owner credentials; those remain controlled by the Advisor and
// the activation flow.
function applyEditorContent(project,content,now){
 if(!content||typeof content!=='object'||Array.isArray(content))throw invalid('Nedostaje sadržaj za uređivanje.');
 const payload=structuredClone(project.sourcePayload),site=payload.siteConfig,catalog=payload.catalog;
 const businessName=text(content.businessName,100);
 if(!businessName)throw invalid('Naziv firme je obavezan.');
 site.business={...(site.business||{}),name:businessName};
 if(site.businessData)site.businessData.name=businessName;
 if(site.bookingProfile?.business)site.bookingProfile.business.name=businessName;
 if(site.siteProfile?.business)site.siteProfile.business.name=businessName;
 const phone=text(content.phone,35).replace(/[^+\d\s()\-]/g,'');
 site.contact={...(site.contact||{}),phone};
 if(site.businessData)site.businessData.phone=phone;
 if(site.bookingProfile?.business)site.bookingProfile.business.phone=phone;
 if(site.siteProfile?.business)site.siteProfile.business.phone=phone;
 catalog.headline=text(content.headline,180);
 catalog.subtitle=text(content.subtitle,500);
 catalog.offerTitle=text(content.offerTitle,120);
 catalog.hero=image(content.hero);
 if(!catalog.headline||!catalog.subtitle)throw invalid('Hero naslov i opis su obavezni.');
 const modules=content.modules&&typeof content.modules==='object'&&!Array.isArray(content.modules)?content.modules:{};
 const services=modules.services&&typeof modules.services==='object'?modules.services:{};
 const booking=modules.booking&&typeof modules.booking==='object'?modules.booking:{};
 const contactModule=modules.contact&&typeof modules.contact==='object'?modules.contact:{};
 const custom=Array.isArray(content.customSections)?content.customSections:[];
 if(custom.length>12)throw invalid('Možete dodati najviše 12 novih sadržajnih blokova.');
 catalog.editorModules={services:{kicker:moduleText(services.kicker,40,'PONUDA'),description:moduleText(services.description,500,'Izaberite uslugu i pošaljite zahtev ili nas kontaktirajte.')},booking:{kicker:moduleText(booking.kicker,40,''),title:moduleText(booking.title,120,''),description:moduleText(booking.description,600,'')}};
 site.editorModules={contact:{kicker:moduleText(contactModule.kicker,40,'KONTAKT'),title:moduleText(contactModule.title,120,'Kontaktirajte nas'),description:moduleText(contactModule.description,600,'')},customSections:custom.map((entry,index)=>{const title=moduleText(entry?.title,120);const body=moduleText(entry?.body,1200);if(!title||!body)throw invalid(`Novi blok ${index+1} mora imati naslov i tekst.`);return {id:text(entry?.id,80)||`custom-${index+1}`,kicker:moduleText(entry?.kicker,40,''),title,body,linkLabel:moduleText(entry?.linkLabel,80,''),linkHref:href(entry?.linkHref)};})};
 const key=listKey(catalog),incoming=content.items;
 if(key&&incoming!==undefined){
  if(!Array.isArray(incoming)||incoming.length<1||incoming.length>500)throw invalid('Ponuda mora imati između 1 i 500 stavki.');
  const original=catalog[key],byId=new Map(original.map(item=>[String(item.id),item]));
  const used=new Set();
  catalog[key]=incoming.map((item,index)=>{
   const suppliedId=text(item?.id,120),previous=byId.get(suppliedId)||original[index],itemId=previous?String(previous.id):suppliedId;
   if(!/^[A-Za-z0-9:_-]{2,120}$/.test(itemId))throw invalid('Nova stavka zahteva ispravan stabilan identifikator.');
   if(used.has(itemId))throw invalid('Stavke ponude moraju imati različite identifikatore.');used.add(itemId);
   const title=text(item?.title??item?.name,120),description=text(item?.description,600),itemImage=image(item?.image);
   if(!title)throw invalid('Svaka stavka ponude mora imati naziv.');
   const next={...(previous||{}),id:itemId,title,image:itemImage};
   if('description' in (previous||{})||description)next.description=description;
   if(key==='products'||'category' in (previous||{}))next.category=text(item?.category,80)||previous?.category||'Ponuda';
   if(key==='products'||'price' in (previous||{})){const price=Number(item?.price);if(!Number.isFinite(price)||price<0||price>10000000)throw invalid('Cena proizvoda nije ispravna.');next.price=Math.round(price*100)/100;if(!previous){next.unit='kom';next.step=1;}}
   return next;
  });
  // Booking and Commerce profiles feed the activated Portal. Keep their
  // customer-facing labels and products in lockstep with the published site.
  if(key==='services'){
   const services=catalog.services.map((item,index)=>({id:item.id||site.bookingProfile?.services?.[index]?.id||`service-${index+1}`,name:item.title}));
   if(site.bookingProfile)site.bookingProfile.services=services;
   if(site.siteProfile)site.siteProfile.services=services;
   if(site.capabilities?.booking){site.capabilities.booking.services=services;site.capabilities.booking.offerings=services.map(item=>item.name);}
  }
  if(key==='products'&&site.siteProfile?.commerce){
   site.siteProfile.commerce.products=catalog.products.map((item,index)=>({...site.siteProfile.commerce.products[index],id:item.id,name:item.title,image:item.image,price:item.price}));
  }
 }
 project.business={name:businessName};project.siteConfig=site;project.sourcePayload=payload;project.updatedAt=now();
 return project;
}

export function createProjectRegistry(queue,{now=()=>new Date().toISOString()}={}){
 if(!queue?.redis||!queue?.key||!queue?.validateProfile)throw new Error('Project Registry zahteva Booking Redis sloj.');
 const key=siteId=>queue.key('project',siteId);
 const read=async siteId=>{
  if(!validSiteId(siteId))throw invalid('Neispravan Project ID.');
  const raw=await queue.redis('GET',key(siteId));if(!raw)throw invalid('Projekat nije pronađen.',404);
  try{return JSON.parse(raw);}catch{throw invalid('Sačuvani projekat nije čitljiv.',503);}
 };
 const save=async project=>{await queue.redis('SET',key(project.siteId),JSON.stringify(project));return project;};
 async function register(sourcePayload){
  const site=sourcePayload?.siteConfig||sourcePayload;
  const booking=Boolean(site?.capabilities?.booking?.enabled&&site.bookingProfile?.services?.length);
  const commerce=Boolean(site?.capabilities?.commerce&&site.siteProfile?.commerce?.enabled);
  const profiles={};
  if(booking)profiles.booking=queue.validateProfile(site.bookingProfile);
  if(commerce){
   profiles.commerce=queue.validateProfile({...site.siteProfile,services:[]});
   profiles.business=queue.validateProfile(site.siteProfile);
  }else if(booking)profiles.business=profiles.booking;
  for(let attempt=0;attempt<4;attempt++){
   const siteId=id(),project={version:2,siteId,business:{name:profiles.business?.business?.name||site?.business?.name||'RMC sajt'},capabilities:{booking,commerce},profiles,siteConfig:site,sourcePayload:sourcePayload?.siteConfig?sourcePayload:{siteConfig:site},createdAt:now(),activation:null};
   if(await queue.redis('SET',key(siteId),JSON.stringify(project),'NX'))return project;
  }
  throw invalid('Nije moguće dodeliti Project ID. Pokušajte ponovo.',503);
 }
 async function summary(siteId){const p=await read(siteId);return {siteId:p.siteId,business:p.business,capabilities:p.capabilities,profiles:p.profiles,siteConfig:p.siteConfig,content:p.sourcePayload?{siteConfig:p.sourcePayload.siteConfig,catalog:p.sourcePayload.catalog,secondary:p.sourcePayload.secondary||null}:null,createdAt:p.createdAt,updatedAt:p.updatedAt||null,activation:p.activation};}
 async function updateContent(siteId,content){const project=await read(siteId);if(!project.sourcePayload)throw invalid('Ovaj stariji projekat nema sačuvan sadržaj za uređivanje. Generišite ga ponovo.',409);applyEditorContent(project,content,now);await save(project);return summary(siteId);}
 async function previewContent(siteId,content){const project=structuredClone(await read(siteId));if(!project.sourcePayload)throw invalid('Ovaj stariji projekat nema sačuvan sadržaj za uređivanje. Generišite ga ponovo.',409);applyEditorContent(project,content,now);const payload=structuredClone(project.sourcePayload);payload.siteConfig.projectId=project.siteId;return {siteId:project.siteId,payload};}
 async function exportProject(siteId){const project=await read(siteId);if(!project.sourcePayload)throw invalid('Ovaj stariji projekat nema sačuvan sadržaj za Publish ZIP. Generišite ga ponovo.',409);const payload=structuredClone(project.sourcePayload);payload.siteConfig.projectId=project.siteId;return {siteId:project.siteId,payload};}
 async function activate(siteId,packageName){
  const project=await read(siteId),name=String(packageName||'').toLowerCase();
  const profile=name==='booking'?project.profiles.booking:name==='commerce'?project.profiles.commerce:name==='business'?project.profiles.business:null;
  if(!profile)throw invalid('Izabrani paket nije dostupan za ovaj projekat.');
  const issued=await queue.issue(profile,{siteId:project.siteId});
  project.activation={package:name,issuedAt:now()};await save(project);
  return {...issued,package:name};
 }
 async function activateExport(siteId,packageName,apiBaseUrl){
  const project=await read(siteId),name=String(packageName||'').toLowerCase();
  const profile=name==='booking'?project.profiles.booking:name==='commerce'?project.profiles.commerce:name==='business'?project.profiles.business:null;
  if(!profile)throw invalid('Izabrani paket nije dostupan za ovaj projekat.');
  let url;try{url=new URL(apiBaseUrl);}catch{throw invalid('Produkcioni API za aktivirani ZIP nije podešen.',503);}
  if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash)throw invalid('Produkcioni API za aktivirani ZIP nije bezbedno podešen.',503);
  if(!project.sourcePayload)throw invalid('Ovaj stariji projekat nema sačuvane podatke za aktivirani ZIP. Generišite ga ponovo.',409);
  const payload=structuredClone(project.sourcePayload),site=payload.siteConfig;
  site.projectId=project.siteId;
  const transport={siteId:project.siteId,apiBaseUrl:url.origin};
  if(name==='booking'||name==='business'){
   if(!project.profiles.booking)throw invalid('Booking paket nije dostupan za ovaj projekat.');
   site.bookingTransport=transport;
  }
  if(name==='commerce'||name==='business'){
   if(!project.profiles.commerce)throw invalid('Commerce paket nije dostupan za ovaj projekat.');
   site.commerceTransport=transport;
  }
  const issued=await queue.issue(profile,{siteId:project.siteId});
  project.activation={package:name,issuedAt:now()};await save(project);
  return {...issued,package:name,payload};
 }
 return {register,summary,updateContent,previewContent,exportProject,activate,activateExport};
}
