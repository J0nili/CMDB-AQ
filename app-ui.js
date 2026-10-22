
// === CMDB v14 UI — Selection, Edit, Keys, Panel, Events, INIT — FIXED ===
function getCellCoords(e){
var cell=e.target.closest('.virtual-cell');
if(!cell)return null;
var row=cell.parentElement;
if(!row||!row.dataset.di)return null;
var di=parseInt(row.dataset.di);
var ci=0,node=cell;
while((node=node.previousElementSibling)!==null){if(node.style.display!=='none')ci++}
return{r:di,c:ci,cell:cell};
}

function onCellClick(e){
if(e.button!==0)return;
e.preventDefault();hideCtx();
var co=getCellCoords(e);if(!co)return;
if(editCell)commitEdit();
if(co.c===0){
var maxC=vs.cw.length-1;
if(e.shiftKey&&selAnch){
var r1=Math.min(selAnch.r,co.r),r2=Math.max(selAnch.r,co.r);
if(!e.ctrlKey&&!e.metaKey)sel.clear();
for(var rr=r1;rr<=r2;rr++)for(var cc=1;cc<=maxC;cc++)sel.add(rr+':'+cc);
}else if(e.ctrlKey||e.metaKey){
var allSel=true;
for(var cc2=1;cc2<=maxC;cc2++){if(!sel.has(co.r+':'+cc2)){allSel=false;break}}
for(var cc3=1;cc3<=maxC;cc3++){if(allSel)sel.delete(co.r+':'+cc3);else sel.add(co.r+':'+cc3)}
selAnch={r:co.r,c:1};
}else{
sel.clear();
for(var cc4=1;cc4<=maxC;cc4++)sel.add(co.r+':'+cc4);
selAnch={r:co.r,c:1};
}
isDragging=true;dragStart={r:co.r,c:0,mode:'row'};
updSelInfo();applySel();return;
}
if(e.shiftKey&&selAnch){
var r1b=Math.min(selAnch.r,co.r),r2b=Math.max(selAnch.r,co.r);
var c1b=Math.min(selAnch.c,co.c),c2b=Math.max(selAnch.c,co.c);
if(!e.ctrlKey&&!e.metaKey)sel.clear();
for(var rb=r1b;rb<=r2b;rb++)for(var cb=c1b;cb<=c2b;cb++)sel.add(rb+':'+cb);
}else if(e.ctrlKey||e.metaKey){
var k=co.r+':'+co.c;
if(sel.has(k))sel.delete(k);else sel.add(k);
selAnch={r:co.r,c:co.c};
}else{
sel.clear();sel.add(co.r+':'+co.c);
selAnch={r:co.r,c:co.c};
}
isDragging=true;dragStart={r:co.r,c:co.c,mode:'cell',ctrl:e.ctrlKey||e.metaKey};
updSelInfo();applySel();
}

function onCellDrag(e){
if(!isDragging||!dragStart)return;
e.preventDefault();
var co=getCellCoords(e);if(!co)return;
if(dragStart.mode==='row'){
var r1=Math.min(dragStart.r,co.r),r2=Math.max(dragStart.r,co.r),maxC=vs.cw.length-1;
sel.clear();
for(var r=r1;r<=r2;r++)for(var c=1;c<=maxC;c++)sel.add(r+':'+c);
updSelInfo();applySel();
}else{
if(!selAnch)return;
var r1b=Math.min(selAnch.r,co.r),r2b=Math.max(selAnch.r,co.r);
var c1b=Math.min(selAnch.c,co.c<1?1:co.c),c2b=Math.max(selAnch.c,co.c<1?1:co.c);
if(!dragStart.ctrl)sel.clear();
for(var rb=r1b;rb<=r2b;rb++)for(var cb=c1b;cb<=c2b;cb++)sel.add(rb+':'+cb);
updSelInfo();applySel();
}
}

function onCellUp(){isDragging=false;dragStart=null}

function onCellDbl(e){
var co=getCellCoords(e);if(!co||co.c===0)return;
if(mode==='raw')startEdit(co);
else{var txt=co.cell.textContent;if(txt)clipCopy(txt).then(function(){toast('\ud83d\udccb '+txt.substring(0,20))})}
}

function clearSel(){sel.clear();selAnch=null;commitEdit();updSelInfo();applySel()}

function updSelInfo(){
var n=sel.size;
$('selCnt').textContent=n;
$('selInfo').classList.toggle('show',n>0);
}

function selAll(){
sel.clear();
for(var r=0;r<vs.total;r++)for(var c=1;c<vs.cw.length;c++)sel.add(r+':'+c);
selAnch=vs.total>0?{r:0,c:1}:null;
updSelInfo();applySel();
}

function clipCopy(txt){
if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(txt).catch(function(){fallbackCopy(txt)});
return Promise.resolve(fallbackCopy(txt));
}

function clipRead(){
if(navigator.clipboard&&navigator.clipboard.readText)return navigator.clipboard.readText();
return Promise.reject('no clipboard');
}

function fallbackCopy(txt){
try{var ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta)}catch(e){}
}

function getCellText(r,c){
if(c===0)return String(r+1);
var rd=vs.data[r];if(!rd)return'';
if(vs.rt==='raw'){var cols=vs.rc||[];return c-1<cols.length?String(rd[cols[c-1]]||''):''}
if(vs.rt==='search'){
var sc=vs.sc||[];
if(c===1)return rd.type==='found'?'\u2713':'\u2717';
if(c===2)return rd.type==='found'?rd.sheet:'\u2014';
var si=c-3;return si<sc.length&&rd.type==='found'?String(rd.row[sc[si]]||''):(si===0&&rd.type==='nf'?rd.term:'');
}
if(vs.rt==='diff'){
if(c===1)return rd.type||'';
if(c===2)return rd.serial||'';
var di=c-3;
if(di<diffCols.length){return rd.row?String(rd.row[diffCols[di]]||''):''}
return rd.changes?rd.changes.length+' cambios':'';
}
if(vs.rt==='extra'){
if(c===1)return rd.serial||'';
if(c===2)return(rd.sheets||[]).join(', ');
if(c===3)return rd.status||'';
if(c===4)return rd.dias||'';
var os=selS.filter(function(s){return s!==mainS&&maps[s]});
var oi=c-5;return oi>=0&&oi<os.length&&rd.sheets.indexOf(os[oi])>=0?(rd.cv&&rd.cv.hostname&&rd.cv.hostname[os[oi]]||'\u2014'):'\u2014';
}
if(c===1)return rd.serial||'';
if(c===2)return rd.mSt||'';
if(c===3)return rd.mDias||'';
var ci=4,found=false,result='';
selS.forEach(function(s){
if(found||!maps[s])return;
if(ci===c){result=aTab==='serial'?(rd.v[s]&&rd.v[s].pr?'\u2713':'\u2717'):(rd.v[s]?rd.v[s].val||'':'');found=true}
ci++;
if(ci===c){result=rd.v[s]?rd.v[s].dias||'':'';found=true}
ci++;
});
if(found)return result;
return'';
}

function getSelText(){
if(!sel.size)return'';
var keys=Array.from(sel).map(function(k){return k.split(':').map(Number)});
var minR=Infinity,maxR=-1,minC=Infinity,maxC=-1;
keys.forEach(function(k){if(k[0]<minR)minR=k[0];if(k[0]>maxR)maxR=k[0];if(k[1]<minC)minC=k[1];if(k[1]>maxC)maxC=k[1]});
var lines=[];
for(var r=minR;r<=maxR;r++){var row=[];for(var c=minC;c<=maxC;c++)row.push(sel.has(r+':'+c)?getCellText(r,c):'');lines.push(row.join('\t'))}
return lines.join('\n');
}

function doCopy(){var txt=getSelText();if(!txt)return;clipCopy(txt).then(function(){toast('\ud83d\udccb '+sel.size)})}
function doCut(){doCopy();if(mode==='raw')doDelete()}

function doPaste(){
if(mode!=='raw'||!selAnch){toast('Solo en modo Hojas');return}
clipRead().then(function(txt){
if(!txt)return;
var lines=txt.split('\n').map(function(l){return l.split('\t')});
var cols=vs.rc||[];
for(var ri=0;ri<lines.length;ri++){
var dr=selAnch.r+ri;if(dr>=vs.data.length)break;
var row=vs.data[dr];
for(var ci=0;ci<lines[ri].length;ci++){
var dc=selAnch.c+ci;if(dc<1||dc>cols.length)continue;
var col=cols[dc-1],old=String(row[col]||'');
if(old!==lines[ri][ci]){undo.push({r:dr,col:col,old:old});row[col]=lines[ri][ci]}
}
}
vs.li=-1;vs.le=-1;vs.dirty=true;renderRows(vs.rt);toast('\ud83d\udccc');
}).catch(function(){toast('\u26a0\ufe0f Pegar no disponible')});
}

function doDelete(){
if(mode!=='raw'){toast('Solo en modo Hojas');return}
var cols=vs.rc||[];var cnt=0;
sel.forEach(function(k){
var p=k.split(':').map(Number);if(p[1]<1||p[1]>cols.length)return;
var row=vs.data[p[0]];if(!row)return;
var col=cols[p[1]-1],old=String(row[col]||'');
if(old){undo.push({r:p[0],col:col,old:old});row[col]='';cnt++}
});
vs.li=-1;vs.le=-1;vs.dirty=true;renderRows(vs.rt);toast('\ud83d\uddd1\ufe0f '+cnt);
}

function doUndo(){
if(!undo.length){toast('\u21a9\ufe0f \u2014');return}
var ch=undo.pop();
if(ch.r!==undefined){var row=vs.data[ch.r];if(row)row[ch.col]=ch.old}
vs.li=-1;vs.le=-1;vs.dirty=true;renderRows(vs.rt);toast('\u21a9\ufe0f');
}

// === EDIT ===
function startEdit(co){
commitEdit();if(mode!=='raw')return;
var cols=vs.rc||[];if(co.c<1||co.c>cols.length)return;
var colN=cols[co.c-1],rd=vs.data[co.r];if(!rd)return;
var old=String(rd[colN]||'');
editCell={r:co.r,c:co.c,col:colN,old:old};
co.cell.className='virtual-cell cell-editing';co.cell.innerHTML='';
var inp=document.createElement('input');inp.type='text';inp.value=old;
inp.onkeydown=function(ev){if(ev.key==='Enter'){ev.preventDefault();commitEdit()}else if(ev.key==='Escape')cancelEdit()};
inp.onblur=function(){setTimeout(function(){if(editCell)commitEdit()},100)};
co.cell.appendChild(inp);inp.focus();inp.select();
}

function commitEdit(){
if(!editCell)return;var ec=editCell;editCell=null;
var f=findCell(ec.r,ec.c);if(!f)return;
var inp=f.querySelector('input');var nv=inp?inp.value:'';
if(nv!==ec.old){var rd=vs.data[ec.r];if(rd){undo.push({r:ec.r,col:ec.col,old:ec.old});if(undo.length>MAX_U)undo.shift();rd[ec.col]=nv}}
f.className='virtual-cell';f.style.width=vs.cw[ec.c]+'px';f.innerHTML='';f.textContent=nv||'';
}

function cancelEdit(){
if(!editCell)return;var ec=editCell;editCell=null;
var f=findCell(ec.r,ec.c);if(!f)return;
f.className='virtual-cell';f.style.width=vs.cw[ec.c]+'px';f.innerHTML='';f.textContent=ec.old;
}

function findCell(r,c){
var found=null;
poolAct.forEach(function(pi,di){
if(di===r&&pool[pi]){var cn=0;for(var k=0;k<pool[pi].cells.length;k++){if(pool[pi].cells[k].style.display!=='none'){if(cn===c){found=pool[pi].cells[k];break}cn++}}}
});return found;
}

// === CONTEXT MENU ===
function onCtx(e){
e.preventDefault();
var co=getCellCoords(e);if(!co)return;
var k=co.r+':'+co.c;
if(!sel.has(k)){sel.clear();sel.add(k);selAnch={r:co.r,c:co.c};updSelInfo();applySel()}
var ir=mode==='raw';
$('ctxCutI').classList.toggle('disabled',!ir);
$('ctxPasteI').classList.toggle('disabled',!ir);
$('ctxDelI').classList.toggle('disabled',!ir);
$('ctxUndoI').classList.toggle('disabled',!undo.length);
var cm=$('ctxMenu');
cm.style.left=Math.min(e.clientX,window.innerWidth-200)+'px';
cm.style.top=Math.min(e.clientY,window.innerHeight-280)+'px';
cm.classList.add('show');
}

function hideCtx(){$('ctxMenu').classList.remove('show')}
function ctxCopy(){hideCtx();doCopy()}
function ctxCut(){hideCtx();doCut()}
function ctxPaste(){hideCtx();doPaste()}
function ctxDel(){hideCtx();doDelete()}
function ctxUndo(){hideCtx();doUndo()}

// === KEYBOARD ===
function setupKeys(){
document.addEventListener('keydown',function(e){
if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
if((e.ctrlKey||e.metaKey)&&e.key==='c'){e.preventDefault();doCopy()}
else if((e.ctrlKey||e.metaKey)&&e.key==='x'){e.preventDefault();doCut()}
else if((e.ctrlKey||e.metaKey)&&e.key==='v'){e.preventDefault();doPaste()}
else if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();doUndo()}
else if((e.ctrlKey||e.metaKey)&&e.key==='a'){e.preventDefault();selAll()}
else if(e.key==='Delete'||e.key==='Backspace'){if(sel.size){e.preventDefault();doDelete()}}
else if(e.key==='Escape'){clearSel();hideCtx()}
});
}

// === FILTER PANEL ===
function toggleFP(){$('filterPanel').classList.toggle('show')}

function setupFPDrag(){
var fp=$('filterPanel'),dh=$('fpDragH');if(!fp||!dh)return;
var ox=0,oy=0,sx=0,sy=0,dragging=false;
function md(e){
e.preventDefault();dragging=true;fp.classList.add('dragging');
var t=e.touches?e.touches[0]:e;sx=t.clientX;sy=t.clientY;
var r=fp.getBoundingClientRect();ox=r.left;oy=r.top;
fp.style.right='auto';fp.style.bottom='auto';fp.style.left=ox+'px';fp.style.top=oy+'px';
document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
document.addEventListener('touchmove',mm,{passive:false});document.addEventListener('touchend',mu);
}
function mm(e){
if(!dragging)return;e.preventDefault();
var t=e.touches?e.touches[0]:e;
var dx=t.clientX-sx,dy=t.clientY-sy;
var nl=Math.max(0,Math.min(ox+dx,window.innerWidth-50));
var nt=Math.max(0,Math.min(oy+dy,window.innerHeight-50));
fp.style.left=nl+'px';fp.style.top=nt+'px';
}
function mu(){
dragging=false;fp.classList.remove('dragging');
document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);
document.removeEventListener('touchmove',mm);document.removeEventListener('touchend',mu);
}
dh.addEventListener('mousedown',md);dh.addEventListener('touchstart',md,{passive:false});
}

function setupFPResize(){
var fp=$('filterPanel');if(!fp)return;
var dirs=['n','s','e','w','nw','ne','sw','se'];
dirs.forEach(function(dir){
var h=document.createElement('div');
h.className='fp-resize-handle fp-resize-'+dir;
fp.appendChild(h);
h.addEventListener('mousedown',function(e){
e.preventDefault();e.stopPropagation();
fp.classList.add('resizing');
var rect=fp.getBoundingClientRect();
var info={dir:dir,sx:e.clientX,sy:e.clientY,sw:rect.width,sh:rect.height,sl:rect.left,st:rect.top};
function rm(ev){
var dx=ev.clientX-info.sx,dy=ev.clientY-info.sy;
var nw=info.sw,nh=info.sh,nl=info.sl,nt=info.st;
if(dir.indexOf('e')>=0)nw=Math.max(200,info.sw+dx);
if(dir.indexOf('w')>=0){nw=Math.max(200,info.sw-dx);nl=info.sl+dx}
if(dir.indexOf('s')>=0)nh=Math.max(150,info.sh+dy);
if(dir.indexOf('n')>=0){nh=Math.max(150,info.sh-dy);nt=info.st+dy}
fp.style.width=nw+'px';fp.style.maxHeight=nh+'px';fp.style.height=nh+'px';
fp.style.right='auto';fp.style.bottom='auto';fp.style.left=nl+'px';fp.style.top=nt+'px';
}
function ru(){fp.classList.remove('resizing');document.removeEventListener('mousemove',rm);document.removeEventListener('mouseup',ru)}
document.addEventListener('mousemove',rm);document.addEventListener('mouseup',ru);
});
});
}

function setupMS(){
var fp=$('filterPanel');if(!fp||fp._delegated)return;
fp._delegated=true;
fp.addEventListener('click',function(e){
var btn=e.target.closest('.ms-btn');
if(btn){e.stopPropagation();var p=btn.nextElementSibling;
document.querySelectorAll('.ms-panel.show').forEach(function(x){if(x!==p)x.classList.remove('show')});
p.classList.toggle('show')}
});
fp.addEventListener('change',function(e){
if(e.target.type==='checkbox'){var panel=e.target.closest('.ms-panel');if(panel){updMSL(panel);updFilterBadge();applyFilters()}}
});
fp.addEventListener('change',function(e){
if(e.target.tagName==='SELECT'){updFilterBadge();if(mode==='compare'||mode==='raw'){vs.dirty=true;renderView()}}
});
}

function setupEvts(){
var expBtn=$('expBtn'),expMenu=$('expMenu');
if(expBtn&&expMenu){expBtn.addEventListener('click',function(e){e.stopPropagation();expMenu.classList.toggle('show')})}

var sInput=$('sInput');
if(sInput){var sTimer=null;sInput.addEventListener('input',function(){clearTimeout(sTimer);sTimer=setTimeout(function(){updFilterBadge();vs.dirty=true;renderView()},300)})}

var rawSInput=$('rawSInput');
if(rawSInput){var rTimer=null;rawSInput.addEventListener('input',function(){clearTimeout(rTimer);rTimer=setTimeout(function(){updFilterBadge();vs.dirty=true;renderView()},300)})}

var gSearchIn=$('gSearchIn');
if(gSearchIn){var gTimer=null;gSearchIn.addEventListener('input',function(){clearTimeout(gTimer);gTimer=setTimeout(function(){updFilterBadge();if(!bulkA)doSearch()},300)})}

var diffSInput=$('diffSInput');
if(diffSInput){var dTimer=null;diffSInput.addEventListener('input',function(){clearTimeout(dTimer);dTimer=setTimeout(function(){updFilterBadge();vs.dirty=true;renderView()},300)})}

var bTA=$('bTA');if(bTA){bTA.addEventListener('input',function(){updBC()})}
var rawCF=$('rawCF');if(rawCF){rawCF.addEventListener('change',function(){vs.dirty=true;renderView()})}

// FIX #6: diasSel now updates filter badge
var diasSel=$('diasSel');if(diasSel){diasSel.addEventListener('change',function(){updFilterBadge();vs.dirty=true;renderView()})}

document.addEventListener('click',function(e){
if(!e.target.closest('.ms-wrap')){document.querySelectorAll('.ms-panel.show').forEach(function(p){p.classList.remove('show')})}
if(!e.target.closest('.export-wrap')){var em=$('expMenu');if(em)em.classList.remove('show')}
if(!e.target.closest('.ctx-menu')){hideCtx()}
});

var resizeTimer=null;
window.addEventListener('resize',function(){clearTimeout(resizeTimer);resizeTimer=setTimeout(function(){calcVis();vs.dirty=true;renderView()},200)});
}

// === INIT ===
document.addEventListener('DOMContentLoaded',function(){
setupDD();
setupPrevDD();
setupKeys();
setupFPDrag();
setupFPResize();
setupMS();
setupEvts();
calcVis();
loadAll().then(function(hasData){
if(hasData){
rebuildSheetUI();
buildColMaps();
validateStruct();
buildMaps();
processData();
buildSearchSels();
if(prevSheets.length){buildPrevMaps();processDiff()}
buildTabs();
vs.dirty=true;
renderView();
}
});
});

