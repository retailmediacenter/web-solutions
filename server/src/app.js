import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegistryCount } from './registry.js';
import { listBusinesses,recognizeBusiness,getAdvisorDefinition } from './advisor.js';
import { buildSitePayload } from './site.js';
import { renderHtml } from './render-site.js';
import { exportSiteZip } from './exporter.js';
export const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'40kb'}));
// A published Webglobe frontend requires CLIENT_ORIGIN=https://retailmediacenter.com
const origins=(process.env.CLIENT_ORIGIN||'').split(',').map(x=>x.trim().replace(/\/$/,'')).filter(Boolean);
app.use((req,res,next)=>{
  const origin=req.get('origin');
  if(origin&&origins.includes(origin)){
    res.set({'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});
  }
  if(req.method==='OPTIONS')return origins.includes(origin)?res.status(204).end():res.status(403).end();
  next();
});
app.get('/api/health',(_req,res)=>res.json({status:'ok',service:'rmc-web-solutions-api',stage:'v41.5-universal-booking',registryEntries:getRegistryCount(),export:true}));
app.get('/api/registry/basic',(_req,res)=>res.json({count:getRegistryCount(),businesses:listBusinesses()}));
app.get('/api/advisor/recognize',(req,res)=>res.json({businessId:recognizeBusiness(String(req.query.text||'').slice(0,800))}));
app.get('/api/advisor/questions/:id',(req,res)=>{
  try{res.json(getAdvisorDefinition(req.params.id));}catch(e){res.status(404).json({error:e.message});}
});
app.post('/api/advisor/resolve',(req,res)=>{
  try{const p=buildSitePayload(req.body||{});res.json({siteConfig:p.siteConfig});}
  catch(e){res.status(400).json({error:e.message});}
});
app.post('/api/site/generate',(req,res)=>{
  try{
    const payload=buildSitePayload(req.body||{});
    res.set('Cache-Control','no-store').json({...payload,previewHtml:renderHtml(payload)});
  }catch(e){res.status(400).json({error:e.message});}
});
const exportHits=new Map();
app.post('/api/site/export',(req,res)=>{
  const who=req.ip;const now=Date.now(),prior=(exportHits.get(who)||[]).filter(t=>now-t<60000);
  if(prior.length>=6)return res.status(429).json({error:'Sačekajte minut pre sledećeg izvoza.'});
  prior.push(now);exportHits.set(who,prior);
  // Avoid growing an unbounded in-memory map on the Free instance.
  if(exportHits.size>500){for(const [ip,times] of exportHits)if(times.every(t=>now-t>60000))exportHits.delete(ip);}
  try{
    const payload=buildSitePayload(req.body||{});
    const zip=exportSiteZip(payload);
    res.set({ 'Content-Type':'application/zip', 'Content-Disposition':'attachment; filename="rmc-demo-site.zip"', 'Cache-Control':'no-store', 'Content-Length':String(zip.length)}).end(zip);
  }catch(e){res.status(400).json({error:e.message});}
});
// Reference V39.5 is served read-only in local development only, NEVER on Render.
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const legacyRoot=path.resolve(process.env.LEGACY_ROOT||path.join(projectRoot,'..','web-solutions'));
if(process.env.NODE_ENV!=='production'&&existsSync(path.join(legacyRoot,'index.html'))){
  app.use('/legacy',express.static(legacyRoot));
  console.log('Read-only V39.5 reference:',legacyRoot);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000);
  app.listen(port,'0.0.0.0',()=>console.log('RMC API listening at http://localhost:'+port+'/api/health'));
}
