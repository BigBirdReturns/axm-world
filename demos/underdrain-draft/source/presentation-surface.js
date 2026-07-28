"use strict";

(()=>{
  const art=globalThis.UnderdrainArt;
  const runtime=globalThis.UnderdrainRuntime;
  const planNode=document.getElementById("underdrain-presentation");
  const presentationSha256=globalThis.__UNDERDRAIN_PRESENTATION_SHA256__;
  if(!art||!runtime||!planNode)throw new Error("UNDERDRAIN cartridge-owned representation did not load.");
  const plan=JSON.parse(planNode.textContent);
  if(plan.format!=="rodoh-representation-plan/1")throw new Error("UNDERDRAIN representation plan format is unsupported.");
  if(plan.id!==art.plan.id)throw new Error("UNDERDRAIN representation plan and art registry disagree.");
  if(!/^[0-9a-f]{64}$/.test(presentationSha256))throw new Error("UNDERDRAIN representation is not bound to exact bytes.");
  if(plan.renderer.action!=="cartridge-assets"||plan.renderer.neutralFallbackUsed){
    throw new Error("UNDERDRAIN fell back to schematic or neutral representation.");
  }

  if(runtime.session.worldSourceCommit!==ARC.worldSourceCommit){
    stopLoop();
    runtime.reset();
  }
  runtime.session.representation={
    format:"rodoh-underdrain-representation/1",
    planId:plan.id,
    presentationSha256,
    namespace:plan.namespace,
    assetCount:plan.assets.length,
    actionRenderer:plan.renderer.action,
    neutralFallbackUsed:plan.renderer.neutralFallbackUsed,
  };
  saveSession();

  drawAction=function(run){
    const spec=run.spec,state=run.state;
    art.drawScene(ctx,run);
    const represented=new Set([canvas.dataset.presentationAsset,"underdrain:body-rhea-venn"].filter(Boolean));
    const showAll=session.route==="service-tunnel"&&run.challengeId===PUMP_ID;
    const completedTargets=new Set(state.completedInteractionTargetIds??[]);
    for(const entry of activeTargets(run,showAll)){
      const p=screenPoint(spec,entry.target.x,entry.target.y);
      const active=entry.objective.id===spec.objectives[state.activeObjectiveIndex]?.id;
      const done=completedTargets.has(entry.target.id)||state.completedObjectiveIds.includes(entry.objective.id);
      represented.add(art.drawMechanism(ctx,entry,p,active,done));
    }
    for(const enemy of state.enemies){
      if(enemy.mode==="defeated")continue;
      const p=screenPoint(spec,enemy.x,enemy.y),law=spec.enemyLaws[enemy.kit];
      represented.add(art.drawEnemy(ctx,enemy,p,Math.max(10,law.radius*p.scale)));
      ctx.fillStyle="#191d19";ctx.fillRect(p.x-18,p.y+25,36,4);
      ctx.fillStyle="#ff7878";ctx.fillRect(p.x-18,p.y+25,36*(enemy.health/law.maxHealth),4);
    }
    const player=state.player,p=screenPoint(spec,player.x,player.y);
    represented.add(art.drawPlayer(ctx,player,p));
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
      "underdrain:emblem",
      "underdrain:scene-kitchen",
      "underdrain:portrait-rhea-venn",
      "underdrain:portrait-tess-loam",
      "underdrain:portrait-marta-sump",
      "underdrain:portrait-morrowcap",
      "underdrain:portrait-dax-venn",
      "underdrain:route-emergency-plan",
      "underdrain:route-service-tunnel",
      "underdrain:route-truce-offer",
      "underdrain:scene-consequence",
      "underdrain:scene-root-gate",
      "underdrain:record-seal",
    ].every(assetId=>mounted.has(assetId));
  }
  function buildRepresentationEvidence(){
    return {
      format:"rodoh-representation-runtime-evidence/1",
      candidate:{
        repository:"BigBirdReturns/axm-world",
        commit:ARC.worldSourceCommit,
        authoredIdentity:session.cartridgeDigest,
        experienceId:"underdrain-continuous-pilot-v2",
      },
      planId:plan.id,
      presentationSha256,
      provenance:structuredClone(plan.provenance),
      renderer:structuredClone(plan.renderer),
      declaredAssetIds:plan.assets.map(asset=>asset.id).sort(),
      mountedAssetIds:mountedAssetIds(),
      surfaces:plan.surfaces.map(surface=>({
        id:surface.id,
        desktop:surface.desktop,
        mobile:surface.mobile,
        assetIds:[...surface.assetIds].sort(),
        accessibleEquivalent:surface.accessibleEquivalent,
      })),
    };
  }

  const originalStructuralEvidence=buildStructuralEvidence;
  buildStructuralEvidence=function(){
    return {...originalStructuralEvidence(),representation:buildRepresentationEvidence()};
  };
  const originalEpisodeRecord=episodeRecord;
  episodeRecord=function(){
    return {...originalEpisodeRecord(),representation:buildRepresentationEvidence()};
  };
  runtime.buildStructuralEvidence=buildStructuralEvidence;
  runtime.buildRepresentationEvidence=buildRepresentationEvidence;
  runtime.episodeRecord=episodeRecord;
  runtime.representation=Object.freeze({plan,presentationSha256});

  const originalRunAutomatedSuite=runAutomatedSuite;
  runAutomatedSuite=async function(){
    await originalRunAutomatedSuite();
    const result=globalThis.__UNDERDRAIN_TEST_RESULT__;
    if(!result)return;
    const representationChecks={
      representationPlanId:plan.id,
      presentationSha256,
      cartridgeAssetCount:plan.assets.length,
      actionRendererUsesCartridgeAssets:plan.renderer.action==="cartridge-assets",
      neutralFallbackAbsent:plan.renderer.neutralFallbackUsed===false,
      completeSurfacePlan:plan.surfaces.length===6&&plan.surfaces.every(surface=>surface.desktop&&surface.mobile&&surface.assetIds.length>0),
      mountedCartridgeAssets:representativeAssetsMounted(),
    };
    Object.assign(result.checks,representationChecks);
    const representationPassed=/^[0-9a-f]{64}$/.test(representationChecks.presentationSha256)
      &&representationChecks.cartridgeAssetCount>=40
      &&representationChecks.actionRendererUsesCartridgeAssets
      &&representationChecks.neutralFallbackAbsent
      &&representationChecks.completeSurfacePlan
      &&representationChecks.mountedCartridgeAssets;
    result.status=result.status==="pass"&&representationPassed?"pass":"fail";
    document.getElementById("autotest-results").textContent=JSON.stringify(result,null,2);
    document.body.dataset.testStatus=result.status;
  };

  const status=document.createElement("span");
  status.className="status representation-status";
  status.id="representation-status";
  status.textContent=`${plan.assets.length} cartridge assets`;
  document.querySelector(".statusline")?.append(status);
  document.body.dataset.representationPlan=plan.id;
  document.body.dataset.representationStatus="pass";

  if(session.current)renderAction();
  const pump=session.acceptedActions.find(entry=>entry.receipt.challengeId===PUMP_ID);
  if(pump)renderConsequence(pump);
  if(session.compactReceipt)renderCompact(session.compactReceipt);
})();
