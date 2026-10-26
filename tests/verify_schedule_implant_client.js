// Cliente: menu recolhível, aba Horários (duração, virada de dia, total) e aba
// Implantação (saldo, avisos, quem vê os botões, bloqueio de retirada acima do saldo).
const fs = require('fs');
var elements = {};
function fakeEl(id){ if (!elements[id]) { var el = { id:id, className:'', style:{}, _show:false, classList:{add:function(c){ if(c==='show') el._show=true; },remove:function(c){ if(c==='show') el._show=false; }}, innerHTML:'', textContent:'', value:'', placeholder:'', disabled:false, getAttribute:function(){return null;}, setAttribute:function(){}, querySelectorAll:function(){return [];} }; elements[id]=el; } return elements[id]; }
var keyHandlers = [];
global.document = { documentElement:{style:{setProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){}}, lang:''}, addEventListener:function(ev, fn){ if (ev==='keydown') keyHandlers.push(fn); }, getElementById:function(id){return fakeEl(id);}, createElement:function(){return {};}, querySelectorAll:function(){return [];}, activeElement:null };
global.window = { addEventListener:function(){}, location:{hostname:'localhost',origin:'http://localhost:3000',pathname:'/'}, history:{}, confirm:function(){return true;} };
global.navigator = { language:'pt-BR' };
global.localStorage = { getItem:function(){return null;}, setItem:function(){} };
global.history = { pushState:function(){}, replaceState:function(){} };
global.setInterval = function(){ return 0; };
var calls = [];
global.fetch = function(url, opts){ calls.push({ url:String(url), body: opts && opts.body ? JSON.parse(opts.body) : null }); return Promise.resolve({ ok:true, json:function(){ return Promise.resolve(Object.assign({}, state.session)); } }); };
var src = fs.readFileSync('extracted.js','utf8');
src = src.replace(/\}\)\(\);\s*$/, "global.App=App; global.state=state; global.render=render; global.schedDuration=schedDuration; global.schedFmtMinutes=schedFmtMinutes; global.implantStats=implantStats;\n})();");
eval(src);

function emptyCounts(){ return {f1:0,f2:0,f3:0,f4:0,f1fino:0,f2fino:0,t2_1:0,t3_2:0,t3_1:0,t4_3:0,t4_2:0,t4_1:0,parcial_geral:0,ttotal:0,mini:0}; }
function mk(opts){
  var q = function(c){ return {counts:c||emptyCounts(), mambaCumulativo:null, mambaMarkTimeMs:null, mambaMarkedAtMs:null}; };
  var c1 = emptyCounts(); c1.f1 = 300; c1.f2 = 200;
  return { id:'abc123', codigo:'JS-0001', status:'andamento', mode:'completo', createdAt: Date.now(), ownerBranding:{ownerId:'dono1'}, photos:{marcacao:[],posop:[]},
    quadrants:{temporal_dir:q(c1),temporal_esq:q(),occipital_dir:q(),occipital_esq:q()}, preincCounts:{}, preincDist:{},
    timer:{accumulatedMs:0,running:false,startedAt:null}, preincTimer:{accumulatedMs:0,running:false,startedAt:null},
    globalTimerStartedAt:null, globalTimerEndedAt:null, finalizedAt:null, patientInfo:{},
    schedule: opts.schedule || {}, implant: { withdrawals: opts.w || [] } };
}
state.lang = 'pt'; state.currentId = 'abc123';

console.log('--- duração das etapas ---');
console.log('07:38→07:43 = 5 min:', schedFmtMinutes(schedDuration('07:38','07:43').minutes) === '5 min');
console.log('09:24→12:10 = 2h46:', schedFmtMinutes(schedDuration('09:24','12:10').minutes) === '2h46');
console.log('23:50→00:10 = 20 min e marcada como virada de dia:', (function(){ var d = schedDuration('23:50','00:10'); return d.minutes===20 && d.wrapped===true; })());
console.log('faltando um horário => sem duração:', schedDuration('07:38', null) === null);

console.log('--- aba Horários ---');
state.currentUser = { id:'dono1' };
state.session = mk({ schedule:{ entrada:'07:20', finalizacao:'17:00', bloqueioIni:'07:38', bloqueioFim:'07:43', extracaoIni:'09:24', extracaoFim:'12:10', impFrenteIni:'23:50', impFrenteFim:'00:10', preCoroaIni:'08:55' } });
render();
var h = elements['sched-rows'].innerHTML;
['Entrada do paciente','Bloqueio','Anestesia doadora','Pré-incisão frontal','Pré-incisão coroa','Extração','Implantação coroa','Implantação frente','Finalização'].forEach(function(n){
  console.log('mostra "'+n+'":', h.indexOf('>'+n+'<') !== -1);
});
console.log('pré-coroa tem campo de início E de fim:', h.indexOf('id="sched-preCoroaIni"')!==-1 && h.indexOf('id="sched-preCoroaFim"')!==-1);
console.log('Entrada e Finalização têm um campo só:', h.indexOf('id="sched-entrada"')!==-1 && h.indexOf('id="sched-finalizacao"')!==-1 && h.indexOf('id="sched-entradaIni"')===-1);
console.log('horário digitado aparece no campo:', h.indexOf('id="sched-bloqueioIni" value="07:38"')!==-1);
console.log('duração do bloqueio (5 min) aparece:', h.indexOf('<b>5 min</b>')!==-1);
console.log('duração da extração (2h46) aparece:', h.indexOf('<b>2h46</b>')!==-1);
console.log('virada de dia mostra aviso ⚠:', h.indexOf('⚠')!==-1);
console.log('total entrada→finalização (9h40):', h.indexOf('9h40')!==-1);
console.log('botão Agora existe:', h.indexOf('App.schedNow')!==-1);

console.log('--- aba Horários: gravar ---');
calls = [];
App.setSchedule('bloqueioIni','07:50');
console.log('manda só o campo alterado pro endpoint certo:', calls.length===1 && calls[0].url.indexOf('/api/session/abc123/schedule')!==-1 && JSON.stringify(calls[0].body)==='{"bloqueioIni":"07:50"}');
calls = [];
App.schedClear('bloqueioIni');
console.log('limpar manda string vazia:', JSON.stringify(calls[0].body)==='{"bloqueioIni":""}');
calls = [];
App.schedNow('entrada');
console.log('"Agora" manda HH:MM válido:', /^([01]\d|2[0-3]):[0-5]\d$/.test(calls[0].body.entrada));

console.log('--- cronômetro como sugestão (extração) ---');
state.schedSig = null;
var ts = new Date(); ts.setHours(9,30,0,0);
state.session = mk({ schedule:{} }); state.session.globalTimerStartedAt = ts.getTime();
render();
console.log('sugere usar o cronômetro (09:30) quando o início está vazio:', elements['sched-rows'].innerHTML.indexOf('Usar cronômetro (09:30)')!==-1);

console.log('--- aba Implantação: saldo por grupo ---');
var t0 = Date.now();
state.session = mk({ w:[{id:'a',group:'f1',qty:100,at:t0},{id:'b',group:'f2',qty:150,at:t0}] });
console.log('total extraído = íntegros (500):', implantStats(state.session).total === 500);
var gs = implantStats(state.session).groups;
console.log('1 fio: extraído 300, retirado 100, restam 200:', gs[0].total===300 && gs[0].withdrawn===100 && gs[0].remaining===200);
console.log('2 fios: extraído 200, retirado 150, restam 50:', gs[1].total===200 && gs[1].withdrawn===150 && gs[1].remaining===50);
render();
console.log('mostra total 500:', elements['impl-total'].textContent==='500');
console.log('mostra retirados 250:', elements['impl-withdrawn'].textContent==='250');
console.log('mostra restam 250:', elements['impl-remaining'].textContent==='250');
console.log('barra de progresso em 50%:', elements['impl-progress'].style.width==='50.0%');
console.log('tabela tem linha de 1 fio com restam 200:', elements['impl-groups'].innerHTML.indexOf('<b>200</b>')!==-1);
console.log('sem aviso quando está tudo certo:', elements['impl-warning'].style.display==='none');
console.log('lista mostra o grupo de cada retirada, mais recente primeiro:', (function(){ var hh = elements['impl-history'].innerHTML; return hh.indexOf('2 fios') !== -1 && hh.indexOf('1 fio') !== -1 && hh.indexOf('>150<') < hh.indexOf('>100<'); })());
console.log('dono vê botões e o botão de apagar:', elements['impl-controls'].style.display==='block' && elements['impl-history'].innerHTML.indexOf('App.implRemove')!==-1);
console.log('dono não vê o aviso de somente leitura:', elements['impl-readonly-hint'].style.display==='none');

console.log('--- aba Implantação: quem não é dono ---');
state.currentUser = null; render();
console.log('sem login: botões escondidos e aviso aparece:', elements['impl-controls'].style.display==='none' && elements['impl-readonly-hint'].style.display==='block');
console.log('sem login: não aparece botão de apagar:', elements['impl-history'].innerHTML.indexOf('App.implRemove')===-1);
state.currentUser = { id:'outro' }; render();
console.log('outro médico: botões escondidos:', elements['impl-controls'].style.display==='none');
calls = []; App.implWithdrawGroup('f1');
console.log('outro médico: retirada nem chega ao servidor:', calls.length===0);
state.currentUser = { id:'dono1' }; render();

console.log('--- aba Implantação: retirar por grupo ---');
calls = []; fakeEl('impl-q-f1').value = '250'; App.implWithdrawGroup('f1');
console.log('1 fio: 250 com 200 restantes é bloqueado (sem chamada):', calls.length===0);
calls = []; fakeEl('impl-q-f1').value = '0'; App.implWithdrawGroup('f1');
fakeEl('impl-q-f1').value = '-5'; App.implWithdrawGroup('f1');
fakeEl('impl-q-f1').value = 'abc'; App.implWithdrawGroup('f1');
console.log('quantidade inválida é bloqueada:', calls.length===0);
calls = []; fakeEl('impl-q-f1').value = '200'; App.implWithdrawGroup('f1');
console.log('1 fio 200 chama /implant/withdraw com group e qty:', calls.length===1 && calls[0].url.indexOf('/api/session/abc123/implant/withdraw')!==-1 && calls[0].body.group==='f1' && calls[0].body.qty===200);
calls = []; fakeEl('impl-q-f2').value = '60'; App.implWithdrawGroup('f2');
console.log('2 fios 60 bloqueado (só restam 50):', calls.length===0);
calls = []; fakeEl('impl-q-f2').value = '50'; App.implWithdrawGroup('f2');
console.log('2 fios 50 (igual ao saldo) é aceito:', calls.length===1 && calls[0].body.group==='f2' && calls[0].body.qty===50);

console.log('--- polling não desmonta a tabela (cliques e valores digitados sobrevivem) ---');
state.currentUser = { id:'dono1' }; state.session = mk({ w:[] }); render();
elements['impl-groups'].innerHTML = 'SENTINELA';
render();
console.log('mesmo estado: a tabela não é redesenhada a cada polling:', elements['impl-groups'].innerHTML === 'SENTINELA');
state.session = mk({ w:[{id:'z',group:'f2',qty:10,at:Date.now()}] }); render();
console.log('estado mudou: a tabela é redesenhada:', elements['impl-groups'].innerHTML.indexOf('SENTINELA')===-1);
console.log('--- botões rápidos −100 / −200 / −300 ---');
state.currentUser = { id:'dono1' }; state.session = mk({ w:[] }); render();
var gh = elements['impl-groups'].innerHTML;
console.log('botões −100, −200, −300 aparecem para o dono:', gh.indexOf('−100')!==-1 && gh.indexOf('−200')!==-1 && gh.indexOf('−300')!==-1);
calls = []; App.implWithdrawGroup('f1', 300);
console.log('−300 em 1 fio (restam 300) manda qty 300 do grupo f1:', calls.length===1 && calls[0].body.group==='f1' && calls[0].body.qty===300);
calls = []; App.implWithdrawGroup('f2', 300);
console.log('−300 em 2 fios (restam 200) é bloqueado:', calls.length===0);
state.currentUser = null; render();
console.log('sem login: botões rápidos não aparecem:', elements['impl-groups'].innerHTML.indexOf('−100')===-1);
state.currentUser = { id:'dono1' }; render();

console.log('--- apagar e avisos ---');
calls = []; App.implRemove('a'); App.dialogModalOk();
setTimeout(function(){
  console.log('apagar chama /implant/remove com o id:', calls.length===1 && calls[0].url.indexOf('/implant/remove')!==-1 && calls[0].body.id==='a');
  state.session = mk({ w:[{id:'a',group:'f1',qty:400,at:Date.now()}] }); render();
  console.log('1 fio retirado > extraído: mostra aviso:', elements['impl-warning'].style.display==='block' && elements['impl-warning'].textContent.indexOf('Atenção')!==-1);
  state.session = mk({ w:[{id:'a',group:'f1',qty:300,at:Date.now()},{id:'b',group:'f2',qty:200,at:Date.now()}] }); render();
  console.log('chiller zerado: mostra mensagem de conclusão:', elements['impl-warning'].style.display==='block' && elements['impl-warning'].textContent.indexOf('zerado')!==-1);
  state.session = mk({ w:[{id:'x',qty:100,at:Date.now()}] }); render();
  console.log('retirada antiga sem grupo: não mexe no saldo por grupo (restam 500):', elements['impl-remaining'].textContent==='500');
  console.log('retirada antiga sem grupo: nota explicativa aparece:', elements['impl-groups'].innerHTML.indexOf('Retiradas antigas')!==-1);
  state.session = mk({ w:[] }); render();
  console.log('sem retiradas: histórico vazio com mensagem:', elements['impl-history'].innerHTML.indexOf('Nenhuma retirada')!==-1);

  console.log('--- menu recolhível ---');
  App.openNav();
  console.log('abrir menu mostra a gaveta:', fakeEl('nav-drawer-overlay')._show===true);
  App.closeNav();
  console.log('fechar menu esconde a gaveta:', fakeEl('nav-drawer-overlay')._show===false);
  App.openNav(); keyHandlers.forEach(function(fn){ fn({key:'Escape'}); });
  console.log('tecla Esc fecha o menu:', fakeEl('nav-drawer-overlay')._show===false);
  App.openNav(); App.switchTab('implantacao');
  console.log('escolher uma aba fecha o menu sozinho:', fakeEl('nav-drawer-overlay')._show===false);
  console.log('título do topo mostra a aba atual (Implantação):', elements['cnt-tab-title'].textContent==='Implantação');
  console.log('painel da aba aparece e o da extração some:', elements['panel-implantacao'].style.display==='' && elements['panel-extracao'].style.display==='none');
  console.log('botão da aba ativa destacado:', elements['tab-implantacao-btn'].className==='btn' && elements['tab-extracao-btn'].className==='btn secondary');
  App.switchTab('horarios');
  console.log('aba Horários: título e painel:', elements['cnt-tab-title'].textContent==='Horários' && elements['panel-horarios'].style.display==='');
  state.lang = 'en'; render();
  console.log('troca de idioma atualiza o título (Times):', elements['cnt-tab-title'].textContent==='Times');
  state.lang = 'es'; render();
  console.log('espanhol (Horarios):', elements['cnt-tab-title'].textContent==='Horarios');
}, 50);
