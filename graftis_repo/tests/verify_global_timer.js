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
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render; global.globalElapsedMs=globalElapsedMs; global.fmtHMS=fmtHMS; global.elapsedMs=elapsedMs;\n})();");
eval(clientSrc);

function baseSession(){
  return {
    id:'abc123', codigo:'PAC-TESTE', status:'andamento', mode:'completo', createdAt: Date.now(),
    quadrants: { temporal_dir:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null}, temporal_esq:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null}, occipital_dir:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null}, occipital_esq:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null} },
    preincCounts:{}, preincDist:{}, photos:{marcacao:[],posop:[]},
    timer:{accumulatedMs:0,running:false,startedAt:null},
    preincTimer:{accumulatedMs:0,running:false,startedAt:null},
    globalTimerStartedAt: null, globalTimerEndedAt: null
  };
}

console.log('--- ainda não iniciado nenhum cronômetro ---');
var s1 = baseSession();
console.log('globalElapsedMs === null:', globalElapsedMs(s1) === null);
state.currentId = s1.id; state.session = s1; state.activeQuadrant='temporal_dir';
render();
console.log('cnt-global-timer mostra "ainda não iniciado":', elements['cnt-global-timer'].textContent.indexOf('ainda não iniciado') !== -1);

console.log();
console.log('--- pré-incisões iniciado primeiro (extração nunca iniciada) ---');
var s2 = baseSession();
var startedAgo = Date.now() - 5000; // simula 5s atrás
s2.globalTimerStartedAt = startedAgo;
s2.preincTimer = { accumulatedMs:0, running:true, startedAt: startedAgo };
state.session = s2;
render();
var g2 = globalElapsedMs(s2);
console.log('globalElapsedMs ~5000ms:', g2 >= 4900 && g2 <= 5500, '(valor:', g2+')');
console.log('cnt-global-timer mostra "em andamento":', elements['cnt-global-timer'].textContent.indexOf('em andamento') !== -1);

console.log();
console.log('--- extração pausada não impede o tempo global de continuar contando ---');
var s3 = baseSession();
var started3 = Date.now() - 10000;
s3.globalTimerStartedAt = started3;
s3.timer = { accumulatedMs: 3000, running:false, startedAt:null }; // já rodou 3s e pausou
state.session = s3;
var g3 = globalElapsedMs(s3);
console.log('elapsedMs do timer de extração (pausado) = 3000:', elapsedMs(s3.timer) === 3000);
console.log('globalElapsedMs continua ~10000ms mesmo com extração pausada:', g3 >= 9900 && g3 <= 10500, '(valor:', g3+')');

console.log();
console.log('--- cirurgia finalizada: tempo global congela em globalTimerEndedAt ---');
var s4 = baseSession();
var started4 = Date.now() - 20000;
var ended4 = Date.now() - 5000;
s4.globalTimerStartedAt = started4;
s4.globalTimerEndedAt = ended4;
s4.status = 'finalizada';
var g4 = globalElapsedMs(s4);
console.log('globalElapsedMs = ended-started = 15000ms:', g4 === (ended4-started4), '(valor:', g4+')');
state.session = s4;
render();
console.log('cnt-global-timer mostra "(finalizado)":', elements['cnt-global-timer'].textContent.indexOf('(finalizado)') !== -1);

console.log();
console.log('--- rótulo do card de extração foi renomeado (não fica mais "Tempo de cirurgia" ambíguo) ---');
console.log('extracted.js contém "Tempo de extração":', clientSrc.indexOf('Tempo de extração') !== -1);
console.log('extracted.js NÃO contém mais o rótulo antigo "Tempo de cirurgia" no card:', clientSrc.indexOf('>Tempo de cirurgia<') === -1);
