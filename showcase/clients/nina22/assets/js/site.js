(()=>{
  'use strict';
  const header=document.querySelector('.site-header');
  const menuBtn=document.querySelector('.menu-toggle');
  const mobileMenu=document.querySelector('#mobile-menu');
  const modal=document.querySelector('#modal');
  const modalContent=document.querySelector('#modal-content');
  const closeButton=modal.querySelector('.modal-close');
  let opener=null;
  let lastBodyOverflow='';
  const data=JSON.parse(document.querySelector('#runtime-data').textContent);
  const svg=id=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('aria-hidden','true');const u=document.createElementNS('http://www.w3.org/2000/svg','use');u.setAttribute('href','#i-'+id);s.append(u);return s;};
  const closeMenu=()=>{
    mobileMenu.hidden=true;menuBtn.setAttribute('aria-expanded','false');
    menuBtn.setAttribute('aria-label','Otvori meni');document.body.classList.remove('menu-open');
  };
  menuBtn.addEventListener('click',()=>{
    if(mobileMenu.hidden){mobileMenu.hidden=false;menuBtn.setAttribute('aria-expanded','true');menuBtn.setAttribute('aria-label','Zatvori meni');document.body.classList.add('menu-open');}
    else closeMenu();
  });
  mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  window.addEventListener('resize',()=>{if(window.innerWidth>850)closeMenu();},{passive:true});
  const updateHeader=()=>header.classList.toggle('is-scrolled',scrollY>12);
  window.addEventListener('scroll',updateHeader,{passive:true});updateHeader();
  // Parallax is progressive enhancement. The actual HERO photo is a normal
  // <img>, so the image remains visible even when opening index.html locally.
  const hero=document.querySelector('.hero');
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0;
  function updateHeroShift(){
    frame=0;
    if(window.innerWidth<=850||motion.matches){hero.style.setProperty('--hero-shift','0px');return;}
    const rect=hero.getBoundingClientRect();
    const shift=rect.bottom>0&&rect.top<window.innerHeight?Math.min(22,Math.max(0,-rect.top*.045)):0;
    hero.style.setProperty('--hero-shift',`${shift.toFixed(1)}px`);
  }
  function requestHeroShift(){if(!frame)frame=requestAnimationFrame(updateHeroShift);}
  window.addEventListener('scroll',requestHeroShift,{passive:true});
  window.addEventListener('resize',requestHeroShift,{passive:true});
  if(motion.addEventListener)motion.addEventListener('change',requestHeroShift);
  updateHeroShift();


  function openModal(content,button){
    opener=button||document.activeElement;
    modalContent.replaceChildren(content);
    modal.hidden=false;modal.setAttribute('aria-hidden','false');
    lastBodyOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';document.body.classList.add('modal-open');
    closeButton.focus();
  }
  function closeModal(){
    if(modal.hidden)return;
    const video=modalContent.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();}
    modal.hidden=true;modal.setAttribute('aria-hidden','true');modalContent.replaceChildren();
    document.body.classList.remove('modal-open');document.body.style.overflow=lastBodyOverflow;
    if(opener&&document.contains(opener))opener.focus({preventScroll:true});
    opener=null;
  }
  modal.querySelectorAll('[data-close-modal]').forEach(n=>n.addEventListener('click',closeModal));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(!modal.hidden){e.preventDefault();closeModal();}else if(!mobileMenu.hidden)closeMenu();}
    if(e.key==='Tab'&&!modal.hidden){
      const tabbables=[...modal.querySelectorAll('button:not([disabled]),a[href],video[controls],input,select')].filter(el=>el.getClientRects().length);
      if(!tabbables.length)return;
      if(e.shiftKey&&document.activeElement===tabbables[0]){e.preventDefault();tabbables.at(-1).focus();}
      else if(!e.shiftKey&&document.activeElement===tabbables.at(-1)){e.preventDefault();tabbables[0].focus();}
    }
  });
  const subjectSelect=document.querySelector('#contact-form select[name="subject"]');
  const serviceLookup=new Map(data.services.map(service=>[service.id,service]));
  document.querySelectorAll('[data-service-id]').forEach(b=>b.addEventListener('click',()=>{
    const service=serviceLookup.get(b.dataset.serviceId);
    if(!service)return;
    const wrap=document.createElement('article');wrap.className='service-detail';
    const photo=document.createElement('img');photo.className='service-detail-photo';photo.src=service.image;photo.alt=service.imageAlt||service.title;
    const content=document.createElement('div');content.className='service-detail-copy';
    const heading=document.createElement('h2');heading.id='modal-title';heading.textContent=service.title;
    const intro=document.createElement('p');intro.textContent=service.details;
    content.append(heading,intro);
    if(service.highlights.length){
      const label=document.createElement('h3');label.textContent='Šta usluga obuhvata';
      const list=document.createElement('ul');
      service.highlights.forEach(item=>{const li=document.createElement('li');li.textContent=item;list.append(li)});
      content.append(label,list);
    }
    const cta=document.createElement('a');cta.className='button button-gold service-modal-cta';cta.href='#kontakt';cta.textContent='Pošaljite upit';
    cta.addEventListener('click',()=>{
      if([...subjectSelect.options].some(o=>o.value===service.subject))subjectSelect.value=service.subject;
      closeModal();
    });
    content.append(cta);wrap.append(photo,content);openModal(wrap,b);
  }));
  document.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>{
    const wrap=document.createElement('div');const title=document.createElement('h2');title.id='modal-title';title.className='visually-hidden';title.textContent=b.dataset.caption||'Fotografija';
    const img=document.createElement('img');img.className='modal-photo';img.src=b.dataset.photo;img.alt=(b.dataset.caption||'Fotografija')+' — uvećano';
    const caption=document.createElement('p');caption.className='modal-caption';caption.textContent=b.dataset.captionMode==='custom'?(b.dataset.caption||''):(b.dataset.actual==='true'?(b.dataset.caption||'Stvarna referenca NINA 22'):(data.isDemo?'Demo fotografija — čeka se originalna fotografija NINA 22.':(b.dataset.caption||'')));if(b.dataset.captionMode==='custom')caption.style.display='none';
    wrap.append(title,img,caption);openModal(wrap,b);
  }));
  document.querySelectorAll('[data-open-video]').forEach(b=>b.addEventListener('click',()=>{
    const key=b.dataset.openVideo;
    if(!data.videos[key])return;
    const wrap=document.createElement('div');const title=document.createElement('h2');title.id='modal-title';title.className='modal-video-title';title.textContent=key==='maintenance'?'Održavanje zajedničkih prostora':'Dubinsko čišćenje nameštaja';
    const video=document.createElement('video');video.className='modal-video';video.src=data.videos[key];video.controls=true;video.preload='metadata';video.playsInline=true;
    const desc=document.createElement('p');desc.className='modal-caption';desc.textContent='Snimak se zaustavlja kada zatvorite ovaj prozor.';
    wrap.append(title,video,desc);openModal(wrap,b);
    // Browsers can refuse autoplay; user can then tap normal video controls.
    video.play().catch(()=>{});
  }));

  document.querySelectorAll('[data-subject]').forEach(a=>a.addEventListener('click',()=>{
    subjectSelect.value=a.dataset.subject;
  }));
  document.querySelectorAll('.ba-slider').forEach(input=>{
    const frame=input.closest('.before-after');
    input.addEventListener('input',()=>frame.style.setProperty('--comparison',`${input.value}%`));
  });
  const form=document.querySelector('#contact-form');const status=document.querySelector('#form-status');const copyBtn=document.querySelector('#copy-message');
  let prepared='';
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    const val=k=>String(new FormData(form).get(k)||'').trim();
    prepared=`NINA 22 — novi upit\n\nVrsta upita: ${val('subject')}\nIme i prezime: ${val('name')}\nTelefon: ${val('phone')}\nEmail: ${val('email')||'Nije naveden'}\n\nPoruka:\n${val('message')}`;
    const mailto='mailto:'+data.email+'?subject='+encodeURIComponent('NINA 22 — '+val('subject'))+'&body='+encodeURIComponent(prepared);
    copyBtn.hidden=false;
    status.textContent='Otvaramo email aplikaciju. Proverite poruku i kliknite Pošalji. Ako se aplikacija ne otvori, izaberite „Kopiraj poruku”.';
    window.location.href=mailto;
  });
  copyBtn.addEventListener('click',async()=>{
    if(!prepared)return;
    try{await navigator.clipboard.writeText(prepared);status.textContent='Poruka je kopirana. Nalepite je u email i pošaljite na '+data.email+'.';}
    catch(err){
      const el=document.createElement('textarea');el.value=prepared;el.style.position='fixed';el.style.top='-999px';document.body.append(el);el.select();
      const ok=document.execCommand('copy');el.remove();status.textContent=ok?'Poruka je kopirana.':'Kopiranje nije dostupno u ovom browseru. Otvorite email aplikaciju.';
    }
  });
  document.querySelector('#year').textContent=new Date().getFullYear();
})();
