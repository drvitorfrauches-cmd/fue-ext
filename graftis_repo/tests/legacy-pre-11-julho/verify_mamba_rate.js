const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; }, textContent:'', value:'' };
  return elements[id];
}
global.document = { addEventListener: function(){}, getElementById: function(id){ return fakeEl(id); }, createElement: function(){ return {}; }, querySelectorAll: function(){ return { forEach: function(){} }; }, activeElement: null };
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.mambaPrevMarkTimeMs=mambaPrevMarkTimeMs; global.quadrantDurationMs=quadrantDurationMs; global.mambaRatePerHour=mambaRatePerHour; global.render=render;\n})();");
eval(clientSrc);

// Reconstrói a sessão real capturada via HTTP (server.js de verdade), com os
// mambaMarkTimeMs que o servidor calculou sozinho.
var s = {
  id:'57d5d46c', codigo:'PAC-TESTE', status:'andamento', mode:'completo', createdAt: Date.now(),
  quadrants: {
    temporal_dir: { counts:{f1:900}, mambaCumulativo: 1000, mambaMarkTimeMs: 2025 },
    temporal_esq: { counts:{f1:750}, mambaCumulativo: 1800, mambaMarkTimeMs: 5050 },
    occipital_dir: { counts:{}, mambaCumulativo: null, mambaMarkTimeMs: null },
    occipital_esq: { counts:{}, mambaCumulativo: null, mambaMarkTimeMs: null }
  },
  preincCounts:{}, preincDist:{}, photos:{marcacao:[],posop:[]},
  timer:{accumulatedMs: 5050, running:false, startedAt:null},
  preincTimer:{accumulatedMs:0,running:false,startedAt:null}
};

console.log('--- helpers puros ---');
console.log('mambaPrevMarkTimeMs(temporal_esq):', mambaPrevMarkTimeMs(s,'temporal_esq'), '(esperado 2025, o mark do temporal_dir)');
console.log('mambaPrevMarkTimeMs(temporal_dir):', mambaPrevMarkTimeMs(s,'temporal_dir'), '(esperado 0, é o primeiro)');
var durDir = quadrantDurationMs(s,'temporal_dir');
var durEsq = quadrantDurationMs(s,'temporal_esq');
console.log('duração temporal_dir:', durDir, '(esperado 2025 = 2025-0)');
console.log('duração temporal_esq:', durEsq, '(esperado 3025 = 5050-2025)');
console.log('duração occipital_dir (sem mamba):', quadrantDurationMs(s,'occipital_dir'), '(esperado null)');

var deltaEsq = 1800-1000; // 800
var rateEsq = mambaRatePerHour(deltaEsq, durEsq);
console.log('ritmo Mamba temporal_esq (fol/h):', rateEsq.toFixed(0), '= 800/(3025/3600000)');
console.log('rate null quando duração null:', mambaRatePerHour(100, null) === null);
console.log('rate null quando duração <=0:', mambaRatePerHour(100, 0) === null && mambaRatePerHour(100,-5) === null);

console.log();
console.log('--- render() no quadrante ativo (temporal_esq) ---');
state.currentId = s.id;
state.activeQuadrant = 'temporal_esq';
state.session = s;
render();
console.log('quad-mamba-duracao textContent:', elements['quad-mamba-duracao'].textContent);
console.log('quad-mamba-rate textContent:', elements['quad-mamba-rate'].textContent);
console.log('geral-mamba-rate textContent:', elements['geral-mamba-rate'].textContent);

console.log();
console.log('--- render() no primeiro quadrante (temporal_dir, duração = mark - 0) ---');
state.activeQuadrant = 'temporal_dir';
render();
console.log('quad-mamba-duracao (temporal_dir):', elements['quad-mamba-duracao'].textContent, '(esperado 00:00:02)');

console.log();
console.log('--- render() num quadrante sem mamba (occipital_dir) mostra travessão ---');
state.activeQuadrant = 'occipital_dir';
render();
console.log('quad-mamba-summary escondido (display none):', elements['quad-mamba-summary'].style.display === 'none');
