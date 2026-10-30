
// === CMDB v14.3 RESUMEN — Summary view per sheet ===
var _resSheet='__ALL__';

function renderResumen(){
var c=$('tblC');
if(!sheets.length||!Object.keys(raw).length){
c.innerHTML='<div class="empty-state"><p style="font-size:40px">📊</p><p>Carga un archivo para ver el resumen</p></div>';
updRowCounter(0,0);return;
}
// Preserve selection
var sel2=$('resSheetSel');
if(sel2)_resSheet=sel2.value;
var sheetsToShow=_resSheet==='__ALL__'?sheets.filter(function(s){return raw[s]&&raw[s].length}):[_resSheet].filter(function(s){return raw[s]&&raw[s].length});
var h='<div class="res-container">';
// Header with selector
h+='<div class="res-header">';
h+='<span class="res-header-label">📊 Resumen por hoja:</span>';
h+='<select id="resSheetSel" class="res-sheet-sel">';
h+='<option value="__ALL__"'+ (_resSheet==='__ALL__'?' selected':'')+'>📁 Todas las hojas</option>';
sheets.forEach(function(s){
if(!raw[s]||!raw[s].length)return;
h+='<option value="'+esc(s)+'"'+(_resSheet===s?' selected':'')+'>'+esc(s)+' ('+raw[s].length.toLocaleString()+' filas)</option>';
});
h+='</select></div>';
// Stats config
var statCfg=[
{id:'serial',label:'Serial',aliases:AL.serial,mode:'count',icon:'🔢'},
{id:'hostname',label:'Hostname',aliases:AL.hostname,mode:'count',icon:'💻'},
{id:'placa',label:'Placa',aliases:AL.placa,mode:'count',icon:'🏷️'},
{id:'empresa',label:'Empresa',aliases:AL.empresa,mode:'breakdown',icon:'🏢'},
{id:'chassis',label:'Chassis',aliases:AL.chassis,mode:'breakdown',icon:'🖥️'},
{id:'os',label:'OS',aliases:AL.os,mode:'breakdown',icon:'⚙️'},
{id:'status',label:'Status',aliases:AL.status,mode:'breakdown',icon:'📌'},
{id:'manufacturer',label:'Manufacturer',aliases:AL.manufacturer,mode:'breakdown',icon:'🏭'},
{id:'model',label:'Model',aliases:AL.model,mode:'breakdown',icon:'📋'}
];
// Each sheet block
sheetsToShow.forEach(function(sn){
var data=raw[sn];if(!data||!data.length)return;
var cols=Object.keys(data[0]);
h+='<div class="res-sheet-block">';
// Title
var tc=KT[sn]?'sheet-tag-'+sn:'sheet-tag-other';
h+='<div class="res-sheet-title">';
h+='<span class="sheet-tag '+tc+'">'+esc(sn)+'</span>';
h+='<b>'+data.length.toLocaleString()+' filas</b>';
h+='<span style="color:var(--txt2);font-size:10px;margin-left:auto">'+cols.length+' columnas</span>';
h+='</div>';
// Quick overview
var ov=resQuickOV(data,cols);
if(ov){
h+='<div class="res-overview">';
if(ov.serial!==null)h+='<div class="res-ov-item ov-serial">🔢 Seriales: <b>'+ov.serial.toLocaleString()+'</b></div>';
if(ov.host!==null)h+='<div class="res-ov-item ov-host">💻 Hostnames: <b>'+ov.host.toLocaleString()+'</b></div>';
if(ov.placa!==null)h+='<div class="res-ov-item ov-placa">🏷️ Placas: <b>'+ov.placa.toLocaleString()+'</b></div>';
h+='</div>';
}
// Cards
h+='<div class="res-cards">';
statCfg.forEach(function(cfg){
var colName=resResolve(cols,cfg.aliases);
if(!colName){
h+='<div class="res-card res-card-na"><div class="res-card-title">'+cfg.icon+' '+esc(cfg.label)+'</div><div class="res-card-na-text">Columna no encontrada</div></div>';
return;
}
if(cfg.mode==='count'){
h+=resCountCard(data,colName,cfg);
}else{
h+=resBreakdownCard(data,colName,cfg);
}
});
h+='</div></div>';
});
h+='</div>';
c.innerHTML=h;
// Attach event
var newSel=$('resSheetSel');
if(newSel){newSel.addEventListener('change',function(){_resSheet=this.value;renderResumen()})}
// Row counter
var total=sheetsToShow.reduce(function(a,s){return a+(raw[s]?raw[s].length:0)},0);
var grand=sheets.reduce(function(a,s){return a+(raw[s]?raw[s].length:0)},0);
updRowCounter(total,grand);
}

function resResolve(cols,aliases){
for(var i=0;i<aliases.length;i++){
for(var j=0;j<cols.length;j++){
if(cols[j].toLowerCase()===aliases[i].toLowerCase())return cols[j];
}
}
return null;
}

function resQuickOV(data,cols){
var sr=resResolve(cols,AL.serial);
var hn=resResolve(cols,AL.hostname);
var pl=resResolve(cols,AL.placa);
if(!sr&&!hn&&!pl)return null;
var r={serial:null,host:null,placa:null};
if(sr){var s1=new Set();data.forEach(function(d){var v=String(d[sr]||'').trim();if(v)s1.add(v)});r.serial=s1.size}
if(hn){var s2=new Set();data.forEach(function(d){var v=String(d[hn]||'').trim();if(v)s2.add(v)});r.host=s2.size}
if(pl){var s3=new Set();data.forEach(function(d){var v=String(d[pl]||'').trim();if(v)s3.add(v)});r.placa=s3.size}
return r;
}

function resCountCard(data,colName,cfg){
var unique=new Set();var empty=0;
data.forEach(function(d){var v=String(d[colName]||'').trim();if(v)unique.add(v);else empty++});
var h='<div class="res-card">';
h+='<div class="res-card-title">'+cfg.icon+' '+esc(cfg.label)+'</div>';
h+='<div class="res-card-total">'+unique.size.toLocaleString()+'</div>';
h+='<div class="res-card-sub">únicos de '+data.length.toLocaleString()+' registros</div>';
var dupN=data.length-empty-unique.size;if(dupN>0)h+='<div class="res-card-empty">\ud83d\udd01 '+dupN.toLocaleString()+' duplicados</div>';
if(empty)h+='<div class="res-card-empty">⚠️ '+empty.toLocaleString()+' vacíos</div>';
h+='</div>';
return h;
}

function resBreakdownCard(data,colName,cfg){
var counts={};var emptyC=0;
data.forEach(function(d){
var v=String(d[colName]||'').trim();
if(!v){emptyC++;return}
counts[v]=(counts[v]||0)+1;
});
var sorted=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a]});
var h='<div class="res-card res-card-breakdown">';
h+='<div class="res-card-title">'+cfg.icon+' '+esc(cfg.label)+' <span class="res-card-count">('+sorted.length+' valores)</span></div>';
h+='<div class="res-breakdown-list">';
var MAXB=15,restC=0;
sorted.forEach(function(val,ix){
var cnt=counts[val];if(ix>=MAXB){restC+=cnt;return}
var pct=((cnt/data.length)*100).toFixed(1);
var barCls=resBarColor(cfg.id,val);
var displayVal=val.length>35?val.substring(0,33)+'…':val;
h+='<div class="res-breakdown-item">';
h+='<div class="res-breakdown-label" title="'+esc(val)+'">'+resStatusBadge(cfg.id,val,displayVal)+'</div>';
h+='<div class="res-breakdown-bar"><div class="res-breakdown-fill '+barCls+'" style="width:'+pct+'%"></div></div>';
h+='<div class="res-breakdown-val"><b>'+cnt.toLocaleString()+'</b> <span>('+pct+'%)</span></div>';
h+='</div>';
});
if(restC){var rp=((restC/data.length)*100).toFixed(1);h+='<div class="res-breakdown-item res-breakdown-empty"><div class="res-breakdown-label">Otros ('+(sorted.length-MAXB)+')</div><div class="res-breakdown-bar"><div class="res-breakdown-fill res-bar-gray" style="width:'+rp+'%"></div></div><div class="res-breakdown-val"><b>'+restC.toLocaleString()+'</b> <span>('+rp+'%)</span></div></div>'}
if(emptyC){
var ePct=((emptyC/data.length)*100).toFixed(1);
h+='<div class="res-breakdown-item res-breakdown-empty">';
h+='<div class="res-breakdown-label">(vacío)</div>';
h+='<div class="res-breakdown-bar"><div class="res-breakdown-fill res-bar-gray" style="width:'+ePct+'%"></div></div>';
h+='<div class="res-breakdown-val"><b>'+emptyC.toLocaleString()+'</b> <span>('+ePct+'%)</span></div>';
h+='</div>';
}
h+='</div></div>';
return h;
}

function resBarColor(cfgId,val){if(cfgId!=='status')return'';var c=statusClass(val);return'res-bar-'+(c==='other'?'gray':c)}

function resStatusBadge(cfgId,val,display){if(cfgId==='status')return'<span class="svn-status svn-status-'+statusClass(val)+'">'+esc(display)+'</span>';return esc(display)}
