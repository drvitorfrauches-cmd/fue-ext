// Reproduz o bug reportado pelo usuário: na tela Início, os botões "Abrir" e
// "Apagar" de cada card de cirurgia ficaram hardcoded em português e não
// mudavam de idioma. Também confere uma amostra dos toasts/confirms/prompts
// que ficaram de fora da leva anterior (Configurações, Extração, Fotos, Logo).
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

var FAKE_LIST = [
  { id:'s1', codigo:'PAC-1', status:'finalizada', mode:'completo', createdAt: Date.now(),
    quadrants:{temporal_dir:{counts:{},mambaCumulativo:null},temporal_esq:{counts:{},mambaCumulativo:null},occipital_dir:{counts:{},mambaCumulativo:null},occipital_esq:{counts:{},mambaCumulativo:null}},
    preincCounts:{} }
];
global.fetch = function(){
  return Promise.resolve({ ok: true, json: function(){ return Promise.resolve(FAKE_LIST); } });
};

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.loadSurgeryList=loadSurgeryList; global.t=t;\n})();");
eval(clientSrc);

function wait(ms){ return new Promise(function(resolve){ setTimeout(resolve, ms); }); }

console.log('--- lista de cirurgias em português ---');
state.lang = 'pt';
loadSurgeryList();
wait(50).then(function(){
  var html = elements['surgery-list'].innerHTML;
  console.log('contém "Abrir":', html.indexOf('>Abrir<') !== -1);
  console.log('contém "Apagar":', html.indexOf('>Apagar<') !== -1);
  console.log('contém "Finalizada":', html.indexOf('Finalizada') !== -1);

  console.log();
  console.log('--- lista de cirurgias em inglês (bug reportado: antes ficava preso em PT) ---');
  state.lang = 'en';
  loadSurgeryList();
  return wait(50);
}).then(function(){
  var htmlEn = elements['surgery-list'].innerHTML;
  console.log('contém "Open" (não mais "Abrir"):', htmlEn.indexOf('>Open<') !== -1);
  console.log('NÃO contém mais "Abrir":', htmlEn.indexOf('>Abrir<') === -1);
  console.log('contém "Delete" (não mais "Apagar"):', htmlEn.indexOf('>Delete<') !== -1);
  console.log('NÃO contém mais "Apagar":', htmlEn.indexOf('>Apagar<') === -1);
  console.log('contém "Finalized":', htmlEn.indexOf('Finalized') !== -1);

  console.log();
  console.log('--- outros toasts/confirms corrigidos (amostra) ---');
  state.lang = 'en';
  console.log('toast.settings_saved (en):', t('toast.settings_saved') === 'Settings saved.');
  console.log('confirm.finalize_surgery (en):', t('confirm.finalize_surgery').indexOf('Finalize this surgery') !== -1);
  console.log('toast.enter_patient_code (en):', t('toast.enter_patient_code') === 'Enter a patient code or initials.');
  console.log('prompt.set_value_for com variável (en):', t('prompt.set_value_for',{label:'2 fios'}) === 'Set value for "2 fios":');
  console.log('toast.uploading_photos com variável (en):', t('toast.uploading_photos',{n:3}) === 'Uploading 3 photo(s)...');
  state.lang = 'es';
  console.log('confirm.reset_extraction_timer (es):', t('confirm.reset_extraction_timer').indexOf('Reiniciar') !== -1);
  console.log('toast.no_speech_synthesis (es):', t('toast.no_speech_synthesis') === 'Este navegador no tiene síntesis de voz.');
}).catch(function(err){ console.log('ERRO INESPERADO:', err); });
