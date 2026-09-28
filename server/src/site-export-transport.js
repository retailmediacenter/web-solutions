/* V46.2: A downloadable site gets one Site ID + one Portal pairing for every
   enabled, owner-approved inbound capability. Never put the pairing secret in HTML. */
const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
export async function attachPublicSiteTransport(payload,queue,{apiBaseUrl}={}){
 const site=payload?.siteConfig;
 if(!site?.capabilities)throw invalid('Neispravna konfiguracija sajta.');
 const booking=!!(site.capabilities.booking?.enabled&&site.bookingProfile?.services?.length);
 const commerce=!!(site.capabilities.commerce&&site.siteProfile?.commerce?.enabled);
 if(!booking&&!commerce)return null;
 if(site.bookingPairing)throw invalid('Stari kod za šifrovane linkove nije kompatibilan sa novim izvozom. Uklonite ga i ponovite izvoz.');
 if(typeof apiBaseUrl!=='string'||!apiBaseUrl)throw invalid('PUBLIC_API_BASE_URL nije konfigurisan.',503);
 let u;try{u=new URL(apiBaseUrl);}catch{throw invalid('Neispravna adresa javnog API-ja.',503);}
 if((u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))||u.username||u.password||u.pathname!=='/'||u.search||u.hash)
  throw invalid('Neispravna adresa javnog API-ja.',503);
 // V46.0 already builds one profile from Advisor, including BOTH modules.
 // Booking-only exports retain their previous profile and wire format.
 const profile=commerce?site.siteProfile:site.bookingProfile;
 const issued=await queue.issue(profile);
 const transport={siteId:issued.siteId,apiBaseUrl:u.origin};
 if(booking)site.bookingTransport={...transport};
 if(commerce)site.commerceTransport={...transport};
 return issued;
}
