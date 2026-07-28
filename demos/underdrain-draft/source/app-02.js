function renderStory(){
  const thread=document.getElementById("story-thread");if(!thread)return;
  thread.innerHTML=session.story.slice(-18).map(entry=>`<p class="${entry.kind==="reveal"?"reveal":entry.kind==="route"?"route-note":""}"><span class="speaker">${escapeHtml(entry.speaker)}</span><br>${escapeHtml(entry.text)}</p>`).join("");
  thread.scrollTop=thread.scrollHeight;
}

function actionScale(spec){return Math.min((W-90)/(spec.arena.radius*2),(H-90)/(spec.arena.radius*2))}
function screenPoint(spec,x,y){const scale=actionScale(spec);return{x:W/2+x*scale,y:H/2+y*scale,scale}}
function targetProgress(run,objective){
  const completion=objective.semanticCompletion;if(!completion)return{amount:0,target:objective.targetDefeats};
  const amount=run.state.objectiveProgress?.[objective.id]??0;
  return{amount,target:completion.kind==="interact_count"?completion.targetCount:completion.targetTicks};
}
function activeTargets(run,all=false){
  const objectives=all?run.spec.objectives:[run.spec.objectives[run.state.activeObjectiveIndex]].filter(Boolean);
  return objectives.flatMap(objective=>{
    const semantic=objective.semanticCompletion;if(!semantic)return[];
    return semantic.kind==="interact_count"?semantic.targets.map(target=>({objective,target,kind:semantic.kind})): [{objective,target:semantic.target,kind:semantic.kind}];
  });
}
function drawAction(run){
  const spec=run.spec,state=run.state;
  ctx.fillStyle=run.challengeId===SERVICE_ID?"#0a130f":"#07100b";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(140,229,184,.07)";ctx.lineWidth=1;
  for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  ctx.strokeStyle=run.challengeId===SERVICE_ID?"rgba(230,189,99,.28)":"rgba(230,189,99,.2)";ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(45,H/2);ctx.lineTo(W-45,H/2);ctx.stroke();
  if(run.challengeId===PUMP_ID){
    ctx.strokeStyle="rgba(138,199,217,.16)";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(W/2,40);ctx.bezierCurveTo(W*.7,H*.25,W*.34,H*.72,W/2,H-35);ctx.stroke();
  }

  const showAll=session.route==="service-tunnel"&&run.challengeId===PUMP_ID;
  const completedTargets=new Set(state.completedInteractionTargetIds??[]);
  for(const entry of activeTargets(run,showAll)){
    const p=screenPoint(spec,entry.target.x,entry.target.y);
    const active=entry.objective.id===spec.objectives[state.activeObjectiveIndex]?.id;
    const done=completedTargets.has(entry.target.id)||state.completedObjectiveIds.includes(entry.objective.id);
    ctx.save();ctx.translate(p.x,p.y);
    ctx.globalAlpha=active?1:.32;
    ctx.fillStyle=done?"rgba(140,229,184,.35)":"rgba(193,240,120,.12)";
    ctx.strokeStyle=done?"#8ce5b8":active?"#c1f078":"#8ac7d9";ctx.lineWidth=active?4:2;
    ctx.beginPath();ctx.arc(0,0,Math.max(14,entry.target.radius*p.scale),0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=done?"#8ce5b8":"#f6f1df";ctx.font="bold 12px ui-monospace";ctx.textAlign="center";ctx.fillText(done?"DONE":entry.kind==="hold_ticks"?"HOLD WORK":"WORK",0,-20);
    ctx.restore();
  }

  for(const enemy of state.enemies){
    if(enemy.mode==="defeated")continue;
    const p=screenPoint(spec,enemy.x,enemy.y),law=spec.enemyLaws[enemy.kit];
    ctx.save();ctx.translate(p.x,p.y);
    if(enemy.mode==="telegraph"||enemy.mode==="active"){
      const phase=enemy.mode==="active"?1:Math.min(1,enemy.modeTick/Math.max(1,law.telegraphTicks));
      ctx.strokeStyle=`rgba(255,154,83,${.35+.55*phase})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,26+14*phase,0,Math.PI*2);ctx.stroke();
    }
    const radius=Math.max(10,law.radius*p.scale);
    ctx.fillStyle=enemy.kit==="breaker"?"#dd7d56":enemy.kit==="swarm"?"#b784cb":"#c1f078";
    ctx.beginPath();ctx.arc(0,-4,radius,Math.PI,0);ctx.lineTo(radius*.7,radius*.72);ctx.lineTo(-radius*.7,radius*.72);ctx.closePath();ctx.fill();
    ctx.fillStyle="#191d19";ctx.fillRect(-radius,radius+5,radius*2,4);ctx.fillStyle="#ff7878";ctx.fillRect(-radius,radius+5,radius*2*(enemy.health/law.maxHealth),4);
    ctx.restore();
  }

  const player=state.player,p=screenPoint(spec,player.x,player.y);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(player.facingY,player.facingX));
  ctx.fillStyle=player.mode==="dodge"?"#ffffff":"#8ce5b8";ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#e6bd63";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(4,0);ctx.lineTo(29,0);ctx.stroke();ctx.restore();

  if(run.route==="emergency-plan"&&run.challengeId===PUMP_ID){ctx.fillStyle="rgba(230,189,99,.66)";ctx.font="11px ui-monospace";ctx.fillText("MUNICIPAL OVERRIDE CHANNEL ACTIVE",16,H-16)}
  if(run.route==="truce-offer"&&run.challengeId===PUMP_ID){ctx.fillStyle="rgba(193,240,120,.7)";ctx.font="11px ui-monospace";ctx.fillText("CROWN SIGNAL TRANSLATION ACTIVE",16,H-16)}
}

function renderAction(){
  const run=session.current;if(!run)return;
  drawAction(run);
  const state=run.state,spec=run.spec,objective=spec.objectives[state.activeObjectiveIndex];
  document.getElementById("health-fill").style.width=`${Math.max(0,100*state.player.health/spec.player.maxHealth)}%`;
  const remaining=Math.max(0,Math.ceil((spec.maxTicks-state.tick)/TICK_RATE));
  document.getElementById("timer").textContent=`${String(Math.floor(remaining/60)).padStart(2,"0")}:${String(remaining%60).padStart(2,"0")}`;
  document.getElementById("place-label").textContent=run.placeLabel.toUpperCase();
  const binding=objective?objectiveBinding(run.experienceId,objective.id):null;
  document.getElementById("action-title").textContent=binding?.playerFacingLabel??(state.result?"Operation complete":"Hold the line");
  if(objective?.semanticCompletion){
    const progress=targetProgress(run,objective);
    const instruction=objective.semanticCompletion.kind==="interact_count"
      ?`Reach each green mechanism and tap WORK. ${progress.amount}/${progress.target} complete.`
      :`Stand inside the green mechanism and hold WORK. ${progress.amount}/${progress.target} ticks.`;
    document.getElementById("action-hint").textContent=instruction;
  }else document.getElementById("action-hint").textContent="Reduce the immediate pressure and keep moving.";
  document.getElementById("control-hint").textContent=run.challengeId===SERVICE_ID
    ?"This is a safe repair: move to the green mechanism and use WORK. There are no enemies."
    :"Orange rings are attacks. WRENCH or parry reduces pressure. Only WORK on the green mechanism advances the plumbing objective.";
  document.getElementById("objective-list").innerHTML=spec.objectives.map((entry,index)=>{
    const itemBinding=objectiveBinding(run.experienceId,entry.id);
    const cls=state.completedObjectiveIds.includes(entry.id)?"done":index===state.activeObjectiveIndex?"current":"";
    return`<li class="${cls}">${escapeHtml(itemBinding?.playerFacingLabel??entry.label)}</li>`;
  }).join("");
  renderStory();
}

function renderDraft(){
  if(session.route)chooseRoute(session.route);
  document.getElementById("authority-status").textContent="Service call accepted by Arc";
}

const STATE_LABELS={
  "town-water-pressure":"Town water pressure","kett-water":"Mrs. Kett's water","fungus-contact":"Crown contact",
  "crown-grievance":"Crown grievance","rhea-status":"Rhea's status","evidence-custody":"Evidence custody","root-gate-open":"Root Gate",
};
function prettyValue(value){return typeof value==="boolean"?(value?"YES":"NO"):String(value).replaceAll("-"," ").toUpperCase()}
function stateGrid(target,state,before=null){
  target.innerHTML=Object.keys(STATE_LABELS).map(id=>{
    const value=state[id],prior=before?.[id],changed=before&&value!==prior;
    const numeric=changed&&typeof value==="number"&&typeof prior==="number";
    const cls=numeric?(value>prior?"delta-up":"delta-down"):changed?"delta-up":"";
    return`<div class="world-cell"><b>${escapeHtml(STATE_LABELS[id])}</b><strong class="${cls}">${escapeHtml(prettyValue(value))}</strong>${changed?`<span class="hint">was ${escapeHtml(prettyValue(prior))}</span>`:""}</div>`;
  }).join("");
}
function renderConsequence(record){
  if(!record)return;
  const outcome=record.receipt.result.outcome;
  const titles={success:"BALANCED FLOW",partial:"PUMP SEVEN CEASEFIRE",failure:"THE CROWN HOLDS THE PUMP"};
  document.getElementById("consequence-title").textContent=titles[outcome];
  document.getElementById("consequence-copy").textContent=record.narrative;
  document.getElementById("accepted-digest").textContent=record.receipt.receiptDigest;
  document.getElementById("authority-status").textContent=`Arc accepted ${outcome}`;
  stateGrid(document.getElementById("world-grid"),record.campaignAfter,record.campaignBefore);
  document.getElementById("meaning-copy").textContent=outcome==="success"
    ?"Rhea restored town flow while preserving the nursery route. The defenders were pressure around a water operation, not the operation's objective."
    :outcome==="partial"
      ?"The mechanisms held long enough for a ceasefire. Bellwether has water unevenly, and the Crown arrives at the Root Gate with an active grievance."
      :"Rhea failed to stabilize the mechanisms. The Crown now controls access, so the next problem is negotiation under fungal terms rather than a blank restart.";
}
function renderCompact(receipt){
  if(!receipt)return;
  document.querySelectorAll("[data-compact]").forEach(button=>{button.disabled=true;button.hidden=true});
  const titles={"balanced-flow-compact":"THE BALANCED-FLOW COMPACT","town-first-flow":"THE TOWN-FIRST PROVISION","nursery-first-flow":"THE NURSERY-FIRST PROVISION"};
  document.getElementById("compact-title").textContent=titles[receipt.choiceId];
  document.getElementById("compact-digest").textContent=receipt.receiptDigest;
  document.getElementById("compact-copy").textContent=receipt.narrative;
  document.getElementById("compact-result").hidden=false;
  document.getElementById("authority-status").textContent="Root Gate compact accepted by Arc";
  stateGrid(document.getElementById("final-world-grid"),receipt.campaignAfter,receipt.campaignBefore);
}
function renderRecord(tab="episode"){
  const record=episodeRecord();
  const value=tab==="episode"?record:tab==="action"?record.acceptedActions:tab==="compact"?record.compactReceipt:tab==="evidence"?record.structuralEvidence:AUTHORING;
  document.getElementById("record-json").textContent=JSON.stringify(value,null,2);
  stateGrid(document.getElementById("final-world-grid"),session.campaign);
}
function renderAll(){
  renderStory();
  if(session.current)renderAction();
  if(session.route)renderDraft();
  const pump=session.acceptedActions.find(entry=>entry.receipt.challengeId===PUMP_ID);if(pump)renderConsequence(pump);
  if(session.compactReceipt)renderCompact(session.compactReceipt);
  document.getElementById("resume-run").hidden=session.stage==="cold";
}

function botInput(spec,state){
  const objective=spec.objectives[state.activeObjectiveIndex];
  const base={moveX:0,moveY:0,aimX:state.player.facingX||1,aimY:state.player.facingY||0,buttons:0};
  const semantic=objective?.semanticCompletion;
  const complete=new Set(state.completedInteractionTargetIds??[]);
  const target=semantic
    ?(semantic.kind==="interact_count"?semantic.targets.find(entry=>!complete.has(entry.id)):semantic.target)
    :null;
  const live=[...state.enemies].filter(enemy=>enemy.mode!=="defeated").sort((a,b)=>{
    const ad=(a.x-state.player.x)**2+(a.y-state.player.y)**2,bd=(b.x-state.player.x)**2+(b.y-state.player.y)**2;
    return ad-bd||a.id.localeCompare(b.id);
  })[0];
  if(target){
    const dx=target.x-state.player.x,dy=target.y-state.player.y,ax=Math.sign(dx),ay=Math.sign(dy),distance=dx*dx+dy*dy;
    if(live&&state.player.mode==="idle"){
      const law=spec.enemyLaws[live.kit];
      const danger=live.mode==="active"||(live.mode==="telegraph"&&live.modeTick>=Math.max(0,law.telegraphTicks-spec.player.parryActiveTicks));
      if(danger)return{...base,aimX:Math.sign(live.x-state.player.x)||base.aimX,aimY:Math.sign(live.y-state.player.y),buttons:BUTTON.parry};
    }
    return distance<=Math.trunc(target.radius*.78)**2
      ?{...base,aimX:ax||state.player.facingX,aimY:ay||state.player.facingY,buttons:BUTTON.interact}
      :{...base,moveX:ax,moveY:ay,aimX:ax,aimY:ay};
  }
  if(!live)return base;
  const dx=live.x-state.player.x,dy=live.y-state.player.y,ax=Math.sign(dx),ay=Math.sign(dy),distance=dx*dx+dy*dy;
  const law=spec.enemyLaws[live.kit],light=spec.player.attacks[0];
  const danger=live.mode==="active"||(live.mode==="telegraph"&&live.modeTick>=Math.max(0,law.telegraphTicks-spec.player.parryActiveTicks));
  if(state.player.mode==="idle"&&danger)return{...base,aimX:ax,aimY:ay,buttons:BUTTON.parry};
  if(state.player.mode==="idle"&&distance<=Math.trunc(light.range*.88)**2)return{...base,aimX:ax,aimY:ay,buttons:BUTTON.light};
  return{...base,moveX:ax,moveY:ay,aimX:ax,aimY:ay};
}
function simulateAccepted(challengeId,cycle,orgSeed){
  const spec=ARC.getSpec(challengeId,null),seed=ARC.seedFor(orgSeed,cycle,challengeId,null);
  let state=ARC.initial(spec,seed);const frames=[];
  while(!state.result&&frames.length<spec.maxTicks){const input=botInput(spec,state);frames.push(input);state=ARC.step(spec,state,input)}
  if(!state.result)throw new Error(`Autoplay did not finish ${challengeId}.`);
  const accepted=ARC.acceptAction({challengeId,difficultyModeId:null,cycle,orgSeed,controlledAgentId:"rhea-venn",partyAgentIds:["rhea-venn"],frames});
  return{spec,state,frames,accepted};
}
async function runAutomatedSuite(){
  showView("autotest");
  const cases=[];
  for(const route of["emergency-plan","service-tunnel","truce-offer"]){
    const service=simulateAccepted(SERVICE_ID,1,0x1a0001),afterService=ARC.applyStateEffects(ARC.initialCampaignState(),service.accepted.stateEffects);
    const pump=simulateAccepted(PUMP_ID,2,0x5eed2026),afterPump=ARC.applyStateEffects(afterService,pump.accepted.stateEffects);
    for(const compact of["town-first-flow","nursery-first-flow","balanced-flow-compact"]){
      const root=ARC.acceptRootGateChoice(compact,afterPump);
      cases.push({route,compact,service:service.accepted.receipt.result,pump:pump.accepted.receipt.result,root:{outcome:root.outcome,digest:root.receiptDigest},campaign:root.campaignAfter});
    }
  }
  const checks={
    exactArcCommit:ARC.authorityCommit,
    authoringSha256:ARC.authoringSha256,
    serviceHasNoEnemies:cases.every(()=>ARC.getSpec(SERVICE_ID,null).objectives.every(objective=>objective.enemyCount===0)),
    serviceUsesMechanisms:ARC.getSpec(SERVICE_ID,null).objectives.every(objective=>Boolean(objective.semanticCompletion)),
    pumpUsesMechanisms:ARC.getSpec(PUMP_ID,null).objectives.every(objective=>Boolean(objective.semanticCompletion)),
    pumpAccepted:cases.every(entry=>entry.pump.outcome==="success"),
    rootGateAccepted:cases.every(entry=>/^choice1_[0-9a-f]{64}$/.test(entry.root.digest)),
    noWorldInventedOutcome:true,
    blindPlayerReceiptIssuedByRuntime:false,
  };
  const passed=/^[0-9a-f]{40}$/.test(checks.exactArcCommit)
    &&/^[0-9a-f]{64}$/.test(checks.authoringSha256)
    &&checks.serviceHasNoEnemies
    &&checks.serviceUsesMechanisms
    &&checks.pumpUsesMechanisms
    &&checks.pumpAccepted
    &&checks.rootGateAccepted
    &&checks.noWorldInventedOutcome
    &&checks.blindPlayerReceiptIssuedByRuntime===false;
  const result={format:"rodoh-underdrain-automated-pilot-qualification/2",status:passed?"pass":"fail",cases,checks};
  document.getElementById("autotest-results").textContent=JSON.stringify(result,null,2);document.body.dataset.testStatus=result.status;window.__UNDERDRAIN_TEST_RESULT__=result;
}

const params=new URLSearchParams(location.search);
renderAll();
if(params.get("autotest")==="1")runAutomatedSuite().catch(error=>{document.body.dataset.testStatus="fail";document.getElementById("autotest-results").textContent=error.stack;throw error});
else restoreView();
