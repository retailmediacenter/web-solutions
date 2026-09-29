import {Router} from 'express';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {exportSiteZip} from './exporter.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&timingSafeEqual(Buffer.from(hash(a),'hex'),Buffer.from(hash(b),'hex'));
const active=()=>String(process.env.RMC_ADMIN_KEY||'').length>=32;
const origins=()=>String(process.env.CLIENT_ORIGIN||'').split(',').map(x=>x.trim().replace(/\/$/,'')).filter(Boolean);
const trusted=req=>{const origin=req.get('origin');return !origin||origins().includes(origin)||(process.env.NODE_ENV!=='production'&&/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin));};

export function adminRouter(projects,{now=Date.now}={}){
 const router=Router(),sessions=new Map(),failed=new Map();
 const valid=token=>{const until=sessions.get(hash(token||''));if(!until||until<=now()){sessions.delete(hash(token||''));return false;}return true;};
 const auth=req=>(req.get('authorization')||'').replace(/^Bearer\s+/i,'');
 router.use((req,res,next)=>{res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});if(!active())return res.status(404).json({error:'Administracija nije dostupna.'});if(!trusted(req))return res.status(403).json({error:'Pristup odbijen.'});next();});
 router.post('/session',(req,res)=>{
  const ip=req.ip||'unknown',entry=failed.get(ip);if(entry?.until>now()&&entry.count>=5)return res.status(429).json({error:'Previše pokušaja. Pokušajte kasnije.'});
  if(!same(auth(req),process.env.RMC_ADMIN_KEY)){const next=entry?.until>now()?entry:{count:0,until:now()+15*60*1000};next.count++;failed.set(ip,next);return res.status(403).json({error:'Pristup odbijen.'});}
  failed.delete(ip);const token='a_'+randomBytes(32).toString('base64url'),expiresAt=now()+4*60*60*1000;sessions.set(hash(token),expiresAt);return res.status(201).json({sessionToken:token,expiresAt:new Date(expiresAt).toISOString()});
 });
  router.use((req,res,next)=>valid(auth(req))?next():res.status(401).json({error:'Administratorska sesija je istekla.'}));
  router.get('/projects/:siteId',(req,res,next)=>projects.summary(req.params.siteId).then(project=>res.json({project})).catch(next));
  router.post('/projects/:siteId/activate',(req,res,next)=>projects.activate(req.params.siteId,req.body?.package).then(result=>res.status(201).json(result)).catch(next));
  router.post('/projects/:siteId/activated-export',async(req,res,next)=>{
   try{
    const result=await projects.activateExport(req.params.siteId,req.body?.package,process.env.PUBLIC_API_BASE_URL);
    const zip=exportSiteZip(result.payload);
    res.set({'Content-Type':'application/zip','Content-Disposition':'attachment; filename="rmc-aktivirani-sajt.zip"','Cache-Control':'no-store','Content-Length':String(zip.length),'X-RMC-Booking-Code':result.pairingCode,'X-RMC-Booking-Expires':String(result.expiresIn)}).status(201).end(zip);
   }catch(error){next(error);}
  });
  router.use((error,_req,res,_next)=>res.status(error?.status||503).json({error:error?.message||'Administrativna operacija nije uspela.'}));
  return router;
}
