import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {apiUrl} from './api.js';
import './style.css';

const pilots=[
  {id:'butcher-shop',label:'Mesara',hint:'Sirovo / grilovano, količina u kg, korpa'},
  {id:'wine-shop',label:'Vinoteka',hint:'Vina, korpa i uslovne degustacije'},
  {id:'shoe-shop',label:'Prodavnica obuće',hint:'Brojevi, cene i standardna korpa'}
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
  const [health,setHealth]=useState(null),[businesses,setBusinesses]=useState([]);
  const [description,setDescription]=useState(''),[selectedId,setSelectedId]=useState(''),[recognizedId,setRecognizedId]=useState('');
  const [definition,setDefinition]=useState(null),[step,setStep]=useState(0),[goal,setGoal]=useState('purchase');
  const [answers,setAnswers]=useState({}),[style,setStyle]=useState('modern');
  const [businessName,setBusinessName]=useState(''),[contactPhone,setContactPhone]=useState('');
  const [result,setResult]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const [device,setDevice]=useState('desktop'),[exporting,setExporting]=useState(false);
  useEffect(()=>{
    fetch(apiUrl('/api/health')).then(r=>r.json()).then(setHealth).catch(()=>setHealth({status:'offline'}));
    fetch(apiUrl('/api/registry/basic')).then(r=>r.json()).then(d=>setBusinesses(d.businesses||[])).catch(()=>{});
  },[]);
  const steps=useMemo(()=>definition?['goal','operation',...(definition.special?['special']:[]),'emphasis','style','company']:['intro'],[definition]);
  const current=definition?steps[step]:'intro';
  const selectedInfo=pilots.find(x=>x.id===selectedId);
  const count=steps.length+1;
  const progress=definition?Math.round(((step+1)/count)*100):7;
  const input=useMemo(()=>({businessId:definition?.id||selectedId,businessName,description,goal,style,
    answers:{...answers,contactPhone}}),[definition,selectedId,businessName,description,goal,style,answers,contactPhone]);
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
      if(!chosen){throw new Error('Nisam pouzdano prepoznao delatnost. Izaberi Mesaru, Vinoteku ili Prodavnicu obuće.');}
      if(!pilots.some(x=>x.id===chosen))throw new Error('Prepoznata delatnost još čeka migraciju u React preview. Odaberi jedan od tri završena scenarija.');
      const def=await json('/api/advisor/questions/'+encodeURIComponent(chosen));
      setSelectedId(chosen);setDefinition(def);setAnswers({});setGoal('purchase');setStyle('modern');setBusinessName('');setStep(0);setResult(null);
    }catch(ex){setError(ex.message)}finally{setLoading(false)}
  }
  function pick(key,value){
    setError('');
    if(key==='goal')setGoal(value);
    else if(key==='style')setStyle(value);
    else if(key==='special')setAnswers(a=>({...a,[definition.special.id]:value}));
    else setAnswers(a=>({...a,[key==='operation'?'businessMode':'emphasis']:value}));
    setStep(s=>Math.min(steps.length-1,s+1));
  }
  async function generate(e){
    e.preventDefault();setError('');setLoading(true);
    try{
      const data=await json('/api/site/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
      setResult(data);setDevice('desktop');
    }catch(ex){setError(ex.message)}finally{setLoading(false)}
  }
  async function exportZip(){
    setError('');setExporting(true);
    try{
      const response=await fetch(apiUrl('/api/site/export'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
      if(!response.ok){let error;try{error=(await response.json()).error}catch{}throw new Error(error||'ZIP nije generisan.');}
      const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='RMC_'+(businessName||'demo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w-]+/g,'_').slice(0,45)+'_V41.zip';
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
    }catch(ex){setError(ex.message)}finally{setExporting(false)}
  }
  const previewBase=window.location.origin+import.meta.env.BASE_URL;
  const previewHtml=result?.previewHtml
    ?.replace('href="site.css"','href="'+previewBase+'site.css"')
    ?.replace('src="export-runtime.js"','src="'+previewBase+'export-runtime.js"');
  const defOfRecognized=businesses.find(x=>x.id===recognizedId);
  return <>
    <header className="app-header"><div className="brand">RMC <span>WEB SOLUTIONS</span></div><div className="header-status"><span className={'dot '+(health?.status==='ok'?'ok':'')}></span>{health?.status==='ok'?'NODE API POVEZAN':'API NIJE POVEZAN'} <span className="version">V41.2 · UX POPRAVKE</span></div></header>
    <main className={'studio '+(result?'with-preview':'')}>
      <aside className="wizard"><div className="wizard-top"><div className="eyebrow">WEB SOLUTIONS ADVISOR</div><h1>{result?'Sajt je spreman za test':'Napravite biznis sajt'}</h1><p>{result?'Preview i ZIP nastaju iz iste Node konfiguracije.':'Od opisa vašeg posla do funkcionalnog test sajta.'}</p>
        <div className="progress" aria-label="Napredak"><div style={{width:(result?100:progress)+'%'}}/></div><small className="step-count">{result?'GENERISANO':definition?`KORAK ${step+2} OD ${count}`:'KORAK 1 — OPIS POSLA'}</small></div>
        {result?<div className="wizard-content">
          <div className="success-mark">✓</div><h2>{result.siteConfig.business.name}</h2><p>React Advisor je završio proces. Node je generisao sajt sa katalozima iz V39.5 i test cenama.</p>
          <div className="summary-box"><div><span>Delatnost</span><strong>{result.siteConfig.business.label}</strong></div><div><span>Stil</span><strong>{definition?.styles.find(x=>x.id===style)?.label||style}</strong></div><div><span>Moduli</span><strong>{result.siteConfig.modules.join(' · ')}</strong></div></div>
          <button className="action" type="button" onClick={exportZip} disabled={exporting}>{exporting?'Pripremam ZIP...':'Preuzmi funkcionalan demo ZIP ↓'}</button>
          <button className="quiet" type="button" onClick={()=>{setResult(null);setStep(steps.length-1);setError('');}}>Izmeni podatke / stil</button>
          <button className="quiet" type="button" onClick={()=>{setDefinition(null);setResult(null);setStep(0);setError('');setSelectedId('');}}>Napravi drugi sajt</button>
          <p className="small-note">Demo cene su ilustrativne. Porudžbine i degustacije generišu poruku, bez lažne potvrde ili naplate.</p>
        </div>:<div className="wizard-content">
          {current==='intro'&&<section className="question"><div className="eyebrow">1 · OPIS</div><h2>Čime se bavite?</h2><p>Opišite posao, a Advisor će predložiti delatnost. Za sada su migrirana tri referentna scenarija.</p>
            <form id="introForm" onSubmit={begin}><label className="field">Vaš opis<textarea rows={4} maxLength={800} minLength={3} required value={description} onChange={e=>setDescription(e.target.value)} placeholder="Imam mesaru i nudim pripremu mesa..."/></label>
            <label className="field">Delatnost (opciono — za testiranje)<select value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">Advisor prepoznaje iz opisa</option>{pilots.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
            {defOfRecognized&&<p>Razumeo sam: {defOfRecognized.label}</p>}
            <button className="action" type="submit" disabled={loading}>{loading?'Prepoznajem...':'Nastavi →'}</button></form>
            <div className="pilot-list"><b>Test scenariji</b>{pilots.map(x=><button key={x.id} type="button" onClick={()=>{setSelectedId(x.id);setDescription(x.id==='wine-shop'?'Imam vinoteku i prodajem vina':x.id==='butcher-shop'?'Imam mesaru u Srbiji':'Prodajem obuću u radnji');}}><strong>{x.label}</strong><small>{x.hint}</small></button>)}</div>
          </section>}
          {current==='goal'&&<ChoiceStep eyebrow="2 · CILJ" title="Šta je najvažnije za ovaj sajt?" items={goals} value={goal} onPick={v=>pick('goal',v)}/>}
          {current==='operation'&&<ChoiceStep eyebrow="3 · POSLOVANJE" title={definition.operation.question} help="Ovo podešava način na koji biznis prima zahteve." items={definition.operation.options.map(x=>({id:x,label:x}))} value={answers.businessMode} onPick={v=>pick('operation',v)}/>}
          {current==='special'&&<ChoiceStep eyebrow="4 · VAŽNO POSLOVNO PITANJE" title={definition.special.question} help="Na osnovu odgovora uključujemo odgovarajuću funkcionalnost — ne pretpostavljamo je." items={definition.special.options} value={typeof answers[definition.special.id]==='boolean'?(answers[definition.special.id]?'yes':'no'):(answers[definition.special.id]??'')} onPick={v=>pick('special',v==='yes'?true:v==='no'?false:v)}/>}
          {current==='emphasis'&&<ChoiceStep eyebrow="SADRŽAJ" title={definition.emphasis.question} items={definition.emphasis.options.map(x=>({id:x,label:x}))} value={answers.emphasis} onPick={v=>pick('emphasis',v)}/>}
          {current==='style'&&<ChoiceStep eyebrow="STIL" title="Kako želite da sajt izgleda?" items={definition.styles.map(x=>({id:x.id,label:x.label}))} value={style} onPick={v=>pick('style',v)}/>}
          {current==='company'&&<section className="question"><div className="eyebrow">ZAVRŠNI KORAK</div><h2>Kako se vaš biznis zove?</h2><p>Unesite naziv i, ako želite, kontakt telefon. Klik će zaista generisati sajt.</p>
            <form id="companyForm" onSubmit={generate}><label className="field">Naziv firme<input autoFocus required maxLength={100} value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Naziv firme"/></label>
            <label className="field">Telefon (opciono)<input maxLength={35} value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="+381 ..."/></label>
            <button className="action" type="submit" disabled={loading||!businessName.trim()}>{loading?'Generišem sajt...':'Kreiraj moj sajt →'}</button></form></section>}
          {definition&&<button className="quiet back" type="button" onClick={()=>{if(step===0){setDefinition(null);setStep(0)}else setStep(s=>s-1);setError('')}}>← Nazad</button>}
        </div>}
        {error&&<p role="alert" className="error">{error}</p>}
        <div className="wizard-footer">V39.5 ostaje netaknut · {health?.registryEntries||72} delatnosti u server registru · 3 migrirana scenarija
          {import.meta.env.DEV&&<a href="/legacy/" target="_blank" rel="noreferrer">Otvori stari V39.5 ↗</a>}</div>
      </aside>
      <section className="preview-area" aria-label="Pregled sajta">
        <div className="preview-bar"><div className="bar-title"><strong>PREVIEW</strong><span>{result?result.siteConfig.business.name:'Interaktivni prikaz'}</span></div><div className="device-buttons"><button type="button" className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}>Desktop</button><button type="button" className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')}>Mobile</button></div></div>
        {result?<div className={'viewport '+device}><iframe key={`${result.siteConfig.business.id}-${device}-${style}`} title={'Preview '+result.siteConfig.business.name} srcDoc={previewHtml} sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox"/></div>
          :<div className="preview-empty"><div className="fake-browser"><div className="fake-top"><i/><i/><i/></div><div className="fake-hero"><span></span><b>Vaš sajt nastaje ovde.</b><p>Najpre odgovorite na pitanja Advisora.</p></div><div className="fake-cards"><i/><i/><i/></div></div><p>Pregled, korpa i degustacije pojaviće se čim završite poslednji korak.</p></div>}
      </section>
    </main>
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
