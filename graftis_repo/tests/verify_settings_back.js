const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id:id, className:'', style:{}, classList:{add:function(){},remove:function(){}}, _innerHTML:'', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML=v; }, textContent:'', value:'', checked:false };
  return elements[id];
}
global.document = {
  addEventListener:function(){}, getElementById:function(id){ return fakeEl(id); },
  createElement:function(){ return {style:{}}; },
  querySelectorAll:function(){ return { forEach:function(){} }; },
  activeElement:null,
  documentElement:{ style:{ setProperty:function(){} }, classList:{ add:function(){}, remove:function(){}, toggle:function(){} } }
};
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{} };
global.navigator = {};
global.localStorage = { getItem:function(){return null;}, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js','utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.showScreen=showScreen;\n})();");
eval(clientSrc);

console.log('--- Settings acessado DE DENTRO de uma cirurgia (currentId setado) ---');
state.currentId = 'abc123';
state.currentUser = { id:'doc1', branding:{theme:'padrao',darkMode:false,logoFilename:null,ownerId:'doc1'} };
App.showSettings();
console.log('footer de voltar visivel:', elements['settings-back-footer'].style.display === 'flex');

console.log();
console.log('--- Settings acessado da Home (sem cirurgia ativa, currentId null) ---');
state.currentId = null;
App.showSettings();
console.log('footer de voltar escondido:', elements['settings-back-footer'].style.display === 'none');

console.log();
console.log('--- App.backToSurgery() com currentId setado navega pra tela de contagem ---');
state.currentId = 'abc123';
var pushed = null;
global.history.pushState = function(a,b,url){ pushed = url; };
App.backToSurgery();
console.log('pushState chamado com /s/abc123:', pushed === '/s/abc123');
