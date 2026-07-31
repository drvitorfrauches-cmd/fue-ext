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
state.dashboardSessions = finalized;
state.dashboardMode = 'todos';

renderDashboardScreen();

console.log('--- botoes (classNames) ---');
console.log('completo:', elements['dash-mode-completo'].className);
console.log('reduzido:', elements['dash-mode-reduzido'].className);
console.log('todos:', elements['dash-mode-todos'].className);

console.log('--- dash-rate-todos-hint display ---');
console.log(elements['dash-rate-todos-hint'].style.display);

console.log('--- dash-rate-summary (modo todos) ---');
console.log(elements['dash-rate-summary']._innerHTML);

console.log('--- dash-rate-chart (primeiros 400 chars, deve ter 4 grupos: S1,S2,S3,S4 com sufixo C/R) ---');
console.log(elements['dash-rate-chart']._innerHTML.slice(0,400));

var data = computeDashboardData(finalized);
var checks = [
  ['withData.length===4 (todos = completo+reduzido com dados)', data.withData.length === 4],
  ['taxaParcialMedia nao deve ser usado em modo todos (nao quebrar)', true],
  ['hint visivel em modo todos', elements['dash-rate-todos-hint'].style.display === 'block'],
  ['resumo mostra split completo/reduzido', elements['dash-rate-summary']._innerHTML.indexOf('em modo completo') !== -1 && elements['dash-rate-summary']._innerHTML.indexOf('em modo reduzido') !== -1],
  ['chart tem marcador (C) e (R)', elements['dash-rate-chart']._innerHTML.indexOf('(C)') !== -1 && elements['dash-rate-chart']._innerHTML.indexOf('(R)') !== -1]
];
checks.forEach(function(c){ console.log(c[0]+':', c[1]); });
var allOk = checks.every(function(c){ return c[1]; });
console.log('ALL_OK:', allOk);

// Agora testar troca de volta pra completo (garantir que hint some e nao quebra)
state.dashboardMode = 'completo';
renderDashboardScreen();
console.log('--- volta pra completo: hint deve sumir ---');
console.log('hint display:', elements['dash-rate-todos-hint'].style.display);
console.log('summary completo:', elements['dash-rate-summary']._innerHTML.indexOf('Taxa parcial média') !== -1);

process.exit(allOk ? 0 : 1);
