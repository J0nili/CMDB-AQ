
// === CMDB v14.3 CORE — Variables, Utils, IDB, ColMaps, Filters, SheetUI ===
var DB='CMDB14',DBV=1,SN='store',ET='__extra__';
var KT={SvN:1,Snow:1,Syma:1,Disc:1};
var COLS=[{id:'serial',l:'Serial'},{id:'hostname',l:'Hostname'},{id:'placa',l:'Placa'},{id:'os',l:'OS'},{id:'status',l:'Status'},{id:'dias',l:'Dias'},{id:'actualizado',l:'Actualizado'},{id:'manufacturer',l:'Manufacturer'},{id:'model',l:'Model'},{id:'chassis',l:'Chassis'},{id:'disk',l:'Disk'},{id:'ram',l:'Ram'},{id:'ip',l:'IP'},{id:'empresa',l:'Empresa'},{id:'user',l:'User'},{id:'userid',l:'UserID'},{id:'ubicacion',l:'Ubicacion'},{id:'short_description',l:'short_description'},{id:'u_eol',l:'u_eol'},{id:'ohw',l:'O.HW'},{id:'oso',l:'O.So'},{id:'sheet',l:'Sheet'},{id:'lastloggedon',l:'Last logged on user'},{id:'mostfrequent',l:'Most frequent user'},{id:'architecture',l:'Architecture'},{id:'freedisk',l:'Free disk space'},{id:'freeram',l:'Free Ram'}];
COLS.forEach(function(c){c.m={}});
var AL={serial:['Serial','SERIAL','No. Serie'],hostname:['Hostname','HOSTNAME','Host','Computer Name'],placa:['Placa','PLACA','Asset Tag'],os:['OS','Operating System','S.O'],status:['Status','STATUS','Estado','State'],dias:['Dias','DIAS','Days'],actualizado:['Actualizado','Updated','Last Updated'],manufacturer:['Manufacturer','Fabricante'],model:['Model','Modelo'],chassis:['Chassis','Tipo','Type','Chassis Type'],disk:['Disk','Disco','HDD','SSD','Total disk space (GB)'],ram:['Ram','RAM','Memoria','Memory','Total RAM'],ip:['IP','IP Address'],empresa:['Empresa','Company'],user:['User','USER','Usuario'],userid:['UserID','User ID'],ubicacion:['Ubicacion','Ubicaci\u00f3n','Location','Office'],short_description:['short_description','Short Description'],u_eol:['u_eol','EOL'],ohw:['O.HW','OHW'],oso:['O.So','OSO'],sheet:['Sheet','Hoja'],lastloggedon:['Last logged on user'],mostfrequent:['Most frequent user'],architecture:['Architecture'],freedisk:['Free disk space'],freeram:['Free Ram','Free RAM']};
var RCO=['Serial','Hostname','Placa','OS','Status','Dias','Actualizado','Manufacturer','Model','Chassis','Disk','Ram','IP','Empresa','User','UserID','Ubicacion','short_description','u_eol','O.HW','O.So','Sheet','Last logged on user','Most frequent user','Architecture','Free disk space','Free Ram'];
var raw={},maps={},cData={},exData=[],aTab='serial',mode='compare',rawSheet='';
var sheets=[],selS=[],mainS='',statuses=new Set(),fName='';
// FIX: Added sorts.extra namespace
var sRes=[],sNF=[],bulkA=false,sorts={compare:{},extra:{},raw:{},search:{},diff:{}};
var scrollH=null,scrollE=null,sIdx={};
var pool=[],poolAct=new Map(),poolUsed=new Set(),freeList=[];
var vs={rh:34,vis:0,st:0,total:0,data:[],cw:[],rc:[],sc:[],rt:'compare',li:-1,le:-1,dirty:false};
// Seleccion por rangos: lista de rectangulos disjuntos [r1,r2,c1,c2]
function RangeSel(){this.rects=[]}
RangeSel.prototype.clear=function(){this.rects=[]};
RangeSel.prototype.has=function(r,c){var a=this.rects;for(var i=0;i<a.length;i++){var q=a[i];if(r>=q[0]&&r<=q[1]&&c>=q[2]&&c<=q[3])return true}return false};
RangeSel.prototype.deleteRect=function(r1,r2,c1,c2){
var out=[];
this.rects.forEach(function(q){
if(r2<q[0]||r1>q[1]||c2<q[2]||c1>q[3]){out.push(q);return}
if(r1>q[0])out.push([q[0],r1-1,q[2],q[3]]);
if(r2<q[1])out.push([r2+1,q[1],q[2],q[3]]);
var t=Math.max(r1,q[0]),b=Math.min(r2,q[1]);
if(c1>q[2])out.push([t,b,q[2],c1-1]);
if(c2<q[3])out.push([t,b,c2+1,q[3]]);
});
this.rects=out;
};
RangeSel.prototype.addRect=function(r1,r2,c1,c2){if(r1>r2||c1>c2)return;this.deleteRect(r1,r2,c1,c2);this.rects.push([r1,r2,c1,c2])};
RangeSel.prototype.covered=function(r1,r2,c1,c2){
var n=0;this.rects.forEach(function(q){var a=Math.max(r1,q[0]),b=Math.min(r2,q[1]),c=Math.max(c1,q[2]),d=Math.min(c2,q[3]);if(a<=b&&c<=d)n+=(b-a+1)*(d-c+1)});
return n===(r2-r1+1)*(c2-c1+1);
};
RangeSel.prototype.bounds=function(){
if(!this.rects.length)return null;
var b={r1:Infinity,r2:-1,c1:Infinity,c2:-1};
this.rects.forEach(function(q){if(q[0]<b.r1)b.r1=q[0];if(q[1]>b.r2)b.r2=q[1];if(q[2]<b.c1)b.c1=q[2];if(q[3]>b.c2)b.c2=q[3]});
return b;
};
RangeSel.prototype.each=function(fn){this.rects.forEach(function(q){for(var r=q[0];r<=q[1];r++)for(var c=q[2];c<=q[3];c++)fn(r,c)})};
Object.defineProperty(RangeSel.prototype,'size',{get:function(){var n=0;this.rects.forEach(function(q){n+=(q[1]-q[0]+1)*(q[3]-q[2]+1)});return n}});
var sel=new RangeSel(),selAnch=null,editCell=null,undo=[],MAX_U=50;
var SEARCH_LIMIT=5000,colResizing=null,isDragging=false,dragStart=null;
var STATUS_ALIASES=['status','Status','STATUS','Estado','State'];
var nsMap=new Map();
var collator=new Intl.Collator('es',{sensitivity:'base',numeric:true});
var sIdxBuilt=false;
var prevRaw={},prevSheets=[],prevFName='',prevMaps={};
var diffData={},diffSheet='',diffCols=[];
// Sidebar state
var sbPinned=true;
var colW={},dupCnt={},_computeCol=null,_saveQ=Promise.resolve(),_rcT=null,_toastT=null;
var DIFF_IGNORE=['dias','days','actualizado','updated','last updated'];
function colKey(rt,i){return rt+':'+(rt==='raw'?rawSheet:rt==='diff'?diffSheet:rt==='compare'?aTab:'')+':'+i}
function numOr(v,d){var n=parseFloat(v);return isNaN(n)?d:n}
function isDiffV(a,b){var ae=!a||a==='N/A',be=!b||b==='N/A';if(ae&&be)return false;return ae!==be||a!==b}
function statusClass(v){var l=String(v||'').toLowerCase();if(/\binstall|\binstalad|\bactiv|operaci/.test(l))return'green';if(/stock|existencia|quarantin|cuarentena/.test(l))return'orange';if(/retired|retirad|obsolet/.test(l))return'blue';if(/stolen|robad/.test(l))return'red';if(/tr[a\u00e1]nsit/.test(l))return'yellow';return'other'}
function warnDups(){var el=$('valWarn');if(!el)return;var m=el.querySelector('.msg'),d=el.querySelector('.dup-msg');if(!d){d=document.createElement('span');d.className='dup-msg';m.parentNode.insertBefore(d,m.nextSibling)}var l=Object.keys(dupCnt).map(function(s){return s+': '+dupCnt[s]});d.textContent=l.length?(m.textContent?' | ':'')+'\u26a0\ufe0f Seriales duplicados \u2192 '+l.join(', '):'';if(l.length)el.style.display='flex'}

function $(id){return document.getElementById(id)}
function nS(v){var s=String(v||'').trim();if(!s)return'';if(nsMap.has(s))return nsMap.get(s);var r=s.toUpperCase().replace(/[\s\u200B-\u200D\uFEFF\u00A0]+/g,'');nsMap.set(s,r);return r}
function nC(v){return String(v||'').trim().toUpperCase().replace(/\s+/g,' ').replace(/\.0$/,'').replace(/\s*(GB|MB|TB|GHZ|MHZ)/gi,'$1').replace(/,/g,'.')}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function isStatusCol(name){return STATUS_ALIASES.some(function(a){return name.toLowerCase()===a.toLowerCase()})}
function toast(m){var t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(_toastT);_toastT=setTimeout(function(){t.style.display='none'},2500)}
function showLoad(m){$('loadTxt').textContent=m;$('loadProg').textContent='';$('loadOvr').classList.add('show')}
function hideLoad(){$('loadOvr').classList.remove('show')}
function sortRC(cols){var om=new Map();RCO.forEach(function(c,i){om.set(c.toLowerCase(),i)});return cols.slice().sort(function(a,b){var oa=om.has(a.toLowerCase())?om.get(a.toLowerCase()):999;var ob=om.has(b.toLowerCase())?om.get(b.toLowerCase()):999;return oa!==ob?oa-ob:collator.compare(a,b)})}
function dlFile(c,n,t){var b=new Blob([c],{type:t}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;document.body.appendChild(a);a.click();setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(a.href)},1000)}
function diasRange(d){if(!d||d==='')return'empty';var n=parseFloat(d);if(isNaN(n))return'empty';if(n<0)return'negative';return n<=7?'0-7':n<=30?'8-30':n<=60?'31-60':'61+'}
function resolveCol(sn,aliases){return resolveColFrom(raw,sn,aliases)}
function resolveColFrom(data,sn,aliases){if(!data[sn]||!data[sn].length)return null;var keys=Object.keys(data[sn][0]);for(var i=0;i<aliases.length;i++)for(var j=0;j<keys.length;j++)if(keys[j].toLowerCase()===aliases[i].toLowerCase())return keys[j];return null}
// === INDEXEDDB ===
var _dbConn=null;function openDB(){if(_dbConn)return _dbConn;_dbConn=_openDB0();_dbConn.catch(function(){_dbConn=null});return _dbConn}
function _openDB0(){return new Promise(function(r,j){var q=indexedDB.open(DB,DBV);q.onupgradeneeded=function(e){var d=e.target.result;if(!d.objectStoreNames.contains(SN))d.createObjectStore(SN)};q.onsuccess=function(e){var d=e.target.result;d.onversionchange=function(){d.close();_dbConn=null};r(d)};q.onerror=function(e){j(e.target.error)}})}
function dbP(k,v){return openDB().then(function(d){return new Promise(function(r,j){var t=d.transaction(SN,'readwrite');t.objectStore(SN).put(v,k);t.oncomplete=function(){r()};t.onerror=function(e){j(e.target.error)}})})}
function dbG(k){return openDB().then(function(d){return new Promise(function(r,j){var t=d.transaction(SN,'readonly');var q=t.objectStore(SN).get(k);q.onsuccess=function(){r(q.result)};q.onerror=function(e){j(e.target.error)}})})}
function dbC(){return openDB().then(function(d){return new Promise(function(r,j){var t=d.transaction(SN,'readwrite');t.objectStore(SN).clear();t.oncomplete=function(){r()};t.onerror=function(e){j(e.target.error)}})})}
function saveAll(){setSS('saving');_saveQ=_saveQ.then(function(){return dbC()}).then(_saveAll0).catch(function(){setSS('error')});return _saveQ}
function _saveAll0(){var p=[];sheets.forEach(function(s){if(raw[s])p.push(dbP('s_'+s,raw[s]))});prevSheets.forEach(function(s){if(prevRaw[s])p.push(dbP('p_'+s,prevRaw[s]))});p.push(dbP('cfg',{selS:selS,mainS:mainS,fName:fName,sheets:sheets,prevSheets:prevSheets,prevFName:prevFName,ts:new Date().toISOString(),v:3}));return Promise.all(p).then(function(){setSS('ok');toast('\ud83d\udcbe')}).catch(function(){setSS('error')})}
function loadAll(){setSS('loading');return dbG('cfg').then(function(cfg){if(!cfg){setSS('empty');return false}sheets=cfg.sheets||[];selS=cfg.selS||[];mainS=cfg.mainS||'';fName=cfg.fName||'';prevSheets=cfg.prevSheets||[];prevFName=cfg.prevFName||'';if(cfg.ts)$('lastUpdate').textContent=new Date(cfg.ts).toLocaleDateString('es-CO')+(fName?' \u2014 '+fName:'');raw={};prevRaw={};var lp=Promise.all(sheets.map(function(s){return dbG('s_'+s).then(function(d){if(d)raw[s]=d})}));var lp2=Promise.all(prevSheets.map(function(s){return dbG('p_'+s).then(function(d){if(d)prevRaw[s]=d})}));return Promise.all([lp,lp2]).then(function(){var total=sheets.reduce(function(a,s){return a+(raw[s]?raw[s].length:0)},0);if(!total){setSS('empty');return false}selS=selS.filter(function(s){return raw[s]});if(!selS.length)selS=sheets.filter(function(s){return raw[s]}).slice(0,4);if(!raw[mainS]&&selS.length)mainS=selS[0];if(prevFName)$('prevFileLabel').textContent=prevFName;setSS('ok');return true})}).catch(function(){setSS('error');return false})}
// FIX: sorts.extra in clearAll
function clearAll(){if(!confirm('\u00bfLimpiar todos los datos?'))return;dbC().then(function(){raw={};maps={};cData={};exData=[];selS=[];mainS='';fName='';statuses=new Set();sheets=[];sRes=[];sNF=[];sorts={compare:{},extra:{},raw:{},search:{},diff:{}};nsMap.clear();sIdxBuilt=false;sIdx={};freeList.length=0;aTab='serial';rawSheet='';diffSheet='';undo.length=0;colW={};dupCnt={};rebuildStatusF();prevRaw={};prevSheets=[];prevFName='';prevMaps={};diffData={};$('lastUpdate').textContent='';$('prevFileLabel').textContent='';updTot(0,0,0,0,0);$('tblC').innerHTML='<div class="empty-state"><p style="font-size:40px">\ud83d\udcc2</p><p>Arrastra un archivo Excel</p></div>';switchMode('compare');setSS('empty');toast('\ud83d\uddd1\ufe0f')})}
function setSS(st){var d=$('sDot'),l=$('sLabel');var m={ok:['storage-dot','\u2713'],saving:['storage-dot warn','\u2026'],loading:['storage-dot warn','\u21bb'],empty:['storage-dot warn','\u2014'],error:['storage-dot err','\u2717']};if(m[st]){d.className=m[st][0];l.textContent=m[st][1]}}
// === COL MAPS ===
function buildColMaps(){COLS.forEach(function(col){col.m={};sheets.forEach(function(s){if(!raw[s]||!raw[s].length)return;var sc=Object.keys(raw[s][0]);var aliases=AL[col.id]||[col.l];var f=sc.find(function(c){return aliases.some(function(a){return a.toLowerCase()===c.toLowerCase()})});if(f)col.m[s]=f})})}
function validateStruct(){var w=[];sheets.forEach(function(s){if(!raw[s]||!raw[s].length)return;if(!resolveCol(s,AL.serial))w.push(s)});var el=$('valWarn');if(w.length){el.querySelector('.msg').textContent='\u26a0\ufe0f Sin columna Serial: '+w.join(', ');el.style.display='flex'}else{el.style.display='none';el.querySelector('.msg').textContent=''}}
function buildMaps(){maps={};nsMap.clear();dupCnt={};sheets.forEach(function(s){if(!raw[s])return;var pkCol=resolveCol(s,AL.serial);if(!pkCol){maps[s]=new Map();return}var m=new Map();for(var i=0;i<raw[s].length;i++){var k=nS(raw[s][i][pkCol]);if(k){if(m.has(k))dupCnt[s]=(dupCnt[s]||0)+1;m.set(k,raw[s][i])}}maps[s]=m});warnDups()}
function buildPrevMaps(){prevMaps={};prevSheets.forEach(function(s){if(!prevRaw[s])return;var pkCol=resolveColFrom(prevRaw,s,AL.serial);if(!pkCol){prevMaps[s]=new Map();return}var m=new Map();for(var i=0;i<prevRaw[s].length;i++){var k=nS(prevRaw[s][i][pkCol]);if(k)m.set(k,prevRaw[s][i])}prevMaps[s]=m})}
function buildSIdx(){return new Promise(function(res){sIdx={};var sl=sheets.filter(function(s){return raw[s]&&raw[s].length});var si=0;(function next(){if(si>=sl.length){sIdxBuilt=true;res();return}var sn=sl[si],rows=raw[sn],cols=Object.keys(rows[0]);sIdx[sn]={};cols.forEach(function(col){var idx=new Map();for(var i=0;i<rows.length;i++){var v=String(rows[i][col]||'').trim().toUpperCase();if(v){if(!idx.has(v))idx.set(v,[]);idx.get(v).push(i)}}sIdx[sn][col]=idx});si++;setTimeout(next,0)})()})}
function ensureSIdx(){if(sIdxBuilt)return Promise.resolve();return buildSIdx()}
// === FILTERS ===
function getSelV(id){var el=$(id);if(!el)return[];return Array.from(el.querySelectorAll('input[type=checkbox]:checked')).map(function(c){return c.value})}
function msAll(id){var p=$(id);if(!p)return;p.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=true});updMSL(p);updFilterBadge();applyFilters()}
function msNone(id){var p=$(id);if(!p)return;p.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=false});updMSL(p);updFilterBadge();applyFilters()}
function updMSL(panel){var btn=panel.previousElementSibling;if(!btn)return;var all=panel.querySelectorAll('input[type=checkbox]');var ck=Array.from(all).filter(function(c){return c.checked});var sp=btn.querySelector('span');if(sp)sp.textContent=ck.length===all.length||ck.length===0?(ck.length?'Todos':'\u2014'):ck.length}
function applyFilters(){updFilterBadge();if(mode==='compare')renderView();else if(mode==='search'&&!bulkA)doSearch();else if(mode==='diff')renderView()}
function rebuildStatusF(){var p=$('msSP');if(!p)return;var h='';Array.from(statuses).sort().forEach(function(s){h+='<label class="ms-item"><input type="checkbox" value="'+esc(s)+'" checked>'+esc(s)+'</label>'});h+='<label class="ms-item"><input type="checkbox" value="__NONE__" checked>(\u2014)</label><div class="ms-actions"><button onclick="msAll(\'msSP\')">\u2713</button><button onclick="msNone(\'msSP\')">\u2717</button></div>';p.innerHTML=h}
function rebuildOriginF(){var p=$('msOP');if(!p)return;var h='';selS.filter(function(s){return s!==mainS&&maps[s]}).forEach(function(s){var tc=KT[s]?'sheet-tag-'+s:'sheet-tag-other';h+='<label class="ms-item"><input type="checkbox" value="'+esc(s)+'" checked><span class="sheet-tag '+tc+'">'+esc(s)+'</span></label>'});h+='<div class="ms-actions"><button onclick="msAll(\'msOP\')">\u2713</button><button onclick="msNone(\'msOP\')">\u2717</button></div>';p.innerHTML=h}
function rebuildDiasF(){var ds=$('diasSel');if(!ds)return;var h='<option value="__main__">'+esc(mainS)+'</option>';selS.forEach(function(s){if(maps[s])h+='<option value="'+esc(s)+'">'+esc(s)+'</option>'});ds.innerHTML=h}
function rebuildSSP(){var p=$('msSSP');if(!p)return;var h='';sheets.forEach(function(s){if(raw[s])h+='<label class="ms-item"><input type="checkbox" value="'+esc(s)+'" checked>'+esc(s)+'</label>'});h+='<div class="ms-actions"><button onclick="msAll(\'msSSP\')">\u2713</button><button onclick="msNone(\'msSSP\')">\u2717</button></div>';p.innerHTML=h}
function buildSearchSels(){var ac=new Set();sheets.forEach(function(s){if(raw[s]&&raw[s].length)Object.keys(raw[s][0]).forEach(function(c){ac.add(c)})});var sr=sortRC(Array.from(ac));['gSearchCol','bSearchCol'].forEach(function(id){var sl=$(id);if(!sl)return;var h='<option value="__ALL__">Todas</option>';sr.forEach(function(c){h+='<option value="'+esc(c)+'">'+esc(c)+'</option>'});sl.innerHTML=h});var bs=$('bSearchS');if(bs){var bh='<option value="__ALL__">Todas</option>';sheets.forEach(function(s){if(raw[s])bh+='<option value="'+esc(s)+'">'+esc(s)+'</option>'});bs.innerHTML=bh}rebuildSSP()}
function rebuildSheetUI(){var cb=$('sheetCBs'),pr=$('princRadio');cb.innerHTML='';pr.innerHTML='';sheets.forEach(function(s){if(!raw[s])return;var d=document.createElement('div');d.className='sheet-cb';var inp=document.createElement('input');inp.type='checkbox';inp.id='sheetCB_'+s;inp.checked=selS.includes(s);var lb=document.createElement('label');lb.htmlFor='sheetCB_'+s;lb.textContent=s;d.appendChild(inp);d.appendChild(lb);cb.appendChild(d);var rl=document.createElement('label');rl.id='rl_'+s;if(s===mainS)rl.className='is-main';var rd=document.createElement('input');rd.type='radio';rd.name='mainS';rd.value=s;rd.checked=(s===mainS);rl.appendChild(rd);rl.appendChild(document.createTextNode(' '+s));pr.appendChild(rl)})}
function reprocess(){selS=[];sheets.forEach(function(s){var cb=document.getElementById('sheetCB_'+s);if(cb&&cb.checked)selS.push(s)});if(selS.length<2){toast('\u26a0\ufe0f M\u00edn 2 hojas');return}var rd=document.querySelector('input[name="mainS"]:checked');var nm=rd?rd.value:selS[0];if(!selS.includes(nm)){toast('\u26a0\ufe0f Principal debe estar seleccionada');return}mainS=nm;showLoad('Procesando...');setTimeout(function(){processData();if(aTab===ET&&!exData.length)aTab='serial';buildTabs();clearSel();vs.dirty=true;renderView();hideLoad();saveAll();toggleFP()},50)}
function clearAllFilters(){['msCP','msSP','msDP','msOP','msSSP','msDT'].forEach(function(id){var p=$(id);if(p){p.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=true});updMSL(p)}});['sInput','rawSInput','gSearchIn','diffSInput'].forEach(function(id){var el=$(id);if(el)el.value=''});updFilterBadge();toast('\u2728 Filtros limpiados');vs.dirty=true;renderView()}
function getActiveFilterCount(){var count=0;['msCP','msSP','msDP','msOP','msSSP','msDT'].forEach(function(id){var p=$(id);if(!p)return;var all=p.querySelectorAll('input[type=checkbox]');var ck=Array.from(all).filter(function(c){return c.checked});if(ck.length<all.length)count++});if($('sInput')&&$('sInput').value.trim())count++;if($('rawSInput')&&$('rawSInput').value.trim())count++;if($('gSearchIn')&&$('gSearchIn').value.trim())count++;if($('diffSInput')&&$('diffSInput').value.trim())count++;return count}
function updFilterBadge(){var cnt=getActiveFilterCount();var b=$('filterBadge');if(b){b.textContent=cnt;b.style.display=cnt>0?'inline-block':'none'}}

