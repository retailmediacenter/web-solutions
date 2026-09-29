import {Router} from 'express';
import {createBookingQueue} from './booking-queue.js';
import {createPushNotifications,NOTIFICATION_TYPES} from './push-notifications.js';
export function bookingRouter(queue=createBookingQueue(),push=createPushNotifications(queue.redis)){
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
 router.post('/pairings/claim',rate,handle(async(req,res)=>res.json(await queue.claim(req.body?.pairingCode))));
 router.post('/requests',rate,handle(async(req,res)=>{
  const result=await queue.submit(req.body?.siteId,req.body?.booking);res.status(202).json(result);
  // Never block or fail the reservation when a push provider is unavailable.
  if(!result.duplicate)void push.notify(req.body?.siteId,{type:NOTIFICATION_TYPES.BOOKING,requestId:result.requestId,title:'Nova rezervacija',body:'Otvorite Booking Manager da pregledate zahtev.'}).catch(()=>{});
 }));
 router.delete('/connections/:siteId',handle(async(req,res)=>res.json(await queue.disconnect(req.params.siteId,auth(req)))));
 router.get('/requests/:siteId',handle(async(req,res)=>res.json({requests:await queue.pending(req.params.siteId,auth(req))})));
 router.post('/requests/:siteId/:requestId/ack',handle(async(req,res)=>res.json(await queue.acknowledge(req.params.siteId,auth(req),req.params.requestId))));
 router.get('/push/public-key/:siteId',handle(async(req,res)=>res.json(await push.publicKey(req.params.siteId,auth(req),queue.authenticate))));
 router.post('/push/subscriptions/:siteId',handle(async(req,res)=>res.status(201).json(await push.subscribe(req.params.siteId,auth(req),req.body?.subscription,queue.authenticate))));
 return router;
}
