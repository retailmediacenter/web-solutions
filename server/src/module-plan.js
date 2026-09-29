// Canonical V31–V42 module contract. The Advisor selects an initial plan;
// the renderer and Editor must both consume this same record.
export const MODULE_LIBRARY=Object.freeze([
 {id:'header',version:'V31',label:'Header / Menu',tier:'core'},
 {id:'hero',version:'V32',label:'Hero',tier:'core'},
 {id:'featured',version:'V33',label:'Izdvajamo',tier:'content'},
 {id:'catalog',version:'V34',label:'Katalog / Shop-lite',tier:'commerce'},
 {id:'portfolio',version:'V35',label:'Portfolio / Projekti',tier:'content'},
 {id:'trust',version:'V36',label:'Trust / Proof',tier:'content'},
 {id:'reviews',version:'V37',label:'Utisci / Reviews',tier:'content'},
 {id:'about',version:'V38',label:'O nama / Tim',tier:'content'},
 {id:'faq',version:'V39',label:'FAQ',tier:'content'},
 {id:'booking',version:'V40',label:'Booking / Rezervacija',tier:'business'},
 {id:'location',version:'V41',label:'Lokacija / Mapa / Telefon',tier:'core'},
 {id:'contact',version:'V42',label:'Kontakt / Upit / Ponuda',tier:'core'}
]);

const known=new Set(MODULE_LIBRARY.map(module=>module.id));
const unique=items=>[...new Set(items.filter(item=>known.has(item)))];

/**
 * The plan is deliberately separate from the renderer. It records what the
 * Advisor selected and gives the Editor a stable vocabulary. A module only
 * becomes active when its renderer has actual data; no review, team member or
 * business claim is invented from a generic industry label.
 */
export function createModulePlan({family='service',primary='services',booking=false,commerce=false,request=false}={}){
 const shared=['header','hero','featured','trust','portfolio','reviews','about','faq','location','contact'];
 const active=family==='retail'
   ?['header','hero','featured','catalog','trust','portfolio','reviews','about','faq','location','contact']
   :family==='vertical'
     ?['header','hero','featured',primary,'portfolio','trust','reviews','about','faq','location','contact']
     :['header','hero','featured','services','portfolio','trust','reviews','about','faq','location','contact'];
 // `services` and vertical primary blocks are renderer-specific aliases. They
 // are recorded in the plan but library modules remain V31–V42 canonical.
 const canonical=active.map(id=>id==='services'||id===primary&&family==='vertical'?'featured':id);
 if(booking)canonical.splice(canonical.indexOf('location'),0,'booking');
 if(commerce&&!canonical.includes('catalog'))canonical.splice(canonical.indexOf('location'),0,'catalog');
 return {
  version:'v1',
  library:MODULE_LIBRARY.map(({id,version,label,tier})=>({id,version,label,tier,available:true})),
  active:unique(canonical),
  rendererBlocks:unique(active.filter(id=>known.has(id))).concat(active.filter(id=>id==='services'||(family==='vertical'&&id===primary))),
  entitlements:{booking:Boolean(booking),commerce:Boolean(commerce),request:Boolean(request)},
  source:'advisor'
 };
}
