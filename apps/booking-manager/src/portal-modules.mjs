// Shared, data-only module detection. Future Commerce can enable orders here
// without making the Portal home or settings depend on a booking calendar.
export function portalModules(profile={}){
  return {booking:Array.isArray(profile.services)&&profile.services.length>0,orders:false};
}

// Older local backups may contain several profiles. Keep the last active
// profile whenever possible; the remaining profiles stay intact as legacy
// local data and are no longer exposed by the one-business Portal UI.
export function activePortalProfileId(profiles=[],activeProfileId=''){
  if(profiles.some(profile=>profile?.id===activeProfileId))return activeProfileId;
  return profiles.find(profile=>profile?.queueConnection)?.id||profiles[0]?.id||null;
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
