import React,{useState} from 'react';
import {apiUrl} from './api.js';
import {AgentDesk} from './agent-desk.jsx';

const storageKey='rmc-project-admin-session';
const request=async(path,{token,method='GET',body}={})=>{const response=await fetch(apiUrl(path),{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Operacija nije uspela.');return data;};

/**
 * The Agent Desk owns package selection, final review, ZIP and pairing.
 * This shell deliberately has no package-change or activation controls.
 */
export function ProjectAdminNext(){
 const [key,setKey]=useState(''),[token,setToken]=useState(()=>sessionStorage.getItem(storageKey)||''),[siteId,setSiteId]=useState(''),[project,setProject]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const signIn=async event=>{event.preventDefault();setBusy(true);setMessage('');try{const result=await request('/api/admin/session',{method:'POST',token:key});sessionStorage.setItem(storageKey,result.sessionToken);setToken(result.sessionToken);setKey('');}catch(error){setMessage(error.message)}finally{setBusy(false)}};
 const lookup=async event=>{event.preventDefault();setBusy(true);setMessage('');try{const result=await request(`/api/admin/projects/${encodeURIComponent(siteId.trim())}`,{token});setProject(result.project)}catch(error){setProject(null);setMessage(error.message)}finally{setBusy(false)}};
 const signOut=()=>{sessionStorage.removeItem(storageKey);setToken('');setProject(null);setMessage('');};
 if(!token)return <main className="rmc-admin"><section className="rmc-admin-card"><p className="rmc-admin-eyebrow">RMC INTERNAL</p><h1>RMC Agent Desk</h1><p>Pronađite projekat po Site ID-ju i nastavite kroz pregled, personalizaciju i finalnu proveru.</p><form onSubmit={signIn}><label>Administrativni ključ<input type="password" value={key} onChange={event=>setKey(event.target.value)} autoComplete="current-password" required/></label><button disabled={busy}>{busy?'Proveravam…':'Prijavi se'}</button></form>{message&&<p className="rmc-admin-error" role="alert">{message}</p>}</section></main>;
 return <main className="rmc-admin"><section className="rmc-admin-card"><header><div><p className="rmc-admin-eyebrow">RMC INTERNAL</p><h1>RMC Agent Desk</h1></div><button className="rmc-admin-link" onClick={signOut}>Odjavi se</button></header><p>Site ID vodi ceo proces. Paket se određuje iz briefa u Koraku 2; finalizacija dolazi tek nakon personalizacije.</p><form className="rmc-admin-lookup" onSubmit={lookup}><label>Project ID<input value={siteId} onChange={event=>setSiteId(event.target.value)} placeholder="24 znaka iz RMC_PROJEKAT.txt" pattern="[A-Za-z0-9_-]{24}" required/></label><button disabled={busy}>{busy?'Učitavam…':'Pronađi projekat'}</button></form>{message&&<p className="rmc-admin-error" role="alert">{message}</p>}{project&&<section className="rmc-admin-project"><p className="rmc-admin-eyebrow">PROJEKAT</p><h2>{project.business.name}</h2><dl><div><dt>Site ID</dt><dd>{project.siteId}</dd></div><div><dt>Proces</dt><dd>Agent Desk · pregled i personalizacija</dd></div></dl></section>}{project&&<AgentDesk project={project} token={token} onProject={setProject} onMessage={setMessage}/>}</section></main>;
}
