/* V44 B4: this script is intentionally public and has NO administrator key.
   Only a short-lived temporary QA token may be kept per Preview browser tab. */
'use strict';
(() => {
 const qs=(selector,base=document)=>base.querySelector(selector);
 const api=document.body.dataset.apiOrigin;
 const portal='https://rmc-booking-manager-staging.onrender.com/';
 const cacheKey='rmc-b4-qa-session-v1';
 const form=qs('#qa-login'),pass=qs('#qa-password'),login=qs('#qa-login-button');
 const access=qs('#qa-active'),logout=qs('#qa-logout'),status=qs('#qa-status');
 let session=null;
 const notify=(msg,bad=false)=>{status.textContent=msg;status.dataset.error=bad?'1':'0';};
 const forget=()=>{session=null;try{sessionStorage.removeItem(cacheKey);}catch{}render();};
 const render=()=>{
  const valid=Boolean(session&&session.expiresAt>Date.now()&&session.api===api);
  if(!valid){session=null;try{sessionStorage.removeItem(cacheKey);}catch{}}
  form.hidden=valid;access.hidden=!valid;
  document.querySelectorAll('.qa-issue').forEach(b=>b.disabled=!valid||b.dataset.loading==='1');
  if(!valid)document.querySelectorAll('.qa-result').forEach(node=>{
   node.hidden=true;qs('.qa-code',node).textContent='';
  });
 };
 const request=async(endpoint,method,authorization)=>{
  const response=await fetch(api+endpoint,{
   method,mode:'cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',
   headers:{Authorization:'Bearer '+authorization,'Content-Type':'application/json'}
  });
  if(!response.ok){
   let message='Pokušaj ponovo.';
   try{message=(await response.json()).error||message;}catch{}
   const error=new Error(message);error.status=response.status;throw error;
  }
  return response.status===204?null:response.json();
 };
 try{
  const saved=JSON.parse(sessionStorage.getItem(cacheKey)||'null');
  if(saved&&typeof saved.token==='string'&&saved.api===api&&saved.expiresAt>Date.now())session=saved;
 }catch{}
 render();
 form.addEventListener('submit',async event=>{
  event.preventDefault();const key=pass.value.trim();pass.value='';
  if(!key)return notify('Unesi QA ključ.',true);
  login.disabled=true;notify('');
  try{
   const data=await request('/api/qa/session','POST',key);
   const expiresAt=Date.parse(data.expiresAt);
   if(!data.sessionToken||!Number.isFinite(expiresAt))throw Error('Sesija nije uspostavljena.');
   session={token:data.sessionToken,expiresAt,api};
   try{sessionStorage.setItem(cacheKey,JSON.stringify(session));}catch{}
   render();notify('QA je otključan.');
  }catch(error){notify(error.message,true);}finally{login.disabled=false;}
 });
 logout.addEventListener('click',async()=>{
  const old=session?.token;forget();notify('');
  if(old)try{await request('/api/qa/session','DELETE',old);}catch{}
 });
 document.querySelectorAll('.qa-issue').forEach(button=>button.addEventListener('click',async()=>{
  if(!session||session.expiresAt<=Date.now()){
   forget();return notify('Prijavi se ponovo.',true);
  }
  const box=button.closest('.qa-controls'),slug=box.dataset.slug;
  const result=qs('.qa-result',box),code=qs('.qa-code',box);
  button.dataset.loading='1';button.disabled=true;result.hidden=true;code.textContent='';notify('');
  try{
   const data=await request('/api/qa/pairing/'+encodeURIComponent(slug),'POST',session.token);
   if(data.siteId!==box.dataset.siteId||!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$/.test(data.pairingCode))
    throw Error('Server je vratio neočekivan kod.');
   code.textContent=data.pairingCode;
   result.hidden=false;
   const expires=qs('.qa-expiry',box);
   expires.textContent='Važi '+Math.round((data.expiresIn||1800)/60)+' min';
  }catch(error){
   if(error.status===401||error.status===403){forget();notify('Sesija je istekla. Prijavi se ponovo.',true);}
   else notify(error.message,true);
  }finally{button.dataset.loading='0';render();}
 }));
 document.querySelectorAll('.qa-copy').forEach(button=>button.addEventListener('click',async()=>{
  const code=qs('.qa-code',button.closest('.qa-result')).textContent;
  if(!code)return;
  try{await navigator.clipboard.writeText(code);button.textContent='Kopirano ✓';
   setTimeout(()=>{button.textContent='Kopiraj';},1700);
  }catch{
   const range=document.createRange();range.selectNodeContents(qs('.qa-code',button.closest('.qa-result')));
   const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
   notify('Označen kod. Kopiraj ga ručno.',true);
  }
 }));
 document.querySelectorAll('.qa-portal').forEach(a=>a.href=portal);
})();
