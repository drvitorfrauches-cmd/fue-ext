const fs = require('fs');
global.document = { addEventListener: function(){}, getElementById: function(){ return null; }, createElement: function(){ return {}; } };
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no network in test')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.computeSummary=computeSummary;\n})();");
eval(clientSrc);

// Caso 1: 1000 integros + 10 parcial_geral, sem transecção total, modo reduzido
var sum1 = computeSummary({ f2: 1000, parcial_geral: 10 }, 'reduzido');
console.log('Caso 1:', JSON.stringify(sum1));

// Caso 2: 100 integros + 8 parcial_geral + 8 ttotal, modo reduzido (exemplo anterior do usuario)
var sum2 = computeSummary({ f2: 100, parcial_geral: 8, ttotal: 8 }, 'reduzido');
console.log('Caso 2:', JSON.stringify(sum2));

// Caso 3: 1000 integros + 100 ttotal (sem parcial), modo reduzido (exemplo mais recente do usuario)
var sum3 = computeSummary({ f2: 1000, ttotal: 100 }, 'reduzido');
console.log('Caso 3:', JSON.stringify(sum3));

// Caso 4 (controle): modo completo nao deve ter sido afetado -- 1000 integros + 10 t2_1 granular
var sum4 = computeSummary({ f2: 1000, t2_1: 10 }, 'completo');
console.log('Caso 4 (completo, controle):', JSON.stringify(sum4));

var checks = [
  ['caso1.taxaParcial===1', sum1.taxaParcial === 1],
  ['caso2.taxaParcial===8 (8/100, base so integros)', sum2.taxaParcial === 8],
  ['caso2.taxaTotal ~ 7.4074 (8/108, base integros+total)', Math.abs(sum2.taxaTotal - (8/108*100)) < 0.0001],
  ['caso2.foliculosManipulados===108', sum2.foliculosManipulados === 108],
  ['caso3.taxaTotal ~ 9.0909 (100/1100)', Math.abs(sum3.taxaTotal - (100/1100*100)) < 0.0001],
  ['caso3.foliculosManipulados===1100', sum3.foliculosManipulados === 1100],
  ['caso3.foliculosExtraidos===1000', sum3.foliculosExtraidos === 1000],
  ['caso4.foliculosManipulados===1010 (completo inalterado)', sum4.foliculosManipulados === 1010],
  ['caso4.taxaParcial~0.9901 (completo inalterado)', Math.abs(sum4.taxaParcial - (10/1010*100)) < 0.0001]
];
checks.forEach(function(c){ console.log(c[0] + ':', c[1]); });
var allOk = checks.every(function(c){ return c[1]; });
console.log('ALL_OK:', allOk);
process.exit(allOk ? 0 : 1);
