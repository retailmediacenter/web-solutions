/* GlobalModal V41.9: used by BOTH preview iframe and exported ZIP. Zero external dependencies. */
(()=>{'use strict';
 const D='v419';
 const array=el=>Array.from(el?.children||[]);
 const first=(parent,selector)=>parent?.querySelector(selector);
 const dialogOpen=(d)=>{if(!d.open)return;
   const f=first(d,'.modal-footer .modal-footer-form');
   const s=first(d,'.modal-footer .modal-footer-share');
   if(!f&&!s)return;
   const share=first(d,'#sharePanel');
   if(f)f.hidden=Boolean(share&&!share.hidden);
   if(s)s.hidden=Boolean(share?.hidden);
 };
 function setup(dialog){if(dialog.dataset.modalSystem===D)return;
   // A native dialog remains the modal/focus implementation; this layer unifies shell & fixed actions.
   dialog.dataset.modalSystem=D;
   const header=document.createElement('div'),body=document.createElement('div'),footer=document.createElement('div');
   header.className='modal-header';body.className='modal-body';footer.className='modal-footer';
   const close=first(dialog,':scope > .dialog-close');
   if(close)header.append(close);
   let content=first(dialog,':scope > .dialog-pad, :scope > .hybrid-dialog-inner, :scope > .vehicle-detail-layout, :scope > .product-detail-grid');
   if(!content){content=document.createElement('div');for(const node of array(dialog))if(node!==close)content.append(node);}
   if(content.parentNode===dialog)body.append(content);
   // D5 Booking states have different titles and actions. Never hoist a title
   // from the hidden DEMO state or an error-only Retry into a permanent shell.
   const bookingStatus=dialog.classList.contains('booking-submit-dialog');
   if(bookingStatus){
     const states=Array.from(body.querySelectorAll('.booking-submit-state > section'));
     if(states.length){
       dialog.dataset.bookingStatus='true';
       const label=document.createElement('div'),title=document.createElement('h2');
       label.className='kicker';header.append(label,title);
       const refresh=()=>{
         const active=states.find(section=>!section.hidden);
         label.textContent=active?.querySelector('.kicker')?.textContent||'REZERVACIJA';
         title.textContent=active?.querySelector('h2')?.textContent||'Status zahteva';
       };
       for(const state of states){
         new MutationObserver(refresh).observe(state,{attributes:true,attributeFilter:['hidden']});
       }
       refresh();
     }
   }else{
     // Other modals retain their existing fixed heading and actions.
     const kicker=first(body,'.kicker:not(.detail-body .kicker)'),head=first(body,'h2:not(.detail-body h2)');
     if(kicker)header.append(kicker);
     if(head)header.append(head);
   }
   // Product detail uses product name updated later: keep in body to avoid changing existing script assumptions.
   if(dialog.id==='productDialog'){header.insertBefore(Object.assign(document.createElement('div'),{className:'kicker',textContent:'PROIZVOD'}),header.firstChild);
     const acts=first(body,'.detail-actions');if(acts)footer.append(acts);
   }else if(dialog.id==='orderDialog'){
     const submit=first(body,'#orderSubmit');
     if(submit){submit.setAttribute('form','orderForm');const group=document.createElement('div');group.className='modal-footer-group modal-footer-form';group.append(submit);footer.append(group);}
     const shareActions=first(body,'#sharePanel .dialog-actions');
     if(shareActions){const group=document.createElement('div');group.className='modal-footer-group modal-footer-share';group.append(shareActions);footer.append(group);}
     const share=first(body,'#sharePanel');if(share)new MutationObserver(()=>dialogOpen(dialog)).observe(share,{attributes:true,attributeFilter:['hidden']});
   }else if(!bookingStatus){
     const selector=dialog.id==='vehicleDetailDialog'?'#vehicleRequest':'.dialog-actions, .hybrid-actions';
     const actions=first(body,selector);if(actions)footer.append(actions);
   }
   dialog.append(header,body,footer);
   dialogOpen(dialog);
   // Native focus fallback if scripts call showModal() after moving DOM nodes.
   const unlockIfNone=()=>{if(!document.querySelector('dialog.site-dialog[open]'))document.documentElement.classList.remove('has-site-modal')};
   dialog.addEventListener('close',unlockIfNone);
   dialog.addEventListener('cancel',unlockIfNone);
   let wasOpen=dialog.open;
   new MutationObserver(()=>{if(dialog.open){document.documentElement.classList.add('has-site-modal');dialogOpen(dialog);
     if(!wasOpen){
       // Native dialog autofocus sometimes scrolls directly to the first field,
       // hiding the image/title on small portrait screens. Always start at top.
       wasOpen=true;body.scrollTop=0;
       requestAnimationFrame(()=>{if(dialog.open){
         first(header,'.dialog-close')?.focus({preventScroll:true});body.scrollTop=0;
       }});
     }
     }else{
       wasOpen=false;
       if(!document.querySelector('dialog.site-dialog[open]'))document.documentElement.classList.remove('has-site-modal');
     }
   }).observe(dialog,{attributes:true,attributeFilter:['open']});
 }
 function init(){for(const dialog of document.querySelectorAll('dialog.site-dialog'))setup(dialog);
   const reduces=matchMedia('(prefers-reduced-motion:reduce)').matches;
   const welcome=document.querySelector('#welcomeDialog');
   if(welcome){
     const close=()=>{if(welcome.open)welcome.close()};
     welcome.querySelector('#welcomeContinue')?.addEventListener('click',close);
     welcome.querySelector('.dialog-close')?.addEventListener('click',close);
     const key='rmc-welcome-'+(document.title||location.pathname);
     let seen=false;
     try{seen=sessionStorage.getItem(key)==='1';}catch{}
     if(!seen){welcome.showModal();try{sessionStorage.setItem(key,'1')}catch{}}
   }
   if(!reduces&&document.documentElement.dataset.style!=='traditional'&&'IntersectionObserver'in window){
     const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:0,rootMargin:'0px 0px 0px 0px'});
     for(const section of document.querySelectorAll('main > .site-section,main > .tasting,main > .hybrid-section')){
       section.dataset.reveal='';io.observe(section);
       // Avoid white/blank content before first observer paint (important inside preview iframe).
       if(section.getBoundingClientRect().top < window.innerHeight+100)section.classList.add('is-visible');
     }
     document.documentElement.classList.add('js-motion');
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
