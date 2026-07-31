// Confere a tradução do relatório impresso (App.printReport): título, rótulos
// do resumo geral, tabela de categorias por quadrante, pré-incisões e rodapé
// de data, tanto em português quanto em inglês, sem recarregar a página.
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
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{}, print: function(){ global.__printed = true; } };
global.navigator = { language: 'pt-BR' };
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

function baseSession(mode){
  return {
    id:'abc123', codigo:'PAC-TESTE', status:'andamento', mode: mode||'completo', createdAt: Date.now(),
    ownerBranding:{}, photos:{marcacao:[],posop:[]},
    quadrants: { temporal_dir:{counts:{f1:5,ttotal:1},mambaCumulativo:null}, temporal_esq:{counts:{},mambaCumulativo:null}, occipital_dir:{counts:{},mambaCumulativo:null}, occipital_esq:{counts:{},mambaCumulativo:null} },
    preincCounts:{linha:3}, preincDist:{},
    timer:{accumulatedMs:600000,running:false,startedAt:null},
    preincTimer:{accumulatedMs:0,running:false,startedAt:null},
    globalTimerStartedAt: Date.now()-600000, globalTimerEndedAt: null
  };
}

console.log('--- relatório em português ---');
state.lang = 'pt';
state.session = baseSession('completo');
App.printReport();
var htmlPt = elements['print-report'].innerHTML;
console.log('título "Relatório de Extração Folicular":', htmlPt.indexOf('Relatório de Extração Folicular') !== -1);
console.log('rótulo "Paciente (código)":', htmlPt.indexOf('Paciente (código)') !== -1);
console.log('rótulo "Resumo geral (todos os quadrantes)":', htmlPt.indexOf('Resumo geral (todos os quadrantes)') !== -1);
console.log('cabeçalho tabela "Fios/folículo":', htmlPt.indexOf('Fios/folículo') !== -1);
console.log('seção "Pré-incisões":', htmlPt.indexOf('>Pré-incisões<') !== -1);
console.log('rodapé "Gerado em":', htmlPt.indexOf('Gerado em') !== -1);

console.log();
console.log('--- relatório em inglês (sem reload) ---');
state.lang = 'en';
App.printReport();
var htmlEn = elements['print-report'].innerHTML;
console.log('título "Follicular Extraction Report":', htmlEn.indexOf('Follicular Extraction Report') !== -1);
console.log('rótulo "Patient (code)":', htmlEn.indexOf('Patient (code)') !== -1);
console.log('rótulo "Overall summary (all quadrants)":', htmlEn.indexOf('Overall summary (all quadrants)') !== -1);
console.log('cabeçalho tabela "Hairs/follicle":', htmlEn.indexOf('Hairs/follicle') !== -1);
console.log('seção "Pre-incisions":', htmlEn.indexOf('>Pre-incisions<') !== -1);
console.log('rodapé "Generated on":', htmlEn.indexOf('Generated on') !== -1);
console.log('quadrante traduzido "Extraction — Right temporal":', htmlEn.indexOf('Extraction — Right temporal') !== -1);
console.log('nenhum texto solto em português restou nos rótulos principais:', htmlEn.indexOf('Relatório de Extração Folicular') === -1);

console.log();
console.log('--- window.print() foi chamado ---');
console.log('__printed:', global.__printed === true);
