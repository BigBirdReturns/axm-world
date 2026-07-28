"use strict";

(()=>{
  const FORMAT="rodoh-underdrain-window-name-storage/1";
  const PERSISTENCE_FORMAT="rodoh-underdrain-persistence/1";

  function freshEnvelope(previousName=""){
    return {
      format:FORMAT,
      previousName:previousName||null,
      entries:{},
    };
  }

  function readEnvelope(){
    const raw=String(globalThis.name??"");
    try{
      const parsed=JSON.parse(raw);
      if(parsed&&parsed.format===FORMAT&&parsed.entries&&typeof parsed.entries==="object"){
        return parsed;
      }
    }catch{}
    return freshEnvelope(raw);
  }

  function writeEnvelope(envelope){
    globalThis.name=JSON.stringify(envelope);
  }

  function entryKeys(envelope){
    return Object.keys(envelope.entries);
  }

  const windowNameStorage={
    get length(){return entryKeys(readEnvelope()).length},
    clear(){
      const envelope=readEnvelope();
      envelope.entries={};
      writeEnvelope(envelope);
    },
    getItem(key){
      const entries=readEnvelope().entries;
      const normalized=String(key);
      return Object.prototype.hasOwnProperty.call(entries,normalized)?entries[normalized]:null;
    },
    key(index){
      const key=entryKeys(readEnvelope())[Number(index)];
      return key===undefined?null:key;
    },
    removeItem(key){
      const envelope=readEnvelope();
      delete envelope.entries[String(key)];
      writeEnvelope(envelope);
    },
    setItem(key,value){
      const envelope=readEnvelope();
      envelope.entries[String(key)]=String(value);
      writeEnvelope(envelope);
    },
  };

  let persistence={
    format:PERSISTENCE_FORMAT,
    mode:"local-storage",
    durability:"browser-profile",
    exactReload:true,
    closeTabRequiresExport:false,
  };

  if(location.protocol==="file:"){
    try{
      Object.defineProperty(globalThis,"localStorage",{
        configurable:true,
        enumerable:true,
        value:windowNameStorage,
      });
    }catch(error){
      throw new Error(`UNDERDRAIN could not install direct-file persistence: ${error instanceof Error?error.message:String(error)}`);
    }
    if(globalThis.localStorage!==windowNameStorage){
      throw new Error("UNDERDRAIN direct-file persistence did not replace the opaque file-origin storage surface.");
    }
    persistence={
      format:PERSISTENCE_FORMAT,
      mode:"window-name",
      durability:"current-tab",
      exactReload:true,
      closeTabRequiresExport:true,
    };
  }

  globalThis.UnderdrainPersistence=Object.freeze(persistence);
})();
