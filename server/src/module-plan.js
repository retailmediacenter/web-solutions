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
 // `active` means this generation has a real rendered section. It must never
 // say that the site has reviews, a team, or proof merely because the business
 // category normally benefits from them. Those records remain addable in the
 // Editor until RMC enters approved content.
 const active=['header','hero'];
 const rendererBlocks=['header','hero'];
 if(family==='retail'){
  active.push('catalog');
  rendererBlocks.push('catalog');
 }else if(family==='vertical'){
  const canonicalPrimary=primary==='projects'?'portfolio':primary==='catalog'?'catalog':'featured';
  active.push(canonicalPrimary);
  rendererBlocks.push(primary);
 }else{
  active.push('featured');
  rendererBlocks.push('services');
 }
 if(booking){active.push('booking');rendererBlocks.push('booking');}
 // The current vertical request form is part of the contact flow; it is not a
 // Booking section and therefore must not activate V40.
 if(request)rendererBlocks.push('request');
 active.push('location','contact');
 rendererBlocks.push('location','contact');
 const activeSet=new Set(unique(active));
 const library=MODULE_LIBRARY.map(module=>{
  const activeNow=activeSet.has(module.id);
  const locked=module.id==='booking'&&!booking || module.id==='catalog'&&family!=='retail'&&!commerce;
  return {...module,available:!locked,state:activeNow?'active':locked?'locked':'available',
    ...(locked?{reason:module.id==='booking'?'Business paket aktivira rezervacije.':'Commerce paket aktivira katalog i poručivanje.'}:{})};
 });
 return {
  version:'v1',
  library,
  active:unique(active),
  rendererBlocks:unique(rendererBlocks),
  entitlements:{booking:Boolean(booking),commerce:Boolean(commerce),request:Boolean(request)},
  source:'advisor'
 };
}
