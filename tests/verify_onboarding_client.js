// Lógica do cliente do guia de boas-vindas: abre quando onboardingPending,
// navega Próximo/Voltar, último passo e Pular chamam /api/onboarding/complete,
// e "rever" (openOnboarding) funciona sem chamar o servidor de novo.
const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) { var cls = {}; elements[id] = { id: id, className:'', style: {}, _show:false, classList:{add:function(c){ if(c==='show') elements[id]._show=true; },remove:function(c){ if(c==='show') elements[id]._show=false; }}, innerHTML:'', textContent:'', value:'', placeholder:'', disabled:false, getAttribute:function(){return null;} }; }
  return elements[id];
}
global.document = { documentElement:{style:{setProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){}}, lang:''}, addEventListener:function(){}, getElementById:function(id){return fakeEl(id);}, createElement:function(){return {};}, querySelectorAll:function(){return [];}, activeElement:null };
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{}, confirm:function(){return true;} };
global.navigator = { language:'pt-BR' };
global.localStorage = { getItem:function(){return null;}, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
var calls = [];
global.fetch = function(url, opts){ calls.push(String(url)); return Promise.resolve({ ok:true, json:function(){ return Promise.resolve({}); } }); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state;\n})();");
eval(clientSrc);

var overlay = function(){ return fakeEl('onboard-modal-overlay')._show; };
var completeCalls = function(){ return calls.filter(function(u){ return u.indexOf('/api/onboarding/complete') !== -1; }).length; };
state.lang = 'pt';

console.log('--- sem flag: não abre ---');
state.currentUser = { nomeCompleto:'Dra Nova', onboardingPending:false };
App.maybeShowOnboarding();
console.log('guia não abre quando onboardingPending=false:', overlay() === false);

console.log('--- com flag: abre no passo 1 ---');
state.currentUser.onboardingPending = true;
App.maybeShowOnboarding();
console.log('guia abre:', overlay() === true);
console.log('contador mostra passo 1 de 4:', elements['onboard-counter'].textContent === 'Passo 1 de 4');
console.log('botão Voltar escondido no passo 1:', elements['onboard-back-btn'].style.display === 'none');
console.log('botão principal diz Próximo:', elements['onboard-next-btn'].textContent === 'Próximo');

console.log('--- navegação ---');
App.onboardingNext();
console.log('passo 2 de 4:', elements['onboard-counter'].textContent === 'Passo 2 de 4');
console.log('Voltar visível no passo 2:', elements['onboard-back-btn'].style.display === '');
App.onboardingBack();
console.log('voltou ao passo 1:', elements['onboard-counter'].textContent === 'Passo 1 de 4');
App.onboardingNext(); App.onboardingNext(); App.onboardingNext();
console.log('último passo (4 de 4):', elements['onboard-counter'].textContent === 'Passo 4 de 4');
console.log('botão principal diz Começar:', elements['onboard-next-btn'].textContent === 'Começar');
console.log('ainda não chamou complete:', completeCalls() === 0 && overlay() === true);

console.log('--- finalizar ---');
App.onboardingNext();
console.log('modal fecha:', overlay() === false);
console.log('chamou /api/onboarding/complete uma vez:', completeCalls() === 1);
console.log('flag local zerada:', state.currentUser.onboardingPending === false);

console.log('--- rever pelas Configurações não chama o servidor de novo ---');
App.openOnboarding();
console.log('reabre:', overlay() === true);
App.onboardingFinish();
console.log('fecha sem nova chamada:', overlay() === false && completeCalls() === 1);

console.log('--- pular chama complete ---');
state.currentUser.onboardingPending = true;
App.maybeShowOnboarding();
App.onboardingFinish();
console.log('pular fecha e chama complete (2 no total):', overlay() === false && completeCalls() === 2);

console.log('--- todos os passos têm texto traduzido (não a chave crua) ---');
['pt','en','es'].forEach(function(l){
  state.lang = l; var ok = true;
  for (var i=0;i<4;i++){ state.onboardStep=i; App.onboardingRender();
    if (/^onboard\./.test(elements['onboard-title'].textContent) || /^onboard\./.test(elements['onboard-body'].textContent) || !elements['onboard-body'].textContent) ok=false; }
  console.log(l+': 4 passos com título e corpo:', ok);
});
console.log('--- idiomas ---');
state.lang = 'en'; state.currentUser.onboardingPending = false; App.openOnboarding();
console.log('EN: Step 1 of 4:', elements['onboard-counter'].textContent === 'Step 1 of 4');
state.lang = 'es'; App.openOnboarding();
console.log('ES: Paso 1 de 4:', elements['onboard-counter'].textContent === 'Paso 1 de 4');
