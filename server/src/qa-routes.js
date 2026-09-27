/* V44 QA ONLY: one-time pairing for an existing fixed public QA site ID.
   No frontend bundle or GitHub Pages artifact contains RMC_QA_ADMIN_KEY. */
import {Router} from 'express';
import {createHash,timingSafeEqual} from 'node:crypto';
import {createBookingQueue} from './booking-queue.js';
import {scenarios,buildQaPayload} from '../../scripts/publication/scenarios.mjs';
const hash=s=>createHash('sha256').update(s).digest();
export function qaRouter(queue=createBookingQueue()){
 const r=Router();
 r.post('/pairing/:slug',async(req,res)=>{
  res.set('Cache-Control','no-store');
  const secret=process.env.RMC_QA_ADMIN_KEY||'';
  if(process.env.RMC_QA_MODE!=='1'||secret.length<32)return res.status(404).json({error:'Nije dostupno.'});
  const incoming=(req.get('authorization')||'').replace(/^Bearer\s+/i,'');
  // Uniform error avoids revealing which code/scenario exists.
  if(!incoming||!timingSafeEqual(hash(incoming),hash(secret)))return res.status(403).json({error:'Pristup odbijen.'});
  const s=scenarios.find(x=>x.slug===req.params.slug&&x.expect.booking);
  if(!s)return res.status(404).json({error:'Nije dostupan Booking za ovaj testni scenario.'});
  try{
   const p=buildQaPayload(s);
   if(!p.siteConfig.bookingProfile)throw Error('Nedostaje izvorni Booking profil.');
   const result=await queue.issue(p.siteConfig.bookingProfile,{siteId:s.siteId});
   return res.status(201).json({...result,scenario:s.slug});
  }catch(e){return res.status(e.status||503).json({error:'Nije moguće izdati novi QA kod.'});}
 });
 return r;
}
