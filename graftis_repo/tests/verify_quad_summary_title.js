const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; }, textContent:'', value:'' };
  return elements[id];
}
global.document = { documentElement:{style:{setProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){}}}, addEventListener: function(){}, getElementById: function(id){ return fakeEl(id); }, createElement: function(){ return {}; }, querySelectorAll: function(){ return { forEach: function(){} }; }, activeElement: null };
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render; global.quadrantById=quadrantById;\n})();");
eval(clientSrc);

var s = {
  id:'abc123', codigo:'PAC-TESTE', status:'andamento', mode:'completo', createdAt: Date.now(),
  quadrants: {
    temporal_dir: { counts:{f1:10}, mambaCumulativo: null, mambaMarkTimeMs: null },
    temporal_esq: { counts:{f1:5}, mambaCumulativo: null, mambaMarkTimeMs: null },
    occipital_dir: { counts:{}, mambaCumulativo: null, mambaMarkTimeMs: null },
    occipital_esq: { counts:{}, mambaCumulativo: null, mambaMarkTimeMs: null }
  },
  preincCounts:{}, preincDist:{}, photos:{marcacao:[],posop:[]},
  timer:{accumulatedMs: 0,running:false,startedAt:null},
  preincTimer:{accumulatedMs:0,running:false,startedAt:null}
};

state.currentId = s.id;
state.session = s;

console.log('--- título do resumo fixo reflete o quadrante ativo ---');
['temporal_dir','temporal_esq','occipital_dir','occipital_esq'].forEach(function(qid){
  state.activeQuadrant = qid;
  render();
  var titleTxt = elements['quad-summary-title'].textContent;
  var expected = quadrantById(qid).label;
  console.log(qid, '-> quad-summary-title:', JSON.stringify(titleTxt), '(esperado', JSON.stringify(expected)+')', titleTxt === expected ? 'OK' : 'FALHOU');
});

console.log();
console.log('--- título some/aparece junto com o restante do bloco (não é elemento órfão) ---');
console.log('quad-title (H2 do card de Mamba) também bate:', elements['quad-title'].textContent === elements['quad-summary-title'].textContent);
