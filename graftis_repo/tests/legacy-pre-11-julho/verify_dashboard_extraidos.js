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
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.renderDashboardScreen=renderDashboardScreen; global.state=state;\n})();");
eval(clientSrc);

var list = JSON.parse(fs.readFileSync('all_sessions.json'));
var finalized = list.filter(function(s){ return s.status === 'finalizada'; });
state.dashboardSessions = finalized;
state.dashboardMode = 'completo';
renderDashboardScreen();

var svg = elements['dash-extraidos-chart']._innerHTML;
console.log('--- dash-extraidos-chart ---');
console.log(svg);

// esperado: S1=1010, S2=500, S3=100, S4=1000 (S6 excluida por ter 0 extraidos)
var checks = [
  ['tem svg', svg.indexOf('<svg') === 0],
  ['tem 4 barras (rect)', (svg.match(/<rect/g)||[]).length === 4],
  ['contem valor 1010', svg.indexOf('>1.010<') !== -1 || svg.indexOf('1010') !== -1],
  ['contem valor 500', svg.indexOf('500') !== -1],
  ['contem valor 100', svg.indexOf('>100<') !== -1],
  ['contem valor 1000 ou 1.000', svg.indexOf('1.000') !== -1 || svg.indexOf('1000<') !== -1],
  ['usa cor integro', svg.indexOf('var(--c-integro)') !== -1]
];
checks.forEach(function(c){ console.log(c[0]+':', c[1]); });
var allOk = checks.every(function(c){ return c[1]; });
console.log('ALL_OK:', allOk);
process.exit(allOk ? 0 : 1);
