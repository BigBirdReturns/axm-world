"use strict";

const ARC=globalThis.UnderdrainArc;
const AUTHORING=JSON.parse(document.getElementById("underdrain-authoring").textContent);
const TICK_RATE=30, W=960, H=540;
const STORAGE_KEY="underdrain.continuous-pilot.v2";
const BUTTON=Object.freeze({light:1,heavy:2,dodge:4,parry:8,interact:16});
const SERVICE_ID="mrs-kett-service-call";
const PUMP_ID="breach-crown-pump";
const ROOT_ID="root-gate-parley";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d",{alpha:false});
const views=[...document.querySelectorAll(".view")];
const heldMove=new Set(),touchMove=new Set();
let workHeld=false,touchWork=false,latchedButtons=0,loopHandle=0,lastTime=0,accumulator=0;

function fatal(message){
  document.querySelector("main").innerHTML=`<div class="fatal"><strong>The exact Arc capsule did not load.</strong><p>${escapeHtml(message)}</p></div>`;
  throw new Error(message);
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function clone(value){return structuredClone(value)}
function nowIso(){return new Date().toISOString()}
function elapsedMs(){return Math.max(0,Date.now()-Date.parse(session.startedAt))}
function showView(id){
  views.forEach(view=>view.classList.toggle("active",view.id===id));
  session.view=id;
  saveSession();
  scrollTo({top:0,behavior:"auto"});
}
function experience(id){return AUTHORING.authoredExperiences.experiences[id]}
function challengeOutcome(challengeId,outcome){return ARC.challengeOutcome(challengeId,outcome)}
function objectiveBinding(experienceId,objectiveId){return experience(experienceId)?.objectiveBindings?.[objectiveId]??null}
function eventId(kind){return `ev-${String(session.structural.events.length+1).padStart(3,"0")}-${kind}`}
function emit(kind,description,extra={}){
  const event={id:eventId(kind),atMs:elapsedMs(),kind,description,...extra};
  const last=session.structural.events.at(-1);
  if(last&&event.atMs<last.atMs)event.atMs=last.atMs;
  session.structural.events.push(event);
  return event;
}
function emitOnce(key,kind,description,extra={}){
  if(session.structural.once[key])return session.structural.events.find(event=>event.id===session.structural.once[key])??null;
  const event=emit(kind,description,extra);session.structural.once[key]=event.id;return event;
}
function story(speaker,text,kind="normal"){
  session.story.push({speaker,text,kind,atMs:elapsedMs()});
  renderStory();
}
function initialSession(){
  const campaign=ARC.initialCampaignState();
  return {
    format:"rodoh-underdrain-session/2",
    arcCommit:ARC.authorityCommit,
    worldSourceCommit:ARC.worldSourceCommit,
    cartridgeDigest:ARC.cartridgeDigest,
    authoringSha256:ARC.authoringSha256,
    startedAt:nowIso(),completedAt:null,view:"cold",stage:"cold",route:null,
    campaign,acceptedActions:[],compactReceipt:null,current:null,story:[],
    retries:0,knockdowns:0,wrongTurns:0,
    structural:{events:[],once:{},objectives:{},recoveries:[],routeDeltaEventIds:[]},
  };
}
function validSaved(value){
  return value&&value.format==="rodoh-underdrain-session/2"
    &&value.arcCommit===ARC.authorityCommit
    &&value.cartridgeDigest===ARC.cartridgeDigest
    &&value.authoringSha256===ARC.authoringSha256;
}
function loadSession(){
  try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(validSaved(parsed))return parsed}catch{}
  return initialSession();
}
let session;
if(!ARC||ARC.placeholder)fatal("The standalone still contains its unqualified placeholder instead of exact Arc replay law.");
if(AUTHORING.format!=="rodoh-underdrain-standalone/2")fatal("The embedded authoring manifest is not the continuous v2 authority.");
session=loadSession();

function saveSession(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(session))}catch(error){console.warn("UNDERDRAIN save failed",error)}
}
function resetSession(){
  stopLoop();localStorage.removeItem(STORAGE_KEY);session=initialSession();initializeColdEvidence();renderAll();showView("cold");
}
function initializeColdEvidence(){
  emitOnce("identity","identity-visible","You are Rhea Venn, a licensed plumber answering an ordinary service call.");
  emitOnce("goal","goal-visible","Restore Mrs. Kett's water by diagnosing the living trap joint.");
  emitOnce("stakes","stakes-visible","Bellwether is preparing to turn the living blockage into a military emergency.");
  emitOnce("first-prompt","action-prompt","Answer the service call and inspect the living trap joint.");
}
initializeColdEvidence();

function movementAxis(){
  const keys=new Set([...heldMove,...touchMove]);
  return {
    moveX:keys.has("right")?1:keys.has("left")?-1:0,
    moveY:keys.has("down")?1:keys.has("up")?-1:0,
  };
}
function sampleInput(){
  const movement=movementAxis();
  const facing=session.current?.state?.player??{facingX:1,facingY:0};
  const buttons=latchedButtons|((workHeld||touchWork)?BUTTON.interact:0);
  latchedButtons=0;
  return {
    moveX:movement.moveX,moveY:movement.moveY,
    aimX:movement.moveX||facing.facingX||1,aimY:movement.moveY||facing.facingY||0,
    buttons,
  };
}
function keyAction(event,down){
  const key=event.key;
  const move={ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down",ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right"}[key];
  if(move){down?heldMove.add(move):heldMove.delete(move);event.preventDefault();return}
  if(key==="e"||key==="E"||key==="f"||key==="F"){workHeld=down;event.preventDefault();return}
  if(!down||event.repeat)return;
  if(key==="j"||key==="J"||key===" ")latchedButtons|=BUTTON.light;
  else if(key==="k"||key==="K")latchedButtons|=BUTTON.heavy;
  else if(key==="Shift")latchedButtons|=BUTTON.dodge;
  else if(key==="l"||key==="L")latchedButtons|=BUTTON.parry;
  else return;
  event.preventDefault();
}
addEventListener("keydown",event=>keyAction(event,true));
addEventListener("keyup",event=>keyAction(event,false));
document.querySelectorAll("[data-hold]").forEach(button=>{
  const action=button.dataset.hold;
  const start=event=>{
    event.preventDefault();
    if(["up","down","left","right"].includes(action))touchMove.add(action);
    else if(action==="work")touchWork=true;
    else if(action==="wrench")latchedButtons|=BUTTON.light;
    else if(action==="dodge")latchedButtons|=BUTTON.dodge;
  };
  const stop=event=>{
    event.preventDefault();
    if(["up","down","left","right"].includes(action))touchMove.delete(action);
    else if(action==="work")touchWork=false;
  };
  button.addEventListener("pointerdown",start);
  button.addEventListener("pointerup",stop);
  button.addEventListener("pointercancel",stop);
  button.addEventListener("pointerleave",stop);
});
canvas.addEventListener("pointerdown",()=>{latchedButtons|=BUTTON.light});

function beginEncounter(challengeId,experienceId,placeLabel,cycle,orgSeed){
  stopLoop();
  const spec=ARC.getSpec(challengeId,null);
  const seed=ARC.seedFor(orgSeed,cycle,challengeId,null);
  const state=ARC.initial(spec,seed);
  session.current={
    challengeId,experienceId,placeLabel,cycle,orgSeed,spec,seed,state,frames:[],
    checkpoint:{state:clone(state),frameLength:0,objectiveIndex:0},
    startedAt:nowIso(),route:session.route,reveals:[],accepted:false,
  };
  session.stage=challengeId===SERVICE_ID?"service-action":"pump-action";
  story(challengeId===SERVICE_ID?"RHEA":"RHEA",challengeId===SERVICE_ID
    ?"One living joint. One clean bypass. No reason for anyone to draw a weapon."
    :"The water is the job. The fungus is pressure around the job. Keep those separate.");
  fireObjectiveStartReveals(0);
  renderAction();showView("action");saveSession();startLoop();
}
function stopLoop(){if(loopHandle)cancelAnimationFrame(loopHandle);loopHandle=0;lastTime=0;accumulator=0}
function startLoop(){
  stopLoop();
  const frame=time=>{
    if(!lastTime)lastTime=time;
    accumulator+=Math.min(.1,(time-lastTime)/1000);lastTime=time;
    while(accumulator>=1/TICK_RATE&&session.current&&!session.current.state.result){stepCurrent();accumulator-=1/TICK_RATE}
    renderAction();
    if(session.current&&!session.current.state.result)loopHandle=requestAnimationFrame(frame);
  };
  loopHandle=requestAnimationFrame(frame);
}
function completedBefore(state){return [...state.completedObjectiveIds].sort()}
function stepCurrent(){
  const run=session.current;if(!run||run.state.result)return;
  const input=sampleInput();run.frames.push(input);
  const previousIndex=run.state.activeObjectiveIndex;
  run.state=ARC.step(run.spec,run.state,input);
  handleActionEvents(run.state.events??[],previousIndex,run.state.activeObjectiveIndex);
  if(run.state.activeObjectiveIndex!==previousIndex&&!run.state.result){
    run.checkpoint={state:clone(run.state),frameLength:run.frames.length,objectiveIndex:run.state.activeObjectiveIndex};
    fireObjectiveStartReveals(run.state.activeObjectiveIndex);
  }
  if(run.state.tick%15===0)saveSession();
  if(run.state.result){
    stopLoop();
    if(run.state.result.outcome==="failure")presentRecovery();
    else acceptCurrentAction();
  }
}
function handleActionEvents(events,previousIndex,currentIndex){
  const run=session.current;if(!run)return;
  for(const event of events){
    if(event.type==="objective_progress"&&event.progress===event.target){
      const binding=objectiveBinding(run.experienceId,event.objectiveId);
      if(binding&&!session.structural.objectives[event.objectiveId]){
        session.structural.objectives[event.objectiveId]={
          id:event.objectiveId,authoredVerb:binding.playerFacingLabel,
          mechanicPerformed:binding.completion.kind,
          observableStateChange:binding.storyPaymentId,
        };
        emit("objective-interaction",binding.playerFacingLabel,{
          objectiveId:event.objectiveId,
          interactionKinds:[binding.verb,event.type==="objective_progress"?"mechanism":"combat"],
        });
      }
    }
    if(event.type==="objective_completed"){
      fireObjectiveCompleteReveals(event.objectiveId);
      const binding=objectiveBinding(run.experienceId,event.objectiveId);
      story("RHEA",binding?`${binding.playerFacingLabel}: complete.`:`Objective ${event.objectiveId} complete.`,"reveal");
    }
  }
  if(currentIndex!==previousIndex)renderAction();
}
function fireObjectiveStartReveals(index){
  const run=session.current;if(!run)return;
  const objective=run.spec.objectives[index];if(!objective)return;
  for(const reveal of experience(run.experienceId).reveals.filter(entry=>entry.objectiveId===objective.id&&entry.trigger==="objective_started"))fireReveal(reveal);
}
function fireObjectiveCompleteReveals(objectiveId){
  const run=session.current;if(!run)return;
  for(const reveal of experience(run.experienceId).reveals.filter(entry=>entry.objectiveId===objectiveId&&entry.trigger==="objective_completed"))fireReveal(reveal);
}
function fireReveal(reveal){
  const run=session.current;if(!run||run.reveals.includes(reveal.id))return;
  run.reveals.push(reveal.id);
  const copy={
    "living-pressure-route":"TESS: The tissue is opening and closing with the pressure. It is a valve, not a clog.",
    "townwide-pressure-pattern":"RHEA: Mrs. Kett's tap is back, and the pulse continues toward Pump Seven.",
    "nursery-defense":"TESS: These valves are shielding a nursery branch. The Caplings are defending it, not blocking us at random.",
    "municipal-discharge-cause":"MORROWCAP: Your purge wheel sends Bellwether's antifungal discharge directly through our nursery.",
    "crown-signal":"MORROWCAP: The Crown Sluice is open. They are asking who controls the water after tonight.",
  }[reveal.id]??`${reveal.actorId}: ${reveal.factId}`;
  story(reveal.actorId.toUpperCase(),copy.replace(/^[^:]+:\s*/,""),"reveal");
  emit("critical-reveal",copy,{objectiveId:reveal.objectiveId,revealId:reveal.id});
}
function presentRecovery(){
  session.knockdowns+=1;
  const failure=emit("failure",`${session.current.placeLabel} ended in a deterministic failure.`);
  session.current.failureEventId=failure.id;
  document.getElementById("accept-failure").hidden=session.current.challengeId===SERVICE_ID;
  document.getElementById("recovery-panel").hidden=false;
  saveSession();
}
function retryCurrentObjective(){
  const run=session.current;if(!run)return;
  const before=completedBefore(run.state);
  const failureEventId=run.failureEventId;
  run.frames=run.frames.slice(0,run.checkpoint.frameLength);
  run.state=clone(run.checkpoint.state);run.failureEventId=null;
  document.getElementById("recovery-panel").hidden=true;
  session.retries+=1;
  const restored=emit("control-restored","The current mechanism resumes without replaying completed exposition.");
  session.structural.recoveries.push({
    failureEventId,controlRestoredEventId:restored.id,
    completedObjectiveIdsBefore:before,
    completedObjectiveIdsAfter:completedBefore(run.state),
    expositionReplayed:false,
  });
  saveSession();startLoop();
}
function acceptCurrentAction(){
  const run=session.current;if(!run||run.accepted)return;
  if(run.state.result?.outcome==="failure"&&!run.failureEventId){
    run.failureEventId=emit("failure",`${run.placeLabel} ended in a deterministic failure.`).id;
  }
  run.accepted=true;
  const accepted=ARC.acceptAction({
    challengeId:run.challengeId,difficultyModeId:null,cycle:run.cycle,orgSeed:run.orgSeed,
    controlledAgentId:"rhea-venn",partyAgentIds:["rhea-venn"],frames:run.frames,
  });
  const before=clone(session.campaign);
  session.campaign=ARC.applyStateEffects(session.campaign,accepted.stateEffects);
  const record={...accepted,experienceId:run.experienceId,route:run.route,campaignBefore:before,campaignAfter:clone(session.campaign)};
  session.acceptedActions.push(record);
  session.current=null;
  document.getElementById("recovery-panel").hidden=true;

  if(run.challengeId===SERVICE_ID){
    emitOnce("meaningful-success","meaningful-success","Mrs. Kett's household water runs after Rhea operates the clean bypass.");
    story("MRS. KETT","The tap runs. Whatever is under the town just answered the pressure change.","reveal");
    session.stage="draft";renderDraft();showView("draft");saveSession();return;
  }

  emit("result",`Arc replay produced ${accepted.receipt.result.outcome} for Pump Seven.`);
  const acceptedEvent=emit("accepted-consequence",`Arc replay accepted ${accepted.receipt.receiptDigest}.`);
  session.structural.acceptedEventId=acceptedEvent.id;
  emit("world-change","Bellwether's water, evidence, and Root Gate access changed only after Arc acceptance.");
  emit("relationship-change","Rhea's standing with the Crown changed through the accepted Pump Seven consequence.");
  emit("successor-playable","Parley at the Root Gate became enterable.");
  session.stage="consequence";session.completedAt=nowIso();renderConsequence(record);showView("consequence");saveSession();
}

function chooseRoute(route){
  session.route=route;
  document.querySelectorAll("[data-route]").forEach(button=>{
    const selected=button.dataset.route===route;
    button.setAttribute("aria-checked",String(selected));button.setAttribute("aria-pressed",String(selected));
  });
  document.getElementById("start-pump").disabled=false;
  const descriptions={
    "emergency-plan":"Marta's command channel and municipal override markings are now visible.",
    "service-tunnel":"The household pressure map exposes mechanism positions before Rhea reaches them.",
    "truce-offer":"Morrowcap's channel translates fungal signals before the city labels them hostile.",
  };
  const event=emit("choice-delta",descriptions[route],{choiceId:route});
  session.structural.routeDeltaEventIds=[event.id];
  saveSession();
}

function acceptRootGate(choiceId){
  if(session.compactReceipt)return;
  const receipt=ARC.acceptRootGateChoice(choiceId,session.campaign);
  session.compactReceipt=receipt;session.campaign=clone(receipt.campaignAfter);session.stage="record";session.completedAt=nowIso();
  renderCompact(receipt);saveSession();
}

function buildStructuralEvidence(){
  const pump=session.acceptedActions.find(entry=>entry.receipt.challengeId===PUMP_ID);
  return {
    format:"rodoh-one-am-structural-evidence/1",
    candidate:{
      repository:"BigBirdReturns/axm-world",commit:ARC.worldSourceCommit,
      authoredIdentity:session.cartridgeDigest,experienceId:"underdrain-continuous-pilot-v2",
    },
    contractId:"underdrain-continuous-pilot-v2",
    startedAt:session.startedAt,completedAt:session.completedAt??nowIso(),
    authority:{
      owner:"Arc",acceptedResultFormat:pump?.receipt.format??null,
      acceptedResultId:pump?.receipt.receiptDigest??null,
      campaignEffectCommitted:Boolean(pump),
    },
    events:clone(session.structural.events),
    objectives:Object.values(session.structural.objectives),
    route:{choiceId:session.route,runtimeDeltaEventIds:clone(session.structural.routeDeltaEventIds)},
    continuation:{persistentStateChanged:Boolean(pump),playableSuccessorId:pump?"root-gate-parley":null},
    recoveries:clone(session.structural.recoveries),
  };
}

function episodeRecord(){
  return {
    format:"rodoh-underdrain-episode-record/2",status:session.compactReceipt?"complete":"in-progress",
    worldSourceCommit:ARC.worldSourceCommit,arcAuthority:{commit:ARC.authorityCommit,cartridgeDigest:ARC.cartridgeDigest,authoringSha256:ARC.authoringSha256},
    route:session.route,campaign:clone(session.campaign),acceptedActions:clone(session.acceptedActions),compactReceipt:clone(session.compactReceipt),
    structuralEvidence:buildStructuralEvidence(),
    blindPlayerReceipt:{status:"not-issued-by-runtime",required:true},
  };
}

function restoreView(){
  const valid=new Set(["cold","action","draft","consequence","root","record"]);
  const target=valid.has(session.view)?session.view:"cold";
  if(target==="action"&&session.current){renderAction();showView("action");startLoop();return}
  showView(target);
}
