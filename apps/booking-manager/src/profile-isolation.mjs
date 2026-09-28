// V46.5: only local profile isolation and explicit, scoped QA data reset.
// No remote state, pairing or IndexedDB schema changes.
const QA_SITE_IDS = new Set(["QseEDoCrhqdHvakxGvQ41J8i", "2Peu17pSgiZz9cl8TQbK6Z7i", "Z3Ehb3WYd2W721LUB4Y8DuHs", "-l0TtTRUAW1cilRuxl4Ib--a", "2JpwLJCPo9o8Bvp-r1owwqVz", "tXb77sBZPQMMQ97Yr6OPDUFE", "X2NQfB8OQ-16VZ0FVjfbahha", "lNGSp8wlzatOx-L9MbBoWtDZ", "CrTDzQPaTMljQoY5M---MUUc"]);
export const isCanonicalQaSite = siteId => QA_SITE_IDS.has(String(siteId||''));
export const boundSiteId = profile => profile?.boundSiteId || profile?.queueConnection?.siteId || null;

export function selectProfileForSite(state, siteId, businessName, makeProfile){
 if(!/^[A-Za-z0-9_-]{24}$/.test(siteId||'')) throw new Error('Neispravan SITE ID.');
 const found=state.profiles.find(p=>boundSiteId(p)===siteId);
 if(found){
  // Do not move or rewrite data belonging to a different firm.
  state.activeProfileId=found.id;
  found.boundSiteId=siteId;
  return found;
 }
 // Even if the old site was disconnected, never overwrite its bookings
 // with the name/services of a newly paired company.
 const next=makeProfile(businessName);
 next.services=[];
 next.boundSiteId=siteId;
 state.profiles.push(next);
 state.activeProfileId=next.id;
 return next;
}
export const profileDataCounts=(state,id)=>({
 bookings:state.bookings.filter(b=>b.profileId===id).length,
 orders:(state.orders||[]).filter(o=>o.profileId===id).length
});
export function clearOnlyCurrentQaData(state,profileId){
 const p=state.profiles.find(x=>x.id===profileId);
 if(!p || !isCanonicalQaSite(boundSiteId(p))) throw new Error('Brisanje je dostupno samo za jedan od devet QA sajtova.');
 // For already contaminated QA profiles, remove inherited services from
 // another company as well. Preserve the current site's mapped services,
 // their local durations, and all owner credentials/settings.
 const siteServices=Array.isArray(p.siteProfile?.services)?p.siteProfile.services:null;
 const sourceNames=new Map((siteServices||[]).map(s=>[s.id,s.name]));
 const profile=siteServices?{...p,services:p.services.filter(s=>sourceNames.has(s.siteServiceId))
  .map(s=>({...s,name:sourceNames.get(s.siteServiceId)}))}:p;
 return {...state,
   profiles:state.profiles.map(x=>x.id===profileId?profile:x),
   bookings:state.bookings.filter(b=>b.profileId!==profileId),
   orders:(state.orders||[]).filter(o=>o.profileId!==profileId)};
}
