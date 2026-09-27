import React,{useEffect,useMemo,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {apiUrl} from './api.js';
import './style.css';
import './react-adapter.css';
import './advisor-ai-v395.css';
import {Landing,PreviewDialog,InfoDialog,LeadDialog,SHOWCASE} from './landing-react.jsx';
import {buildAdvisorDraft} from './advisor-flow.js';

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
function LiveReply({text,onComplete}){
  const [visible,setVisible]=useState('');
  const completion=useRef(onComplete);completion.current=onComplete;
  useEffect(()=>{
    let cancelled=false;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced){setVisible(text);completion.current?.();return;}
    setVisible('');let pos=0;
    const timer=window.setInterval(()=>{
      if(cancelled)return;
      pos=Math.min(text.length,pos+3);
      setVisible(text.slice(0,pos));
      if(pos>=text.length){clearInterval(timer);completion.current?.();}
    },18);
    return()=>{cancelled=true;clearInterval(timer);};
  },[text]);
  return <span>{visible}<span aria-hidden="true" className={visible.length<text.length?'rmc-live-cursor':'rmc-live-cursor is-done'}>▍</span></span>;
}
const firstPrompt='Opišite svoj posao svojim rečima. Razumeću šta je jasno, a pitaću samo ono što nedostaje.';
function nextAdvisorQuestion(definition,signals={}){
  if(!definition)return '';
  const draft=buildAdvisorDraft(definition,signals),next=draft.steps[0];
  if(next==='company')return 'Imam dovoljno podataka o funkcionalnosti sajta. Kako se zove vaš biznis i koji je kontakt telefon?';
  if(next==='operation')return definition.operation?.question||'';
  if(next==='hybrid')return definition.hybrid?.question||'';
  if(next?.startsWith('special:'))return (definition.specials||[]).find(q=>q.id===next.slice(8))?.question||'';
  return '';
}
function LiveThread({messages,latestId,completed,onComplete,thinking}){
  const bottom=useRef(null);
  useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[messages,thinking,completed,latestId]);
  return <div className="rmc-live-thread" role="log" aria-label="Razgovor sa AI Advisorom" aria-live="off" aria-relevant="additions">
    {messages.map(message=><div key={message.id} className={'rmc-live-row '+(message.from==='you'?'is-you':'is-ai')}>
      <span className="rmc-live-speaker">{message.from==='you'?'Vi':'✦ Advisor'}</span>
      <div className="rmc-live-bubble">{message.from==='ai'&&message.id===latestId&&!completed
        ?<LiveReply text={message.text} onComplete={onComplete}/>:message.text}</div>
    </div>)}
    {thinking&&<div className="rmc-live-row is-ai"><span className="rmc-live-speaker">✦ Advisor</span><div className="rmc-live-bubble rmc-live-thinking" aria-label="Advisor obrađuje vaš odgovor"><i/><i/><i/></div></div>}
    {completed&&latestId>0&&<div className="rmc-live-sr-only" role="status">{messages.find(m=>m.id===latestId)?.text}</div>}
    <div ref={bottom}/>
  </div>;
}
function App(){
  const previewFrame=useRef(null);
  const advisorDialogRef=useRef(null);
  const advisorScrollRef=useRef(null);
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
  const [advisorSignals,setAdvisorSignals]=useState({}),[advisorWarnings,setAdvisorWarnings]=useState([]);
   const [clarification,setClarification]=useState(null),[clarifyText,setClarifyText]=useState('');
  const messageCounter=useRef(0);
  const [liveMessages,setLiveMessages]=useState([{id:0,from:'ai',text:firstPrompt}]);
  const [latestReplyId,setLatestReplyId]=useState(0),[replyComplete,setReplyComplete]=useState(true);
  const [liveInput,setLiveInput]=useState('');
  const addUser=text=>setLiveMessages(old=>[...old,{id:++messageCounter.current,from:'you',text}]);
  const addReply=text=>{
    const id=++messageCounter.current;
    setReplyComplete(false);setLatestReplyId(id);
    setLiveMessages(old=>[...old,{id,from:'ai',text}]);
  };
  const [previewOpen,setPreviewOpen]=useState(false);
  const [samplePreview,setSamplePreview]=useState(null);
  const [currentDemo,setCurrentDemo]=useState('salon');
  const [leadPackage,setLeadPackage]=useState('');
  const [infoType,setInfoType]=useState('');
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
  const steps=useMemo(()=>definition?buildAdvisorDraft(definition,advisorSignals).steps:['intro'],[definition,advisorSignals]);
  const current=definition?steps[step]:'intro';
  useEffect(()=>{
    if(!advisorOpen)return;
    const task=requestAnimationFrame(()=>{
      const card=advisorDialogRef.current;
      // History stays visible; LiveThread follows the latest message.
      const field=card?.querySelector(current==='intro'?'#rmc-ai-description':current==='company'?'#rmc-company-name':'#rmc-live-answer');
      if(field && (replyComplete||current==='intro'))field.focus({preventScroll:true});
    });
    return()=>cancelAnimationFrame(task);
  },[advisorOpen,current,replyComplete]);
  useEffect(()=>{
    if(!advisorOpen||!replyComplete)return;
    const node=advisorScrollRef.current;
    // Bring quick choices into view; the long final contact form starts at its first field.
    const id=requestAnimationFrame(()=>{
      if(!node)return;
      const company=current==='company'?node.querySelector('.rmc-ai-company'):null;
      if(company)node.scrollTop=Math.max(0,company.offsetTop-node.offsetTop);
      else node.scrollTop=node.scrollHeight;
    });
    return()=>cancelAnimationFrame(id);
  },[advisorOpen,replyComplete,current,clarification]);
  const activeSpecial=current.startsWith('special:')
    ?(definition?.specials||[definition?.special]).find(q=>q?.id===current.slice(8)):null;
  const supportedBusinesses=businesses.filter(b=>b.pilot);
  const selectedInfo=supportedBusinesses.find(x=>x.id===selectedId);
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
   async function begin(e,manualId=null){
     e?.preventDefault?.();setError('');setLoading(true);
     if(manualId){addUser(supportedBusinesses.find(b=>b.id===manualId)?.label||manualId);}
     else if(clarifyText.trim()){addUser(clarifyText.trim());}
     else if(!clarification)addUser(description.trim());
     try{
       const text=(description+' '+clarifyText).trim().slice(0,800);
       const understood=await json('/api/advisor/understand',{method:'POST',headers:{'Content-Type':'application/json'},
         body:JSON.stringify({description:text,businessId:manualId||selectedId||null,clarified:Boolean(clarifyText.trim())})});
       if(understood.needsClarification){
         setClarification(understood.clarification);setAdvisorAcknowledgement('Potrebno je još jedno pojašnjenje.');
         addReply(understood.clarification?.question||'Možete li precizirati čime se bavite?');
         return;
       }
       const chosen=manualId||selectedId||understood.businessId;
       if(!chosen){
         setClarification({question:'Koja delatnost najbolje opisuje vaš posao?',choices:[]});
         addReply('Možete li detaljnije opisati delatnost?');
         return;
       }
       if(!supportedBusinesses.some(x=>x.id===chosen))throw new Error('Delatnost još nije podržana.');
       const def=await json('/api/advisor/questions/'+encodeURIComponent(chosen));
       const signals=understood.signals||{},draft=buildAdvisorDraft(def,signals);
       setRecognizedId(chosen);setAdvisorAcknowledgement(understood.acknowledgement||`Razumem — ${def.label}.`);
       addReply((understood.acknowledgement||`Razumem — ${def.label}.`)+' '+nextAdvisorQuestion(def,signals));
       setAdvisorSignals(signals);setAdvisorWarnings(understood.warnings||[]);
       setDescription(text);setClarification(null);setClarifyText('');
       setSelectedId(chosen);setDefinition(def);setAnswers(draft.answers);setGoal(draft.goal);setStyle(draft.style);
       setShowWelcome(false);setBusinessName('');setContactPhone('');setEmail('');setHours('');setWebsite('');setWhatsapp('');setViber('');setExternalBookingUrl('');setLocationMode('physical');setExtraLocations([]);setCity('');setAddress('');setStep(0);setResult(null);
     }catch(ex){setError(ex.message);addReply('Nisam uspeo da obradim odgovor. Pokušajte ponovo.');}finally{setLoading(false)}
   }
  function pick(key,value){
    setError('');
    const option=key.startsWith('special:')?activeSpecial?.options.find(x=>x.id===(value===true?'yes':value===false?'no':value)):null;
    addUser(option?.label||String(value));
    const signalKey=key.startsWith('special:')?key.slice(8):key==='operation'?'businessMode':key==='hybrid'?'hybridChoice':key;
    const updated={...advisorSignals,[signalKey]:value};
    if(key==='goal')setGoal(value);
    else if(key==='style')setStyle(value);
    else if(key==='hybrid')setAnswers(a=>({...a,hybridChoice:value}));
    else if(key.startsWith('special:'))setAnswers(a=>({...a,[signalKey]:value}));
    else setAnswers(a=>({...a,[signalKey]:value}));
    setAdvisorSignals(updated);
    setStep(0);
    addReply('Razumem. '+nextAdvisorQuestion(definition,updated));
  }
  async function continueConversation(e){
    e.preventDefault();
    const message=liveInput.trim();if(!message||loading||!replyComplete||!definition)return;
    addUser(message);setLiveInput('');setError('');setLoading(true);
    try{
      const response=await json('/api/advisor/refine',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({businessId:definition.id,message,currentQuestionId:current,signals:{...advisorSignals,...answers},goal,style})});
      const signals=response.signals||advisorSignals;
      setAdvisorSignals(signals);setAdvisorWarnings(response.warnings||[]);
      const draft=buildAdvisorDraft(definition,signals);
      setAnswers(draft.answers);setGoal(draft.goal);setStyle(draft.style);setStep(0);
      addReply((response.acknowledgement||'Razumem.')+' '+nextAdvisorQuestion(definition,signals));
    }catch(ex){setError(ex.message);addReply('Nisam uspeo da obradim izmenu. Možete pokušati ponovo.');}
    finally{setLoading(false);}
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
  // HTML adapter exclusively for the generated Advisor result.
  // Six frozen marketing examples load separately from /demo-previews/.
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
    setSelectedId('');setRecognizedId('');setDescription('');setClarification(null);setClarifyText('');setAdvisorSignals({});setAdvisorWarnings([]);setStep(0);setError('');
    setBusinessName('');setContactPhone('');setEmail('');setCity('');setAddress('');setHours('');setWebsite('');setWhatsapp('');setViber('');
    setStyle('modern');setGoal('purchase');setShowWelcome(false);setLocationMode('physical');setExtraLocations([]);setExternalBookingUrl('');setExportPairing(null);
    setLiveMessages([{id:++messageCounter.current,from:'ai',text:firstPrompt}]);
    setReplyComplete(true);setLatestReplyId(0);setLiveInput('');setAdvisorOpen(true);
  }
  function editSite(){
    setPreviewOpen(false);setError('');setStep(Math.max(0,steps.length-1));setAdvisorOpen(true);
  }
  // Marketing-only demos are six frozen, self-contained pages bundled under
  // client/public/demo-previews/. They never call the Advisor or Node generator.
  function openExample(exampleId){
    const entry=SHOWCASE.find(item=>item.id===exampleId);
    if(!entry)return;
    setCurrentDemo(entry.id);
    setDevice('desktop');
    setSamplePreview({name:entry.name});
    setPreviewOpen(true);
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
      onClose={()=>setPreviewOpen(false)} onStart={startNewSite}
      onExport={exportZip} exporting={exporting} exportPairing={exportPairing}
      onEdit={editSite} device={device} onDevice={setDevice} frameRef={previewFrame}/>
    <InfoDialog type={infoType} onClose={()=>setInfoType('')}/>
    <LeadDialog packageName={leadPackage} onClose={()=>setLeadPackage('')}/>
    {advisorOpen&&<div className="advisor-overlay rmc-ai-overlay" id="advisorOverlay" role="presentation">
      <div ref={advisorDialogRef} className="advisor-card rmc-ai-card" role="dialog" aria-modal="true" aria-label="Web Solutions AI Advisor">
        <header className="advisor-head rmc-ai-head">
          <button type="button" className="rmc-ai-back" aria-label="Nazad" disabled={!definition&&!clarification}
            onClick={()=>{if(definition){setDefinition(null);setClarification(null);setStep(0);setSelectedId('');setDescription('');setClarifyText('');setAdvisorSignals({});setAnswers({});addReply('Možemo početi ispočetka. Opišite mi delatnost.');}
              else{setClarification(null);addReply('Možete dati novi opis.');}setError('');}}>
            ← <span>Nazad</span>
          </button>
          <strong className="rmc-ai-header-title">AI Advisor</strong>
          <button type="button" className="rmc-ai-close" aria-label="Zatvori Advisor" onClick={()=>setAdvisorOpen(false)}>×</button>
        </header>
        <div ref={advisorScrollRef} className="rmc-ai-scroll" id="advisorContent">
          <LiveThread messages={liveMessages} latestId={latestReplyId} completed={replyComplete}
            onComplete={()=>setReplyComplete(true)} thinking={loading&&!exporting}/>
          {!definition?<section className="rmc-live-compose-section">
            {clarification? <div className="rmc-live-clarification" aria-label="Izbor delatnosti">
              {replyComplete&&<div className="rmc-live-options rmc-ai-clarify-options">
                {clarification.choices?.filter(item=>!clarification.question?.includes('prehrambenih')||item.id==='grocery-store').map(item=><button key={item.id} type="button" className="rmc-live-option"
                  disabled={loading} onClick={e=>begin(e,item.id)}>{item.label}</button>)}
                {clarification.question?.includes('prehrambenih')&&<button type="button" className="rmc-live-option" onClick={()=>{setClarifyText('Specijalizovana prodavnica: ');setTimeout(()=>document.getElementById('rmc-ai-description')?.focus(),0);}}>Specijalizovana prodavnica</button>}
              </div>}
              <button className="rmc-live-link" type="button" onClick={()=>{setClarification(null);setClarifyText('');setError('');addReply('Možete mi dati novi opis svog posla.');}}>Promeni početni opis</button>
            </div>:<>
              {liveMessages.length===1&&!description.trim()&&!loading&&<div className="rmc-live-suggestions">{examplePrompts.map(prompt=><button key={prompt} type="button" disabled={loading}
                onClick={()=>{setDescription(prompt);setError('');}}>{prompt}</button>)}</div>}
            </>}
          </section>:<>
            {current!=='company'&&replyComplete&&<>
              {activeSpecial&&<div className="rmc-live-options">{activeSpecial.options.map(item=><button type="button" key={item.id} className="rmc-live-option"
                onClick={()=>pick('special:'+activeSpecial.id,item.id==='yes'?true:item.id==='no'?false:item.id)}>{item.label}</button>)}</div>}
              {current==='operation'&&<div className="rmc-live-options">{definition.operation.options.map(value=><button type="button" key={value} className="rmc-live-option" onClick={()=>pick('operation',value)}>{value}</button>)}</div>}
              {current==='hybrid'&&<div className="rmc-live-options">{definition.hybrid.options.map(item=><button type="button" key={item.id} className="rmc-live-option" onClick={()=>pick('hybrid',item.id)}>{item.label}</button>)}</div>}
            </>}
                    {current==='company'&&replyComplete&&<section className="question rmc-ai-question rmc-ai-company"><div className="rmc-ai-step-label">ZAVRŠNI KORAK</div><h2>Podaci za vaš sajt</h2><p>Za završetak su potrebni naziv, telefon i način poslovanja. Dodatne informacije su opcione.</p>
            <form id="companyForm" onSubmit={generate}>
            <details className="rmc-live-settings"><summary>Opcionalno: stil sajta</summary>
              <div className="rmc-live-options">{definition.styles.map(item=><button type="button" key={item.id}
                className={'rmc-live-option'+(style===item.id?' is-selected':'')}
                onClick={()=>{setStyle(item.id);addUser('Stil: '+item.label);addReply('Stil sam sačuvao. '+nextAdvisorQuestion(definition,advisorSignals));}}>{item.label}</button>)}</div>
            </details>
            <label className="field">Naziv firme<input id="rmc-company-name" autoFocus required maxLength={100} value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Naziv firme"/></label>
            <label className="field">Kontakt telefon (obavezno)<input type="tel" required autoComplete="tel" maxLength={35} value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="+381 ..."/></label>
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
            <button className="action" type="submit" disabled={loading||!businessName.trim()||!contactPhone.trim()}>{loading?'Generišem sajt...':'Kreiraj moj sajt →'}</button></form></section>}
          </>}
          {error&&<p role="alert" className="rmc-ai-error">{error}</p>}
        </div>
        <div className="rmc-ai-compose-dock" aria-label="Odgovor Advisoru">
          {!definition?(clarification?
            <form onSubmit={e=>{e.preventDefault();if(clarifyText.trim().length>=3)begin(e);}} className="rmc-live-composer">
              <textarea id="rmc-ai-description" value={clarifyText} rows={2} maxLength={400}
                aria-label="Vaš odgovor" onChange={e=>setClarifyText(e.target.value)} placeholder="Napišite odgovor svojim rečima…"/>
              <button type="submit" disabled={!replyComplete||loading||clarifyText.trim().length<3}>Pošalji →</button>
            </form>:
            <form id="introForm" onSubmit={begin} className="rmc-live-composer">
              <textarea id="rmc-ai-description" autoFocus value={description} rows={2} maxLength={800} minLength={3} required
                aria-label="Opišite svoj posao" onChange={e=>{setDescription(e.target.value);setSelectedId('');setError('');}}
                placeholder="Opišite svoj posao svojim rečima…"/>
              <button type="submit" disabled={!replyComplete||loading||description.trim().length<3}>Pošalji →</button>
            </form>):
            <form className="rmc-live-composer" onSubmit={continueConversation}>
              <textarea id="rmc-live-answer" value={liveInput} rows={2} maxLength={400} aria-label="Odgovorite Advisoru"
                onChange={e=>setLiveInput(e.target.value)} placeholder={current==='company'?'Želite da promenite odgovor? Napišite ovde…':'Napišite odgovor svojim rečima…'}/>
              <button type="submit" disabled={!replyComplete||loading||liveInput.trim().length<3}>Pošalji →</button>
            </form>}
        </div>
        <footer className="rmc-ai-footnote"><span>RMC WEB SOLUTIONS</span><span>Bez registracije · Besplatan pregled</span></footer>
      </div>
    </div>}
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
