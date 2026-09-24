import {SERVICE_BUSINESSES,resolveServiceSiteConfig} from './service-engine.js';
import {STYLES} from './advisor.js';
import {resolvePilotSiteConfig} from './advisor.js';
import {getCatalog} from './catalog.js';
export function buildSitePayload(input){
  if(SERVICE_BUSINESSES.includes(input?.businessId))return resolveServiceSiteConfig(input,STYLES);
  const siteConfig=resolvePilotSiteConfig(input);
  const catalog=getCatalog(siteConfig.business.id);
  // All preview/export content derives from this same payload.
  return {siteConfig,catalog};
}
