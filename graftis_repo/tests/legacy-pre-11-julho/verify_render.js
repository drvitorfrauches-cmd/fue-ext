const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; } };
  return elements[id];
}
global.document = {
  addEventListener: function(){},
  getElementById: function(id){ return fakeEl(id); },
  createElement: function(){ return {}; }
};
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.renderPreinc=renderPreinc;\n})();");
eval(clientSrc);

var fakeSession = {
  status: 'andamento',
  preincCounts: { linha: 42, scalp: 10, recesso_dir: 0, recesso_esq: 0, sublinha: 0, entrada_dir1: 0, entrada_dir2: 0, entrada_esq1: 0, entrada_esq2: 0, topete1: 0, topete2: 0, coroa: 0 },
  preincDist: {
    linha: { f1: 0, f2: 200, f3: 300 },
    scalp: { f1: 50, f2: 0, f3: 0 },
    recesso_dir: {f1:0,f2:0,f3:0}, recesso_esq:{f1:0,f2:0,f3:0}, sublinha:{f1:0,f2:0,f3:0},
    entrada_dir1:{f1:0,f2:0,f3:0}, entrada_dir2:{f1:0,f2:0,f3:0}, entrada_esq1:{f1:0,f2:0,f3:0},
    entrada_esq2:{f1:0,f2:0,f3:0}, topete1:{f1:0,f2:0,f3:0}, topete2:{f1:0,f2:0,f3:0}, coroa:{f1:0,f2:0,f3:0}
  }
};

renderPreinc(fakeSession);

console.log('--- group-preincisoes innerHTML (primeiro card = Linha) ---');
var html = elements['group-preincisoes']._innerHTML;
var firstCardEnd = html.indexOf('</div></div>') + '</div></div>'.length;
console.log(html.slice(0, firstCardEnd));
console.log();
console.log('--- preinc-dist-totals innerHTML ---');
console.log(elements['preinc-dist-totals']._innerHTML);
