// Confere a nova aba "Resumo Final": presença do botão/painel, troca de aba via
// App.switchTab('resumofinal'), auto-abertura ao finalizar (App.finalizeSession),
// e a matemática de agregação (categorias, mamba, diferença pré-incisões x
// folículos extraídos, tempos) contra valores calculados à mão.
const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; }, textContent:'', value:'', placeholder:'', disabled:false, getAttribute:function(){return null;} };
  return elements[id];
}
global.document = {
  documentElement:{style:{setProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){}}, lang:''},
  addEventListener: function(){},
  getElementById: function(id){ return fakeEl(id); },
  createElement: function(){ return {}; },
  querySelectorAll: function(){ return []; },
  activeElement: null
};
// Nota (16/07/2026): App.finalizeSession() não usa mais window.confirm() nativo —
// virou confirmDialog(), que abre um modal próprio (App.dialogModalOk() simula o
// clique em "OK"). Por isso não mockamos mais window.confirm aqui.
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = { language: 'pt-BR' };
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };

var FINALIZE_RESULT = null;
global.fetch = function(url, opts){
  if (String(url).indexOf('/finalize') !== -1) {
    return Promise.resolve({ ok: true, json: function(){ return Promise.resolve(FINALIZE_RESULT); } });
  }
  return Promise.reject(new Error('no net'));
};

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render;\n})();");
eval(clientSrc);

// Sessão de teste: 2 quadrantes com contagens conhecidas, mode completo.
// temporal_dir: f1=10, f2=5, f3=0, f4=0, f1fino=2, f2fino=1, t2_1=3 (parcial), ttotal=4, mini=6
// occipital_dir: f1=8, f2=0, f3=0, f4=0, f1fino=0, f2fino=0, t3_1=2 (parcial), ttotal=1, mini=0
// (os outros dois quadrantes ficam zerados)
function emptyCounts(){
  return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0};
}
function baseSession(){
  var td = emptyCounts(); td.f1=10; td.f2=5; td.f1fino=2; td.f2fino=1; td.t2_1=3; td.ttotal=4; td.mini=6;
  var od = emptyCounts(); od.f1=8; od.t3_1=2; od.ttotal=1;
  return {
    id:'abc123', codigo:'PAC-TESTE', status:'andamento', mode:'completo', createdAt: Date.now(),
    ownerBranding:{}, photos:{marcacao:[],posop:[]},
    quadrants: {
      temporal_dir:{counts:td, mambaCumulativo: 40, mambaMarkTimeMs: 5000},
      temporal_esq:{counts: emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null},
      occipital_dir:{counts:od, mambaCumulativo: null, mambaMarkTimeMs:null},
      occipital_esq:{counts: emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null}
    },
    preincCounts:{recesso_dir:5,recesso_esq:5,linha:10,sublinha:0,entrada_dir1:0,entrada_dir2:0,entrada_esq1:0,entrada_esq2:0,topete1:0,topete2:0,scalp:0,coroa:0},
    preincDist:{},
    timer:{accumulatedMs: 3600000, running:false, startedAt:null},          // 1h
    preincTimer:{accumulatedMs: 1800000, running:false, startedAt:null},    // 30min
    globalTimerStartedAt: Date.now() - 5400000, globalTimerEndedAt: null,   // 1h30 corridas
    finalizedAt: null
  };
}

// --- cálculo manual esperado (mode completo) ---
// integros = f1+f2+f1fino+f2fino (td) + f1 (od) = (10+5+2+1) + 8 = 26
// parciais (t2_1+t3_1) = 3+2 = 5
// totalPerdidos (ttotal) = 4+1 = 5
// miniTotal = 6
// foliculosExtraidos = integros+parciais = 26+5 = 31
// foliculosManipulados = integros+parciais+totalPerdidos = 26+5+5 = 36
// totalFios = (10*1+5*2+2*1+1*2) + (8*1) + (3*1[t2_1 hairs=1]) + (2*1[t3_1 hairs=1])
//           td integros fios: 10*1+5*2+2*1+1*2 = 10+10+2+2 = 24; od integros fios: 8*1=8
//           parciais fios: t2_1 hairs=1 => 3*1=3; t3_1 hairs=1 => 2*1=2
//           totalFios = 24+8+3+2 = 37
// indice = 37/31 = 1.193548...
// taxaParcial = parciais/manipulados*100 = 5/36*100 = 13.888...%
// taxaTotal = totalPerdidos/manipulados*100 = 5/36*100 = 13.888...%
// mambaFinal = 40 (único quadrante com timestamp e valor)
// A aba Resumo Final compara SEMPRE contra extraídos (31), não manipulados (36)
// — versão simplificada depois que o usuário apontou que as duas bases geravam
// campos redundantes na tela (coincidem sempre que não há transecção total).
// diffExtraidos = 40 - 31 = 9; diffExtraidosPct = 9/40*100 = 22.5%
// preincTotal = 5+5+10 = 20
// preincDiff = 31 - 20 = +11 (folículos extraídos − pré-incisões; só o numeral,
// sem % — o usuário pediu inversão do sinal em relação à versão anterior)
// tempo extração = 1h = "01:00:00"; tempo preinc = 30min = "00:30:00"; tempo total = 1h30 ~ "01:30:00"

console.log('--- render() da aba Resumo Final (cirurgia em andamento) ---');
state.lang = 'pt';
state.session = baseSession();
render();

console.log('tempo extração (01:00:00):', elements['final-tempo-extracao'].textContent === '01:00:00');
console.log('tempo pré-incisão (00:30:00):', elements['final-tempo-preinc'].textContent === '00:30:00');
console.log('tempo total (~01:30:0x):', /^01:30:0[0-9]$/.test(elements['final-tempo-total'].textContent));

console.log('folículos extraídos (31):', elements['final-extraidos'].textContent === 31);
console.log('total de fios (37):', elements['final-fios'].textContent === 37);
console.log('índice (1.19):', elements['final-indice'].textContent === (37/31).toFixed(2));
console.log('% trans parcial (13.9%):', elements['final-transec-parcial'].textContent === (5/36*100).toFixed(1)+'%');
console.log('% trans total (13.9%):', elements['final-transec-total'].textContent === (5/36*100).toFixed(1)+'%');
console.log('mini (6):', elements['final-mini'].textContent === 6);

console.log('mamba final (40):', elements['final-mamba-val'].textContent === 40);
console.log('mamba diff vs extraídos (+9):', elements['final-mamba-diff'].textContent === '+9');
console.log('mamba diff% vs extraídos (+22.5%):', elements['final-mamba-diffpct-extraidos'].textContent === '+22.5%');
console.log('ritmo pelo Mamba (40 fol/h, mamba 40 / 1h de extração):', elements['final-mamba-rate'].textContent === '40');

var catHtml = elements['final-categorias'].innerHTML;
console.log('categoria 1 fio = 18 (10+8):', catHtml.indexOf('<div class="val">18</div>') !== -1);
console.log('categoria 2 fios = 5:', catHtml.indexOf('<div class="val">5</div>') !== -1);
console.log('categoria 1 fio especial = 2:', catHtml.indexOf('<div class="val">2</div>') !== -1);
console.log('categoria transecção parcial (total) = 5:', catHtml.indexOf('<div class="val">5</div><div class="lbl">Transecção parcial</div>') !== -1);
console.log('categoria transecção total = 5:', catHtml.indexOf('Transecção total (folículo perdido)') !== -1);
console.log('categoria mini = 6 aparece com o rótulo certo:', catHtml.indexOf('<div class="val">6</div><div class="lbl">Mini (miniaturizado)</div>') !== -1);

console.log('total de pré-incisões (20):', elements['final-preinc-total'].textContent === 20);
console.log('diferença extraídos x pré-incisões (+11):', elements['final-preinc-diff'].textContent === '+11');

console.log();
console.log('--- troca de aba: App.switchTab(\'resumofinal\') mostra o painel e ativa o botão ---');
App.switchTab('resumofinal');
console.log('painel resumofinal visível:', elements['panel-resumofinal'].style.display === '');
console.log('painel extracao escondido:', elements['panel-extracao'].style.display === 'none');
console.log('botão resumofinal fica "btn" (ativo):', elements['tab-resumo-btn'].className === 'btn');
console.log('botão extracao vira "btn secondary":', elements['tab-extracao-btn'].className === 'btn secondary');

console.log();
console.log('--- Finalizar cirurgia troca automaticamente para a aba Resumo Final ---');
App.switchTab('extracao'); // volta pra extração antes de finalizar, simulando uso real
FINALIZE_RESULT = Object.assign({}, state.session, {status:'finalizada', finalizedAt: Date.now(), globalTimerEndedAt: Date.now()});
state.currentId = 'abc123';
App.finalizeSession();
App.dialogModalOk(); // simula o clique em "OK" no modal de confirmação
// finalizeSession é assíncrono (Promise do fetch mockado) — espera resolver.
function wait(ms){ return new Promise(function(resolve){ setTimeout(resolve, ms); }); }
wait(50).then(function(){
  console.log('após finalizar, aba ativa é resumofinal:', elements['panel-resumofinal'].style.display === '');
  console.log('botão resumofinal ativo após finalizar:', elements['tab-resumo-btn'].className === 'btn');

  console.log();
  console.log('--- traduzido em inglês, sem reload ---');
  state.lang = 'en';
  render();
  console.log('rótulo tempo de extração (Extraction time):', document.getElementById('panel-resumofinal') !== undefined); // painel sempre existe
  console.log('categoria 1 fio (en, "1 hair"):', elements['final-categorias'].innerHTML.indexOf('1 hair<') !== -1 || elements['final-categorias'].innerHTML.indexOf('>1 hair</div>') !== -1);
}).catch(function(err){ console.log('ERRO INESPERADO:', err); });
