'use client';
import {useEffect,useState} from 'react';
import {fetchProjectFileText} from '../providers/registry';
export function AgentConnections({projectId}:{projectId:string}){
  const [agent,setAgent]=useState('');const [options,setOptions]=useState<Array<{id:string;name:string}>>([]);
  const [status,setStatus]=useState('');const [checks,setChecks]=useState<string[]>([]);const [canvaUrl,setCanvaUrl]=useState('');const [psd,setPsd]=useState('');
  async function refresh(){try{
    const [c,a]=await Promise.all([fetch('/api/app-config'),fetch('/api/agents')]);if(!c.ok||!a.ok)throw new Error('Agent settings unavailable');
    const config=await c.json();const agents=await a.json();setAgent(config.config?.agentId||'');setOptions((agents.agents||[]).filter((x:{available:boolean})=>x.available));
    if(projectId){const [production,capcut]=await Promise.all([fetchProjectFileText(projectId,'integration-production-results.json',{cache:'no-store'}),fetchProjectFileText(projectId,'capcut-final-check.json',{cache:'no-store'})]);
      const p=production?JSON.parse(production):null;const cc=capcut?JSON.parse(capcut):null;
      setCanvaUrl(typeof p?.canva?.edit_url==='string'&&/^https:\/\/www\.canva\.com\//.test(p.canva.edit_url)?p.canva.edit_url:'');
      setPsd(typeof p?.photoshop?.psd==='string'?p.photoshop.psd.split(/[\\/]/).pop()||'':'');
      setChecks([p?.canva?.status==='created_edited_committed_read_back'?'Canva: actual copy/edit verified':'Canva: no production check recorded for this project',p?.photoshop?.status==='saved_and_verified'?'Photoshop: layered save verified':'Photoshop: no production check recorded for this project',cc?'CapCut: finishing check saved — inspect production report':'CapCut: no finishing check recorded for this project']);
    }else setChecks(['Tools are provided by the selected agent and its own authorized connections. Create a production project to record checks.']);
    setStatus('These are saved project test results, not a live account-health guarantee.');
  }catch(e){setStatus(e instanceof Error?e.message:'Connection check unavailable');}}
  useEffect(()=>{void refresh();},[projectId]);
  async function select(id:string){try{const r=await fetch('/api/app-config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:id,onboardingCompleted:true})});if(!r.ok)throw new Error('Could not save agent selection');setAgent(id);setStatus('Selected '+id+' for the next director run.');}catch(e){setStatus(String(e));}}
  return <section className="cs-tools" aria-label="Agent and connections"><label>Production agent<select value={agent} onChange={e=>void select(e.target.value)}><option value="" disabled>Select an agent</option>{options.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><div style={{flex:2,fontSize:12}}>{checks.map(c=><div key={c}>{c}</div>)}<small role="status">{status}</small><div>{canvaUrl&&<a href={canvaUrl} target="_blank" rel="noreferrer">Open Canva draft ↗</a>}{psd&&<> · <a href={'/api/projects/'+encodeURIComponent(projectId)+'/raw/'+encodeURIComponent(psd)} download>Layered Photoshop master</a></>}</div></div><button onClick={()=>void refresh()}>Refresh connections</button></section>;
}
