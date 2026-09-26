import React,{useEffect,useMemo,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {apiUrl} from './api.js';
import './style.css';
import './react-adapter.css';
import './advisor-ai-v395.css';
import {Landing,PreviewDialog,InfoDialog,LeadDialog,SHOWCASE} from './landing-react.jsx';

const goals=[
  {id:'purchase',label:'Prodaja i porudžbine',desc:'Kupac pronalazi proizvode i priprema porudžbinu.'},
  {id:'visit',label:'Više poseta prodavnici',desc:'Ponuda podstiče kupca da vas kontaktira ili poseti.'},
  {id:'catalog',label:'Predstavljanje ponude',desc:'Naglasak je na asortimanu i informacijama.'}
];
function ChoiceStep({eyebrow,title,help,items,value,onPick}){
  return <section className="question rmc-ai-question">
    <div className="rmc-ai-step-label">{eyebrow}</div><h2>{title}</h2>{help&&<p>{help}</p>}
    <div className="rmc-ai-choices">{items.map(item=><button key={item.id} type="button"
      className={'rmc-ai-choice'+(value===item.id?' is-selected':'')+(item.recommended?' is-recommended':'')}
      aria-pressed={value===item.id} onClick={()=>onPick(item.id)}>
      <span className="rmc-ai-choice-title">{item.label}</span>
      {item.desc&&<small>{item.desc}</small>}
      {item.recommended&&<em>Predlog Advisora</em>}
      <b aria-hidden="true">{value===item.id?'✓':'→'}</b>
    </button>)}</div>
  </section>;
}
function App(){
  const previewFrame=useRef(null);
  const advisorDialogRef=useRef(null);
  const lastFocusRef=useRef(null);
  const [health,setHealth]=useState(null),[businesses,setBusinesses]=useState([]);
  const [description,setDescription]=useState(''),[selectedId,setSelectedId]=useState(''),[recognizedId,setRecognizedId]=useState('');
  const [definition,setDefinition]=useState(null),[step,setStep]=useState(0),[goal,setGoal]=useState('purchase');
  const [answers,setAnswers]=useState({}),[style,setStyle]=useState('modern'),[showWelcome,setShowWelcome]=useState(false);
  const [businessName,setBusinessName]=useState(''),[contactPhone,setContactPhone]=useState(''),[externalBookingUrl,setExternalBookingUrl]=useState('');
  const [email,setEmail]=useState(''),[city,setCity]=useState(''),[address,setAddress]=useState(''),[hours,setHours]=useState('');
  const [website,setWebsite]=useState(''),[whatsapp,setWhatsapp]=useState(''),[viber,setViber]=useState('');
  const [extraLocations,setExtraLocations]=useState([]);
  const [locationMode,setLocationMode]=useState('physical');
  const modifyLocation=(index,key,value)=>setExtraLocations(old=>old.map((loc,i)=>i===index?{...loc,[key]:value}:loc));
  const [result,setResult]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const [device,setDevice]=useState('desktop'),[exporting,setExporting]=useState(false);
  const [exportPairing,setExportPairing]=useState(null);
  const [advisorOpen,setAdvisorOpen]=useState(false);
  const [advisorAcknowledgement,setAdvisorAcknowledgement]=useState('');
  const [previewOpen,setPreviewOpen]=useState(false);
  const [samplePreview,setSamplePreview]=useState(null);
  const [currentDemo,setCurrentDemo]=useState('salon');
  const [leadPackage,setLeadPackage]=useState('');
  const [infoType,setInfoType]=useState('');
  const sampleRequestSeq=useRef(0);
  // Modal is owned by React; never move the legacy business logic here.
  useEffect(()=>{
    if(!advisorOpen)return;
    lastFocusRef.current=document.activeElement;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    function onKeyDown(event){
      if(event.key==='Escape'){event.preventDefault();setAdvisorOpen(false);return;}
      if(event.key!=='Tab')return;
      const controls=[...advisorDialogRef.current?.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex="0"]')||[]]
        .filter(el=>el.getClientRects().length>0);
      if(!controls.length)return;
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    document.addEventListener('keydown',onKeyDown);
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',onKeyDown);
      if(lastFocusRef.current?.isConnected)lastFocusRef.current.focus?.({preventScroll:true});
    };
  },[advisorOpen]);
  useEffect(()=>{
    fetch(apiUrl('/api/health')).then(r=>r.json()).then(setHealth).catch(()=>setHealth({status:'offline'}));
    fetch(apiUrl('/api/registry/basic')).then(r=>r.json()).then(d=>setBusinesses(d.businesses||[])).catch(()=>{});
  },[]);
  const steps=useMemo(()=>definition?['goal',...(definition.hybrid?['hybrid']:[]),'operation',
    ...(definition.specials|| (definition.special?[definition.special]:[])).map(q=>'special:'+q.id),
    'emphasis','style','company']:['intro'],[definition]);
  const current=definition?steps[step]:'intro';
  useEffect(()=>{
    if(!advisorOpen)return;
    const task=requestAnimationFrame(()=>{
      const card=advisorDialogRef.current;
      card?.querySelector('.rmc-ai-scroll')?.scrollTo({top:0,behavior:'instant'});
      const field=card?.querySelector(current==='intro'?'#rmc-ai-description':'.rmc-ai-question h2');
      if(field){if(field.tagName==='H2')field.setAttribute('tabindex','-1');field.focus({preventScroll:true});}
    });
    return()=>cancelAnimationFrame(task);
  },[advisorOpen,current]);
  const activeSpecial=current.startsWith('special:')
    ?(definition?.specials||[definition?.special]).find(q=>q?.id===current.slice(8)):null;
  const supportedBusinesses=businesses.filter(b=>b.pilot);
  const selectedInfo=supportedBusinesses.find(x=>x.id===selectedId);
  const count=steps.length+1;
  const progress=definition?Math.round(((step+1)/count)*100):7;
  const input=useMemo(()=>({businessId:definition?.id||selectedId,businessName,description,goal,style,
    answers:{...answers,showWelcome,contactPhone,externalBookingUrl},
    businessData:{locationMode,businessName,phone:contactPhone,email,city,address:locationMode==='physical'?address:'',hours,website,whatsapp,viber,locations:locationMode==='physical'?extraLocations:[]}}),
    [definition,selectedId,businessName,description,goal,style,answers,showWelcome,contactPhone,externalBookingUrl,email,city,address,hours,website,whatsapp,viber,extraLocations,locationMode]);
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
      setAdvisorAcknowledgement(chosen===understood.businessId&&typeof understood.acknowledgement==='string'?understood.acknowledgement.slice(0,250):'');
      if(!chosen){throw new Error('Nisam pouzdano prepoznao delatnost. Izaberi delatnost iz ponuđene liste.');}
      if(!supportedBusinesses.some(x=>x.id===chosen))throw new Error('Delatnost još nije migrirana. Izaberite neku od podržanih delatnosti.');
      const def=await json('/api/advisor/questions/'+encodeURIComponent(chosen));
      setSelectedId(chosen);setDefinition(def);setAnswers({});setGoal('purchase');setStyle('modern');setShowWelcome(false);setBusinessName('');setExternalBookingUrl('');setLocationMode('physical');setExtraLocations([]);setCity('');setAddress('');setStep(0);setResult(null);
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
      setResult(data);setDevice('desktop');setExportPairing(null);setSamplePreview(null);
      setAdvisorOpen(false);setPreviewOpen(true);
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
  // One preview adapter for both the current Advisor result and live examples.
  // No old public iframe or browser-side business engine.
  const previewBase=window.location.origin+import.meta.env.BASE_URL;
  const hydratePreview=html=>html
    ?.replace('href="site.css"','href="'+previewBase+'site.css"')
    ?.replace('href="visual-system.css"','href="'+previewBase+'visual-system.css"')
    ?.replace('href="global-modal.css"','href="'+previewBase+'global-modal.css"')
    ?.replace('src="global-modal.js"','src="'+previewBase+'global-modal.js"')
    ?.replace('src="export-runtime.js"','src="'+previewBase+'export-runtime.js"')
    ?.replace('href="booking.css"','href="'+previewBase+'booking.css"')
    ?.replace('src="booking-link.js"','src="'+previewBase+'booking-link.js"')
    ?.replace('src="booking-runtime.js"','src="'+previewBase+'booking-runtime.js"')
    ?.replace('href="hybrid.css"','href="'+previewBase+'hybrid.css"')
    ?.replace('src="hybrid-runtime.js"','src="'+previewBase+'hybrid-runtime.js"')
    ?.replace('href="pharmacy-consult.css"','href="'+previewBase+'pharmacy-consult.css"')
    ?.replace('src="pharmacy-consult-runtime.js"','src="'+previewBase+'pharmacy-consult-runtime.js"')
    ?.replace('href="vertical.css"','href="'+previewBase+'vertical.css"')
    ?.replace('src="vertical-runtime.js"','src="'+previewBase+'vertical-runtime.js"')
    ?.replace('href="site-system.css"','href="'+previewBase+'site-system.css"')
    ?.replace('src="site-system.js"','src="'+previewBase+'site-system.js"');
  const previewHtml=hydratePreview(result?.previewHtml);
  function startNewSite(){
    setPreviewOpen(false);setSamplePreview(null);setDefinition(null);setResult(null);
    setSelectedId('');setRecognizedId('');setDescription('');setStep(0);setError('');
    setAdvisorOpen(true);
  }
  function editSite(){
    setPreviewOpen(false);setError('');setStep(Math.max(0,steps.length-1));setAdvisorOpen(true);
  }
  // Sample buttons request ACTUAL currently generated content from the Node API.
  // They do not execute any code from the earlier browser-side generator.
  async function openExample(exampleId){
    const entry=SHOWCASE.find(item=>item.id===exampleId);
    if(!entry)return;
    const seq=++sampleRequestSeq.current;
    setCurrentDemo(entry.id);setDevice('desktop');setSamplePreview({loading:true,name:entry.name});
    setPreviewOpen(true);
    try{
      const def=await json('/api/advisor/questions/'+encodeURIComponent(entry.businessId));
      const sampleAnswers={
        businessMode:def.operation?.options?.[0]||'',
        emphasis:def.emphasis?.options?.[0]||'',
        ...(def.hybrid?.options?.length?{hybridChoice:def.hybrid.options[0].id}:{})
      };
      for(const special of (def.specials||(def.special?[def.special]:[]))){
        if(!special?.id)continue;
        const positive=special.options?.find(item=>item.id==='yes');
        sampleAnswers[special.id]=positive?true:(special.options?.[0]?.id??true);
      }
      const payload={
        businessId:entry.businessId,businessName:entry.name,
        description:'Demonstracioni prikaz: '+entry.type,goal:'purchase',style:'modern',
        answers:sampleAnswers,
        businessData:{locationMode:'online',businessName:entry.name,phone:'',email:'',city:'',
          address:'',hours:'',website:'',whatsapp:'',viber:'',locations:[]}
      };
      const sample=await json('/api/site/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(seq!==sampleRequestSeq.current)return;
      if(!sample.previewHtml)throw new Error('Server nije vratio HTML za primer sajta.');
      setSamplePreview({loading:false,name:entry.name,html:hydratePreview(sample.previewHtml)});
    }catch(ex){
      if(seq===sampleRequestSeq.current)setSamplePreview({loading:false,name:entry.name,error:ex.message});
    }
  }
  const defOfRecognized=businesses.find(x=>x.id===recognizedId);
  const recognizedLabel=businesses.find(x=>x.id===(definition?.id||selectedId))?.label||definition?.label||defOfRecognized?.label||'vaše poslovanje';
  const examplePrompts=['Frizerski salon','Auto servis','Prodajem vino i organizujem degustacije','Vodoinstalaterske usluge'];
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
    <Landing onStart={startNewSite} onOpenSite={()=>{setSamplePreview(null);setDevice('desktop');setPreviewOpen(true)}}
      onExample={openExample} onLead={setLeadPackage} onInfo={setInfoType} hasResult={Boolean(result)}/>
    <PreviewDialog open={previewOpen} mode={samplePreview?'sample':'site'}
      siteName={samplePreview?.name||result?.siteConfig?.business?.name}
      html={samplePreview?samplePreview.html:previewHtml} loading={samplePreview?.loading}
      error={samplePreview?.error} selectedDemo={currentDemo} onSelectDemo={openExample}
      onClose={()=>{++sampleRequestSeq.current;setPreviewOpen(false)}} onStart={startNewSite}
      onExport={exportZip} exporting={exporting} exportPairing={exportPairing}
      onEdit={editSite} device={device} onDevice={setDevice} frameRef={previewFrame}/>
    <InfoDialog type={infoType} onClose={()=>setInfoType('')}/>
    <LeadDialog packageName={leadPackage} onClose={()=>setLeadPackage('')}/>
    {advisorOpen&&<div className="advisor-overlay rmc-ai-overlay" id="advisorOverlay" role="presentation">
      <div ref={advisorDialogRef} className="advisor-card rmc-ai-card" role="dialog" aria-modal="true" aria-label="Web Solutions AI Advisor">
        <header className="advisor-head rmc-ai-head">
          <button type="button" className="rmc-ai-back" aria-label="Nazad" disabled={!definition&&step===0}
            onClick={()=>{if(step===0){setDefinition(null);setStep(0);}else setStep(s=>s-1);setError('');}}>
            ← <span>Nazad</span>
          </button>
          <div className="rmc-ai-progress" role="progressbar" aria-label="Napredak Advisora" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span style={{width:progress+'%'}} />
          </div>
          <span className="rmc-ai-step-count">{definition?`${step+2} / ${count}`:'1 / …'}</span>
          <button type="button" className="rmc-ai-close" aria-label="Zatvori Advisor" onClick={()=>setAdvisorOpen(false)}>×</button>
        </header>
        <div className="rmc-ai-scroll" id="advisorContent" key={definition?current:'intro'}>
          {!definition?<section className="question rmc-ai-question rmc-ai-intro">
            <div className="rmc-ai-step-label">✦ AI WEB ADVISOR</div>
            <h1 id="rmc-ai-modal-title">Opišite čime se bavite.</h1>
            <p>Pišite prirodno, kao da objašnjavate posao nekome ko vas prvi put upoznaje.</p>
            <form id="introForm" onSubmit={begin}>
              <label className="rmc-ai-form-label" htmlFor="rmc-ai-description">Vaš opis</label>
              <textarea id="rmc-ai-description" rows={3} maxLength={800} minLength={3} required autoFocus
                value={description} onChange={e=>{setDescription(e.target.value);setSelectedId('');setError('');}}
                placeholder="Na primer: Imam vinoteku, prodajem vino i organizujem degustacije…"/>
              <div className="rmc-ai-chips" aria-label="Primeri opisa">
                {examplePrompts.map(prompt=><button key={prompt} type="button" className="rmc-ai-chip"
                  onClick={()=>{setDescription(prompt);setSelectedId('');setError('');document.getElementById('rmc-ai-description')?.focus();}}>{prompt}</button>)}
              </div>
              {error&&<div className="rmc-ai-fallback">
                <label htmlFor="rmc-ai-business-select">Ako opis nije prepoznat, izaberite podržanu delatnost:</label>
                <select id="rmc-ai-business-select" value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
                  <option value="">Izaberite delatnost</option>
                  {supportedBusinesses.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </div>}
              <button className="rmc-ai-primary" type="submit" disabled={loading||description.trim().length<3}>
                {loading?<><span className="rmc-ai-pulse"/> Razumem vaš opis…</>:'Nastavi →'}
              </button>
            </form>
          </section>:<>
            <div className="rmc-ai-ack" role="status">
              <span aria-hidden="true">✦</span>
              <div><strong>{step===0?(advisorAcknowledgement||`Razumem — ${recognizedLabel}.`):recognizedLabel}</strong>
                <p>{step===0?'Hajde da prilagodimo sajt onome što vam je najvažnije.':'Vaši prethodni odgovori ostaju sačuvani.'}</p>
              </div>
            </div>
            {current==='goal'&&<ChoiceStep eyebrow="POSLOVNI CILJ" title="Šta je najvažnije za ovaj sajt?" items={availableGoals()} value={goal} onPick={v=>pick('goal',v)}/>}
            {current==='hybrid'&&<ChoiceStep eyebrow="POVEZANE DELATNOSTI" title={definition.hybrid.question} help={definition.hybrid.help} items={definition.hybrid.options} value={answers.hybridChoice} onPick={v=>pick('hybrid',v)}/>}
            {current==='operation'&&<ChoiceStep eyebrow="NAČIN POSLOVANJA" title={definition.operation.question} help="Odgovor podešava način na koji sajt prima zahteve." items={definition.operation.options.map(x=>({id:x,label:x}))} value={answers.businessMode} onPick={v=>pick('operation',v)}/>}
            {activeSpecial&&<ChoiceStep key={activeSpecial.id} eyebrow="POSLOVNE MOGUĆNOSTI" title={activeSpecial.question}
              help="Ovaj izbor uključuje ili isključuje odgovarajuću funkcionalnost." items={activeSpecial.options}
              value={typeof answers[activeSpecial.id]==='boolean'?(answers[activeSpecial.id]?'yes':'no'):(answers[activeSpecial.id]??'')}
              onPick={v=>pick('special:'+activeSpecial.id,v==='yes'?true:v==='no'?false:v)}/>}
            {current==='emphasis'&&<ChoiceStep eyebrow="IZDVAJAMO" title={definition.emphasis.question}
              items={definition.emphasis.options.map(x=>({id:x,label:x}))} value={answers.emphasis} onPick={v=>pick('emphasis',v)}/>}
            {current==='style'&&<ChoiceStep eyebrow="VIZUELNI PRAVAC" title="Kako želite da sajt izgleda?"
              help="Stil menja vizuelni izraz, a ne odabrane poslovne funkcije."
              items={definition.styles.map(x=>({id:x.id,label:x.label,desc:x.description}))} value={style} onPick={v=>pick('style',v)}/>}
          {current==='company'&&<section className="question rmc-ai-question rmc-ai-company"><div className="rmc-ai-step-label">ZAVRŠNI KORAK</div><h2>Kako se vaš biznis zove?</h2><p>Unesite stvarne podatke. Jedna poslovna adresa uključena je besplatno; za rad na terenu ili onlajn birate odgovarajuću opciju.</p>
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
            <p className="rmc-ai-booking-note">Ako ste uključili rezervacije ili zakazivanje, prilikom preuzimanja ZIP-a dobićete jednokratni kod za povezivanje sa RMC Business Portalom. Kod se nikada ne unosi u javni sajt.</p>
            <label className="field welcome-option"><span><input type="checkbox" checked={showWelcome} onChange={e=>setShowWelcome(e.target.checked)}/> Prikaži uvodni Welcome prozor</span><small>Opcionalno · isti izgled u svih pet stilova · prikazuje se jednom po poseti.</small></label>
            <button className="action" type="submit" disabled={loading||!businessName.trim()}>{loading?'Generišem sajt...':'Kreiraj moj sajt →'}</button></form></section>}
          </>}
          {error&&<p role="alert" className="rmc-ai-error">{error}</p>}
        </div>
        <footer className="rmc-ai-footnote"><span>RMC WEB SOLUTIONS</span><span>Bez registracije · Besplatan pregled</span></footer>
      </div>
    </div>}
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
