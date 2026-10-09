// V42: shared, sanitized global site/business contact data. Not part of Business Registry.
const text=(v,max=160)=>String(v??'').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const digits=v=>String(v||'').replace(/\D/g,'');
function phone(v){
 const raw=text(v,35);if(!raw)return '';
 if(!/^[+\d ()\-]+$/.test(raw)||digits(raw).length<6||digits(raw).length>15)throw new Error('Telefon mora sadržati 6–15 cifara.');
 return raw;
}
function channelPhone(v,label){const normalized=phone(v);if(normalized&&!normalized.startsWith('+'))throw new Error(label+' mora imati međunarodni format (+381...).');return normalized;}
function email(v){const raw=text(v,160);if(raw&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(raw))throw new Error('Unesite ispravnu email adresu.');return raw;}
function url(v){const raw=text(v,300);if(!raw)return '';
 try{const parsed=new URL(raw);if(parsed.protocol!=='https:'||parsed.username||parsed.password||!parsed.hostname.includes('.'))throw Error();return parsed.toString();}
 catch{throw new Error('Link mora biti ispravna HTTPS adresa.');}
}
function location(v,i){
 const item=v&&typeof v==='object'&&!Array.isArray(v)?v:{};
 const loc={id:`lokacija-${i+1}`,label:text(item.label,80),city:text(item.city,80),address:text(item.address,180),hours:text(item.hours,140)};
 if(!loc.city&&!loc.address&&!loc.label&&!loc.hours)return null;
 // A full map pin is only supported with both a street address and a city.
 if(loc.address&&!loc.city)throw new Error('Za adresu lokacije unesite i grad.');
 return loc;
}
export function resolveBusinessData(input,site){
 const supplied=input?.businessData&&typeof input.businessData==='object'&&!Array.isArray(input.businessData)?input.businessData:{};
 const a=input?.answers||{};
 const mainPhone=phone(supplied.phone??a.contactPhone??'');
 const city=text(supplied.city,80),address=text(supplied.address,180),hours=text(supplied.hours,140);
 if(address&&!city)throw new Error('Za adresu unesite i grad.');
 // Existing API clients that omit businessData keep their legacy behavior.
 // The current Advisor always sends locationMode, so new free sites are validated.
 const explicitlyConfigured=Object.hasOwn(supplied,'locationMode');
 const locationMode=explicitlyConfigured?text(supplied.locationMode,24):'legacy';
 if(!['physical','service-area','online','legacy'].includes(locationMode))throw new Error('Izaberite tip poslovne lokacije.');
 if(locationMode==='physical'&&(!city||!address))throw new Error('Za poslovnu adresu obavezno unesite grad i ulicu sa brojem.');
 if(locationMode==='service-area'&&!city)throw new Error('Unesite grad ili područje na kom pružate usluge.');
 const entries=Array.isArray(supplied.locations)?supplied.locations:[];
 if(locationMode==='online'&&entries.length)throw new Error('Sajt bez javne lokacije ne prikazuje dodatne poslovne adrese.');
 if(entries.length>4)throw new Error('Jedna glavna i najviše četiri dodatne lokacije.');
 const first=location({label:locationMode==='service-area'?'Područje rada':'Glavna lokacija',city,address:locationMode==='online'?'':address,hours},0);
 // If the primary address is absent, do not add invented main location.
 const locations=[...(locationMode!=='online'&&first&&(city||address)?[first]:[]),...entries.map((x,i)=>location(x,i+1)).filter(Boolean)];
 const seen=new Set();
 const unique=locations.filter(x=>{const k=(x.address+'|'+x.city).toLocaleLowerCase('sr');if(!x.address&&!x.city||seen.has(k))return false;seen.add(k);return true;});
 const name=text(site?.business?.name,100);
 return {locationMode,businessName:name,phone:mainPhone,email:email(supplied.email),city,address,website:url(supplied.website),
  whatsapp:channelPhone(supplied.whatsapp,'WhatsApp'),viber:channelPhone(supplied.viber,'Viber'),instagram:url(supplied.instagram),linkedin:url(supplied.linkedin),hours,locations:unique};
}
export function demoBrandFromEnvironment(env=process.env){
 const fallback='https://retailmediacenter.com/web-solutions/';
 return {name:text(env.DEMO_BRAND_NAME||'RMC',80),label:text(env.DEMO_BRAND_LABEL||'RMC Web Solutions AI Builder',110),
  url:url(env.DEMO_BRAND_URL||fallback)};
}
