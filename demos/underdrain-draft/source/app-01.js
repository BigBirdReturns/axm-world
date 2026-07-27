
"use strict";
const AUTHORING=JSON.parse(document.getElementById("underdrain-authoring").textContent);
const TICK_RATE=30, W=960, H=540;
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d",{alpha:false});
const views=[...document.querySelectorAll(".view")];
let selectedStrategy="emergency-plan", runtime=null, loopHandle=0, lastTime=0, accumulator=0, latestReceipt=null;
const held=new Set(), touchHeld=new Set();
const strategyMods={
  "emergency-plan":{hp:140,speed:5.1,flush:1.0,spawn:1.0,hose:1.0,label:"Emergency plan"},
  "service-tunnel":{hp:125,speed:6.1,flush:1.22,spawn:1.10,hose:1.0,label:"Service tunnel"},
  "truce-offer":{hp:105,speed:5.2,flush:1.0,spawn:.78,hose:1.45,label:"Truce offer"}
};
const radioLines=[
  [90,"SUMP: Municipal Emergency Form 8-B confirms you are now a combat plumber."],
  [260,"DAX: Great news. The drain caps are biodegradable. That means ethical."],
  [500,"TESS: I invited the fungus kingdom to the union meeting. They brought twelve delegates."],
  [760,"MORROWCAP: Your housemate's caps are nutritious. This is not praise."],
  [1050,"RHEA: I am adding 'do not feed the sewer monarchy' to the warranty."]
];

function showView(id){
  views.forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.view===id?"page":"false"));
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll("[data-view-jump]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.viewJump)));
document.querySelectorAll(".strategy").forEach(b=>b.addEventListener("click",()=>{
  selectedStrategy=b.dataset.strategy;
  document.querySelectorAll(".strategy").forEach(x=>{const on=x===b;x.classList.toggle("selected",on);x.setAttribute("aria-checked",String(on));});
}));
document.getElementById("start-game").addEventListener("click",()=>startInteractive(selectedStrategy,seedFromQuery()));
document.getElementById("abort-run").addEventListener("click",()=>{stopLoop();showView("briefing")});
document.getElementById("replay").addEventListener("click",()=>{showView("briefing")});
document.getElementById("download-receipt").addEventListener("click",()=>{
  if(!latestReceipt)return;
  const blob=new Blob([JSON.stringify(latestReceipt,null,2)+"\n"],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="underdrain-provisional-receipt.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
addEventListener("keydown",e=>{
  const map={ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down",ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right"," ":"attack",e:"burst",E:"burst",Shift:"dodge",f:"interact",F:"interact"};
  if(map[e.key]){held.add(map[e.key]);e.preventDefault()}
});
addEventListener("keyup",e=>{
  const map={ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down",ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right"," ":"attack",e:"burst",E:"burst",Shift:"dodge",f:"interact",F:"interact"};
  if(map[e.key])held.delete(map[e.key]);
});
document.querySelectorAll("[data-hold]").forEach(b=>{
  const k=b.dataset.hold;
  const on=e=>{touchHeld.add(k);e.preventDefault()},off=e=>{touchHeld.delete(k);e.preventDefault()};
  b.addEventListener("pointerdown",on);b.addEventListener("pointerup",off);b.addEventListener("pointercancel",off);b.addEventListener("pointerleave",off);
});
canvas.addEventListener("pointerdown",()=>held.add("attack"));canvas.addEventListener("pointerup",()=>held.delete("attack"));

function seedFromQuery(){
  const n=Number(new URLSearchParams(location.search).get("seed"));
  return Number.isSafeInteger(n)&&n>0?n:20260727;
}
function rng32(seed){let x=seed>>>0||0x9e3779b9;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist2(a,b){const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy}
function norm(dx,dy){const d=Math.hypot(dx,dy)||1;return{x:dx/d,y:dy/d}}
function canonical(v){
  if(Array.isArray(v))return v.map(canonical);
  if(v&&typeof v==="object")return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
  return v;
}
async function sha256(text){
  if(globalThis.crypto?.subtle){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
  let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,"0").repeat(8);
}
function makeEnemy(kind,x,y,id){
  const law={sprout:[34,1.8,5,16],spitter:[46,1.25,6,19],brute:[92,.95,11,21],capmold:[55,1.4,7,18],boss:[360,1.05,14,34]}[kind];
  return {id,kind,x,y,r:law[3],hp:law[0],maxHp:law[0],speed:law[1],damage:law[2],cool:0,flash:0,dead:false};
}
function makeRuntime(strategy,seed){
  const mod=strategyMods[strategy],rand=rng32(seed);
  const nodes=[{x:175,y:145,p:0,done:false},{x:480,y:405,p:0,done:false},{x:795,y:145,p:0,done:false}];
  const crew=[{x:125,y:420,hp:100},{x:835,y:420,hp:100}];
  const s={strategy,seed,rand,mod,tick:0,maxTicks:90*TICK_RATE,stage:"valves",player:{x:480,y:270,r:16,hp:mod.hp,maxHp:mod.hp,attack:0,burst:0,dodge:0,invuln:0,facing:{x:1,y:0}},nodes,crew,enemies:[],boss:null,spawnClock:0,
    stats:{kills:0,damageTaken:0,wrenchHits:0,hoseHits:0,dodges:0,valves:0},trace:[],lastMask:-1,lastInput:null,logIndex:0,outcome:null,ended:false};
  let i=0;for(const n of nodes){for(let j=0;j<2;j++){const a=rand()*Math.PI*2;s.enemies.push(makeEnemy("sprout",n.x+Math.cos(a)*75,n.y+Math.sin(a)*75,`s${i++}`))}}
  logMessage("SUMP: Descend, flush three valves, and do not recognize any sovereign entity without a form.");
  return s;
}
function logMessage(text,cls=""){
  const log=document.getElementById("mission-log");if(!log)return;
  const p=document.createElement("p");p.textContent=text;if(cls)p.className=cls;log.prepend(p);
  while(log.children.length>12)log.removeChild(log.lastChild);
}
function inputMask(inp){return (inp.up?1:0)|(inp.down?2:0)|(inp.left?4:0)|(inp.right?8:0)|(inp.attack?16:0)|(inp.burst?32:0)|(inp.dodge?64:0)|(inp.interact?128:0)}
function recordInput(s,inp){
  const mask=inputMask(inp);
  if(s.lastMask===mask&&s.trace.length)s.trace[s.trace.length-1].ticks++;
  else{s.trace.push({ticks:1,mask});s.lastMask=mask}
}
function humanInput(){
  const a=new Set([...held,...touchHeld]);
  return {up:a.has("up"),down:a.has("down"),left:a.has("left"),right:a.has("right"),attack:a.has("attack"),burst:a.has("burst"),dodge:a.has("dodge"),interact:a.has("interact")};
}
function botInput(s,skill=1){
  const p=s.player,live=s.enemies.filter(e=>!e.dead);
  let target=null;
  if(s.stage==="valves"){
    target=s.nodes.filter(n=>!n.done).sort((a,b)=>dist2(p,a)-dist2(p,b))[0]||null;
  }else if(s.boss&&!s.boss.dead)target=s.boss;
  const close=live.filter(e=>dist2(p,e)<80*80).sort((a,b)=>dist2(p,a)-dist2(p,b))[0];
  if(close&&close.kind!=="boss")target=close;
  let dx=0,dy=0,interact=false,attack=false,burst=false,dodge=false;
  if(target){
    const d=norm(target.x-p.x,target.y-p.y);p.facing=d;
    const ds=dist2(p,target);
    if(target.p!==undefined&&ds<44*44){interact=true}
    else if(ds>42*42){dx=d.x;dy=d.y}
    if(close&&dist2(p,close)<58*58)attack=true;
    const nearby=live.filter(e=>dist2(p,e)<130*130).length;
    if(nearby>=3||close?.kind==="boss")burst=true;
    if(close&&close.cool<=3&&s.player.dodge<=0&&skill>.65)dodge=true;
  }
  return {up:dy<-.25,down:dy>.25,left:dx<-.25,right:dx>.25,attack,burst,dodge,interact};
}
function spawnWave(s){
  if(s.stage==="boss")return;
  const count=Math.max(1,Math.round(2*s.mod.spawn));
  for(let i=0;i<count;i++){
    const edge=Math.floor(s.rand()*4),x=edge<2?(edge?W-30:30):30+s.rand()*(W-60),y=edge>=2?(edge===3?H-30:30):30+s.rand()*(H-60);
    const r=s.rand();const kind=r>.82?"brute":r>.57?"spitter":"sprout";
    s.enemies.push(makeEnemy(kind,x,y,`w${s.tick}_${i}`));
  }
}
function beginBoss(s){
  s.stage="boss";
  const extra=s.strategy==="service-tunnel"?60:s.strategy==="truce-offer"?-45:40;
  const boss=makeEnemy("boss",480,105,"crown-matron");boss.hp+=extra;boss.maxHp+=extra;s.boss=boss;s.enemies.push(boss);
  for(let i=0;i<(s.strategy==="service-tunnel"?5:3);i++)s.enemies.push(makeEnemy("capmold",360+i*60,150+(i%2)*45,`cap${i}`));
  logMessage("DAX: Update: the caps are not failing. They are being enthusiastically metabolized.","radio");
  logMessage("CROWN MATRON: YOUR MERCHANDISE HAS MADE US STRONG.","radio");
}
function hitEnemy(s,e,damage,push=0){
  if(e.dead)return;e.hp-=damage;e.flash=4;
  if(push){const d=norm(e.x-s.player.x,e.y-s.player.y);e.x+=d.x*push;e.y+=d.y*push}
  if(e.hp<=0){e.dead=true;s.stats.kills++;if(e.kind==="boss"){s.stage="complete";s.ended=true;s.outcome="success"}}
}
function step(s,inp){
  if(s.ended)return;
  s.tick++;recordInput(s,inp);
  while(s.logIndex<radioLines.length&&s.tick>=radioLines[s.logIndex][0]){logMessage(radioLines[s.logIndex][1],"radio");s.logIndex++}
  const p=s.player;
  if(p.attack>0)p.attack--;if(p.burst>0)p.burst--;if(p.dodge>0)p.dodge--;if(p.invuln>0)p.invuln--;
  let dx=(inp.right?1:0)-(inp.left?1:0),dy=(inp.down?1:0)-(inp.up?1:0);
  if(dx||dy){const d=norm(dx,dy);p.facing=d;let speed=s.mod.speed;if(inp.dodge&&p.dodge<=0){p.dodge=50;p.invuln=9;speed*=3;s.stats.dodges++}p.x=clamp(p.x+d.x*speed,20,W-20);p.y=clamp(p.y+d.y*speed,40,H-20)}
  if(inp.attack&&p.attack<=0){p.attack=11;for(const e of s.enemies){if(!e.dead&&dist2(p,e)<60*60){const d=norm(e.x-p.x,e.y-p.y);if(d.x*p.facing.x+d.y*p.facing.y>-.15){hitEnemy(s,e,28,10);s.stats.wrenchHits++}}}}
  if(inp.burst&&p.burst<=0){p.burst=42;for(const e of s.enemies){if(!e.dead&&dist2(p,e)<145*145){hitEnemy(s,e,Math.round(11*s.mod.hose),22);s.stats.hoseHits++}}}
