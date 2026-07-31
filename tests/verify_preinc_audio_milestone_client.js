// Confere o alarme de áudio de PRÉ-INCISÕES depois da mudança de modelo pedida
// pelo Dr. Vitor (14/07/2026): em vez de anunciar só a cada marco de N (ex: a cada
// 1000), agora anuncia o novo total toda vez que uma área é preenchida/editada —
// sem depender de horário ou ordem de preenchimento, porque cada área
// (recesso_dir, linha, etc.) é um contador PRÓPRIO e absoluto, não uma leitura
// acumulada única tipo o Mamba. A soma é sempre recalculada do zero a cada
// render(), então não tem "quem veio antes de quem" pra rastrear.
//
// (nome do arquivo mantido por compatibilidade com o histórico do projeto — o
// teste em si cobre o comportamento NOVO, não mais um "marco").
const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id:id, style:{}, classList:{add:function(){},remove:function(){}}, _innerHTML:'', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML=v; }, textContent:'', value:'', checked:false, disabled:false };
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

var spoken = [];
global.window.speechSynthesis = { speak: function(u){ spoken.push(u.text); } };
global.SpeechSynthesisUtterance = function(text){ this.text = text; this.lang = ''; };

var clientSrc = fs.readFileSync('extracted.js','utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render;\n})();");
eval(clientSrc);

function emptyCounts(){ return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0}; }
function emptyQuad(){ return {counts: emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null, carryFromId:null, locked:false}; }
function baseSession(){
  return {
    id:'surg1', codigo:'PAC-TESTE', status:'andamento', mode:'completo', createdAt: Date.now(),
    ownerBranding:{}, photos:{marcacao:[],posop:[]},
    quadrants: { occipital_dir: emptyQuad(), occipital_esq: emptyQuad(), temporal_esq: emptyQuad(), temporal_dir: emptyQuad() },
    preincCounts:{recesso_dir:0,recesso_esq:0,linha:0,sublinha:0,entrada_dir1:0,entrada_dir2:0,entrada_esq1:0,entrada_esq2:0,topete1:0,topete2:0,scalp:0,coroa:0},
    preincDist:{}, timer:{accumulatedMs:0, running:false, startedAt:null}, preincTimer:{accumulatedMs:0, running:false, startedAt:null},
    globalTimerStartedAt: null, globalTimerEndedAt: null, finalizedAt: null,
    patientInfo: {idade:null, alturaCm:null, pesoKg:null, cabeloEspessura:null, cabeloTextura:null, raspagem:null}
  };
}

console.log('--- Toggle do alarme de pré-incisões persiste em localStorage (sem campo de intervalo — não existe mais) ---');
state.currentId = 'surg1';
App.togglePreincAudio(true);
var saved = JSON.parse(lsStore['fue_live_audio_surg1']);
console.log('preincEnabled true:', saved.preincEnabled === true);
console.log('não sobrou "preincInterval" no objeto salvo:', saved.preincInterval === undefined);
console.log('não mexeu no alarme de folículos (audioEnabled continua false):', saved.enabled === false);

console.log();
console.log('--- Primeira renderização depois de abrir a cirurgia: NÃO anuncia (só grava a base) ---');
spoken.length = 0; // limpa o "ativado" que o toggle lá em cima já tinha falado
state.session = baseSession();
state.activeQuadrant = 'occipital_dir';
state.preincAudioEnabled = true;
state.preincLastTotal = null; // como se tivesse acabado de abrir a cirurgia (loadAudioPrefs correndo antes do 1º fetch)
state.audioEnabled = false; // alarme de folículos desligado, só pra isolar o teste
state.session.preincCounts.recesso_dir = 300; // já tinha 300 antes de eu abrir o app agora
render();
console.log('nenhum anúncio na 1ª renderização, mesmo já tendo 300 pré-incisões:', spoken.length === 0);
console.log('preincLastTotal virou a base (300):', state.preincLastTotal === 300);

console.log();
console.log('--- Preenche recesso direito = 100 (exemplo do Dr. Vitor): anuncia "100 pré-incisões." ---');
spoken.length = 0;
state.session = baseSession(); // sessão nova de verdade, todas as áreas zeradas
state.preincLastTotal = null;
render(); // baseline em 0, sem anunciar
console.log('baseline em 0 sem anunciar:', spoken.length === 0 && state.preincLastTotal === 0);
state.session.preincCounts.recesso_dir = 100;
render();
console.log('anunciou "100 pré-incisões.":', spoken.length === 1 && spoken[0] === '100 pré-incisões.');

console.log();
console.log('--- Preenche recesso esquerdo = 150: soma 100+150=250, anuncia "250 pré-incisões." ---');
state.session.preincCounts.recesso_esq = 150;
render();
console.log('anunciou "250 pré-incisões." (2º anúncio):', spoken.length === 2 && spoken[1] === '250 pré-incisões.');

console.log();
console.log('--- Preenche linha = 250: soma 100+150+250=500, anuncia "500 pré-incisões." (exemplo do Dr. Vitor) ---');
state.session.preincCounts.linha = 250;
render();
console.log('anunciou "500 pré-incisões." (3º anúncio):', spoken.length === 3 && spoken[2] === '500 pré-incisões.');

console.log();
console.log('--- Renderizar de novo sem mudar nada NÃO re-anuncia (poll de 1.5s não fica repetindo) ---');
render();
console.log('continua com só 3 anúncios:', spoken.length === 3);

console.log();
console.log('--- Independe da ORDEM de preenchimento: corrigir uma área já preenchida também anuncia o novo total ---');
state.session.preincCounts.recesso_dir = 120; // corrige de 100 pra 120 (total vai de 500 pra 520)
render();
console.log('anunciou "520 pré-incisões." (4º anúncio, mesmo sendo uma correção pra trás na ordem de telas):', spoken.length === 4 && spoken[3] === '520 pré-incisões.');

console.log();
console.log('--- Alarme desligado não anuncia, mas continua sincronizando o total por baixo dos panos ---');
state.preincAudioEnabled = false;
state.session.preincCounts.sublinha = 1000; // total sobe pra 1520
render();
console.log('nenhum anúncio novo com o alarme desligado:', spoken.length === 4);
console.log('preincLastTotal mesmo assim ficou sincronizado (1520):', state.preincLastTotal === 1520);
console.log();
console.log('--- Religar o alarme depois não dispara um anúncio "atrasado" do valor que já estava lá ---');
state.preincAudioEnabled = true;
render(); // total não mudou desde a última sincronização (1520 == 1520)
console.log('continua em 4 anúncios (não disparou nada só por religar):', spoken.length === 4);
