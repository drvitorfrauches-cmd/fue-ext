const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; } };
  return elements[id];
}
global.document = {
  addEventListener: function(){},
  getElementById: function(id){ return fakeEl(id); },
  createElement: function(){ return {}; },
  querySelectorAll: function(){ return { forEach: function(){} }; }
};
var promptValue = null;
var promptCalls = [];
global.window = {
  addEventListener: function(){},
  location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' },
  history:{},
  prompt: function(msg, def){ promptCalls.push({msg:msg, def:def}); return promptValue; }
};
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };

var capturedApiCalls = [];
global.fetch = function(url, opts){
  capturedApiCalls.push({ url: url, method: opts && opts.method, body: opts && opts.body ? JSON.parse(opts.body) : null });
  return Promise.resolve({ ok:true, json: function(){ return Promise.resolve(state.session); } });
};

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.CATS=CATS;\n})();");
eval(clientSrc);

// monta uma sessao fake com f2=1000 no quadrante ativo
state.currentId = 'sess1';
state.activeQuadrant = 'temporal_dir';
state.session = {
  id: 'sess1', codigo: 'PAC-1', status: 'andamento', mode: 'completo', createdAt: Date.now(),
  quadrants: {
    temporal_dir: { counts: { f2: 1000 }, mambaCumulativo: null },
    temporal_esq: { counts: {}, mambaCumulativo: null },
    occipital_dir: { counts: {}, mambaCumulativo: null },
    occipital_esq: { counts: {}, mambaCumulativo: null }
  },
  preincCounts: {}, preincDist: {}, photos: { marcacao: [], posop: [] },
  timer: { accumulatedMs: 0, running: false, startedAt: null },
  preincTimer: { accumulatedMs: 0, running: false, startedAt: null }
};

// Caso 1: usuario digita 1250 (delta = +250)
promptValue = '1250';
App.editCount('f2');
console.log('--- Caso 1: 1000 -> 1250 ---');
console.log('prompt mostrou valor atual (1000) como default:', promptCalls[0].def === 1000);
console.log('delta enviado:', capturedApiCalls[0] ? capturedApiCalls[0].body.delta : 'NENHUMA CHAMADA');
console.log('delta correto (+250):', capturedApiCalls[0] && capturedApiCalls[0].body.delta === 250);
console.log('categoria correta (f2):', capturedApiCalls[0] && capturedApiCalls[0].body.category === 'f2');
console.log('quadrante correto:', capturedApiCalls[0] && capturedApiCalls[0].body.quadrant === 'temporal_dir');
console.log('contagem local atualizada otimisticamente:', state.session.quadrants.temporal_dir.counts.f2 === 1250);

// Caso 2: usuario digita valor menor (delta negativo)
capturedApiCalls.length = 0;
promptValue = '800';
App.editCount('f2');
console.log();
console.log('--- Caso 2: 1250 -> 800 ---');
console.log('delta correto (-450):', capturedApiCalls[0] && capturedApiCalls[0].body.delta === -450);

// Caso 3: usuario cancela o prompt (null) -> nao deve chamar API
capturedApiCalls.length = 0;
promptValue = null;
App.editCount('f2');
console.log();
console.log('--- Caso 3: usuario cancela ---');
console.log('nenhuma chamada de API:', capturedApiCalls.length === 0);

// Caso 4: usuario digita mesmo valor -> delta 0, nao deve chamar API
capturedApiCalls.length = 0;
promptValue = '800';
App.editCount('f2');
console.log();
console.log('--- Caso 4: mesmo valor (delta 0) ---');
console.log('nenhuma chamada de API:', capturedApiCalls.length === 0);

// Caso 5: valor invalido (texto) -> nao deve chamar API
capturedApiCalls.length = 0;
promptValue = 'abc';
App.editCount('f2');
console.log();
console.log('--- Caso 5: valor invalido ---');
console.log('nenhuma chamada de API:', capturedApiCalls.length === 0);

// Caso 6: valor negativo -> nao deve chamar API
capturedApiCalls.length = 0;
promptValue = '-5';
App.editCount('f2');
console.log();
console.log('--- Caso 6: valor negativo ---');
console.log('nenhuma chamada de API:', capturedApiCalls.length === 0);

// Caso 7: sessao finalizada -> editCount nao deve fazer nada (nem abrir prompt)
promptCalls.length = 0;
capturedApiCalls.length = 0;
state.session.status = 'finalizada';
App.editCount('f2');
console.log();
console.log('--- Caso 7: cirurgia finalizada ---');
console.log('prompt nao foi chamado:', promptCalls.length === 0);
console.log('nenhuma chamada de API:', capturedApiCalls.length === 0);
