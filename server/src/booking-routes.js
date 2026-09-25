import {Router} from 'express';
import {createBookingQueue} from './booking-queue.js';
export function bookingRouter(queue=createBookingQueue()){
 const router=Router();
 const hits=new Map();
 const rate=(req,res,next)=>{
  const now=Date.now(),ip=req.ip||'unknown',list=(hits.get(ip)||[]).filter(t=>t>now-60000);
  if(list.length>=20)return res.status(429).json({error:'Previše zahteva. Pokušajte za minut.'});
  list.push(now);hits.set(ip,list);
  if(hits.size>2000)for(const [k,v] of hits)if(v.every(t=>t<now-60000))hits.delete(k);
  next();
 };
 const handle=fn=>(req,res)=>Promise.resolve().then(()=>fn(req,res)).catch(e=>res.status(e.status||503).json({error:e.status?e.message:'Servis trenutno nije dostupan.'}));
 const auth=req=>(req.get('authorization')||'').replace(/^Bearer\s+/i,'');
 router.post('/pairings',rate,handle(async(req,res)=>res.status(201).json(await queue.issue())));
 router.post('/pairings/claim',rate,handle(async(req,res)=>res.json(await queue.claim(req.body?.pairingCode))));
 router.post('/requests',rate,handle(async(req,res)=>res.status(202).json(await queue.submit(req.body?.siteId,req.body?.booking))));
 router.get('/requests/:siteId',handle(async(req,res)=>res.json({requests:await queue.pending(req.params.siteId,auth(req))})));
 router.post('/requests/:siteId/:requestId/ack',handle(async(req,res)=>res.json(await queue.acknowledge(req.params.siteId,auth(req),req.params.requestId))));
 return router;
}
