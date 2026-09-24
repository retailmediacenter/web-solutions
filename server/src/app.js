import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegistryCount, listRegistryBasics } from './registry.js';
import { resolvePilotSiteConfig } from './advisor.js';
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'32kb'}));
const allowedOrigin=process.env.CLIENT_ORIGIN;
if(allowedOrigin){
  app.use((req,res,next)=>{
    const origin=req.get('origin');
    if(origin && origin===allowedOrigin){res.header('Access-Control-Allow-Origin',allowedOrigin);res.header('Vary','Origin');res.header('Access-Control-Allow-Headers','Content-Type');res.header('Access-Control-Allow-Methods','GET,POST,OPTIONS');}
    if(req.method==='OPTIONS') return res.status(204).end();
    next();
  });
}
app.get('/api/health',(req,res)=>res.json({status:'ok',service:'rmc-web-solutions-api',stage:'migration-foundation',registryEntries:getRegistryCount()}));
app.get('/api/registry/basic',(req,res)=>res.json({count:getRegistryCount(),businesses:listRegistryBasics()}));
app.post('/api/advisor/resolve',(req,res)=>{
  try { res.json({siteConfig:resolvePilotSiteConfig(req.body || {})}); }
  catch(err){ res.status(400).json({error:err.message}); }
});
// Legacy V39.5 reference is read-only and served only in local dev, never on Render.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const legacyRoot=path.resolve(process.env.LEGACY_ROOT || path.join(root,'..','web-solutions'));
if(process.env.NODE_ENV!=='production' && existsSync(path.join(legacyRoot,'index.html'))){
  app.use('/legacy',express.static(legacyRoot));
  console.log('Read-only legacy V39.5:',legacyRoot);
} else if(process.env.NODE_ENV!=='production') {
  console.warn('Legacy reference unavailable:',legacyRoot);
}
const port=Number(process.env.PORT||3000);
app.listen(port,'0.0.0.0',()=>console.log(`RMC API listening at http://localhost:${port}/api/health`));
