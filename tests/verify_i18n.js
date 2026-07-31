const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; }, textContent:'', value:'', placeholder:'', disabled:false, getAttribute:function(){return null;} };
  return elements[id];
}
var cookieStore = '';
var lsStore = {};
var i18nNodes = []; // simula querySelectorAll('[data-i18n]') etc via lista manual
global.document = {
  documentElement:{style:{setProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){}}, lang:''},
  addEventListener: function(){},
  getElementById: function(id){ return fakeEl(id); },
  createElement: function(){ return {}; },
  querySelectorAll: function(sel){
    if (sel==='[data-i18n]') return i18nNodes.filter(function(n){return n.attr==='data-i18n';});
    if (sel==='[data-i18n-placeholder]') return i18nNodes.filter(function(n){return n.attr==='data-i18n-placeholder';});
    if (sel==='.lang-switch-btn') return [fakeEl('lang-btn-pt'), fakeEl('lang-btn-en'), fakeEl('lang-btn-es')];
    return [];
  },
  get cookie(){ return cookieStore; },
  set cookie(v){ cookieStore += (cookieStore?'; ':'') + v.split(';')[0]; },
  activeElement: null
};
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
// Node 22+ tem um global "navigator" embutido, só leitura (getter sem setter) —
// atribuição direta (global.navigator = {...}) falha silenciosamente. Precisa
// redefinir a propriedade de verdade pra sobrepor no teste.
Object.defineProperty(global, 'navigator', { value: { language: 'en-US' }, writable: true, configurable: true });
global.localStorage = { getItem: function(k){ return lsStore[k]!==undefined ? lsStore[k] : null; }, setItem: function(k,v){ lsStore[k]=v; } };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.t=t; global.STRINGS=STRINGS; global.applyI18n=applyI18n; global.initLanguage=initLanguage;\n})();");
eval(clientSrc);

console.log('--- t() básico ---');
state.lang = 'pt';
console.log('pt auth.title:', t('auth.title'));
state.lang = 'en';
console.log('en auth.title:', t('auth.title'));
state.lang = 'es';
console.log('es auth.title:', t('auth.title'));

console.log();
console.log('--- t() com interpolação de variável ---');
state.lang = 'en';
console.log('en welcome com nome:', t('toast.welcome', {name:'Carlos'}));
console.log('contém "Carlos":', t('toast.welcome', {name:'Carlos'}).indexOf('Carlos') !== -1);

console.log();
console.log('--- t() cai pro português se a chave não existir no idioma ---');
STRINGS.en['chave.temporaria.teste'] = undefined; // garante ausência
delete STRINGS.en['chave.temporaria.teste'];
STRINGS.pt['chave.temporaria.teste'] = 'Só em português';
console.log('fallback pt funciona:', t('chave.temporaria.teste') === 'Só em português');

console.log();
console.log('--- initLanguage(): detecta idioma do navegador quando não há nada salvo ---');
cookieStore = ''; lsStore = {};
global.navigator.language = 'es-ES';
initLanguage();
console.log('detectou es a partir de navigator.language:', state.lang === 'es');

console.log();
console.log('--- initLanguage(): cookie salvo tem prioridade sobre navigator.language ---');
cookieStore = 'fue_lang=en';
global.navigator.language = 'es-ES';
initLanguage();
console.log('usou o cookie (en), não o navigator (es):', state.lang === 'en');

console.log();
console.log('--- App.setLanguage grava cookie e localStorage, aplica idioma ---');
cookieStore = ''; lsStore = {};
App.setLanguage('es', true);
console.log('state.lang atualizado:', state.lang === 'es');
console.log('cookie fue_lang gravado:', cookieStore.indexOf('fue_lang=es') !== -1);
console.log('localStorage fue_lang gravado:', lsStore['fue_lang'] === 'es');

console.log();
console.log('--- App.setLanguage ignora idioma desconhecido ---');
App.setLanguage('fr', true);
console.log('idioma continua es (fr foi ignorado):', state.lang === 'es');

console.log();
console.log('--- applyI18n() percorre elementos marcados e aplica tradução ---');
i18nNodes = [
  { attr:'data-i18n', getAttribute:function(){return 'auth.title';}, textContent:'' },
  { attr:'data-i18n-placeholder', getAttribute:function(){return 'auth.crm_placeholder';}, placeholder:'' }
];
state.lang = 'en';
applyI18n();
console.log('h2 traduzido pro inglês:', i18nNodes[0].textContent === STRINGS.en['auth.title']);
console.log('placeholder traduzido pro inglês:', i18nNodes[1].placeholder === STRINGS.en['auth.crm_placeholder']);
console.log('document.documentElement.lang atualizado:', document.documentElement.lang === 'en');
