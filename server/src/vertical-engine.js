// V41.8 - Advisor-owned sector-specific decisions. V39.5 Registry remains data-only.
import baseProfiles from './data/vertical-profiles-v418.json' with {type:'json'};
import expansionProfiles from './data/industry-expansion-v49.json' with {type:'json'};
import {getBusinessFacts} from './registry.js';
import {createModulePlan} from './module-plan.js';
const profiles=Object.freeze({...baseProfiles,...expansionProfiles});
export const VERTICAL_IDS=Object.freeze(Object.keys(profiles));
export const verticalProfile=id=>profiles[id]||null;
export function verticalQuestion(id){
 const p=verticalProfile(id);
 if(!p)return null;
 return {id:'verticalEnabled',question:p.question,options:[
   {id:'yes',label:'Da — prihvatamo ovakve zahteve preko sajta'},
   {id:'no',label:'Ne — samo informativni prikaz i običan kontakt'}]};
}
const VALID_GOALS=['purchase','visit','catalog'];
export function resolveVerticalSiteConfig({businessId,businessName,description='',answers={},style='modern',goal='visit'},styles){
 const p=verticalProfile(businessId),facts=getBusinessFacts(businessId);
 if(!p||!facts)throw new Error('Nepoznata sektorska delatnost.');
 if(typeof answers.verticalEnabled!=='boolean')throw new Error('Odgovorite na poslovno pitanje za ovu delatnost.');
 const name=String(businessName??'').trim();
 if(!name||name.length>100)throw new Error('Naziv firme mora imati 1–100 znakova.');
 if(!styles.some(s=>s.id===style)||!VALID_GOALS.includes(goal))throw new Error('Nepoznat cilj ili stil.');
 const enabled=answers.verticalEnabled;
 const externalStay=['hotel','apartments'].includes(businessId)&&/spoljni booking/i.test(String(answers.businessMode||''));
 let externalBookingUrl=null;
 if(externalStay){
   const raw=String(answers.externalBookingUrl??'').trim();
   try{const u=new URL(raw);if(u.protocol!=='https:'||!u.hostname||u.username||u.password)throw Error();externalBookingUrl=u.href}
   catch{throw new Error('Za spoljni booking sistem unesite ispravnu HTTPS adresu. Ne možemo prikazati nefunkcionalan link.');}
 }

 // Availability/price/booking status is NEVER fabricated. These are prepared requests.
 // Rental and accommodation capture date range only if the owner enabled direct requests.
 const modules=['hero',p.kind==='property'?'listings':p.kind==='construction'?'projects':p.kind==='stay'?'units':p.kind==='rental'?'fleet':p.kind==='travel'?'destinations':p.kind==='enrollment'||p.kind==='kindergarten'?'programs':p.kind==='pharmacy'||p.kind==='catalog'?'categories':'services'];
 if(externalBookingUrl)modules.push('external-booking-link');
 if(enabled)modules.push(p.kind==='stay'?'availability-request':p.kind==='rental'?'rental-request':p.kind==='enrollment'?'enrollment':p.kind==='clinical'?'appointment-request':p.kind==='kindergarten'?'visit-request':p.kind==='lab'?'sampling-request':'business-inquiry');
 modules.push('contact');
 const phone=String(answers.contactPhone??'').replace(/[^+\d\s()\-]/g,'').slice(0,35);
 return {
  siteConfig:{schemaVersion:'41.8-vertical',reference:'V39.5',siteStatus:'preview-and-export',
   business:{id:businessId,name,label:p.label},
   input:{description:String(description??'').slice(0,800),goal,mode:answers.businessMode||'',emphasis:answers.emphasis||''},
   style,contact:{phone},modules,modulePlan:createModulePlan({family:'vertical',primary:modules[1],request:enabled}),
   capabilities:{vertical:true,verticalKind:p.kind,verticalEnabled:enabled,liveAvailability:false,
    payments:false,illustrative:true,externalBookingUrl,photoAssetsComplete:!!p.hero&&p.cards.every(c=>!!c.image)},
   assets:{assetRoot:facts.assetRoot,assetRoles:[...(facts.assetRoles||[])]}},
  catalog:structuredClone(p)
 };
}
