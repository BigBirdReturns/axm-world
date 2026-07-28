"use strict";

(()=>{
  const art=globalThis.UnderdrainArt;
  const runtime=globalThis.UnderdrainRuntime;
  const production=globalThis.UnderdrainProductionAssets;
  const planNode=document.getElementById("underdrain-presentation");
  const presentationSha256=globalThis.__UNDERDRAIN_PRESENTATION_SHA256__;
  if(!art||!runtime||!planNode||!production)throw new Error("UNDERDRAIN representation custody did not load.");
  const plan=JSON.parse(planNode.textContent);
  if(plan.format!=="rodoh-representation-plan/1")throw new Error("UNDERDRAIN representation plan format is unsupported.");
  if(plan.id!==art.plan.id)throw new Error("UNDERDRAIN representation plan and registry disagree.");
  if(!/^[0-9a-f]{64}$/.test(presentationSha256))throw new Error("UNDERDRAIN representation is not bound to exact bytes.");

  const pumpAsset=production.assets?.["underdrain:scene-pump-seven"]??null;
  if(!pumpAsset||pumpAsset.mediaType!=="image/webp"||pumpAsset.width!==960||pumpAsset.height!==540||!/^[0-9a-f]{64}$/.test(pumpAsset.sha256)){
    throw new Error("UNDERDRAIN Pump Seven production art is absent or unbound.");
  }
  const pumpImage=new Image();
  pumpImage.decoding="async";
  pumpImage.src=pumpAsset.dataUrl;
  pumpImage.addEventListener("load",()=>{
    document.body.dataset.pumpSceneArt="ready";
    if(globalThis.UnderdrainRuntime?.session?.current?.challengeId===PUMP_ID)requestAnimationFrame(renderAction);
  });
  pumpImage.addEventListener("error",()=>{document.body.dataset.pumpSceneArt="failed"});

  const originalShowView=showView;
  showView=function(id){
    document.body.dataset.view=id;
    return originalShowView(id);
  };
  document.body.dataset.view=session.view;

  if(runtime.session.worldSourceCommit!==ARC.worldSourceCommit){
    stopLoop();
    runtime.reset();
  }
  runtime.session.representation={
    format:"rodoh-underdrain-representation/2",
    planId:plan.id,
    presentationSha256,
    namespace:plan.namespace,
    declaredRoleCount:plan.assets.length,
    declaredRoleCountMeaning:"representation identities, not independently authored files",
    productionAssets:[{
      id:"underdrain:scene-pump-seven",
      mediaType:pumpAsset.mediaType,
      width:pumpAsset.width,
      height:pumpAsset.height,
      sha256:pumpAsset.sha256,
    }],
    prototypeSource:"demos/underdrain-draft/assets/underdrain-art.js",
    productionCoverageComplete:false,
    releaseClassification:"representation-rework",
  };
  saveSession();

  function drawPumpScene(run){
    if(pumpImage.complete&&pumpImage.naturalWidth){
      ctx.drawImage(pumpImage,0,0,W,H);
      canvas.dataset.productionAsset="underdrain:scene-pump-seven";
      canvas.dataset.productionAssetSha256=pumpAsset.sha256;
    }else{
      ctx.fillStyle="#08130e";
      ctx.fillRect(0,0,W,H);
    }
    const shade=ctx.createLinearGradient(0,0,0,H);
    shade.addColorStop(0,"rgba(1,7,5,.24)");
    shade.addColorStop(.70,"rgba(1,8,5,.02)");
    shade.addColorStop(1,"rgba(1,5,3,.36)");
    ctx.fillStyle=shade;
    ctx.fillRect(0,0,W,H);
    if(run.route==="emergency-plan"){
      ctx.strokeStyle="rgba(230,189,99,.72)";
      ctx.lineWidth=3;
      ctx.setLineDash([14,8]);
      ctx.strokeRect(42,42,876,438);
      ctx.setLineDash([]);
    }
    if(run.route==="service-tunnel"){
      ctx.strokeStyle="rgba(99,199,216,.72)";
      ctx.lineWidth=4;
      ctx.beginPath();
      ctx.moveTo(40,470);
      ctx.bezierCurveTo(245,380,530,440,900,120);
      ctx.stroke();
    }
    if(run.route==="truce-offer"){
      ctx.fillStyle="rgba(193,240,120,.12)";
      ctx.beginPath();
      ctx.arc(820,115,84,0,Math.PI*2);
      ctx.fill();
    }
    canvas.dataset.presentationAsset="underdrain:scene-pump-seven";
    return "underdrain:scene-pump-seven";
  }

  function pumpMechanismAsset(entry,active,done){
    const base={
      "diagnose-spore-valves":"spore-valve",
      "operate-purge-wheel":"purge-wheel",
      "open-crown-sluice":"crown-sluice",
    }[entry.objective.id]??"spore-valve";
    return `underdrain:mechanism-${base}-${done?"complete":active?"active":"idle"}`;
  }

  function drawPumpMechanism(entry,p,active,done){
    const assetId=pumpMechanismAsset(entry,active,done);
    const radius=Math.max(18,entry.target.radius*p.scale);
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.fillStyle=done?"rgba(140,229,184,.11)":active?"rgba(193,240,120,.075)":"rgba(138,199,217,.035)";
    ctx.strokeStyle=done?"#8ce5b8":active?"#c1f078":"#8ac7d9";
    ctx.lineWidth=active?3:2;
    ctx.setLineDash(active?[9,6]:[5,7]);
    ctx.beginPath();
    ctx.arc(0,0,radius,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if(active){
      ctx.strokeStyle="rgba(246,241,223,.78)";
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(0,0,radius+6,-Math.PI/2,-Math.PI/2+Math.PI*1.35);
      ctx.stroke();
    }
    if(done){
      ctx.strokeStyle="#8ce5b8";
      ctx.lineWidth=4;
      ctx.lineCap="round";
      ctx.beginPath();
      ctx.moveTo(-8,1);
      ctx.lineTo(-1,8);
      ctx.lineTo(11,-8);
      ctx.stroke();
    }
    ctx.restore();
    return assetId;
  }

  function drawRhea(player,p){
    const angle=Math.atan2(player.facingY,player.facingX);
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.fillStyle="rgba(0,0,0,.42)";
    ctx.beginPath();
    ctx.ellipse(0,16,19,8,0,0,Math.PI*2);
    ctx.fill();
    ctx.rotate(angle);
    if(player.mode==="dodge"){
      for(const [offset,alpha] of [[-22,.16],[-12,.28]]){
        ctx.save();
        ctx.translate(offset,0);
        ctx.globalAlpha=alpha;
        ctx.fillStyle="#8ce5b8";
        ctx.beginPath();
        ctx.ellipse(0,0,10,17,0,0,Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.lineCap="round";
    ctx.strokeStyle="#1b2922";
    ctx.lineWidth=7;
    ctx.beginPath();
    ctx.moveTo(-4,9);ctx.lineTo(-7,23);
    ctx.moveTo(4,9);ctx.lineTo(8,23);
    ctx.stroke();
    ctx.strokeStyle="#111713";
    ctx.lineWidth=5;
    ctx.beginPath();
    ctx.moveTo(-11,24);ctx.lineTo(-3,24);
    ctx.moveTo(5,24);ctx.lineTo(13,24);
    ctx.stroke();
    ctx.fillStyle="#315e4a";
    ctx.beginPath();
    ctx.moveTo(-11,-9);ctx.quadraticCurveTo(0,-17,11,-9);ctx.lineTo(9,10);ctx.quadraticCurveTo(0,16,-9,10);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#8ce5b8";
    ctx.lineWidth=2;
    ctx.stroke();
    ctx.strokeStyle="#c89470";
    ctx.lineWidth=6;
    ctx.beginPath();
    ctx.moveTo(-7,-4);ctx.lineTo(-17,4);
    ctx.moveTo(7,-4);ctx.lineTo(16,1);
    ctx.stroke();
    ctx.fillStyle="#c89470";
    ctx.beginPath();ctx.arc(0,-17,7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#27231f";
    ctx.beginPath();ctx.arc(-2,-20,7,Math.PI*.9,Math.PI*2.05);ctx.fill();
    ctx.beginPath();ctx.arc(-8,-21,3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#e6bd63";
    ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(30,-3);ctx.stroke();
    ctx.strokeStyle="#f1d582";
    ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(32,-3,6,-Math.PI*.45,Math.PI*.45);ctx.stroke();
    ctx.restore();
    return "underdrain:body-rhea-venn";
  }

  drawAction=function(run){
    const spec=run.spec,state=run.state;
    const represented=new Set(["underdrain:body-rhea-venn"]);
    if(run.challengeId===PUMP_ID)represented.add(drawPumpScene(run));
    else{
      art.drawScene(ctx,run);
      if(canvas.dataset.presentationAsset)represented.add(canvas.dataset.presentationAsset);
    }
    const showAll=session.route==="service-tunnel"&&run.challengeId===PUMP_ID;
    const completedTargets=new Set(state.completedInteractionTargetIds??[]);
    for(const entry of activeTargets(run,showAll)){
      const p=screenPoint(spec,entry.target.x,entry.target.y);
      const active=entry.objective.id===spec.objectives[state.activeObjectiveIndex]?.id;
      const done=completedTargets.has(entry.target.id)||state.completedObjectiveIds.includes(entry.objective.id);
      represented.add(run.challengeId===PUMP_ID?drawPumpMechanism(entry,p,active,done):art.drawMechanism(ctx,entry,p,active,done));
    }
    for(const enemy of state.enemies){
      if(enemy.mode==="defeated")continue;
      const p=screenPoint(spec,enemy.x,enemy.y),law=spec.enemyLaws[enemy.kit];
      represented.add(art.drawEnemy(ctx,enemy,p,Math.max(10,law.radius*p.scale)));
      ctx.fillStyle="#191d19";ctx.fillRect(p.x-18,p.y+25,36,4);
      ctx.fillStyle="#ff7878";ctx.fillRect(p.x-18,p.y+25,36*(enemy.health/law.maxHealth),4);
    }
    const player=state.player,p=screenPoint(spec,player.x,player.y);
    represented.add(run.challengeId===PUMP_ID?drawRhea(player,p):art.drawPlayer(ctx,player,p));
    canvas.dataset.representationAssets=[...represented].sort().join(" ");
  };

  stateGrid=function(target,state,before=null){
    target.innerHTML=Object.keys(STATE_LABELS).map(id=>{
      const value=state[id],prior=before?.[id],changed=before&&value!==prior;
      const numeric=changed&&typeof value==="number"&&typeof prior==="number";
      const cls=numeric?(value>prior?"delta-up":"delta-down"):changed?"delta-up":"";
      return`<div class="world-cell" data-state-id="${escapeHtml(id)}">${art.stateIconHtml(id)}<span class="world-copy"><b>${escapeHtml(STATE_LABELS[id])}</b><strong class="${cls}">${escapeHtml(prettyValue(value))}</strong>${changed?`<span class="hint">was ${escapeHtml(prettyValue(prior))}</span>`:""}</span></div>`;
    }).join("");
  };

  function mountedAssetIds(){
    const ids=[...document.querySelectorAll("[data-presentation-asset]")]
      .map(node=>node.getAttribute("data-presentation-asset"))
      .filter(Boolean);
    const canvasIds=(canvas.dataset.representationAssets??"").split(/\s+/).filter(Boolean);
    return [...new Set([...ids,...canvasIds])].sort();
  }
  function representativeAssetsMounted(){
    const mounted=new Set(mountedAssetIds());
    return [
      "underdrain:emblem","underdrain:scene-kitchen","underdrain:portrait-rhea-venn",
      "underdrain:portrait-tess-loam","underdrain:portrait-marta-sump","underdrain:portrait-morrowcap",
      "underdrain:portrait-dax-venn","underdrain:route-emergency-plan","underdrain:route-service-tunnel",
      "underdrain:route-truce-offer","underdrain:scene-consequence","underdrain:scene-root-gate","underdrain:record-seal",
    ].every(assetId=>mounted.has(assetId));
  }
  function buildRepresentationEvidence(){
    return {
      format:"rodoh-representation-runtime-evidence/2",
      candidate:{repository:"BigBirdReturns/axm-world",commit:ARC.worldSourceCommit,authoredIdentity:session.cartridgeDigest,experienceId:"underdrain-continuous-pilot-v2"},
      planId:plan.id,
      presentationSha256,
      provenance:structuredClone(plan.provenance),
      renderer:structuredClone(plan.renderer),
      declaredAssetIds:plan.assets.map(asset=>asset.id).sort(),
      declaredAssetCountMeaning:"representation identities, not independently authored files",
      mountedAssetIds:mountedAssetIds(),
      productionAssets:structuredClone(runtime.session.representation.productionAssets),
      productionCoverageComplete:false,
      releaseClassification:"representation-rework",
      surfaces:plan.surfaces.map(surface=>({id:surface.id,desktop:surface.desktop,mobile:surface.mobile,assetIds:[...surface.assetIds].sort(),accessibleEquivalent:surface.accessibleEquivalent})),
    };
  }

  const originalStructuralEvidence=buildStructuralEvidence;
  buildStructuralEvidence=function(){return {...originalStructuralEvidence(),representation:buildRepresentationEvidence()}};
  const originalEpisodeRecord=episodeRecord;
  episodeRecord=function(){return {...originalEpisodeRecord(),representation:buildRepresentationEvidence()}};
  runtime.buildStructuralEvidence=buildStructuralEvidence;
  runtime.buildRepresentationEvidence=buildRepresentationEvidence;
  runtime.episodeRecord=episodeRecord;
  runtime.representation=Object.freeze({plan,presentationSha256,productionAssets:runtime.session.representation.productionAssets,productionCoverageComplete:false});

  const originalRunAutomatedSuite=runAutomatedSuite;
  runAutomatedSuite=async function(){
    await originalRunAutomatedSuite();
    const result=globalThis.__UNDERDRAIN_TEST_RESULT__;
    if(!result)return;
    const representationChecks={
      representationPlanId:plan.id,
      presentationSha256,
      declaredRepresentationRoleCount:plan.assets.length,
      declaredRoleCountIsNotFileCount:true,
      productionAssetCount:1,
      productionPumpSceneBound:pumpAsset.sha256,
      productionCoverageComplete:false,
      releaseClassification:"representation-rework",
      completeSurfacePlan:plan.surfaces.length===6&&plan.surfaces.every(surface=>surface.desktop&&surface.mobile&&surface.assetIds.length>0),
      representativePrototypeRolesMounted:representativeAssetsMounted(),
    };
    Object.assign(result.checks,representationChecks);
    const truthful=/^[0-9a-f]{64}$/.test(representationChecks.presentationSha256)
      &&/^[0-9a-f]{64}$/.test(representationChecks.productionPumpSceneBound)
      &&representationChecks.declaredRoleCountIsNotFileCount
      &&representationChecks.productionAssetCount===1
      &&representationChecks.productionCoverageComplete===false
      &&representationChecks.releaseClassification==="representation-rework"
      &&representationChecks.completeSurfacePlan
      &&representationChecks.representativePrototypeRolesMounted;
    result.status=result.status==="pass"&&truthful?"pass":"fail";
    document.getElementById("autotest-results").textContent=JSON.stringify(result,null,2);
    document.body.dataset.testStatus=result.status;
  };

  const status=document.createElement("span");
  status.className="status representation-status";
  status.id="representation-status";
  status.textContent="ART REWORK · 1 production scene";
  document.querySelector(".statusline")?.append(status);
  document.body.dataset.representationPlan=plan.id;
  document.body.dataset.representationStatus="rework";

  if(session.current)renderAction();
  const pump=session.acceptedActions.find(entry=>entry.receipt.challengeId===PUMP_ID);
  if(pump)renderConsequence(pump);
  if(session.compactReceipt)renderCompact(session.compactReceipt);
})();