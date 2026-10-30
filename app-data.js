
// === CMDB v14.3 DATA — File I/O, Processing, Search, Export ===
function readSheet(ws){
for(var k in ws){if(k.charAt(0)==='!')continue;var c=ws[k];if(c&&c.t==='n'&&typeof c.w==='string'&&/E\+/i.test(c.w)&&isFinite(c.v))c.w=c.v.toLocaleString('fullwide',{useGrouping:false})}
return XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});
}
function setupDD(){
var dz=$('dzMini'),fi=$('fInput'),ov=$('dropOvr');
if(!dz||!fi)return;
dz.addEventListener('click',function(e){e.stopPropagation();fi.click()});
dz.addEventListener('dragover',function(e){e.preventDefault();e.stopPropagation();dz.classList.add('dragover')});
dz.addEventListener('dragleave',function(e){e.preventDefault();e.stopPropagation();dz.classList.remove('dragover')});
dz.addEventListener('drop',function(e){e.preventDefault();e.stopPropagation();dz.classList.remove('dragover');if(e.dataTransfer.files.length)processFile(e.dataTransfer.files[0])});
fi.addEventListener('change',function(e){if(e.target.files.length)processFile(e.target.files[0]);fi.value=''});
document.addEventListener('dragover',function(e){e.preventDefault();ov.classList.add('show')});
document.addEventListener('dragleave',function(e){if(e.relatedTarget===null||e.relatedTarget===document.documentElement)ov.classList.remove('show')});
ov.addEventListener('drop',function(e){e.preventDefault();ov.classList.remove('show');if(e.dataTransfer.files.length)processFile(e.dataTransfer.files[0])});
}
function setupPrevDD(){
var dz=$('dzPrev'),fi=$('fInputPrev');
if(!dz||!fi)return;
dz.addEventListener('click',function(e){e.stopPropagation();fi.click()});
dz.addEventListener('dragover',function(e){e.preventDefault();dz.classList.add('dragover')});
dz.addEventListener('dragleave',function(){dz.classList.remove('dragover')});
dz.addEventListener('drop',function(e){e.preventDefault();dz.classList.remove('dragover');if(e.dataTransfer.files.length)processPrevFile(e.dataTransfer.files[0])});
fi.addEventListener('change',function(e){if(e.target.files.length)processPrevFile(e.target.files[0]);fi.value=''});
}
// === WEB WORKER: lectura de libros fuera del hilo principal ===
var _loadSeq=0,_prevSeq=0;
function loadProg(m){var e=$('loadProg');if(e)e.textContent=m}
function xlsxUrl(){
var u=[].map.call(document.scripts,function(x){return x.src}).filter(function(x){return /xlsx[^\/]*\.js(\?|$)/i.test(x)});
for(var i=0;i<u.length;i++)if(/^https?:/i.test(u[i]))return u[i];
return u[0]||'';
}
function workerSrc(url){
return 'importScripts('+JSON.stringify(url)+');\n'+readSheet.toString()+'\n'+
'self.onmessage=function(e){try{var wb=XLSX.read(e.data.buf,{type:"array",cellDates:true,cellNF:true});var names=wb.SheetNames,out={},keep=[];'+
'for(var i=0;i<names.length;i++){self.postMessage({t:"p",i:i+1,n:names.length,s:names[i]});var ws=wb.Sheets[names[i]];if(!ws)continue;var d=readSheet(ws);if(d.length){out[names[i]]=d;keep.push(names[i])}}'+
'self.postMessage({t:"done",raw:out,sheets:keep})}catch(err){self.postMessage({t:"err",m:String(err&&err.message||err)})}};';
}
function parseWB(buf,onProg){
return new Promise(function(resolve,reject){
function fallback(){
try{
var wb=XLSX.read(buf,{type:'array',cellDates:true,cellNF:true}),out={},keep=[];
wb.SheetNames.forEach(function(sn,i){
if(onProg)onProg({i:i+1,n:wb.SheetNames.length,s:sn});
var ws=wb.Sheets[sn];if(!ws)return;
var d=readSheet(ws);if(d.length){out[sn]=d;keep.push(sn)}
});
resolve({raw:out,sheets:keep});
}catch(e){reject(e)}
}
if(typeof Worker==='undefined'||typeof Blob==='undefined'||!window.URL||!URL.createObjectURL)return fallback();
var url=xlsxUrl();if(!url)return fallback();
var w,bu,done=false;
function end(){done=true;try{w.terminate()}catch(e){}if(bu){try{URL.revokeObjectURL(bu)}catch(e){}}}
try{bu=URL.createObjectURL(new Blob([workerSrc(url)],{type:'application/javascript'}));w=new Worker(bu)}catch(e){return fallback()}
w.onmessage=function(e){
var m=e.data;
if(m.t==='p'){if(onProg)onProg(m)}
else if(m.t==='done'){end();resolve({raw:m.raw,sheets:m.sheets})}
else if(m.t==='err'){end();reject(new Error(m.m))}
};
w.onerror=function(){if(done)return;end();console.warn('Worker no disponible; leyendo en el hilo principal');fallback()};
w.postMessage({buf:buf});
});
}
function progTxt(m){return 'Hoja '+m.i+'/'+m.n+': '+m.s}
function processFile(file){
if(typeof XLSX==='undefined'){toast('\u26a0\ufe0f SheetJS no carg\u00f3 (revisa conexi\u00f3n o lib/)');return}
var seq=++_loadSeq,newName=file.name;
showLoad('Leyendo '+newName+'...');
var reader=new FileReader();
reader.onload=function(e){
loadProg('Analizando libro...');
parseWB(e.target.result,function(m){if(seq===_loadSeq)loadProg(progTxt(m))}).then(function(res){
if(seq!==_loadSeq)return;
fName=newName;
raw=res.raw;sheets=res.sheets;sIdxBuilt=false;sIdx={};sorts={compare:{},extra:{},raw:{},search:{},diff:{}};aTab='serial';rawSheet='';diffSheet='';sRes=[];sNF=[];bulkA=false;undo.length=0;colW={};
if(!sheets.length){hideLoad();toast('\u26a0\ufe0f Sin datos');return}
selS=sheets.slice(0,4);mainS=selS[0];
$('lastUpdate').textContent=new Date().toLocaleDateString('es-CO')+' \u2014 '+fName;
showLoad('Procesando...');
setTimeout(function(){
try{
rebuildSheetUI();buildColMaps();validateStruct();buildMaps();processData();buildSearchSels();
if(prevSheets.length){buildPrevMaps();processDiff()}
buildTabs();mode='compare';
document.querySelectorAll('.sb-mode').forEach(function(t){t.classList.toggle('active',t.dataset.mode==='compare')});
vs.dirty=true;renderView();hideLoad();saveAll();
}catch(err){hideLoad();toast('\u274c Error: '+err.message)}
},50);
}).catch(function(err){if(seq===_loadSeq){hideLoad();toast('\u274c Error: '+err.message)}});
};
reader.onerror=function(){hideLoad();toast('\u274c Error lectura')};
reader.readAsArrayBuffer(file);
}
function processPrevFile(file){
if(typeof XLSX==='undefined'){toast('\u26a0\ufe0f SheetJS no carg\u00f3 (revisa conexi\u00f3n o lib/)');return}
var seq=++_prevSeq,newName=file.name;
showLoad('Leyendo archivo anterior...');
var reader=new FileReader();
reader.onload=function(e){
parseWB(e.target.result,function(m){if(seq===_prevSeq)loadProg(progTxt(m))}).then(function(res){
if(seq!==_prevSeq)return;
prevFName=newName;prevRaw=res.raw;prevSheets=res.sheets;
$('prevFileLabel').textContent=prevFName;
buildPrevMaps();processDiff();
if(mode==='diff'){buildTabs();vs.dirty=true;renderView()}
updDiffBar();hideLoad();saveAll();toast('\u2705 Archivo anterior cargado');
}).catch(function(err){if(seq===_prevSeq){hideLoad();toast('\u274c Error: '+err.message)}});
};
reader.onerror=function(){hideLoad();toast('\u274c Error lectura')};
reader.readAsArrayBuffer(file);
}
function processData(){
_computeCol=null;cData={};exData=[];statuses=new Set();
if(!maps[mainS])return;
var mainMap=maps[mainS];
var pkCol=resolveCol(mainS,AL.serial);
var stCol=resolveCol(mainS,AL.status);
var diCol=resolveCol(mainS,AL.dias);
var allSerials=new Set();
mainMap.forEach(function(row,sn){allSerials.add(sn)});
function computeCol(col){
var colKey=col.m[mainS];
cData[col.id]=[];
allSerials.forEach(function(sn){
var mainRow=mainMap.get(sn);
var mSt=stCol?String(mainRow[stCol]||'').trim():'';
var mDias=diCol?String(mainRow[diCol]||'').trim():'';
if(mSt)statuses.add(mSt);
var entry={serial:mainRow[pkCol]||sn,mSt:mSt,mDias:mDias,v:{},status:'match',pSheets:[],sText:''};
var hasAny=false,allMatch=true,anyDiff=false;
selS.forEach(function(s){
if(!maps[s])return;
var cKey=col.m[s];
var sRow=maps[s].get(sn);
var diKey=resolveCol(s,AL.dias);
entry.v[s]={pr:!!sRow,av:!!cKey,val:sRow&&cKey?String(sRow[cKey]||'').trim():'',dias:sRow&&diKey?String(sRow[diKey]||'').trim():''};
if(sRow){entry.pSheets.push(s);hasAny=true}
if(cKey&&sRow){
var mv=col.m[mainS]?nC(String(mainRow[col.m[mainS]]||'')):'';
var sv=nC(entry.v[s].val);
if(col.m[mainS]&&col.id!=='dias'&&col.id!=='actualizado'&&isDiffV(mv,sv))anyDiff=true;
}else if(cKey&&!sRow)allMatch=false;
});
if(col.id==='serial')entry.status=entry.pSheets.length===selS.filter(function(s){return maps[s]}).length?'match':'miss';
else entry.status=anyDiff?'diff':allMatch?'match':'miss';
entry.sText=(entry.serial+' '+entry.mSt+' '+entry.mDias).toLowerCase();
cData[col.id].push(entry);
});
}
_computeCol=computeCol;computeCol(COLS[0]);
// Extra data
var mainKeys=new Set();
maps[mainS].forEach(function(v,k){mainKeys.add(k)});
var exMap=new Map();
selS.forEach(function(s){
if(s===mainS||!maps[s])return;
maps[s].forEach(function(row,sn){
if(mainKeys.has(sn))return;
if(!exMap.has(sn))exMap.set(sn,{serial:'',sheets:[],status:'',dias:'',cv:{}});
var ex=exMap.get(sn);
var pkC=resolveCol(s,AL.serial);
if(!ex.serial&&pkC)ex.serial=row[pkC]||sn;
ex.sheets.push(s);
var stC=resolveCol(s,AL.status);
var diC=resolveCol(s,AL.dias);
if(stC&&!ex.status)ex.status=String(row[stC]||'').trim();
if(diC&&!ex.dias)ex.dias=String(row[diC]||'').trim();
COLS.forEach(function(col){
var ck=col.m[s];
if(ck){if(!ex.cv[col.id])ex.cv[col.id]={};ex.cv[col.id][s]=String(row[ck]||'').trim()}
});
});
});
exMap.forEach(function(v){exData.push(v)});
updTot(allSerials.size,cData.serial?cData.serial.filter(function(r){return r.status==='match'}).length:0,cData.serial?cData.serial.filter(function(r){return r.status==='diff'}).length:0,cData.serial?cData.serial.filter(function(r){return r.status==='miss'||r.status==='partial'}).length:0,exData.length);
rebuildStatusF();rebuildOriginF();rebuildDiasF();
}
function ensureColData(colId){if(cData[colId])return;var col=COLS.filter(function(c){return c.id===colId})[0];if(!col)return;if(!_computeCol){processData();if(cData[colId])return}if(_computeCol)_computeCol(col)}
function updTot(t,m,d,mi,e){$('tS').textContent=t.toLocaleString();$('tM').textContent=m.toLocaleString();$('tD').textContent=d.toLocaleString();$('tMi').textContent=mi.toLocaleString();$('tE').textContent=e.toLocaleString()}
function updAllTot(){var rows=cData[aTab]||cData.serial;if(!rows)return;updTot(rows.length,rows.filter(function(r){return r.status==='match'}).length,rows.filter(function(r){return r.status==='diff'}).length,rows.filter(function(r){return r.status==='miss'||r.status==='partial'}).length,exData.length)}
// === SEARCH ===
function doSearch(){
var term=$('gSearchIn')?$('gSearchIn').value.trim():'';
if(!term){sRes=[];sNF=[];bulkA=false;$('sResBar').style.display='none';vs.dirty=true;renderView();return}
var col=$('gSearchCol')?$('gSearchCol').value:'__ALL__';
var sf=getSelV('msSSP');if(!sf.length)sf=sheets.filter(function(s){return raw[s]});
var terms=[term.toUpperCase()];
searchTerms(terms,col,sf);
}
function execBulk(){
var txt=$('bTA')?$('bTA').value:'';
if(!txt.trim()){toast('\u26a0\ufe0f Sin t\u00e9rminos');return}
var terms=txt.split(/[\n,\t]+/).map(function(t){return t.trim().toUpperCase()}).filter(function(t){return t});
if(!terms.length){toast('\u26a0\ufe0f Sin t\u00e9rminos');return}
var col=$('bSearchCol')?$('bSearchCol').value:'__ALL__';
var sn=$('bSearchS')?$('bSearchS').value:'__ALL__';
var sf=sn==='__ALL__'?sheets.filter(function(s){return raw[s]}):[sn];
bulkA=true;searchTerms(terms,col,sf);closeBulk();
switchMode('search');
}
function searchTerms(terms,col,sf){
var exact=bulkA;
return (exact?ensureSIdx():Promise.resolve()).then(function(){
sRes=[];sNF=[];
sf.forEach(function(s){
var rows=raw[s];if(!rows||!rows.length)return;
var cols=col==='__ALL__'?Object.keys(rows[0]):[col];
if(exact&&sIdx[s]){
terms.forEach(function(t){var seen=new Set();cols.forEach(function(c){var ix=sIdx[s][c];if(!ix)return;var l=ix.get(t);if(l)l.forEach(function(i){if(!seen.has(i)){seen.add(i);sRes.push({sheet:s,row:rows[i],term:t})}})})});
}else{
var txt=new Array(rows.length);
for(var i=0;i<rows.length;i++){var r=rows[i],p=[];for(var j=0;j<cols.length;j++)p.push(r[cols[j]]);txt[i]=p.join('\u0001').toUpperCase()}
terms.forEach(function(t){for(var i2=0;i2<txt.length;i2++)if(txt[i2].indexOf(t)>=0)sRes.push({sheet:s,row:rows[i2],term:t})});
}
});
var ft=new Set(sRes.map(function(r){return r.term}));
terms.forEach(function(t){if(!ft.has(t))sNF.push(t)});
if(sRes.length>SEARCH_LIMIT){sRes=sRes.slice(0,SEARCH_LIMIT);toast('\u26a0\ufe0f L\u00edmite: '+SEARCH_LIMIT+' resultados')}
$('sTermC').textContent=terms.length+' t\u00e9rminos';
$('sFoundT').textContent=sRes.length;
$('sNFT').textContent=sNF.length;
$('sResBar').style.display='flex';
vs.dirty=true;renderView();
});
}
function openBulk(){$('bulkModal').classList.add('show')}
function closeBulk(){$('bulkModal').classList.remove('show')}
function updBC(){var t=$('bTA')?$('bTA').value:'';var terms=t.split(/[\n,\t]+/).filter(function(t){return t.trim()});$('bCount').textContent=terms.length}
function clearSearch(){sRes=[];sNF=[];bulkA=false;$('sResBar').style.display='none';var gi=$('gSearchIn');if(gi)gi.value='';vs.dirty=true;renderView()}
// === DIFF ===
function updDiffBar(){
$('diffBar').style.display=mode==='diff'?'flex':'none';
$('diffPrevName').textContent=prevFName||'\u2014';
$('diffCurrName').textContent=fName||'\u2014';
var ta=0,tr=0,tm=0;
Object.keys(diffData).forEach(function(s){var d=diffData[s];ta+=d.added.length;tr+=d.removed.length;tm+=d.modified.length});
$('diffAdded').textContent=ta;$('diffRemoved').textContent=tr;$('diffModified').textContent=tm;
}
function processDiff(){
diffData={};
var allSheets=new Set();
sheets.forEach(function(s){allSheets.add(s)});
prevSheets.forEach(function(s){allSheets.add(s)});
allSheets.forEach(function(sn){
var curr=raw[sn]||[];
var prev=prevRaw[sn]||[];
var pkCurr=curr.length?resolveCol(sn,AL.serial):null;
var pkPrev=prev.length?resolveColFrom(prevRaw,sn,AL.serial):null;
if(!pkCurr&&!pkPrev){diffData[sn]={added:[],removed:[],modified:[],total:0,cols:[]};return}
var currMap=new Map();
if(pkCurr)curr.forEach(function(r){var k=nS(r[pkCurr]);if(k)currMap.set(k,r)});
var prevMap=new Map();
if(pkPrev)prev.forEach(function(r){var k=nS(r[pkPrev]);if(k)prevMap.set(k,r)});
var added=[],removed=[],modified=[];
var allCols=new Set();
currMap.forEach(function(row,sn2){
Object.keys(row).forEach(function(c){allCols.add(c)});
if(!prevMap.has(sn2))added.push({type:'added',serial:row[pkCurr]||sn2,row:row,changes:null});
else{
var prev2=prevMap.get(sn2);
var changes=[];var ign=!$('diffIgnore')||$('diffIgnore').checked;
Object.keys(row).forEach(function(c){
if(ign&&DIFF_IGNORE.indexOf(c.toLowerCase())>=0)return;var cv=String(row[c]||'').trim();
var pv=String(prev2[c]||'').trim();
if(cv!==pv)changes.push({col:c,oldVal:pv,newVal:cv});
});
if(changes.length)modified.push({type:'modified',serial:row[pkCurr]||sn2,row:row,changes:changes});
}
});
prevMap.forEach(function(row,sn2){
Object.keys(row).forEach(function(c){allCols.add(c)});
if(!currMap.has(sn2))removed.push({type:'removed',serial:row[pkPrev]||sn2,row:row,changes:null});
});
var cols=sortRC(Array.from(allCols).filter(function(c){return c.toLowerCase()!=='serial'&&!AL.serial.some(function(a){return a.toLowerCase()===c.toLowerCase()})}));
diffData[sn]={added:added,removed:removed,modified:modified,total:added.length+removed.length+modified.length,cols:cols};
});
if(!diffSheet&&sheets.length)diffSheet=sheets[0];
}
// === EXPORT ===
function csvCell(v){v=String(v==null?'':v);if(/^[=@]|^[+\-][^\d.\s]/.test(v))v="'"+v;return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function csvRow(a){return a.map(csvCell).join(',')+'\r\n'}
function baseName(){return (fName||'cmdb').replace(/\.[^.]+$/,'')}
function safeSN(wb,n){var b=String(n).replace(/[\[\]:*?\/\\]/g,'_').substring(0,31)||'Hoja',r=b,i=2;while(wb.SheetNames.indexOf(r)>=0){var sfx='~'+(i++);r=b.substring(0,31-sfx.length)+sfx}return r}
function exportCSV(){
if(mode==='raw'&&rawSheet&&raw[rawSheet]&&raw[rawSheet].length){
var data=raw[rawSheet],cols=Object.keys(data[0]);var csv='\ufeff'+csvRow(cols);
data.forEach(function(r){csv+=csvRow(cols.map(function(c){return r[c]}))});
dlFile(csv,rawSheet+'.csv','text/csv;charset=utf-8');toast('\ud83d\udcbe CSV');
}else if(mode==='compare'&&cData[aTab]){
var rows=vs.data&&vs.rt==='compare'?vs.data:cData[aTab];
var hdr=['Serial','Status','Dias'];selS.forEach(function(s){if(maps[s]){hdr.push(s);hdr.push(s+'_Dias')}});hdr.push('Estado');
var csv2='\ufeff'+csvRow(hdr);
rows.forEach(function(r){var line=[r.serial,r.mSt,r.mDias];selS.forEach(function(s){if(maps[s]){var v=r.v[s];line.push(v?v.val||'':'');line.push(v?v.dias||'':'')}});line.push(r.status);csv2+=csvRow(line)});
dlFile(csv2,'compare_'+aTab+'.csv','text/csv;charset=utf-8');toast('\ud83d\udcbe CSV');
}else toast('\u26a0\ufe0f Sin datos');
}
function exportExcel(){
if(!sheets.length){toast('\u26a0\ufe0f Sin datos');return}
var wb=XLSX.utils.book_new();
sheets.forEach(function(s){if(raw[s]){var ws=XLSX.utils.json_to_sheet(raw[s]);XLSX.utils.book_append_sheet(wb,ws,safeSN(wb,s))}});
if(cData.serial){
var compRows=cData.serial.map(function(r){
var o={Serial:r.serial,Status_Principal:r.mSt,Dias_Principal:r.mDias};
selS.forEach(function(s){if(maps[s]){var v=r.v[s];o[s+'_Presente']=v&&v.pr?'Si':'No';o[s+'_Dias']=v?v.dias:''}});
o.Estado=r.status;return o;
});
var ws2=XLSX.utils.json_to_sheet(compRows);XLSX.utils.book_append_sheet(wb,ws2,safeSN(wb,'Comparacion'));
}
XLSX.writeFile(wb,baseName()+'.xlsx');toast('\ud83d\udcbe Excel');
}
function exportJSON(){
if(!sheets.length){toast('\u26a0\ufe0f Sin datos');return}
var data={meta:{file:fName,date:new Date().toISOString(),mainSheet:mainS,sheets:sheets},raw:raw};
dlFile(JSON.stringify(data,null,2),'cmdb.json','application/json');toast('\ud83d\udcbe JSON');
}
function exportSearchRes(){
if(!sRes.length){toast('\u26a0\ufe0f Sin resultados');return}
var wb=XLSX.utils.book_new();
var data=sRes.map(function(r){var o={Hoja:r.sheet};Object.keys(r.row).forEach(function(k){o[k]=r.row[k]});return o});
var ws=XLSX.utils.json_to_sheet(data);XLSX.utils.book_append_sheet(wb,ws,'Resultados');
if(sNF.length){var ws2=XLSX.utils.json_to_sheet(sNF.map(function(t){return{Termino:t}}));XLSX.utils.book_append_sheet(wb,ws2,'No encontrados')}
XLSX.writeFile(wb,'busqueda.xlsx');toast('\ud83d\udcbe B\u00fasqueda');
}
function exportDiff(){
if(!Object.keys(diffData).length){toast('\u26a0\ufe0f Sin diff');return}
var wb=XLSX.utils.book_new();
Object.keys(diffData).forEach(function(sn){
var d=diffData[sn];if(!d.total)return;
var rows=[];
d.added.forEach(function(r){var o={Tipo:'Agregado',Serial:r.serial};if(r.row)Object.keys(r.row).forEach(function(k){o[k]=r.row[k]});rows.push(o)});
d.removed.forEach(function(r){var o={Tipo:'Eliminado',Serial:r.serial};if(r.row)Object.keys(r.row).forEach(function(k){o[k]=r.row[k]});rows.push(o)});
d.modified.forEach(function(r){var o={Tipo:'Modificado',Serial:r.serial,Cambios:r.changes?r.changes.map(function(c){return c.col+': '+c.oldVal+' > '+c.newVal}).join('; '):''};if(r.row)Object.keys(r.row).forEach(function(k){o[k]=r.row[k]});rows.push(o)});
if(rows.length){var ws=XLSX.utils.json_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,safeSN(wb,sn))}
});
XLSX.writeFile(wb,'diff_'+baseName()+'.xlsx');toast('\ud83d\udcbe Diff');
}

