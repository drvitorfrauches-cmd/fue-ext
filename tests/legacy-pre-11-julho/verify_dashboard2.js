const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; }, textContent:'' };
  return elements[id];
}
global.document = { addEventListener: function(){}, getElementById: function(id){ return fakeEl(id); }, createElement: function(){ return {}; }, querySelectorAll: function(){ return { forEach: function(){} }; } };
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.computeDashboardData=computeDashboardData; global.renderDashboardScreen=renderDashboardScreen; global.QUADRANTS=QUADRANTS;\n})();");
eval(clientSrc);

function emptyQuad(){ return { counts:{}, mambaCumulativo:null }; }

// Cirurgia 1 (completo): temporal_dir com bastante volume + mamba preenchido, resto vazio
var s1 = {
  id:'s1', codigo:'PAC-1', status:'finalizada', mode:'completo', createdAt: Date.now()-3*86400000,
  quadrants: {
    temporal_dir: { counts:{ f1:400, f2:300, f3:50, f4:10, f1fino:20, f2fino:10, t2_1:20, ttotal:10, mini:5 }, mambaCumulativo: 800 },
    temporal_esq: emptyQuad(), occipital_dir: emptyQuad(), occipital_esq: emptyQuad()
  },
  preincCounts:{}, preincDist:{}, photos:{marcacao:[],posop:[]},
  timer:{accumulatedMs: 2*3600000, running:false, startedAt:null}, // 2h
  preincTimer:{accumulatedMs:0,running:false,startedAt:null}
};

// Cirurgia 2 (completo): temporal_dir de novo, sem mamba dessa vez
var s2 = {
  id:'s2', codigo:'PAC-2', status:'finalizada', mode:'completo', createdAt: Date.now()-2*86400000,
  quadrants: {
    temporal_dir: { counts:{ f1:200, f2:100, t2_1:10, ttotal:5, mini:3 }, mambaCumulativo: null },
    temporal_esq: emptyQuad(), occipital_dir: emptyQuad(), occipital_esq: emptyQuad()
  },
  preincCounts:{}, preincDist:{}, photos:{marcacao:[],posop:[]},
  timer:{accumulatedMs: 1*3600000, running:false, startedAt:null}, // 1h
  preincTimer:{accumulatedMs:0,running:false,startedAt:null}
};

var data = computeDashboardData([s1, s2]);

console.log('--- computeDashboardData: métricas gerais ---');
// Extraidos geral: s1 integros=400+300+50+10+20+10=790 (mini fora); s2 integros=200+100=300 => total 1090
console.log('foliculosExtraidosGeral:', data.foliculosExtraidosGeral, '(esperado 1090)');
console.log('miniTotalGeral:', data.miniTotalGeral, '(esperado 8 = 5+3)');
console.log('minisPorMil:', data.minisPorMil.toFixed(2), '(esperado ~7.34 = 8/1090*1000)');
// tempoTotalMs = 3h = 10800000ms; folPerMin = 1090/(10800000/60000) = 1090/180 = 6.0555..
console.log('tempoTotalMs:', data.tempoTotalMs, '(esperado 10800000)');
console.log('folPerMin:', data.folPerMin.toFixed(2), '(esperado ~6.06)');
// tempoPorMilMs = 10800000/1090*1000 = 9908256.88 ms ~ 165min
console.log('tempoPorMilMs (min):', (data.tempoPorMilMs/60000).toFixed(1), '(esperado ~165.1 min)');

console.log();
console.log('--- pctUF ---');
// f1 total = 400+200=600; f2=300+100=400; f3=50; f4=10; f1fino=20; f2fino=10; integrosTotal=790+300=1090? wait integrosTotal computed same as foliculosExtraidosGeral since only integro counted (no parcial fios in test data affecting f-categories) -> 1090
data.pctUF.forEach(function(u){ console.log(u.id, '-> qtd:', u.qtd, 'pct:', u.pct.toFixed(1)+'%'); });
var f1 = data.pctUF.filter(function(u){return u.id==='f1';})[0];
console.log('f1 qtd correta (600):', f1.qtd === 600);
console.log('f1 pct correta (~55.0%):', Math.abs(f1.pct - 600/1090*100) < 0.01);

console.log();
console.log('--- quadranteMedias (temporal_dir, modo completo) ---');
var qd = data.quadranteMedias.filter(function(q){ return q.id==='temporal_dir'; })[0];
console.log('n cirurgias com dado:', qd.completo.n, '(esperado 2)');
console.log('mambaDiffPct não é null (só s1 tem mamba):', qd.completo.mambaDiffPct !== null);
var outroQuad = data.quadranteMedias.filter(function(q){ return q.id==='temporal_esq'; })[0];
console.log('temporal_esq sem dado (n=0):', outroQuad.completo.n === 0);
console.log('temporal_esq mambaDiffPct null (nenhuma cirurgia mediu):', outroQuad.completo.mambaDiffPct === null);

console.log();
console.log('--- renderDashboardScreen (DOM) ---');
state.currentUser = { id:'doc1' };
state.dashboardSessions = [s1, s2];
state.dashboardMode = 'completo';
renderDashboardScreen();
console.log('dash-summary contém "Folículos/minuto":', elements['dash-summary'].innerHTML.indexOf('Folículos/minuto') !== -1);
console.log('dash-summary contém "Minis por 1000":', elements['dash-summary'].innerHTML.indexOf('Minis por 1000') !== -1);
console.log('dash-uf-table tem linha f1:', elements['dash-uf-table'].innerHTML.indexOf('1 fio') !== -1);
console.log('dash-quad-table visível (completo):', elements['dash-quad-table'].style.display === 'block');
console.log('dash-quad-todos-hint escondido (completo):', elements['dash-quad-todos-hint'].style.display === 'none');
console.log('dash-quad-table contém "Temporal" (algum label de quadrante):', elements['dash-quad-table'].innerHTML.indexOf('Temporal') !== -1);

state.dashboardMode = 'todos';
renderDashboardScreen();
console.log('modo Todos: dash-quad-table escondido:', elements['dash-quad-table'].style.display === 'none');
console.log('modo Todos: dash-quad-todos-hint visível:', elements['dash-quad-todos-hint'].style.display === 'block');
