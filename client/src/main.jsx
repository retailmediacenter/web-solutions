import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { apiUrl } from './api.js';
const referenceIds = [
  ['butcher-shop', 'Mesara'],
  ['wine-shop', 'Vinoteka'],
  ['shoe-shop', 'Prodavnica obuće']
];
function App(){
  const [health,setHealth] = useState(null);
  const [businessId,setBusinessId] = useState('butcher-shop');
  const [businessName,setBusinessName] = useState('Mesara Petrović');
  const [grill,setGrill] = useState('raw');
  const [tasting,setTasting] = useState('no');
  const [siteConfig,setSiteConfig]=useState(null);
  const [error,setError]=useState('');
  useEffect(() => {
    fetch(apiUrl('/api/health')).then(r => r.json()).then(setHealth).catch(()=>setHealth({status:'offline'}));
  }, []);
  const title = referenceIds.find(([key])=> key === businessId)?.[1];
  async function resolve(ev){
    ev.preventDefault();setError('');setSiteConfig(null);
    try {
      const response=await fetch(apiUrl('/api/advisor/resolve'), {
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({businessId,businessName,answers:{butcherGrillService:grill,wineTastings:tasting==='yes'}})
      });
      const data=await response.json();
      if (!response.ok) throw new Error(data.error || 'Greška pri obradi');
      setSiteConfig(data.siteConfig);
    } catch (ex) {setError(ex.message);}
  }
  return <>
    <header><div className="brand">RMC <span>WEB SOLUTIONS</span></div><div className="tag">V41 · MIGRACIONI POČETAK</div></header>
    <main>
      <section className="intro"><div className="eyebrow">REACT + NODE.JS</div>
      <h1>Nova arhitektura.<br/><em>Postojeća logika ostaje referenca.</em></h1>
      <p>Ovo je prvi lokalni React / Node checkpoint. V39.5 ostaje zasebno i netaknuto, a kompletan Advisor i Commerce tek čekaju migraciju.</p>
      <div className="status">API: <strong>{health?.status === 'ok' ? 'POVEZAN' : health?.status === 'offline' ? 'NIJE POVEZAN' : 'PROVERA...'}</strong>{health?.registryEntries && <span> · Registry: {health.registryEntries} delatnosti</span>}</div>
      {import.meta.env.DEV && <a className="ref" href="/legacy/" target="_blank" rel="noreferrer">Otvori originalni V39.5 lokalno ↗</a>}</section>
      <section className="box"><div><div className="eyebrow">PRVI SERVER-SIDE TEST</div><h2>Proveri prenos tri ključna scenarija</h2></div>
      <form onSubmit={resolve}>
        <label>Delatnost<select value={businessId} onChange={e=>{setBusinessId(e.target.value);setBusinessName(referenceIds.find(([id])=>id===e.target.value)?.[1]||'');setSiteConfig(null);}}>{referenceIds.map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
        <label>Naziv firme<input required maxLength="100" value={businessName} onChange={e=>setBusinessName(e.target.value)}/></label>
        {businessId==='butcher-shop' && <fieldset><legend>Da li nudite pripremu i pečenje mesa?</legend><label><input type="radio" checked={grill==='raw'} onChange={()=>setGrill('raw')}/> Samo sveže / sirovo</label><label><input type="radio" checked={grill==='grilled'} onChange={()=>setGrill('grilled')}/> Da, pripremu i pečenje</label></fieldset>}
        {businessId==='wine-shop' && <fieldset><legend>Da li organizujete degustacije vina?</legend><label><input type="radio" checked={tasting==='yes'} onChange={()=>setTasting('yes')}/> Da</label><label><input type="radio" checked={tasting==='no'} onChange={()=>setTasting('no')}/> Ne</label></fieldset>}
        <button type="submit">Napravi probni SiteConfig ↗</button>
        {error&&<p role="alert" className="error">{error}</p>}
      </form>
      {siteConfig && <div className="result"><h3>Server je vratio SiteConfig za: {title}</h3><pre>{JSON.stringify(siteConfig,null,2)}</pre><p><strong>Napomena:</strong> ovo još nije generisani sajt. Kompletan V39.5 renderer, korpa i ZIP export migriraju se naredno.</p></div>}
      </section>
    </main>
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
