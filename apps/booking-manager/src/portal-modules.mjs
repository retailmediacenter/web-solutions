// Shared, data-only module detection. Future Commerce can enable orders here
// without making the Portal home or settings depend on a booking calendar.
export function portalModules(profile={}){
  const sourceServices=profile.siteProfile?profile.siteProfile.services:profile.services;
  return {booking:Array.isArray(sourceServices)&&sourceServices.length>0,orders:profile.siteProfile?.commerce?.enabled===true};
}

// Public Portal starts only with an actually connected site. Older local
// profiles remain in IndexedDB for backup/recovery, but must never look like
// an active business while Settings correctly asks for a pairing code.
export function activePortalProfileId(profiles=[],activeProfileId=''){
  if(profiles.some(profile=>profile?.id===activeProfileId&&profile?.queueConnection))return activeProfileId;
  return profiles.find(profile=>profile?.queueConnection)?.id||null;
}

export function activatePortalProfile(state,profile){
  return {...state,activeProfileId:profile.id,profiles:[...state.profiles,profile]};
}

// Remote revocation must succeed BEFORE calling this; calendar, services and local identity remain.
export function detachSiteConnection(profile){
 delete profile.queueConnection;
 delete profile.pushEnabledAt;
 return profile;
}
