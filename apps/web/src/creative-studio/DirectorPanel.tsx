'use client';
import {useEffect,useRef,useState} from 'react';
import {fetchProjectFileText} from '../providers/registry';
import {stages,draftBasis,parseStageResult,type StudioDraft} from './workflow';

interface ActiveRun {id:string;projectId:string;requestId:string;stage:number;basis:string;file:string;}
export function DirectorPanel({draft,step,prepare,onResult}:{draft:StudioDraft;step:number;prepare:()=>Promise<string|null|undefined>;onResult:(stage:number,text:string)=>void}){
  const [run,setRun]=useState<ActiveRun|null>(null);const [status,setStatus]=useState('');const [starting,setStarting]=useState(false);
  const latest=useRef(draft); latest.current=draft;
  useEffect(()=>{try{const stored=localStorage.getItem('creative-studio-active-run');if(stored){const v=JSON.parse(stored);if(typeof v.id==='string'&&Number.isInteger(v.stage)&&v.stage>=0&&v.stage<5)setRun(v);}}catch{/* Leave malformed recovery state untouched. */}},[]);
  useEffect(()=>{if(run)localStorage.setItem('creative-studio-active-run',JSON.stringify(run));},[run]);
  useEffect(()=>{
    if(!run)return;let stopped=false;let timer:ReturnType<typeof setTimeout>;
    const finish=()=>{localStorage.removeItem('creative-studio-active-run');setRun(null);};
    async function check(){let terminal=false;try{
      const response=await fetch('/api/runs/'+encodeURIComponent(run!.id));if(!response.ok)throw new Error('Cannot read the director run. Open production to inspect it.');
      const state=await response.json();if(stopped)return;
      if(['succeeded','failed','canceled'].includes(state.status)){
        terminal=true;
        if(state.status!=='succeeded'){finish();setStatus('Director '+state.status+'. Your current draft is preserved. Open production for details.');return;}
        const text=await fetchProjectFileText(run!.projectId,run!.file,{cache:'no-store'});if(stopped)return;
        const result=parseStageResult(JSON.parse(text||'null'),run!.requestId,stages[run!.stage]!);
        if(draftBasis(latest.current)!==run!.basis){finish();setStatus('The director finished, but your draft changed during the run. The result is saved in production; review it there before applying it.');return;}
        onResult(run!.stage,result);finish();setStatus('Director draft received. Edit it here, then accept it when it is right.');return;
      }
      setStatus('Director '+state.status+' — you can follow the work in production.');timer=setTimeout(check,2500);
    }catch(e){if(!stopped){setStatus(e instanceof Error?e.message:'Could not read director result.');if(terminal)finish();else timer=setTimeout(check,5000);}}}
    void check();return()=>{stopped=true;clearTimeout(timer);};
  },[run,onResult]);
  async function start(){setStarting(true);setStatus('Preparing the current brief…');try{
    const basis=draftBasis(draft);const projectId=await prepare();if(!projectId)throw new Error('Transfer the brief successfully before running the director.');
    const configResponse=await fetch('/api/app-config');if(!configResponse.ok)throw new Error('Cannot read your agent settings.');
    const config=await configResponse.json();const agentId=config.config?.agentId;if(!agentId)throw new Error('Select your agent in OpenDesign settings first.');
    const requestId=crypto.randomUUID();const file='studio-result-'+requestId+'.json';const stage=stages[step]!;
    const message=`Read creative-brief.md and the attached handbook. Work on ${stage} only. ${step===0?'Return consequential clarifying questions grounded in the supplied material.':step===4?'Execute the accepted production brief using the verified Canva, Photoshop and CapCut tools where appropriate. Create real editable outputs and inspect them; record exact paths/URLs and blockers.':'Develop this stage from accepted earlier stages. Return editable, concrete prose with stable shot/slide IDs where needed.'} Do not rework accepted earlier stages or mark this draft accepted. Preserve originals. Search existing libraries before custom creation. Do not run paid generation, buy assets, publish or start subscriptions. If an app or connection is unavailable, report the exact blocker rather than inventing completion. Finally write ${file} as JSON with requestId=${JSON.stringify(requestId)}, stage=${JSON.stringify(stage)}, text containing the complete editable stage draft or production report. Keep private handbook content out of public repositories.`;
    const response=await fetch('/api/runs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId,projectId,message,clientRequestId:requestId,mediaExecution:{mode:step===4?'enabled':'disabled',allowedModels:['hyperframes-html']}})});
    const body=await response.json();if(!response.ok||!body.runId)throw new Error(body.error?.message||body.error||'The director could not start.');
    setRun({id:body.runId,projectId,requestId,stage:step,basis,file});
  }catch(e){setStatus(e instanceof Error?e.message:'Director failed to start.');}finally{setStarting(false);}}
  async function cancel(){if(!run)return;const response=await fetch('/api/runs/'+encodeURIComponent(run.id)+'/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:'user_stop'})});setStatus(response.ok?'Cancellation requested.':'Could not cancel; open production to inspect the run.');}
  const prerequisite=step===0||draft.approved.includes(stages[step-1]!);
  return <section className="cs-handoff" aria-label="Director"><div><h2>Your director, in this workflow.</h2><p>Run your configured OpenDesign agent on the current stage. It reads the transferred brief and handbook, uses its connected creative tools, and returns an editable draft here. Paid generation stays off for these runs.</p><p role="status">{status}</p></div><button disabled={!!run||starting||!draft.raw.trim()||!prerequisite} onClick={start}>{starting?'Preparing…':run?'Director working…':step===4?'Create production draft':step===0?'Ask clarifying questions':'Draft '+stages[step]!.toLowerCase()}</button>{run&&<button onClick={cancel}>Stop director</button>}</section>;
}
