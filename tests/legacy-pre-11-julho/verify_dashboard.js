const fs = require('fs');
global.document = { addEventListener: function(){}, getElementById: function(){ return null; }, createElement: function(){ return {}; } };
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no network in test')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.computeDashboardData=computeDashboardData;\n})();");
eval(clientSrc);

var list = JSON.parse(fs.readFileSync('all_sessions.json'));
var finalized = list.filter(function(s){ return s.status === 'finalizada'; });
console.log('finalized count (should be 5, S5 excluded):', finalized.length);

var data = computeDashboardData(finalized);
console.log('DATA:', JSON.stringify(data, null, 2));

var checks = [
  ['totalCirurgias===5', data.totalCirurgias === 5],
  ['withData.length===4 (S6 zero-data excluded)', data.withData.length === 4],
  ['indiceMedio ~ 1.497525 (S1 tem 1000 f2 + 10 t2_1 -> indice 2010/1010, nao 2.0 exato)', Math.abs(data.indiceMedio - 1.4975247524752475) < 0.0000001],
  ['preincMedia===16 (80/5)', data.preincMedia === 16],
  ['preincTotal===80', data.preincTotal === 80],
  ['byMode.completo.length===2', data.byMode.completo.length === 2],
  ['byMode.reduzido.length===2', data.byMode.reduzido.length === 2],
  ['taxaParcialMedia.completo ~ 0.49505', Math.abs(data.taxaParcialMedia.completo - 0.49505) < 0.001],
  ['taxaTotalMedia.completo ~ 4.54545', Math.abs(data.taxaTotalMedia.completo - 4.54545) < 0.001],
  ['taxaParcialMedia.reduzido===4', data.taxaParcialMedia.reduzido === 4],
  ['taxaTotalMedia.reduzido ~ 8.24915', Math.abs(data.taxaTotalMedia.reduzido - 8.24915) < 0.001]
];
checks.forEach(function(c){ console.log(c[0]+':', c[1]); });
var allOk = checks.every(function(c){ return c[1]; });
console.log('ALL_OK:', allOk);
process.exit(allOk ? 0 : 1);
