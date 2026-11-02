'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {createProject} from '../state/projects';
import {uploadProjectFiles} from '../providers/registry';
import {blankDraft, canApprove, fields, libraries, packet, parseDraft, revise, stages, type StudioDraft} from './workflow';
import './creative-studio.css';
import {DirectorPanel} from './DirectorPanel';
import {AgentConnections} from './AgentConnections';

const STORAGE = 'nonso-creative-studio-v1';
const prompts = [
  'Who is this for? What should they understand or do? Which references supply facts, style, or motion? What must remain accurate?',
  'Write the central promise, audience, visible payoff, tone, format and constraints. Explain why this route fits the supplied references.',
  'Use stable shot/slide IDs. Specify purpose, visual action, copy, duration/order, framing, sound, continuity and acceptance criteria.',
  'For each ID: manual shot, licensed stock/b-roll, AI-generated or editable design. Include source assets, prompts when needed, output size and checks.',
  'Specify exact order/timing, selected library items, sound levels, editable layers, export format and a review checklist. Record actual output paths.',
];
export function CreativeStudio() {
  const [draft,setDraft] = useState<StudioDraft>(blankDraft);
  const [ready,setReady] = useState(false); const [step,setStep] = useState(0);
  const [message,setMessage] = useState(''); const [busy,setBusy] = useState(false);
  const files = useRef<File[]>([]); const [fileNames,setFileNames] = useState<string[]>([]);
  const [handbook,setHandbook] = useState<File|null>(null);
  useEffect(()=>{try{const saved=localStorage.getItem(STORAGE);if(saved){const parsed=parseDraft(JSON.parse(saved), true);setDraft(parsed);}}catch{setMessage('Saved draft could not be loaded. Import a backup to recover it.');}setReady(true);},[]);
  useEffect(()=>{if(ready)try{localStorage.setItem(STORAGE,JSON.stringify(draft));}catch{setMessage('Browser storage is full. Export a backup before leaving.');}},[draft,ready]);
  function edit(key:keyof StudioDraft,value:unknown){setDraft(d=>revise(d,key,value));}
  function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='creative-studio-draft.json';a.click();URL.revokeObjectURL(url);}
  async function handoff(){setBusy(true);setMessage('');try{
    let projectId=draft.projectId;
    if(!projectId){const result=await createProject({name:draft.name||'Creative Studio production',skillId:null,designSystemId:null,pluginId:'creative-studio-production'});projectId=result.project.id;setDraft(d=>({...d,projectId}));}
    const result=await uploadProjectFiles(projectId,[new File([packet(draft)],'creative-brief.md',{type:'text/markdown'}),new File([JSON.stringify(draft,null,2)],'creative-studio-draft.json',{type:'application/json'}),...files.current,...(handbook?[handbook]:[])]);
    if(result.failed.length)throw new Error('Some files did not transfer: '+result.failed.map(f=>f.name).join(', ')+'. Retry transfer; the same project will be reused.');
    setMessage('Brief and references transferred. Run the director below, or open production.');return projectId;
  }catch(e){setMessage(e instanceof Error?e.message:'Transfer failed');return null;}finally{setBusy(false);}}
  const receiveResult=useCallback((stage:number,text:string)=>{setDraft(d=>revise(d,stage===0?'questions':fields[stage]!,text));setStep(stage);},[]);
  if(!ready)return <main className="cs">Loading your workspace…</main>;
  return <main className="cs"><header><a href="/projects">OpenDesign engine</a><span>NONSO / CREATIVE STUDIO</span><a href="https://nonso-creative-studio.info10762.chatgpt.site/" target="_blank" rel="noreferrer">Original workspace ↗</a></header>
    <section className="cs-intro"><div><p className="cs-eyebrow">FROM FRAGMENTS TO FINISHED WORK</p><h1>Make the idea tangible.</h1><p>Shape the concept together. Accept each stage. Carry the brief, references and handbook into production.</p></div><span className="cs-budget">Zero paid generation</span></section>
    <div className="cs-tools"><label>Project<input value={draft.name} onChange={e=>edit('name',e.target.value)} placeholder="Name this production"/></label><label>Format<select value={draft.type} onChange={e=>edit('type',e.target.value)}><option>Video</option><option>Static images</option><option>Carousel</option></select></label><button onClick={download}>Export backup</button><label className="cs-upload">Import backup<input type="file" accept="application/json" onChange={async e=>{try{const f=e.target.files?.[0];if(f){setDraft(parseDraft(JSON.parse(await f.text())));files.current=[];setFileNames([]);setMessage('Imported as a draft. Review and accept stages again.');}}catch(err){setMessage(String(err));}e.target.value='';}}/></label></div>
    <AgentConnections projectId={draft.projectId}/>
    <div className="cs-layout"><nav aria-label="Production stages">{stages.map((s,i)=><button key={s} className={step===i?'active':''} onClick={()=>setStep(i)}><small>0{i+1}</small>{s}<span>{draft.approved.includes(s)?'✓':'○'}</span></button>)}<a href="#libraries">Asset libraries ↓</a></nav>
    <section className="cs-editor"><p className="cs-eyebrow">STAGE 0{step+1}</p><h2>{stages[step]!}</h2><p>{prompts[step]}</p><textarea aria-label={stages[step]!} value={draft[fields[step]!]} onChange={e=>edit(fields[step]!,e.target.value)} placeholder="Write, paste or refine this stage…"/>
    {step===0&&<><label>Clarifying questions and your answers<textarea value={draft.questions} onChange={e=>edit('questions',e.target.value)} placeholder="The director questions appear here. Add your answers before developing the concept."/></label><label>Reference links and their roles<textarea value={draft.references} onChange={e=>edit('references',e.target.value)} placeholder="Notion, images, videos, guides. Note which parts matter and what must not be copied."/></label><div className="cs-files"><label>Attach reference files<input type="file" multiple onChange={e=>{files.current=Array.from(e.target.files||[]);setFileNames(files.current.map(f=>f.name));}}/></label><label>Attach the handbook<input type="file" accept=".md,.json,.txt,.pdf,.html" onChange={e=>setHandbook(e.target.files?.[0]||null)}/></label></div><p className="cs-note">{fileNames.length?fileNames.join(' · '):'Files transfer when you create the production project. Reselect files after reloading; browser backups contain text only.'}{handbook?' · Handbook: '+handbook.name:''}</p></>}
    <footer><span>{draft.approved.includes(stages[step]!)?'Accepted. Editing here invalidates this and later stages.':'Draft — review before accepting.'}</span><button disabled={!canApprove(draft,step)} onClick={()=>{setDraft(d=>({...d,approved:[...new Set([...d.approved,stages[step]!])]}));if(step<4)setStep(step+1);}}>Accept {stages[step]!.toLowerCase()}</button></footer></section></div>
    <section className="cs-library" id="libraries"><p className="cs-eyebrow">SOURCE BEFORE INVENTING</p><h2>Existing libraries, usable decisions.</h2><p>Native catalogs run through the director’s verified connector. Code components need rendering. Keep the exact item and its terms with the project.</p><div className="cs-cards">{libraries.map(l=><article key={l.name}><small>{l.type}</small><h3><a href={l.url} target="_blank" rel="noreferrer">{l.name} ↗</a></h3><p>{l.use}</p></article>)}</div><label>Selected items, source links, licenses and placement<textarea value={draft.libraryNotes} onChange={e=>edit('libraryNotes',e.target.value)} placeholder="Exact item / source / license / target shot or slide / timing / evidence of use, or why no effect is needed."/></label></section>
    <section className="cs-handoff"><div><h2>Continue in the production engine.</h2><p>Transfer the editable brief and files to a real OpenDesign project. The director must resolve unaccepted stages first. Image/video models are available in OpenDesign settings; the current brief forbids paid generation.</p></div><button disabled={busy||!draft.raw.trim()} onClick={handoff}>{busy?'Transferring…':draft.projectId?'Update production brief':'Create production project'}</button>{draft.projectId&&<a href={'/projects/'+encodeURIComponent(draft.projectId)}>Open production ↗</a>}</section>
    <DirectorPanel draft={draft} step={step} prepare={handoff} onResult={receiveResult}/>
    {message&&<p className="cs-status" role="status">{message}</p>}
  </main>;
}
