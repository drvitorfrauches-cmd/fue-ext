const fs = require('fs');
global.document = { addEventListener: function(){}, getElementById: function(){ return {style:{},innerHTML:'',textContent:'',value:'',classList:{add:function(){},remove:function(){}}}; }, createElement: function(){ return {}; }, querySelectorAll: function(){ return { forEach: function(){} }; }, activeElement:null };
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.mambaPrevCumulativo=mambaPrevCumulativo; global.mambaFinalCumulativo=mambaFinalCumulativo; global.quadrantDurationMs=quadrantDurationMs; global.computeMambaDiff=computeMambaDiff; global.mambaRatePerHour=mambaRatePerHour; global.QUADRANTS=QUADRANTS;\n})();");
eval(clientSrc);

// Sessão real capturada via HTTP contra o server.js de verdade, preenchida na ordem
// que o usuário descreveu: occipital_dir -> occipital_esq -> temporal_esq -> temporal_dir
// (a ordem FIXA da lista de quadrantes é: temporal_dir, temporal_esq, occipital_dir, occipital_esq)
var sReal = JSON.parse(fs.readFileSync('session.json','utf8'));
var s = { quadrants: {
  temporal_dir: { counts:{}, mambaCumulativo: sReal.quadrants.temporal_dir.mambaCumulativo, mambaMarkTimeMs: sReal.quadrants.temporal_dir.mambaMarkTimeMs },
  temporal_esq: { counts:{}, mambaCumulativo: sReal.quadrants.temporal_esq.mambaCumulativo, mambaMarkTimeMs: sReal.quadrants.temporal_esq.mambaMarkTimeMs },
  occipital_dir: { counts:{}, mambaCumulativo: sReal.quadrants.occipital_dir.mambaCumulativo, mambaMarkTimeMs: sReal.quadrants.occipital_dir.mambaMarkTimeMs },
  occipital_esq: { counts:{}, mambaCumulativo: sReal.quadrants.occipital_esq.mambaCumulativo, mambaMarkTimeMs: sReal.quadrants.occipital_esq.mambaMarkTimeMs }
}};

console.log('--- Deltas do Mamba (esperado: 1000, 900, 900, 800 na ordem real de preenchimento) ---');
function delta(quadId){ return s.quadrants[quadId].mambaCumulativo - mambaPrevCumulativo(s, quadId); }
console.log('occipital_dir (1o preenchido) delta:', delta('occipital_dir'), '(esperado 1000, veio do zero)');
console.log('occipital_esq (2o preenchido) delta:', delta('occipital_esq'), '(esperado 900 = 1900-1000)');
console.log('temporal_esq  (3o preenchido) delta:', delta('temporal_esq'), '(esperado 900 = 2800-1900) <- ANTES da correção isso dava 2800!');
console.log('temporal_dir  (4o preenchido) delta:', delta('temporal_dir'), '(esperado 800 = 3600-2800)');

console.log();
console.log('--- Duração de cada quadrante (baseada no horário real, ~1000ms cada) ---');
['occipital_dir','occipital_esq','temporal_esq','temporal_dir'].forEach(function(id){
  var d = quadrantDurationMs(s, id);
  console.log(id, '-> duração (ms):', d);
});

console.log();
console.log('--- Mamba final (deve ser o do quadrante marcado por ÚLTIMO de verdade: temporal_dir = 3600) ---');
console.log('mambaFinalCumulativo:', mambaFinalCumulativo(s), '(esperado 3600 — o ÚLTIMO por horário, não o último da lista fixa que seria occipital_esq)');

console.log();
console.log('--- Checagem final ---');
var somaDeltas = delta('occipital_dir')+delta('occipital_esq')+delta('temporal_esq')+delta('temporal_dir');
console.log('soma dos 4 deltas bate com o Mamba final (3600):', somaDeltas === 3600, '(soma =', somaDeltas, ')');
