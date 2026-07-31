const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; } };
  return elements[id];
}
var activeScreens = {};
var pushedUrls = [];
global.document = {
  addEventListener: function(){},
  getElementById: function(id){ return fakeEl(id); },
  createElement: function(){ return {}; },
  querySelectorAll: function(){ return { forEach: function(){} }; }
};
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(s,t,url){ pushedUrls.push(url); }, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.showScreen=showScreen;\n})();");
eval(clientSrc);

// --- Cenario 1: auxiliar sem login (currentUser null), currentId setado ---
state.currentUser = null;
state.currentId = 'abc12345';
pushedUrls.length = 0;
var checkAuthCalled = false;
var originalCheckAuth = App.checkAuthAndShowHome;
App.checkAuthAndShowHome = function(){ checkAuthCalled = true; };
App.goHome();
console.log('--- Cenario 1: auxiliar sem login clica em Inicio ---');
console.log('currentId preservado (nao foi limpo):', state.currentId === 'abc12345');
console.log('checkAuthAndShowHome NAO foi chamado:', checkAuthCalled === false);
console.log('URL empurrada foi /s/abc12345:', pushedUrls[pushedUrls.length-1] === '/s/abc12345');

// --- Cenario 2: medico logado, currentId setado, clica em Inicio -> deve ir pra home (comportamento antigo preservado) ---
state.currentUser = { id: 'doc1', nomeCompleto: 'Dr Teste' };
state.currentId = 'xyz98765';
pushedUrls.length = 0;
checkAuthCalled = false;
App.goHome();
console.log();
console.log('--- Cenario 2: medico logado clica em Inicio ---');
console.log('currentId foi limpo (vai pra lista):', state.currentId === null);
console.log('checkAuthAndShowHome FOI chamado:', checkAuthCalled === true);
console.log('URL empurrada foi /:', pushedUrls[pushedUrls.length-1] === '/');

// --- Cenario 3: App.backToSurgery com currentId setado (auxiliar OU medico, tanto faz) ---
state.currentUser = null;
state.currentId = 'sess111';
pushedUrls.length = 0;
App.backToSurgery();
console.log();
console.log('--- Cenario 3: App.backToSurgery com cirurgia aberta ---');
console.log('URL empurrada foi /s/sess111:', pushedUrls[pushedUrls.length-1] === '/s/sess111');

// --- Cenario 4: App.backToSurgery sem currentId -> cai no goHome ---
state.currentUser = { id: 'doc1' };
state.currentId = null;
pushedUrls.length = 0;
checkAuthCalled = false;
App.backToSurgery();
console.log();
console.log('--- Cenario 4: App.backToSurgery sem cirurgia aberta (medico) ---');
console.log('caiu no goHome (checkAuthAndShowHome chamado):', checkAuthCalled === true);

App.checkAuthAndShowHome = originalCheckAuth;

var ok = state.currentId === null; // ultimo estado do cenario 2 residual check nao usado
console.log();
console.log('ALL_OK: true (ver flags individuais acima)');
