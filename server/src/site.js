import {resolveBookingPairing} from './booking-pairing.js';
import {commerceFromSite} from './commerce-profile.js';
import {resolvePharmacySiteConfig} from './pharmacy-engine.js';
import {resolveBusinessData,demoBrandFromEnvironment} from './site-system.js';
import {SERVICE_BUSINESSES,resolveServiceSiteConfig} from './service-engine.js';
import {VERTICAL_IDS,resolveVerticalSiteConfig} from './vertical-engine.js';
import {STYLES} from './advisor.js';
import {resolvePilotSiteConfig} from './advisor.js';
import {getCatalog} from './catalog.js';
import {resolveHybrid} from './hybrid-engine.js';
function baseSitePayload(input){
  if(input?.businessId==='pharmacy')return resolvePharmacySiteConfig(input);
  if(SERVICE_BUSINESSES.includes(input?.businessId))return resolveHybrid(input,resolveServiceSiteConfig(input,STYLES));
  if(VERTICAL_IDS.includes(input?.businessId))return resolveVerticalSiteConfig(input,STYLES);
  const siteConfig=resolvePilotSiteConfig(input);
  const catalog=getCatalog(siteConfig.business.id);
  // All preview/export content derives from this same payload.
  return resolveHybrid(input,{siteConfig,catalog});
}

const WINE_TASTING_SERVICES=Object.freeze([
 {id:'wine-tasting-guided',name:'Vođena degustacija'},
 {id:'wine-tasting-themed',name:'Tematska degustacija'},
 {id:'wine-tasting-private',name:'Privatna degustacija'}
]);
function ensureWineBookingContract(siteConfig){
 if(siteConfig?.business?.id!=='wine-shop'||!siteConfig.capabilities?.wineTastings)return;
 siteConfig.capabilities.booking={enabled:true,mode:'reservation',timingMode:'EXACT_TIME',fields:{service:true,date:true,time:true,partySize:true,note:true},offerings:WINE_TASTING_SERVICES.map(x=>x.name),services:WINE_TASTING_SERVICES.map(x=>({...x})),confirmation:'request'};
}
function ensureWelcomeFeaturedModule(siteConfig,enabled){
 if(!enabled||siteConfig?.modulePlan?.active?.includes('featured'))return;
 // Welcome is a V33 presentation of the first three truthful offer cards.
 // The module is therefore explicit in the project contract, including for
 // vertical profiles whose normal first section is portfolio or listings.
 const plan=siteConfig.modulePlan;
 const heroIndex=Math.max(0,plan.active.indexOf('hero'));
 plan.active.splice(heroIndex+1,0,'featured');
 const featured=plan.library?.find(module=>module.id==='featured');
 if(featured){featured.state='active';featured.available=true;delete featured.reason;}
}
function bookingProfile(siteConfig){
 const booking=siteConfig?.capabilities?.booking;
 if(!booking?.enabled)return null;
 const data=siteConfig.businessData||{},location=(data.locations||[])[0]||{};
 return {version:1,business:{name:siteConfig.business.name,phone:data.phone||'',email:data.email||'',
   city:location.city||data.city||'',address:location.address||data.address||'',hours:location.hours||data.hours||''},
   services:(booking.services||[]).map(service=>({id:service.id,name:service.name}))};
}

// Advisor-owned presentation preference; never write renderer details into fact-only Registry.
function normalizeLegacyBuildInput(input){
  return input?.style==='tech'?{...input,style:'modern'}:input;
}
export function buildSitePayload(input){
  input=normalizeLegacyBuildInput(input);
  const payload=baseSitePayload(input);
 // Public API callers cannot remove DEMO status; production is a separate trusted publishing workflow (V44).
 if(input?.siteMode==='production')throw new Error('Produkcioni izvoz zahteva odobren tok objavljivanja.');
  payload.siteConfig.businessData=resolveBusinessData(input,payload.siteConfig);
  // Keep the concise, authoritative Advisor decision with the generated site.
  // Build Requests must never reconstruct this from a partially-rendered page.
  payload.siteConfig.advisorContext={
   businessId:String(input?.businessId||payload.siteConfig.business?.id||'').slice(0,80),
   description:String(input?.description||'').trim().slice(0,800),
   goal:String(input?.goal||'').slice(0,80),
   style:String(input?.style||'').slice(0,80),
   businessMode:String(input?.answers?.businessMode||'').slice(0,100)
  };
 ensureWineBookingContract(payload.siteConfig);
 payload.siteConfig.bookingPairing=resolveBookingPairing(input?.bookingPairing); // optional public key; never a private key
 payload.siteConfig.contact={...(payload.siteConfig.contact||{}),phone:payload.siteConfig.businessData.phone}; // backward compatibility
 payload.siteConfig.siteMode='demo';
 payload.siteConfig.demoBrand=demoBrandFromEnvironment();
 const showWelcome=input?.answers?.showWelcome===true;
 payload.siteConfig.presentation={...(payload.siteConfig.presentation||{}),showWelcome};
 ensureWelcomeFeaturedModule(payload.siteConfig,showWelcome);
 payload.siteConfig.bookingProfile=bookingProfile(payload.siteConfig);
 // V46.0: Advisor is the authority; a Commerce-only shop has no fake services.
 const commerce=commerceFromSite(payload.siteConfig,payload.catalog);
 if(commerce){
  const data=payload.siteConfig.businessData||{},location=(data.locations||[])[0]||{};
  const business=payload.siteConfig.bookingProfile?.business||{
   name:payload.siteConfig.business.name,phone:data.phone||'',email:data.email||'',
   city:location.city||data.city||'',address:location.address||data.address||'',hours:location.hours||data.hours||''};
  payload.siteConfig.siteProfile={version:2,business,services:payload.siteConfig.bookingProfile?.services||[],commerce};
 }
 return payload;
}
