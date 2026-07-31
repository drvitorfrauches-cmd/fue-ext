const fs = require('fs');
global.document = { addEventListener: function(){}, getElementById: function(){ return null; }, createElement: function(){ return {}; } };
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no network in test')); };
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.computeSummary=computeSummary; global.combinedExtractionCounts=combinedExtractionCounts; global.CATS=CATS;\n})();");
eval(clientSrc);

const reduz = JSON.parse(fs.readFileSync('reduz_final.json'));
const comp = JSON.parse(fs.readFileSync('comp_final.json'));
const sumReduz = computeSummary(combinedExtractionCounts(reduz), reduz.mode);
const sumComp = computeSummary(combinedExtractionCounts(comp), comp.mode);

console.log('REDUZIDO:', JSON.stringify(sumReduz));
console.log('COMPLETO:', JSON.stringify(sumComp));

const checks = [
  ['reduzido.foliculosExtraidos===1000', sumReduz.foliculosExtraidos === 1000],
  ['reduzido.foliculosManipulados===1000', sumReduz.foliculosManipulados === 1000],
  ['reduzido.taxaParcial===1', sumReduz.taxaParcial === 1],
  ['reduzido.totalFios===2000', sumReduz.totalFios === 2000],
  ['completo.foliculosExtraidos===1010', sumComp.foliculosExtraidos === 1010],
  ['completo.foliculosManipulados===1010', sumComp.foliculosManipulados === 1010],
  ['completo.taxaParcial~0.9901', Math.abs(sumComp.taxaParcial - (10/1010*100)) < 0.0001]
];
checks.forEach(function(c){ console.log(c[0] + ':', c[1]); });
const allOk = checks.every(function(c){ return c[1]; });
console.log('ALL_OK:', allOk);
process.exit(allOk ? 0 : 1);
