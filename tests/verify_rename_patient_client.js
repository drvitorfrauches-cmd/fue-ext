// Cliente: botão ✏️ só aparece pro médico dono; renamePatient manda o novo nome.
const fs = require('fs');
var elements = {};
function fakeEl(id){ if (!elements[id]) elements[id] = { id:id, className:'', style:{}, classList:{add:function(){},remove:function(){}}, innerHTML:'', textContent:'', value:'', placeholder:'', disabled:false, getAttribute:function(){return null;}, setAttribute:function(){} }; return elements[id]; }
global.document = { documentElement:{style:{setProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){}}, lang:''}, addEventListener:function(){}, getElementById:function(id){return fakeEl(id);}, createElement:function(){return {};}, querySelectorAll:function(){return [];}, activeElement:null };
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{}, confirm:function(){return true;} };
global.navigator = { language:'pt-BR' };
global.localStorage = { getItem:function(){return null;}, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
var last = null;
global.fetch = function(url, opts){ last = { url:String(url), body: opts && opts.body ? JSON.parse(opts.body) : null }; var res = Object.assign({}, state.session, { codigo: last.body && last.body.codigo ? last.body.codigo : state.session.codigo }); return Promise.resolve({ ok:true, json:function(){ return Promise.resolve(res); } }); };
var src = fs.readFileSync('extracted.js','utf8');
src = src.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render;\n})();");
eval(src);
function empty(){ return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0}; }
function mk(ownerId){ var q=function(){return {counts:empty(),mambaCumulativo:null,mambaMarkTimeMs:null,mambaMarkedAtMs:null};};
  return { id:'abc123', codigo:'JS-0001', status:'andamento', mode:'completo', createdAt:Date.now(), ownerBranding:{ownerId:ownerId}, photos:{marcacao:[],posop:[]},
   quadrants:{temporal_dir:q(),temporal_esq:q(),occipital_dir:q(),occipital_esq:q()}, preincCounts:{}, preincDist:{}, timer:{accumulatedMs:0,running:false,startedAt:null}, preincTimer:{accumulatedMs:0,running:false,startedAt:null}, globalTimerStartedAt:null, globalTimerEndedAt:null, finalizedAt:null, patientInfo:{} }; }
state.lang='pt'; state.currentId='abc123';
state.currentUser = { id:'dono1' }; state.session = mk('dono1'); render();
console.log('dono vê o botão de editar:', elements['btn-rename-patient'].style.display === 'inline-block');
state.currentUser = { id:'outro' }; render();
console.log('outro médico não vê o botão:', elements['btn-rename-patient'].style.display === 'none');
state.currentUser = null; render();
console.log('quem só tem o link não vê o botão:', elements['btn-rename-patient'].style.display === 'none');
state.currentUser = { id:'dono1' }; render();
App.renamePatient();
fakeEl('dialog-modal-input').value = 'Maria Silva';
App.dialogModalOk();
setTimeout(function(){
  console.log('chamou endpoint /rename:', !!last && last.url.indexOf('/api/session/abc123/rename') !== -1);
  console.log('enviou o novo nome:', last && last.body.codigo === 'Maria Silva');
  console.log('título atualizado na tela:', elements['cnt-codigo'].textContent === 'Maria Silva');
  last = null;
  App.renamePatient(); fakeEl('dialog-modal-input').value = 'Maria Silva'; App.dialogModalOk();
  setTimeout(function(){ console.log('mesmo nome não chama o servidor:', last === null); }, 50);
}, 50);
