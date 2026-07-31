// Confere o lado do cliente da aba "Paciente": render() preenche os campos e
// destaca o botão certo em cada grupo de escolha (espessura/textura/raspagem);
// troca de aba funciona; e o formulário retrátil de cadastro (App.setNewPatientField
// / App.refreshNewPatientButtons / App.createSession) monta o payload certo e
// só manda "patientInfo" quando algo foi de fato preenchido.
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
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{}, confirm: function(){ return true; } };
global.navigator = { language: 'pt-BR' };
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };

var lastApiCall = null;
global.fetch = function(url, opts){
  lastApiCall = { url: String(url), body: opts && opts.body ? JSON.parse(opts.body) : null };
  var resultBody = Object.assign({}, state.session || {}, { patientInfo: Object.assign({}, (state.session||{}).patientInfo||{}, lastApiCall.body||{}) });
  return Promise.resolve({ ok: true, json: function(){ return Promise.resolve(resultBody); } });
};

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render;\n})();");
eval(clientSrc);

function emptyCounts(){
  return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0};
}
function baseSession(patientInfo){
  return {
    id:'abc123', codigo:'PAC-TESTE', status:'andamento', mode:'completo', createdAt: Date.now(),
    ownerBranding:{}, photos:{marcacao:[],posop:[]},
    quadrants: {
      temporal_dir:{counts:emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null},
      temporal_esq:{counts:emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null},
      occipital_dir:{counts:emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null},
      occipital_esq:{counts:emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null}
    },
    preincCounts:{recesso_dir:0,recesso_esq:0,linha:0,sublinha:0,entrada_dir1:0,entrada_dir2:0,entrada_esq1:0,entrada_esq2:0,topete1:0,topete2:0,scalp:0,coroa:0},
    preincDist:{},
    timer:{accumulatedMs:0, running:false, startedAt:null},
    preincTimer:{accumulatedMs:0, running:false, startedAt:null},
    globalTimerStartedAt: null, globalTimerEndedAt: null,
    finalizedAt: null,
    patientInfo: patientInfo || {idade:null, alturaCm:null, pesoKg:null, cabeloEspessura:null, cabeloTextura:null, raspagem:null}
  };
}

console.log('--- render() preenche a aba Paciente a partir de state.session.patientInfo ---');
state.lang = 'pt';
state.currentId = 'abc123';
state.session = baseSession({ idade: 45, alturaCm: 175, pesoKg: 80, cabeloEspessura: 'fino', cabeloTextura: 'ondulado', raspagem: 'sim' });
render();
console.log('idade preenchida (45):', elements['patient-idade'].value === 45);
console.log('altura preenchida (175):', elements['patient-altura'].value === 175);
console.log('peso preenchido (80):', elements['patient-peso'].value === 80);
console.log('botão espessura "Fino" ativo (btn):', elements['patient-espessura-fino'].className === 'btn');
console.log('botão espessura "Grosso" inativo (btn secondary):', elements['patient-espessura-grosso'].className === 'btn secondary');
console.log('botão textura "Ondulado" ativo (btn):', elements['patient-textura-ondulado'].className === 'btn');
console.log('botão textura "Liso" inativo:', elements['patient-textura-liso'].className === 'btn secondary');
console.log('botão textura "Crespo" inativo:', elements['patient-textura-crespo'].className === 'btn secondary');
console.log('botão raspagem "Com raspagem" ativo:', elements['patient-raspagem-sim'].className === 'btn');
console.log('botão raspagem "Sem raspagem" inativo:', elements['patient-raspagem-nao'].className === 'btn secondary');

console.log();
console.log('--- Sessão com patientInfo todo vazio: campos ficam vazios, nenhum botão fica ativo ---');
state.session = baseSession();
render();
console.log('idade vazia:', elements['patient-idade'].value === '');
console.log('nenhum botão de espessura ativo:', elements['patient-espessura-fino'].className === 'btn secondary' && elements['patient-espessura-grosso'].className === 'btn secondary');

console.log();
console.log('--- App.switchTab(\'paciente\') mostra o painel certo e ativa o botão certo ---');
App.switchTab('paciente');
console.log('painel paciente visível:', elements['panel-paciente'].style.display === '');
console.log('painel extracao escondido:', elements['panel-extracao'].style.display === 'none');
console.log('botão paciente ativo (btn):', elements['tab-paciente-btn'].className === 'btn');
console.log('botão extracao inativo (btn secondary):', elements['tab-extracao-btn'].className === 'btn secondary');

console.log();
console.log('--- App.setPatientField manda só o campo alterado pro endpoint certo ---');
App.setPatientField('idade', '52');
console.log('URL correta:', lastApiCall.url.indexOf('/api/session/abc123/patient-info') !== -1);
console.log('body manda só idade:', JSON.stringify(lastApiCall.body) === JSON.stringify({idade:'52'}));

console.log();
console.log('--- Formulário retrátil do cadastro: App.setNewPatientField + App.refreshNewPatientButtons ---');
state.newPatientInfo = {};
App.setNewPatientField('cabeloEspessura', 'grosso');
console.log('state.newPatientInfo atualizado:', state.newPatientInfo.cabeloEspessura === 'grosso');
console.log('botão "Grosso" do cadastro fica ativo:', elements['new-patient-espessura-grosso'].className === 'btn');
console.log('botão "Fino" do cadastro fica inativo:', elements['new-patient-espessura-fino'].className === 'btn secondary');

console.log();
console.log('--- App.createSession só manda patientInfo se algo foi preenchido ---');
state.newPatientInfo = {};
document.getElementById('new-codigo').value = 'PAC-NOVO';
App.createSession();
console.log('payload de criação SEM patientInfo quando nada foi preenchido:', lastApiCall.body.patientInfo === undefined);

state.newPatientInfo = { raspagem: 'nao' };
document.getElementById('new-codigo').value = 'PAC-NOVO-2';
App.createSession();
console.log('payload de criação COM patientInfo quando algo foi preenchido:', JSON.stringify(lastApiCall.body.patientInfo) === JSON.stringify({raspagem:'nao'}));
