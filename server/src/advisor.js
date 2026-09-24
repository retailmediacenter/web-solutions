import { getBusinessFacts } from './registry.js';
import advisorData from './data/business-advisor-v395.json' with { type: 'json' };
import pilotData from './data/pilot-catalog-v395.json' with { type: 'json' };
import commerceData from './data/commerce-capabilities-v395.json' with { type: 'json' };

// Advisor owns meaning, choices, capabilities and module plan. Registry owns ONLY facts.
export const PILOT_BUSINESSES = Object.freeze(['butcher-shop','wine-shop','shoe-shop']);
export const STYLES = Object.freeze([
  {id:'traditional',label:'Tradicionalni'}, {id:'modern',label:'Moderni'},
  {id:'warm',label:'Topao'}, {id:'tech',label:'Tehnološki'}, {id:'premium',label:'Premium'}
]);
const legacyNames={
  'butcher-shop':'Mesara','wine-shop':'Vinoteka','grocery-store':'Mini market',
  'liquor-store':'Prodavnica pića','phone-store':'Prodavnica telefona',
  'plumbing-supplies':'Vodovodni materijal','electrical-supplies':'Elektromaterijal',
  'furniture-store':'Salon nameštaja','auto-parts':'Auto delovi',
  'repair-phone':'Servis telefona','rent-a-car':'Rent-a-car'
};
const clean=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sr').trim();
const readable=id=>id.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
export function businessDisplayName(id){return pilotData[id]?.label||advisorData[id]?.label||legacyNames[id]||readable(id);}
export function listBusinesses(){
  return Object.keys(advisorRegistry()).map(id=>({id,label:businessDisplayName(id),group:advisorData[id]?.group||'Ostalo',pilot:PILOT_BUSINESSES.includes(id)}));
}
function advisorRegistry(){return registryIdsHolder;}
// Registry entries are obtained once from the real V39.5 data-only registry.
import registryFacts from './data/business-registry-v1.json' with { type: 'json' };
const registryIdsHolder = registryFacts;

export function recognizeBusiness(description){
  const text=clean(description);
  if(text.length<3)return null;
  // Explicit, audited recognition for first 3 scenarios. Remaining categories
  // remain selectable from the authoritative 72-entry registry.
  if(/\b(mesar|mesnic|butcher)/.test(text))return 'butcher-shop';
  if(/\b(vinotek|wine shop|prodavnic.*vin|vino.*degust)/.test(text))return 'wine-shop';
  if(/\b(obuc|obuv|cipel|patik|shoe shop)/.test(text))return 'shoe-shop';
  const aliases=Object.keys(registryFacts).map(id=>({id,label:clean(businessDisplayName(id))}));
  const hits=aliases.filter(x=>x.label.length>5 && text.includes(x.label));
  return hits.length===1?hits[0].id:null;
}

export function getAdvisorDefinition(id){
  const facts=getBusinessFacts(id);
  if(!facts)throw new Error('Nepoznata delatnost.');
  const old=advisorData[id]?.logic?.advisor;
  const pilot=PILOT_BUSINESSES.includes(id);
  const operation= id==='butcher-shop' ? {
    question:'Kako kupci najčešće poručuju?',
    options:['Dolaze u mesaru','Pozivom telefonom','Viber / WhatsApp porukom','Online poručivanje']
  } : id==='wine-shop' ? {
    question:'Kako prodajete vina?',
    options:['Prodaja u radnji','Radnja + poručivanje','Radnja + dostava']
  } : old?.step2 ?? {question:'Kako kupci najčešće stupaju u kontakt?',options:['Poseta','Telefon / poruka','Online upit']};
  const emphasis=old?.step3??(id==='butcher-shop'
    ?{question:'Šta posebno ističemo?',options:['Sveža ponuda','Roštilj program','Porodični paketi','Poreklo i kvalitet']}
    :id==='wine-shop'?{question:'Šta želite da istaknemo?',options:['Selekciju vina','Poklon pakete','Degustacije','Penušava vina']}
    :{question:'Šta prvo prikazujemo?',options:['Najtraženije proizvode','Novu kolekciju','Raznovrsnu ponudu','Dostupnost veličina']});
  return {id,label:businessDisplayName(id),pilot,legacyReference:'V39.5',operation,emphasis,
    special:id==='butcher-shop'?{id:'butcherGrillService',question:'Da li nudite pripremu i pečenje mesa?',options:[{id:'raw',label:'Samo sveže / sirovo meso'},{id:'grilled',label:'Da, priprema i pečenje po dogovoru'}]}
    :id==='wine-shop'?{id:'wineTastings',question:'Da li organizujete degustacije vina?',options:[{id:'yes',label:'Da, organizujemo degustacije'},{id:'no',label:'Ne, samo prodaja vina'}]}:null,
    styles:STYLES};
}

const maxName=100;
function isNonEmptyChoice(value,options){return typeof value==='string'&&options.includes(value);}
export function resolvePilotSiteConfig({businessId,businessName,description='',answers={},style='modern',goal='purchase'}={}){
  if(!PILOT_BUSINESSES.includes(businessId))throw new Error('Delatnost nije u funkcionalnoj pilot fazi.');
  const facts=getBusinessFacts(businessId),def=getAdvisorDefinition(businessId);
  if(!facts)throw new Error('Nepoznata delatnost.');
  const name=String(businessName??'').trim();
  if(!name||name.length>maxName)throw new Error('Naziv firme mora imati 1–100 znakova.');
  if(!STYLES.some(x=>x.id===style))throw new Error('Nepoznat stil.');
  if(!['purchase','visit','catalog'].includes(goal))throw new Error('Nepoznat cilj sajta.');
  const features={commerce:goal==='purchase'};
  const modules=['hero','featured','catalog'];
  if(features.commerce)modules.push('cart');
  const mode=typeof answers.businessMode==='string'&&def.operation.options.includes(answers.businessMode)?answers.businessMode:'';
  const emphasis=typeof answers.emphasis==='string'&&def.emphasis.options.includes(answers.emphasis)?answers.emphasis:'';
  if(businessId==='butcher-shop'){
    if(!['raw','grilled'].includes(answers.butcherGrillService))throw new Error('Nedostaje odgovor o pripremi mesa.');
    features.butcherGrillService=answers.butcherGrillService==='grilled';
  }
  if(businessId==='wine-shop'){
    if(typeof answers.wineTastings!=='boolean')throw new Error('Nedostaje odgovor o degustacijama.');
    features.wineTastings=answers.wineTastings;
    if(features.wineTastings)modules.push('wine-tasting');
  }
  modules.push('contact');
  const cleanPhone=String(answers.contactPhone??'').replace(/[^+\d\s()\-]/g,'').slice(0,35);
  return {
    schemaVersion:'41.1-pilot',reference:'V39.5',siteStatus:'preview-and-export',
    business:{id:businessId,name,label:def.label},
    input:{description:String(description??'').slice(0,800),goal,mode,emphasis},
    style,capabilities:features,modules,
    commerce:{...commerceData[businessId],mode:features.commerce?'cart':goal==='visit'?'visit':'catalog',currency:'RSD',prices:'illustrative-demo'},
    contact:{phone:cleanPhone},
    assets:{assetRoot:facts.assetRoot,assetRoles:[...facts.assetRoles]},
    registryAssetRoot:facts.assetRoot // compatibility with first V41 checkpoint
  };
}
