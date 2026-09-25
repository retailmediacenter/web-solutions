import React,{useEffect,useMemo,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {apiUrl} from './api.js';
import './style.css';

const pilots=[
  {id:'butcher-shop',label:'Mesara',hint:'Sirovo / grilovano, količina u kg, korpa'},
  {id:'wine-shop',label:'Vinoteka',hint:'Vina, korpa i uslovne degustacije'},
  {id:'shoe-shop',label:'Prodavnica obuće',hint:'Brojevi, cene i standardna korpa'},
  {id:'fashion-shop',label:'Modni butik',hint:'Odeća, boje i veličine'},
  {id:'grocery-store',label:'Mini market',hint:'Posebno pitanje o naručivanju, korpa ili katalog'},
  {id:'liquor-store',label:'Prodavnica pića',hint:'Katalog pića i porudžbine'},
  {id:'home-decor',label:'Kućni dekor',hint:'Katalog dekoracije i porudžbine'},
  {id:'electronics-store',label:'Prodavnica elektronike',hint:'Uređaji, cene i korpa'},
  {id:'phone-store',label:'Prodavnica telefona',hint:'Porudžbine po izboru, model/boja i provera dostupnosti'},
  {id:'furniture-store',label:'Salon nameštaja',hint:'Model i dimenzije, upit umesto korpe'},
  {id:'auto-parts',label:'Auto delovi',hint:'Opciono naručivanje uz obaveznu proveru kompatibilnosti'},
  {id:'plumbing-supplies',label:'Vodovodni materijal',hint:'Specifikacija proizvoda, upit'},
  {id:'electrical-supplies',label:'Elektromaterijal',hint:'Specifikacija proizvoda, upit'}
];
const goals=[
  {id:'purchase',label:'Prodaja i porudžbine',desc:'Kupac pronalazi proizvode i priprema porudžbinu.'},
  {id:'visit',label:'Više poseta prodavnici',desc:'Ponuda podstiče kupca da vas kontaktira ili poseti.'},
  {id:'catalog',label:'Predstavljanje ponude',desc:'Naglasak je na asortimanu i informacijama.'}
];
function ChoiceStep({eyebrow,title,help,items,value,onPick}){
  return <section className="question"><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{help&&<p>{help}</p>}
    <div className="choices">{items.map(item=><button key={item.id} type="button" className={'choice '+(value===item.id?'selected':'')} aria-pressed={value===item.id}
      onClick={()=>onPick(item.id)}><span>{item.label}</span>{item.desc&&<small>{item.desc}</small>}<b aria-hidden="true">{value===item.id?'✓':'→'}</b></button>)}</div>
  </section>;
}
function App(){
  const previewFrame=useRef(null);
  const [health,setHealth]=useState(null),[businesses,setBusinesses]=useState([]);
  const [description,setDescription]=useState(''),[selectedId,setSelectedId]=useState(''),[recognizedId,setRecognizedId]=useState('');
  const [definition,setDefinition]=useState(null),[step,setStep]=useState(0),[goal,setGoal]=useState('purchase');
  const [answers,setAnswers]=useState({}),[style,setStyle]=useState('modern'),[showWelcome,setShowWelcome]=useState(false);
  const [businessName,setBusinessName]=useState(''),[contactPhone,setContactPhone]=useState(''),[externalBookingUrl,setExternalBookingUrl]=useState('');
  const [bookingLinkCode,setBookingLinkCode]=useState('');
  const [email,setEmail]=useState(''),[city,setCity]=useState(''),[address,setAddress]=useState(''),[hours,setHours]=useState('');
  const [website,setWebsite]=useState(''),[whatsapp,setWhatsapp]=useState(''),[viber,setViber]=useState('');
  const [extraLocations,setExtraLocations]=useState([]);
  const [locationMode,setLocationMode]=useState('physical');
  const modifyLocation=(index,key,value)=>setExtraLocations(old=>old.map((loc,i)=>i===index?{...loc,[key]:value}:loc));
  const [result,setResult]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const [device,setDevice]=useState('desktop'),[exporting,setExporting]=useState(false);
  const [exportPairing,setExportPairing]=useState(null);
  const apiCurrent=health?.status==='ok'&&health.stage==='v42.1-location-free';
  const apiOutdated=health?.status==='ok'&&!apiCurrent;
  useEffect(()=>{
    fetch(apiUrl('/api/health')).then(r=>r.json()).then(setHealth).catch(()=>setHealth({status:'offline'}));
    fetch(apiUrl('/api/registry/basic')).then(r=>r.json()).then(d=>setBusinesses(d.businesses||[])).catch(()=>{});
  },[]);
  const steps=useMemo(()=>definition?['goal',...(definition.hybrid?['hybrid']:[]),'operation',
    ...(definition.specials|| (definition.special?[definition.special]:[])).map(q=>'special:'+q.id),
    'emphasis','style','company']:['intro'],[definition]);
  const current=definition?steps[step]:'intro';
  const activeSpecial=current.startsWith('special:')
    ?(definition?.specials||[definition?.special]).find(q=>q?.id===current.slice(8)):null;
  const supportedBusinesses=businesses.filter(b=>b.pilot);
  const selectedInfo=supportedBusinesses.find(x=>x.id===selectedId);
  const count=steps.length+1;
  const progress=definition?Math.round(((step+1)/count)*100):7;
  const input=useMemo(()=>({businessId:definition?.id||selectedId,businessName,description,goal,style,bookingPairing:bookingLinkCode.trim(),
    answers:{...answers,showWelcome,contactPhone,externalBookingUrl},
    businessData:{locationMode,businessName,phone:contactPhone,email,city,address:locationMode==='physical'?address:'',hours,website,whatsapp,viber,locations:locationMode==='physical'?extraLocations:[]}}),
    [definition,selectedId,businessName,description,goal,style,bookingLinkCode,answers,showWelcome,contactPhone,externalBookingUrl,email,city,address,hours,website,whatsapp,viber,extraLocations,locationMode]);
  async function json(path,opts){
    const response=await fetch(apiUrl(path),opts);
    let data;try{data=await response.json()}catch{throw new Error('Server nije vratio ispravan odgovor.');}
    if(!response.ok)throw new Error(data.error||'Zahtev nije uspeo.');
    return data;
  }
  async function begin(e){
    e.preventDefault();setError('');setLoading(true);
    try{
      const understood=await json('/api/advisor/recognize?text='+encodeURIComponent(description.slice(0,800)));
      const chosen=selectedId||understood.businessId;
      setRecognizedId(understood.businessId||'');
      if(!chosen){throw new Error('Nisam pouzdano prepoznao delatnost. Izaberi delatnost iz ponuđene liste.');}
      if(!supportedBusinesses.some(x=>x.id===chosen))throw new Error('Delatnost još nije migrirana. Izaberite neku od podržanih delatnosti.');
      const def=await json('/api/advisor/questions/'+encodeURIComponent(chosen));
      setSelectedId(chosen);setDefinition(def);setAnswers({});setGoal('purchase');setStyle('modern');setShowWelcome(false);setBusinessName('');setExternalBookingUrl('');setBookingLinkCode('');setLocationMode('physical');setExtraLocations([]);setCity('');setAddress('');setStep(0);setResult(null);
    }catch(ex){setError(ex.message)}finally{setLoading(false)}
  }
  function pick(key,value){
    setError('');
    if(key==='goal')setGoal(value);
    else if(key==='style')setStyle(value);
    else if(key==='hybrid')setAnswers(a=>({...a,hybridChoice:value}));
    else if(key.startsWith('special:'))setAnswers(a=>({...a,[key.slice(8)]:value}));
    else setAnswers(a=>({...a,[key==='operation'?'businessMode':'emphasis']:value}));
    setStep(s=>Math.min(steps.length-1,s+1));
  }
  async function generate(e){
    e.preventDefault();setError('');setLoading(true);
    try{
      const data=await json('/api/site/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
      setResult(data);setDevice('desktop');setExportPairing(null);
    }catch(ex){setError(ex.message)}finally{setLoading(false)}
  }
  async function exportZip(){
    setError('');setExporting(true);setExportPairing(null);
    try{
      const response=await fetch(apiUrl('/api/site/export'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
      if(!response.ok){let error;try{error=(await response.json()).error}catch{}throw new Error(error||'ZIP nije generisan.');}
      const pairingCode=response.headers.get('X-RMC-Booking-Code');
      const expires=Number(response.headers.get('X-RMC-Booking-Expires')||0);
      const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='RMC_'+(businessName||'besplatan_sajt').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w-]+/g,'_').slice(0,45)+'_WEB.zip';
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
      if(pairingCode)setExportPairing({code:pairingCode,minutes:Math.round(expires/60)});
    }catch(ex){setError(ex.message)}finally{setExporting(false)}
  }
  // Sandbox-preserving preview crypto broker. Only our current srcDoc iframe
  // may ask the trusted localhost parent to encrypt an already validated request.
  useEffect(()=>{
    const handle=async event=>{
      if(!previewFrame.current||event.source!==previewFrame.current.contentWindow)return;
      const d=event.data;
      if(d?.type!=='RMC_PREVIEW_CRYPTO_REQUEST'||typeof d.nonce!=='string'||d.nonce.length>100)return;
      if(JSON.stringify(d).length>6500)return;
      const reply={type:'RMC_PREVIEW_CRYPTO_REPLY',nonce:d.nonce};
      try{
        if(!window.RMCBookingLink)throw new Error('Modul za zaštitu podataka nije učitan.');
        reply.link=await window.RMCBookingLink.create(d.payload,d.token,d.managerUrl);
      }catch(e){reply.error=String(e?.message||'Greška pri šifrovanju.');}
      event.source?.postMessage(reply,'*');
    };
    window.addEventListener('message',handle);
    return()=>window.removeEventListener('message',handle);
  },[]);
  const previewBase=window.location.origin+import.meta.env.BASE_URL;
  const previewHtml=result?.previewHtml
    ?.replace('href="site.css"','href="'+previewBase+'site.css"')
    ?.replace('href="visual-system.css"','href="'+previewBase+'visual-system.css"')
    ?.replace('href="global-modal.css"','href="'+previewBase+'global-modal.css"')
    ?.replace('src="global-modal.js"','src="'+previewBase+'global-modal.js"')
    ?.replace('src="export-runtime.js"','src="'+previewBase+'export-runtime.js"')
    ?.replace('href="booking.css"','href="'+previewBase+'booking.css"')
    ?.replace('src="booking-runtime.js"','src="'+previewBase+'booking-runtime.js"')
    ?.replace('src="booking-link.js"','src="'+previewBase+'booking-link.js"')
    ?.replace('href="hybrid.css"','href="'+previewBase+'hybrid.css"')
    ?.replace('src="hybrid-runtime.js"','src="'+previewBase+'hybrid-runtime.js"')
    ?.replace('href="pharmacy-consult.css"','href="'+previewBase+'pharmacy-consult.css"')
    ?.replace('src="pharmacy-consult-runtime.js"','src="'+previewBase+'pharmacy-consult-runtime.js"')
    ?.replace('href="vertical.css"','href="'+previewBase+'vertical.css"')
    ?.replace('src="vertical-runtime.js"','src="'+previewBase+'vertical-runtime.js"')
    ?.replace('href="site-system.css"','href="'+previewBase+'site-system.css"')
    ?.replace('src="site-system.js"','src="'+previewBase+'site-system.js"');
  const defOfRecognized=businesses.find(x=>x.id===recognizedId);
  const serviceGoals=[{id:'purchase',label:'Više novih klijenata i upita',desc:'Olakšajte kontakt; termin se prikazuje samo ako ga zaista nudite.'},
   {id:'visit',label:'Više poziva i poseta',desc:'Naglasićemo direktan kontakt i lokaciju.'},
   {id:'catalog',label:'Predstavljanje usluga',desc:'Najpre prikazujemo usluge i stručnost.'}];
  const projectGoals=[
   {id:'purchase',label:'Više upita i novih projekata',desc:'Olakšavamo slanje upita i zahteva za ponudu.'},
   {id:'visit',label:'Više razgovora i poseta',desc:'Naglašavamo direktan kontakt i dogovor.'},
   {id:'catalog',label:'Portfolio i predstavljanje rada',desc:'Predstavljamo radove, reference i usluge bez nepostojećih rezultata.'}];
  const travelGoals=[
   {id:'purchase',label:'Više zainteresovanih gostiju i upita',desc:'Period boravka i zahtev za rezervaciju postoje samo kada su omogućeni.'},
   {id:'visit',label:'Više direktnih poziva i upita',desc:'Ističemo kontakt i mogućnost dogovora.'},
   {id:'catalog',label:'Predstavljanje smeštaja ili ponude',desc:'Prikazujemo stvarnu ponudu i praktične informacije.'}];
  const educationGoals=[
   {id:'purchase',label:'Više zainteresovanih polaznika',desc:'Prijavu prikazujemo samo ako je ustanova zaista prima preko sajta.'},
   {id:'visit',label:'Više upita i obilazaka',desc:'Olakšavamo dogovor oko programa ili posete.'},
   {id:'catalog',label:'Predstavljanje programa',desc:'Kursevi, sadržaj i korisne informacije.'}];
  const healthGoals=[
   {id:'purchase',label:'Više kontakata i zainteresovanih korisnika',desc:'Zahtev za termin postoji samo kada ga ustanova omogućava; nema potvrde bez odgovora.'},
   {id:'visit',label:'Više direktnih poziva',desc:'Prikazujemo kontakt i praktične informacije.'},
   {id:'catalog',label:'Predstavljanje usluga',desc:'Opis dostupnih usluga bez medicinskih tvrdnji.'}];
  function availableGoals(){const kind=definition?.verticalKind;
   if(definition?.serviceMode)return serviceGoals;
   if(['quote','property','construction'].includes(kind))return projectGoals;
   if(['stay','rental','travel'].includes(kind))return travelGoals;
   if(['enrollment','kindergarten'].includes(kind))return educationGoals;
   if(['clinical','lab','vet'].includes(kind))return healthGoals;
   return goals; // retail: standard purchase/visit/catalog wording
  }
  return <>
    <header className="app-header"><div className="brand">RMC <span>WEB SOLUTIONS</span></div><div className="header-status"><span className={'dot '+(health?.status==='ok'?'ok':'')}></span>{apiOutdated?'NODE API: STARA VERZIJA — RESTARTUJ SERVER':apiCurrent?'NODE API POVEZAN':'API NIJE POVEZAN'} <span className="version">V42.1 · LOCATION / MAP / PHONE · BESPLATAN SAJT</span></div></header>
    <main className={'studio '+(result?'with-preview':'')}>
      <aside className="wizard"><div className="wizard-top"><div className="eyebrow">WEB SOLUTIONS ADVISOR</div><h1>{result?'Sajt je spreman za test':'Napravite biznis sajt'}</h1><p>{result?'Preview i ZIP nastaju iz iste Node konfiguracije.':'Od opisa vašeg posla do funkcionalnog test sajta.'}</p>
        <div className="progress" aria-label="Napredak"><div style={{width:(result?100:progress)+'%'}}/></div><small className="step-count">{result?'GENERISANO':definition?`KORAK ${step+2} OD ${count}`:'KORAK 1 — OPIS POSLA'}</small></div>
        {result?<div className="wizard-content">
          <div className="success-mark">✓</div><h2>{result.siteConfig.business.name}</h2><p>Advisor je završio proces. Preview i ZIP generisani su iz iste Node konfiguracije.</p>
          <div className="summary-box"><div><span>Delatnost</span><strong>{result.siteConfig.business.label}</strong></div><div><span>Stil</span><strong>{definition?.styles.find(x=>x.id===style)?.label||style}</strong></div><div><span>Moduli</span><strong>{result.siteConfig.modules.join(' · ')}</strong></div></div>
          <button className="action" type="button" onClick={exportZip} disabled={exporting}>{exporting?'Pripremam ZIP...':'Preuzmi besplatan sajt (ZIP) ↓'}</button>
          {exportPairing&&<div role="status" style={{marginTop:'1rem',padding:'1rem',border:'2px solid currentColor',borderRadius:12}}>
            <strong>Kod za Booking Manager:</strong> <code style={{fontSize:'1.45rem',fontWeight:800,letterSpacing:2}}>{exportPairing.code}</code>
            <button type="button" onClick={()=>navigator.clipboard?.writeText(exportPairing.code)} style={{marginLeft:12}}>Kopiraj kod</button>
            <p>Unesite kod u Booking Manager na telefonu, tabletu ili računaru u narednih {exportPairing.minutes} minuta. Kod je i u preuzetom ZIP-u. Sačuvajte kod. Direktno slanje rezervacija biće aktivirano nakon integracije Booking Managera.</p>
          </div>}
          <button className="quiet" type="button" onClick={()=>{setResult(null);setStep(steps.length-1);setError('');}}>Izmeni podatke / stil</button>
          <button className="quiet" type="button" onClick={()=>{setDefinition(null);setResult(null);setStep(0);setError('');setSelectedId('');}}>Napravi drugi sajt</button>
          <p className="small-note">Besplatan sajt: zahtevi za porudžbine i termine pripremaju poruke. Nema automatske naplate niti potvrde raspoloživosti.</p>
        </div>:<div className="wizard-content">
          {current==='intro'&&<section className="question"><div className="eyebrow">1 · OPIS</div><h2>Čime se bavite?</h2><p>Opišite posao. Advisor će predložiti delatnost i postaviti odgovarajuće poslovno pitanje.</p>
            <form id="introForm" onSubmit={begin}><label className="field">Vaš opis<textarea rows={4} maxLength={800} minLength={3} required value={description} onChange={e=>setDescription(e.target.value)} placeholder="Imam mesaru i nudim pripremu mesa..."/></label>
            <label className="field">Delatnost (opciono — za testiranje)<select value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">Advisor prepoznaje iz opisa</option>{[...new Set(supportedBusinesses.map(x=>x.group))].sort().map(group=><optgroup key={group} label={group}>{supportedBusinesses.filter(x=>x.group===group).map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</optgroup>)}</select></label>
            {defOfRecognized&&<p>Razumeo sam: {defOfRecognized.label}</p>}
            <button className="action" type="submit" disabled={loading}>{loading?'Prepoznajem...':'Nastavi →'}</button></form>
            <div className="pilot-list"><b>Brzi test scenariji</b>{['hair-salon','restaurant','optician','auto-service','plumber','consultant','kids-playroom','bakery','catering','gift-shop','car-wash','cleaning','fitness-center','plumbing-supplies','electrical-supplies','auto-parts','phone-store','repair-phone','furniture-store', 'butcher-shop','wine-shop','shoe-shop'].map(id=>supportedBusinesses.find(x=>x.id===id)).filter(Boolean).map(x=><button key={x.id} type="button" onClick={()=>{setSelectedId(x.id);setDescription('Imam '+x.label+' i želim novi sajt');}}><strong>{x.label}</strong><small>{x.group}</small></button>)}</div>
          </section>}
          {current==='goal'&&<ChoiceStep eyebrow="2 · CILJ" title="Šta je najvažnije za ovaj sajt?" items={availableGoals()} value={goal} onPick={v=>pick('goal',v)}/>}
          {current==='hybrid'&&<ChoiceStep eyebrow="POVEZANE DELATNOSTI" title={definition.hybrid.question} help={definition.hybrid.help} items={definition.hybrid.options} value={answers.hybridChoice} onPick={v=>pick('hybrid',v)}/>}
          {current==='operation'&&<ChoiceStep eyebrow="3 · POSLOVANJE" title={definition.operation.question} help="Ovo podešava način na koji biznis prima zahteve." items={definition.operation.options.map(x=>({id:x,label:x}))} value={answers.businessMode} onPick={v=>pick('operation',v)}/>}
          {activeSpecial&&<ChoiceStep key={activeSpecial.id} eyebrow="POSLOVNE MOGUĆNOSTI" title={activeSpecial.question} help="Ovaj odgovor nezavisno uključuje ili isključuje odgovarajući modul — cilj sajta to ne menja." items={activeSpecial.options} value={typeof answers[activeSpecial.id]==='boolean'?(answers[activeSpecial.id]?'yes':'no'):(answers[activeSpecial.id]??'')} onPick={v=>pick('special:'+activeSpecial.id,v==='yes'?true:v==='no'?false:v)}/>}
          {current==='emphasis'&&<ChoiceStep eyebrow="SADRŽAJ" title={definition.emphasis.question} items={definition.emphasis.options.map(x=>({id:x,label:x}))} value={answers.emphasis} onPick={v=>pick('emphasis',v)}/>}
          {current==='style'&&<ChoiceStep eyebrow="STIL" title="Kako želite da sajt izgleda?" items={definition.styles.map(x=>({id:x.id,label:x.label}))} value={style} onPick={v=>pick('style',v)}/>}
          {current==='company'&&<section className="question"><div className="eyebrow">ZAVRŠNI KORAK</div><h2>Kako se vaš biznis zove?</h2><p>Unesite stvarne podatke. Jedna poslovna adresa uključena je besplatno; za rad na terenu ili onlajn birate odgovarajuću opciju.</p>
            <form id="companyForm" onSubmit={generate}><label className="field">Naziv firme<input autoFocus required maxLength={100} value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Naziv firme"/></label>
            <label className="field">Kontakt telefon (opciono)<input type="tel" autoComplete="tel" maxLength={35} value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="+381 ..."/></label>
            <fieldset className="v421-mode"><legend>Gde poslujete?</legend>
              <label><input type="radio" name="locationMode" checked={locationMode==='physical'} onChange={()=>setLocationMode('physical')}/> Imam poslovnu adresu (1 lokacija besplatno)</label>
              <label><input type="radio" name="locationMode" checked={locationMode==='service-area'} onChange={()=>setLocationMode('service-area')}/> Radim na terenu (prikaz područja, bez javne adrese)</label>
              <label><input type="radio" name="locationMode" checked={locationMode==='online'} onChange={()=>setLocationMode('online')}/> Poslujem samo onlajn (bez mape)</label>
            </fieldset>
            {locationMode!=='online'&&<div className="v421-required-location">
              <label className="field">{locationMode==='physical'?'Grad (obavezno)':'Grad / područje rada (obavezno)'}<input required maxLength={80} value={city} onChange={e=>setCity(e.target.value)} placeholder="Beograd"/></label>
              {locationMode==='physical'&&<label className="field">Ulica i broj (obavezno)<input required maxLength={180} value={address} onChange={e=>setAddress(e.target.value)} placeholder="Ulica i broj"/></label>}
              <p className="small-note">{locationMode==='physical'?'Jedna lokacija je uključena u besplatan sajt. Mapa se prikazuje samo kada je posetilac zatraži.':'Na sajtu se prikazuje samo područje rada, bez ulične adrese i bez precizne mape.'}</p>
            </div>}
            <details className="v42-contact"><summary>Dodatni kontakt podaci (opciono)</summary>
              <p>Koristimo samo podatke koje unesete. Na sajtu nema lažnih brojeva telefona ili adresa.</p>
              <label className="field">Email<input type="email" maxLength={160} value={email} onChange={e=>setEmail(e.target.value)} placeholder="kontakt@firma.rs"/></label>
              <label className="field">Radno vreme<input maxLength={140} value={hours} onChange={e=>setHours(e.target.value)} placeholder="Pon–Pet 09–18"/></label>
              <label className="field">Vaš postojeći sajt (HTTPS)<input type="url" value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://firma.rs"/></label>
              <label className="field">WhatsApp broj (opciono)<input type="tel" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="+381..."/></label>
              <label className="field">Viber broj (opciono)<input type="tel" value={viber} onChange={e=>setViber(e.target.value)} placeholder="+381..."/></label>
              {locationMode==='physical'&&extraLocations.map((loc,i)=><fieldset className="v42-location" key={i}><legend>Dodatna lokacija {i+2}</legend>
                <label className="field">Naziv lokacije<input maxLength={80} value={loc.label} onChange={e=>modifyLocation(i,'label',e.target.value)} placeholder="Filijala Novi Beograd"/></label>
                <label className="field">Grad<input maxLength={80} value={loc.city} onChange={e=>modifyLocation(i,'city',e.target.value)}/></label>
                <label className="field">Adresa<input maxLength={180} value={loc.address} onChange={e=>modifyLocation(i,'address',e.target.value)}/></label>
                <label className="field">Radno vreme<input maxLength={140} value={loc.hours} onChange={e=>modifyLocation(i,'hours',e.target.value)}/></label>
                <button type="button" className="quiet" onClick={()=>setExtraLocations(old=>old.filter((_,j)=>j!==i))}>Ukloni lokaciju</button>
              </fieldset>)}
              {locationMode==='physical'&&extraLocations.length<4&&<button className="quiet" type="button" onClick={()=>setExtraLocations(old=>[...old,{label:'',city:'',address:'',hours:''}])}>+ Dodaj lokaciju</button>}
              <p className="small-note">Mapa ostaje zatvorena sve dok posetilac ne klikne na „Prikaži mapu“.</p>
            </details>
            {['hotel','apartments'].includes(definition?.id)&&/spoljni booking/i.test(answers.businessMode||'')&&
             <label className="field">HTTPS link ka spoljnom sistemu za rezervacije<input type="url" required pattern="https://.*" value={externalBookingUrl} onChange={e=>setExternalBookingUrl(e.target.value)} placeholder="https://booking-partner.example/..." /></label>}
            <details className="v42-locations"><summary>Booking Manager — povezivanje sa sajtom (V43.2)</summary>
              <p className="small-note">Ako sajt prima rezervacije: na telefonu otvori RMC Booking Manager → Podešavanja → „Poveži ovu firmu sa sajtom“. Ovde nalepi samo JAVNI kod. NIKADA privatni ključ ili rezervnu kopiju.</p>
              <label className="field">Javni kod iz Booking Managera (opciono)<textarea rows="3" value={bookingLinkCode} maxLength={2000} onChange={e=>setBookingLinkCode(e.target.value)} placeholder="RMCB1...." style={{width:'100%',maxWidth:'100%',overflowWrap:'anywhere'}}/></label>
              <p className="small-note">Prototip V43.2 šifrira booking zahteve. Prvi pilot: frizerski salon i servisne rezervacije; degustacija u vinoteci. Ostale vrste upita ostaju u postojećim formama.</p>
            </details>
            <label className="field welcome-option"><span><input type="checkbox" checked={showWelcome} onChange={e=>setShowWelcome(e.target.checked)}/> Prikaži uvodni Welcome prozor</span><small>Opcionalno · isti izgled u svih pet stilova · prikazuje se jednom po poseti.</small></label>
            <button className="action" type="submit" disabled={loading||!businessName.trim()}>{loading?'Generišem sajt...':'Kreiraj moj sajt →'}</button></form></section>}
          {definition&&<button className="quiet back" type="button" onClick={()=>{if(step===0){setDefinition(null);setStep(0)}else setStep(s=>s-1);setError('')}}>← Nazad</button>}
        </div>}
        {error&&<p role="alert" className="error">{error}</p>}
        <div className="wizard-footer">V39.5 ostaje netaknut · {health?.registryEntries||72} delatnosti u registru · {supportedBusinesses.length} migriranih scenarija
          {import.meta.env.DEV&&<a href="/legacy/" target="_blank" rel="noreferrer">Otvori stari V39.5 ↗</a>}</div>
      </aside>
      <section className="preview-area" aria-label="Pregled sajta">
        <div className="preview-bar"><div className="bar-title"><strong>PREVIEW</strong><span>{result?result.siteConfig.business.name:'Interaktivni prikaz'}</span></div><div className="device-buttons"><button type="button" className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}>Desktop</button><button type="button" className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')}>Mobile</button></div></div>
        {result?<div className={'viewport '+device}><iframe ref={previewFrame} key={`${result.siteConfig.business.id}-${device}-${style}`} title={'Preview '+result.siteConfig.business.name} srcDoc={previewHtml} sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox"/></div>
          :<div className="preview-empty"><div className="fake-browser"><div className="fake-top"><i/><i/><i/></div><div className="fake-hero"><span></span><b>Vaš sajt nastaje ovde.</b><p>Najpre odgovorite na pitanja Advisora.</p></div><div className="fake-cards"><i/><i/><i/></div></div><p>Pregled, korpa i degustacije pojaviće se čim završite poslednji korak.</p></div>}
      </section>
    </main>
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
