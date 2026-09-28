/* V46.0: The Advisor/Node export owns catalog facts. The browser never
   authorizes a price, product ID, unit, or permitted variant. */
const fail=message=>{const e=new Error(message);e.status=400;throw e;};
const trimmed=(v,max)=>String(v??'').trim().slice(0,max);
const validId=id=>/^[A-Za-z0-9:_-]{2,120}$/.test(id);
const units=new Set(['kom','kg','par']);
const rounded=value=>Math.round(value*100)/100;
export function normalizeCommerceProfile(raw){
 if(raw==null)return null;
 if(raw?.enabled!==true || !Array.isArray(raw.products) || !raw.products.length || raw.products.length>500)fail('Neispravan Commerce profil sajta.');
 const used=new Set();
 const products=raw.products.map(p=>{
  const id=trimmed(p?.id,120),name=trimmed(p?.name,100),unit=trimmed(p?.unit||'kom',10);
  const price=Number(p?.price),step=Number(p?.step??(unit==='kg'?.5:1));
  if(!validId(id)||!name||used.has(id)||!units.has(unit)||!Number.isFinite(price)||price<0||price>10000000||!Number.isFinite(step)||step<=0||step>50||rounded(step)!==step)fail('Neispravan proizvod u Commerce profilu.');
  used.add(id);
  const image=trimmed(p?.image,260);
  if(image && (!/^assets\/[A-Za-z0-9/_-]+\.(jpg|jpeg|png|webp)$/i.test(image)||image.includes('..')))fail('Neispravna putanja slike proizvoda.');
  return {id,name,unit,price:rounded(price),step,image,
   allowPreparation:p?.allowPreparation===true,allowSize:p?.allowSize===true,
   allowVariant:p?.allowVariant===true,requireVariant:p?.requireVariant===true};
 });
 return {enabled:true,currency:'RSD',prices:'indicative',products};
}
export function commerceFromSite(siteConfig,catalog){
 if(!siteConfig?.capabilities?.commerce||!Array.isArray(catalog?.products)||!catalog.products.length)return null;
 const caps=siteConfig.capabilities,shoe=siteConfig.business?.id==='shoe-shop';
 return normalizeCommerceProfile({enabled:true,products:catalog.products.map(p=>({
  id:p.id,name:p.title,unit:p.unit||'kom',price:p.price,step:p.step??(p.unit==='kg'?.5:1),image:p.image,
  allowPreparation:caps.butcherGrillService===true&&p.grillable===true,
  allowSize:shoe,allowVariant:caps.variantNote===true,requireVariant:caps.requireVehicle===true
 }))});
}
