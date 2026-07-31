const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; } };
  return elements[id];
}
global.document = {
  addEventListener: function(){},
  getElementById: function(id){ return fakeEl(id); },
  createElement: function(){ return {}; },
  querySelectorAll: function(){ return { forEach: function(){} }; }
};
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

// Caso A: sem cirurgia aberta -> botao "Voltar pra cirurgia" deve ficar escondido
state.currentId = null;
App.showSettings();
console.log('Caso A (sem cirurgia aberta): display =', elements['settings-back-btn'].style.display, '(esperado: none)');

// Caso B: com cirurgia aberta (auxiliar OU medico) -> botao deve aparecer
state.currentId = 'abc12345';
App.showSettings();
console.log('Caso B (com cirurgia aberta): display =', elements['settings-back-btn'].style.display, '(esperado: inline-block)');

var ok = elements['settings-back-btn'].style.display === 'inline-block';
// reverifica caso A de novo pra garantir que nao ficou "grudado"
state.currentId = null;
App.showSettings();
var ok2 = elements['settings-back-btn'].style.display === 'none';
console.log('Caso A repetido (deve voltar a esconder): display =', elements['settings-back-btn'].style.display);
console.log('ALL_OK:', ok && ok2);
process.exit((ok && ok2) ? 0 : 1);
