import {createHash,createHmac,randomBytes} from 'node:crypto';

const allowedTypes=new Set(['image/jpeg','image/png','image/webp']);
const allowedRoles=new Set(['hero','product','category','trust']);
const clean=value=>String(value??'').trim();
const sha=value=>createHash('sha256').update(value).digest('hex');
const hmac=(key,value)=>createHmac('sha256',key).update(value).digest();
const encode=value=>encodeURIComponent(value).replace(/[!'()*]/g,char=>`%${char.charCodeAt(0).toString(16).toUpperCase()}`);
const nowStamp=()=>{const date=new Date();const full=date.toISOString().replace(/[:-]|\.\d{3}/g,'');return {amz:full,day:full.slice(0,8)};};
const extension=(name,type)=>{
 const fromType={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type];
 const fromName=clean(name).toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)?.[1];
 return fromName==='jpeg'?'jpg':fromName||fromType;
};
const safeSegment=value=>clean(value).replace(/[^A-Za-z0-9_-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80);

export const isAssetRef=value=>/^r2:\/\/projects\/[A-Za-z0-9_-]{24}\/(?:hero|product|category|trust)\/[A-Za-z0-9_-]+\.(?:jpg|png|webp)$/i.test(String(value||''));
export const assetKey=value=>isAssetRef(value)?String(value).slice(5):null;

export function createAssetService(env=process.env){
 const accountId=clean(env.R2_ACCOUNT_ID),accessKeyId=clean(env.R2_ACCESS_KEY_ID),secretAccessKey=clean(env.R2_SECRET_ACCESS_KEY),bucket=clean(env.R2_BUCKET);
 const configured=Boolean(accountId&&accessKeyId&&secretAccessKey&&bucket);
 const host=`${accountId}.r2.cloudflarestorage.com`,endpoint=`https://${host}`;
 const ensure=()=>{if(!configured)throw Object.assign(new Error('R2 storage nije podešen na staging serveru.'),{status:503});};
 const canonicalPath=key=>`/${[bucket,...String(key).split('/')].map(encode).join('/')}`;
 const signingKey=day=>{const kDate=hmac(`AWS4${secretAccessKey}`,day),kRegion=hmac(kDate,'auto'),kService=hmac(kRegion,'s3');return hmac(kService,'aws4_request');};
 const signedRequest=({method,key,contentType='',body=Buffer.alloc(0)})=>{
  const {amz,day}=nowStamp(),payloadHash=sha(body),path=canonicalPath(key),scope=`${day}/auto/s3/aws4_request`;
  const headers={'content-type':contentType,host,'x-amz-content-sha256':payloadHash,'x-amz-date':amz};
  const names=Object.keys(headers).sort(),canonicalHeaders=names.map(name=>`${name}:${headers[name]}\n`).join('');
  const canonical=[method,path,'',canonicalHeaders,names.join(';'),payloadHash].join('\n');
  const signature=createHmac('sha256',signingKey(day)).update(`AWS4-HMAC-SHA256\n${amz}\n${scope}\n${sha(canonical)}`).digest('hex');
  return {url:`${endpoint}${path}`,headers:{'Content-Type':contentType,'x-amz-content-sha256':payloadHash,'x-amz-date':amz,Authorization:`AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`}};
 };
 const allowRef=(siteId,value)=>{const key=assetKey(value);return Boolean(key&&key.startsWith(`projects/${siteId}/`));};
 async function upload({siteId,role,fileName,contentType,body}){
  ensure();
  if(!allowedRoles.has(role))throw Object.assign(new Error('Nepoznata namena slike.'),{status:400});
  if(!allowedTypes.has(contentType))throw Object.assign(new Error('Dozvoljene su JPG, PNG i WEBP slike.'),{status:400});
  if(!Buffer.isBuffer(body)||body.length<1||body.length>8*1024*1024)throw Object.assign(new Error('Slika mora imati najviše 8 MB.'),{status:400});
  const ext=extension(fileName,contentType);if(!ext)throw Object.assign(new Error('Slika nema dozvoljeni format.'),{status:400});
  const key=`projects/${siteId}/${role}/${safeSegment(fileName)||'slika'}-${randomBytes(12).toString('base64url')}.${ext}`;
  const request=signedRequest({method:'PUT',key,contentType,body});
  const response=await fetch(request.url,{method:'PUT',headers:request.headers,body});
  if(!response.ok){
   const detail=(await response.text()).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,220);
   // Keep the actionable R2 result first: the UI has limited space and the
   // response body is useful only after its HTTP status is visible.
   throw Object.assign(new Error(`R2 HTTP ${response.status}${detail?`: ${detail}`:''}`),{status:502});
  }
  return {ref:`r2://${key}`,key,contentType,fileName:clean(fileName).slice(0,160)};
 }
 async function probe(){
  ensure();
  const key='health/rmc-r2-probe.txt',body=Buffer.from(`RMC staging R2 probe ${new Date().toISOString()}\n`,'utf8');
  const request=signedRequest({method:'PUT',key,contentType:'text/plain',body});
  const response=await fetch(request.url,{method:'PUT',headers:request.headers,body});
  if(!response.ok)throw Object.assign(new Error(`R2 probe nije uspeo (HTTP ${response.status}).`),{status:502});
  return {reachable:true};
 }
 async function previewUrl(ref){
  ensure();const key=assetKey(ref);if(!key)throw Object.assign(new Error('Neispravna R2 slika.'),{status:400});
  const {amz,day}=nowStamp(),path=canonicalPath(key),scope=`${day}/auto/s3/aws4_request`,query={
   'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':`${accessKeyId}/${scope}`,'X-Amz-Date':amz,'X-Amz-Expires':'3600','X-Amz-SignedHeaders':'host'
  };
  const canonicalQuery=Object.entries(query).map(([name,value])=>[encode(name),encode(value)]).sort(([a],[b])=>a.localeCompare(b)).map(([name,value])=>`${name}=${value}`).join('&');
  const canonical=['GET',path,canonicalQuery,`host:${host}\n`,'host','UNSIGNED-PAYLOAD'].join('\n');
  const signature=createHmac('sha256',signingKey(day)).update(`AWS4-HMAC-SHA256\n${amz}\n${scope}\n${sha(canonical)}`).digest('hex');
  return `${endpoint}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
 }
 async function materialize(value){
  if(typeof value==='string')return isAssetRef(value)?previewUrl(value):value;
  if(Array.isArray(value))return Promise.all(value.map(materialize));
  if(value&&typeof value==='object'){const out={};for(const [key,entry] of Object.entries(value))out[key]=await materialize(entry);return out;}
  return value;
 }
 return {configured,upload,probe,previewUrl,materialize,allowRef};
}
