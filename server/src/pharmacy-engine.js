// V41.8.1: Pharmacy is a conditional shop + optional general product consultation.
// Decisions belong to Advisor; V39.5 Registry remains fact-only and unchanged.
import {getBusinessFacts} from './registry.js';
import {verticalProfile} from './vertical-engine.js';
export const PHARMACY_ORDERS='Porudžbine proizvoda za negu i dozvoljenog bezreceptnog asortimana';
export const PHARMACY_INFO='Katalog proizvoda i upiti o dostupnosti';
export const pharmacyOperations=Object.freeze([PHARMACY_ORDERS,PHARMACY_INFO]);
const supportedStyles=['traditional','modern','warm','tech','premium'];
const products=[
 {id:'pharmacy-vitamin-c',title:'Vitamin C — šumeće tablete',category:'Vitamini i dodaci',price:690,unit:'kom',step:1,image:'assets/images/curated/healthcare/pharmacy/products/pharmacy_product_vitamin_c_effervescent_01.jpg'},
 {id:'pharmacy-multivitamins',title:'Multivitaminski dodatak',category:'Vitamini i dodaci',price:1090,unit:'kom',step:1,image:'assets/images/curated/healthcare/pharmacy/products/pharmacy_product_daily_multivitamin_01.jpg'},
 {id:'pharmacy-skin-care',title:'Krema za negu kože',category:'Nega i higijena',price:1290,unit:'kom',step:1,image:'assets/images/curated/healthcare/pharmacy/products/pharmacy_product_face_cream_01.jpg'},
];
export function resolvePharmacySiteConfig({businessId,businessName,description='',answers={},style='modern',goal='visit'}={}){
 if(businessId!=='pharmacy')throw Error('Ovo nije profil apoteke.');
 const facts=getBusinessFacts('pharmacy'),legacy=verticalProfile('pharmacy');
 const name=String(businessName??'').trim();
 if(!name||name.length>100)throw Error('Naziv apoteke mora imati 1–100 znakova.');
 if(!supportedStyles.includes(style)||!['purchase','visit','catalog'].includes(goal))throw Error('Nepoznat cilj ili stil.');
 if(!pharmacyOperations.includes(answers.businessMode))throw Error('Izaberite način predstavljanja i poručivanja proizvoda.');
 if(typeof answers.pharmacyConsultations!=='boolean')throw Error('Odgovorite da li apoteka zaista nudi savetovanje.');
 const orders=answers.businessMode===PHARMACY_ORDERS;
 const consult=answers.pharmacyConsultations;
 const modules=['hero','featured','catalog',...(orders?['cart']:[]),...(consult?['pharmacy-consultation']:[]),'contact'];
 return {
  siteConfig:{schemaVersion:'41.8.1-pharmacy-hybrid',reference:'V39.5',siteStatus:'preview-and-export',
   business:{id:'pharmacy',name,label:'Apoteka'},
   input:{description:String(description).slice(0,800),goal,mode:answers.businessMode,emphasis:String(answers.emphasis||'')},
   style,modules,contact:{phone:String(answers.contactPhone??'').replace(/[^+\d\s()\-]/g,'').slice(0,35)},
   capabilities:{pharmacy:true,pharmacyConsultations:consult,commerce:orders,inquiry:true,variantNote:false,
     variantLabel:'Pakovanje / varijanta',requireVehicle:false,ordersOnlyPermittedRange:true,liveAvailability:false,payments:false},
   commerce:{mode:orders?'cart':'inquiry',currency:'RSD',prices:'illustrative-demo'},
   assets:{assetRoot:facts.assetRoot,assetRoles:[...facts.assetRoles]}},
  catalog:{id:'pharmacy',label:'Apoteka',category:'retail',hero:legacy.hero,
   headline:'Proizvodi i savetovanje na jednom mestu',
   subtitle:consult?'Izdvojena ponuda i mogućnost upita za opšte informacije o proizvodima.':'Izdvojena ponuda proizvoda i informacije o dostupnosti.',
   offerTitle:'Proizvodi za negu i dobrobit',products:structuredClone(products)}
 };
}
