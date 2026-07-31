const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = {
    id:id, style:{}, _classes:{}, _innerHTML:'', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML=v; },
    classList:{
      add:function(c){ elements[id]._classes[c]=true; },
      remove:function(c){ delete elements[id]._classes[c]; },
      contains:function(c){ return !!elements[id]._classes[c]; }
    },
    textContent:'', value:''
  };
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
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

state.currentId = 'abc123';
document.getElementById('share-modal-overlay');
document.getElementById('share-url');

console.log('--- estado inicial: modal fechado ---');
console.log('overlay sem classe show:', !elements['share-modal-overlay'].classList.contains('show'));

console.log();
console.log('--- App.openShareModal() ---');
App.openShareModal();
console.log('overlay com classe show:', elements['share-modal-overlay'].classList.contains('show'));
console.log('share-url preenchido com o link da cirurgia:', elements['share-url'].textContent.indexOf('/s/abc123') !== -1);

console.log();
console.log('--- App.closeShareModal() ---');
App.closeShareModal();
console.log('overlay sem classe show de novo:', !elements['share-modal-overlay'].classList.contains('show'));
