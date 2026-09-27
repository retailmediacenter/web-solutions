/* React-facing presentation for the public Index. The original layout is a
   static design reference only; no old Advisor, registry or business JavaScript
   is loaded or executed. Shadow DOM isolates the original visual CSS from the
   current React Advisor and generated site preview. */
import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {LANDING_MARKUP} from './landing-layout.js';
import landingCss from './landing-theme.css?inline';
import './landing-dialogs.css';
import './style-preview-v4533.css';
import './preview-shell-v4532.css';

export const SHOWCASE = [
 {id:'salon',demoPath:'salon',businessId:'hair-salon',name:'Studio Forma',type:'Frizerski salon'},
 {id:'restaurant',demoPath:'pizzeria',businessId:'restaurant',name:'Pica & društvo',type:'Picerija'},
 {id:'auto',demoPath:'auto-service',businessId:'auto-service',name:'Auto Fokus',type:'Auto servis'},
 {id:'wine',demoPath:'vinoteka',businessId:'wine-shop',name:'Vino & Terroir',type:'Vinoteka'},
 {id:'furniture',demoPath:'namestaj',businessId:'furniture-store',name:'Forma Living',type:'Salon nameštaja'},
 {id:'optician',demoPath:'optika',businessId:'optician',name:'Optika Fokus',type:'Optika'}
];

/* The HTML is trusted, extracted at build time from the previously approved
   public landing layout. Asset URLs must respect Vite's BASE_URL. */
function withAssetBase(markup){
 const base=import.meta.env.BASE_URL || '/';
 return markup.replace(/\b(src|href)="assets\//g,(_,attr)=>`${attr}="${base}assets/`);
}

export function Landing({onStart,onOpenSite,onExample,onLead,onInfo,hasResult}){
 const host=useRef(null);
 const [shadow,setShadow]=useState(null);
 const layout=useMemo(()=>withAssetBase(LANDING_MARKUP),[]);
 useLayoutEffect(()=>{
   const root=host.current.shadowRoot||host.current.attachShadow({mode:'open'});
   if(!root.querySelector('[data-rmc-landing-theme]')){
     const style=document.createElement('style');
     style.setAttribute('data-rmc-landing-theme','');
     style.textContent=landingCss;
     root.appendChild(style);
   }
   setShadow(root);
 },[]);
 useEffect(()=>{
   if(!shadow)return;
   const button=shadow.querySelector('[data-open-site]');
   if(button)button.hidden=!hasResult;
 },[shadow,hasResult]);
 useEffect(()=>{
   if(!shadow)return;
   // Motion is local to the public landing; never activate old site runtimes.
   const elements=Array.from(shadow.querySelectorAll('[data-reveal]'));
   if(!window.IntersectionObserver||matchMedia('(prefers-reduced-motion: reduce)').matches){
     elements.forEach(el=>el.classList.add('rmc-motion-visible'));return;
   }
   const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
     if(entry.isIntersecting){entry.target.classList.add('rmc-motion-visible');observer.unobserve(entry.target)}
   }),{threshold:.06});
   elements.forEach(el=>{el.classList.add('rmc-motion-item');observer.observe(el)});
   return()=>observer.disconnect();
 },[shadow]);
 useEffect(()=>{
   if(!shadow)return;
   // Missing local demo photographs should never display browser broken-image UI.
   const onError=e=>{if(e.target instanceof HTMLImageElement)e.target.classList.add('is-missing')};
   shadow.addEventListener('error',onError,true);
   return()=>shadow.removeEventListener('error',onError,true);
 },[shadow]);
 function handleClick(event){
   const element=event.target instanceof Element?event.target:null;
   if(!element)return;
   const start=element.closest('[data-start]');
   if(start){event.preventDefault();onStart();return;}
   const existing=element.closest('[data-open-site]');
   if(existing){event.preventDefault();onOpenSite();return;}
   const demo=element.closest('[data-open-sample]');
   if(demo){event.preventDefault();onExample(demo.getAttribute('data-open-sample'));return;}
   const lead=element.closest('[data-lead]');
   if(lead){event.preventDefault();onLead(lead.getAttribute('data-lead'));return;}
   const info=element.closest('[data-package-info]');
   if(info){event.preventDefault();onInfo(info.getAttribute('data-package-info'));return;}
   const hosting=element.closest('[data-hosting]');
   if(hosting){event.preventDefault();onInfo('hosting');return;}
   const menu=element.closest('#mobileMenuToggle');
   if(menu){
     event.preventDefault();
     const wrapper=shadow.querySelector('.ws-product');
     const open=wrapper?.classList.toggle('mobile-menu-open')||false;
     menu.setAttribute('aria-expanded',String(open));return;
   }
   const anchor=element.closest('a[href^="#"]');
   if(anchor){
     const id=anchor.getAttribute('href').slice(1);
     if(id){
       const target=shadow.querySelector('#'+CSS.escape(id));
       if(target){event.preventDefault();target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
     }
     shadow.querySelector('.ws-product')?.classList.remove('mobile-menu-open');
     shadow.querySelector('#mobileMenuToggle')?.setAttribute('aria-expanded','false');
   }
 }
 return <div ref={host} className="rmc-landing-host" aria-label="RMC Web Solutions početna strana">
   {shadow&&createPortal(<div className="ws-product" data-style="business" onClick={handleClick}
       dangerouslySetInnerHTML={{__html:layout}}/>,shadow)}
 </div>;
}

function preventBackgroundScroll(active){
 const before=document.body.style.overflow;
 if(active)document.body.style.overflow='hidden';
 return()=>{document.body.style.overflow=before};
}

export function PreviewDialog({open,mode='site',siteName,html,loading,error,device,onDevice,
  selectedDemo,onSelectDemo,onClose,onStart,onExport,exporting,exportPairing,onEdit,frameRef,
  styles=[],selectedStyle,styleBusy=false,styleError='',onStyleChange}){
 const close=useRef(null);
 useEffect(()=>{if(!open)return;const done=preventBackgroundScroll(true);close.current?.focus();
   function key(e){if(e.key==='Escape'){e.preventDefault();onClose()}}
   document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);done()};
 },[open,onClose]);
 if(!open)return null;
 const isSample=mode==='sample';
 const staticDemo=SHOWCASE.find(item=>item.id===selectedDemo);
 const sampleBase=(import.meta.env.BASE_URL||'/')+'demo-previews/';
 return <div className="rmc-preview-cover" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
   <section className={"rmc-preview-panel rmc-preview-v4532 "+(isSample?"is-sample":"is-generated")} role="dialog" aria-modal="true" aria-label={isSample?'Primer generisanog sajta':'Vaš generisani sajt'}>
     <header className="rmc-preview-head"><div><small>RMC WEB SOLUTIONS</small>
       <h2>{isSample?'Primeri sajtova':siteName||'Vaš sajt'}</h2></div>
       <button ref={close} className="rmc-dialog-close" type="button" aria-label="Zatvori pregled" onClick={onClose}>×</button>
     </header>
     {isSample&&<div className="rmc-preview-tools">
       <div className="rmc-preview-tabs" role="group" aria-label="Primeri sajtova">
         {SHOWCASE.map(item=><button key={item.id} type="button" aria-pressed={selectedDemo===item.id}
           className={selectedDemo===item.id?'active':''} onClick={()=>onSelectDemo(item.id)}>{item.type}</button>)}
       </div>
     </div>}
     {!isSample&&styles.length>0&&<nav className="rmc-style-picker" aria-label="Izgled sajta">
       <span className="rmc-style-picker-label">Promenite izgled</span>
       <div className="rmc-style-picker-list" role="group" aria-label="Pet originalnih stilova">
         {styles.map(item=><button key={item.id} type="button"
           className={'rmc-style-pick'+(selectedStyle===item.id?' is-active':'')}
           aria-pressed={selectedStyle===item.id}
           disabled={styleBusy}
           onClick={()=>onStyleChange?.(item.id)}>
           <span className={'rmc-style-swatch is-'+item.id} aria-hidden="true"><i/><i/><i/></span>
           <span>{item.label}</span>
         </button>)}
       </div>
       {styleBusy&&<span className="rmc-style-feedback" role="status">Primenjujem stil…</span>}
       {styleError&&<span className="rmc-style-feedback is-error" role="alert">{styleError}</span>}
     </nav>}
     <div className="rmc-preview-content" aria-busy={styleBusy}>
       {isSample&&staticDemo
        ? <iframe ref={frameRef} key={staticDemo.id} title={'Nezavisni DEMO — '+staticDemo.name}
            src={sampleBase+staticDemo.demoPath+'/index.html'}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox" />
        :loading?<div className="rmc-preview-message" role="status">Pripremam vaš sajt…</div>:
        error?<div className="rmc-preview-message" role="alert">{error}</div>:
        html?<iframe ref={frameRef} key={siteName} title={siteName||'Pregled sajta'} srcDoc={html}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox" />:
        <div className="rmc-preview-message">Nema generisanog pregleda.</div>}
     </div>
     <footer className="rmc-preview-footer">
       {isSample?<><span>Ovo je samostalan marketinški DEMO; ne koristi Advisor i ne šalje stvarne zahteve.</span>
         <button type="button" className="rmc-primary" onClick={onStart}>Napravi moj sajt ↗</button></>:
         <><div className="rmc-preview-export"><button type="button" className="rmc-primary" disabled={exporting} onClick={onExport}>
           {exporting?'Pripremam ZIP…':'Preuzmi besplatan sajt (ZIP) ↓'}</button>
           <button type="button" className="rmc-secondary" onClick={onEdit}>Izmeni odgovore</button></div>
           {exportPairing&&<p className="rmc-pairing" role="status">Kod za povezivanje sa Business Portalom: <strong>{exportPairing.code}</strong>
             <button type="button" onClick={()=>navigator.clipboard?.writeText(exportPairing.code)}>Kopiraj</button>
             <small>Važi približno {exportPairing.minutes} minuta; sačuvajte ga odvojeno od javnog sajta.</small></p>}
         </>}
     </footer>
   </section>
 </div>;
}

const PACKAGE_INFO={
 structure:['Prilagođavanje strukture','Dodajemo ili prilagođavamo sekcije i module koji nisu deo automatski generisanog sajta.'],
 functions:['Napredne poslovne funkcije','Podešavamo posebne tokove za zakazivanje, naručivanje, upite i druge potrebe vašeg poslovanja.'],
 catalog:['Standardni ili složeni katalog','Veliki katalog uključuje veći broj artikala, kategorije, atribute, varijante i naprednu pretragu.'],
 import:['Masovni uvoz podataka','Po dogovoru uvozimo artikle i druge podatke iz strukturiranih CSV/Excel fajlova.'],
 integrations:['Integracije','Povezivanje sa eksternim sistemima samo kada postoji stvarna, podržana tehnička integracija.'],
 hosting:['Domen i hosting','Partnerski hosting link nije aktiviran dok se ne potvrdi saradnja. Ako želite objavu, pošaljite nam upit.']
};
export function InfoDialog({type,onClose}){
 const content=PACKAGE_INFO[type];
 useEffect(()=>{if(!content)return;const done=preventBackgroundScroll(true);const onKey=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',onKey);return()=>{done();document.removeEventListener('keydown',onKey)}},[content,onClose]);
 if(!content)return null;
 return <div className="rmc-small-cover" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
   <section role="dialog" aria-modal="true" aria-label={content[0]} className="rmc-small-dialog"><button className="rmc-dialog-close" aria-label="Zatvori" onClick={onClose}>×</button><h2>{content[0]}</h2><p>{content[1]}</p></section>
 </div>;
}

export function LeadDialog({packageName,onClose}){
 const [name,setName]=useState(''),[company,setCompany]=useState(''),[phone,setPhone]=useState(''),[email,setEmail]=useState(''),[message,setMessage]=useState('');
 const [ready,setReady]=useState(false);
 useEffect(()=>{if(!packageName)return;const done=preventBackgroundScroll(true);const key=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',key);return()=>{done();document.removeEventListener('keydown',key)}},[packageName,onClose]);
 if(!packageName)return null;
 const lead={package:packageName,name,company,phone,email,message};
 const subject=`Web Solutions: ${packageName} – ${company||name}`;
 const body=`Paket: ${packageName}\nIme: ${name}\nFirma: ${company}\nTelefon: ${phone}\nEmail: ${email}\n\n${message}\n\nOva poruka je pripremljena na sajtu i nije automatski poslata.`;
 const mailto='mailto:hello@retailmediacenter.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 function downloadLead(){const link=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(lead,null,2)],{type:'application/json'}));link.href=url;link.download='RMC_UPIT_'+packageName+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <div className="rmc-small-cover" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
   <section className="rmc-small-dialog" role="dialog" aria-modal="true" aria-label="Upit za RMC"><button className="rmc-dialog-close" aria-label="Zatvori" onClick={onClose}>×</button>
     <h2>RMC {packageName}</h2><p>Pripremite upit; poruka se ne šalje automatski.</p>
     <form onSubmit={e=>{e.preventDefault();setReady(true)}}>
       <label>Ime<input required value={name} onChange={e=>setName(e.target.value)}/></label>
       <label>Firma<input value={company} onChange={e=>setCompany(e.target.value)}/></label>
       <label>Telefon<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
       <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
       <label>Poruka<textarea rows="3" value={message} onChange={e=>setMessage(e.target.value)}/></label>
       <button className="rmc-primary" type="submit">Pripremi upit</button>
       {ready&&<div className="rmc-lead-actions"><a className="rmc-primary" href={mailto}>Otvori email za slanje ↗</a>
         <button className="rmc-secondary" type="button" onClick={downloadLead}>Preuzmi upit (JSON)</button></div>}
     </form>
   </section>
 </div>;
}
