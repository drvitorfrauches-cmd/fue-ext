// Confere a tradução do Dashboard: data-i18n estáticos existem nos 3 idiomas,
// e renderDashboardScreen() produz texto traduzido nos resumos/tabelas geradas
// dinamicamente via innerHTML (que não usam data-i18n, e sim t() direto no JS).
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
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = { language: 'pt-BR' };
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.renderDashboardScreen=renderDashboardScreen; global.STRINGS=STRINGS;\n})();");
eval(clientSrc);

state.dashboardSessions = [
  { id:'s1', codigo:'PAC-1', mode:'completo', createdAt: Date.now()-200000,
    quadrants:{ temporal_dir:{counts:{f1:10,ttotal:1},mambaCumulativo:null}, temporal_esq:{counts:{},mambaCumulativo:null}, occipital_dir:{counts:{},mambaCumulativo:null}, occipital_esq:{counts:{},mambaCumulativo:null} },
    preincCounts:{linha:5}, timer:{accumulatedMs:600000,running:false,startedAt:null} }
];

console.log('--- Dashboard em português ---');
state.lang = 'pt';
renderDashboardScreen();
var summaryPt = elements['dash-summary'].innerHTML;
console.log('contém "Cirurgias finalizadas":', summaryPt.indexOf('Cirurgias finalizadas') !== -1);
console.log('contém "Índice médio":', summaryPt.indexOf('Índice médio') !== -1);
var tablePt = elements['dash-table'].innerHTML;
console.log('cabeçalho da tabela contém "Cirurgia" e "Extraídos":', tablePt.indexOf('>Cirurgia<')!==-1 && tablePt.indexOf('>Extraídos<')!==-1);
console.log('linha da tabela mostra "Completo":', tablePt.indexOf('Completo') !== -1);

console.log();
console.log('--- Dashboard em inglês (sem recarregar) ---');
state.lang = 'en';
renderDashboardScreen();
var summaryEn = elements['dash-summary'].innerHTML;
console.log('contém "Finalized surgeries":', summaryEn.indexOf('Finalized surgeries') !== -1);
console.log('contém "Average index":', summaryEn.indexOf('Average index') !== -1);
var tableEn = elements['dash-table'].innerHTML;
console.log('cabeçalho da tabela contém "Surgery" e "Extracted":', tableEn.indexOf('>Surgery<')!==-1 && tableEn.indexOf('>Extracted<')!==-1);
console.log('linha da tabela mostra "Complete":', tableEn.indexOf('Complete') !== -1);
var ufTableEn = elements['dash-uf-table'].innerHTML;
console.log('tabela UF contém "Category"/"Quantity":', ufTableEn.indexOf('Category')!==-1 && ufTableEn.indexOf('Quantity')!==-1);
var quadTableEn = elements['dash-quad-table'].innerHTML;
console.log('tabela por quadrante contém "Quadrant":', quadTableEn.indexOf('Quadrant') !== -1);

console.log();
console.log('--- todas as chaves dash.* existem nos 3 idiomas ---');
var langs = Object.keys(STRINGS);
var allKeys = new Set();
langs.forEach(function(l){ Object.keys(STRINGS[l]).forEach(function(k){ allKeys.add(k); }); });
var dashKeys = Array.from(allKeys).filter(function(k){ return k.indexOf('dash.')===0; });
var missing = [];
dashKeys.forEach(function(k){ langs.forEach(function(l){ if (STRINGS[l][k]===undefined) missing.push(l+':'+k); }); });
console.log('total de chaves dash.*:', dashKeys.length);
console.log('faltando (deveria ser vazio):', missing);
