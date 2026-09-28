/* V46.0: Same SITE ID + owner access token as Booking; separate order inbox. */
import {Router} from 'express';
import {createBookingQueue} from './booking-queue.js';
import {createCommerceQueue} from './commerce-queue.js';
import {createPushNotifications,NOTIFICATION_TYPES} from './push-notifications.js';
export function commerceRouter(bookingQueue=createBookingQueue(),push=createPushNotifications(bookingQueue.redis)){
 const router=Router(),queue=createCommerceQueue(bookingQueue),hits=new Map();
 const handle=fn=>(req,res)=>Promise.resolve().then(()=>fn(req,res)).catch(error=>res.status(error.status||503).json({error:error.status?error.message:'Servis trenutno nije dostupan.'}));
 const auth=req=>(req.get('authorization')||'').replace(/^Bearer\s+/i,'');
 router.post('/orders',(req,res,next)=>{
  const ip=req.ip||'unknown',now=Date.now(),valid=(hits.get(ip)||[]).filter(t=>now-t<60000);
  if(valid.length>=20)return res.status(429).json({error:'Previše zahteva. Pokušajte kasnije.'});
  valid.push(now);hits.set(ip,valid);
  if(hits.size>2000)for(const [k,v] of hits)if(v.every(t=>now-t>60000))hits.delete(k);
  next();
 },handle(async(req,res)=>{
  const result=await queue.submit(req.body?.siteId,req.body?.order);res.status(202).json(result);
  if(!result.duplicate)void push.notify(req.body?.siteId,{type:NOTIFICATION_TYPES.ORDER,requestId:result.requestId,title:'Nova porudžbina',body:'Otvorite Business Portal da pregledate zahtev.'}).catch(()=>{});
 }));
 router.get('/orders/:siteId',handle(async(req,res)=>res.json({orders:await queue.pending(req.params.siteId,auth(req))})));
 router.post('/orders/:siteId/:requestId/ack',handle(async(req,res)=>res.json(await queue.acknowledge(req.params.siteId,auth(req),req.params.requestId))));
 return router;
}
