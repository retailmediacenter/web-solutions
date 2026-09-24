import { getBusinessFacts } from './registry.js';
// Prvi MIGRACIONI TEST za 3 reprezentativna scenarija.
// Nije još kompletan V39.5 Advisor i ne sme se izvoziti kao produkcijski generator.
const pilot = new Set(['butcher-shop','wine-shop','shoe-shop']);
export function resolvePilotSiteConfig({businessId,businessName,answers={}}){
  if (!pilot.has(businessId)) throw new Error('Delatnost nije u pilot fazi.');
  const facts=getBusinessFacts(businessId);
  if (!facts) throw new Error('Nepoznata delatnost.');
  const name=String(businessName ?? '').trim();
  if (!name || name.length>100) throw new Error('Naziv firme mora imati 1–100 znakova.');
  const features = {};
  const modules = ['hero','featured','catalog'];
  if (businessId==='butcher-shop') {
    if (!['raw','grilled'].includes(answers.butcherGrillService)) throw new Error('Nedostaje odgovor o pripremi mesa.');
    features.butcherGrillService = answers.butcherGrillService==='grilled';
  }
  if (businessId==='wine-shop') {
    if (typeof answers.wineTastings !== 'boolean') throw new Error('Nedostaje odgovor o degustacijama.');
    features.wineTastings=answers.wineTastings;
    if (features.wineTastings) modules.push('wine-tasting');
  }
  modules.push('contact');
  return {schemaVersion:'41.0-pilot',business:{id:businessId,name},capabilities:features,modules,
    registryAssetRoot:facts.assetRoot,siteStatus:'preview-only'};
}
