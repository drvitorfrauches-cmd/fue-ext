const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; }, textContent:'', value:'', disabled:false };
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
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render;\n})();");
eval(clientSrc);

function baseSession(status){
  return {
    id:'abc123', codigo:'PAC-TESTE', status: status, mode:'completo', createdAt: Date.now(),
    quadrants: { temporal_dir:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null}, temporal_esq:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null}, occipital_dir:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null}, occipital_esq:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null} },
    preincCounts:{}, preincDist:{}, photos:{marcacao:[],posop:[]},
    timer:{accumulatedMs:5000,running:false,startedAt:null},
    preincTimer:{accumulatedMs:3000,running:false,startedAt:null},
    globalTimerStartedAt: Date.now()-10000, globalTimerEndedAt: Date.now()
  };
}

console.log('--- cirurgia em andamento: botões de cronômetro habilitados ---');
var s1 = baseSession('andamento');
state.currentId = s1.id; state.session = s1; state.activeQuadrant='temporal_dir';
render();
console.log('timer-toggle-btn habilitado:', elements['timer-toggle-btn'].disabled === false);
console.log('timer-reset-btn habilitado:', elements['timer-reset-btn'].disabled === false);
console.log('preinc-timer-toggle-btn habilitado:', elements['preinc-timer-toggle-btn'].disabled === false);
console.log('preinc-timer-reset-btn habilitado:', elements['preinc-timer-reset-btn'].disabled === false);

console.log();
console.log('--- cirurgia finalizada: botões de cronômetro desabilitados ---');
var s2 = baseSession('finalizada');
state.session = s2;
render();
console.log('timer-toggle-btn desabilitado:', elements['timer-toggle-btn'].disabled === true);
console.log('timer-reset-btn desabilitado:', elements['timer-reset-btn'].disabled === true);
console.log('preinc-timer-toggle-btn desabilitado:', elements['preinc-timer-toggle-btn'].disabled === true);
console.log('preinc-timer-reset-btn desabilitado:', elements['preinc-timer-reset-btn'].disabled === true);
