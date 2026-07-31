// Confere que a % de diferença do Mamba (aba Extração: card geral + card por
// quadrante) é calculada contra os folículos EXTRAÍDOS (íntegros + parciais),
// e não mais contra os folículos MANIPULADOS (que somaria também a transecção
// total). Usa uma cirurgia com transecção total > 0 pra garantir que as duas
// bases DIVIRJAM — se o teste usasse dados sem transecção total, os dois
// cálculos dariam o mesmo número e o teste não pegaria uma regressão.
const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; }, textContent:'', value:'', disabled:false, placeholder:'', getAttribute:function(){return null;} };
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
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{}, confirm: function(){ return true; }, prompt: function(){ return null; } };
global.navigator = { language: 'pt-BR' };
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render; global.computeMambaDiff=computeMambaDiff;\n})();");
eval(clientSrc);

function emptyCounts(){ return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0}; }
function emptyQuad(){ return {counts: emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null, carryFromId:null, locked:false}; }
function baseSession(){
  return {
    id:'abc123', codigo:'PAC-TESTE', status:'andamento', mode:'completo', createdAt: Date.now(),
    ownerBranding:{}, photos:{marcacao:[],posop:[]},
    quadrants: { occipital_dir: emptyQuad(), occipital_esq: emptyQuad(), temporal_esq: emptyQuad(), temporal_dir: emptyQuad() },
    preincCounts:{recesso_dir:0,recesso_esq:0,linha:0,sublinha:0,entrada_dir1:0,entrada_dir2:0,entrada_esq1:0,entrada_esq2:0,topete1:0,topete2:0,scalp:0,coroa:0},
    preincDist:{}, timer:{accumulatedMs:0, running:false, startedAt:null}, preincTimer:{accumulatedMs:0, running:false, startedAt:null},
    globalTimerStartedAt: null, globalTimerEndedAt: null, finalizedAt: null,
    patientInfo: {idade:null, alturaCm:null, pesoKg:null, cabeloEspessura:null, cabeloTextura:null, raspagem:null}
  };
}

state.lang = 'pt';
state.currentId = 'abc123';
state.session = baseSession();
state.activeQuadrant = 'occipital_dir';

// occipital_dir: 100 íntegros (f1) + 20 transecção total (ttotal).
// foliculosExtraidos = 100 (só íntegros, sem parciais aqui). foliculosManipulados = 120.
// As duas bases DIVERGEM de propósito, pra pegar regressão.
var s = state.session;
s.quadrants.occipital_dir.counts.f1 = 100;
s.quadrants.occipital_dir.counts.ttotal = 20;
s.quadrants.occipital_dir.mambaCumulativo = 150;
s.quadrants.occipital_dir.mambaMarkedAtMs = Date.now();

render();

console.log('--- Card geral (Extração): base do Mamba é foliculosExtraidos (100), não foliculosManipulados (120) ---');
console.log('geral-extraidos mostra 100:', elements['geral-extraidos'].textContent === 100 || elements['geral-extraidos'].textContent === '100');
console.log('geral-mamba-manip (rotulado "Folículos extraídos") mostra 100, não 120:', Number(elements['geral-mamba-manip'].textContent) === 100);

var mambaGeral = 150, extraidosGeral = 100;
var diffGeralEsperado = mambaGeral - extraidosGeral; // 50
var diffPctGeralEsperado = diffGeralEsperado/mambaGeral*100; // 33.33...
console.log('geral-mamba-diff = +50 (150 - 100 extraídos, não 150-120=30):', elements['geral-mamba-diff'].textContent === ('+'+diffGeralEsperado));
console.log('geral-mamba-diffpct bate com base extraídos (+33.3%):', elements['geral-mamba-diffpct'].textContent === ('+'+diffPctGeralEsperado.toFixed(1)+'%'));

console.log();
console.log('--- Card por quadrante (occipital_dir): mesma base extraídos ---');
// Único quadrante marcado -> delta = mambaCumulativo - 0 = 150; qsum.foliculosExtraidos = 100 (mesmo quadrante)
console.log('quad-mamba-manip (rotulado "Folículos extraídos") mostra 100, não 120:', Number(elements['quad-mamba-manip'].textContent) === 100);
console.log('quad-mamba-diffpct bate com base extraídos (+33.3%):', elements['quad-mamba-diffpct'].textContent === ('+'+diffPctGeralEsperado.toFixed(1)+'%'));

console.log();
console.log('--- computeMambaDiff() em si: propriedade renomeada de "manipulados" pra "base" ---');
var d = computeMambaDiff(150, 100);
console.log('retorna .base (não .manipulados):', d.base === 100 && d.manipulados === undefined);

console.log();
console.log('--- Aba Resumo Final (elementos próprios, mesma base extraídos) ---');
console.log('final-mamba-diffpct-extraidos bate com a mesma % (+33.3%):', elements['final-mamba-diffpct-extraidos'].textContent === ('+'+diffPctGeralEsperado.toFixed(1)+'%'));

console.log();
console.log('--- Relatório impresso: também usa extraídos, com o rótulo certo ---');
global.window.print = function(){};
App.printReport();
var printedHtml = elements['print-report'].innerHTML;
console.log('relatório contém 100 (extraídos) no bloco geral do Mamba, não 120:', printedHtml.indexOf('<b>100</b>') !== -1);
console.log('relatório NÃO usa mais o rótulo "Folículos manipulados":', printedHtml.indexOf('Folículos manipulados') === -1);
console.log('relatório usa o rótulo "Folículos extraídos" no bloco do Mamba:', printedHtml.indexOf('Folículos extraídos') !== -1);
