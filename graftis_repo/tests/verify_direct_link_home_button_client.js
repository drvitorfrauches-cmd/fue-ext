// Bug reportado pelo Dr. Vitor (14/07/2026): "às vezes clico em Início e não vai
// pra listagem de cirurgias". Causa raiz: ao abrir o app direto por um link de
// cirurgia (/s/:id — ex: atalho salvo, link do WhatsApp, ou refresh na própria tela
// de contagem), o DOMContentLoaded NUNCA chamava /api/me, então state.currentUser
// ficava null a sessão inteira MESMO com uma sessão de médico válida no navegador.
// App.goHome() usa "!state.currentUser && state.currentId" pra decidir se é uma
// auxiliar sem login (aí volta pra própria cirurgia) — com currentUser sempre null
// nesse fluxo, o médico logado caía nesse branch por engano e nunca chegava na Home.
//
// A correção chama api('/api/me') em paralelo com fetchAndRender() nesse fluxo:
// se vier um usuário válido, state.currentUser é populado (Início passa a funcionar
// normal); se der 401 (auxiliar sem login de verdade), o catch não faz nada e o
// comportamento de auxiliar continua preservado.
const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id:id, style:{}, classList:{add:function(){},remove:function(){}}, _innerHTML:'', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML=v; }, textContent:'', value:'', checked:false, disabled:false };
  return elements[id];
}
var domReadyHandlers = {};
global.document = {
  addEventListener:function(evt, fn){ domReadyHandlers[evt] = fn; },
  getElementById:function(id){ return fakeEl(id); },
  createElement:function(){ return {style:{}}; },
  querySelectorAll:function(){ return { forEach:function(){} }; },
  activeElement:null,
  cookie:'',
  documentElement:{ style:{ setProperty:function(){} }, classList:{ add:function(){}, remove:function(){}, toggle:function(){} } }
};
var pushedPaths = [];
global.window = {
  addEventListener:function(){},
  location:{ hostname:'192.168.1.5', origin:'http://192.168.1.5:3000', pathname:'/s/abc123' }, // IP de rede: resolveBaseUrl não precisa de fetch extra
  history:{}
};
global.navigator = { language:'pt-BR' };
global.localStorage = { getItem:function(){ return null; }, setItem:function(){} };
global.history = { pushState:function(state,title,path){ pushedPaths.push(path); }, replaceState:function(){} };
global.setInterval = function(){ return 0; };

var sessionAbc123 = {
  id:'abc123', codigo:'PAC-TESTE', status:'andamento', mode:'completo', createdAt: Date.now(),
  ownerBranding:{}, photos:{marcacao:[],posop:[]},
  quadrants: { occipital_dir:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null,mambaMarkedAtMs:null,carryFromId:null,locked:false}, occipital_esq:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null,mambaMarkedAtMs:null,carryFromId:null,locked:false}, temporal_esq:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null,mambaMarkedAtMs:null,carryFromId:null,locked:false}, temporal_dir:{counts:{},mambaCumulativo:null,mambaMarkTimeMs:null,mambaMarkedAtMs:null,carryFromId:null,locked:false} },
  preincCounts:{recesso_dir:0,recesso_esq:0,linha:0,sublinha:0,entrada_dir1:0,entrada_dir2:0,entrada_esq1:0,entrada_esq2:0,topete1:0,topete2:0,scalp:0,coroa:0},
  preincDist:{}, timer:{accumulatedMs:0, running:false, startedAt:null}, preincTimer:{accumulatedMs:0, running:false, startedAt:null},
  globalTimerStartedAt: null, globalTimerEndedAt: null, finalizedAt: null,
  patientInfo: {idade:null, alturaCm:null, pesoKg:null, cabeloEspessura:null, cabeloTextura:null, raspagem:null}
};
var meResponse = { user: { id:'doc1', nomeCompleto:'Dr Vitor Frauches', branding:{theme:'padrao',darkMode:false,logoFilename:null,ownerId:'doc1',language:'pt'} } };
var meShouldSucceed = true; // controlado por cada cenário do teste

global.fetch = function(url){
  if (String(url).indexOf('/api/session/abc123') !== -1) {
    return Promise.resolve({ ok:true, json:function(){ return Promise.resolve(sessionAbc123); } });
  }
  if (String(url).indexOf('/api/me') !== -1) {
    if (meShouldSucceed) return Promise.resolve({ ok:true, json:function(){ return Promise.resolve(meResponse); } });
    return Promise.resolve({ ok:false, status:401, json:function(){ return Promise.resolve({error:'não autenticado'}); } });
  }
  if (String(url).indexOf('/api/sessions') !== -1) {
    return Promise.resolve({ ok:true, json:function(){ return Promise.resolve([]); } });
  }
  return Promise.reject(new Error('rota não mockada: '+url));
};

var clientSrc = fs.readFileSync('extracted.js','utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

function tick(){ return new Promise(function(r){ setTimeout(r, 20); }); }

(async function(){
  console.log('--- Cenário 1: médico ABRE um link direto de cirurgia (/s/abc123) já logado no navegador ---');
  meShouldSucceed = true;
  domReadyHandlers['DOMContentLoaded'](); // dispara o fluxo real do carregamento da página
  await tick(); await tick();
  console.log('state.currentUser foi populado (sessão de médico detectada):', state.currentUser !== null && state.currentUser.id === 'doc1');

  pushedPaths.length = 0;
  App.goHome();
  await tick();
  console.log('Início navega pra "/" (Home), não fica preso na própria cirurgia:', pushedPaths.indexOf('/') !== -1);
  console.log('Início NÃO navegou de volta pra "/s/abc123":', pushedPaths.indexOf('/s/abc123') === -1);

  console.log();
  console.log('--- Cenário 2 (preserva o comportamento antigo): auxiliar SEM login abre o mesmo tipo de link ---');
  // sessão nova do zero, sem cookie de médico válido
  state.currentUser = null;
  state.currentId = 'abc123';
  meShouldSucceed = false;
  pushedPaths.length = 0;
  domReadyHandlers['DOMContentLoaded']();
  await tick(); await tick();
  console.log('state.currentUser continua null (é mesmo auxiliar sem login):', state.currentUser === null);

  pushedPaths.length = 0;
  App.goHome();
  await tick();
  console.log('Início da auxiliar sem login volta pra própria cirurgia (comportamento original preservado):', pushedPaths.indexOf('/s/abc123') !== -1);
  console.log('Início da auxiliar NÃO tenta ir pra "/" (não existe listagem pra ela ver):', pushedPaths.indexOf('/') === -1);
})();
