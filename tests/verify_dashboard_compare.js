// Dashboard novo: agrupamento por punch/espessura/textura/raspagem/idade, taxas só em
// modo único, "melhor" por coluna, aviso de amostra pequena, comparação A×B e
// ordenação da lista. Sem servidor — roda a lógica do cliente com DOM falso.
const fs = require('fs');
var elements = {};
function fakeEl(id){ if (!elements[id]) elements[id] = { id:id, className:'', style:{}, classList:{add:function(){},remove:function(){}}, innerHTML:'', textContent:'', value:'', placeholder:'', disabled:false, getAttribute:function(){return null;}, setAttribute:function(){} }; return elements[id]; }
global.document = { documentElement:{style:{setProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){}}, lang:''}, addEventListener:function(){}, getElementById:function(id){return fakeEl(id);}, createElement:function(){return {};}, querySelectorAll:function(){return [];}, activeElement:null };
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{}, confirm:function(){return true;} };
global.navigator = { language:'pt-BR' };
global.localStorage = { getItem:function(){return null;}, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.resolve({ ok:true, json:function(){ return Promise.resolve({}); } }); };
var src = fs.readFileSync('extracted.js','utf8');
src = src.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.groupDashboardRows=groupDashboardRows; global.computeDashboardData=computeDashboardData; global.renderDashboardScreen=renderDashboardScreen; global.dashAgeBucket=dashAgeBucket;\n})();");
eval(src);

function emptyCounts(){ return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0}; }
var seq = 0;
function mk(codigo, mode, f1, f2, trans, minutes, pi){
  seq++;
  var q = function(c){ return {counts:c, mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null}; };
  var c1 = emptyCounts(); c1.f1 = f1; c1.f2 = f2; c1.t2_1 = trans;
  return { id:'id'+seq, codigo:codigo, status:'finalizada', mode:mode, createdAt: 1700000000000 + seq*86400000,
    quadrants:{ temporal_dir:q(c1), temporal_esq:q(emptyCounts()), occipital_dir:q(emptyCounts()), occipital_esq:q(emptyCounts()) },
    preincCounts:{}, preincDist:{}, timer:{accumulatedMs: minutes*60000, running:false, startedAt:null}, patientInfo: pi || {} };
}
state.lang = 'pt';
var sessions = [
  mk('A1','completo',300,100, 10, 100, {punchMm:'0.95', cabeloEspessura:'fino',   cabeloTextura:'liso',     raspagem:'sim', idade:35}),
  mk('A2','completo',320,120, 20, 110, {punchMm:'0.95', cabeloEspessura:'fino',   cabeloTextura:'liso',     raspagem:'sim', idade:42}),
  mk('B1','completo',400,100, 50, 100, {punchMm:'1.0',  cabeloEspessura:'grosso', cabeloTextura:'crespo',   raspagem:'nao', idade:55}),
  mk('C1','completo',250,50,  5,  100, {}),
  mk('R1','reduzido',200,50,  8,  60,  {punchMm:'1.0',  idade:61})
];
state.dashboardSessions = sessions;
var data = computeDashboardData(sessions);

console.log('--- campos novos nas linhas ---');
var r0 = data.rows[0];
console.log('linha traz punch/espessura/textura/raspagem/idade:', r0.punchMm==='0.95' && r0.espessura==='fino' && r0.textura==='liso' && r0.raspagem==='sim' && r0.idade===35);
console.log('linha sem dados do paciente fica null:', data.rows[3].punchMm===null && data.rows[3].idade===null);
console.log('fol/min = extraídos ÷ minutos:', Math.abs(r0.folPerMin - (r0.extraidos/100)) < 1e-9);

console.log('--- faixas de idade ---');
console.log('35→u40, 42→a40, 55→a50, 61→a60, vazio→na:', dashAgeBucket(35)==='u40' && dashAgeBucket(42)==='a40' && dashAgeBucket(55)==='a50' && dashAgeBucket(61)==='a60' && dashAgeBucket(null)==='na');

console.log('--- agrupar por punch (modo completo) ---');
var g = groupDashboardRows(data.withData, 'punch', 'completo');
console.log('3 grupos: 0,95 / 1,0 / não informado:', g.length===3 && g[0].key==='0.95' && g[1].key==='1.0' && g[2].key==='na');
console.log('grupo 0,95 tem n=2:', g[0].n===2);
console.log('grupo 1,0 em completo tem só B1 (n=1) — R1 é reduzido e fica de fora:', g[1].n===1);
console.log('média de extraídos do grupo 0,95 correta:', Math.abs(g[0].extraidos - ((data.rows[0].extraidos + data.rows[1].extraidos)/2)) < 1e-9);
console.log('taxas calculadas em modo único:', g[0].taxaTotal!==null && g[0].taxaParcial!==null);

console.log('--- modo Todos: taxas somem, restante continua ---');
var gt = groupDashboardRows(data.withData, 'punch', 'todos');
console.log('taxas nulas em Todos:', gt.every(function(x){ return x.taxaTotal===null && x.taxaParcial===null; }));
console.log('1,0 agora junta B1 + R1 (n=2):', gt.filter(function(x){return x.key==='1.0';})[0].n===2);
console.log('extraídos continuam calculados:', gt.every(function(x){ return x.extraidos!==null; }));

console.log('--- outras dimensões ---');
console.log('espessura: fino n=2, grosso n=1, não informado n=1:', (function(){ var e=groupDashboardRows(data.withData,'espessura','completo'); return e.map(function(x){return x.key+':'+x.n;}).join(',')==='fino:2,grosso:1,na:1'; })());
console.log('textura ordem liso→crespo→na:', groupDashboardRows(data.withData,'textura','completo').map(function(x){return x.key;}).join(',')==='liso,crespo,na');
console.log('raspagem sim/nao/na:', groupDashboardRows(data.withData,'raspagem','completo').map(function(x){return x.key;}).join(',')==='sim,nao,na');
console.log('idade u40,a40,a50,na:', groupDashboardRows(data.withData,'idade','completo').map(function(x){return x.key;}).join(',')==='u40,a40,a50,na');

console.log('--- tela: aba Comparar ---');
state.dashTab = 'comparar'; state.dashDim = 'punch'; state.dashboardMode = 'completo';
renderDashboardScreen();
var html = elements['dash-compare-table'].innerHTML;
console.log('tabela de comparação renderizada com os grupos:', html.indexOf('0,95 mm')!==-1 && html.indexOf('1,0 mm')!==-1 && html.indexOf('Não informado')!==-1);
console.log('marca ⚠ amostra pequena (n<5):', html.indexOf('⚠')!==-1);
console.log('marca ★ no melhor valor:', html.indexOf('★')!==-1);
console.log('painel Comparar visível, geral escondido:', elements['dash-panel-comparar'].style.display==='block' && elements['dash-panel-geral'].style.display==='none');
console.log('botão da dimensão ativa destacado:', elements['dash-dim-punch'].className==='btn' && elements['dash-dim-idade'].className==='btn secondary');
state.dashboardMode = 'todos'; renderDashboardScreen();
console.log('em Todos aparece o aviso de taxas:', elements['dash-compare-rates-hint'].style.display==='block');

console.log('--- comparação A × B ---');
state.dashboardMode = 'completo'; state.dashPairA = data.rows[0].id; state.dashPairB = data.rows[2].id; renderDashboardScreen();
var pair = elements['dash-pair-box'].innerHTML;
console.log('mostra os dois selects:', pair.indexOf('dash-pair-a')!==-1 && pair.indexOf('dash-pair-b')!==-1);
console.log('diferença de extraídos B−A correta:', pair.indexOf('+'+(data.rows[2].extraidos-data.rows[0].extraidos))!==-1);
console.log('mesmo modo: sem aviso:', pair.indexOf('Modos diferentes')===-1);
state.dashPairB = data.rows[4].id; renderDashboardScreen();
pair = elements['dash-pair-box'].innerHTML;
console.log('modos diferentes: aviso aparece:', pair.indexOf('Modos diferentes')!==-1);
console.log('modos diferentes: diferença de taxa não é mostrada:', pair.indexOf(' pp')===-1);
App.setDashPair('b', data.rows[1].id);
console.log('App.setDashPair troca a cirurgia B:', state.dashPairB===data.rows[1].id);

console.log('--- aba Cirurgias: ordenação ---');
state.dashTab = 'lista'; state.dashSort = null; renderDashboardScreen();
console.log('padrão: mais recente primeiro (R1 antes de A1):', elements['dash-table'].innerHTML.indexOf('R1') < elements['dash-table'].innerHTML.indexOf('A1'));
App.sortDashboard('extraidos');
var ord = elements['dash-table'].innerHTML;
console.log('ordenar por extraídos (desc): B1 (500) antes de A1 (400):', ord.indexOf('>B1<') < ord.indexOf('>A1<'));
App.sortDashboard('extraidos');
ord = elements['dash-table'].innerHTML;
console.log('clicar de novo inverte (asc): R1 (250) antes de B1:', ord.indexOf('>R1<') < ord.indexOf('>B1<'));
console.log('colunas novas aparecem (Punch, Idade):', ord.indexOf('Punch')!==-1 && ord.indexOf('Idade')!==-1);
console.log('barra de modo escondida na lista:', elements['dash-mode-row'].style.display==='none');

console.log('--- visão geral continua funcionando ---');
state.dashTab = 'geral'; renderDashboardScreen();
console.log('resumo renderizado:', elements['dash-summary'].innerHTML.indexOf('summary-item')!==-1);
console.log('gráfico de extraídos renderizado:', elements['dash-extraidos-chart'].innerHTML.indexOf('<svg')!==-1);

console.log('--- sem cirurgias finalizadas ---');
state.dashboardSessions = []; renderDashboardScreen();
console.log('mostra estado vazio:', elements['dash-empty'].style.display==='block' && elements['dash-content'].style.display==='none');

console.log('--- EN e ES renderizam sem chave crua ---');
['en','es'].forEach(function(l){
  state.lang = l; state.dashboardSessions = sessions; state.dashTab = 'comparar'; state.dashDim = 'idade'; state.dashboardMode='completo'; renderDashboardScreen();
  var h = elements['dash-compare-table'].innerHTML + elements['dash-pair-box'].innerHTML;
  console.log(l+': sem chaves "dash." cruas:', !/dash\.[a-z_0-9]+/.test(h) && !/patient\.[a-z_0-9]+/.test(h));
});
