import {describe,it,expect} from 'vitest';
import {blankDraft,canApprove,parseDraft,revise,packet,draftBasis,parseStageResult} from '../src/creative-studio/workflow';
describe('Creative Studio acceptance and transfer',()=>{
  it('rejects mismatched director results and detects edits during a run',()=>{
    expect(()=>parseStageResult({requestId:'old',stage:'Concept',text:'Old result'},'new','Concept')).toThrow();
    expect(()=>parseStageResult({requestId:'new',stage:'Storyboard',text:'Wrong stage'},'new','Concept')).toThrow();
    expect(parseStageResult({requestId:'new',stage:'Concept',text:'Draft concept'},'new','Concept')).toBe('Draft concept');
    const d=blankDraft(); expect(draftBasis({...d,projectId:'created'})).toBe(draftBasis(d));
    expect(draftBasis({...d,concept:'User changed direction'})).not.toBe(draftBasis(d));
  });
  it('requires content and sequential acceptance',()=>{
    const d=blankDraft(); expect(canApprove(d,0)).toBe(false);
    d.raw='Coffee break'; d.concept='A quiet reset'; expect(canApprove(d,0)).toBe(true); expect(canApprove(d,1)).toBe(false);
    d.approved=['References']; expect(canApprove(d,1)).toBe(true);
  });
  it('invalidates this and downstream acceptance while preserving earlier stages',()=>{
    const d={...blankDraft(),approved:['References','Concept','Storyboard','Deliverables']};
    expect(revise(d,'storyboard','new shot').approved).toEqual(['References','Concept']);
    expect(revise(d,'references','new source').approved).toEqual([]);
    expect(revise(d,'type','Carousel').approved).toEqual([]);
    expect(revise(d,'name','A clearer title').approved).toEqual(d.approved);
    expect(revise(d,'libraryNotes','Exact sound placement').approved).toEqual(['References','Concept','Storyboard']);
  });
  it('rejects malformed imports and never trusts imported acceptance',()=>{
    expect(()=>parseDraft({version:1,type:'Video'})).toThrow();
    expect(parseDraft({...blankDraft(),approved:['References']}).approved).toEqual([]);
  });
  it('transfers source, budget and acceptance truth instead of claiming completion',()=>{
    const out=packet({...blankDraft(),name:'Pause',references:'notion guide',libraryNotes:'whoosh: CC0'});
    expect(out).toContain('ZERO paid generation'); expect(out).toContain('References [draft]');
    expect(out).toContain('notion guide'); expect(out).toContain('whoosh: CC0');
  });
});
