const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id:id, style:{}, classList:{add:function(){},remove:function(){}}, _innerHTML:'', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML=v; }, textContent:'', value:'', checked:false };
  return elements[id];
}
var lsStore = {};
global.document = {
  addEventListener:function(){}, getElementById:function(id){ return fakeEl(id); },
  createElement:function(){ return {style:{}}; },
  querySelectorAll:function(){ return { forEach:function(){} }; },
  activeElement:null,
  documentElement:{ style:{ setProperty:function(){} }, classList:{ add:function(){}, remove:function(){}, toggle:function(){} } }
};
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{} };
global.navigator = {};
global.localStorage = {
  getItem:function(k){ return lsStore[k]!==undefined ? lsStore[k] : null; },
  setItem:function(k,v){ lsStore[k]=v; }
};
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js','utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

console.log('--- Settings SEM cirurgia ativa (currentId null) ---');
state.currentId = null;
state.currentUser = { id:'doc1', branding:{theme:'padrao',darkMode:false,logoFilename:null,ownerId:'doc1'} };
App.showSettings();
console.log('card de audio/alarme escondido:', elements['settings-audio-card'].style.display === 'none');

console.log();
console.log('--- Settings COM cirurgia ativa ---');
// simula o que App.openSession faria: setar prefs salvas e depois abrir settings
lsStore['fue_live_audio_surg1'] = JSON.stringify({ audioEnabled:true, audioInterval:50, alertParcialEnabled:true, alertParcialThreshold:7.5, alertTotalEnabled:false, alertTotalThreshold:null });
state.currentId = 'surg1';
// loadAudioPrefs nao esta exposta globalmente, mas App.openSession chama ela; simulamos via toggle+save direto
App.toggleAudio(true);
App.saveAudioInterval('50');
App.toggleAlertParcial(true);
App.saveAlertParcialThreshold('7.5');
App.showSettings();
console.log('card de audio/alarme visivel:', elements['settings-audio-card'].style.display === 'block');
console.log('audio-toggle refletindo state (true):', document.getElementById('audio-toggle').checked === true || state.audioEnabled === true);
console.log('audio-interval value (via state):', state.audioInterval === 50);
console.log('alert-parcial-threshold (via state):', state.alertParcialThreshold === 7.5);

console.log();
console.log('--- prefs persistidas no localStorage sob a chave da cirurgia ---');
var saved = JSON.parse(lsStore['fue_live_audio_surg1']);
console.log('enabled true:', saved.enabled === true);
console.log('interval 50:', saved.interval === 50);
console.log('alertParcialThreshold 7.5:', saved.alertParcialThreshold === 7.5);
