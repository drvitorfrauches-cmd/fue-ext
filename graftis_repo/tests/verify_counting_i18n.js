// Confere a tradução da tela de Extração/Pré-incisões/Fotos: (1) os data-i18n
// estáticos existem nos 3 idiomas, (2) render() produz texto traduzido pros
// elementos dinâmicos (status, modo, botões de cronômetro, resumo do Mamba),
// (3) os labels de CATS/QUADRANTS/PREINC_AREAS (getters) acompanham state.lang
// ao vivo — sem precisar recarregar a página.
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
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = { language: 'pt-BR' };
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render; global.CATS=CATS; global.QUADRANTS=QUADRANTS; global.PREINC_AREAS=PREINC_AREAS; global.STRINGS=STRINGS;\n})();");
eval(clientSrc);

function baseSession(status, mode){
  return {
    id:'abc123', codigo:'PAC-TESTE', status: status, mode: mode||'completo', createdAt: Date.now(),
    quadrants: { temporal_dir:{counts:{f1:2,ttotal:1},mambaCumulativo:null,mambaMarkTimeMs:null}, temporal_esq:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null}, occipital_dir:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null}, occipital_esq:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null} },
    preincCounts:{}, preincDist:{}, photos:{marcacao:[],posop:[]},
    timer:{accumulatedMs:5000,running:false,startedAt:null},
    preincTimer:{accumulatedMs:3000,running:false,startedAt:null},
    globalTimerStartedAt: Date.now()-10000, globalTimerEndedAt: null
  };
}

console.log('--- render() em português (padrão) ---');
state.lang = 'pt';
state.currentId = 'abc123'; state.session = baseSession('andamento'); state.activeQuadrant='temporal_dir';
render();
console.log('status "Em andamento":', elements['cnt-status'].textContent === 'Em andamento');
console.log('modo "Modo completo":', elements['cnt-mode'].textContent === 'Modo completo');
console.log('botão cronômetro "Iniciar":', elements['timer-toggle-btn'].textContent === 'Iniciar');
console.log('quadrante "Temporal direito":', elements['quad-title'].textContent === 'Temporal direito');
console.log('categoria integro contém "1 fio":', elements['group-integro'].innerHTML.indexOf('1 fio') !== -1);

console.log();
console.log('--- render() muda pro inglês SEM precisar recarregar a página ---');
state.lang = 'en';
render();
console.log('status "In progress":', elements['cnt-status'].textContent === 'In progress');
console.log('modo "Complete mode":', elements['cnt-mode'].textContent === 'Complete mode');
console.log('botão cronômetro "Start":', elements['timer-toggle-btn'].textContent === 'Start');
console.log('quadrante "Right temporal":', elements['quad-title'].textContent === 'Right temporal');
console.log('categoria integro contém "1 hair":', elements['group-integro'].innerHTML.indexOf('1 hair') !== -1);
console.log('categoria total contém "lost follicle" (via cat.ttotal em EN):', elements['group-total'].innerHTML.indexOf('lost follicle') !== -1);

console.log();
console.log('--- render() com cirurgia finalizada em espanhol ---');
state.lang = 'es';
state.session = baseSession('finalizada');
render();
console.log('status "Finalizada" (es):', elements['cnt-status'].textContent === 'Finalizada');
console.log('botão cronômetro "Iniciar" (es, mesmo pt/es coincidem):', elements['timer-toggle-btn'].textContent === 'Iniciar');

console.log();
console.log('--- CATS/QUADRANTS/PREINC_AREAS: getters refletem state.lang em tempo real ---');
state.lang = 'pt';
var qPt = QUADRANTS.filter(function(q){return q.id==='occipital_esq';})[0].label;
state.lang = 'en';
var qEn = QUADRANTS.filter(function(q){return q.id==='occipital_esq';})[0].label;
console.log('pt:', qPt, '| en:', qEn);
console.log('mudou de fato entre os dois idiomas:', qPt !== qEn && qPt === 'Occipital esquerdo' && qEn === 'Left occipital');

console.log();
console.log('--- todas as chaves cnt.*/preinc.*/photos.*/share.*/cat.*/quad.* existem nos 3 idiomas ---');
var prefixes = ['cnt.','preinc.','photos.','share.','cat.','quad.','common.status','common.start','common.pause','common.reset','audio.'];
var langs = Object.keys(STRINGS);
var allKeys = new Set();
langs.forEach(function(l){ Object.keys(STRINGS[l]).forEach(function(k){ allKeys.add(k); }); });
var relevant = Array.from(allKeys).filter(function(k){ return prefixes.some(function(p){ return k.indexOf(p)===0; }); });
var missing = [];
relevant.forEach(function(k){ langs.forEach(function(l){ if (STRINGS[l][k]===undefined) missing.push(l+':'+k); }); });
console.log('total de chaves relevantes:', relevant.length);
console.log('faltando (deveria ser vazio):', missing);
