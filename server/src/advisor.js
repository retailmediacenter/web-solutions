import {SERVICE_BUSINESSES,serviceProfile,getServiceSpecial,resolveServiceSiteConfig} from './service-engine.js';
import {VERTICAL_IDS,verticalProfile,verticalQuestion,resolveVerticalSiteConfig} from './vertical-engine.js';
import { getBusinessFacts } from './registry.js';
import {getHybridQuestion} from './hybrid-engine.js';
import advisorData from './data/business-advisor-v395.json' with { type: 'json' };
import pilotData from './data/pilot-catalog-v395.json' with { type: 'json' };
import retailData from './data/retail-catalog-v395.json' with { type: 'json' };
import commerceData from './data/commerce-capabilities-v395.json' with { type: 'json' };

// Advisor owns meaning, choices, capabilities and module plan. Registry owns ONLY facts.
export const PILOT_BUSINESSES = Object.freeze([...Object.keys(pilotData), ...Object.keys(retailData), ...SERVICE_BUSINESSES,...VERTICAL_IDS]);
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
export function businessDisplayName(id){return pilotData[id]?.label||retailData[id]?.label||serviceProfile(id)?.label||verticalProfile(id)?.label||advisorData[id]?.label||legacyNames[id]||readable(id);}
export function listBusinesses(){
  return Object.keys(advisorRegistry()).map(id=>({id,label:businessDisplayName(id),group:advisorData[id]?.group||verticalProfile(id)?.group||'Ostalo',pilot:PILOT_BUSINESSES.includes(id)}));
}
function advisorRegistry(){return registryIdsHolder;}
// Registry entries are obtained once from the real V39.5 data-only registry.
import registryFacts from './data/business-registry-v1.json' with { type: 'json' };
const registryIdsHolder = registryFacts;

export function recognizeBusiness(description){
  const text=clean(description);
  if(text.length<3)return null;
  // Preserve explicit recognition for the first three audited scenarios;
  // additional migrated IDs remain selectable by name, no guessed synonyms.
  if(/\b(mesar|mesnic|butcher)/.test(text))return 'butcher-shop';
  if(/\b(vinotek|wine shop|prodavnic.*vin|vino.*degust)/.test(text))return 'wine-shop';
  if(/\b(obuc|obuv|cipel|patik|shoe shop)/.test(text))return 'shoe-shop';
  // Explicit Serbian synonyms for the ten new profiles. Do not infer unknown
  // professions from a generic retail description: ask the user to select.
  const retailAliases=[
    ['fashion-shop', /\b(butik|garderob|odec|modn(?:a|i|e) radnj)/],
    ['grocery-store', /\b(mini ?market|samoposlug|namirnic|prodavnica hrane)/],
    ['liquor-store', /\b(prodavnic[aue] pica|pice na veliko|alkoholna pica)/],
    ['home-decor', /\b(kucn(?:i|e|a) dekor|dekoracij.*dom|home decor)/],
    ['electronics-store', /\b(elektronik|laptop|racunar|kompjuter)/],
    ['phone-store', /\b(mobiln(?:e|i|og|im) telefon|prodaj.*telefon|phone store)/],
    ['furniture-store', /\b(namestaj|salon namestaja)/],
    ['auto-parts', /\b(auto ?delov|delov.*automobil|rezervn.*delov)/],
    ['plumbing-supplies', /\b(vodovodn.*materijal|vodoinstalatersk.*materijal|sanitarij|vodooprem|vodomaterijal)/],
    ['electrical-supplies', /\b(elektromaterijal|elektro oprem|instalacion.*materijal)/],
    ['bakery', /\b(pekar|hleb|pekarsk)/],
    ['pastry', /\b(poslasticarnic|kolaci|tort(?:e|a|u) po porudzbini)/],
    ['fast-food', /\b(brz[au] hran[au]|fast ?food|burger bar)/],
    ['gift-shop', /\b(cvecar|cvetni|poklon paket|prodaj.*cvec)/]
  ];
  const matched=retailAliases.filter(([,pattern])=>pattern.test(text)).map(([id])=>id);
  if(matched.length===1)return matched[0];
  if(matched.length>1)return null;
  // Four generic booking modes; aliases affect recognition only, never booking configuration.
  const serviceAliases=[
    ['hair-salon',/\b(frizersk|frizer|frizur)/],['barber-shop',/\b(barber|berber)/],
    ['beauty-salon',/\b(kozmetick|beauty salon)/],['nail-salon',/\b(nokt|manikir|pedikir)/],
    ['massage',/\b(masaz|spa |wellness)/],['physio',/\b(fizioterap|fizio)/],
    ['optician',/\b(optik|opticarsk|pregled vida)/],
    ['restaurant',/\b(restoran|picerij|pizzeria|pizza restoran)/],['cafe',/\b(kafic|kafe bar|coffee shop)/],
    ['auto-service',/\b(auto ?servis|autoservis|mehanicarsk)/],['tire-shop',/\b(vulkanizer|zamena gum|pneumatik)/],
    ['appliance-repair',/\b(bel[eai] tehnike|kucnih aparata|servis aparat)/],
    ['hvac',/\b(klima servis|servis klimatiz|klima uredjaj)/],
    ['plumber',/\b(vodoinstalater|vodoinstalacij)/],['electrician',/\b(elektricar|elektroinstalater)/],
    ['repair-phone',/\b(servis mobilnih telefon|popravka telefona)/],
    ['accounting',/\b(knjigovodst|racunovodst)/],['consultant',/\b(konsultant|konsalting|poslovne konsultacij)/],
    ['law-office',/\b(advokat|advokatsk)/],
    ['kids-playroom',/\b(igraonic|deciji rodjendan)/],['event-venue',/\b(sala za proslav|prostor za dogadjaj|event venue)/],
    ['carpenter',/\b(stolar|stolarsk)/],['painter',/\b(moler|krecenje|farbar)/],
    ['tiler',/\b(keramicar|postavljanje plocica)/],
    ['catering',/\b(ketering|catering)/],
    ['car-wash',/\b(auto ?perionic|pranje automobil)/],
    ['cleaning',/\b(servis za ciscenje|ciscenje prostor|profesionalno ciscenje)/],
    ['locksmith',/\b(bravarsk|metaln.*konstrukcij|metaloprera)/],
    ['moving',/\b(selidb|prevoz namestaja)/],
    ['property-manager',/\b(profesionalni upravnik|upravljanje zgrad)/],
    ['software-company',/\b(softversk.*agenc|softversk.*kompan)/],
    ['it-support',/\b(it podrsk|odrzavanje racunar|mrezn.*podrsk)/],
    ['security-systems',/\b(video nadzor|alarmn.*sistem|bezbednosn.*sistem)/],
    ['fitness-center',/\b(fitnes centar|fitness centar|teretana)/],
    ['fitness-trainer',/\b(personalni trener|individualni trener)/],
    ['yoga-pilates',/\b(joga|yoga|pilates)/]
  ];
  const serviceMatches=serviceAliases.filter(([,re])=>re.test(text)).map(([id])=>id);
  if(serviceMatches.length===1)return serviceMatches[0];
  if(serviceMatches.length>1)return null;
  const verticalAliases=[
    ['sports-shop',/\b(sportsk.*prodavnic|sportsk.*oprem|sports shop)/],
    ['marketing-agency',/\b(marketing.*agenc|reklamn.*agenc|digital.*marketing)/],
    ['print-shop',/\b(stamparij|stampars|print shop)/],
    ['real-estate',/\b(nekretnin|agencij.*stanov)/],
    ['construction',/\b(investitor|gradnja objek|stamben.*gradnj)/],
    ['interior-design',/\b(dizajn enterijer|projektovanje enterijer)/],
    ['language-school',/\b(skola jezik|casov.*englesk)/],
    ['training-center',/\b(centar za obuk|edukativni centar|strucne obuke)/],
    ['kindergarten',/\b(vrtic|predskolsk)/],
    ['apartments',/\b(apartman|smestaj.*apartman)/],
    ['hotel',/\b(hotel|hotelski)/],
    ['rent-a-car',/\b(rent.?a.?car|iznajmljivanje automobil)/],
    ['travel-agency',/\b(turistick.*agenc|putnick.*agenc)/],
    ['photo-video',/\b(foto studio|video produkc|fotograf.*snimanje)/],
    ['dentist',/\b(stomatol|zubarsk)/],
    ['pharmacy',/\b(apotek)/],
    ['lab',/\b(medicinsk.*laboratorij|laboratorij.*analiz)/],
    ['clinic',/\b(privatn.*klinik|privatn.*poliklinik)/],
    ['vet',/\b(veterinar|vet ambulant)/]
  ];
  const verticalHits=verticalAliases.filter(([,re])=>re.test(text)).map(([id])=>id);
  if(verticalHits.length===1)return verticalHits[0];
  if(verticalHits.length>1)return null;
  const aliases=Object.keys(registryFacts).map(id=>({id,label:clean(businessDisplayName(id))}));
  const hits=aliases.filter(x=>x.label.length>5 && text.includes(x.label));
  return hits.length===1?hits[0].id:null;
}

export function getAdvisorDefinition(id){
  const facts=getBusinessFacts(id);
  if(!facts)throw new Error('Nepoznata delatnost.');
  const old=advisorData[id]?.logic?.advisor;
  const pilot=PILOT_BUSINESSES.includes(id);
  const service=serviceProfile(id);
  const verticalOperations={
    'marketing-agency':{question:'Kako klijenti započinju saradnju?',options:['Poziv i razgovor','Upit za ponudu','Online konsultacija']},
    'print-shop':{question:'Kako najčešće primate naloge?',options:['Direktno u štampariji','Telefon / poruka','Upit sa specifikacijom']},
    'interior-design':{question:'Kako počinjete novi projekat?',options:['Poziv za konsultaciju','Upit sa podacima o prostoru','Dogovor za obilazak']},
    'photo-video':{question:'Kako klijenti dogovaraju snimanje?',options:['Poziv / poruka','Zahtev za ponudu','Upit sa željenim datumom']}
  };
  const verticalEmphasis={
    'marketing-agency':{question:'Šta želite da istaknemo?',options:['Kampanje','Strategiju','Kreativnu produkciju','Rezultate koje vlasnik potvrdi']},
    'print-shop':{question:'Šta je najvažnije u ponudi?',options:['Vrste štampe','Rokove dogovorene sa klijentom','Materijale i formate','Primer radova']},
    'interior-design':{question:'Šta prvo predstavljamo?',options:['Projektovanje','Stil i funkcionalnost','Primer projekata','Konsultacije']},
    'photo-video':{question:'Šta prvo predstavljamo?',options:['Fotografisanje','Video produkciju','Montažu','Portfolio']}
  };
  const operation=(id==='pharmacy'?{question:'Kako predstavljate proizvode?',options:['Porudžbine proizvoda za negu i dozvoljenog bezreceptnog asortimana','Katalog proizvoda i upiti o dostupnosti']}:null) || verticalOperations[id] || (id==='butcher-shop' ? {
    question:'Kako kupci najčešće poručuju?',
    options:['Dolaze u mesaru','Pozivom telefonom','Viber / WhatsApp porukom','Online poručivanje']
  } : id==='wine-shop' ? {
    question:'Kako prodajete vina?',
    options:['Prodaja u radnji','Radnja + poručivanje','Radnja + dostava']
  } : old?.step2 ?? {question:'Kako kupci najčešće stupaju u kontakt?',options:['Poseta','Telefon / poruka','Online upit']});
  const emphasis=(verticalEmphasis[id] ?? old?.step3) ?? (id==='butcher-shop'
    ?{question:'Šta posebno ističemo?',options:['Sveža ponuda','Roštilj program','Porodični paketi','Poreklo i kvalitet']}
    :id==='wine-shop'?{question:'Šta želite da istaknemo?',options:['Selekciju vina','Poklon pakete','Degustacije','Penušava vina']}
    :{question:'Šta prvo prikazujemo?',options:id==='auto-parts'
      ?['Najtraženije auto-delove','Nove proizvode','Delove za različite modele vozila','Akcije i dostupnost']
      :id==='plumbing-supplies'||id==='electrical-supplies'
        ?['Najtraženije proizvode','Nove proizvode i modele','Širinu asortimana','Akcije i dostupnost']
        :id==='phone-store'||id==='electronics-store'
          ?['Najtraženije uređaje','Nove modele','Raznovrsnu ponudu','Akcije i dostupnost']
          :['Najtraženije proizvode','Nove proizvode','Raznovrsnu ponudu','Akcije i dostupnost']});
  const definition={id,label:businessDisplayName(id),pilot,legacyReference:'V39.5',operation,emphasis,
    special:id==='butcher-shop'?{id:'butcherGrillService',question:'Da li nudite pripremu i pečenje mesa?',options:[{id:'raw',label:'Samo sveže / sirovo meso'},{id:'grilled',label:'Da, priprema i pečenje po dogovoru'}]}
    :id==='wine-shop'?{id:'wineTastings',question:'Da li organizujete degustacije vina?',options:[{id:'yes',label:'Da, organizujemo degustacije'},{id:'no',label:'Ne, samo prodaja vina'}]}
    :id==='pharmacy'?{id:'pharmacyConsultations',question:'Da li nudite savetovanje sa farmaceutom o proizvodima?',options:[{id:'yes',label:'Da — omogućite slanje zahteva za savetovanje'},{id:'no',label:'Ne — samo ponuda i upiti za proizvode'}]}
    :service?getServiceSpecial(id):verticalProfile(id)?verticalQuestion(id):orderQuestionIds.has(id)?orderQuestion:null,
    serviceMode:service?.mode||null,verticalKind:id==='pharmacy'?null:(verticalProfile(id)?.kind||null),hybrid:getHybridQuestion(id),styles:STYLES};
  // A marketing goal never silently chooses whether a shop takes orders.
  // Keep the historical business-specific question, then ask the independent
  // commerce capability question for EVERY product-catalog business.
  definition.specials=[...(definition.special?[definition.special]:[]),
    ...(catalogBusinessIds.has(id)&&definition.special?.id!=='ordersEnabled'?[orderQuestion]:[])];
  return definition;
}

// Business questions live here, not in the fact-only Business Registry.
const catalogBusinessIds=new Set([...Object.keys(pilotData),...Object.keys(retailData)]);
const orderQuestionIds=new Set(['phone-store','grocery-store','auto-parts', 'bakery','pastry','fast-food','gift-shop']);
const orderQuestion={id:'ordersEnabled',question:'Da li kupci mogu da naruče proizvode preko sajta?',options:[
  {id:'yes',label:'Da — primamo porudžbine (bez automatskog plaćanja)'},
  {id:'no',label:'Ne — samo katalog i provera dostupnosti'}
]};

const maxName=100;
function isNonEmptyChoice(value,options){return typeof value==='string'&&options.includes(value);}
export function resolvePilotSiteConfig({businessId,businessName,description='',answers={},style='modern',goal='purchase'}={}){
  if(!PILOT_BUSINESSES.includes(businessId))throw new Error('Delatnost još nije migrirana.');
  if(SERVICE_BUSINESSES.includes(businessId))return resolveServiceSiteConfig({businessId,businessName,description,answers,style,goal},STYLES).siteConfig;
  if(VERTICAL_IDS.includes(businessId))return resolveVerticalSiteConfig({businessId,businessName,description,answers,style,goal},STYLES).siteConfig;
  const facts=getBusinessFacts(businessId),def=getAdvisorDefinition(businessId);
  if(!facts)throw new Error('Nepoznata delatnost.');
  const name=String(businessName??'').trim();
  if(!name||name.length>maxName)throw new Error('Naziv firme mora imati 1–100 znakova.');
  if(!STYLES.some(x=>x.id===style))throw new Error('Nepoznat stil.');
  if(!['purchase','visit','catalog'].includes(goal))throw new Error('Nepoznat cilj sajta.');
  // V39.5 matrix is historical default. The business's explicit answer is
  // authoritative for the three audited retail profiles, irrespective of the
  // main marketing goal ('purchase', 'visit' or 'catalog').
  const sourceMode=commerceData[businessId]?.mode||'inquiry';
  const isNewRetail=Object.hasOwn(retailData,businessId);
  const explicitOrders=orderQuestionIds.has(businessId);
  if(explicitOrders && typeof answers.ordersEnabled!=='boolean')
    throw new Error('Odgovorite da li radnja prima porudžbine preko sajta.');
  if(answers.ordersEnabled!==undefined && typeof answers.ordersEnabled!=='boolean')
    throw new Error('Odgovor o porudžbinama mora biti DA ili NE.');
  // A previous API client may omit the *new* explicit question. Preserve its
  // historical default but respect a clearly stated old Advisor operation.
  // The current React Advisor always asks the question independently of goal.
  const businessMode=typeof answers.businessMode==='string'&&def.operation.options.includes(answers.businessMode)?answers.businessMode:'';
  const impliedOrder=/online poručivanje|radnja \+ poručivanje|radnja \+ dostava|online prodaja|forma za porudžbinu/i.test(businessMode)?true:
    /samo u radnji|samo u salonu|prodaja u radnji|dolaze u mesaru|samo prodaja u lokalu/i.test(businessMode)?false:null;
  const canOrder=typeof answers.ordersEnabled==='boolean'?answers.ordersEnabled:
    impliedOrder!==null?impliedOrder:(goal==='purchase'&&sourceMode==='cart');
  const features={commerce:canOrder,inquiry:!canOrder,
    variantNote:isNewRetail&&!!commerceData[businessId]?.variantNote,
    requireVehicle:businessId==='auto-parts'};
  const variantLabels={'fashion-shop':'Veličina / boja','phone-store':'Model / boja',
    'furniture-store':'Model / dimenzije','auto-parts':'Marka / model / godište vozila',
    'plumbing-supplies':'Dimenzije / specifikacija','electrical-supplies':'Tip / specifikacija',
    'electronics-store':'Model / varijanta','liquor-store':'Pakovanje / varijanta','home-decor':'Boja / dimenzije'};
  features.variantLabel=variantLabels[businessId]||'Varijanta / napomena';
  const modules=['hero','featured','catalog'];
  if(features.commerce)modules.push('cart');
  const mode=businessMode;
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
    schemaVersion:'41.9.1-advisor-audit',reference:'V39.5',siteStatus:'preview-and-export',
    business:{id:businessId,name,label:def.label},
    input:{description:String(description??'').slice(0,800),goal,mode,emphasis},
    style,capabilities:features,modules,
    commerce:{...commerceData[businessId],mode:features.commerce?'cart':features.inquiry?'inquiry':'catalog',currency:'RSD',prices:'illustrative-demo'},
    contact:{phone:cleanPhone},
    assets:{assetRoot:facts.assetRoot,assetRoles:[...facts.assetRoles]},
    registryAssetRoot:facts.assetRoot // compatibility with first V41 checkpoint
  };
}
