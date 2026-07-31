const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id: id, className:'', style: {}, classList:{add:function(){},remove:function(){}}, _innerHTML: '', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = v; }, textContent:'', value:'', src:'', checked:false, files:null };
  return elements[id];
}
var rootProps = {};
var rootClassList = { list:{}, add:function(c){this.list[c]=true;}, remove:function(c){delete this.list[c];}, toggle:function(c,f){ if(f) this.list[c]=true; else delete this.list[c]; } };
var logoEls = [ { _display:'', get style(){ return {set display(v){ this._display=v; }, get display(){ return this._display; }}; }, src:'' } ];
// Precisamos que querySelectorAll('.brand-logo') retorne uma "lista" de elementos fake com .forEach
function fakeLogoList(){
  var arr = [
    { style:{display:''}, src:'' },
    { style:{display:''}, src:'' }
  ];
  arr.forEach = Array.prototype.forEach.bind(arr);
  return arr;
}
var lastLogoList = null;
global.document = {
  addEventListener: function(){},
  getElementById: function(id){ return fakeEl(id); },
  createElement: function(){ return { style:{} }; },
  querySelectorAll: function(sel){
    if (sel === '.brand-logo'){ lastLogoList = fakeLogoList(); return lastLogoList; }
    return { forEach: function(){} };
  },
  activeElement: null,
  documentElement: {
    style: { setProperty: function(k,v){ rootProps[k]=v; } },
    classList: rootClassList
  }
};
global.window = { addEventListener: function(){}, location: { hostname:'localhost', origin:'http://localhost:3000', pathname:'/' }, history:{} };
global.navigator = {};
global.localStorage = { getItem: function(){return null;}, setItem: function(){} };
global.history = { pushState: function(){}, replaceState: function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.applyBranding=applyBranding; global.THEME_PRESETS=THEME_PRESETS; global.THEME_ORDER=THEME_ORDER; global.state=state; global.App=App; global.render=render; global.renderSettingsScreen=renderSettingsScreen;\n})();");
eval(clientSrc);

console.log('--- applyBranding: sem branding (default) ---');
applyBranding(null);
console.log('theme padrao primary:', rootProps['--c-primary'] === '#0e7c86');
console.log('modo claro (bg claro):', rootProps['--c-bg'] === '#f4f6f7');
console.log('dark class NAO aplicada:', !rootClassList.list['dark']);
console.log('logos escondidos (sem logo):', lastLogoList.every(function(e){ return e.style.display==='none'; }));

console.log();
console.log('--- applyBranding: tema roxo + dark mode + logo ---');
applyBranding({ theme:'roxo', darkMode:true, logoFilename:'abc123.png', ownerId:'doc1' });
console.log('primary roxo:', rootProps['--c-primary'] === THEME_PRESETS.roxo.primary);
console.log('bg escuro:', rootProps['--c-bg'] === '#12181a');
console.log('dark class aplicada:', !!rootClassList.list['dark']);
console.log('logos visiveis com src correto:', lastLogoList.every(function(e){ return e.style.display==='inline-block' && e.src.indexOf('/api/user/doc1/logo') === 0; }));
console.log('clinical colors intocadas (nao existem em rootProps):', rootProps['--c-integro']===undefined && rootProps['--c-parcial']===undefined && rootProps['--c-total']===undefined && rootProps['--c-mini']===undefined);

console.log();
console.log('--- theme volta pro claro (darkMode:false) ---');
applyBranding({ theme:'padrao', darkMode:false, logoFilename:null, ownerId:null });
console.log('bg claro de novo:', rootProps['--c-bg'] === '#f4f6f7');
console.log('dark class removida:', !rootClassList.list['dark']);
console.log('logos escondidos de novo (sem logoFilename):', lastLogoList.every(function(e){ return e.style.display==='none'; }));

console.log();
console.log('--- render() usa ownerBranding da sessao (nao do currentUser) ---');
var s = {
  id:'s1', codigo:'PAC-X', status:'andamento', mode:'completo', createdAt: Date.now(),
  ownerBranding: { theme:'azul', darkMode:true, logoFilename:'xyz.png', ownerId:'doc2' },
  quadrants: {
    temporal_dir: { counts:{}, mambaCumulativo:null, mambaMarkTimeMs:null },
    temporal_esq: { counts:{}, mambaCumulativo:null, mambaMarkTimeMs:null },
    occipital_dir: { counts:{}, mambaCumulativo:null, mambaMarkTimeMs:null },
    occipital_esq: { counts:{}, mambaCumulativo:null, mambaMarkTimeMs:null }
  },
  preincCounts:{}, preincDist:{}, photos:{marcacao:[],posop:[]},
  timer:{accumulatedMs:0,running:false,startedAt:null}, preincTimer:{accumulatedMs:0,running:false,startedAt:null}
};
state.currentUser = { id:'doc1', branding:{ theme:'grafite', darkMode:false, logoFilename:null, ownerId:'doc1' } };
state.session = s;
state.activeQuadrant = 'temporal_dir';
render();
console.log('primary do session.ownerBranding (azul), nao do currentUser (grafite):', rootProps['--c-primary'] === THEME_PRESETS.azul.primary);
console.log('logo do dono da cirurgia (doc2):', lastLogoList.every(function(e){ return e.src.indexOf('/api/user/doc2/logo') === 0; }));

console.log();
console.log('--- renderSettingsScreen reflete currentUser.branding (nao o da sessao) ---');
state.currentUser.branding = { theme:'marinho', darkMode:true, logoFilename:'me.png', ownerId:'doc1' };
renderSettingsScreen();
console.log('preview logo mostrado:', elements['settings-logo-preview'].style.display === 'inline-block');
console.log('preview logo src:', elements['settings-logo-preview'].src.indexOf('/api/user/doc1/logo') === 0);
console.log('remove btn visivel:', elements['settings-logo-remove-btn'].style.display === 'inline-block');
console.log('darkmode toggle marcado:', elements['settings-darkmode-toggle'].checked === true);
console.log('swatches HTML contem os 5 temas:', ['padrao','azul','roxo','grafite','marinho'].every(function(t){ return elements['settings-theme-swatches'].innerHTML.indexOf(THEME_PRESETS[t].primary) !== -1; }));
console.log('swatch ativo (marinho) tem borda destacada:', elements['settings-theme-swatches'].innerHTML.indexOf('3px solid var(--c-text)') !== -1);
