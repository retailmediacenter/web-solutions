import {serviceProfile} from './service-engine.js';
import pilotData from './data/pilot-catalog-v395.json' with {type:'json'};
import retailData from './data/retail-catalog-v395.json' with {type:'json'};
import {PILOT_BUSINESSES} from './advisor.js';
export function getCatalog(id){
  if(!PILOT_BUSINESSES.includes(id))throw new Error('Katalog još nije migriran.');
  const source=pilotData[id]||retailData[id]||serviceProfile(id);
  return structuredClone(source);
}
