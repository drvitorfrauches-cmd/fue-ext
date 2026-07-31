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
state.dashboardSessions = list.filter(function(s){ return s.status === 'finalizada'; });
state.dashboardMode = 'completo';

renderDashboardScreen();

console.log('--- dash-summary ---');
console.log(elements['dash-summary']._innerHTML);
console.log();
console.log('--- dash-index-chart (first 300 chars) ---');
console.log(elements['dash-index-chart']._innerHTML.slice(0, 300));
console.log();
console.log('--- dash-rate-summary (modo completo) ---');
console.log(elements['dash-rate-summary']._innerHTML);
console.log();

state.dashboardMode = 'reduzido';
renderDashboardScreen();
console.log('--- dash-rate-summary (modo reduzido) ---');
console.log(elements['dash-rate-summary']._innerHTML);
console.log();
console.log('--- dash-table (first 500 chars) ---');
console.log(elements['dash-table']._innerHTML.slice(0, 500));
console.log();
console.log('NO_CRASH_OK');
