const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className: '', style: {}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; } };
  return elements[id];
}
global.document = { addEventListener: function(){}, getElementById: function(id){ return fakeEl(id); }, createElement: function(){ return {}; } };
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{}, confirm: function(){ return false; } };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };

var capturedFetch = null;
global.fetch = function(url, opts){ capturedFetch = {url:url, opts:opts}; return Promise.resolve({ok:true, json:function(){return Promise.resolve({ok:true});}}); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.loadSurgeryList=loadSurgeryList; global.state=state; global.App=App;\n})();");
eval(clientSrc);

// Simula fetch de /api/sessions retornando uma cirurgia com apostrofo no codigo
global.fetch = function(url){
  if (url === '/api/sessions'){
    return Promise.resolve({ ok:true, json: function(){ return Promise.resolve([
      { id: 'abc12345', codigo: "O'Brien-09/07", status: 'andamento', mode: 'completo',
        quadrants: { temporal_dir: {counts:{}, mambaCumulativo:null}, temporal_esq:{counts:{},mambaCumulativo:null}, occipital_dir:{counts:{},mambaCumulativo:null}, occipital_esq:{counts:{},mambaCumulativo:null} },
        createdAt: Date.now() }
    ]); } });
  }
  return Promise.reject(new Error('unexpected fetch'));
};

loadSurgeryList();

setTimeout(function(){
  var html = elements['surgery-list']._innerHTML;
  console.log('--- surgery-list innerHTML ---');
  console.log(html);

  // Tenta "parsear" o onclick do botao Apagar via regex, simulando o que o navegador extrairia
  var m = html.match(/onclick="(App\.deleteSession\([^"]*\))"/);
  console.log();
  console.log('--- onclick extraido do atributo (apos decodificacao HTML) ---');
  var attr = m ? m[1] : null;
  console.log(attr);

  // Verifica se o onclick e apenas App.deleteSession('abc12345') -- SEM o codigo embutido
  var ok1 = attr === "App.deleteSession('abc12345')";
  console.log('onclick correto (so id, sem codigo livre embutido):', ok1);

  // Verifica se o codigo com apostrofo aparece corretamente escapado no texto visivel (nao no atributo)
  var ok2 = html.indexOf('O&#39;Brien-09/07') !== -1;
  console.log('codigo aparece escapado corretamente no texto visivel:', ok2);

  console.log('ALL_OK:', ok1 && ok2);
  process.exit((ok1 && ok2) ? 0 : 1);
}, 50);
