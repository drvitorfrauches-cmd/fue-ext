const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id:id, style:{}, classList:{add:function(){},remove:function(){}}, _innerHTML:'', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML=v; }, textContent:'', value:'' };
  return elements[id];
}
global.document = {
  addEventListener:function(){}, getElementById:function(id){ return fakeEl(id); },
  createElement:function(){ return {style:{}}; },
  querySelectorAll:function(){ return { forEach:function(){} }; },
  activeElement:null,
  documentElement:{ style:{ setProperty:function(){} }, classList:{ add:function(){}, remove:function(){}, toggle:function(){} } }
};
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{}, print:function(){ console.log('window.print() chamado'); } };
global.navigator = {};
global.localStorage = { getItem:function(){return null;}, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js','utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

function emptyQuad(){ return { counts:{}, mambaCumulativo:null, mambaMarkTimeMs:null }; }
function baseSession(ownerBranding){
  return {
    id:'p1', codigo:'PAC-PRINT', status:'andamento', mode:'completo', createdAt: Date.now(),
    ownerBranding: ownerBranding,
    quadrants:{ temporal_dir:emptyQuad(), temporal_esq:emptyQuad(), occipital_dir:emptyQuad(), occipital_esq:emptyQuad() },
    preincCounts:{}, preincDist:{}, photos:{marcacao:[],posop:[]},
    timer:{accumulatedMs:0,running:false,startedAt:null}, preincTimer:{accumulatedMs:0,running:false,startedAt:null}
  };
}

console.log('--- com logo (ownerBranding.logoFilename definido) ---');
state.session = baseSession({ theme:'padrao', darkMode:false, logoFilename:'abc.png', ownerId:'docX' });
App.printReport();
var html1 = elements['print-report'].innerHTML;
console.log('contem <img> do logo:', html1.indexOf('/api/user/docX/logo') !== -1);
console.log('logo vem ANTES do <h1>:', html1.indexOf('<img') < html1.indexOf('<h1>'));

console.log();
console.log('--- sem logo (ownerBranding sem logoFilename) ---');
state.session = baseSession({ theme:'padrao', darkMode:false, logoFilename:null, ownerId:'docX' });
App.printReport();
var html2 = elements['print-report'].innerHTML;
console.log('NAO contem <img> de logo:', html2.indexOf('<img') === -1);
console.log('titulo ainda aparece:', html2.indexOf('Relatório de Extração Folicular') !== -1);
