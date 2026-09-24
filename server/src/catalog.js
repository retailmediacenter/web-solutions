import pilotData from './data/pilot-catalog-v395.json' with {type:'json'};
import {PILOT_BUSINESSES} from './advisor.js';
export function getCatalog(id){
  if(!PILOT_BUSINESSES.includes(id))throw new Error('Katalog još nije migriran.');
  return structuredClone(pilotData[id]);
}
