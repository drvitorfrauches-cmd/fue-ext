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

var nextCheckValid = true;
global.fetch = function(url){
  if (/^\/api\/invites\/.+\/check$/.test(url)){
    return Promise.resolve({ ok:true, json:function(){ return Promise.resolve({ valid: nextCheckValid }); } });
  }
  return Promise.reject(new Error('rota não esperada no teste: ' + url));
};

var clientSrc = fs.readFileSync('extracted.js','utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

var allChecks = [];
function check(label, ok) { allChecks.push(ok); console.log(label + ':', ok); }

console.log('--- App.switchAuthTab não quebra mais sem o botão authtab-cadastro-btn (removido nesta tarefa) ---');
var threw = false;
try { App.switchAuthTab('login'); App.switchAuthTab('cadastro'); } catch (e) { threw = true; }
check('não lançou erro', threw === false);

console.log();
console.log('--- Convite VÁLIDO: mostra o painel de cadastro, esconde as abas ---');
nextCheckValid = true;
App.checkInviteAndShowScreen('tokenvalido123').then(function(){
  check('state.inviteToken guardado', state.inviteToken === 'tokenvalido123');
  check('linha de abas escondida', elements['auth-tabs-row'].style.display === 'none');
  check('painel de cadastro visível', elements['authpanel-cadastro'].style.display === '');
  check('mensagem de convite inválido escondida', elements['invite-invalid-msg'].style.display === 'none');

  console.log();
  console.log('--- Convite INVÁLIDO: esconde os formulários, mostra a mensagem ---');
  nextCheckValid = false;
  return App.checkInviteAndShowScreen('tokeninvalido456');
}).then(function(){
  check('mensagem de convite inválido visível', elements['invite-invalid-msg'].style.display === 'block');
  check('painel de login escondido', elements['authpanel-login'].style.display === 'none');
  check('painel de cadastro escondido', elements['authpanel-cadastro'].style.display === 'none');

  var allPass = allChecks.every(function (v) { return v === true; });
  console.log();
  console.log(allPass ? 'TODOS OS TESTES PASSARAM' : 'FALHA: verificar acima');
  if (!allPass) process.exitCode = 1;
}).catch(function(err){
  console.log('ERRO INESPERADO:', err);
  process.exitCode = 1;
});
