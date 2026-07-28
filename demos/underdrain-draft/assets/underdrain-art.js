"use strict";
(()=>{
  const presentationNode=document.getElementById("underdrain-presentation");
  if(!presentationNode)throw new Error("Underdrain presentation plan is absent.");
  const PLAN=JSON.parse(presentationNode.textContent);
  const REGISTRY=Object.freeze(Object.fromEntries(PLAN.assets.map(asset=>[asset.id,Object.freeze({...asset})])));
  const C={
    ink:"#f6f1df",muted:"#a9ad9b",deep:"#07100b",panel:"#142019",mint:"#8ce5b8",
    spore:"#c1f078",brass:"#e6bd63",rust:"#dd7d56",danger:"#ff7878",blue:"#8ac7d9",
    violet:"#a78cc8",water:"#63c7d8",root:"#6a4d3d",tile:"#24342c",night:"#08110d",
  };
  const PERSON={
    "rhea-venn":{skin:"#c89470",hair:"#27231f",coat:"#3d765d",accent:C.brass,tool:true},
    "tess-loam":{skin:"#b97958",hair:"#171412",coat:"#376c70",accent:C.water,jar:true},
    "marta-sump":{skin:"#a86f51",hair:"#36302d",coat:"#39464f",accent:C.brass,tabs:true},
    "morrowcap":{skin:"#6f8754",hair:C.spore,coat:"#324b37",accent:C.violet,fungus:true},
    "mrs-kett":{skin:"#d0a383",hair:"#d8d0bd",coat:"#5e5972",accent:"#d9a6a6",cup:true},
    "dax-venn":{skin:"#bf8965",hair:"#2e2520",coat:"#72533f",accent:C.spore,pack:true},
  };
  function esc(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
  function asset(assetId){
    const value=REGISTRY[assetId];
    if(!value)throw new Error(`Unknown Underdrain asset ${assetId}.`);
    return value;
  }
  function svgFrame(assetId,viewBox,body,label=null){
    const info=asset(assetId);
    const title=label??info.accessibleEquivalent;
    return `<svg class="underdrain-svg" data-presentation-asset="${esc(assetId)}" viewBox="${viewBox}" ${label?`role="img" aria-label="${esc(title)}"`:`aria-hidden="true"`} xmlns="http://www.w3.org/2000/svg"><title>${esc(title)}</title>${body}</svg>`;
  }
  function defs(){
    return `<defs>
      <linearGradient id="ud-water" x1="0" x2="1"><stop stop-color="${C.blue}"/><stop offset=".5" stop-color="${C.mint}"/><stop offset="1" stop-color="${C.water}"/></linearGradient>
      <linearGradient id="ud-brass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0d98a"/><stop offset=".5" stop-color="${C.brass}"/><stop offset="1" stop-color="#8a6331"/></linearGradient>
      <radialGradient id="ud-spore"><stop stop-color="#f0ffd2"/><stop offset=".45" stop-color="${C.spore}"/><stop offset="1" stop-color="#3c5a37"/></radialGradient>
      <filter id="ud-glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <pattern id="ud-tile" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#17251e"/><path d="M24 0H0V24" fill="none" stroke="#315044" stroke-width="1"/></pattern>
    </defs>`;
  }
  function emblem(){
    return svgFrame("underdrain:emblem","0 0 100 100",`${defs()}
      <circle cx="50" cy="50" r="43" fill="#0d1812" stroke="url(#ud-brass)" stroke-width="4"/>
      <path d="M18 57C27 43 38 38 50 39s23 7 32 18" fill="none" stroke="url(#ud-water)" stroke-width="9" stroke-linecap="round"/>
      <path d="M28 46c3-14 12-23 22-23s19 9 22 23c-7-5-14-7-22-7s-15 2-22 7Z" fill="url(#ud-spore)" stroke="#e7efbd" stroke-width="2"/>
      <path d="m29 76 42-45M23 65l12 12M65 25l11 11" stroke="url(#ud-brass)" stroke-width="7" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="7" fill="${C.deep}" stroke="${C.mint}" stroke-width="3"/>`);
  }
  function portrait(personId,body=false){
    const p=PERSON[personId]??PERSON["rhea-venn"];
    const assetId=`underdrain:${body?"body":"portrait"}-${personId}`;
    const h=body?120:100;
    const y=body?30:20;
    const fungal=p.fungus?`
      <path d="M22 ${y+17}Q50 ${y-18} 78 ${y+17}Q67 ${y+7} 50 ${y+9}Q33 ${y+7} 22 ${y+17}Z" fill="${p.hair}" stroke="#e7efbd" stroke-width="2"/>
      <circle cx="36" cy="${y+6}" r="3" fill="#f0ffd2"/><circle cx="61" cy="${y+2}" r="2.5" fill="#f0ffd2"/>`:``+
      `<path d="M29 ${y+21}Q31 ${y-3} 50 ${y-5}Q70 ${y-1} 72 ${y+23}L65 ${y+12}Q51 ${y+3} 34 ${y+14}Z" fill="${p.hair}"/>`;
    const extras=p.tool?`<path d="m70 ${body?95:82} 18-24M72 ${body?92:79}l8 8" stroke="${C.brass}" stroke-width="5" stroke-linecap="round"/>`:
      p.jar?`<rect x="70" y="${body?82:72}" width="14" height="19" rx="4" fill="${C.water}" stroke="#d8ffff" stroke-width="2"/>`:
      p.tabs?`<rect x="29" y="${body?69:62}" width="8" height="16" fill="${C.brass}"/><rect x="63" y="${body?69:62}" width="8" height="16" fill="${C.brass}"/>`:
      p.cup?`<path d="M68 ${body?84:74}h17v12H68zM85 ${body?86:76}q8 0 4 7q-2 3-4 1" fill="none" stroke="#f2e3d5" stroke-width="3"/>`:
      p.pack?`<rect x="69" y="${body?76:68}" width="18" height="22" rx="3" fill="#8d6a42" stroke="${C.spore}" stroke-width="2"/>`:"";
    const legs=body?`<path d="M39 89v24M61 89v24" stroke="#263630" stroke-width="10" stroke-linecap="round"/><path d="M32 116h18M53 116h18" stroke="#151b17" stroke-width="7" stroke-linecap="round"/>`:"";
    return svgFrame(assetId,`0 0 100 ${h}`,`${defs()}
      <rect x="2" y="2" width="96" height="${h-4}" rx="16" fill="#0b1510" stroke="${p.accent}" stroke-width="3"/>
      <circle cx="50" cy="${y+28}" r="22" fill="${p.skin}" stroke="#0a110d" stroke-width="3"/>
      ${fungal}
      <circle cx="42" cy="${y+29}" r="2.4" fill="#101512"/><circle cx="58" cy="${y+29}" r="2.4" fill="#101512"/>
      <path d="M43 ${y+40}q7 5 14 0" fill="none" stroke="#5a3d32" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M29 ${y+54}Q50 ${y+44} 71 ${y+54}L76 ${body?94:88}H24Z" fill="${p.coat}" stroke="${p.accent}" stroke-width="3"/>
      <path d="M50 ${y+50}v${body?42:35}" stroke="${p.accent}" stroke-width="3"/>
      ${extras}${legs}`);
  }
  function sceneKitchen(){
    return svgFrame("underdrain:scene-kitchen","0 0 720 300",`${defs()}
      <rect width="720" height="300" fill="url(#ud-tile)"/>
      <rect y="221" width="720" height="79" fill="#342c26"/>
      <rect x="350" y="54" width="285" height="174" rx="8" fill="#28352c" stroke="${C.brass}" stroke-width="4"/>
      <rect x="390" y="75" width="205" height="55" rx="24" fill="#cad5c8" stroke="#7d8d83" stroke-width="5"/>
      <path d="M490 75V45q0-22 22-22t22 22v18" fill="none" stroke="url(#ud-brass)" stroke-width="11" stroke-linecap="round"/>
      <path d="M470 131v30q0 18 18 18h36q18 0 18 18v27" fill="none" stroke="#b8733d" stroke-width="12" stroke-linecap="round"/>
      <path d="M488 179q18-31 36 0q17 30 36 0" fill="none" stroke="url(#ud-spore)" stroke-width="17" stroke-linecap="round" filter="url(#ud-glow)"/>
      <path d="M408 198h165" stroke="${C.water}" stroke-width="8" stroke-dasharray="18 10"/>
      <g transform="translate(92 82) scale(1.35)">${portrait("rhea-venn",true).replace(/^.*?<title>.*?<\/title>|<\/svg>$/gs,"")}</g>
      <g transform="translate(215 112) scale(.95)">${portrait("mrs-kett",true).replace(/^.*?<title>.*?<\/title>|<\/svg>$/gs,"")}</g>
      <circle cx="530" cy="107" r="8" fill="${C.danger}"/><path d="M530 115v18" stroke="${C.danger}" stroke-width="4"/>
      <text x="370" y="250" fill="${C.muted}" font-family="monospace" font-size="14">KETT KITCHEN · LIVING TRAP / CLEAN BYPASS</text>`, "Mrs. Kett's kitchen with Rhea beside the dry sink and living trap joint.");
  }
  function sceneRoot(){
    return svgFrame("underdrain:scene-root-gate","0 0 720 300",`${defs()}
      <rect width="720" height="300" fill="#09120d"/>
      <path d="M40 280V105Q40 25 120 25h480q80 0 80 80v175" fill="#122019" stroke="url(#ud-brass)" stroke-width="10"/>
      <path d="M80 278V130Q80 72 138 72h444q58 0 58 58v148" fill="#0d1712" stroke="#42684b" stroke-width="7"/>
      <path d="M160 280V155q0-70 70-70t70 70v125M420 280V155q0-70 70-70t70 70v125" fill="none" stroke="url(#ud-spore)" stroke-width="24" opacity=".72"/>
      <path d="M225 210H495" stroke="url(#ud-water)" stroke-width="22"/><circle cx="360" cy="210" r="48" fill="#17231c" stroke="url(#ud-brass)" stroke-width="9"/>
      <path d="M360 170v80M320 210h80M332 182l56 56M388 182l-56 56" stroke="${C.brass}" stroke-width="7"/>
      <g transform="translate(80 146) scale(.88)">${portrait("marta-sump",true).replace(/^.*?<title>.*?<\/title>|<\/svg>$/gs,"")}</g>
      <g transform="translate(310 136) scale(.98)">${portrait("rhea-venn",true).replace(/^.*?<title>.*?<\/title>|<\/svg>$/gs,"")}</g>
      <g transform="translate(540 146) scale(.88)">${portrait("morrowcap",true).replace(/^.*?<title>.*?<\/title>|<\/svg>$/gs,"")}</g>
      <text x="183" y="38" fill="${C.ink}" font-family="monospace" font-size="17">ROOT GATE · WATER IS ACCESS, NOT SOVEREIGNTY</text>`, "The Root Gate parley with Marta, Rhea, and Morrowcap around the shared sluice.");
  }
  function consequenceScene(){
    return svgFrame("underdrain:scene-consequence","0 0 720 230",`${defs()}
      <rect width="720" height="230" fill="#0b1711"/>
      <path d="M25 122H695" stroke="#5a4731" stroke-width="42" stroke-linecap="round"/>
      <path d="M25 122H695" stroke="url(#ud-water)" stroke-width="18" stroke-linecap="round"/>
      <path d="M360 120C420 55 520 60 610 102" fill="none" stroke="url(#ud-spore)" stroke-width="26" stroke-linecap="round"/>
      <circle cx="185" cy="122" r="45" fill="#15231b" stroke="url(#ud-brass)" stroke-width="8"/>
      <path d="M185 85v74M148 122h74" stroke="${C.brass}" stroke-width="7"/>
      <g fill="${C.spore}" filter="url(#ud-glow)"><circle cx="505" cy="79" r="10"/><circle cx="541" cy="86" r="7"/><circle cx="574" cy="97" r="9"/></g>
      <path d="M76 44h150" stroke="${C.blue}" stroke-width="7"/><path d="M494 185h150" stroke="${C.mint}" stroke-width="7"/>
      <text x="52" y="34" fill="${C.ink}" font-family="monospace" font-size="15">TOWN FLOW RESTORED</text>
      <text x="469" y="215" fill="${C.ink}" font-family="monospace" font-size="15">NURSERY ROUTE PRESERVED</text>`, "Pump Seven after acceptance, with town water flowing and the nursery branch preserved.");
  }
  function recordSeal(){
    return svgFrame("underdrain:record-seal","0 0 180 180",`${defs()}
      <circle cx="90" cy="90" r="78" fill="#0b1510" stroke="url(#ud-brass)" stroke-width="6"/>
      <circle cx="90" cy="90" r="58" fill="none" stroke="${C.mint}" stroke-width="3" stroke-dasharray="8 6"/>
      <path d="M48 102C66 76 114 76 132 102" fill="none" stroke="url(#ud-water)" stroke-width="12" stroke-linecap="round"/>
      <path d="M58 72q8-32 32-32t32 32q-15-8-32-8t-32 8Z" fill="url(#ud-spore)" stroke="#eff7c8" stroke-width="3"/>
      <path d="m58 132 65-72" stroke="url(#ud-brass)" stroke-width="10" stroke-linecap="round"/>
      <text x="90" y="159" text-anchor="middle" fill="${C.muted}" font-family="monospace" font-size="10">BELLWETHER REMEMBERS</text>`);
  }
  function routeMark(route){
    const assetId=`underdrain:route-${route}`;
    const body=route==="emergency-plan"?`
      <rect x="18" y="18" width="64" height="64" rx="12" fill="#19231c" stroke="${C.brass}" stroke-width="5"/>
      <circle cx="50" cy="50" r="19" fill="none" stroke="${C.brass}" stroke-width="6"/><path d="M50 22v56M22 50h56" stroke="${C.brass}" stroke-width="4"/>`:
      route==="service-tunnel"?`
      <path d="M14 74C22 28 45 25 50 50s28 22 36-24" fill="none" stroke="#b8733d" stroke-width="12" stroke-linecap="round"/>
      <path d="M14 74C22 28 45 25 50 50s28 22 36-24" fill="none" stroke="${C.water}" stroke-width="4" stroke-dasharray="7 5"/>`:
      `<path d="M18 58q32-42 64 0q-14-8-32-8t-32 8Z" fill="url(#ud-spore)" stroke="#eaf4c8" stroke-width="4"/>
       <path d="M26 70q24 20 48 0" fill="none" stroke="${C.violet}" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="30" r="7" fill="${C.spore}"/>`;
    return svgFrame(assetId,"0 0 100 100",`${defs()}${body}`);
  }
  function stateMark(stateId){
    const assetId=`underdrain:state-${stateId}`;
    const glyph={
      "town-water-pressure":`<circle cx="50" cy="50" r="31" fill="none" stroke="${C.water}" stroke-width="8"/><path d="M50 50l19-15" stroke="${C.brass}" stroke-width="6" stroke-linecap="round"/>`,
      "kett-water":`<path d="M28 22h30v18H42v34q0 11 11 11h19" fill="none" stroke="${C.brass}" stroke-width="8" stroke-linecap="round"/><path d="M72 62q15 18 0 27q-15-9 0-27Z" fill="${C.water}"/>`,
      "fungus-contact":`<path d="M20 55q30-42 60 0q-13-8-30-8t-30 8Z" fill="url(#ud-spore)" stroke="#e7efbd" stroke-width="4"/><path d="M50 48v31" stroke="${C.mint}" stroke-width="8"/>`,
      "crown-grievance":`<path d="M18 70 28 30l22 18 22-18 10 40Z" fill="none" stroke="${C.rust}" stroke-width="7"/><path d="M28 78h44" stroke="${C.danger}" stroke-width="6"/>`,
      "rhea-status":`<circle cx="50" cy="37" r="18" fill="#c89470"/><path d="M24 84q4-34 26-34t26 34" fill="#3d765d" stroke="${C.brass}" stroke-width="5"/><path d="m66 78 18-24" stroke="${C.brass}" stroke-width="6"/>`,
      "evidence-custody":`<rect x="31" y="25" width="38" height="55" rx="8" fill="${C.water}" fill-opacity=".35" stroke="#d9ffff" stroke-width="5"/><circle cx="50" cy="55" r="11" fill="${C.spore}"/>`,
      "root-gate-open":`<path d="M20 84V47q0-31 30-31t30 31v37" fill="none" stroke="url(#ud-brass)" stroke-width="9"/><path d="M50 48v36" stroke="${C.water}" stroke-width="8"/>`,
    }[stateId]??`<circle cx="50" cy="50" r="28" fill="none" stroke="${C.mint}" stroke-width="7"/>`;
    return svgFrame(assetId,"0 0 100 100",`${defs()}${glyph}`);
  }
  function staticSvg(assetId){
    if(assetId==="underdrain:emblem")return emblem();
    if(assetId==="underdrain:scene-kitchen")return sceneKitchen();
    if(assetId==="underdrain:scene-consequence")return consequenceScene();
    if(assetId==="underdrain:scene-root-gate")return sceneRoot();
    if(assetId==="underdrain:record-seal")return recordSeal();
    if(assetId.startsWith("underdrain:portrait-"))return portrait(assetId.slice("underdrain:portrait-".length),false);
    if(assetId.startsWith("underdrain:body-"))return portrait(assetId.slice("underdrain:body-".length),true);
    if(assetId.startsWith("underdrain:route-"))return routeMark(assetId.slice("underdrain:route-".length));
    if(assetId.startsWith("underdrain:state-"))return stateMark(assetId.slice("underdrain:state-".length));
    return emblem();
  }
  function node(assetId,className,label=null){
    const wrapper=document.createElement("div");
    wrapper.className=className;
    wrapper.dataset.presentationAsset=assetId;
    if(label){wrapper.setAttribute("role","img");wrapper.setAttribute("aria-label",label)}
    else wrapper.setAttribute("aria-hidden","true");
    wrapper.innerHTML=staticSvg(assetId);
    return wrapper;
  }
  function prepend(target,assetId,className,label=null){
    if(!target||target.querySelector(`[data-presentation-asset="${assetId}"]`))return;
    target.prepend(node(assetId,className,label));
  }
  function mount(){
    const brand=document.querySelector(".brandmark");
    if(brand){brand.textContent="";brand.dataset.presentationAsset="underdrain:emblem";brand.innerHTML=emblem()}
    const cold=document.querySelector("#cold .cold-grid>article");
    prepend(cold,"underdrain:scene-kitchen","underdrain-hero","Mrs. Kett's kitchen with the living trap and Rhea answering the service call.");
    const personIds=["rhea-venn","tess-loam","marta-sump","morrowcap"];
    document.querySelectorAll("#cold .person").forEach((card,index)=>prepend(card,`underdrain:portrait-${personIds[index]}`,"underdrain-person-art"));
    const draftIds=["marta-sump","tess-loam","dax-venn","morrowcap"];
    document.querySelectorAll("#draft .dialogue .line").forEach((line,index)=>prepend(line,`underdrain:portrait-${draftIds[index]}`,"underdrain-line-art"));
    document.querySelectorAll("[data-route]").forEach(button=>prepend(button,`underdrain:route-${button.dataset.route}`,"underdrain-route-art"));
    prepend(document.querySelector("#consequence .consequence-grid>article"),"underdrain:scene-consequence","underdrain-scene-strip","Pump Seven after the accepted operation.");
    prepend(document.querySelector("#root .root-grid>article"),"underdrain:scene-root-gate","underdrain-hero","The Root Gate parley around the shared sluice.");
    prepend(document.querySelector("#record .record-grid>article"),"underdrain:record-seal","underdrain-record-seal");
    document.body.dataset.representationPlan=PLAN.id;
    document.body.dataset.representationStatus="mounted";
  }
  function roundRect(ctx,x,y,w,h,r){
    const radius=Math.min(r,w/2,h/2);
    ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
  }
  function drawScene(ctx,run){
    const g=ctx.createLinearGradient(0,0,0,ctx.canvas.height);
    if(run.challengeId==="mrs-kett-service-call"){g.addColorStop(0,"#14251d");g.addColorStop(1,"#271f1b")}
    else{g.addColorStop(0,"#06120d");g.addColorStop(1,"#10251a")}
    ctx.fillStyle=g;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.canvas.dataset.presentationAsset=run.challengeId==="mrs-kett-service-call"?"underdrain:scene-kitchen":"underdrain:scene-pump-seven";
    if(run.challengeId==="mrs-kett-service-call"){
      ctx.strokeStyle="rgba(138,199,217,.13)";ctx.lineWidth=2;
      for(let x=0;x<ctx.canvas.width;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,ctx.canvas.height);ctx.stroke()}
      for(let y=0;y<ctx.canvas.height;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(ctx.canvas.width,y);ctx.stroke()}
      ctx.fillStyle="#2c3930";roundRect(ctx,100,85,760,340,20);ctx.fill();
      ctx.fillStyle="#cbd5cb";roundRect(ctx,335,112,290,92,34);ctx.fill();
      ctx.strokeStyle="#b8733d";ctx.lineWidth=24;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(405,205);ctx.lineTo(405,270);ctx.bezierCurveTo(405,330,520,330,520,270);ctx.lineTo(520,235);ctx.stroke();
      ctx.strokeStyle=C.spore;ctx.lineWidth=32;ctx.beginPath();ctx.moveTo(520,286);ctx.bezierCurveTo(555,245,590,330,628,284);ctx.stroke();
      ctx.fillStyle="rgba(193,240,120,.14)";ctx.beginPath();ctx.arc(575,286,76,0,Math.PI*2);ctx.fill();
    }else{
      ctx.strokeStyle="#5d4935";ctx.lineWidth=48;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(40,270);ctx.lineTo(920,270);ctx.stroke();
      ctx.strokeStyle=C.water;ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(40,270);ctx.lineTo(920,270);ctx.stroke();
      ctx.strokeStyle="rgba(193,240,120,.25)";ctx.lineWidth=30;ctx.beginPath();ctx.moveTo(160,500);ctx.bezierCurveTo(280,340,680,330,820,80);ctx.stroke();
      ctx.strokeStyle="rgba(230,189,99,.25)";ctx.lineWidth=10;
      for(let x=120;x<900;x+=150){ctx.beginPath();ctx.moveTo(x,55);ctx.lineTo(x,480);ctx.stroke()}
      ctx.fillStyle="rgba(8,20,13,.62)";roundRect(ctx,25,25,300,48,12);ctx.fill();
      ctx.fillStyle=C.brass;ctx.font="bold 16px ui-monospace";ctx.fillText("PUMP SEVEN · SHARED FLOW",45,55);
      if(run.route==="emergency-plan"){ctx.strokeStyle=C.brass;ctx.setLineDash([14,8]);ctx.strokeRect(75,90,810,360);ctx.setLineDash([])}
      if(run.route==="service-tunnel"){ctx.strokeStyle=C.blue;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(80,430);ctx.bezierCurveTo(260,350,450,410,850,120);ctx.stroke()}
      if(run.route==="truce-offer"){ctx.fillStyle="rgba(193,240,120,.18)";ctx.beginPath();ctx.arc(720,120,90,0,Math.PI*2);ctx.fill()}
    }
  }
  function drawMechanism(ctx,entry,p,active,done){
    const objectiveId=entry.objective.id;
    const state=done?"complete":active?"active":"idle";
    const assetId=`underdrain:mechanism-${objectiveId}-${state}`;
    const radius=Math.max(17,entry.target.radius*p.scale);
    ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=active?1:.46;
    ctx.fillStyle=done?"rgba(140,229,184,.28)":active?"rgba(193,240,120,.16)":"rgba(138,199,217,.10)";
    ctx.strokeStyle=done?C.mint:active?C.spore:C.blue;ctx.lineWidth=active?5:3;
    ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(objectiveId==="inspect-living-trap"){
      ctx.strokeStyle="#b8733d";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-20,-20);ctx.lineTo(-20,7);ctx.bezierCurveTo(-20,28,20,28,20,7);ctx.lineTo(20,-18);ctx.stroke();
      ctx.strokeStyle=C.spore;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-8,8);ctx.quadraticCurveTo(0,-8,9,8);ctx.stroke();
    }else if(objectiveId==="restore-kett-water"){
      ctx.strokeStyle=C.brass;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-28,0);ctx.lineTo(28,0);ctx.stroke();
      ctx.fillStyle=done?C.water:"#293d35";ctx.fillRect(-8,-18,16,36);
      ctx.strokeStyle=C.water;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-28,8);ctx.lineTo(28,8);ctx.stroke();
    }else if(objectiveId==="diagnose-spore-valves"){
      ctx.fillStyle="rgba(193,240,120,.36)";for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.ellipse(0,-20,8,18,0,0,Math.PI*2);ctx.fill()}
      ctx.fillStyle=done?C.mint:C.brass;ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();
    }else{
      ctx.strokeStyle=objectiveId==="operate-purge-wheel"?C.brass:C.spore;ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,26,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-29);ctx.stroke()}
      if(objectiveId==="open-crown-sluice"){ctx.strokeStyle=C.water;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-34,35);ctx.lineTo(34,35);ctx.stroke()}
    }
    ctx.fillStyle=C.ink;ctx.font="bold 11px ui-monospace";ctx.textAlign="center";ctx.fillText(done?"STABLE":entry.kind==="hold_ticks"?"HOLD WORK":"WORK",0,-radius-11);
    ctx.restore();
    return assetId;
  }
  function drawEnemy(ctx,enemy,p,radius){
    const assetId=enemy.kit==="breaker"?"underdrain:pressure-root-breaker":enemy.kit==="swarm"?"underdrain:pressure-spore-swarm":"underdrain:pressure-capling";
    ctx.save();ctx.translate(p.x,p.y);
    if(enemy.mode==="telegraph"||enemy.mode==="active"){
      const phase=enemy.mode==="active"?1:Math.min(1,enemy.modeTick/12);
      ctx.strokeStyle=`rgba(255,154,83,${.38+.5*phase})`;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,31+16*phase,0,Math.PI*2);ctx.stroke();
    }
    if(enemy.kit==="swarm"){
      ctx.fillStyle=C.violet;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.beginPath();ctx.arc(Math.cos(a)*16,Math.sin(a)*12,6+(i%2)*2,0,Math.PI*2);ctx.fill()}
      ctx.fillStyle=C.spore;ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();
    }else{
      const r=enemy.kit==="breaker"?radius*1.25:radius;
      ctx.fillStyle=enemy.kit==="breaker"?C.rust:C.spore;ctx.beginPath();ctx.moveTo(-r,3);ctx.quadraticCurveTo(0,-r*1.35,r,3);ctx.quadraticCurveTo(0,-r*.25,-r,3);ctx.fill();
      ctx.strokeStyle=enemy.kit==="breaker"?C.brass:"#e6f4c7";ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle=C.root;for(const x of[-r*.55,0,r*.55]){ctx.beginPath();ctx.moveTo(x,2);ctx.lineTo(x-5,r*.9);ctx.lineTo(x+6,r*.9);ctx.closePath();ctx.fill()}
      ctx.fillStyle="#182019";ctx.beginPath();ctx.arc(-r*.28,-r*.15,2.5,0,Math.PI*2);ctx.arc(r*.28,-r*.15,2.5,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    return assetId;
  }
  function drawPlayer(ctx,player,p){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(player.facingY,player.facingX));
    ctx.fillStyle=player.mode==="dodge"?"#ffffff":"#3d765d";ctx.beginPath();ctx.arc(0,2,14,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#c89470";ctx.beginPath();ctx.arc(0,-10,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#27231f";ctx.beginPath();ctx.arc(-2,-13,7,Math.PI,0);ctx.fill();
    ctx.strokeStyle=C.brass;ctx.lineWidth=6;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(33,0);ctx.stroke();ctx.beginPath();ctx.moveTo(27,-7);ctx.lineTo(36,1);ctx.stroke();
    ctx.restore();
    return "underdrain:body-rhea-venn";
  }
  function stateIconHtml(stateId){
    const id=`underdrain:state-${stateId}`;
    return `<span class="underdrain-state-art" data-presentation-asset="${esc(id)}" aria-hidden="true">${stateMark(stateId)}</span>`;
  }
  mount();
  globalThis.UnderdrainArt=Object.freeze({
    format:"underdrain-white-label-art/1",plan:PLAN,registry:REGISTRY,asset,svg:staticSvg,mount,
    drawScene,drawMechanism,drawEnemy,drawPlayer,stateIconHtml,
  });
})();
