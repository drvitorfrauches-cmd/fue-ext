// Cliente: fila do contador de incisões — envio em ordem, para na queda de rede,
// 409 vira conflito (não reenvia sozinho), 404 sai da fila, holder persiste no aparelho.
const fs = require('fs');
var elements = {};
function fakeEl(id){ if (!elements[id]) { elements[id] = { id:id, style:{}, innerHTML:'', textContent:'', value:'', classList:{add:function(){},remove:function(){}}, getAttribute:function(){return null;}, setAttribute:function(){} }; } return elements[id]; }
global.document = { documentElement:{style:{setProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){}}, lang:''}, addEventListener:function(){}, getElementById:function(id){return fakeEl(id);}, createElement:function(){return {};}, querySelectorAll:function(){return [];}, activeElement:null };
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{}, confirm:function(){return true;} };
global.navigator = { language:'pt-BR' };
var mem = {};
global.localStorage = { getItem:function(k){ return Object.prototype.hasOwnProperty.call(mem,k) ? mem[k] : null; }, setItem:function(k,v){ mem[k]=String(v); } };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
global.clearInterval = function(){};
var src = fs.readFileSync('extracted.js','utf8');
src = src.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.ctrStore=ctrStore; global.ctrSave=ctrSave;\n})();");
var fetchHandler = null, calls = [];
global.fetch = function(url, opts){ calls.push({ url:String(url), body: opts && opts.body ? JSON.parse(opts.body) : null }); return fetchHandler(url, opts); };
eval(src);

var allOk = true;
function check(label, ok){ if(!ok) allOk = false; console.log(label + ':', !!ok); }
function resp(status, body){ return Promise.resolve({ ok: status>=200 && status<300, status: status, json: function(){ return Promise.resolve(body || {}); } }); }
function netErr(){ return Promise.reject(new TypeError('Failed to fetch')); }
function item(id, area, value){ return { id:id, sessionId:'abc123', area:area, value:value, holder:'H1', ts:1 }; }
function emptyCounts(){ return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0}; }
function fixture(extra){
  var q = function(){ return {counts:emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null}; };
  return Object.assign({ id:'abc123', codigo:'PC-0001', status:'andamento', mode:'completo', createdAt: Date.now(), ownerBranding:{ownerId:'dono1'}, photos:{marcacao:[],posop:[]},
    quadrants:{temporal_dir:q(),temporal_esq:q(),occipital_dir:q(),occipital_esq:q()}, preincCounts:{}, preincDist:{},
    timer:{accumulatedMs:0,running:false,startedAt:null}, preincTimer:{accumulatedMs:0,running:false,startedAt:null},
    globalTimerStartedAt:null, globalTimerEndedAt:null, finalizedAt:null, patientInfo:{}, schedule:{}, implant:{withdrawals:[]}, preincLocks:{} }, extra || {});
}
state.lang = 'pt'; state.currentId = 'abc123'; state.currentUser = { id:'dono1' }; state.session = fixture();

(async function(){
  console.log('--- aparelho ---');
  var h1 = ctrStore().holder, h2 = ctrStore().holder;
  check('holder é o mesmo a cada leitura (persiste no aparelho)', h1 && h1===h2);
  check('holder sobrevive a "recarregar" (novo ctrStore lê do localStorage)', JSON.parse(mem.fue_counter_v1).holder === h1);

  console.log('--- fila: queda de rede ---');
  var st = ctrStore(); st.queue = [item('i1','linha',150), item('i2','sublinha',80)]; ctrSave(st);
  calls = []; fetchHandler = function(){ return netErr(); };
  await App.counterFlush(ctrStore());
  check('sem internet: nada sai da fila', ctrStore().queue.length === 2);
  check('sem internet: para no primeiro item (não tenta o segundo)', calls.length === 1);

  console.log('--- fila: envio ok ---');
  calls = []; fetchHandler = function(url){ return resp(200, fixture({ preincCounts:{linha:150} })); };
  await App.counterFlush(ctrStore());
  check('internet voltou: os dois itens são enviados em ordem', calls.length === 2 && calls[0].body.area==='linha' && calls[1].body.area==='sublinha');
  check('enviado com o holder gravado no item (do aparelho que contou)', calls[0].body.holder === 'H1' && calls[0].body.value === 150);
  check('itens enviados saem da fila', ctrStore().queue.length === 0);
  check('estado da sessão atualizado com a resposta', state.session.preincCounts.linha === 150);

  console.log('--- fila: conflito (409) ---');
  st = ctrStore(); st.queue = [item('i3','coroa',40)]; ctrSave(st);
  calls = []; fetchHandler = function(){ return resp(409, { error:'locked' }); };
  await App.counterFlush(ctrStore());
  var q = ctrStore().queue;
  check('409 fica na fila marcado como conflito', q.length===1 && q[0].conflict===true);
  calls = []; fetchHandler = function(){ return resp(200, fixture()); };
  await App.counterFlush(ctrStore());
  check('conflito não é reenviado sozinho', calls.length===0 && ctrStore().queue.length===1);
  App.counterDiscard('i3');
  check('descartar tira o conflito da fila', ctrStore().queue.length===0);

  console.log('--- fila: cirurgia sumiu (404) ---');
  st = ctrStore(); st.queue = [item('i4','topete1',10)]; ctrSave(st);
  fetchHandler = function(){ return resp(404, { error:'nf' }); };
  await App.counterFlush(ctrStore());
  check('404 sai da fila (não fica eternamente pendente)', ctrStore().queue.length===0);

  console.log('--- fluxo: escolher área, contar, finalizar ---');
  var tick = function(){ return new Promise(function(r){ setTimeout(r, 5); }); };
  var lockFor = function(holder){ return fixture({ preincLocks:{ linha:{ holder:holder, since:Date.now() } } }); };
  // área travada por outro aparelho: não abre e não chama o servidor
  state.session = fixture({ preincLocks:{ linha:{ holder:'OUTRO', since:Date.now() } } });
  calls = []; fetchHandler = function(){ return resp(200, fixture()); };
  App.counterPick('linha'); await tick();
  check('área travada por outro aparelho não abre a contagem', calls.length===0 && document.getElementById('ctr-count').style.display!=='flex');
  // área livre: trava, conta, finaliza
  state.session = fixture();
  calls = []; fetchHandler = function(url, opts){
    var b = JSON.parse(opts.body);
    if (/preinc-lock$/.test(url)) return resp(200, lockFor(ctrStore().holder));
    return resp(200, fixture({ preincCounts:{ linha: b.value } }));
  };
  App.counterPick('linha'); await tick();
  check('escolher área livre trava no servidor (action start)', calls.length===1 && calls[0].body.action==='start' && calls[0].body.area==='linha');
  check('contagem abre na área escolhida (zerada)', document.getElementById('ctr-count').style.display==='flex' && String(document.getElementById('ctr-live').textContent)==='0');
  App.counterTap({}); App.counterTap({}); App.counterTap({});
  check('três toques mostram 3', String(document.getElementById('ctr-live').textContent)==='3');
  check('parcial fica salvo no aparelho a cada toque', ctrStore().partials['abc123'] && ctrStore().partials['abc123'].linha===3);
  calls = [];
  App.counterFinish(); await tick();
  var sent = calls.filter(function(c){ return /\/preinc$/.test(c.url); });
  check('finalizar envia o total 3 para a área linha, com o holder do aparelho', sent.length===1 && sent[0].body.area==='linha' && sent[0].body.value===3 && sent[0].body.holder===ctrStore().holder);
  check('finalizar apaga o parcial e volta à lista', !(ctrStore().partials['abc123'] && ctrStore().partials['abc123'].linha!==undefined) && document.getElementById('ctr-list').style.display==='block');
  console.log('--- som e marcos de 100 ---');
  var lockOk = function(url, opts){ return /preinc-lock$/.test(url) ? resp(200, fixture({ preincLocks:{ linha:{ holder:ctrStore().holder, since:Date.now() } } })) : resp(200, fixture()); };
  state.session = fixture(); fetchHandler = lockOk; calls = [];
  localStorage.setItem('fue_counter_sound', 'on');
  App.counterPick('linha'); await tick();
  var before = App.counterMilestoneLog.length;
  for (var i=0;i<100;i++) App.counterTap({});
  check('100 toques registram um marco (100)', App.counterMilestoneLog.length===before+1 && App.counterMilestoneLog[before]===100);
  for (var j=0;j<50;j++) App.counterTap({});
  check('150 toques não geram marco extra antes do 200', App.counterMilestoneLog.length===before+1);
  App.counterUndo(); App.counterUndo();
  check('desfazer não gera marco', App.counterMilestoneLog.length===before+1);
  App.counterSoundToggle();
  check('som desligado é salvo no aparelho', localStorage.getItem('fue_counter_sound')==='off');
  check('botão mostra Som: desligado', String(document.getElementById('ctr-sound-btn').textContent).indexOf('desligado')!==-1);
  var mute0 = App.counterMilestoneLog.length;
  for (var k=0;k<52;k++) App.counterTap({});
  check('com som desligado, o marco 200 ainda é contado mas não toca (log cresce, áudio não)', App.counterMilestoneLog.length===mute0+1 && App.counterMilestoneLog[mute0]===200);
  App.counterSoundToggle();
  check('segundo toque no botão liga o som de novo', localStorage.getItem('fue_counter_sound')==='on');
  App.counterCancel(); await tick();
  console.log(allOk ? '\nTODOS OS TESTES PASSARAM' : '\nFALHA: verificar acima');
  if (!allOk) process.exitCode = 1;
})().catch(function(e){ console.log('ERRO', e); process.exitCode = 1; });
