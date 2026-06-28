"use strict";
const $ = id => document.getElementById(id);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

const state = {
  sourceType:'video',
  loaded:false,            // a source is loaded & ready to extract
  frames:[],               // {bmp(canvas), natW, natH, ox, oy, scale}
  fw:128, fh:128,
  cols:6, autoCols:true,
  fit:'contain',
  bg:'transparent', bgColor:'#000000',
  selected:-1,
  videoUrl:'',             // object URL of current video (revoked on replace/reset)
  imageUrls:[],            // object URLs of current image sequence
  gifFile:null,
  key:{ on:false, color:'#00ff00', tol:0.18, soft:0.10, despill:false }, // background removal
  pickMode:false,          // eyedropper active
  clipboard:null,          // array of copied frame snapshots for paste
  sel:[],                  // all selected frame indices (multi-select)
  anchor:-1,               // range-select anchor (last plain click)
  upload:null,             // {kind,name,count,w,h,dur} — for re-rendering on lang change
  srcInfoKey:null, srcInfoParams:null,
};
// selection helpers — state.selected is the "primary" (inspector + drag anchor);
// state.sel is every selected index. They stay in sync via setSel().
function selList(){ return state.sel.length ? state.sel : (state.selected>=0?[state.selected]:[]); }
function setSel(indices, primary){
  const uniq=[...new Set(indices)].filter(i=>i>=0 && i<state.frames.length).sort((a,b)=>a-b);
  state.sel=uniq;
  state.selected = (primary!=null && uniq.includes(primary)) ? primary
                 : (uniq.length ? uniq[uniq.length-1] : -1);
}
function clearSel(){ state.sel=[]; state.anchor=-1; state.selected=-1; }

// Conservative cross-browser canvas ceiling (Safari/iOS are the strictest).
const MAX_DIM=16384, MAX_AREA=268435456; // 16384px per side, ~16k×16k area
const canvasTooBig=(W,H)=> W>MAX_DIM || H>MAX_DIM || W*H>MAX_AREA;

const preview = { playing:false, fps:12, loop:true, idx:0, raf:0, acc:0, last:0 };

let toastTimer=0;
function toast(msg){
  const t=$('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),1800);
}

/* ---------------- source selection ---------------- */
const srcConfig = {
  video:{ accept:'video/*', multiple:false, titleKey:'drop_video_title', subKey:'drop_video_sub' },
  gif:{ accept:'image/gif', multiple:false, titleKey:'drop_gif_title', subKey:'drop_gif_sub' },
  images:{ accept:'image/*', multiple:true, titleKey:'drop_images_title', subKey:'drop_images_sub' },
};
// localized srcInfo line — stored so it can be re-rendered on language change
function setSrcInfo(key, params){ state.srcInfoKey=key; state.srcInfoParams=params||null; $('srcInfo').innerHTML = key ? t(key,params) : ''; }
// Revoke any staged source's object URLs and reset its load flags. Called when the
// user switches source type or hits reset — prevents stale state driving the wrong
// extract() branch and leaking blob URLs.
function clearStagedSource(){
  if(state.videoUrl){ URL.revokeObjectURL(state.videoUrl); state.videoUrl=''; }
  state.imageUrls.forEach(u=>URL.revokeObjectURL(u)); state.imageUrls=[];
  pendingImages=[]; state.gifFile=null;
  state.loaded=false; videoReady=false;
  const v=$('video'); v.removeAttribute('src'); try{ v.load(); }catch(_){}
  $('extractBtn').disabled=true; $('fileInput').value='';
  state.upload=null; setSrcInfo(null);
  $('drop').classList.remove('loaded');
}
// show a clear "uploaded ✓" state on the drop zone so the user knows the file landed
function ellipsizeMid(s,max){ if(s.length<=max) return s; const h=Math.floor((max-1)/2); return s.slice(0,h)+'…'+s.slice(s.length-h); }
function uploadDetail(u){
  if(u.kind==='video') return `${u.w}×${u.h} · ${u.dur}s`;
  if(u.kind==='gif') return 'GIF';
  if(u.kind==='images') return t('images_each');
  return '';
}
function markUploaded(u){
  state.upload=u;
  $('drop').classList.add('loaded');
  const name = u.kind==='images' ? t('images_count',{n:u.count}) : u.name;
  $('dropTitle').textContent=t('uploaded',{name:ellipsizeMid(name,28)});
  const d=uploadDetail(u);
  $('dropSub').textContent=(d?d+'　·　':'')+t('click_replace');
}
function applySourceUI(type){
  state.sourceType=type;
  [...$('srcSeg').children].forEach(x=>x.classList.toggle('active',x.dataset.src===type));
  const c=srcConfig[type];
  $('fileInput').accept=c.accept; $('fileInput').multiple=c.multiple;
  $('dropTitle').textContent=t(c.titleKey); $('dropSub').textContent=t(c.subKey);
  const isSeq = type==='images';
  $('fpsField').style.opacity = isSeq?.4:1;
  $('rangeField').style.opacity = isSeq?.4:1;
  $('fps').disabled=$('fpsRange').disabled=$('startT').disabled=$('endT').disabled=isSeq;
  $('extractBtn').textContent = t(isSeq?'extract_images':'extract_video');
}
$('srcSeg').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.src===state.sourceType) return;   // re-click same tab → no-op
  clearStagedSource();
  applySourceUI(b.dataset.src);
});

/* ---------------- file input / drop ---------------- */
$('drop').addEventListener('click',()=>$('fileInput').click());
$('drop').addEventListener('dragover',e=>{e.preventDefault();$('drop').classList.add('over')});
$('drop').addEventListener('dragleave',()=>$('drop').classList.remove('over'));
$('drop').addEventListener('drop',e=>{
  e.preventDefault(); $('drop').classList.remove('over');
  if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});
$('fileInput').addEventListener('change',e=>{ if(e.target.files.length) handleFiles(e.target.files); });

let pendingImages=[]; // for image-sequence: loaded HTMLImageElements
let videoReady=false;

async function handleFiles(files){
  files=[...files];
  $('drop').classList.remove('loaded');   // reset; re-added on success
  if(state.sourceType==='images'){
    state.imageUrls.forEach(u=>URL.revokeObjectURL(u)); state.imageUrls=[]; pendingImages=[];
    files = files.filter(f=>f.type.startsWith('image/'))
                 .sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
    if(!files.length){ toast(t('t_no_images')); return; }
    for(const f of files){
      const url=URL.createObjectURL(f); state.imageUrls.push(url);
      pendingImages.push(await loadImage(url));
    }
    state.loaded=true; videoReady=false;
    setSrcInfo('images_loaded', {n:pendingImages.length});
    markUploaded({kind:'images', count:pendingImages.length});
    $('extractBtn').disabled=false;
    return;
  }
  const f=files[0];
  if(state.sourceType==='gif'){
    if(f.type!=='image/gif'){ toast(t('t_need_gif')); return; }
    state.gifFile=f; state.loaded=true; videoReady=false;
    setSrcInfo('hint_next_gif');
    markUploaded({kind:'gif', name:f.name});
    $('extractBtn').disabled=false;
    return;
  }
  // video
  const v=$('video');
  if(state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl=URL.createObjectURL(f); v.src=state.videoUrl;
  videoReady=false; state.loaded=false; $('extractBtn').disabled=true;
  setSrcInfo('reading_video');
  let ok=true;
  await new Promise(res=>{ v.onloadedmetadata=()=>res(); v.onerror=()=>{ ok=false; res(); }; });
  if(!ok || !isFinite(v.duration) || v.duration<=0){
    setSrcInfo('video_fail_info');
    toast(t('t_video_fail')); return;          // keep loaded=false & button disabled
  }
  videoReady=true; state.loaded=true;
  const dur=v.duration;
  setSrcInfo('hint_next_video');
  markUploaded({kind:'video', name:f.name, w:v.videoWidth, h:v.videoHeight, dur:dur.toFixed(1)});
  $('endT').placeholder=dur.toFixed(1);
  $('extractBtn').disabled=false;
}
function loadImage(src){
  return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; });
}

/* ---------------- extraction ---------------- */
function seekVideo(v,t){
  return new Promise(res=>{
    let settled=false;
    const finish=()=>{ if(settled)return; settled=true; clearTimeout(tm); v.removeEventListener('seeked',onSeeked); res(); };
    // 'seeked' fires when the seek completes, but on Safari the new frame may not be
    // composited yet — wait one extra paint cycle before letting the caller drawImage.
    const onSeeked=()=>{ requestAnimationFrame(()=>requestAnimationFrame(finish)); };
    v.addEventListener('seeked',onSeeked);
    // If the target equals the current time (e.g. the very first frame at t=0),
    // assigning the same value won't fire 'seeked' and we'd hang — nudge to force a seek.
    v.currentTime = (Math.abs(v.currentTime - t) < 1e-3) ? t + 1e-3 : t;
    // Safety net: if 'seeked' never fires (some codecs/edge frames), continue after a bit.
    const tm=setTimeout(finish, 2500);
  });
}
function makeBitmapCanvas(srcDrawable,w,h){
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  c.getContext('2d').drawImage(srcDrawable,0,0,w,h);
  return c;
}

$('extractBtn').addEventListener('click', extract);

async function extract(){
  if(!state.loaded){ toast(t('t_load_first')); return; }
  syncParams();
  stopPreview();
  // free old bitmaps
  state.frames=[]; state.selected=-1; state.clipboard=null;
  $('progWrap').style.display='block';
  const setProg=p=>{ $('progBar').style.width=(p*100).toFixed(0)+'%'; };
  setProg(0);
  $('extractBtn').disabled=true;

  try{
    if(state.sourceType==='video'){
      const v=$('video');
      const fps=clamp(+$('fps').value||12,1,60);
      const start=Math.max(0,+$('startT').value||0);
      const end=$('endT').value!=='' ? Math.min(v.duration,+$('endT').value) : v.duration;
      const maxF=clamp(+$('maxFrames').value||120,1,2000);
      const step=1/fps;
      let count=Math.floor((end-start)/step)+1;
      if(count>maxF) toast(t('cap_video',{max:maxF,count:count}));
      count=Math.min(count,maxF);
      for(let i=0;i<count;i++){
        const t=Math.min(start+i*step, Math.max(0,v.duration-0.001));
        await seekVideo(v,t);
        const cap=makeBitmapCanvas(v, v.videoWidth, v.videoHeight);
        state.frames.push(newFrame(cap));
        setProg((i+1)/count);
        if(i%4===0) await new Promise(r=>requestAnimationFrame(r));
      }
    } else if(state.sourceType==='gif'){
      await extractGif(setProg);
    } else { // images
      const maxF=clamp(+$('maxFrames').value||2000,1,2000);
      if(pendingImages.length>maxF) toast(t('cap_images',{n:pendingImages.length,max:maxF}));
      const imgs=pendingImages.slice(0,maxF);
      for(let i=0;i<imgs.length;i++){
        const im=imgs[i];
        const cap=makeBitmapCanvas(im, im.naturalWidth, im.naturalHeight);
        state.frames.push(newFrame(cap));
        setProg((i+1)/imgs.length);
      }
    }
  }catch(err){
    console.error(err); toast(t('t_extract_fail',{msg:err.message}));
  }
  $('extractBtn').disabled=false;
  $('progWrap').style.display='none';
  if(state.frames.length){
    afterFramesReady();
    toast(t('t_generated',{n:state.frames.length}));
  } else {
    toast(t('t_no_frames'));
  }
}

async function extractGif(setProg){
  if(typeof ImageDecoder==='undefined'){
    throw new Error(t('t_gif_unsupported'));
  }
  const buf=await state.gifFile.arrayBuffer();
  const dec=new ImageDecoder({data:buf, type:'image/gif'});
  try{
    await dec.tracks.ready;
    const track=dec.tracks.selectedTrack;
    let n=track.frameCount;
    const maxF=clamp(+$('maxFrames').value||120,1,2000);
    if(n>maxF) toast(t('cap_gif',{n:n,max:maxF}));
    n=Math.min(n,maxF);
    for(let i=0;i<n;i++){
      const {image}=await dec.decode({frameIndex:i});
      try{
        const w=image.displayWidth||image.codedWidth;
        const h=image.displayHeight||image.codedHeight;
        state.frames.push(newFrame(makeBitmapCanvas(image,w,h)));
      } finally { image.close && image.close(); }
      setProg((i+1)/n);
    }
  } finally { dec.close && dec.close(); }
}

function newFrame(canvas){
  return { bmp:canvas, natW:canvas.width, natH:canvas.height, ox:0, oy:0, scale:1, keyed:null };
}

/* ---------------- layout computation ---------------- */
function syncParams(){
  state.fw=clamp(+$('fw').value||128,1,2048);
  state.fh=clamp(+$('fh').value||128,1,2048);
  state.fit=$('fit').value;
  state.autoCols=$('autoCols').checked;
  state.cols=clamp(+$('cols').value||6,1,64);
}
function gridDims(){
  const n=state.frames.length;
  let cols = state.autoCols ? Math.max(1,Math.ceil(Math.sqrt(n))) : state.cols;
  cols=Math.min(cols, Math.max(1,n));
  const rows=Math.ceil(n/cols);
  return {cols,rows};
}

/* compute the base placement (before per-frame offset/scale) of a frame's
   content inside a fw×fh cell, honoring the fit mode */
function baseDraw(f){
  const cw=state.fw, ch=state.fh, iw=f.natW, ih=f.natH;
  let dw,dh;
  if(state.fit==='stretch'){ dw=cw; dh=ch; }
  else{
    const s = state.fit==='cover' ? Math.max(cw/iw,ch/ih) : Math.min(cw/iw,ch/ih);
    dw=iw*s; dh=ih*s;
  }
  return {dw,dh, dx:(cw-dw)/2, dy:(ch-dh)/2};
}

/* ---------------- background removal (alpha key / chroma key) ---------------- */
const MAXD=Math.sqrt(3*255*255);
function currentKey(){
  const c=state.key.color;
  return { kr:parseInt(c.slice(1,3),16), kg:parseInt(c.slice(3,5),16), kb:parseInt(c.slice(5,7),16),
           tol:state.key.tol, soft:state.key.soft, despill:state.key.despill };
}
// produce an RGBA canvas (native frame resolution) with the key colour made transparent
function applyKeyToFrame(f){
  const c=document.createElement('canvas'); c.width=f.natW; c.height=f.natH;
  const x=c.getContext('2d'); x.drawImage(f.bmp,0,0);
  const img=x.getImageData(0,0,f.natW,f.natH), d=img.data;
  const {kr,kg,kb,tol,soft,despill}=currentKey();
  const dom=(kr>=kg&&kr>=kb)?0:(kg>=kr&&kg>=kb)?1:2;   // dominant channel of key colour
  for(let i=0;i<d.length;i+=4){
    const r=d[i],g=d[i+1],b=d[i+2];
    const dist=Math.sqrt((r-kr)*(r-kr)+(g-kg)*(g-kg)+(b-kb)*(b-kb))/MAXD;
    let fct;                                            // alpha multiplier: 0=remove, 1=keep
    if(soft<=0) fct = dist<=tol?0:1;
    else if(dist<=tol) fct=0;
    else if(dist<=tol+soft) fct=(dist-tol)/soft;
    else fct=1;
    if(fct<1) d[i+3]=d[i+3]*fct;
    if(despill && fct>0){                              // clamp dominant channel to kill colour fringe
      if(dom===1){ const m=Math.max(r,b); if(g>m) d[i+1]=m; }
      else if(dom===2){ const m=Math.max(r,g); if(b>m) d[i+2]=m; }
      else { const m=Math.max(g,b); if(r>m) d[i]=m; }
    }
  }
  x.putImageData(img,0,0);
  return c;
}
// the drawable used for a frame: original, or a cached keyed version when removal is on
function frameSource(f){
  if(!state.key.on) return f.bmp;
  if(!f.keyed) f.keyed=applyKeyToFrame(f);
  return f.keyed;
}
function invalidateKeys(){ state.frames.forEach(f=>f.keyed=null); }
let keyRefreshScheduled=false;
function scheduleKeyRefresh(){                          // debounce re-keying to one per frame
  if(keyRefreshScheduled) return;
  keyRefreshScheduled=true;
  requestAnimationFrame(()=>{
    keyRefreshScheduled=false; invalidateKeys();
    if(state.frames.length){ renderSheet(); drawPreviewFrame(preview.idx); }
  });
}
// sample one source pixel of frame f (native coords) as a #rrggbb hex
function samplePixel(f,sx,sy){
  const c=document.createElement('canvas'); c.width=1; c.height=1;
  const x=c.getContext('2d'); x.drawImage(f.bmp,sx,sy,1,1,0,0,1,1);
  const p=x.getImageData(0,0,1,1).data;
  return '#'+[p[0],p[1],p[2]].map(v=>v.toString(16).padStart(2,'0')).join('');
}

/* draw one frame's content into ctx at cell origin (cx,cy) */
function drawFrame(ctx,f,cx,cy){
  const b=baseDraw(f);
  const dw=b.dw*f.scale, dh=b.dh*f.scale;
  const dx=cx + (state.fw-dw)/2 + f.ox;
  const dy=cy + (state.fh-dh)/2 + f.oy;
  ctx.save();
  ctx.beginPath(); ctx.rect(cx,cy,state.fw,state.fh); ctx.clip();
  ctx.drawImage(frameSource(f),0,0,f.natW,f.natH, dx,dy,dw,dh);
  ctx.restore();
}

/* ---------------- render sprite sheet ---------------- */
const sheet=$('sheet'), sctx=sheet.getContext('2d');
function paintBackground(ctx,w,h){
  if(state.bg==='color'){ ctx.fillStyle=state.bgColor; ctx.fillRect(0,0,w,h); }
  else ctx.clearRect(0,0,w,h);
}
let bigWarned=false;
function renderSheet(){
  const n=state.frames.length; if(!n) return;
  const {cols,rows}=gridDims();
  const W=cols*state.fw, H=rows*state.fh;
  if(canvasTooBig(W,H)){
    if(!bigWarned){ toast(t('t_sheet_big',{w:W,h:H})); bigWarned=true; }
    return;
  }
  bigWarned=false;
  // Only reallocate the backing store when dimensions actually change; otherwise just
  // repaint — reassigning width/height every drag-move is what made big sheets stutter.
  if(sheet.width!==W||sheet.height!==H){ sheet.width=W; sheet.height=H; }
  sctx.imageSmoothingEnabled=true; sctx.imageSmoothingQuality='high';
  paintBackground(sctx,W,H);
  for(let i=0;i<n;i++){
    const col=i%cols, row=Math.floor(i/cols);
    drawFrame(sctx, state.frames[i], col*state.fw, row*state.fh);
  }
  // grid + selection overlay
  sctx.lineWidth=Math.max(1,Math.round(Math.max(W,H)/1000));
  sctx.strokeStyle='rgba(255,255,255,.10)';
  for(let c=1;c<cols;c++){ sctx.beginPath(); sctx.moveTo(c*state.fw,0); sctx.lineTo(c*state.fw,H); sctx.stroke(); }
  for(let r=1;r<rows;r++){ sctx.beginPath(); sctx.moveTo(0,r*state.fh); sctx.lineTo(W,r*state.fh); sctx.stroke(); }
  // empty trailing cells → dashed paste targets ("＋" when something is on the clipboard)
  const total=cols*rows;
  if(n<total){
    sctx.save();
    sctx.lineWidth=Math.max(1,Math.round(Math.max(W,H)/700));
    sctx.setLineDash([Math.max(4,state.fw*0.06), Math.max(3,state.fw*0.05)]);
    const hot=!!state.clipboard;
    sctx.strokeStyle=hot?'rgba(255,0,153,.6)':'rgba(255,255,255,.15)';
    sctx.fillStyle=hot?'rgba(255,0,153,.85)':'rgba(255,255,255,.18)';
    sctx.textAlign='center'; sctx.textBaseline='middle';
    sctx.font=Math.round(state.fh*0.34)+'px sans-serif';
    for(let idx=n; idx<total; idx++){
      const x=(idx%cols)*state.fw, y=Math.floor(idx/cols)*state.fh;
      sctx.strokeRect(x+4,y+4,state.fw-8,state.fh-8);
      sctx.fillText(hot?'＋':'·', x+state.fw/2, y+state.fh/2);
    }
    sctx.restore();
  }
  if(state.sel.length){
    const lw=Math.max(2,Math.round(Math.max(W,H)/400));
    state.sel.forEach(i=>{
      const col=i%cols, row=Math.floor(i/cols);
      sctx.lineWidth=lw;
      sctx.strokeStyle = (i===state.selected) ? '#FF0099' : 'rgba(255,0,153,.55)';
      sctx.strokeRect(col*state.fw+1,row*state.fh+1,state.fw-2,state.fh-2);
      if(i!==state.selected){                       // soft fill on secondary selections
        sctx.fillStyle='rgba(255,0,153,.12)';
        sctx.fillRect(col*state.fw+1,row*state.fh+1,state.fw-2,state.fh-2);
      }
    });
  }
  updateStageBar(cols,rows,W,H);
}
function updateStageBar(cols,rows,W,H){
  $('bFrames').textContent=state.frames.length;
  $('bGrid').textContent=`${cols} × ${rows}`;
  $('bSize').textContent=`${W} × ${H}`;
  if(state.sel.length>1){ $('bSel').innerHTML=t('sel_many',{n:'<b>'+state.sel.length+'</b>'}); $('bSel').style.display='inline-block'; }
  else if(state.selected>=0){ $('bSel').innerHTML=t('sel_one',{n:'<b>'+state.selected+'</b>'}); $('bSel').style.display='inline-block'; }
  else { $('bSel').style.display='none'; }
}

function afterFramesReady(){
  $('noStage').style.display='none';
  $('sheet').style.display='block';
  $('stageBar').style.display='flex';
  $('exportPngBtn').disabled=$('exportJsonBtn').disabled=false;
  $('exportGodot').disabled=$('exportUnity').disabled=false;
  $('playBtn').disabled=$('stepBtn').disabled=false;
  { const {cols,rows}=gridDims();
    $('engineHint').innerHTML=t('engine_ready',{cols:cols,rows:rows,fw:state.fw,fh:state.fh}); }
  $('previewEmpty').style.display='none';
  $('preview').style.display='block';
  // default preview playback speed to the capture fps so playback runs at real time
  const cf=clamp(+$('fps').value||12,1,60);
  preview.fps=cf; $('pvFps').value=cf; $('pvFpsVal').textContent=cf;
  clearSel(); updateInspector();
  renderSheet();
  drawPreviewFrame(0);
}

/* ---------------- pick & drag on sheet ---------------- */
function sheetPosFromEvent(e){
  const r=sheet.getBoundingClientRect();
  const sx=sheet.width/r.width, sy=sheet.height/r.height;
  return { x:(e.clientX-r.left)*sx, y:(e.clientY-r.top)*sy };
}
// any grid cell under (x,y) — may be an empty trailing cell (index >= frame count)
function cellIndexAt(x,y){
  const {cols,rows}=gridDims();
  const col=Math.floor(x/state.fw), row=Math.floor(y/state.fh);
  if(col<0||col>=cols||row<0||row>=rows) return -1;
  return row*cols+col;
}
function frameIndexAt(x,y){ const i=cellIndexAt(x,y); return (i>=0 && i<state.frames.length)?i:-1; }
let dragging=false, dragLast=null;
sheet.addEventListener('pointerdown',e=>{
  if(!state.frames.length) return;
  const p=sheetPosFromEvent(e);
  const ci=cellIndexAt(p.x,p.y);
  if(ci<0) return;                                 // outside the grid
  if(ci>=state.frames.length){                     // empty trailing cell
    if(state.clipboard) pasteFrame(true);          // → paste a copy here
    else toast(t('t_blank_hint'));
    return;
  }
  const i=ci;
  if(state.pickMode){ sampleKeyAt(i,p); return; }   // eyedropper: grab background colour
  if(e.shiftKey && state.anchor>=0){                // range select, no drag
    const a=Math.min(state.anchor,i), b=Math.max(state.anchor,i), range=[];
    for(let k=a;k<=b;k++) range.push(k);
    setSel(range, i); updateInspector(); renderSheet(); return;
  }
  if(e.metaKey || e.ctrlKey){                        // toggle one in/out of the set
    const s=new Set(selList());
    s.has(i) ? s.delete(i) : s.add(i);
    state.anchor=i; setSel([...s], i); updateInspector(); renderSheet(); return;
  }
  state.anchor=i; setSel([i], i);                   // plain click: single select + drag
  updateInspector(); renderSheet();
  dragging=true; dragLast=p; sheet.setPointerCapture(e.pointerId);
});
// map a sheet-space click on frame i back to its source pixel and use it as the key colour
function sampleKeyAt(i,p){
  const f=state.frames[i]; const {cols}=gridDims();
  const cx=(i%cols)*state.fw, cy=Math.floor(i/cols)*state.fh;
  const b=baseDraw(f); const dw=b.dw*f.scale, dh=b.dh*f.scale;
  const lx=p.x-cx-((state.fw-dw)/2+f.ox), ly=p.y-cy-((state.fh-dh)/2+f.oy);
  if(lx<0||ly<0||lx>=dw||ly>=dh){ toast(t('t_click_content')); return; }
  const sx=clamp(Math.floor(lx/dw*f.natW),0,f.natW-1), sy=clamp(Math.floor(ly/dh*f.natH),0,f.natH-1);
  const hex=samplePixel(f,sx,sy);
  state.key.color=hex; $('keyColor').value=hex;
  exitPickMode(); scheduleKeyRefresh(); toast(t('t_picked_bg',{hex:hex}));
}
function enterPickMode(){ state.pickMode=true; sheet.style.cursor='cell'; $('keyPick').classList.add('primary'); toast(t('t_pick_prompt')); }
function exitPickMode(){ state.pickMode=false; sheet.style.cursor='crosshair'; $('keyPick').classList.remove('primary'); }
sheet.addEventListener('pointermove',e=>{
  if(!dragging||state.selected<0) return;
  const p=sheetPosFromEvent(e);
  const dx=p.x-dragLast.x, dy=p.y-dragLast.y;
  selList().forEach(idx=>{ const f=state.frames[idx]; f.ox+=dx; f.oy+=dy; });
  dragLast=p;
  renderSheet(); syncInspectorValues(); if(!preview.playing) drawPreviewFrame(preview.idx);
});
sheet.addEventListener('pointerup',e=>{ dragging=false; try{sheet.releasePointerCapture(e.pointerId)}catch(_){} });
sheet.addEventListener('pointercancel',()=>{dragging=false});

/* ---------------- inspector ---------------- */
function updateInspector(){
  const sel=state.selected>=0;
  $('inspEmpty').style.display=sel?'none':'block';
  $('inspBody').style.display=sel?'block':'none';
  if(sel) syncInspectorValues();
}
function syncInspectorValues(){
  const f=state.frames[state.selected]; if(!f) return;
  $('iIdx').textContent = state.sel.length>1 ? state.selected+' · '+t('sel_many',{n:state.sel.length}) : state.selected;
  $('iSrc').textContent=`${f.natW}×${f.natH}`;
  $('ox').value=Math.round(f.ox);
  $('oy').value=Math.round(f.oy);
  $('scale').value=Math.round(f.scale*100);
  $('scaleVal').textContent=Math.round(f.scale*100)+'%';
}
function withSel(fn){ const list=selList(); if(!list.length)return; list.forEach(idx=>fn(state.frames[idx])); renderSheet(); syncInspectorValues(); if(!preview.playing)drawPreviewFrame(preview.idx); }
$('ox').addEventListener('input',()=>withSel(f=>f.ox=+$('ox').value||0));
$('oy').addEventListener('input',()=>withSel(f=>f.oy=+$('oy').value||0));
$('scale').addEventListener('input',()=>withSel(f=>{f.scale=(+$('scale').value||100)/100; $('scaleVal').textContent=$('scale').value+'%';}));
$('centerBtn').addEventListener('click',()=>withSel(f=>{f.ox=0;f.oy=0;}));
$('resetFrameBtn').addEventListener('click',()=>withSel(f=>{f.ox=0;f.oy=0;f.scale=1;}));
$('applyAllBtn').addEventListener('click',()=>{
  if(state.selected<0)return; const s=state.frames[state.selected];
  const ox=s.ox, oy=s.oy, scale=s.scale;
  state.frames.forEach(f=>{f.ox=ox;f.oy=oy;f.scale=scale;});
  renderSheet(); syncInspectorValues(); if(!preview.playing) drawPreviewFrame(preview.idx);
  toast(t('t_applied_all'));
});
$('moveLeftBtn').addEventListener('click',()=>moveFrame(-1));
$('moveRightBtn').addEventListener('click',()=>moveFrame(1));
function moveFrame(dir){
  const i=state.selected, j=i+dir;
  if(i<0||j<0||j>=state.frames.length)return;
  [state.frames[i],state.frames[j]]=[state.frames[j],state.frames[i]];
  state.anchor=j; setSel([j], j); renderSheet(); updateInspector();
}
$('delFrameBtn').addEventListener('click',()=>{
  const list=selList(); if(!list.length)return;
  const firstGone=Math.min(...list);
  [...list].sort((a,b)=>b-a).forEach(idx=>state.frames.splice(idx,1)); // remove high→low
  if(!state.frames.length){ resetStage(); return; }
  const ni=clamp(firstGone,0,state.frames.length-1);
  state.anchor=ni; setSel([ni], ni);
  preview.idx=clamp(preview.idx,0,state.frames.length-1);
  renderSheet(); updateInspector(); drawPreviewFrame(preview.idx);
});

/* ---------------- copy / paste / duplicate frames ---------------- */
// snapshot shares the immutable source bitmap but copies the per-frame transform,
// so edits to the copy never touch the original.
function snapshotFrame(f){ return {bmp:f.bmp, natW:f.natW, natH:f.natH, ox:f.ox, oy:f.oy, scale:f.scale}; }
function copyFrame(){
  const list=selList(); if(!list.length){ toast(t('t_select_first')); return; }
  state.clipboard=list.map(i=>snapshotFrame(state.frames[i]));   // preserves order
  renderSheet();                       // light up the blank-cell paste targets
  toast(t('t_copied',{n:list.length}));
}
function insertFrames(snaps, at){
  const arr=snaps.map(s=>({...s, keyed:null}));
  state.frames.splice(at,0,...arr);
  const idx=arr.map((_,k)=>at+k);
  state.anchor=at; setSel(idx, at+arr.length-1);
  preview.idx=clamp(preview.idx,0,state.frames.length-1);
  renderSheet(); updateInspector(); if(!preview.playing) drawPreviewFrame(preview.idx);
  return arr.length;
}
function pasteFrame(append){
  if(!state.clipboard || !state.clipboard.length){ toast(t('t_clip_empty')); return; }
  const at=(append || state.selected<0) ? state.frames.length : state.selected+1;
  const n=insertFrames(state.clipboard, at);
  toast(t('t_pasted',{n:n}));
}
function duplicateSelected(){
  const list=selList(); if(!list.length){ toast(t('t_select_first')); return; }
  const n=insertFrames(list.map(i=>snapshotFrame(state.frames[i])), Math.max(...list)+1);
  toast(t('t_duped',{n:n}));
}
$('copyFrameBtn').addEventListener('click',copyFrame);
$('pasteFrameBtn').addEventListener('click',()=>pasteFrame(false));
$('dupFrameBtn').addEventListener('click',duplicateSelected);
// arrow-key nudge
window.addEventListener('keydown',e=>{
  if(state.selected<0)return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    if(['INPUT','SELECT'].includes(document.activeElement.tagName))return;
    e.preventDefault();
    withSel(f=>{
      if(e.key==='ArrowLeft')f.ox-=1; if(e.key==='ArrowRight')f.ox+=1;
      if(e.key==='ArrowUp')f.oy-=1; if(e.key==='ArrowDown')f.oy+=1;
    });
  }
});
// copy / paste / duplicate shortcuts (⌘/Ctrl + C / V / D)
window.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if(!(e.metaKey||e.ctrlKey)) return;
  const k=e.key.toLowerCase();
  if(k==='c' && state.selected>=0){ copyFrame(); e.preventDefault(); }
  else if(k==='v' && state.clipboard){ pasteFrame(false); e.preventDefault(); }
  else if(k==='d' && state.selected>=0){ duplicateSelected(); e.preventDefault(); }
  else if(k==='a' && state.frames.length){ state.anchor=0; setSel(state.frames.map((_,i)=>i), state.frames.length-1); updateInspector(); renderSheet(); e.preventDefault(); }
});

/* ---------------- preview playback ---------------- */
const pv=$('preview'), pctx=pv.getContext('2d');
function drawPreviewFrame(i){
  if(!state.frames.length)return;
  i=clamp(i,0,state.frames.length-1); preview.idx=i;
  pv.width=state.fw; pv.height=state.fh;
  pctx.imageSmoothingEnabled=true; pctx.imageSmoothingQuality='high';
  paintBackground(pctx,state.fw,state.fh);
  drawFrame(pctx,state.frames[i],0,0);
  // keep preview visually reasonable
  const maxDisp=260, sc=Math.min(maxDisp/state.fw, maxDisp/state.fh, 2);
  pv.style.width=(state.fw*sc)+'px';
}
function loopPreview(ts){
  if(!preview.playing)return;
  if(!preview.last)preview.last=ts;
  const dt=ts-preview.last; preview.last=ts;
  preview.acc+=dt;
  const frameMs=1000/preview.fps;
  while(preview.acc>=frameMs){
    preview.acc-=frameMs;
    let next=preview.idx+1;
    if(next>=state.frames.length){
      if(preview.loop) next=0;
      else { stopPreview(); drawPreviewFrame(state.frames.length-1); return; }
    }
    drawPreviewFrame(next);
  }
  preview.raf=requestAnimationFrame(loopPreview);
}
function startPreview(){
  if(!state.frames.length)return;
  preview.playing=true; preview.last=0; preview.acc=0;
  $('playBtn').textContent=t('pause'); $('playBtn').classList.add('primary');
  preview.raf=requestAnimationFrame(loopPreview);
}
function stopPreview(){
  preview.playing=false; cancelAnimationFrame(preview.raf);
  $('playBtn').textContent=t('play');
}
$('playBtn').addEventListener('click',()=>{ preview.playing?stopPreview():startPreview(); });
$('stepBtn').addEventListener('click',()=>{ stopPreview(); drawPreviewFrame((preview.idx+1)%state.frames.length); });
$('pvFps').addEventListener('input',e=>{ preview.fps=+e.target.value; $('pvFpsVal').textContent=e.target.value; });

/* ---------------- params live-binding ---------------- */
function reflow(){
  const pfw=state.fw, pfh=state.fh;
  syncParams();
  // when the frame size changes, scale per-frame offsets proportionally so manual
  // alignment stays meaningful instead of drifting (offsets are absolute sheet pixels)
  if(state.frames.length && pfw>0 && pfh>0 && (pfw!==state.fw||pfh!==state.fh)){
    const rx=state.fw/pfw, ry=state.fh/pfh;
    state.frames.forEach(f=>{ f.ox*=rx; f.oy*=ry; });
  }
  if(state.frames.length){
    renderSheet(); drawPreviewFrame(preview.idx);
    if(state.selected>=0) syncInspectorValues();
  }
}
$('fps').addEventListener('input',()=>{$('fpsRange').value=$('fps').value;});
$('fpsRange').addEventListener('input',()=>{$('fps').value=$('fpsRange').value;});
['fw','fh','cols'].forEach(id=>$(id).addEventListener('input',reflow));
$('fit').addEventListener('change',reflow);
$('autoCols').addEventListener('change',()=>{ $('cols').disabled=$('autoCols').checked; reflow(); });
$('bgSeg').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  [...$('bgSeg').children].forEach(x=>x.classList.toggle('active',x===b));
  state.bg=b.dataset.bg;
  $('bgColor').style.display=state.bg==='color'?'block':'none';
  reflow();
});
$('bgColor').addEventListener('input',()=>{ state.bgColor=$('bgColor').value; reflow(); });

/* ---------------- background-removal controls ---------------- */
$('keyOn').addEventListener('change',()=>{
  state.key.on=$('keyOn').checked;
  $('keyBody').style.display=state.key.on?'block':'none';
  if(!state.key.on){ state.pickMode=false; exitPickMode(); }
  if(state.key.on && state.bg==='color') toast(t('t_alpha_tip'));
  invalidateKeys();
  if(state.frames.length){ renderSheet(); drawPreviewFrame(preview.idx); }
});
$('keyColor').addEventListener('input',()=>{ state.key.color=$('keyColor').value; scheduleKeyRefresh(); });
$('keyTol').addEventListener('input',()=>{ state.key.tol=+$('keyTol').value/100; $('keyTolVal').textContent=$('keyTol').value+'%'; scheduleKeyRefresh(); });
$('keySoft').addEventListener('input',()=>{ state.key.soft=+$('keySoft').value/100; $('keySoftVal').textContent=$('keySoft').value+'%'; scheduleKeyRefresh(); });
$('keyDespill').addEventListener('change',()=>{ state.key.despill=$('keyDespill').checked; scheduleKeyRefresh(); });
$('keyPick').addEventListener('click',()=>{ if(!state.frames.length){ toast(t('t_make_first')); return; } state.pickMode?exitPickMode():enterPickMode(); });
$('keyAuto').addEventListener('click',()=>{
  if(!state.frames.length){ toast(t('t_make_first')); return; }
  const f=state.frames[0];
  const pts=[[0,0],[f.natW-1,0],[0,f.natH-1],[f.natW-1,f.natH-1]];
  let r=0,g=0,b=0;
  pts.forEach(([sx,sy])=>{ const h=samplePixel(f,sx,sy); r+=parseInt(h.slice(1,3),16); g+=parseInt(h.slice(3,5),16); b+=parseInt(h.slice(5,7),16); });
  const hex='#'+[r,g,b].map(v=>Math.round(v/4).toString(16).padStart(2,'0')).join('');
  state.key.color=hex; $('keyColor').value=hex; scheduleKeyRefresh(); toast(t('t_picked_corner',{hex:hex}));
});

/* ---------------- export ---------------- */
function buildExportCanvas(){
  const n=state.frames.length; const {cols,rows}=gridDims();
  const W=cols*state.fw,H=rows*state.fh;
  if(canvasTooBig(W,H)) return null;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high';
  if(state.bg==='color'){ x.fillStyle=state.bgColor; x.fillRect(0,0,W,H); }
  for(let i=0;i<n;i++){
    const col=i%cols,row=Math.floor(i/cols);
    drawFrame(x,state.frames[i],col*state.fw,row*state.fh);
  }
  return {canvas:c,cols,rows,W,H};
}
$('exportPngBtn').addEventListener('click',()=>{
  if(!state.frames.length)return;
  const r=buildExportCanvas();
  if(!r){ toast(t('export_too_big')); return; }
  r.canvas.toBlob(blob=>{
    if(!blob){ toast(t('export_encode_fail')); return; }
    download(blob,'spritesheet.png'); toast(t('t_exported_png'));
  },'image/png');
});
$('exportJsonBtn').addEventListener('click',()=>{
  if(!state.frames.length)return;
  const r=buildExportCanvas();
  if(!r){ toast(t('export_too_big')); return; }
  const {cols,rows,W,H}=r;
  const frames={};
  state.frames.forEach((f,i)=>{
    const col=i%cols,row=Math.floor(i/cols);
    frames['frame_'+String(i).padStart(3,'0')]={
      frame:{x:col*state.fw,y:row*state.fh,w:state.fw,h:state.fh},
      sourceSize:{w:state.fw,h:state.fh}
    };
  });
  const meta={
    app:'Sprite Sheet Maker', image:'spritesheet.png',
    format:'RGBA8888', size:{w:W,h:H}, scale:1,
    grid:{columns:cols,rows:rows}, frameCount:state.frames.length,
    fps:+$('fps').value||12
  };
  download(new Blob([JSON.stringify({frames,meta},null,2)],{type:'application/json'}),'spritesheet.json');
  toast(t('t_exported_json'));
});
function download(blob,name){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

/* ---------------- game-engine exports ---------------- */
function hex32(){ const a=new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(b=>b.toString(16).padStart(2,'0')).join(''); }

// Godot 4 SpriteFrames (.tres): drop with spritesheet.png, assign to AnimatedSprite2D.
// Godot texture coords are top-left origin → no Y flip needed.
function exportGodotTres(){
  if(!state.frames.length) return;
  const {cols}=gridDims(); const n=state.frames.length;
  const fps=clamp(+$('fps').value||12,1,60);
  const id='1_sheet';
  let s=`[gd_resource type="SpriteFrames" load_steps=${n+2} format=3]\n\n`;
  s+=`[ext_resource type="Texture2D" path="res://spritesheet.png" id="${id}"]\n\n`;
  for(let i=0;i<n;i++){
    const col=i%cols, row=Math.floor(i/cols);
    s+=`[sub_resource type="AtlasTexture" id="AtlasTexture_${i}"]\n`;
    s+=`atlas = ExtResource("${id}")\n`;
    s+=`region = Rect2(${col*state.fw}, ${row*state.fh}, ${state.fw}, ${state.fh})\n\n`;
  }
  const fr=[];
  for(let i=0;i<n;i++) fr.push(`{\n"duration": 1.0,\n"texture": SubResource("AtlasTexture_${i}")\n}`);
  s+=`[resource]\nanimations = [{\n"frames": [${fr.join(', ')}],\n"loop": true,\n"name": &"default",\n"speed": ${fps}.0\n}]\n`;
  download(new Blob([s],{type:'text/plain'}),'spritesheet.tres');
  toast(t('t_exported_godot'));
}

// Unity texture meta (.png.meta): auto-slices the grid on import.
// Unity rects use bottom-left origin → flip Y.
function exportUnityMeta(){
  if(!state.frames.length) return;
  const {cols,rows}=gridDims(); const n=state.frames.length;
  const H=rows*state.fh;
  const guid=hex32(), sprites=[], idTable=[], nameTable=[];
  for(let i=0;i<n;i++){
    const col=i%cols, row=Math.floor(i/cols);
    const x=col*state.fw, y=H-(row+1)*state.fh;     // flip to bottom-left origin
    const name='spritesheet_'+i, internalID=21300000+i, spriteID=hex32();
    sprites.push(
`    - serializedVersion: 2
      name: ${name}
      rect:
        serializedVersion: 2
        x: ${x}
        y: ${y}
        width: ${state.fw}
        height: ${state.fh}
      alignment: 0
      pivot: {x: 0.5, y: 0.5}
      border: {x: 0, y: 0, z: 0, w: 0}
      outline: []
      physicsShape: []
      tessellationDetail: 0
      bones: []
      spriteID: ${spriteID}
      internalID: ${internalID}
      vertices: []
      indices:
      edges: []
      weights: []`);
    idTable.push(`  - first:\n      213: ${internalID}\n    second: ${name}`);
    nameTable.push(`      ${name}: ${internalID}`);
  }
  const meta=
`fileFormatVersion: 2
guid: ${guid}
TextureImporter:
  internalIDToNameTable:
${idTable.join('\n')}
  externalObjects: {}
  serializedVersion: 11
  mipmaps:
    mipMapMode: 0
    enableMipMap: 0
    sRGBTexture: 1
    linearTexture: 0
    fadeOut: 0
    borderMipMap: 0
    mipMapsPreserveCoverage: 0
    alphaTestReferenceValue: 0.5
    mipMapFadeDistanceStart: 1
    mipMapFadeDistanceEnd: 3
  bumpmap:
    convertToNormalMap: 0
    externalNormalMap: 0
    heightScale: 0.25
    normalMapFilter: 0
  isReadable: 0
  streamingMipmaps: 0
  streamingMipmapsPriority: 0
  grayScaleToAlpha: 0
  generateCubemap: 6
  cubemapConvolution: 0
  seamlessCubemap: 0
  textureFormat: 1
  maxTextureSize: 2048
  textureSettings:
    serializedVersion: 2
    filterMode: 0
    aniso: 1
    mipBias: 0
    wrapU: 1
    wrapV: 1
  nPOTScale: 0
  lightmap: 0
  compressionQuality: 50
  spriteMode: 2
  spriteExtrude: 1
  spriteMeshType: 1
  alignment: 0
  spritePivot: {x: 0.5, y: 0.5}
  spritePixelsToUnits: 100
  spriteBorder: {x: 0, y: 0, z: 0, w: 0}
  spriteGenerateFallbackPhysicsShape: 1
  alphaUsage: 1
  alphaIsTransparency: 1
  spriteTessellationDetail: -1
  textureType: 8
  textureShape: 1
  singleChannelComponent: 0
  maxTextureSizeSet: 0
  compressionQualitySet: 0
  textureFormatSet: 0
  platformSettings:
  - serializedVersion: 3
    buildTarget: DefaultTexturePlatform
    maxTextureSize: 2048
    resizeAlgorithm: 0
    textureFormat: -1
    textureCompression: 1
    compressionQuality: 50
    crunchedCompression: 0
    allowsAlphaSplitting: 0
    overridden: 0
    androidETC2FallbackOverride: 0
    forceMaximumCompressionQuality_BC6H_BC7: 0
  spriteSheet:
    serializedVersion: 2
    sprites:
${sprites.join('\n')}
    outline: []
    customData:
    physicsShape: []
    bones: []
    spriteID:
    internalID: 0
    vertices: []
    indices:
    edges: []
    weights: []
    secondaryTextures: []
    nameFileIdTable:
${nameTable.join('\n')}
  spritePackingTag:
  pSDRemoveMatte: 0
  pSDShowRemoveMatteOption: 0
  userData:
  assetBundleName:
  assetBundleVariant:
`;
  download(new Blob([meta],{type:'application/x-yaml'}),'spritesheet.png.meta');
  toast(t('t_exported_unity'));
}
$('exportGodot').addEventListener('click',exportGodotTres);
$('exportUnity').addEventListener('click',exportUnityMeta);

/* ---------------- reset ---------------- */
function resetStage(){
  stopPreview();
  if(state.pickMode) exitPickMode();
  state.frames=[]; clearSel(); state.clipboard=null;
  $('sheet').style.display='none'; $('noStage').style.display='block';
  $('stageBar').style.display='none';
  $('exportPngBtn').disabled=$('exportJsonBtn').disabled=true;
  $('exportGodot').disabled=$('exportUnity').disabled=true;
  $('playBtn').disabled=$('stepBtn').disabled=true;
  $('preview').style.display='none'; $('previewEmpty').style.display='block';
  updateInspector();
}
$('resetBtn').addEventListener('click',()=>{
  resetStage();           // clear frames + stage UI
  clearStagedSource();    // revoke object URLs, clear input state
  applySourceUI('video'); // restore default source tab / field states
  toast(t('t_reset'));
});

/* ---------------- language switching ---------------- */
// Re-render every string that is set dynamically in JS (not via data-i18n) for the
// current language. Called on init and whenever the language changes.
function refreshDynamicI18n(){
  applySourceUI(state.sourceType);                       // localized drop labels + extract button
  if(state.loaded && state.upload) markUploaded(state.upload);
  if(state.srcInfoKey) setSrcInfo(state.srcInfoKey, state.srcInfoParams);
  $('playBtn').textContent = preview.playing ? t('pause') : t('play');
  if(state.frames.length){
    const {cols,rows}=gridDims();
    $('engineHint').innerHTML=t('engine_ready',{cols:cols,rows:rows,fw:state.fw,fh:state.fh});
    renderSheet();                                        // status badges (bSel)
  }
  updateInspector();                                      // per-frame index text
}
window.onLangChange = refreshDynamicI18n;
$('langSel').value = currentLang();
$('langSel').addEventListener('change', e=>setLang(e.target.value));

// init defaults
syncParams();
refreshDynamicI18n();

/* ---------------- PWA: service worker + install prompt ---------------- */
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW register failed',e));
  });
}
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredPrompt=e;
  const b=$('installBtn'); if(b) b.style.display='inline-flex';
});
(function(){ const b=$('installBtn'); if(!b) return;
  b.addEventListener('click', async()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt(); await deferredPrompt.userChoice;
    deferredPrompt=null; b.style.display='none';
  });
})();
window.addEventListener('appinstalled',()=>{ const b=$('installBtn'); if(b) b.style.display='none'; });
