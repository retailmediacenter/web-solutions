/* V44 B4 STAGING ONLY: authenticated, short-lived QA session. The static
   Preview never receives the administrator key, and never mints codes locally.
   Existing origin-less private BAT route remains a rollback fallback. */
import {Router} from 'express';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {createBookingQueue} from './booking-queue.js';
import {scenarios,buildQaPayload} from '../../scripts/publication/scenarios.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&timingSafeEqual(
 Buffer.from(hash(a),'hex'),Buffer.from(hash(b),'hex'));
const SESSION_TTL=4*60*60*1000;
const LOCK_WINDOW=15*60*1000;
const QA_PREVIEW_ORIGIN='https://retailmediacenter.github.io';
const active=()=>process.env.RMC_QA_MODE==='1'&&(process.env.RMC_QA_ADMIN_KEY||'').length>=32;
// Browser calls only from our staging Preview origin, not other CLIENT_ORIGIN
// entries such as marketing / production websites. Origin-less CLI is private
// backward compatibility and still requires a strong administrator secret.
const trustedOrigin=req=>{
 const origin=req.get('origin');
 return !origin||origin===QA_PREVIEW_ORIGIN||
  (process.env.NODE_ENV!=='production'&&/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin));
};
export function qaRouter(queue=createBookingQueue(),{now=Date.now}={}){
 const r=Router();
 // In-memory staging process sessions are deliberately invalidated on deploy.
 // There is no account, cookie, key in a URL or long-lived client secret.
 const sessions=new Map();
 const failed=new Map();
 const findSession=token=>{
  if(typeof token!=='string'||!/^q_[A-Za-z0-9_-]{43}$/.test(token))return false;
  const digest=hash(token),expires=sessions.get(digest);
  if(!expires)return false;
  if(expires<=now()){sessions.delete(digest);return false;}
  return true;
 };
 const prune=()=>{
  for(const [id,until] of sessions)if(until<=now())sessions.delete(id);
  for(const [ip,entry] of failed)if(entry.until<=now())failed.delete(ip);
 };
 r.use((req,res,next)=>{
  res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  if(!active())return res.status(404).json({error:'Nije dostupno.'});
  if(!trustedOrigin(req))return res.status(403).json({error:'Pristup odbijen.'});
  prune();next();
 });
 r.post('/session',(req,res)=>{
  const ip=req.ip||'unknown',bad=failed.get(ip);
  if(bad&&bad.count>=5&&bad.until>now())return res.status(429).json({error:'Previše pokušaja. Pokušaj kasnije.'});
  const candidate=(req.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!candidate||!same(candidate,process.env.RMC_QA_ADMIN_KEY)){
   const entry=bad&&bad.until>now()?bad:{count:0,until:now()+LOCK_WINDOW};
   entry.count++;failed.set(ip,entry);
   // Bound the per-process throttle map even if many addresses are sent.
   if(failed.size>1000)failed.delete(failed.keys().next().value);
   return res.status(403).json({error:'Pristup odbijen.'});
  }
  failed.delete(ip);
  const token='q_'+randomBytes(32).toString('base64url');
  const expiresAt=now()+SESSION_TTL;
  sessions.set(hash(token),expiresAt);
  if(sessions.size>100) sessions.delete(sessions.keys().next().value);
  return res.status(201).json({sessionToken:token,expiresAt:new Date(expiresAt).toISOString()});
 });
 r.delete('/session',(req,res)=>{
  const token=(req.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!findSession(token))return res.status(401).json({error:'QA sesija je istekla.'});
  sessions.delete(hash(token));return res.status(204).end();
 });
 r.post('/pairing/:slug',async(req,res)=>{
  const token=(req.get('authorization')||'').replace(/^Bearer\s+/i,'');
  // The original QA BAT may continue to work only as an origin-less private
  // fallback; a browser must always present the temporary QA session token.
  const valid=findSession(token)||(!req.get('origin')&&same(token,process.env.RMC_QA_ADMIN_KEY));
  if(!valid)return res.status(403).json({error:'QA sesija je istekla ili pristup nije dozvoljen.'});
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
