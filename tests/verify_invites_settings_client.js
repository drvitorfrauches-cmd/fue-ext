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
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{}, open:function(){} };
global.navigator = {};
global.localStorage = { getItem:function(){return null;}, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };

var fetchCalls = [];
global.fetch = function(url, opts){
  fetchCalls.push({ url: url, opts: opts });
  if (url === '/api/admin/invites' && opts && opts.method === 'POST'){
    return Promise.resolve({ ok:true, json:function(){ return Promise.resolve({ token:'tok123', url:'http://localhost:3000/convite/tok123', expiresAt: Date.now()+1000 }); } });
  }
  if (url === '/api/admin/invites' && (!opts || !opts.method || opts.method === 'GET')){
    return Promise.resolve({ ok:true, json:function(){ return Promise.resolve({ invites: [ { createdAt: Date.now(), expiresAt: Date.now()+1000, usedAt: null, status: 'pendente' } ] }); } });
  }
  return Promise.reject(new Error('rota não esperada no teste: ' + url));
};

var clientSrc = fs.readFileSync('extracted.js','utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

var allChecks = [];
function check(label, ok) { allChecks.push(ok); console.log(label + ':', ok); }

console.log('--- App.generateInvite() chama o endpoint e abre o modal com o link ---');
App.generateInvite().then(function(){
  check('modal com classe show', elements['invite-modal-overlay'].classList.contains('show'));
  check('invite-url preenchido com o link retornado', elements['invite-url'].textContent === 'http://localhost:3000/convite/tok123');
  check('state.currentInviteUrl guardado', state.currentInviteUrl === 'http://localhost:3000/convite/tok123');

  console.log();
  console.log('--- App.closeInviteModal() ---');
  App.closeInviteModal();
  check('modal sem classe show', !elements['invite-modal-overlay'].classList.contains('show'));

  console.log();
  console.log('--- App.loadInvitesList() preenche a lista ---');
  return App.loadInvitesList();
}).then(function(){
  check('invites-list tem conteúdo', elements['invites-list'].innerHTML.length > 0);

  var allPass = allChecks.every(function (v) { return v === true; });
  console.log();
  console.log(allPass ? 'TODOS OS TESTES PASSARAM' : 'FALHA: verificar acima');
  if (!allPass) process.exitCode = 1;
}).catch(function(err){
  console.log('ERRO INESPERADO:', err);
  process.exitCode = 1;
});
