// Pedido do Dr. Vitor (14/07/2026), depois de sentir falta disso numa cirurgia de
// verdade: ao tocar em "Contagem finalizada" num quadrante, anunciar por voz o
// Mamba PRÓPRIO daquele quadrante, os folículos extraídos somados até aquele ponto
// e a diferença % do Mamba já atualizada.
//
// ATUALIZADO (17/07/2026): announceQuadFinishAudio(s) agora recebe um segundo
// argumento (quadId) e usa APENAS o Mamba digitado NAQUELE quadrante — antes usava
// mambaFinalCumulativo(s), que pegava o Mamba com o relógio mais recente em toda a
// cirurgia, o que causou um bug real: se a equipe digitasse o Mamba de um
// quadrante ainda em aberto (ex: temporal direito) antes de finalizar um quadrante
// anterior (ex: temporal esquerdo), o áudio anunciava o Mamba do quadrante errado.
// Ver "Bug real: Mamba de quadrante em aberto vazando" mais abaixo pro teste que
// reproduz exatamente esse cenário.
//
// Três frentes de teste:
//  1) announceQuadFinishAudio(s, quadId) isolada — testa a matemática certa em cima
//     de um cenário com os 4 quadrantes preenchidos em sequência (números inspirados
//     no exemplo real que o Dr. Vitor deu: 1667 / 3556 / 4435 / 5900 no Mamba).
//  2) App.finishQuadrant() de ponta a ponta — confirma que a função nova está
//     REALMENTE conectada no fluxo de finalizar quadrante (não só existe solta),
//     e que o toggle em Configurações liga/desliga o anúncio.
//  3) Reprodução exata do bug relatado: Mamba digitado num quadrante ainda aberto
//     não pode vazar pro áudio de finalizar outro quadrante.
const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id:id, style:{}, classList:{add:function(){},remove:function(){}}, _innerHTML:'', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML=v; }, textContent:'', value:'', checked:false, disabled:false, getAttribute:function(){return null;} };
  return elements[id];
}
global.document = {
  addEventListener:function(){}, getElementById:function(id){ return fakeEl(id); },
  createElement:function(){ return {style:{}}; },
  querySelectorAll:function(){ return []; },
  activeElement:null,
  documentElement:{ style:{ setProperty:function(){} }, classList:{ add:function(){}, remove:function(){}, toggle:function(){} } }
};
// Nota (16/07/2026): App.finishQuadrant() não usa mais window.confirm() nativo —
// virou confirmDialog(), que abre um modal próprio e resolve via App.dialogModalOk().
// Por isso não mockamos mais window.confirm aqui; o teste chama App.dialogModalOk()
// explicitamente pra simular o clique em "OK" depois de disparar App.finishQuadrant().
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{} };
global.navigator = { language:'pt-BR' };
var lsStore = {};
global.localStorage = { getItem:function(k){ return lsStore[k]!==undefined?lsStore[k]:null; }, setItem:function(k,v){ lsStore[k]=v; } };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };

var spoken = [];
global.window.speechSynthesis = { speak: function(u){ spoken.push(u.text); } };
global.SpeechSynthesisUtterance = function(text){ this.text = text; this.lang = ''; };

var clientSrc = fs.readFileSync('extracted.js','utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.announceQuadFinishAudio=announceQuadFinishAudio;\n})();");
eval(clientSrc);

function tick(){ return new Promise(function(r){ setTimeout(r, 20); }); }
function emptyCounts(){ return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0}; }
function emptyQuad(){ return {counts: emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null, carryFromId:null, locked:false}; }
function baseSession(){
  return {
    id:'abc123', codigo:'PAC-TESTE', status:'andamento', mode:'completo', createdAt: Date.now(),
    ownerBranding:{}, photos:{marcacao:[],posop:[]},
    quadrants: { occipital_dir: emptyQuad(), occipital_esq: emptyQuad(), temporal_esq: emptyQuad(), temporal_dir: emptyQuad() },
    preincCounts:{recesso_dir:0,recesso_esq:0,linha:0,sublinha:0,entrada_dir1:0,entrada_dir2:0,entrada_esq1:0,entrada_esq2:0,topete1:0,topete2:0,scalp:0,coroa:0},
    preincDist:{}, timer:{accumulatedMs:0, running:false, startedAt:null}, preincTimer:{accumulatedMs:0, running:false, startedAt:null},
    globalTimerStartedAt: null, globalTimerEndedAt: null, finalizedAt: null,
    patientInfo: {idade:null, alturaCm:null, pesoKg:null, cabeloEspessura:null, cabeloTextura:null, raspagem:null}
  };
}
function diffPctExpected(mamba, extraidos){ return mamba>0 ? (mamba-extraidos)/mamba*100 : 0; }

console.log('=== Parte 1: announceQuadFinishAudio(s) isolada — matemática dos 4 quadrantes ===');
console.log();
console.log('--- Toggle DESLIGADO (padrão): não anuncia nada ---');
var s1 = baseSession();
s1.quadrants.occipital_dir.counts.f1 = 1500;
s1.quadrants.occipital_dir.mambaCumulativo = 1667;
s1.quadrants.occipital_dir.mambaMarkedAtMs = Date.now();
state.quadFinishAudioEnabled = false;
announceQuadFinishAudio(s1, 'occipital_dir');
console.log('nenhum anúncio com o toggle desligado:', spoken.length === 0);

console.log();
console.log('--- Liga o toggle (persiste em localStorage) ---');
state.currentId = 'abc123';
spoken.length = 0; // limpa o "ativado" falado pelo próprio toggle
App.toggleQuadFinishAudio(true);
spoken.length = 0;
var savedPrefs = JSON.parse(lsStore['fue_live_audio_abc123']);
console.log('quadFinishEnabled true persistido:', savedPrefs.quadFinishEnabled === true);

console.log();
console.log('--- Quadrante 1 (occipital direito): Mamba 1667, extraídos 1500 até aqui ---');
announceQuadFinishAudio(s1, 'occipital_dir');
var pct1 = diffPctExpected(1667, 1500);
console.log('anunciou "Mamba 1667. Folículos extraídos 1500. Diferença '+pct1.toFixed(1)+' por cento.":',
  spoken.length === 1 && spoken[0] === 'Mamba 1667. Folículos extraídos 1500. Diferença '+pct1.toFixed(1)+' por cento.');

console.log();
console.log('--- Quadrante 2 (occipital esquerdo): Mamba 3556 (leitura acumulada), soma extraídos 1500+1400=2900 ---');
var t1 = s1.quadrants.occipital_dir.mambaMarkedAtMs;
s1.quadrants.occipital_esq.counts.f1 = 1400;
s1.quadrants.occipital_esq.mambaCumulativo = 3556;
s1.quadrants.occipital_esq.mambaMarkedAtMs = t1 + 1000;
announceQuadFinishAudio(s1, 'occipital_esq');
var pct2 = diffPctExpected(3556, 2900);
console.log('anunciou Mamba 3556, extraídos 2900 (soma dos dois primeiros), diferença '+pct2.toFixed(1)+'%:',
  spoken.length === 2 && spoken[1] === 'Mamba 3556. Folículos extraídos 2900. Diferença '+pct2.toFixed(1)+' por cento.');

console.log();
console.log('--- Quadrante 3 (temporal esquerdo): Mamba 4435, soma extraídos 2900+1300=4200 ---');
s1.quadrants.temporal_esq.counts.f1 = 1300;
s1.quadrants.temporal_esq.mambaCumulativo = 4435;
s1.quadrants.temporal_esq.mambaMarkedAtMs = t1 + 2000;
announceQuadFinishAudio(s1, 'temporal_esq');
var pct3 = diffPctExpected(4435, 4200);
console.log('anunciou Mamba 4435, extraídos 4200, diferença '+pct3.toFixed(1)+'%:',
  spoken.length === 3 && spoken[2] === 'Mamba 4435. Folículos extraídos 4200. Diferença '+pct3.toFixed(1)+' por cento.');

console.log();
console.log('--- Quadrante 4 (temporal direito, ÚLTIMO): Mamba 5900 final, soma extraídos 4200+1275=5475 final ---');
s1.quadrants.temporal_dir.counts.f1 = 1275;
s1.quadrants.temporal_dir.mambaCumulativo = 5900;
s1.quadrants.temporal_dir.mambaMarkedAtMs = t1 + 3000;
announceQuadFinishAudio(s1, 'temporal_dir');
var pct4 = diffPctExpected(5900, 5475);
console.log('anunciou o resultado FINAL da cirurgia (Mamba 5900, extraídos 5475, diferença '+pct4.toFixed(1)+'%):',
  spoken.length === 4 && spoken[3] === 'Mamba 5900. Folículos extraídos 5475. Diferença '+pct4.toFixed(1)+' por cento.');

console.log();
console.log('--- Quadrante finalizado SEM Mamba preenchido: anuncia só os extraídos (sem travar/errar) ---');
var s2 = baseSession();
s2.quadrants.occipital_dir.counts.f1 = 800; // mamba nunca preenchido nesse quadrante
spoken.length = 0;
announceQuadFinishAudio(s2, 'occipital_dir');
console.log('anunciou só "Folículos extraídos 800.":', spoken.length === 1 && spoken[0] === 'Folículos extraídos 800.');

console.log();
console.log('--- Mamba preenchido em OUTRO quadrante (não neste) não vaza pro anúncio ---');
var s2b = baseSession();
s2b.quadrants.occipital_dir.counts.f1 = 800; // este é o quadrante finalizado, sem Mamba próprio
s2b.quadrants.occipital_esq.mambaCumulativo = 9999; // outro quadrante, com Mamba preenchido e relógio mais recente
s2b.quadrants.occipital_esq.mambaMarkedAtMs = Date.now() + 999999;
spoken.length = 0;
announceQuadFinishAudio(s2b, 'occipital_dir');
console.log('ignora o Mamba de outro quadrante e anuncia só "Folículos extraídos 800.":', spoken.length === 1 && spoken[0] === 'Folículos extraídos 800.');

console.log();
console.log('=== Parte 2: App.finishQuadrant() de ponta a ponta — confere que a função está REALMENTE conectada ===');
console.log();
console.log('--- Toggle LIGADO: finalizar um quadrante de verdade dispara o anúncio ---');
state.quadFinishAudioEnabled = true;
state.session = baseSession();
state.session.quadrants.occipital_dir.counts.f1 = 1500;
state.session.quadrants.occipital_dir.mambaCumulativo = 1667;
state.session.quadrants.occipital_dir.mambaMarkedAtMs = Date.now();
state.activeQuadrant = 'occipital_dir';
var updatedFromServer = JSON.parse(JSON.stringify(state.session));
updatedFromServer.quadrants.occipital_dir.locked = true;
updatedFromServer.quadrants.occipital_esq.carryFromId = 'occipital_dir';
global.fetch = function(url, opts){
  if (String(url).indexOf('/quadrant-finish') !== -1) {
    return Promise.resolve({ ok:true, json:function(){ return Promise.resolve(updatedFromServer); } });
  }
  return Promise.reject(new Error('rota não mockada: '+url));
};
spoken.length = 0;
(async function(){
  App.finishQuadrant();
  App.dialogModalOk(); // simula o clique em "OK" no modal de confirmação
  await tick();
  var pctEnd = diffPctExpected(1667, 1500);
  console.log('App.finishQuadrant() disparou o anúncio certo:', spoken.length === 1 && spoken[0] === 'Mamba 1667. Folículos extraídos 1500. Diferença '+pctEnd.toFixed(1)+' por cento.');

  console.log();
  console.log('--- Toggle DESLIGADO: finalizar quadrante NÃO anuncia nada (mas continua travando/avançando normal) ---');
  state.quadFinishAudioEnabled = false;
  state.session = baseSession();
  state.session.quadrants.occipital_dir.counts.f1 = 1500;
  state.session.quadrants.occipital_dir.mambaCumulativo = 1667;
  state.session.quadrants.occipital_dir.mambaMarkedAtMs = Date.now();
  state.activeQuadrant = 'occipital_dir';
  spoken.length = 0;
  App.finishQuadrant();
  App.dialogModalOk(); // simula o clique em "OK" no modal de confirmação
  await tick();
  console.log('nenhum anúncio com o toggle desligado, mesmo finalizando de verdade:', spoken.length === 0);
  console.log('mas o quadrante travou normalmente (a funcionalidade em si não foi afetada):', state.session.quadrants.occipital_dir.locked === true);

  console.log();
  console.log('=== Parte 3: reprodução exata do bug relatado pelo Dr. Vitor (17/07/2026) ===');
  console.log('--- Mamba digitado no temporal direito (quadrante 4, AINDA ABERTO) ANTES de');
  console.log('    finalizar o temporal esquerdo (quadrante 3) não pode vazar pro áudio ---');
  state.quadFinishAudioEnabled = true;
  state.session = baseSession();
  // Cenário real: equipe já digitou o Mamba do temporal direito adiantado, mas esse
  // quadrante continua ABERTO (locked:false) — só o temporal esquerdo está sendo
  // finalizado agora.
  state.session.quadrants.temporal_dir.counts.f1 = 1275;
  state.session.quadrants.temporal_dir.mambaCumulativo = 5900; // digitado adiantado
  state.session.quadrants.temporal_dir.mambaMarkedAtMs = Date.now() + 999999; // relógio bem mais recente
  state.session.quadrants.temporal_dir.locked = false; // continua em aberto — não foi finalizado
  // temporal_esq (o que está sendo finalizado agora) SEM Mamba próprio preenchido.
  state.session.quadrants.temporal_esq.counts.f1 = 1300;
  state.activeQuadrant = 'temporal_esq';
  var updatedTemporalEsq = JSON.parse(JSON.stringify(state.session));
  updatedTemporalEsq.quadrants.temporal_esq.locked = true;
  global.fetch = function(url, opts){
    if (String(url).indexOf('/quadrant-finish') !== -1) {
      return Promise.resolve({ ok:true, json:function(){ return Promise.resolve(updatedTemporalEsq); } });
    }
    return Promise.reject(new Error('rota não mockada: '+url));
  };
  spoken.length = 0;
  App.finishQuadrant();
  App.dialogModalOk();
  await tick();
  console.log('NÃO anunciou o Mamba 5900 do temporal direito (ainda aberto):', spoken.length === 1 && spoken[0].indexOf('5900') === -1);
  // extraídos = soma de TODOS os quadrantes (mesmo os ainda abertos) = 1300 (temporal_esq) + 1275 (temporal_dir) = 2575.
  console.log('anunciou só os extraídos, já que o temporal esquerdo não tem Mamba próprio:', spoken[0] === 'Folículos extraídos 2575.');

  console.log();
  console.log('--- Mesmo cenário, mas agora o temporal esquerdo TEM seu próprio Mamba: usa o');
  console.log('    dele, não o do temporal direito (mais recente por horário, mas de outro quadrante) ---');
  state.session = baseSession();
  state.session.quadrants.temporal_dir.counts.f1 = 1275;
  state.session.quadrants.temporal_dir.mambaCumulativo = 5900;
  state.session.quadrants.temporal_dir.mambaMarkedAtMs = Date.now() + 999999;
  state.session.quadrants.temporal_dir.locked = false;
  state.session.quadrants.temporal_esq.counts.f1 = 1300;
  state.session.quadrants.temporal_esq.mambaCumulativo = 4435; // Mamba PRÓPRIO do quadrante finalizado
  state.session.quadrants.temporal_esq.mambaMarkedAtMs = Date.now(); // mais antigo que o do temporal direito
  state.activeQuadrant = 'temporal_esq';
  var updatedTemporalEsq2 = JSON.parse(JSON.stringify(state.session));
  updatedTemporalEsq2.quadrants.temporal_esq.locked = true;
  global.fetch = function(url, opts){
    if (String(url).indexOf('/quadrant-finish') !== -1) {
      return Promise.resolve({ ok:true, json:function(){ return Promise.resolve(updatedTemporalEsq2); } });
    }
    return Promise.reject(new Error('rota não mockada: '+url));
  };
  spoken.length = 0;
  App.finishQuadrant();
  App.dialogModalOk();
  await tick();
  // extraídos = soma de TODOS os quadrantes (mesmo os ainda abertos) = 1300 (temporal_esq) + 1275 (temporal_dir) = 2575.
  var pctTemp = diffPctExpected(4435, 2575);
  console.log('anunciou o Mamba PRÓPRIO do temporal esquerdo (4435), não o do temporal direito (5900):',
    spoken.length === 1 && spoken[0] === 'Mamba 4435. Folículos extraídos 2575. Diferença '+pctTemp.toFixed(1)+' por cento.');
})();
