/* Dev/staging-only scenarios. The single source of site functionality remains
   server/src/site.js + server/src/exporter.js. These public values are FIXED
   QA identities, NOT owner pairing codes or API credentials. Never change them
   after pairing; do not use them for real customers. */
export const scenarios=Object.freeze([
 {slug:'minimarket',siteId:'QseEDoCrhqdHvakxGvQ41J8i',businessId:'grocery-store',name:'Minimarket Komšiluk',category:'commerce',label:'Minimarket',expect:{commerce:true,booking:false}},
 {slug:'butik',siteId:'2Peu17pSgiZz9cl8TQbK6Z7i',businessId:'fashion-shop',name:'Butik Linija',category:'commerce',label:'Modni butik',expect:{commerce:true,booking:false}},
 {slug:'auto-servis',siteId:'Z3Ehb3WYd2W721LUB4Y8DuHs',businessId:'auto-service',name:'Auto Fokus',category:'day-part',label:'Auto-servis',expect:{commerce:false,booking:true,timingMode:'DAY_PART'}},
 {slug:'vodoinstalater',siteId:'-l0TtTRUAW1cilRuxl4Ib--a',businessId:'plumber',name:'Vodoinstalater Plus',category:'day-part',label:'Vodoinstalater',expect:{commerce:false,booking:true,timingMode:'DAY_PART'}},
 {slug:'vinoteka',siteId:'2JpwLJCPo9o8Bvp-r1owwqVz',businessId:'wine-shop',name:'Vino i Fino',category:'combined',label:'Vinoteka i degustacije',expect:{commerce:true,booking:true,timingMode:'EXACT_TIME',wineTastings:true}},
 {slug:'mesara',siteId:'tXb77sBZPQMMQ97Yr6OPDUFE',businessId:'butcher-shop',name:'Mesara Domaća',category:'combined',label:'Mesara i posebna priprema',expect:{commerce:true,booking:false,butcherGrillService:true}},
 {slug:'frizer',siteId:'X2NQfB8OQ-16VZ0FVjfbahha',businessId:'hair-salon',name:'Studio Forma',category:'exact-time',label:'Frizerski salon',expect:{commerce:false,booking:true,timingMode:'EXACT_TIME'}},
 {slug:'restoran',siteId:'lNGSp8wlzatOx-L9MbBoWtDZ',businessId:'restaurant',name:'Pica i Društvo',category:'exact-time',label:'Restoran',expect:{commerce:false,booking:true,timingMode:'EXACT_TIME'}},
 {slug:'konsultant',siteId:'CrTDzQPaTMljQoY5M---MUUc',businessId:'consultant',name:'Poslovni Konsultant',category:'exact-time',label:'Poslovni konsultant',expect:{commerce:false,booking:true,timingMode:'EXACT_TIME'}}
]);
export const categories=Object.freeze([
 {id:'commerce',title:'Katalog i porudžbine',description:'Korpa, proizvod i priprema porudžbine — bez automatske naplate.'},
 {id:'day-part',title:'Usluge — izbor dela dana',description:'Datum i prepodne/popodne bez izmišljanja preciznog termina.'},
 {id:'combined',title:'Kombinovane funkcije',description:'Vinoteka: porudžbine + degustacije. Mesara: porudžbine + posebna priprema (nije Booking).'},
 {id:'exact-time',title:'Rezervacije — datum i vreme',description:'Demonstracioni rezervacioni formulari; nisu povezani sa stvarnim vlasničkim nalogom.'}
]);

// Reuse the EXACT Advisor and renderer inputs between the public QA build and
// the PRIVATE staging-only re-pairing API; no hand-maintained duplicate profile.
import {buildSitePayload} from '../../server/src/site.js';
import {getAdvisorDefinition} from '../../server/src/advisor.js';
import {bookingQuestionId} from '../../server/src/service-engine.js';
export function buildQaPayload(s){
 const def=getAdvisorDefinition(s.businessId);
 const answer={businessMode:def.operation.options[0],emphasis:def.emphasis.options[0],
  hybridChoice:'none',ordersEnabled:true,
  ...(s.businessId==='wine-shop'?{wineTastings:true}:{}),
  ...(s.businessId==='butcher-shop'?{butcherGrillService:'grilled'}:{})};
 if(s.expect.booking)answer[bookingQuestionId(s.businessId)]=true;
 return buildSitePayload({businessId:s.businessId,businessName:s.name,
  description:`Testni primer — ${s.label}`,goal:'purchase',style:'modern',answers:answer,
  businessData:{businessName:s.name,locationMode:'physical',city:'Beograd',address:'Primer adrese 1',
   phone:'',email:'',hours:'',website:'',whatsapp:'',viber:'',locations:[]}});
}
