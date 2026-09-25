// Minimal enhancement. No tracking cookie or unrequested map network request.
(()=>{
 'use strict';
 for(const button of document.querySelectorAll('[data-ws-map]')){
  button.addEventListener('click',()=>{
   const query=button.dataset.wsMap||'';
   if(!query)return;
   const host=button.parentElement.querySelector('.ws-map-host');
   const iframe=document.createElement('iframe');iframe.className='ws-map-frame';iframe.title='Mapa lokacije';iframe.loading='lazy';
   iframe.referrerPolicy='no-referrer-when-downgrade';iframe.src='https://www.google.com/maps?q='+encodeURIComponent(query)+'&output=embed';
   host.replaceChildren(iframe);button.remove();
  });
 }
 const badge=document.querySelector('[data-system="demoBadge"]');
 if(badge){
  // Light integrity against accidental DOM removal, not a claim of DRM for a downloadable HTML site.
  const parent=badge.parentNode,next=badge.nextSibling;
  if(parent){new MutationObserver(()=>{if(!badge.isConnected&&parent.isConnected){
    parent.insertBefore(badge,next&&next.parentNode===parent?next:null);
  }}).observe(parent,{childList:true});}

  const update=()=>{
   if(getComputedStyle(badge).position==='sticky')return; // mobile badge follows sticky header, never overlaps bottom CTAs
   let clear=70;
   const vw=innerWidth,vh=innerHeight;
   if(vw>720){badge.style.removeProperty('--ws-badge-safe-bottom');return;}
   const candidates=[...document.querySelectorAll('#stickyCart,.service-mobile-cta,.vertical-mobile-cta,.sticky-cart,.cookie-notice')];
   for(const item of candidates){
    if(item===badge||item.hidden)continue;
    const r=item.getBoundingClientRect(),cs=getComputedStyle(item);
    if(cs.visibility==='hidden'||cs.display==='none'||r.width<10||r.height<10||r.bottom<vh-135||r.top>vh)continue;
    if(r.left>Math.min(vw*.5,badge.getBoundingClientRect().right)+12)continue; // Do not lift for right-only elements.
    clear=Math.max(clear,vh-r.top+10);
   }
   const room=vh-badge.getBoundingClientRect().height-65;
   badge.style.setProperty('--ws-badge-safe-bottom',Math.min(clear,Math.max(12,room))+'px');
  };
  update();addEventListener('resize',update,{passive:true});
  const sticky=document.getElementById('stickyCart');
  if(sticky){new MutationObserver(update).observe(sticky,{attributes:true,attributeFilter:['hidden','class','style']});}
 }
})();
