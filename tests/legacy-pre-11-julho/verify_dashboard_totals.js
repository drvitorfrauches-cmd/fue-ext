const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className: '', style: {}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; } };
  return elements[id];
}
global.document = { addEventListener: function(){}, getElementById: function(id){ return fakeEl(id); }, createElement: function(){ return {}; } };
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.renderDashboardScreen=renderDashboardScreen; global.state=state; global.computeDashboardData=computeDashboardData;\n})();");
eval(clientSrc);

var list = JSON.parse(fs.readFileSync('all_sessions.json'));
var finalized = list.filter(function(s){ return s.status === 'finalizada'; });
var data = computeDashboardData(finalized);

console.log('foliculosExtraidosGeral:', data.foliculosExtraidosGeral);
console.log('fiosGeral:', data.fiosGeral);

var checks = [
  ['foliculosExtraidosGeral===2610 (1010+500+100+1000+0)', data.foliculosExtraidosGeral === 2610],
  ['fiosGeral===3710 (2010+500+200+1000+0)', data.fiosGeral === 3710]
];
checks.forEach(function(c){ console.log(c[0]+':', c[1]); });

state.dashboardSessions = finalized;
state.dashboardMode = 'completo';
renderDashboardScreen();
console.log('--- dash-summary com os novos cards ---');
console.log(elements['dash-summary']._innerHTML);

var allOk = checks.every(function(c){ return c[1]; }) && elements['dash-summary']._innerHTML.indexOf('2.610') !== -1 && elements['dash-summary']._innerHTML.indexOf('3.710') !== -1;
console.log('ALL_OK (inclui formatacao pt-BR com separador de milhar):', allOk);
process.exit(allOk ? 0 : 1);
