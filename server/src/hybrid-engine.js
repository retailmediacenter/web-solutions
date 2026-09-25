// V41.7: Advisor-owned compatible primary+secondary business capabilities.
// The V39.5 Business Registry remains data-only and untouched.
import services from './data/service-profiles-v395.json' with {type:'json'};
import retail from './data/retail-catalog-v395.json' with {type:'json'};
import hybridCatalogs from './data/hybrid-catalog-v395.json' with {type:'json'};
import vehicleInventory from './data/vehicle-inventory-demo-v395.json' with {type:'json'};

const scenarios={
  'plumbing-supplies':[{id:'plumber',label:'Prodaja + vodoinstalaterske usluge',type:'service'}],
  'electrical-supplies':[{id:'electrician',label:'Prodaja + električarske usluge',type:'service'}],
  'auto-parts':[
    {id:'auto-service',label:'Prodaja auto-delova + auto-servis',type:'service'},
    {id:'vehicle-sales',label:'Prodaja auto-delova + prodaja vozila',type:'vehicles'}
  ],
  'auto-service':[
    {id:'auto-parts',label:'Auto-servis + prodaja auto-delova',type:'products'},
    {id:'vehicle-sales',label:'Auto-servis + prodaja vozila',type:'vehicles'}
  ],
  'phone-store':[{id:'repair-phone',label:'Prodaja telefona + servis telefona',type:'service'}],
  'repair-phone':[{id:'phone-store',label:'Servis telefona + prodaja uređaja',type:'products'}],
  'furniture-store':[{id:'carpenter',label:'Nameštaj + montaža / stolarske usluge',type:'service'}],
  'hair-salon':[{id:'hair-cosmetics',label:'Frizerske usluge + prodaja kozmetike',type:'products'}]
};
const labels={plumber:'Vodoinstalaterske usluge',electrician:'Električarske usluge',
 'auto-service':'Auto-servis','auto-parts':'Auto-delovi','vehicle-sales':'Prodaja vozila',
 'repair-phone':'Servis telefona','phone-store':'Prodaja telefona',carpenter:'Stolarske i montažne usluge',
 'hair-cosmetics':'Kozmetika za kosu'};
const immutable=Object.freeze(Object.fromEntries(Object.entries(scenarios).map(([k,v])=>[k,Object.freeze(v.map(x=>Object.freeze(x)))])));
export function hybridOptions(id){return immutable[id]||[];}
export function getHybridQuestion(id){
 const choices=hybridOptions(id);
 if(!choices.length)return null;
 return {id:'hybridChoice',question:'Kako poslujete?',help:'Osnovna delatnost je već izabrana. Dodajte samo jednu povezanu delatnost koju zaista nudite.',
  options:[{id:'none',label:'Samo osnovna delatnost'},...choices.map(c=>({id:c.id,label:c.label}))]};
}
export function resolveHybrid(input,payload){
 const options=hybridOptions(input.businessId),choice=input.answers?.hybridChoice;
 if(!options.length){if(choice && choice!=='none')throw new Error('Za ovu delatnost hibrid nije dostupan.');return payload;}
 // Older single-industry V41 API clients have no hybridChoice and retain their
 // previous behaviour; the new React Advisor ALWAYS asks this question.
 if(!choice||choice==='none')return payload;
 const selected=options.find(x=>x.id===choice);
 if(!selected)throw new Error('Nepodržana kombinacija delatnosti.');
 let secondary=null;
 if(selected.type==='service'){
  const profile=services[selected.id];
  if(!profile||!Array.isArray(profile.services)||!profile.services.length)throw new Error('Nedostaju podaci dodatne usluge.');
  secondary={type:'service',label:labels[selected.id],mode:'request-slot',
   offerings:[...profile.offerings],services:profile.services.map(x=>({...x})),hero:profile.hero};
 } else if(selected.type==='products'){
  const profile=retail[selected.id]||hybridCatalogs[selected.id];
  if(!profile||!Array.isArray(profile.products)||!profile.products.length)throw new Error('Nedostaju proizvodi sekundarne delatnosti.');
  secondary={type:'products',label:labels[selected.id],products:profile.products.map(x=>({...x})),hero:profile.hero};
 } else if(selected.type==='vehicles'){
  secondary={type:'vehicles',label:'Prodaja vozila',source:vehicleInventory.source,demoOnly:true,
    disclaimer:vehicleInventory.disclaimer,products:structuredClone(vehicleInventory.products)};
 }
 // No secondary renderer decisions are stored in Registry. SiteConfig owns
 // explicit module plan and the hybrid has its own form and request channel.
 const hybrid={primaryId:input.businessId,secondaryId:selected.id,kind:selected.type,
  label:labels[selected.id],confirmation:'request',maxSecondary:1};
 const original=payload.siteConfig;
 payload.siteConfig={...original,schemaVersion:'41.7-hybrid',
  capabilities:{...original.capabilities,hybrid},
  modules:[...original.modules.filter(x=>x!=='contact'),'hybrid-'+selected.type,'contact']};
 payload.secondary=secondary;
 return payload;
}
export function supportedHybridPairs(){return Object.entries(immutable).flatMap(([primary,v])=>v.map(x=>({primary,secondary:x.id,kind:x.type})));}
