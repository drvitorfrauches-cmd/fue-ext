// Confere o lado do cliente da "Contagem em cadeia": o número mostrado na grade de
// contagem soma o predecessor (dinâmico — some junto quando o predecessor muda),
// os botões +1/+5 continuam somando só na contribuição própria, o toque-pra-editar
// trabalha em cima do valor acumulado, e os controles (dica, seletor, botões
// finalizar/reabrir) refletem o estado certo.
//
// ATUALIZADO (16/07/2026): App.finishQuadrant/reopenQuadrant/editCount não usam mais
// window.confirm()/window.prompt() nativos — viraram confirmDialog()/promptDialog(),
// que abrem um modal próprio (App.dialogModalOk/App.dialogModalCancel) e retornam uma
// Promise. Motivo: relato do Dr. Vitor de que, numa cirurgia real no iPad dele, o
// Safari passou a bloquear silenciosamente os diálogos nativos depois de vários
// prompt()s seguidos (editCount usa isso dezenas de vezes por quadrante), fazendo o
// botão de finalizar quadrante parecer travado sem erro nenhum. Este teste simula o
// clique no modal chamando App.dialogModalOk() (equivalente a clicar "OK") ou
// App.dialogModalCancel() (equivalente a clicar "Cancelar"/fechar), preenchendo
// elements['dialog-modal-input'].value antes do OK quando é um prompt.
//
// App.finishQuadrant/reopenQuadrant/setQuadrantCarryFrom/editCount são assíncronos
// (abrem o modal -> .then() -> chamam api() -> fetch().then(...)), então cada chamada
// precisa de um "tick" (flush de microtask) antes de conferir o resultado — daí o
// script inteiro rodar dentro de uma função async com await tick() depois de cada uma.
const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; }, textContent:'', value:'', disabled:false, placeholder:'', getAttribute:function(){return null;} };
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
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = { language: 'pt-BR' };
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };

global.fetch = function(url, opts){
  var body = opts && opts.body ? JSON.parse(opts.body) : null;
  var s = state.session;
  if (String(url).indexOf('/adjust') !== -1) {
    // App.adjust já aplica o delta OTIMISTICAMENTE no state.session antes de chamar
    // api() — como neste mock o "servidor" é o mesmo objeto state.session, não
    // aplicar de novo aqui (senão o delta soma em dobro, coisa que não acontece de
    // verdade porque o servidor real tem sua própria cópia independente do dado).
  } else if (String(url).indexOf('/quadrant-finish') !== -1) {
    var qid = body.quadrant;
    s.quadrants[qid].locked = true;
    var order = ['occipital_dir','occipital_esq','temporal_esq','temporal_dir'];
    var idx = order.indexOf(qid);
    var nextId = idx!==-1 && idx+1<order.length ? order[idx+1] : null;
    if (nextId && !s.quadrants[nextId].carryFromId && !s.quadrants[nextId].locked) s.quadrants[nextId].carryFromId = qid;
  } else if (String(url).indexOf('/quadrant-reopen') !== -1) {
    s.quadrants[body.quadrant].locked = false;
  } else if (String(url).indexOf('/quadrant-link') !== -1) {
    s.quadrants[body.quadrant].carryFromId = body.carryFromId || null;
  }
  return Promise.resolve({ ok: true, json: function(){ return Promise.resolve(s); } });
};

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render; global.chainCumulativeCat=chainCumulativeCat;\n})();");
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

(async function(){
  state.lang = 'pt';
  state.currentId = 'abc123';
  state.session = baseSession();
  state.activeQuadrant = 'occipital_dir';

  console.log('--- Sem predecessor: número mostrado é só a contribuição própria ---');
  state.session.quadrants.occipital_dir.counts.f1 = 130;
  render();
  console.log('dica mostra "começa do zero":', elements['quad-chain-hint'].textContent === 'Este quadrante começa do zero.');
  console.log('grupo integro mostra 130 em algum lugar:', elements['group-integro'].innerHTML.indexOf('>130<') !== -1);

  console.log();
  console.log('--- App.finishQuadrant(): abre o modal de confirmação (não trava nada até clicar OK) ---');
  App.finishQuadrant();
  console.log('ainda NÃO travou (modal aberto, aguardando clique):', state.session.quadrants.occipital_dir.locked === false);

  console.log();
  console.log('--- Clicar "OK" no modal (App.dialogModalOk): trava occipital_dir e liga occipital_esq automaticamente ---');
  App.dialogModalOk();
  await tick();
  console.log('occipital_dir travado:', state.session.quadrants.occipital_dir.locked === true);
  console.log('occipital_esq.carryFromId === occipital_dir:', state.session.quadrants.occipital_esq.carryFromId === 'occipital_dir');
  console.log('avançou pro próximo quadrante (activeQuadrant = occipital_esq):', state.activeQuadrant === 'occipital_esq');

  console.log();
  console.log('--- occipital_esq: número mostrado agora soma o predecessor (130) + contribuição própria ---');
  state.session.quadrants.occipital_esq.counts.f1 = 20;
  render();
  console.log('chainCumulativeCat(f1) = 150 (130 + 20):', chainCumulativeCat(state.session, 'occipital_esq', 'f1') === 150);
  console.log('dica mostra de onde vem (Occipital direito):', elements['quad-chain-hint'].textContent.indexOf('Occipital direito') !== -1);
  console.log('grupo integro mostra 150:', elements['group-integro'].innerHTML.indexOf('>150<') !== -1);
  console.log('seletor de predecessor reflete occipital_dir:', elements['quad-carry-select'].value === 'occipital_dir');

  console.log();
  console.log('--- Dinâmico: corrigir occipital_dir depois de já ter avançado atualiza occipital_esq sozinho ---');
  state.session.quadrants.occipital_dir.counts.f1 = 200; // era 130, corrigido pra 200 (sem tocar em occipital_esq)
  console.log('chainCumulativeCat(occipital_esq, f1) agora 220 (200 + 20), sem tocar em occipital_esq:', chainCumulativeCat(state.session, 'occipital_esq', 'f1') === 220);

  console.log();
  console.log('--- Botões +1/+5 continuam somando só na contribuição PRÓPRIA do quadrante ativo ---');
  state.activeQuadrant = 'occipital_esq';
  App.adjust('f1', 5); // soma na contribuição própria de occipital_esq (ativo)
  await tick();
  console.log('occipital_esq.counts.f1 (própria) vai de 20 pra 25:', state.session.quadrants.occipital_esq.counts.f1 === 25);
  console.log('occipital_dir.counts.f1 não foi tocado pelo adjust (continua 200):', state.session.quadrants.occipital_dir.counts.f1 === 200);

  console.log();
  console.log('--- Quadrante TRAVADO: botões de incremento somem, clique-pra-editar não faz nada (nem abre o modal) ---');
  state.activeQuadrant = 'occipital_dir'; // travado
  render();
  console.log('sem botão de +1 no HTML do quadrante travado:', elements['group-integro'].innerHTML.indexOf('<button') === -1);
  console.log('quad-finish-btn escondido (já travado):', elements['quad-finish-btn'].style.display === 'none');
  console.log('quad-reopen-btn visível:', elements['quad-reopen-btn'].style.display === 'inline-block');
  var f1AntesDoClique = state.session.quadrants.occipital_dir.counts.f1;
  App.editCount('f1'); // deveria não fazer nada, quadrante travado — nem chega a abrir o modal
  console.log('editCount não mudou nada (quadrante travado):', state.session.quadrants.occipital_dir.counts.f1 === f1AntesDoClique);

  console.log();
  console.log('--- App.reopenQuadrant(): abre modal, confirma, libera de novo ---');
  App.reopenQuadrant();
  App.dialogModalOk();
  await tick();
  console.log('occipital_dir destravado:', state.session.quadrants.occipital_dir.locked === false);

  console.log();
  console.log('--- App.setQuadrantCarryFrom(): ligação manual muda o predecessor (esta função nunca usou confirm/prompt) ---');
  state.activeQuadrant = 'temporal_dir';
  App.setQuadrantCarryFrom('occipital_esq');
  await tick();
  console.log('temporal_dir.carryFromId === occipital_esq:', state.session.quadrants.temporal_dir.carryFromId === 'occipital_esq');
  render();
  console.log('seletor reflete a escolha manual:', elements['quad-carry-select'].value === 'occipital_esq');

  console.log();
  console.log('--- Editar o valor acumulado direto (toque no número) recalcula certo ---');
  state.activeQuadrant = 'occipital_esq';
  render();
  // predecessor (occipital_dir) tem 200 em f1; própria contribuição de occipital_esq é 25;
  // acumulado exibido/pre-preenchido no modal de prompt deve ser 225.
  App.editCount('f1');
  console.log('modal pré-preencheu o valor ACUMULADO como padrão (225 = 200 predecessor + 25 própria):', elements['dialog-modal-input'].value === 225);
  elements['dialog-modal-input'].value = '300'; // simula a digitação no modal
  App.dialogModalOk(); // simula o clique em "OK"
  await tick();
  console.log('nova contribuição própria de occipital_esq = 100 (300 digitado - 200 do predecessor):', state.session.quadrants.occipital_esq.counts.f1 === 100);

  console.log();
  console.log('--- Editar com valor MENOR que o predecessor é recusado ---');
  App.editCount('f1');
  elements['dialog-modal-input'].value = '50'; // menor que os 200 do predecessor
  App.dialogModalOk();
  var antesRecusa = state.session.quadrants.occipital_esq.counts.f1;
  await tick();
  console.log('não mudou nada (recusado):', state.session.quadrants.occipital_esq.counts.f1 === antesRecusa);

  console.log();
  console.log('--- Cancelar o modal de prompt (App.dialogModalCancel) não muda nada ---');
  App.editCount('f1');
  var antesCancelar = state.session.quadrants.occipital_esq.counts.f1;
  App.dialogModalCancel(); // simula o clique em "Cancelar"
  await tick();
  console.log('não mudou nada (cancelado):', state.session.quadrants.occipital_esq.counts.f1 === antesCancelar);

  console.log();
  console.log('--- Cancelar o modal de confirmação (App.dialogModalCancel) não finaliza o quadrante ---');
  state.activeQuadrant = 'temporal_esq';
  App.finishQuadrant();
  App.dialogModalCancel();
  await tick();
  console.log('temporal_esq NÃO foi travado (cancelado):', state.session.quadrants.temporal_esq.locked === false);
})();
