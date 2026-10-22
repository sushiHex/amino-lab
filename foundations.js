/* Optional recognition foundations. No amino-acid mastery, rewards, or storage side effects. */
(function(root){
'use strict';
const VERSION=1;
const sources={symbols:'https://openstax.org/books/chemistry-2e/pages/2-3-atomic-structure-and-symbolism',notation:'https://openstax.org/books/organic-chemistry/pages/1-12-drawing-chemical-structures',groups:'https://openstax.org/books/organic-chemistry/pages/3-1-functional-groups',amines:'https://openstax.org/books/chemistry-atoms-first/pages/21-4-amines-and-amides',valence:'https://openstax.org/books/organic-chemistry/pages/1-4-development-of-chemical-bonding-theory',backbone:'https://openstax.org/books/organic-chemistry/pages/26-1-structures-of-amino-acids'};
const concepts=[
 {id:'symbols',title:'Meet the symbols',lesson:'H = hydrogen · C = carbon · N = nitrogen · O = oxygen · S = sulfur. These label elements; a bonded group such as –OH contains more than one atom.',visual:'symbols',source:'symbols'},
 {id:'notation',title:'Read lines and little numbers',lesson:'One line is a single bond; two parallel lines are a double bond. A small number counts the atom just before it: –CH₂–CH₃ contains two carbons and five hydrogens.',visual:'notation',source:'notation'},
 {id:'amino',title:'Turn the group, not its meaning',lesson:'–NH₂ and H₂N– both show one nitrogen bonded to two hydrogens; N attaches to the rest. In CH₃–NH₂, this is an amino group—not a free NH₃ molecule.',visual:'amino',source:'notation'},
 {id:'hydroxyl',title:'Spot an attached –OH',lesson:'The –OH attached in CH₃–OH is a hydroxyl group: an O–H unit, not an element. Separate OH⁻ is the hydroxide ion; the bond to the rest and the charge matter.',visual:'hydroxyl',source:'groups'},
 {id:'carbonyl',title:'Look beside C=O',lesson:'Carboxyl is –C(=O)OH: the same carbon has =O and –OH. An amide such as –C(=O)NH₂ has nitrogen directly bonded to that carbonyl carbon; it is not an ordinary amine.',visual:'carbonyl',source:'groups'},
 {id:'valence',title:'A useful 4–3–2–1 check',lesson:'For the usual neutral atoms here, count bond order: C 4, N 3, O 2, H 1. A double bond counts twice. This is a shortcut, not a universal rule: ammonium N⁺ can have four single bonds.',visual:'valence',source:'valence'},
 {id:'backbone',title:'Keep the core; change R',lesson:'The shared α-amino-acid drawing has a central carbon joined to the amino group, carboxyl group, H, and R. R marks the varying side chain—not an extra element.',visual:'backbone',source:'backbone'},
 {id:'modules',title:'Make the pieces connect',lesson:'With single-bond joins, CH₃ is a carbon end piece and CH₂ a two-way link. Larger tiles keep their internal bonds: the amide tile already contains C=O and NH₂.',visual:'modules',source:'notation'}
];
const v=(prompt,choices,correct,explanation,visual)=>({prompt,choices,correct,explanation,visual});
const bank=[
 {id:'symbols-1',concept:'symbols',variants:[
  v('Read H · C · N, in that order.',['Hydrogen · carbon · nitrogen','Hydrogen · calcium · nitrogen','Helium · carbon · nitrogen','Hydrogen · carbon · neon'],0,'H is hydrogen, C carbon, and N nitrogen.','H · C · N'),
  v('Read N · H · C, in that order.',['Neon · hydrogen · carbon','Nitrogen · helium · carbon','Nitrogen · hydrogen · carbon','Nitrogen · hydrogen · calcium'],2,'N, H, C name nitrogen, hydrogen, carbon.','N · H · C')]},
 {id:'symbols-2',concept:'symbols',variants:[
  v('Which names match O · S?',['Oxygen · sodium','Oxygen · sulfur','Osmium · sulfur','Oxygen · silicon'],1,'O is oxygen; S is sulfur.','O · S'),
  v('Which symbols mean sulfur · oxygen?',['Si · O','S · Os','Na · O','S · O'],3,'Sulfur uses S and oxygen uses O.','Sulfur · oxygen')]},
 {id:'notation-1',concept:'notation',variants:[
  v('In C=O, what do the two parallel lines mean?',['Two oxygen atoms','Two separate molecules','A double bond','A negative charge'],2,'C=O has one carbon and one oxygen joined by a double bond.','C=O'),
  v('Which shows a single bond between carbon and oxygen?',['C–O','C=O','C≡O','C + O'],0,'One connecting line denotes one single bond.','bond-options')]},
 {id:'notation-2',concept:'notation',variants:[
  v('Count only the atoms in the attached –CH₂–CH₃ fragment.',['2 C and 6 H','1 C and 5 H','5 C and 2 H','2 C and 5 H'],3,'There are two C symbols; the hydrogen counts add to 2 + 3 = 5.','–CH₂–CH₃'),
  v('Count only the atoms in –CH₂–CH₂–CH₃.',['3 C and 8 H','3 C and 7 H','2 C and 7 H','7 C and 3 H'],1,'Three carbon units contain 2 + 2 + 3 = 7 hydrogens.','–CH₂–CH₂–CH₃')]},
 {id:'amino-1',concept:'amino',variants:[
  v('Compare H₂N–CH₃ and CH₃–NH₂. What changed?',['The number of nitrogen atoms','The group became oxygen','Only the way it is written','A hydrogen was removed'],2,'Both drawings show the same methylamine connectivity; N bonds to the carbon.','amino'),
  v('Compare H₂N–CH₂–CH₃ and CH₃–CH₂–NH₂.',['Same connections, opposite reading direction','Different numbers of H atoms','Different numbers of C atoms','One has an extra nitrogen'],0,'The same chain and NH₂ group are written from opposite ends.','amino-long')]},
 {id:'amino-2',concept:'amino',variants:[
  v('In CH₃–NH₂, what is the attached –NH₂ part?',['A free ammonia molecule, NH₃','A hydroxyl group','A carbonyl group','An amino group containing 1 N and 2 H'],3,'This amino group contains one N and two H; its N also bonds to CH₃.','CH₃–[NH₂]'),
  v('In CH₃–CH₂–NH₂, how many atoms are in the NH₂ group alone?',['2 N and 1 H','1 N and 2 H','1 N and 3 H','1 N and 1 O'],1,'The subscript 2 counts the hydrogens bonded to N, not two nitrogen atoms.','CH₃–CH₂–[NH₂]')]},
 {id:'hydroxyl-1',concept:'hydroxyl',variants:[
  v('The attached –OH in CH₃–OH is…',['A hydroxyl group, made of O and H','A single element called OH','An amino group','A carbonyl group'],0,'A hydroxyl group is a bonded O–H unit, not an element symbol.','CH₃–[OH]'),
  v('In CH₃–CH₂–O–H, which two atoms form the hydroxyl group?',['C and C','C and H','O and H','C and O'],2,'The bonded O–H unit is the hydroxyl group.','CH₃–CH₂–O–H')]},
 {id:'hydroxyl-2',concept:'hydroxyl',variants:[
  v('Which statement correctly compares CH₃–OH with separate OH⁻?',['Both labels mean the same free ion','The first has attached hydroxyl; the second is hydroxide','OH⁻ contains an extra oxygen','The minus sign means an extra bond to carbon'],1,'An attached neutral –OH is not the separate negatively charged hydroxide ion.','hydroxyl'),
  v('Which label explicitly denotes the hydroxide ion?',['CH₃–OH','CH₃–CH₂–OH','H₂O','OH⁻'],3,'OH⁻ names the separate negatively charged ion, unlike an attached hydroxyl group.','hydroxide-options')]},
 {id:'carbonyl-1',concept:'carbonyl',variants:[
  v('Which expands the carboxyl group –COOH correctly?',['–C(=O)–NH₂','–CH₂–OH','–C(=O)–OH','–CH₂–O–O–H'],2,'A carboxyl carbon is double-bonded to one O and single-bonded to an OH.','–COOH'),
  v('In a carboxyl group, what is bonded to the same carbon?',['=O and –OH','=O and –NH₂','Two –NH₂ groups','Only two hydrogens'],0,'The combination on that carbon is C(=O)OH.','carboxyl')]},
 {id:'carbonyl-2',concept:'carbonyl',variants:[
  v('Why is –C(=O)NH₂ an amide, not an ordinary amine?',['It has no nitrogen','It contains only single bonds','It has two nitrogen atoms','Its N bonds directly to a C=O carbon'],3,'The direct carbonyl-carbon–nitrogen connection identifies an amide.','amide'),
  v('Which fragment contains an amide group?',['–CH₂–NH₂','–C(=O)–NH₂','–C(=O)–OH','–CH₂–OH'],1,'An amide has nitrogen directly joined to the carbonyl carbon.','amide-options')]},
 {id:'valence-1',concept:'valence',variants:[
  v('For the usual neutral atoms here, which bond-order tally is useful?',['C 3 · N 4 · O 2 · H 1','C 4 · N 2 · O 3 · H 1','C 4 · N 3 · O 2 · H 1','C 4 · N 3 · O 1 · H 2'],2,'Use 4–3–2–1 as a limited neutral-atom check; count a double bond as two.','C · N · O · H'),
  v('A carbon has one double bond and two single bonds. Its bond-order total is…',['4','3','2','5'],0,'The double bond contributes 2, and the single bonds contribute 1 each.','carbonyl-count')]},
 {id:'valence-2',concept:'valence',variants:[
  v('In CH₃–NH₃⁺, nitrogen has four single bonds. Why can this fit?',['Nitrogen has become carbon','The + removes a hydrogen','The neutral shortcut applies to every ion','This positively charged N is an ammonium center'],3,'Ammonium nitrogen has four single bonds and a positive charge; the neutral N=3 shortcut is limited.','ammonium'),
  v('Which ordinary four-single-bond nitrogen label fits NH₄⁺?',['Uncharged nitrogen','Positively charged nitrogen','Negatively charged oxygen','Uncharged carbon'],1,'NH₄⁺ is ammonium: N has four N–H bonds and positive formal charge.','NH₄⁺')]},
 {id:'backbone-1',concept:'backbone',variants:[
  v('What does R mark in this shared amino-acid drawing?',['The varying side chain','A new element','The carboxyl oxygen','An extra nitrogen'],0,'R is a placeholder for the side chain attached to the central carbon.','backbone'),
  v('Glycine has R = H. What does that mean?',['R is the symbol for carbon','Glycine has no central carbon','Its side chain is one hydrogen','Every amino acid has R = H'],2,'For glycine, the side-chain placeholder is replaced by a hydrogen atom.','backbone')]},
 {id:'backbone-2',concept:'backbone',variants:[
  v('Alanine has R = CH₃; serine has R = CH₂OH. Which part changes?',['The shared carboxyl group','The side chain attached to the central carbon','Every backbone atom','The symbol for nitrogen'],1,'These amino acids share the core; their R groups differ.','backbone-pair'),
  v('Which list names the four attachments to the central carbon in this generic drawing?',['Four oxygens','Two R groups and two nitrogens','Only NH₂ and COOH','Amino group · carboxyl group · H · R'],3,'The generic α-carbon connects to those four groups. Proline has a ring connection discussed later.','backbone')]},
 {id:'modules-1',concept:'modules',variants:[
  v('A neutral CH₂ link uses two C–H single bonds. How many single-bond joins to the rest remain?',['One','Three','Two','Four'],2,'Two C–H bonds plus two external single bonds give carbon a total of four.','–CH₂–'),
  v('A neutral CH₃ end piece has three C–H bonds. How many single-bond joins to the rest remain?',['One','Two','Three','Zero'],0,'Three C–H bonds leave one external single-bond connection.','–CH₃')]},
 {id:'modules-2',concept:'modules',variants:[
  v('Build –CH₂–C(=O)NH₂ from the Forge tiles. Choose the pair.',['CH₂ + carboxyl','CH₃ + hydroxyl','CH₂ + amino','CH₂ + amide'],3,'The amide tile already includes the carbonyl and its attached NH₂.','–CH₂–C(=O)NH₂'),
  v('Build –CH₂–OH from two Forge tiles. Choose the pair.',['CH₃ + amino','CH₂ + hydroxyl','CH₂ + amide','CH₃ + carboxyl'],1,'A CH₂ link followed by an OH end group makes this side chain.','–CH₂–OH')]}
];
const byId=Object.fromEntries(bank.map(q=>[q.id,q]));
const clone=x=>JSON.parse(JSON.stringify(x));
const unique=a=>[...new Set(a)];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shuffle(a,rng=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function createState(){return {version:VERSION,phase:'intro',attempt:0,current:null,lessonConcept:null,lastResult:null,answers:[],progress:Object.fromEntries(concepts.map(c=>[c.id,{cleanIds:[],cleared:false,seen:{},misses:0}]))};}
function nextQuestion(s,rng){const concept=concepts.find(c=>!s.progress[c.id].cleared);if(!concept){s.phase='complete';s.current=null;s.lessonConcept=null;return s;}const p=s.progress[concept.id],last=s.answers.at(-1)?.questionId;let pool=bank.filter(q=>q.concept===concept.id&&!p.cleanIds.includes(q.id));if(pool.length>1&&pool.some(q=>q.id!==last))pool=pool.filter(q=>q.id!==last);pool.sort((a,b)=>(p.seen[a.id]||0)-(p.seen[b.id]||0));const q=pool[0],variant=(p.seen[q.id]||0)%q.variants.length;s.attempt++;p.seen[q.id]=(p.seen[q.id]||0)+1;s.current={key:'f'+s.attempt+':'+q.id+':'+variant,id:q.id,variant,choiceOrder:shuffle([0,1,2,3],rng)};s.phase='question';s.lessonConcept=null;return s;}
function start(raw,rng){if(raw.phase!=='intro')return raw;return nextQuestion(clone(raw),rng);}
function answer(raw,choice,key,rng){if(raw.phase!=='question'||raw.current?.key!==key||![0,1,2,3].includes(choice))return raw;const s=clone(raw),cur=s.current,q=byId[cur.id],item=q.variants[cur.variant],p=s.progress[q.concept],correct=choice===item.correct;s.answers.push({key:cur.key,questionId:q.id,variant:cur.variant,choice,correct,clean:correct});s.answers=s.answers.slice(-256);s.lastResult={correct,questionId:q.id,variant:cur.variant};if(correct){p.cleanIds=unique([...p.cleanIds,q.id]);p.cleared=p.cleanIds.length>=2;return nextQuestion(s,rng);}p.cleanIds=[];p.misses++;s.phase='lesson';s.lessonConcept=q.concept;return s;}
function showLesson(raw){if(raw.phase!=='question')return raw;const s=clone(raw),q=byId[s.current.id];s.answers.push({key:s.current.key,questionId:q.id,variant:s.current.variant,choice:null,correct:false,clean:false});s.answers=s.answers.slice(-256);s.progress[q.concept].cleanIds=[];s.lastResult=null;s.phase='lesson';s.lessonConcept=q.concept;return s;}
function continueLesson(raw,rng){if(raw.phase!=='lesson')return raw;return nextQuestion(clone(raw),rng);}
function review(raw,id){if(!concepts.some(c=>c.id===id))return raw;const s=clone(raw);s.progress[id].cleared=false;s.progress[id].cleanIds=[];s.phase='lesson';s.lessonConcept=id;s.current=null;s.lastResult=null;return s;}
function validateState(raw){
 try{if(!raw||raw.version!==VERSION||!['intro','question','lesson','complete'].includes(raw.phase)||!Number.isInteger(raw.attempt)||raw.attempt<0||raw.attempt>100000||!raw.progress||!Array.isArray(raw.answers)||raw.answers.length>256)return null;const s=createState();s.phase=raw.phase;s.attempt=raw.attempt;
  for(const c of concepts){const p=raw.progress[c.id],ids=bank.filter(q=>q.concept===c.id).map(q=>q.id);if(!p||!Array.isArray(p.cleanIds)||p.cleanIds.some(id=>!ids.includes(id))||unique(p.cleanIds).length!==p.cleanIds.length||typeof p.cleared!=='boolean'||p.cleared!==(p.cleanIds.length===2)||!Number.isInteger(p.misses)||p.misses<0||p.misses>100000||!p.seen||typeof p.seen!=='object')return null;const seen={};for(const id of ids){if(p.seen[id]!==undefined){if(!Number.isInteger(p.seen[id])||p.seen[id]<0||p.seen[id]>100000)return null;seen[id]=p.seen[id];}}s.progress[c.id]={cleanIds:[...p.cleanIds],cleared:p.cleared,seen,misses:p.misses};}
  const keys=new Set();for(const a of raw.answers){const q=byId[a?.questionId];if(!q||![0,1].includes(a.variant)||typeof a.key!=='string'||a.key.length>100||keys.has(a.key)||!(a.choice===null||[0,1,2,3].includes(a.choice)))return null;const correct=a.choice===q.variants[a.variant].correct;if(a.correct!==correct||a.clean!==correct)return null;keys.add(a.key);s.answers.push({key:a.key,questionId:q.id,variant:a.variant,choice:a.choice,correct,clean:correct});}
  if(raw.current!==null){const c=raw.current,q=byId[c?.id];if(!q||![0,1].includes(c.variant)||typeof c.key!=='string'||c.key!=='f'+s.attempt+':'+q.id+':'+c.variant||!Array.isArray(c.choiceOrder)||c.choiceOrder.length!==4||unique(c.choiceOrder).length!==4||c.choiceOrder.some(i=>![0,1,2,3].includes(i)))return null;s.current={key:c.key,id:q.id,variant:c.variant,choiceOrder:[...c.choiceOrder]};}
  if(raw.lastResult!==null){const r=raw.lastResult;if(!byId[r?.questionId]||![0,1].includes(r.variant)||typeof r.correct!=='boolean')return null;s.lastResult={questionId:r.questionId,variant:r.variant,correct:r.correct};}
  if(raw.lessonConcept!==null){if(!concepts.some(c=>c.id===raw.lessonConcept))return null;s.lessonConcept=raw.lessonConcept;}
  const all=concepts.every(c=>s.progress[c.id].cleared);if(s.phase==='complete'&&!all||s.phase==='question'&&(!s.current||s.progress[byId[s.current.id].concept].cleared||keys.has(s.current.key))||s.phase==='lesson'&&!s.lessonConcept||s.phase==='intro'&&(s.current||s.answers.length)||s.phase!=='lesson'&&s.lessonConcept)return null;
  return s;
 }catch{return null;}
}
function svg(label,body,height=180){return '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 440 '+height+'" role="img" aria-label="'+escape(label)+'"><title>'+escape(label)+'</title>'+body+'</svg>';}
function text(x,y,label,size=28,color='currentColor'){return '<text x="'+x+'" y="'+y+'" text-anchor="middle" fill="'+color+'" font-family="Arial,sans-serif" font-size="'+size+'">'+escape(label)+'</text>';}
const path=d=>'<path d="'+d+'" fill="none" stroke="currentColor" stroke-width="3"/>';
function carbonyl(end){return svg('The rest is bonded to C, which is double-bonded to O and single-bonded to '+end,path('M95 110H192 M233 110H305 M209 85V48 M219 85V48')+text(53,119,'rest',22)+text(214,120,'C')+text(214,38,'O')+text(345,120,end));}
function graphic(id){
 if(id==='backbone')return svg('Generic neutral alpha amino acid: central carbon bonded to amino group, H, R side chain, and carboxyl group',path('M89 103H168 M211 103H291 M324 103H365 M190 81V48 M190 125V163 M302 80V48 M312 80V48')+text(53,113,'H₂N',28,'#91cbea')+text(190,113,'C',28,'#91cbea')+text(190,37,'H',28,'#91cbea')+text(190,194,'R',32,'#f6cb67')+text(307,113,'C',28,'#91cbea')+text(307,37,'O',28,'#91cbea')+text(403,113,'OH',28,'#91cbea'),215);
 if(id==='carboxyl'||id==='carbonyl-count')return carbonyl('OH');if(id==='amide')return carbonyl('NH₂');
 if(id==='ammonium')return svg('CH3 bonded to positive nitrogen; nitrogen also has three single bonds to hydrogen',path('M125 93H195 M237 93H313 M216 69V43 M216 116V141')+text(82,103,'CH₃')+text(216,103,'N⁺')+text(346,103,'H')+text(216,33,'H')+text(216,171,'H'));
 const labels={symbols:['H · C · N · O · S','Five element symbols'],notation:['C–O        C=O','–CH₂–CH₃'],amino:['H₂N–CH₃','CH₃–NH₂'],'amino-long':['H₂N–CH₂–CH₃','CH₃–CH₂–NH₂'],hydroxyl:['CH₃–OH','OH⁻'],carbonyl:['–C(=O)OH','–C(=O)NH₂'],valence:['C 4 · N 3 · O 2 · H 1','Usual neutral-atom bond-order totals'],modules:['–CH₃        –CH₂–','End piece         Two-way link'],'backbone-pair':['Alanine: R = CH₃','Serine: R = CH₂OH'],'bond-options':['C–O       C=O','C≡O       C + O'],'hydroxide-options':['CH₃–OH       H₂O','CH₃–CH₂–OH       OH⁻'],'amide-options':['–CH₂–NH₂       –C(=O)NH₂','–C(=O)OH       –CH₂–OH']};const rows=labels[id]||[id];return svg(rows.join('; '),rows.map((r,i)=>{const y=rows.length===1?102:75+i*52,columns=r.split(/ {2,}/);return columns.length===2?columns.map((label,j)=>text(115+j*210,y,label,label.length>11?21:25)).join(''):text(220,y,r,r.length>30?20:r.length>22?23:29);}).join(''));
}
function mount(host,opts={}){
 let state=validateState(opts.initialState)||createState(),destroyed=false,leaving=false,lockedUntil=0;
 function persist(){opts.onStateChange?.(clone(state));}
 function exposeNamed(html){const visible=html.replace(/<[^>]*>/g,' ');for(const [name,code] of [['alanine','A'],['glycine','G'],['serine','S'],['cysteine','C'],['proline','P']])if(new RegExp('\\b'+name+'\\b','i').test(visible))opts.onExposure?.(code);}
 function commit(next){if(destroyed||next===state)return;state=next;persist();render();}
 function progress(){return concepts.filter(c=>state.progress[c.id].cleared).length;}
 function button(label,attr,primary=false){return '<button type="button" class="btn '+(primary?'accent':'light')+'" '+attr+'>'+label+'</button>';}
 const convention='<details class="foundations-note" data-convention><summary>Drawing convention & sources</summary><p>We use neutral classroom drawings for connectivity, not the dominant charged forms in near-neutral water. Follow your teacher’s convention. R is a placeholder. Proline’s side chain reconnects to N, so its neutral backbone has NH rather than NH₂; save that exception for its own card. This is recognition practice, not proof of drawing or exam mastery.</p><p>'+Object.entries(sources).map(([k,url])=>'<a href="'+url+'" target="_blank" rel="noopener">OpenStax: '+escape(k)+'</a>').join(' · ')+'</p></details>';
 function render(){if(destroyed)return;host.classList.add('amino-foundations');const n=progress(),head='<div class="foundations-head"><div><p class="eyebrow">FOUNDATIONS · OPTIONAL</p><h2>Read the pieces.</h2></div>'+button('Back to amino acids','data-exit')+'</div><div class="foundations-progress"><span>'+n+' / '+concepts.length+' concepts ready</span><progress value="'+n+'" max="'+concepts.length+'" aria-label="Foundations concepts ready"></progress></div>';
  let body='';
  if(state.phase==='intro')body='<div class="foundations-intro">'+graphic('amino')+'<h3>Already know it? Show it. Skip it.</h3><p>A quick check skips concepts you demonstrate twice. Only gaps get a tiny lesson. Nothing here locks the amino-acid game.</p><p class="caption">About 1–2 minutes if familiar; around 5 minutes with refreshers. No timer.</p>'+button('Quick check →','data-start',true)+'</div>';
  else if(state.phase==='question'){const q=byId[state.current.id],item=q.variants[state.current.variant],c=concepts.find(c=>c.id===q.concept),p=state.progress[q.concept];body='<div class="foundations-status" role="status" aria-live="polite">'+(state.lastResult?.correct?'✓ Correct. ':'')+'Check '+(p.cleanIds.length+1)+' of 2 · '+escape(c.title)+'</div><div class="foundations-question-top"><div class="foundations-visual '+(item.visual==='backbone'?'foundations-visual-tall':'')+'">'+graphic(item.visual)+'</div><h3 class="foundations-prompt" tabindex="-1">'+escape(item.prompt)+'</h3></div><div class="foundations-choices" role="group" aria-label="Choose one answer">'+state.current.choiceOrder.map((i,pos)=>'<button type="button" data-answer="'+i+'"><span class="foundations-letter" aria-hidden="true">'+String.fromCharCode(65+pos)+'</span><span>'+escape(item.choices[i])+'</span></button>').join('')+'</div><div class="foundations-actions">'+button('I need a tiny lesson','data-help')+'<span>Two different correct checks skip this concept.</span></div>';}
  else if(state.phase==='lesson'){const c=concepts.find(c=>c.id===state.lessonConcept),r=state.lastResult,item=r&&byId[r.questionId].variants[r.variant];body='<div class="foundations-status" role="status" aria-live="polite">A quick refresher—not a restart.</div><h3>'+escape(c.title)+'</h3><div class="foundations-visual">'+graphic(c.visual)+'</div><p class="foundations-lesson">'+escape(c.lesson)+'</p>'+(r&&!r.correct?'<p class="foundations-explanation">'+escape(item.explanation)+'</p>':'')+button('Try a different check →','data-continue',true);}
  else body='<div class="foundations-intro"><div class="foundations-ready" aria-hidden="true">✦</div><h3>You can read the pieces.</h3><p>These checks are saved. We will not reteach cleared concepts unless you choose a review.</p><p class="caption">Recognition is a start—not independent drawing mastery.</p><div class="foundations-actions">'+button('Go to the 20 →','data-exit',true)+button('Build alanine','data-forge="A"')+button('Build serine','data-forge="S"')+button('Build cysteine','data-forge="C"')+'</div><p class="caption">Optional guided builds: CH₃ → CH₂–OH → CH₂–SH. Sulfur replaces oxygen in the last end group.</p></div>';
  const reviews=n?'<details class="foundations-note"><summary>Review a cleared concept</summary><div class="foundations-review">'+concepts.filter(c=>state.progress[c.id].cleared).map(c=>button(escape(c.title),'data-review="'+c.id+'"')).join('')+'</div></details>':'';host.innerHTML='<section class="panel foundations-panel">'+head+body+reviews+convention+'</section>';
  host.querySelector('[data-start]')?.addEventListener('click',()=>commit(start(state)));
  host.querySelector('[data-continue]')?.addEventListener('click',()=>commit(continueLesson(state)));
  host.querySelector('[data-help]')?.addEventListener('click',()=>commit(showLesson(state)));
  host.querySelectorAll('[data-exit]').forEach(b=>b.addEventListener('click',()=>{if(destroyed||leaving)return;leaving=true;persist();opts.onExit?.();}));
  host.querySelectorAll('[data-forge]').forEach(b=>b.addEventListener('click',()=>{if(destroyed||leaving||progress()!==concepts.length)return;leaving=true;persist();opts.onForge?.(b.dataset.forge);}));
  host.querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>commit(review(state,b.dataset.review))));
  const key=state.current?.key;host.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{if(Date.now()<lockedUntil)return;lockedUntil=Date.now()+250;commit(answer(state,+b.dataset.answer,key));host.querySelector('.foundations-prompt')?.focus?.({preventScroll:true});}));
  host.querySelector('[data-convention]')?.addEventListener('toggle',event=>{if(!destroyed&&event.currentTarget.open)exposeNamed(convention);});
  // Only the displayed card/body counts; a closed convention note does not expose its Proline exception.
  exposeNamed(body);
 }
 render();return {destroy(){destroyed=true;host.innerHTML='';host.classList.remove('amino-foundations');},getState(){return clone(state);}};
}
const api={VERSION,concepts,bank,sources,createState,start,answer,showLesson,continueLesson,review,validateState,graphic,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.AminoFoundations=api;
})(typeof window!=='undefined'?window:globalThis);
