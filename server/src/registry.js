import { readFileSync } from 'node:fs';
const baseRegistry=JSON.parse(readFileSync(new URL('./data/business-registry-v1.json', import.meta.url), 'utf-8'));
const expansionRegistry=JSON.parse(readFileSync(new URL('./data/industry-expansion-registry-v49.json', import.meta.url), 'utf-8'));
const registry = Object.freeze({...baseRegistry,...expansionRegistry});
export function getBusinessFacts(id) {return registry[id] || null;}
export function getRegistryCount(){return Object.keys(registry).length;}
export function listRegistryBasics(){return Object.entries(registry).map(([id,{domain}])=>({id, domain}));}
