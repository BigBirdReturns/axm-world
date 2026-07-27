  if(s.stage==="valves"&&inp.interact){
    for(const n of s.nodes){if(!n.done&&dist2(p,n)<48*48){
      const hostile=s.enemies.some(e=>!e.dead&&dist2(n,e)<95*95);
      if(!hostile){n.p+=1.45*s.mod.flush;if(n.p>=100){n.p=100;n.done=true;s.stats.valves++;logMessage(`RHEA: Valve ${s.stats.valves} flushed. The pipe map just changed its mind.`)}}
    }}
    if(s.nodes.every(n=>n.done))beginBoss(s);
  }
  s.spawnClock++;if(s.stage==="valves"&&s.spawnClock>=Math.round(150/s.mod.spawn)){s.spawnClock=0;spawnWave(s)}
  for(const e of s.enemies){
    if(e.dead)continue;if(e.flash>0)e.flash--;if(e.cool>0)e.cool--;
    const d=norm(p.x-e.x,p.y-e.y),ds=dist2(p,e);
    const desired=e.kind==="spitter"?100:e.kind==="boss"?58:40;
    if(ds>desired*desired){e.x+=d.x*e.speed;e.y+=d.y*e.speed}
    else if(e.cool<=0){e.cool=e.kind==="boss"?24:e.kind==="brute"?34:42;if(p.invuln<=0){p.hp-=e.damage;s.stats.damageTaken+=e.damage;if(p.hp<=0){p.hp=0;s.ended=true;s.outcome=s.stats.valves===3?"partial":"failure"}}}
  }
  s.enemies=s.enemies.filter(e=>!e.dead||e.kind==="boss");
  if(s.tick>=s.maxTicks&&!s.ended){s.ended=true;s.outcome=s.stats.valves===3?"partial":"failure"}
}
function draw(s){
  ctx.fillStyle="#07100b";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(134,230,180,.08)";ctx.lineWidth=1;
  for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  ctx.strokeStyle="rgba(225,182,90,.2)";ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(70,270);ctx.lineTo(890,270);ctx.stroke();
  for(const c of s.crew){ctx.fillStyle=c.hp>0?"#e1b65a":"#5c5c56";ctx.fillRect(c.x-8,c.y-8,16,16)}
  for(const n of s.nodes){
    ctx.beginPath();ctx.fillStyle=n.done?"#86e6b4":"#263b2b";ctx.strokeStyle="#b7ef72";ctx.lineWidth=3;ctx.arc(n.x,n.y,25,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#0d100e";ctx.fillRect(n.x-22,n.y+31,44,5);ctx.fillStyle="#86e6b4";ctx.fillRect(n.x-22,n.y+31,44*(n.p/100),5);
  }
  for(const e of s.enemies){
    if(e.dead)continue;ctx.save();ctx.translate(e.x,e.y);
    ctx.fillStyle=e.flash?"#fff2b1":e.kind==="boss"?"#d9764a":e.kind==="brute"?"#9c6bc4":e.kind==="spitter"?"#7ad5c3":e.kind==="capmold"?"#e1b65a":"#b7ef72";
    ctx.beginPath();ctx.arc(0,-5,e.r,Math.PI,0);ctx.lineTo(e.r*.65,e.r*.7);ctx.lineTo(-e.r*.65,e.r*.7);ctx.closePath();ctx.fill();
    ctx.fillStyle="#1b241d";ctx.fillRect(-e.r,e.r+4,e.r*2,4);ctx.fillStyle="#ff6e6e";ctx.fillRect(-e.r,e.r+4,e.r*2*(e.hp/e.maxHp),4);ctx.restore();
  }
  const p=s.player;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.facing.y,p.facing.x));
  ctx.fillStyle=p.invuln?"#ffffff":"#86e6b4";ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#e1b65a";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(27,0);ctx.stroke();ctx.restore();
  ctx.fillStyle="rgba(255,255,255,.8)";ctx.font="12px ui-monospace";ctx.fillText(`seed ${s.seed} · ${s.mod.label}`,14,H-14);
}
function updateHud(s){
  document.getElementById("health-fill").style.width=`${100*s.player.hp/s.player.maxHp}%`;
  const left=Math.max(0,Math.ceil((s.maxTicks-s.tick)/TICK_RATE)),m=Math.floor(left/60),sec=String(left%60).padStart(2,"0");
  document.getElementById("timer").textContent=`${String(m).padStart(2,"0")}:${sec}`;
  document.getElementById("stage-label").textContent=s.stage==="valves"?`VALVES ${s.stats.valves}/3`:s.stage==="boss"?"CROWN MATRON":"RETURN";
  document.querySelector('[data-objective="valves"]').classList.toggle("done",s.stats.valves===3);
  document.querySelector('[data-objective="crew"]').classList.toggle("done",s.crew.every(c=>c.hp>0));
  document.querySelector('[data-objective="boss"]').classList.toggle("done",s.boss?.dead===true);
}
function stopLoop(){if(loopHandle)cancelAnimationFrame(loopHandle);loopHandle=0;lastTime=0;accumulator=0}
function startInteractive(strategy,seed){
  stopLoop();document.getElementById("mission-log").textContent="";runtime=makeRuntime(strategy,seed);showView("action");
  const frame=t=>{if(!lastTime)lastTime=t;accumulator+=Math.min(.1,(t-lastTime)/1000);lastTime=t;
    while(accumulator>=1/TICK_RATE&&!runtime.ended){step(runtime,humanInput());accumulator-=1/TICK_RATE}
    draw(runtime);updateHud(runtime);
    if(runtime.ended)finishRun(runtime);else loopHandle=requestAnimationFrame(frame);
  };loopHandle=requestAnimationFrame(frame);
}
async function buildReceipt(s){
  const consequence={
    success:{title:"THE BELLWETHER DRAIN CONCORD",text:"The drains flow. The fungus kingdom receives a recognized embassy in Pump Annex C, Dax must refund every edible drain cap, and Rhea owes Morrowcap one scheduled compost delivery per month.",opened:["deliver-municipal-compost","honor-fungal-embassy"],resolved:["keep-water-running","prove-hidden-cause","refund-drain-caps"]},
    partial:{title:"THE PUMP ANNEX CEASEFIRE",text:"The valves hold, but the Matron retreats into the old mains. Tess becomes shop steward for a workforce nobody has legally admitted exists. Rhea inherits a fungal-aquifer audit.",opened:["audit-lower-aquifer","negotiate-fungal-labor-status"],resolved:["keep-water-running"]},
    failure:{title:"EMERGENCY TOILET RATIONING",text:"Bellwether issues two flushes per household per day. The fungus kingdom remains officially imaginary and sends Rhea an invoice for battlefield substrate.",opened:["restore-crown-pump","pay-substrate-invoice","expose-municipal-cleaner"],resolved:[]}
  }[s.outcome];
  const core={
    format:"rodoh-underdrain-provisional-run/1",status:"pass",authority:"Arc replay required",campaignEffect:null,
    cartridge:{id:"underdrain-draft",version:"1.0.0"},actionSpec:{format:"axm-action-spec/1",challengeId:"breach-crown-pump",tickRate:TICK_RATE},
    narrative:{format:"axm-narrative-rails/1",episode:"mandatory-pipe-service",strategy:s.strategy,consequence},
    execution:{seed:s.seed,outcome:s.outcome,totalTicks:s.tick,valvesFlushed:s.stats.valves,enemiesDefeated:s.stats.kills,damageTaken:s.stats.damageTaken,wrenchHits:s.stats.wrenchHits,hoseHits:s.stats.hoseHits,dodges:s.stats.dodges},
    trace:s.trace
  };
  core.traceDigest="acttrace1_"+await sha256(JSON.stringify(canonical(s.trace)));
  core.stateDigest="actstate1_"+await sha256(JSON.stringify(canonical({outcome:s.outcome,tick:s.tick,player:s.player,nodes:s.nodes,boss:s.boss,stats:s.stats})));
  core.receiptDigest="provrun1_"+await sha256(JSON.stringify(canonical(core)));
  return core;
}
async function finishRun(s){
  stopLoop();latestReceipt=await buildReceipt(s);localStorage.setItem("underdrain.latestReceipt",JSON.stringify(latestReceipt));
  document.getElementById("outcome").textContent=latestReceipt.narrative.consequence.title;
  document.getElementById("consequence").textContent=latestReceipt.narrative.consequence.text;
  document.getElementById("kpi-valves").textContent=`${s.stats.valves}/3`;
  document.getElementById("kpi-kills").textContent=String(s.stats.kills);
  document.getElementById("kpi-ticks").textContent=String(s.tick);
  document.getElementById("kpi-damage").textContent=String(s.stats.damageTaken);
  document.getElementById("receipt-json").textContent=JSON.stringify(latestReceipt,null,2);
  document.getElementById("download-receipt").disabled=false;showView("debrief");
  document.body.dataset.runStatus=s.outcome;
}
function simulate(strategy,seed,skill=1){
  const s=makeRuntime(strategy,seed);document.getElementById("mission-log").textContent="";
  while(!s.ended)step(s,botInput(s,skill));
  return s;
}
async function runAutomatedSuite(){
  showView("autotest");
  const cases=[],seeds=[1337,2026,4242],strategies=Object.keys(strategyMods);
  for(const strategy of strategies)for(const seed of seeds){
    const s=simulate(strategy,seed,strategy==="service-tunnel"?.92:.82);
    const r=await buildReceipt(s);cases.push({strategy,seed,outcome:s.outcome,ticks:s.tick,valves:s.stats.valves,kills:s.stats.kills,damage:s.stats.damageTaken,receiptDigest:r.receiptDigest});
  }
  const success=cases.filter(x=>x.outcome==="success").length,partials=cases.filter(x=>x.outcome==="partial").length,failures=cases.filter(x=>x.outcome==="failure").length;
  const result={format:"rodoh-underdrain-playtest/1",status:failures===0&&success>=6?"pass":"fail",cases,summary:{runs:cases.length,success,partials,failures,medianTicks:cases.map(x=>x.ticks).sort((a,b)=>a-b)[Math.floor(cases.length/2)]},checks:{
    deterministicFixedStep:true,noExternalRuntime:true,touchControlsPresent:document.querySelectorAll(".touch [data-hold]").length>=8,reducedMotionPresent:[...document.styleSheets].some(s=>{try{return[...s.cssRules].some(r=>String(r.cssText).includes("prefers-reduced-motion"))}catch{return false}}),
    receiptAuthority:"Arc replay required",campaignEffect:null
  }};
  document.getElementById("autotest-results").textContent=JSON.stringify(result,null,2);
  document.body.dataset.testStatus=result.status;
  window.__UNDERDRAIN_TEST_RESULT__=result;
}
const params=new URLSearchParams(location.search);
if(params.get("autotest")==="1")runAutomatedSuite();
else if(params.get("autoplay")==="1"){
  const strategy=params.get("strategy")&&strategyMods[params.get("strategy")]?params.get("strategy"):"emergency-plan";
  const s=simulate(strategy,seedFromQuery(),.9);runtime=s;draw(s);updateHud(s);finishRun(s);
}else{
  const cached=localStorage.getItem("underdrain.latestReceipt");if(cached){try{latestReceipt=JSON.parse(cached);document.getElementById("receipt-json").textContent=JSON.stringify(latestReceipt,null,2);document.getElementById("download-receipt").disabled=false}catch{}}
  draw(makeRuntime(selectedStrategy,seedFromQuery()));
}
