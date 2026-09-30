function createPagesStore(host, identity, {pending={}, validNote, onChange}) {
  let remote=[], received=0, queue=Promise.resolve();
  const changes=new Map(Object.entries(pending).filter(([id,note])=>
    /^[A-Za-z0-9_-]{1,100}$/.test(id)&&(note===null||validNote(note)&&note.id===id)));
  const merged=(updates=changes)=>{
    const notes=new Map(remote.map(note=>[note.id,note]));
    for(const [id,note] of updates)if(note===null)notes.delete(id);else notes.set(id,note);
    return [...notes.values()];
  };
  const notify=()=>onChange({notes:merged(),pending:Object.fromEntries(changes)});
  function receive(widgetState) {
    const record=widgetState?.modelContent;
    const compatible=record==null||(record.version===1&&
      ['reviewId','head','base'].every(key=>record[key]===identity[key])&&
      Array.isArray(record.notes)&&record.notes.every(validNote)&&
      new Set(record.notes.map(note=>note.id)).size===record.notes.length);
    if(!compatible)return false;
    received++;
    remote=(record?.notes||[]).map(note=>({...note}));
    notify();
    return true;
  }
  return {
    receive,
    change(id,note) {changes.set(id,note);notify();},
    hasPending:()=>changes.size>0,
    flush() {
      queue=queue.catch(()=>{}).then(async()=>{
        if(!changes.size)return;
        const widgetState=host.read();
        if(!receive(widgetState))throw Error('Saved state belongs to another review or is invalid');
        const observed=received;
        const sent=new Map(changes);
        const snapshot={modelContent:{version:1,...identity,notes:merged()},
          privateContent:widgetState?.privateContent??null};
        if(new TextEncoder().encode(JSON.stringify(snapshot)).byteLength>=16*1024)
          throw Error('Shared notes reached the size limit');
        await host.write(snapshot);
        remote=received===observed?snapshot.modelContent.notes:merged(sent);
        for(const [id,note] of sent)if(changes.get(id)===note)changes.delete(id);
        notify();
      });
      return queue;
    }
  };
}
