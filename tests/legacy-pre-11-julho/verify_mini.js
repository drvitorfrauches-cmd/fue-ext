const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; }, textContent:'', value:'', checked:false };
  return elements[id];
}
global.document = {
  addEventListener: function(){},
  getElementById: function(id){ return fakeEl(id); },
  createElement: function(){ return {}; },
  querySelectorAll: function(){ return { forEach: function(){} }; },
  activeElement: null
};
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{}, prompt: function(){ return null; } };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.CATS=CATS; global.computeSummary=computeSummary; global.render=render;\n})();");
eval(clientSrc);

// Confirma que CATS tem a categoria mini na posicao certa (logo apos ttotal)
var ids = CATS.map(function(c){ return c.id; });
console.log('--- Posicao da categoria mini ---');
console.log('ids:', ids.join(','));
console.log('mini logo apos ttotal:', ids.indexOf('mini') === ids.indexOf('ttotal')+1);
console.log('mini eh a ultima categoria:', ids[ids.length-1] === 'mini');

// Testa computeSummary: mini nao deve contar em nada, exceto seu proprio total
var counts = { f1: 100, t2_1: 5, ttotal: 3, mini: 12 };
var sum = computeSummary(counts, 'completo');
console.log();
console.log('--- computeSummary com mini=12 ---');
console.log('miniTotal:', sum.miniTotal, '(esperado 12)');
console.log('foliculosExtraidos NAO inclui mini:', sum.foliculosExtraidos === 105, '(valor:', sum.foliculosExtraidos, ', esperado 105 = 100+5)');
console.log('foliculosManipulados NAO inclui mini:', sum.foliculosManipulados === 108, '(valor:', sum.foliculosManipulados, ', esperado 108 = 100+5+3)');
console.log('totalFios NAO inclui mini:', sum.totalFios === 110, '(valor:', sum.totalFios, ', esperado 110 = 100*1+5*2)');

// Testa render(): monta sessao fake e confirma que a caixinha do grupo mini aparece
state.currentId = 'sess1';
state.activeQuadrant = 'temporal_dir';
state.session = {
  id: 'sess1', codigo: 'PAC-1', status: 'andamento', mode: 'completo', createdAt: Date.now(),
  quadrants: {
    temporal_dir: { counts: { f1: 100, mini: 12 }, mambaCumulativo: null },
    temporal_esq: { counts: {}, mambaCumulativo: null },
    occipital_dir: { counts: {}, mambaCumulativo: null },
    occipital_esq: { counts: {}, mambaCumulativo: null }
  },
  preincCounts: {}, preincDist: {}, photos: { marcacao: [], posop: [] },
  timer: { accumulatedMs: 0, running: false, startedAt: null },
  preincTimer: { accumulatedMs: 0, running: false, startedAt: null }
};
render();
console.log();
console.log('--- render() ---');
console.log('quad-mini textContent:', elements['quad-mini'].textContent, '(esperado 12)');
console.log('geral-mini textContent:', elements['geral-mini'].textContent, '(esperado 12)');
console.log('group-mini contem a categoria mini:', elements['group-mini'].innerHTML.indexOf('Mini (miniaturizado)') !== -1);
console.log('group-mini mostra o valor 12:', elements['group-mini'].innerHTML.indexOf('>12<') !== -1);
console.log('group-mini NAO conta como fio (nota):', elements['group-mini'].innerHTML.indexOf('não entra na contagem geral') !== -1);
// Extraidos geral nao deve ter subido por causa do mini
console.log('geral-extraidos ainda eh 100 (f1) mesmo com mini=12:', elements['geral-extraidos'].textContent === '100');
