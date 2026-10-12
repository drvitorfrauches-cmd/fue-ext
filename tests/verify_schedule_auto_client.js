// Cliente: os botões de iniciar/finalizar/corrigir mandam o horário local (localTime HH:MM)
// que o servidor usa para preencher a aba Horários automaticamente.
const fs = require('fs');
var elements = {};
function fakeEl(id){ if (!elements[id]) { var el = { id:id, className:'', style:{}, _show:false, classList:{add:function(c){ if(c==='show') el._show=true; },remove:function(c){ if(c==='show') el._show=false; }}, innerHTML:'', textContent:'', value:'', placeholder:'', disabled:false, getAttribute:function(){return null;}, setAttribute:function(){} }; elements[id]=el; } return elements[id]; }
var keyHandlers = [];
global.document = { documentElement:{style:{setProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){}}, lang:''}, addEventListener:function(ev, fn){ if (ev==='keydown') keyHandlers.push(fn); }, getElementById:function(id){return fakeEl(id);}, createElement:function(){return {};}, querySelectorAll:function(){return [];}, activeElement:null };
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{}, confirm:function(){return true;} };
global.navigator = { language:'pt-BR' };
global.localStorage = { getItem:function(){return null;}, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
var calls = [];
global.fetch = function(url, opts){ calls.push({ url:String(url), body: opts && opts.body ? JSON.parse(opts.body) : null }); return Promise.resolve({ ok:true, json:function(){ return Promise.resolve(Object.assign({}, state.session)); } }); };
var src = fs.readFileSync('extracted.js','utf8');
src = src.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render;\n})();");
eval(src);

function emptyCounts(){ return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0}; }
function mk(){
  var q = function(){ return {counts:emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null}; };
  return { id:'abc123', codigo:'AU-0001', status:'andamento', mode:'completo', createdAt: Date.now(), ownerBranding:{ownerId:'dono1'}, photos:{marcacao:[],posop:[]},
    quadrants:{temporal_dir:q(),temporal_esq:q(),occipital_dir:q(),occipital_esq:q()}, preincCounts:{}, preincDist:{},
    timer:{accumulatedMs:0,running:false,startedAt:null}, preincTimer:{accumulatedMs:0,running:false,startedAt:null},
    globalTimerStartedAt:null, globalTimerEndedAt:null, finalizedAt:null, patientInfo:{}, schedule:{}, implant:{withdrawals:[]} };
}
var RE = /^([01]\d|2[0-3]):[0-5]\d$/;
var allOk = true;
function check(label, ok){ if(!ok) allOk = false; console.log(label + ':', !!ok); }
state.lang = 'pt'; state.currentId = 'abc123'; state.currentUser = { id:'dono1' };
(async function(){
  state.session = mk(); render();
  calls = []; App.toggleTimer();
  check('iniciar extração manda localTime HH:MM', calls.length===1 && /\/timer$/.test(calls[0].url) && calls[0].body.action==='start' && RE.test(calls[0].body.localTime));
  state.session = mk(); calls = []; App.togglePreincTimer();
  check('iniciar pré-incisão manda localTime HH:MM', calls.length===1 && /\/preinc-timer$/.test(calls[0].url) && calls[0].body.action==='start' && RE.test(calls[0].body.localTime));
  state.session = mk(); calls = []; App.finalizeSession(); App.dialogModalOk();
  await new Promise(function(r){ setTimeout(r, 20); });
  check('finalizar cirurgia manda localTime HH:MM', calls.length>=1 && /\/finalize$/.test(calls[0].url) && RE.test(calls[0].body.localTime));
  state.session = mk(); state.session.status='finalizada'; state.session.globalTimerStartedAt = new Date(2026,9,11,7,30,0).getTime();
  calls = []; App.fixDuration(); elements['dialog-modal-input'].value = '90'; App.dialogModalOk();
  await new Promise(function(r){ setTimeout(r, 20); });
  check('corrigir duração manda localTime = início + duração (09:00)', calls.length>=1 && /\/fix-duration$/.test(calls[0].url) && calls[0].body.minutes===90 && calls[0].body.localTime==='09:00');
  console.log(allOk ? '\nTODOS OS TESTES PASSARAM' : '\nFALHA: verificar acima');
  if (!allOk) process.exitCode = 1;
})();
