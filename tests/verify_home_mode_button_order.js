// Pedido do Dr. Vitor (14/07/2026, em duas partes): na tela inicial (onde cadastra
// uma nova cirurgia), (1) trocar a ordem dos botões de modo pra Reduzido aparecer
// primeiro (à esquerda) e Completo depois, e (2) já vir com Reduzido PRÉ-SELECIONADO
// ao abrir a tela — ele usa reduzido na maioria das cirurgias. A ordem visual e a
// seleção padrão são coisas separadas (dava pra reordenar sem mudar o que vem
// selecionado, foi inclusive o que eu fiz primeiro até ele pedir a segunda parte),
// por isso o teste confere as duas independentemente.
// Confere a ordem tanto no trecho cru do server.js quanto no HTML final
// renderizado (INDEX_HTML avaliado, o que de fato vai pro navegador — extracted.js
// só tem o <script>, não o resto do HTML, por isso não dá pra checar ordem de botão
// nele) — e que o comportamento de seleção (App.setNewMode) continua funcionando
// normal pros dois lados, independente da posição visual.
const fs = require('fs');

console.log('--- server.js: Reduzido aparece ANTES de Completo no HTML da tela inicial ---');
var srv = fs.readFileSync('server.js', 'utf8');
var homeStart = srv.indexOf('id=\\"screen-home\\"');
var idxReduzido = srv.indexOf('id=\\"new-mode-reduzido\\"', homeStart);
var idxCompleto = srv.indexOf('id=\\"new-mode-completo\\"', homeStart);
console.log('os dois botões foram encontrados:', idxReduzido !== -1 && idxCompleto !== -1);
console.log('Reduzido vem antes de Completo:', idxReduzido !== -1 && idxCompleto !== -1 && idxReduzido < idxCompleto);

console.log();
console.log('--- HTML final renderizado (INDEX_HTML avaliado, igual o extract.js faz pro <script>, mas aqui olhando o HTML inteiro): mesma checagem ---');
var startIdx = srv.indexOf('const INDEX_HTML = ');
var endIdx = srv.indexOf('</html>\\n";', startIdx) + '</html>\\n";'.length;
var htmlSrc = srv.slice(startIdx, endIdx).replace(/^const INDEX_HTML = /, 'var INDEX_HTML = ');
eval(htmlSrc);
var renderedHtml = INDEX_HTML.replace('__APP_SUBTITLE__', 'rede local').replace('__STRINGS_JSON__', '{}');
var idxReduzido2 = renderedHtml.indexOf('id="new-mode-reduzido"');
var idxCompleto2 = renderedHtml.indexOf('id="new-mode-completo"');
console.log('os dois botões foram encontrados:', idxReduzido2 !== -1 && idxCompleto2 !== -1);
console.log('Reduzido vem antes de Completo:', idxReduzido2 !== -1 && idxCompleto2 !== -1 && idxReduzido2 < idxCompleto2);

console.log();
console.log('--- App.setNewMode continua funcionando normal pros dois lados, independente da posição ---');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id:id, className:'', style:{}, classList:{add:function(){},remove:function(){}}, _innerHTML:'', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML=v; }, textContent:'', value:'' };
  return elements[id];
}
global.document = {
  addEventListener:function(){}, getElementById:function(id){ return fakeEl(id); },
  createElement:function(){ return {style:{}}; }, querySelectorAll:function(){ return []; },
  activeElement:null,
  documentElement:{ style:{ setProperty:function(){} }, classList:{ add:function(){}, remove:function(){}, toggle:function(){} } }
};
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{} };
global.navigator = {};
global.localStorage = { getItem:function(){ return null; }, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var extracted = fs.readFileSync('extracted.js', 'utf8');
var clientSrc = extracted.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

console.log('padrão inicial agora é "reduzido" (pedido explícito do Dr. Vitor):', state.newSessionMode === 'reduzido');

console.log();
console.log('--- HTML inicial (classes hardcoded, antes de qualquer clique): Reduzido já vem marcado como ativo ---');
console.log('botão Reduzido no HTML já nasce com classe "btn" (ativo):', renderedHtml.indexOf('class="btn" id="new-mode-reduzido"') !== -1);
console.log('botão Completo no HTML já nasce com classe "btn secondary" (inativo):', renderedHtml.indexOf('class="btn secondary" id="new-mode-completo"') !== -1);

console.log();
console.log('--- App.setNewMode continua funcionando normal pros dois lados, independente do padrão ---');
App.setNewMode('completo');
console.log('setNewMode(completo) marca o botão certo como ativo:', elements['new-mode-completo'].className === 'btn' && elements['new-mode-reduzido'].className === 'btn secondary');
console.log('state.newSessionMode = completo:', state.newSessionMode === 'completo');

App.setNewMode('reduzido');
console.log('setNewMode(reduzido) marca o botão certo como ativo:', elements['new-mode-reduzido'].className === 'btn' && elements['new-mode-completo'].className === 'btn secondary');
console.log('state.newSessionMode = reduzido:', state.newSessionMode === 'reduzido');

console.log();
console.log('--- Depois de criar uma cirurgia, o formulário reseta de volta pro padrão (reduzido), não completo ---');
App.setNewMode('completo'); // simula o médico tendo trocado pra completo numa cirurgia
App.setNewMode('reduzido'); // App.createSession chama isso no sucesso — simulando aqui sem precisar de fetch de verdade
console.log('volta a mostrar Reduzido como ativo depois do reset:', elements['new-mode-reduzido'].className === 'btn' && elements['new-mode-completo'].className === 'btn secondary');
console.log('state.newSessionMode volta a reduzido:', state.newSessionMode === 'reduzido');

console.log();
console.log('--- App.createSession(): confere direto no código-fonte que o reset pós-criação chama setNewMode(reduzido), não completo ---');
var createSessionStart = srv.indexOf('App.createSession = function(){');
var createSessionBody = srv.slice(createSessionStart, createSessionStart + 1200);
console.log('server.js chama App.setNewMode(reduzido) dentro de App.createSession:', createSessionBody.indexOf("App.setNewMode('reduzido');") !== -1);
console.log('server.js NAO chama mais App.setNewMode(completo) logo apos criar a sessao:', createSessionBody.indexOf("App.setNewMode('completo');") === -1);
