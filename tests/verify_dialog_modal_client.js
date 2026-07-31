// Bug reportado pelo Dr. Vitor (16/07/2026): numa cirurgia real no iPad dele, o
// botão "Contagem finalizada" respondeu certinho no primeiro quadrante (occipital
// direito) mas pareceu travado, sem erro nenhum, nos quadrantes seguintes. Causa
// raiz confirmada: o Safari do iOS bloqueia silenciosamente TODOS os diálogos
// nativos (window.confirm/window.prompt/alert) de uma página depois de mostrar
// vários deles na mesma sessão — o confirm() simplesmente passa a retornar false
// sem avisar ninguém. App.editCount (toque-pra-editar valor de categoria) usa
// window.prompt() dezenas de vezes por quadrante, quase garantindo esse bloqueio
// antes do médico chegar no confirm() de finalizar o segundo/terceiro quadrante.
//
// Correção: window.confirm()/window.prompt() nativos foram totalmente substituídos
// por um modal HTML próprio (confirmDialog()/promptDialog(), reaproveitando o
// mesmo componente visual .modal-overlay/.modal-box do modal de "Compartilhar
// cirurgia"). Esse modal não sofre do bloqueio do Safari porque não é um diálogo
// nativo do navegador — é só HTML/CSS/JS do próprio app.
//
// Este teste cobre o mecanismo do modal em si (confirmDialog/promptDialog/
// dialogModalOk/dialogModalCancel), independente de qual função de negócio o usa.
const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id:id, className:'', style:{}, classList:{add:function(){},remove:function(){}}, _innerHTML:'', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML=v; }, textContent:'', value:'', checked:false, disabled:false, getAttribute:function(){return null;} };
  return elements[id];
}
global.document = {
  addEventListener:function(){}, getElementById:function(id){ return fakeEl(id); },
  createElement:function(){ return {style:{}}; },
  querySelectorAll:function(){ return []; },
  activeElement:null,
  documentElement:{ style:{ setProperty:function(){} }, classList:{ add:function(){}, remove:function(){}, toggle:function(){} } }
};
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{} };
global.navigator = { language:'pt-BR' };
global.localStorage = { getItem:function(){ return null; }, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

function tick(){ return new Promise(function(r){ setTimeout(r, 20); }); }

console.log('--- server.js/extracted.js NUNCA mais chamam window.confirm()/window.prompt() de verdade (só em comentários) ---');
var srv = fs.readFileSync('server.js', 'utf8');
var extracted = fs.readFileSync('extracted.js', 'utf8');
// Toda chamada real (nos 12 call sites originais) sempre passava a mensagem
// traduzida como primeiro argumento: window.confirm(t('...')) / window.prompt(t('...')).
// As menções que sobraram são só documentação (comentário explicando a troca) e usam
// window.confirm()/window.prompt() com parênteses vazios — nunca "(t(" logo em
// seguida — então esse padrão específico distingue chamada real de menção em texto.
var realCallPattern = /window\.(confirm|prompt)\(t\(/;
console.log('server.js sem chamadas reais (só restam menções em comentário):', !realCallPattern.test(srv));
console.log('extracted.js (JS que de fato vai pro navegador) sem chamadas reais:', !realCallPattern.test(extracted));

(async function(){
  console.log();
  console.log('=== confirmDialog() / App.dialogModalOk() / App.dialogModalCancel() ===');
  console.log();
  console.log('--- Testando confirmDialog indiretamente via App.finishQuadrant (já wired), clicando OK ---');
  state.currentId = 'abc123';
  state.session = { id:'abc123', status:'andamento', quadrants:{ occipital_dir:{ counts:{}, locked:false } } };
  state.activeQuadrant = 'occipital_dir';
  global.fetch = function(url){
    if (String(url).indexOf('/quadrant-finish') !== -1){
      state.session.quadrants.occipital_dir.locked = true;
      return Promise.resolve({ ok:true, json:function(){ return Promise.resolve(state.session); } });
    }
    return Promise.reject(new Error('rota não mockada'));
  };
  App.finishQuadrant();
  console.log('input do modal continua escondido pra confirmação simples:', elements['dialog-modal-input-wrap'].style.display === 'none');
  console.log('ainda não travou (esperando clique):', state.session.quadrants.occipital_dir.locked === false);
  App.dialogModalOk();
  await tick();
  console.log('OK resolve como confirmação positiva -> quadrante travou:', state.session.quadrants.occipital_dir.locked === true);

  console.log();
  console.log('--- Cancelar (App.dialogModalCancel) resolve como negativo -> nada acontece ---');
  state.session.quadrants.occipital_dir.locked = false;
  state.activeQuadrant = 'occipital_dir'; // finishQuadrant() avançou pro próximo quadrante no cenário anterior
  App.finishQuadrant();
  App.dialogModalCancel();
  await tick();
  console.log('quadrante continua destravado (cancelado):', state.session.quadrants.occipital_dir.locked === false);

  console.log();
  console.log('=== promptDialog() (via App.editPreinc, já wired) ===');
  console.log();
  state.session = { id:'abc123', status:'andamento', preincCounts:{recesso_dir: 12} };
  global.fetch = function(url, opts){
    var body = JSON.parse(opts.body);
    state.session.preincCounts[body.area] = body.value;
    return Promise.resolve({ ok:true, json:function(){ return Promise.resolve(state.session); } });
  };
  App.editPreinc('recesso_dir');
  console.log('campo de input do modal fica VISÍVEL (é um prompt de valor):', elements['dialog-modal-input-wrap'].style.display === 'block');
  console.log('input pré-preenchido com o valor atual (12):', elements['dialog-modal-input'].value === 12);
  elements['dialog-modal-input'].value = '45';
  App.dialogModalOk();
  await tick();
  console.log('OK no prompt aplica o novo valor digitado (45):', state.session.preincCounts.recesso_dir === 45);

  console.log();
  console.log('--- Cancelar o prompt não muda nada ---');
  App.editPreinc('recesso_dir');
  App.dialogModalCancel();
  await tick();
  console.log('valor continua 45 (cancelado):', state.session.preincCounts.recesso_dir === 45);

  console.log();
  console.log('=== HTML do modal: botões Cancelar/OK e clique no fundo cancelam ===');
  var overlaySrc = extracted.indexOf('dialog-modal-overlay');
  var htmlStart = srv.indexOf('id=\\"dialog-modal-overlay\\"');
  var htmlChunk = srv.slice(Math.max(0, htmlStart-200), htmlStart+1400);
  console.log('overlay tem onclick pro fundo chamando App.dialogModalCancel:', htmlChunk.indexOf('App.dialogModalCancel();') !== -1);
  console.log('botão Cancelar chama App.dialogModalCancel():', htmlChunk.indexOf('onclick=\\"App.dialogModalCancel()\\"') !== -1);
  console.log('botão OK chama App.dialogModalOk():', htmlChunk.indexOf('onclick=\\"App.dialogModalOk()\\"') !== -1);
  console.log('input do prompt tem Enter -> App.dialogModalOk() (tecla Enter confirma):', htmlChunk.indexOf("App.dialogModalOk()") !== -1 && htmlChunk.indexOf("event.key==='Enter'") !== -1);
})();
