// Pedido do Dr. Vitor (17/07/2026): uma versão SEPARADA do relatório de impressão,
// desenhada especificamente pra entregar ao paciente (design em outra sessão,
// aprovado antes de implementar) — dados do paciente, fotos, folículos por tipo
// (só íntegros + mini, sem Mamba/transecção/distribuição por fio, que são dado
// interno), índice, total de fios, incisões por área, e 4 tempos cirúrgicos
// (pré-incisões, extração, implantação = total menos as outras duas, tempo total).
// Fotos: padrão de 3 de marcação + 3 de pós-operatório. Rodapé com "Gerado com
// Graftis" discreto (propaganda orgânica, pedido explícito do Dr. Vitor). O
// relatório técnico completo (App.printReport) continua existindo à parte, pro uso
// interno da equipe — este teste confere que os dois convivem sem conflito.
//
// ATUALIZADO (17/07/2026), depois do Dr. Vitor testar com dado real (PDF de uma
// cirurgia de verdade) e comparar: (1) removida a logo do cabeçalho (ele preferiu
// só nome/CRM em texto, mantendo o cabeçalho verde); (2) "Gerado com Graftis"
// passou a aparecer TAMBÉM no cabeçalho, não só no rodapé, pra garantir a
// propaganda mesmo se o documento passar de uma página; (3) layout reorganizado
// (folículos por tipo + incisões por área lado a lado numa grade de 3 colunas,
// fotos dos dois grupos lado a lado em vez de empilhados, parágrafo do hero
// removido) pra caber tudo numa página só — o teste real dele com 12 incisões, 7
// categorias de folículo e 6 fotos tinha estourado pra 3 páginas (2 com conteúdo +
// 1 em branco).
const fs = require('fs');
var elements = {};
function fakeEl(id){
  if (!elements[id]) elements[id] = { id:id, className:'', style:{}, classList:{add:function(){},remove:function(){}}, _innerHTML:'', get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML=v; }, textContent:'', value:'', getAttribute:function(){return null;} };
  return elements[id];
}
global.document = {
  addEventListener:function(){}, getElementById:function(id){ return fakeEl(id); },
  createElement:function(){ return {style:{}}; },
  querySelectorAll:function(){ return []; },
  activeElement:null,
  documentElement:{ style:{ setProperty:function(){} }, classList:{ add:function(){}, remove:function(){}, toggle:function(){} } }
};
var printedCount = 0;
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{}, print:function(){ printedCount++; } };
global.navigator = { language:'pt-BR' };
global.localStorage = { getItem:function(){ return null; }, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
global.fetch = function(){ return Promise.reject(new Error('no net')); };

var srv = fs.readFileSync('server.js', 'utf8');

console.log('--- HTML final (INDEX_HTML avaliado): botão novo e placeholder do relatório existem ---');
var startIdx = srv.indexOf('const INDEX_HTML = ');
var endIdx = srv.indexOf('</html>\\n";', startIdx) + '</html>\\n";'.length;
var htmlSrc = srv.slice(startIdx, endIdx).replace(/^const INDEX_HTML = /, 'var INDEX_HTML = ');
eval(htmlSrc);
var renderedHtml = INDEX_HTML.replace('__APP_SUBTITLE__', 'rede local').replace('__STRINGS_JSON__', '{}');
console.log('botão "Relatório para o paciente" existe e chama App.printPatientReport():', renderedHtml.indexOf('onclick="App.printPatientReport()"') !== -1);
console.log('botão técnico antigo continua existindo (App.printReport):', renderedHtml.indexOf('onclick="App.printReport()"') !== -1);
console.log('placeholder <div id="print-patient-report"> existe:', renderedHtml.indexOf('id="print-patient-report"') !== -1);
console.log('placeholder antigo <div id="print-report"> continua existindo:', renderedHtml.indexOf('id="print-report"') !== -1);

var clientSrc = fs.readFileSync('extracted.js', 'utf8');
clientSrc = clientSrc.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.CATS=CATS; global.PREINC_AREAS=PREINC_AREAS;\n})();");
eval(clientSrc);

function emptyCounts(){ return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0}; }
function emptyQuad(){ return {counts: emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null, carryFromId:null, locked:false}; }
function baseSession(){
  return {
    id:'abc123', codigo:'PAC-TESTE', status:'andamento', mode:'completo', createdAt: Date.now(),
    ownerBranding:{}, photos:{marcacao:[],posop:[]},
    quadrants: { occipital_dir: emptyQuad(), occipital_esq: emptyQuad(), temporal_esq: emptyQuad(), temporal_dir: emptyQuad() },
    preincCounts:{recesso_dir:0,recesso_esq:0,linha:0,sublinha:0,entrada_dir1:0,entrada_dir2:0,entrada_esq1:0,entrada_esq2:0,topete1:0,topete2:0,scalp:0,coroa:0},
    preincDist:{}, timer:{accumulatedMs:0, running:false, startedAt:null}, preincTimer:{accumulatedMs:0, running:false, startedAt:null},
    globalTimerStartedAt: null, globalTimerEndedAt: null, finalizedAt: null,
    patientInfo: {idade:null, alturaCm:null, pesoKg:null, cabeloEspessura:null, cabeloTextura:null, raspagem:null}
  };
}

state.lang = 'pt';
state.currentId = 'abc123';

console.log();
console.log('--- Cenário completo: paciente com todos os dados, 4 tempos, incisões e 3+3 fotos ---');
var s = baseSession();
s.quadrants.occipital_dir.counts.f1 = 800;
s.quadrants.occipital_dir.counts.f2 = 900;
s.quadrants.occipital_esq.counts.f3 = 400;
s.quadrants.temporal_esq.counts.f4 = 40;
s.quadrants.temporal_dir.counts.f1fino = 20;
s.quadrants.temporal_dir.counts.f2fino = 10;
s.quadrants.temporal_dir.counts.mini = 35;
// total íntegros+mini = 800+900+400+40+20+10 = 2170 (mini fica fora, 35 à parte)
s.patientInfo = {idade:41, alturaCm:178, pesoKg:82, cabeloEspessura:'grosso', cabeloTextura:'ondulado', raspagem:'sim'};
s.preincCounts = {recesso_dir:210,recesso_esq:205,linha:340,sublinha:180,entrada_dir1:95,entrada_dir2:90,entrada_esq1:92,entrada_esq2:88,topete1:410,topete2:380,scalp:1520,coroa:570};
var T0 = 1700000000000;
s.preincTimer = {accumulatedMs: 65*60000, running:false, startedAt:null};
s.timer = {accumulatedMs: 160*60000, running:false, startedAt:null};
s.globalTimerStartedAt = T0;
s.globalTimerEndedAt = T0 + 320*60000;
s.photos.marcacao = [{id:'m1'},{id:'m2'},{id:'m3'}];
s.photos.posop = [{id:'p1'},{id:'p2'},{id:'p3'}];
s.ownerBranding = {nomeCompleto:'Dr. Vitor Frauches', crm:'123456-SP', logoFilename:null, ownerId:null};
state.session = s;

App.printPatientReport();
var out = elements['print-patient-report'].innerHTML;

console.log('window.print() foi chamado:', printedCount === 1);
console.log('total de folículos no selo (2170, mini fora da conta):', out.indexOf('>2.170<') !== -1 || out.indexOf('>2170<') !== -1);
console.log('parágrafo do hero (patrep.hero_body) aparece abaixo do título:', out.indexOf('Este relatório documenta os principais dados da sua cirurgia de transplante capilar por extração folicular (FUE)') !== -1);
console.log('nome do médico aparece no cabeçalho:', out.indexOf('Dr. Vitor Frauches') !== -1);
console.log('CRM aparece no cabeçalho:', out.indexOf('123456-SP') !== -1);
console.log('código do paciente aparece:', out.indexOf('PAC-TESTE') !== -1);
console.log('idade aparece:', out.indexOf('>41<') !== -1);
console.log('altura aparece:', out.indexOf('>178<') !== -1);
console.log('peso aparece:', out.indexOf('>82<') !== -1);

console.log();
console.log('--- Barras de folículos: só categorias íntegro+mini (7), nada de transecção ---');
var patientCatIds = CATS.filter(function(c){ return c.group==='integro'||c.group==='mini'; }).map(function(c){return c.id;});
console.log('são exatamente 7 categorias:', patientCatIds.length === 7);
console.log('mostra a contagem de f1 (800):', out.indexOf('>800<') !== -1);
console.log('mostra a contagem de mini (35):', out.indexOf('>35<') !== -1);
console.log('NÃO menciona Mamba em lugar nenhum (dado interno, não é pro paciente):', out.toLowerCase().indexOf('mamba') === -1);
console.log('NÃO menciona transecção (dado interno):', out.toLowerCase().indexOf('transec') === -1);

console.log();
console.log('--- Incisões por área: todas as 12 áreas, em duas colunas ---');
console.log('recesso direito (210) aparece:', out.indexOf('>210<') !== -1);
console.log('scalp (1520) aparece:', out.indexOf('1.520') !== -1 || out.indexOf('1520') !== -1);
console.log('coroa (570) aparece:', out.indexOf('>570<') !== -1);
console.log('layout em duas colunas dentro da grade (pr-incisions-cols):', out.indexOf('pr-incisions-cols') !== -1);
console.log('folículos + incisões combinados na grade de 3 colunas (pr-data-grid):', out.indexOf('pr-data-grid') !== -1);

console.log();
console.log('--- Tempos cirúrgicos: 4 etapas (pré-incisões, extração, implantação, total) ---');
console.log('pré-incisões = 1h 05min:', out.indexOf('1h 05min') !== -1);
console.log('extração = 2h 40min:', out.indexOf('2h 40min') !== -1);
console.log('implantação = 1h 35min (320 - 65 - 160 = 95min):', out.indexOf('1h 35min') !== -1);
console.log('tempo total = 5h 20min:', out.indexOf('5h 20min') !== -1);

console.log();
console.log('--- Fotos: 3 de marcação + 3 de pós-operatório, em duas linhas cheias (não colunas lado a lado) ---');
var imgCount = (out.match(/<img/g)||[]).length;
console.log('exatamente 6 fotos no total (3+3):', imgCount === 6);
console.log('grupo "Marcação cirúrgica" existe:', out.indexOf('Marcação cirúrgica') !== -1);
console.log('grupo "Pós-operatório imediato" existe:', out.indexOf('Pós-operatório imediato') !== -1);
console.log('marcação aparece ANTES de pós-operatório (linha de cima primeiro):', out.indexOf('Marcação cirúrgica') < out.indexOf('Pós-operatório imediato'));
console.log('exatamente 2 blocos de fotos (pr-photos-block), um por grupo, empilhados:', (out.match(/pr-photos-block/g)||[]).length === 2);
console.log('NÃO usa mais o layout antigo de colunas lado a lado (pr-photos-row/pr-photo-col):', out.indexOf('pr-photos-row') === -1 && out.indexOf('pr-photo-col"') === -1);

console.log();
console.log('--- Cores de impressão: cabeçalho verde precisa forçar print-color-adjust (Chrome omite background por padrão no PDF) ---');
console.log('CSS força cores exatas na impressão (print-color-adjust:exact):', srv.indexOf('print-color-adjust:exact') !== -1);

console.log();
console.log('--- Páginas em branco: o resto do app (escondido só com visibility:hidden) ainda ocupava altura na página, gerando páginas extra em branco ---');
console.log('CSS colapsa .app/.toast/.modal-overlay com display:none no modo impressão (não só visibility:hidden):', /\.app,\.toast,\.modal-overlay\{display:none\s*!important;\}/.test(srv));

console.log();
console.log('--- Cabeçalho: sem logo, texto puro (nome+CRM), assinatura "Gerado com Graftis" no cabeçalho E no rodapé ---');
var mastheadEnd = out.indexOf('pr-stub');
var mastheadHtml = mastheadEnd !== -1 ? out.slice(0, mastheadEnd) : out;
console.log('cabeçalho NÃO tem nenhuma imagem de logo:', mastheadHtml.indexOf('<img') === -1);
console.log('cabeçalho NÃO tem ícone SVG de fallback:', mastheadHtml.indexOf('<svg') === -1);
console.log('cabeçalho tem a assinatura "Gerado com Graftis" (pr-masthead-sig):', mastheadHtml.indexOf('pr-masthead-sig') !== -1 && mastheadHtml.indexOf('Gerado com Graftis') !== -1);
var sigOccurrences = (out.match(/Gerado com Graftis/g)||[]).length;
console.log('"Gerado com Graftis" aparece 2 vezes (cabeçalho + rodapé):', sigOccurrences === 2);

console.log();
console.log('--- Rodapé: assinatura discreta "Gerado com Graftis" (propaganda orgânica pedida) ---');
console.log('rodapé tem "Gerado com Graftis":', out.indexOf('Gerado com Graftis') !== -1);

console.log();
console.log('--- Cenário com dados ausentes: sem dados do paciente, sem fotos, sem branding do médico ---');
var s2 = baseSession();
s2.quadrants.occipital_dir.counts.f1 = 500;
s2.globalTimerStartedAt = T0;
s2.globalTimerEndedAt = T0 + 100*60000;
s2.timer = {accumulatedMs: 100*60000, running:false, startedAt:null};
state.session = s2;
App.printPatientReport();
var out2 = elements['print-patient-report'].innerHTML;
console.log('sem seção de fotos quando não há fotos nenhuma:', out2.indexOf('pr-photos-block') === -1 && out2.indexOf('pr-photos-grid') === -1);
console.log('sem quebrar mesmo sem dados do paciente preenchidos (código ainda aparece):', out2.indexOf('PAC-TESTE') !== -1);
console.log('sem nome de médico, cai no fallback "Graftis":', out2.indexOf('>Graftis<') !== -1);
console.log('rodapé "Gerado com Graftis" continua aparecendo mesmo no fallback:', out2.indexOf('Gerado com Graftis') !== -1);
console.log('cabeçalho continua sem logo mesmo no fallback:', out2.slice(0, out2.indexOf('pr-stub')).indexOf('<img') === -1);
console.log('implantação = 0min quando não há pré-incisão (100 - 0 - 100 = 0):', out2.indexOf('0h 00min') !== -1);

console.log();
console.log('--- O relatório técnico interno (App.printReport) continua funcionando, sem interferência ---');
printedCount = 0;
App.printReport();
console.log('window.print() foi chamado pelo relatório técnico também:', printedCount === 1);
console.log('relatório técnico escreve no seu próprio placeholder (print-report), não no do paciente:', elements['print-report'].innerHTML.length > 0);
