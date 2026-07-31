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

// Caso 1 (já validado antes, sem transecção total): 1000 integros + 10 parcial_geral, modo reduzido
var counts1 = { f2: 1000, parcial_geral: 10 };
var sum1 = computeSummary(counts1, 'reduzido');
console.log('Caso 1 (sem total):', JSON.stringify(sum1));

// Caso 2 (o novo exemplo do usuário): 100 integros + 8 parcial_geral + 8 ttotal, modo reduzido
var counts2 = { f2: 100, parcial_geral: 8, ttotal: 8 };
var sum2 = computeSummary(counts2, 'reduzido');
console.log('Caso 2 (com total):', JSON.stringify(sum2));

var checks = [
  ['caso1.taxaParcial===1', sum1.taxaParcial === 1],
  ['caso1.foliculosManipulados===1000', sum1.foliculosManipulados === 1000],
  ['caso2.foliculosManipulados===100 (nao 108, nao 116)', sum2.foliculosManipulados === 100],
  ['caso2.taxaParcial===8', sum2.taxaParcial === 8],
  ['caso2.taxaTotal===8', sum2.taxaTotal === 8],
  ['caso2.foliculosExtraidos===100', sum2.foliculosExtraidos === 100]
];
checks.forEach(function(c){ console.log(c[0] + ':', c[1]); });
var allOk = checks.every(function(c){ return c[1]; });
console.log('ALL_OK:', allOk);
process.exit(allOk ? 0 : 1);
