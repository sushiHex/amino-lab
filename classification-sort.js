/* Side-chain classification practice. No storage, reward, or network side effects.
 * onRound(result) is called once per resolved name BEFORE onChange(snapshot).
 * result.snapshot includes that result, so hosts can save evidence + run atomically.
 * A correction is not a first-attempt success. Restoring never replays callbacks.
 */
(function (root) {
'use strict';
const VERSION = 1;
const GROUPS = Object.freeze([
  Object.freeze({id:'nonpolar', label:'Nonpolar', detail:'Mostly water-avoiding side chains', symbol:'◇'}),
  Object.freeze({id:'polar', label:'Polar uncharged', detail:'Polar side chains, usually uncharged', symbol:'◈'}),
  Object.freeze({id:'acidic', label:'Acidic', detail:'Usually negative near physiological pH', symbol:'−'}),
  Object.freeze({id:'basic', label:'Basic', detail:'Can accept H⁺; charge depends on pH', symbol:'+'})
]);
const ROWS = [
  ['G','Glycine','nonpolar','Its side chain is a single hydrogen; this game places glycine in the nonpolar group.'],
  ['A','Alanine','nonpolar','Its small methyl side chain is nonpolar.'],
  ['V','Valine','nonpolar','Its branched hydrocarbon side chain is nonpolar.'],
  ['L','Leucine','nonpolar','Its branched hydrocarbon side chain is nonpolar.'],
  ['I','Isoleucine','nonpolar','Its branched hydrocarbon side chain is nonpolar.'],
  ['M','Methionine','nonpolar','Its sulfur-containing thioether side chain is nonpolar. Sulfur alone does not make an amino acid polar.'],
  ['P','Proline','nonpolar','Its side chain loops back to the backbone nitrogen; it belongs in the nonpolar group.'],
  ['F','Phenylalanine','nonpolar','Its aromatic hydrocarbon ring is nonpolar. Aromatic is an overlapping family, not a separate bucket.'],
  ['W','Tryptophan','nonpolar','Its large aromatic side chain is classified as nonpolar here, even though its ring contains a nitrogen.'],
  ['S','Serine','polar','Its side-chain hydroxyl (–OH) makes it polar and usually uncharged.'],
  ['T','Threonine','polar','Its side-chain hydroxyl (–OH) makes it polar and usually uncharged.'],
  ['C','Cysteine','polar','Its thiol (–SH) side chain is classified as polar uncharged here. Do not group it with methionine just because both contain sulfur.'],
  ['N','Asparagine','polar','Its amide side chain is polar and uncharged, unlike the acidic side chain of aspartic acid.'],
  ['Q','Glutamine','polar','Its amide side chain is polar and uncharged, unlike the acidic side chain of glutamic acid.'],
  ['Y','Tyrosine','polar','Its ring has a hydroxyl (–OH), so it goes in polar uncharged here. It is also aromatic; these descriptions can overlap.'],
  ['D','Aspartic acid','acidic','Its side-chain carboxyl group is usually negatively charged near physiological pH. It is also called aspartate.'],
  ['E','Glutamic acid','acidic','Its side-chain carboxyl group is usually negatively charged near physiological pH. It is also called glutamate.'],
  ['K','Lysine','basic','Its side-chain amino group can accept a proton and is usually positively charged near physiological pH.'],
  ['R','Arginine','basic','Its guanidinium side chain is usually positively charged near physiological pH.'],
  ['H','Histidine','basic','Its imidazole side chain can accept a proton. It belongs in Basic, even though it is often mostly uncharged near physiological pH.']
];
const ITEMS = Object.freeze(Object.fromEntries(ROWS.map(([code,name,group,explanation])=>[code,Object.freeze({code,name,group,explanation})])));
const GROUP_IDS = GROUPS.map(g=>g.id);
const clone = value => JSON.parse(JSON.stringify(value));
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
const groupLabel = id => GROUPS.find(g=>g.id===id)?.label || '';
const roundKey = state => state && state.phase !== 'complete' ? state.id+':'+state.index : null;
const blankCurrent = () => ({attempts:0,firstGroup:null,lastGroup:null,solved:false});
function makeId() {
  if (root.crypto?.randomUUID) return 'sort-'+root.crypto.randomUUID();
  return 'sort-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
}
function createRun(size=10, rng=Math.random) {
  if (![5,10,20].includes(size)) return null;
  const queue=Object.keys(ITEMS);
  for(let i=queue.length-1;i>0;i--){const value=Number(rng());const j=Math.floor(Math.max(0,Math.min(.999999999,Number.isFinite(value)?value:0))*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
  return {version:VERSION,id:makeId(),queue:queue.slice(0,size),index:0,phase:'question',current:blankCurrent(),results:[]};
}
function canonicalResult(code, current) {
  const correct=current.firstGroup===ITEMS[code].group;
  return {code,firstGroup:current.firstGroup,attempts:current.attempts,correct,firstAttemptCorrect:correct,assisted:!correct,corrected:!correct};
}
function validResult(raw,code) {
  if(!object(raw)||raw.code!==code||!GROUP_IDS.includes(raw.firstGroup)||!integer(raw.attempts)||raw.attempts<1)return null;
  const correct=raw.firstGroup===ITEMS[code].group;
  if(raw.correct!==correct||raw.firstAttemptCorrect!==correct||raw.assisted!==!correct||raw.corrected!==!correct)return null;
  if(correct?raw.attempts!==1:raw.attempts<2)return null;
  return canonicalResult(code,{firstGroup:raw.firstGroup,attempts:raw.attempts});
}
function validateSnapshot(raw) {
  try {
    if(!object(raw)||raw.version!==VERSION||typeof raw.id!=='string'||!/^sort-[a-zA-Z0-9-]{6,90}$/.test(raw.id))return null;
    if(!Array.isArray(raw.queue)||![5,10,20].includes(raw.queue.length)||new Set(raw.queue).size!==raw.queue.length||raw.queue.some(code=>!Object.hasOwn(ITEMS,code)))return null;
    if(!integer(raw.index)||raw.index>raw.queue.length||!['question','feedback','complete'].includes(raw.phase)||!Array.isArray(raw.results))return null;
    const complete=raw.phase==='complete',solved=raw.phase==='feedback';
    if(complete?raw.index!==raw.queue.length||raw.current!==null:raw.index>=raw.queue.length)return null;
    if(raw.results.length!==(complete?raw.queue.length:raw.index+(solved?1:0)))return null;
    const results=[];
    for(let i=0;i<raw.results.length;i++){const result=validResult(raw.results[i],raw.queue[i]);if(!result)return null;results.push(result);}
    let current=null;
    if(!complete){
      const c=raw.current,code=raw.queue[raw.index],expected=ITEMS[code].group;
      if(!object(c)||!integer(c.attempts)||c.solved!==solved)return null;
      if(c.attempts===0){if(solved||c.firstGroup!==null||c.lastGroup!==null)return null;}
      else {
        if(!GROUP_IDS.includes(c.firstGroup)||!GROUP_IDS.includes(c.lastGroup))return null;
        if(solved?c.lastGroup!==expected:c.lastGroup===expected||c.firstGroup===expected)return null;
        if(c.attempts===1&&c.firstGroup!==c.lastGroup)return null;
        if(solved&&(c.firstGroup===expected?c.attempts!==1:c.attempts<2))return null;
      }
      current={attempts:c.attempts,firstGroup:c.firstGroup,lastGroup:c.lastGroup,solved};
      if(solved&&JSON.stringify(canonicalResult(code,current))!==JSON.stringify(results[raw.index]))return null;
    }
    return {version:VERSION,id:raw.id,queue:[...raw.queue],index:raw.index,phase:raw.phase,current,results};
  } catch { return null; }
}
function place(raw, group, key=roundKey(raw)) {
  const state=validateSnapshot(raw);
  if(!state||state.phase!=='question'||key!==roundKey(state)||!GROUP_IDS.includes(group)||state.current.attempts>=1000000)return {snapshot:raw,result:null,changed:false};
  const current=state.current,code=state.queue[state.index];
  current.attempts++;
  if(current.firstGroup===null)current.firstGroup=group;
  current.lastGroup=group;
  let result=null;
  if(group===ITEMS[code].group){
    current.solved=true;state.phase='feedback';
    result=canonicalResult(code,current);state.results.push(result);
    result={...result,id:roundKey(state),snapshot:clone(state)};
  }
  return {snapshot:state,result,changed:true};
}
function next(raw,key=roundKey(raw)) {
  const state=validateSnapshot(raw);
  if(!state||state.phase!=='feedback'||key!==roundKey(state))return raw;
  state.index++;
  state.phase=state.index===state.queue.length?'complete':'question';
  state.current=state.phase==='complete'?null:blankCurrent();
  return state;
}
function summarize(raw) {
  const state=validateSnapshot(raw);
  if(!state)return null;
  const firstTry=state.results.filter(r=>r.correct).length;
  return {id:state.id,total:state.queue.length,completed:state.results.length,firstTry,corrected:state.results.length-firstTry,results:clone(state.results),complete:state.phase==='complete'};
}
function mount(host, options={}) {
  if(!host||typeof host.querySelector!=='function')throw Error('A classification game mount is required.');
  const previous=host.__classificationSort;
  if(previous)previous.destroy();
  let state=options.snapshot==null?null:validateSnapshot(options.snapshot);
  if(options.snapshot!=null&&!state)throw Error('Invalid classification snapshot');
  let destroyed=false,selected=false,pendingSize=null,drag=null,ignoreClickUntil=0,exposedKey=null,feedbackKey=null,recapKey=null;
  const doc=host.ownerDocument || root.document;
  host.classList.add('cs-game');
  function save(){if(!destroyed)options.onChange?.(state?clone(state):null);}
  function expose(){
    if(!state)return;
    if(state.phase==='complete'){
      if(recapKey!==state.id){recapKey=state.id;state.results.forEach(result=>options.onExposure?.({code:result.code,keys:['name','classification']}));}
      return;
    }
    const key=roundKey(state),code=state.queue[state.index];
    if(exposedKey!==key){exposedKey=key;options.onExposure?.({code,keys:['name']});}
    if(state.current.attempts&&feedbackKey!==key){feedbackKey=key;options.onExposure?.({code,keys:['classification']});for(const related of ({C:['M'],N:['D'],Q:['E']}[code]||[]))options.onExposure?.({code:related,keys:['name','classification']});}
  }
  function stopDrag(){
    if(!drag)return;
    drag.ghost?.remove();drag.zone?.classList.remove('is-over');
    drag.source?.classList.remove('is-dragging');
    try{drag.source?.releasePointerCapture?.(drag.pointerId);}catch{}
    drag=null;
  }
  function persistAndRender(result,focus){
    // The state is already latched. A restored solved name cannot emit this again.
    if(result)options.onRound?.({...result,snapshot:clone(state)});
    save();render();
    if(focus)host.querySelector(focus)?.focus();
  }
  function submit(group,key){
    if(destroyed||pendingSize!==null)return;
    const change=place(state,group,key);
    if(!change.changed)return;
    state=change.snapshot;selected=!state.current.solved;
    persistAndRender(change.result,'[data-cs-feedback]');
  }
  function start(size){
    if(destroyed)return;
    stopDrag();state=createRun(size,options.rng);selected=false;pendingSize=null;
    persistAndRender(null,'[data-cs-chip]');
  }
  function chooseSize(size){
    if(state&&state.phase!=='complete'){pendingSize=size;render();host.querySelector('[data-cs-keep]')?.focus();}
    else start(size);
  }
  function advance(key){
    if(destroyed)return;
    const changed=next(state,key);
    if(changed===state)return;
    state=changed;selected=false;persistAndRender(null,state.phase==='complete'?'[data-cs-recap]':'[data-cs-chip]');
    if(state.phase==='complete')options.onFinish?.(summarize(state));
  }
  function buttons(prefix='Start') {
    return `<div class="cs-lengths" role="group" aria-label="Number of names in a new run">${[5,10,20].map(n=>`<button type="button" class="cs-button ${n===10?'cs-primary':''}" data-cs-size="${n}">${prefix} ${n}${n===20?' · all names':''}</button>`).join('')}</div>`;
  }
  function convention(){return '<details class="cs-convention"><summary>Which classification are we using?</summary><p>The app’s four broad side-chain classes: nonpolar, polar uncharged, acidic, and basic. Acidic and basic side chains can also be polar; polar uncharged is the separate bucket here. Aromatic, sulfur-containing, and branched-chain families overlap these classes; they are not extra buckets. Charge depends on pH, and some textbooks draw these broad group boundaries differently. This game follows the classifications on the app’s Learn cards.</p></details>';}
  function render(){
    if(destroyed)return;
    stopDrag();
    host.classList.toggle('cs-active',!!state&&state.phase!=='complete'&&pendingSize===null);
    const header='<div class="cs-heading"><span class="cs-emblem" aria-hidden="true">▦</span><div><p class="cs-eyebrow">THE CLASSIFICATION HALL</p><h2>Sort the amino acids</h2></div></div>';
    if(pendingSize!==null){
      host.innerHTML=header+`<section class="cs-replace" aria-labelledby="cs-replace-title"><h3 id="cs-replace-title">Start a new ${pendingSize}-name run?</h3><p>This replaces the current queue. Recorded skill progress stays; an unfinished placement does not count as a correct answer.</p><div class="cs-actions"><button type="button" class="cs-button cs-primary" data-cs-keep>Keep current run</button><button type="button" class="cs-button" data-cs-replace>Start new run</button></div></section>`;
      host.querySelector('[data-cs-keep]').onclick=()=>{if(destroyed)return;pendingSize=null;render();host.querySelector('[data-cs-chip]')?.focus();};
      host.querySelector('[data-cs-replace]').onclick=()=>{if(!destroyed&&pendingSize!==null)start(pendingSize);};return;
    }
    if(!state){
      host.innerHTML=header+`<p class="cs-intro">One name. Four groups. Where does it belong?</p><p class="cs-copy">Drag the name into its group, or select the name and tap a group. Keyboard: select the name with Enter or Space, then Tab to a group and press Enter.</p><div class="cs-preview" aria-label="The four classification groups">${GROUPS.map(g=>`<div><span aria-hidden="true">${g.symbol}</span><b>${g.label}</b></div>`).join('')}</div>${buttons()}<p class="cs-copy cs-scoring">First-try answers and corrected placements are counted separately. Classification practice does not award name or structure recall credit.</p>${convention()}`;
    } else if(state.phase==='complete'){
      const summary=summarize(state);
      host.innerHTML=header+`<section class="cs-recap" tabindex="-1" data-cs-recap><p class="cs-eyebrow">RUN COMPLETE</p><h3>${summary.firstTry} / ${summary.total} first try</h3><p>${summary.corrected?`${summary.corrected} corrected after feedback. Those are practice, not first-try successes.`:'Every name found its group on the first try. Nice sorting!'}</p><div class="cs-totals"><div><b>${summary.firstTry}</b><span>First try</span></div><div><b>${summary.corrected}</b><span>Corrected</span></div></div></section><div class="cs-review-grid">${GROUPS.map(g=>`<section class="cs-review-group"><h4>${g.label}</h4><ul>${state.results.filter(r=>ITEMS[r.code].group===g.id).map(r=>`<li><span>${escape(ITEMS[r.code].name)}</span><b class="${r.correct?'cs-clean':'cs-correction'}">${r.correct?'✓ First try':'↻ Corrected'}</b></li>`).join('')||'<li class="cs-empty">No names in this run</li>'}</ul></section>`).join('')}</div>${buttons('New run:')}<p class="cs-copy cs-scoring">Classification is tracked separately from name and structure recall.</p>${convention()}`;
    } else {
      const code=state.queue[state.index],item=ITEMS[code],current=state.current,solved=current.solved,key=roundKey(state),score=state.results.filter(r=>r.correct).length;
      const feedback=current.attempts?`<div class="cs-feedback ${solved?'is-solved':'is-correction'}" role="status" aria-live="polite" tabindex="-1" data-cs-feedback><b>${solved?(current.attempts===1?'✓ Correct on the first try.':'✓ Corrected — keep this one in practice.'):`Not ${groupLabel(current.lastGroup)}. Try ${groupLabel(item.group)}.`}</b><p>${escape(item.name)} belongs in <strong>${groupLabel(item.group)}</strong>. ${escape(item.explanation)}</p>${!solved?'<p class="cs-evidence">Try again. Your first attempt stays marked incorrect.</p>':current.attempts>1?'<p class="cs-evidence">Recorded as assisted classification practice, not a first-try success.</p>':''}</div>`:'<div class="cs-status" role="status" aria-live="polite" data-cs-status>Select the name, then choose a group — or drag it.</div>';
      host.innerHTML=header+`<div class="cs-runbar"><b>Name ${state.index+1} / ${state.queue.length}</b><span>${score} first try · ${state.results.length-score} corrected</span><details class="cs-new-run"><summary>New run</summary>${buttons('New')}</details></div><div class="cs-progress" role="progressbar" aria-label="Names placed" aria-valuemin="0" aria-valuemax="${state.queue.length}" aria-valuenow="${state.results.length}"><span style="width:${state.results.length/state.queue.length*100}%"></span></div><div class="cs-prompt"><p class="cs-prompt-label">${solved?'Placement checked':'Which group does this name belong in?'}</p>${solved?'<div class="cs-placed-label">✓ Name placed below</div>':`<button type="button" class="cs-name-chip ${selected?'is-selected':''}" data-cs-chip aria-pressed="${selected}" aria-describedby="cs-input-help">${escape(item.name)}<span aria-hidden="true">${selected?'Selected · choose a group':'Drag or select'}</span></button>`}<p class="cs-copy cs-input-help" id="cs-input-help">${solved?'Read the explanation, then choose Next.':'Drag to a group, or tap the name then tap a group. Keyboard: Enter to select, Tab to a group, Enter to place. Escape cancels selection.'}</p></div>${feedback}<div class="cs-zones" role="group" aria-label="Classification groups">${GROUPS.map(g=>`<button type="button" class="cs-zone ${solved&&item.group===g.id?'is-correct':''}" data-cs-group="${g.id}" ${solved?'disabled':''} aria-label="Place ${escape(item.name)} in ${g.label}"><span class="cs-zone-top"><span class="cs-zone-symbol" aria-hidden="true">${g.symbol}</span><strong>${g.label}</strong></span><span class="cs-zone-detail">${g.detail}</span>${solved&&item.group===g.id?`<span class="cs-placed-name">✓ ${escape(item.name)}</span>`:'<span class="cs-drop-hint" aria-hidden="true">Drop or choose here</span>'}</button>`).join('')}</div>${solved?`<div class="cs-actions cs-next"><span class="cs-copy">${current.attempts===1?'First-try classification recorded.':'Correction saved separately from first-try accuracy.'}</span><button type="button" class="cs-button cs-primary" data-cs-next>${state.index===state.queue.length-1?'See recap':'Next name'} →</button></div>`:''}${convention()}`;
      const chip=host.querySelector('[data-cs-chip]');
      if(chip){
        chip.onclick=event=>{
          if(destroyed||state?.phase!=='question'||key!==roundKey(state)||(Date.now()<ignoreClickUntil&&event?.detail!==0))return;
          selected=!selected;chip.classList.toggle('is-selected',selected);chip.setAttribute('aria-pressed',String(selected));
          chip.querySelector('span').textContent=selected?'Selected · choose a group':'Drag or select';
          const status=host.querySelector('[data-cs-status]');if(status)status.textContent=selected?`${item.name} selected. Choose a group.`:'Selection canceled. Select the name to try again.';
        };
        chip.onkeydown=event=>{if(event.key==='ArrowDown'){event.preventDefault();if(!selected)chip.click();host.querySelector('[data-cs-group]')?.focus();}};
        chip.ondragstart=event=>event.preventDefault();
        chip.onpointerdown=event=>{
          if(event.button!==undefined&&event.button!==0||destroyed||key!==roundKey(state))return;
          stopDrag();drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,source:chip,zone:null,ghost:null};
          try{chip.setPointerCapture?.(event.pointerId);}catch{}
        };
        chip.onpointermove=event=>{
          if(!drag||event.pointerId!==drag.pointerId)return;
          if(!drag.ghost&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<7)return;
          event.preventDefault();
          if(!drag.ghost){drag.ghost=doc.createElement('div');drag.ghost.className='cs-drag-ghost';drag.ghost.textContent=item.name;drag.ghost.setAttribute('aria-hidden','true');doc.body.appendChild(drag.ghost);chip.classList.add('is-dragging');}
          drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px';
          const hit=doc.elementFromPoint(event.clientX,event.clientY)?.closest('[data-cs-group]');
          const zone=hit&&host.contains(hit)&&!hit.disabled?hit:null;
          if(drag.zone!==zone){drag.zone?.classList.remove('is-over');zone?.classList.add('is-over');drag.zone=zone;}
        };
        chip.onpointerup=event=>{
          if(!drag||event.pointerId!==drag.pointerId)return;
          const zone=drag.zone,wasDragging=!!drag.ghost;stopDrag();
          if(wasDragging){ignoreClickUntil=Date.now()+450;if(zone)submit(zone.dataset.csGroup,key);else {const status=host.querySelector('[data-cs-status]');if(status)status.textContent='No group selected. Your answer was not counted.';}}
        };
        chip.onpointercancel=chip.onlostpointercapture=()=>stopDrag();
      }
      const zones=[...host.querySelectorAll('[data-cs-group]')];
      zones.forEach((zone,index)=>{
        zone.onclick=()=>{if(!selected){const status=host.querySelector('[data-cs-status]');if(status)status.textContent=`Select ${item.name} first, then choose its group.`;chip?.focus();return;}submit(zone.dataset.csGroup,key);};
        zone.onkeydown=event=>{const offsets={ArrowRight:1,ArrowLeft:-1,ArrowDown:2,ArrowUp:-2};if(offsets[event.key]){event.preventDefault();zones[(index+offsets[event.key]+4)%4].focus();}};
      });
      const nextButton=host.querySelector('[data-cs-next]');if(nextButton)nextButton.onclick=()=>advance(key);
    }
    host.querySelectorAll('[data-cs-size]').forEach(button=>button.onclick=()=>chooseSize(Number(button.dataset.csSize)));
    expose();
  }
  host.onkeydown=event=>{
    if(event.key!=='Escape')return;
    stopDrag();selected=false;
    const chip=host.querySelector('[data-cs-chip]');
    if(chip){chip.classList.remove('is-selected');chip.setAttribute('aria-pressed','false');chip.querySelector('span').textContent='Drag or select';chip.focus();}
    const status=host.querySelector('[data-cs-status]');if(status)status.textContent='Selection canceled. Select the name to try again.';
  };
  const controller={
    getSnapshot:()=>state?clone(state):null,
    destroy(){if(destroyed)return;stopDrag();destroyed=true;host.onkeydown=null;host.classList.remove('cs-game','cs-active');if(host.__classificationSort===controller)delete host.__classificationSort;}
  };
  host.__classificationSort=controller;
  render();return controller;
}
const api={VERSION,groups:GROUPS,items:ITEMS,createRun,validateSnapshot,place,next,summarize,roundKey,mount};
root.ClassificationSort=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
