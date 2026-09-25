// V41.5 service capability matrix is an Advisor concern, not part of Business Registry.
// Rendering never decides which booking mode a business should use.
import services from './data/service-profiles-v395.json' with {type:'json'};
import {getBusinessFacts} from './registry.js';
export const SERVICE_BUSINESSES=Object.freeze(Object.keys(services));
export const BOOKING_MODES=Object.freeze(['appointment','reservation','consultation','request-slot']);
export const serviceProfile=id=>services[id]||null;
export function bookingQuestionId(id){
  if(id==='optician')return 'eyeExamAppointments';
  if(id==='restaurant'||id==='cafe')return 'tableReservations';
  if(id==='kids-playroom'||id==='event-venue'||id==='catering')return 'eventReservations';
  return 'acceptsTimeRequests';
}
export function getServiceSpecial(id){
  const profile=serviceProfile(id);if(!profile)return null;
  return {id:bookingQuestionId(id),question:profile.question,
    options:[{id:'yes',label:profile.options[0]},{id:'no',label:profile.options[1]}]};
}
const useVehicle=new Set(['auto-service','tire-shop']);
const useLocation=new Set(['appliance-repair','hvac','plumber','electrician','carpenter','painter','tiler',
  'catering','cleaning','locksmith','moving','it-support','security-systems']);
const useIssue=new Set(['auto-service','tire-shop','appliance-repair','hvac','plumber','electrician','repair-phone','carpenter','painter','tiler',
  'cleaning','locksmith','moving','it-support','security-systems']);
const useEventType=new Set(['kids-playroom','event-venue','catering']);
export function bookingFields(id,mode){
  const fields={service:true,date:true,time:true,partySize:false,locationMode:false,vehicle:false,location:false,destination:false,issue:false,eventType:false,note:true};
  if(mode==='reservation')fields.partySize=true;
  if(mode==='reservation'&&useEventType.has(id))fields.eventType=true;
  if(id==='catering')fields.location=true;
  if(id==='moving')fields.destination=true;
  if(mode==='consultation')fields.locationMode=true;
  if(mode==='request-slot'){
    fields.time=false; // A preferred daypart is honest when availability is unknown.
    fields.daypart=true;
    fields.vehicle=useVehicle.has(id);
    fields.location=useLocation.has(id);
    fields.issue=useIssue.has(id);
  }
  return fields;
}
export function resolveServiceSiteConfig(input,STYLES){
  const {businessId,businessName,description='',answers={},style='modern',goal='purchase'}=input||{};
  const source=serviceProfile(businessId),facts=getBusinessFacts(businessId);
  if(!source||!facts)throw new Error('Uslužna delatnost nije migrirana.');
  const name=String(businessName??'').trim();
  if(!name||name.length>100)throw new Error('Naziv firme mora imati 1–100 znakova.');
  if(!STYLES.some(x=>x.id===style))throw new Error('Nepoznat stil.');
  if(!['purchase','visit','catalog'].includes(goal))throw new Error('Nepoznat cilj sajta.');
  const answerId=bookingQuestionId(businessId),enabled=answers[answerId];
  if(typeof enabled!=='boolean')throw new Error('Odgovorite na pitanje o terminima ili rezervacijama.');
  const profile=structuredClone(source);
  if(businessId==='optician'&&!enabled){
    profile.headline='Okviri i izbor koji vam odgovaraju.';
    profile.subtitle='Istražite naš izbor okvira i kontaktirajte optiku za dodatne informacije.';
    profile.services=profile.services.filter(s=>!s.title.toLowerCase().includes('pregled'));
    // No exam was offered. Contact form must not advertise an exam either.
    profile.offerings=[...new Set(profile.services.map(s=>s.title)),'Opšti upit'];
  }
  if(businessId==='restaurant'&&/picerij|pizza|pizz/i.test(description)){
    profile.headline='Picerija za pravi trenutak.';
    profile.subtitle='Istražite našu ponudu i pošaljite zahtev za rezervaciju stola.';
  }
  const modules=['hero','services',...(enabled?['booking']:[]),'contact'];
  const cleanPhone=String(answers.contactPhone??'').replace(/[^+\d\s()\-]/g,'').slice(0,35);
  const mode=enabled?source.mode:'contact';
  // The same offerings drive the public form and the Manager bootstrap. Catalog
  // IDs are stable where available; the ordered fallback covers an offering that
  // intentionally has no separate presentation card.
  const bookingServices=profile.offerings.map((name,index)=>{
    const card=profile.services.find(service=>service.title===name);
    return {id:card?.id||`${businessId}-booking-${index+1}`,name};
  });
  return {
    siteConfig:{
      schemaVersion:'41.6-service-and-hybrid-migration',reference:'V39.5',siteStatus:'preview-and-export',
      business:{id:businessId,name,label:source.label},
      input:{description:String(description).slice(0,800),goal,
        mode:source.mode,emphasis:typeof answers.emphasis==='string'?answers.emphasis:''},
      style,modules,contact:{phone:cleanPhone},
      capabilities:{serviceProfile:true,bookingEnabled:enabled,bookingMode:mode,
        booking:{enabled,mode,fields:enabled?bookingFields(businessId,source.mode):{service:true,note:true},
          offerings:profile.offerings,services:bookingServices,confirmation:'request'}},
      assets:{assetRoot:facts.assetRoot,assetRoles:[...(facts.assetRoles||[])]}
    },
    catalog:{type:'services',id:businessId,hero:profile.hero,headline:profile.headline,
      subtitle:profile.subtitle,offerTitle:profile.offerTitle,services:profile.services}
  };
}
