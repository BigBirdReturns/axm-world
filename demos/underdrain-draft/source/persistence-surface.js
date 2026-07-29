"use strict";

(()=>{
  const persistence=globalThis.UnderdrainPersistence;
  const runtime=globalThis.UnderdrainRuntime;
  if(!persistence||!runtime)return;

  const persistenceRecord=()=>structuredClone(persistence);
  const originalEpisodeRecord=runtime.episodeRecord.bind(runtime);
  const decoratedEpisodeRecord=()=>({
    ...originalEpisodeRecord(),
    persistence:persistenceRecord(),
  });

  runtime.episodeRecord=decoratedEpisodeRecord;
  runtime.persistence=persistence;
  try{globalThis.episodeRecord=decoratedEpisodeRecord}catch{}

  runtime.session.persistence=persistenceRecord();
  try{
    localStorage.setItem("underdrain.continuous-pilot.v2",JSON.stringify(runtime.session));
  }catch(error){
    console.warn("UNDERDRAIN persistence disclosure could not be retained",error);
  }

  const status=document.createElement("span");
  status.className="status";
  status.id="persistence-status";
  status.textContent=persistence.mode==="window-name"
    ?"Direct-file save · current tab"
    :"Browser-profile save";
  document.querySelector(".statusline")?.append(status);

  if(persistence.closeTabRequiresExport){
    const notice=document.createElement("p");
    notice.className="hint persistence-notice";
    notice.textContent="Direct-file mode preserves reload and resume in this tab. Download the episode record before closing the tab for durable custody.";
    document.querySelector("#cold .hint")?.insertAdjacentElement("afterend",notice);
  }

  function downloadDecoratedRecord(){
    const value=decoratedEpisodeRecord();
    const blob=new Blob([JSON.stringify(value,null,2)+"\n"],{type:"application/json"});
    const link=document.createElement("a");
    link.href=URL.createObjectURL(blob);
    link.download="underdrain-episode-record.json";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  document.getElementById("download-record")?.addEventListener("click",event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    downloadDecoratedRecord();
  },{capture:true});

  const recordNode=document.getElementById("record-json");
  if(recordNode){
    let decorating=false;
    const decorateVisibleRecord=()=>{
      if(decorating)return;
      try{
        const parsed=JSON.parse(recordNode.textContent||"null");
        if(parsed?.format!=="rodoh-underdrain-episode-record/2"||parsed.persistence)return;
        decorating=true;
        recordNode.textContent=JSON.stringify({...parsed,persistence:persistenceRecord()},null,2);
      }catch{}
      finally{decorating=false}
    };
    new MutationObserver(decorateVisibleRecord).observe(recordNode,{childList:true,characterData:true,subtree:true});
  }
})();
