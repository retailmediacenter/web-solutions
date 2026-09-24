import {resolvePilotSiteConfig} from './advisor.js';
import {getCatalog} from './catalog.js';
export function buildSitePayload(input){
  const siteConfig=resolvePilotSiteConfig(input);
  const catalog=getCatalog(siteConfig.business.id);
  // All preview/export content derives from this same payload.
  return {siteConfig,catalog};
}
