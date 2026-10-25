// Servidor: horários das etapas (qualquer pessoa com o link) e retiradas do chiller
// (só médico dono logado). Cobre validação, permissões, persistência e migração.
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const DATA_DIR = '/tmp/fuetest/datatest_sched_impl';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
const PORT = 4785;
const env = Object.assign({}, process.env, { DATA_DIR, PORT: String(PORT), SMTP_ENABLED: 'false', BACKUP_BOOT_DELAY_MS: '99999999' });
let child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
let serverOut = '';
child.stdout.on('data', d => serverOut += d); child.stderr.on('data', d => serverOut += d);
function req(method, urlPath, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ hostname: '127.0.0.1', port: PORT, path: urlPath, method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, data ? { 'Content-Length': Buffer.byteLength(data) } : {}, cookie ? { Cookie: cookie } : {}) }, res => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => { let p; try { p = JSON.parse(raw); } catch (e) { p = raw; } resolve({ status: res.statusCode, body: p, headers: res.headers }); });
    });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function waitForServer(ms) { const dl = Date.now() + (ms || 10000); const a = () => req('GET', '/api/session/__ping__').catch(e => { if (Date.now() > dl) throw e; return sleep(150).then(a); }); return a(); }
const cookieOf = h => (h['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
var allChecks = [];
function check(label, ok) { allChecks.push(!!ok); console.log(label + ':', !!ok); }
(async () => {
  try {
    await waitForServer();
    const a = await req('POST', '/api/register', { email: 'drvitorfrauches@gmail.com', password: 'SenhaForte123', nomeCompleto: 'Dr Dono', crm: 'CRM-1', telefone: '11999999999' });
    const cookieA = cookieOf(a.headers);
    const inv = await req('POST', '/api/admin/invites', {}, cookieA);
    const token = inv.body.token || String(inv.body.url || inv.body.link || '').split('/').pop();
    const b = await req('POST', '/api/register', { email: 'outro@exemplo.com', password: 'SenhaForte123', nomeCompleto: 'Dra Outra', crm: 'CRM-2', telefone: '11888888888', inviteToken: token });
    const cookieB = cookieOf(b.headers);
    const c = await req('POST', '/api/session', { codigo: 'JS-0001', mode: 'completo' }, cookieA);
    const id = c.body.id;

    console.log('--- cirurgia nova ---');
    check('schedule vem todo null', c.body.schedule && Object.keys(c.body.schedule).length === 16 && Object.values(c.body.schedule).every(v => v === null));
    check('schedule tem Entrada, Finalização e início/fim de pré-coroa', 'entrada' in c.body.schedule && 'finalizacao' in c.body.schedule && 'preCoroaIni' in c.body.schedule && 'preCoroaFim' in c.body.schedule);
    check('implant começa sem retiradas', Array.isArray(c.body.implant.withdrawals) && c.body.implant.withdrawals.length === 0);

    console.log('--- horários (sem login, só com o link) ---');
    const s1 = await req('POST', `/api/session/${id}/schedule`, { entrada: '07:20', bloqueioIni: '07:38', bloqueioFim: '07:43' });
    check('aceita horários válidos sem login', s1.status === 200 && s1.body.schedule.entrada === '07:20' && s1.body.schedule.bloqueioFim === '07:43');
    const s2 = await req('POST', `/api/session/${id}/schedule`, { preCoroaIni: '08:55', preCoroaFim: '09:20', finalizacao: '17:30' });
    check('pré-coroa tem início e fim; finalização aceita', s2.body.schedule.preCoroaIni === '08:55' && s2.body.schedule.preCoroaFim === '09:20' && s2.body.schedule.finalizacao === '17:30');
    check('atualização parcial não apaga os outros campos', s2.body.schedule.entrada === '07:20' && s2.body.schedule.bloqueioIni === '07:38');
    const s3 = await req('POST', `/api/session/${id}/schedule`, { bloqueioIni: '25:00' });
    check('hora inválida (25:00) => 400', s3.status === 400);
    const s4 = await req('POST', `/api/session/${id}/schedule`, { bloqueioIni: '7:38' });
    check('formato sem zero à esquerda (7:38) => 400', s4.status === 400);
    const g1 = await req('GET', `/api/session/${id}`);
    check('valor anterior ficou intacto após erro', g1.body.schedule.bloqueioIni === '07:38');
    const s5 = await req('POST', `/api/session/${id}/schedule`, { bloqueioIni: '' });
    check('string vazia limpa o campo', s5.body.schedule.bloqueioIni === null && s5.body.schedule.bloqueioFim === '07:43');
    const s6 = await req('POST', `/api/session/${id}/schedule`, { campoInventado: '10:00' });
    check('chave desconhecida é ignorada', s6.status === 200 && s6.body.schedule.campoInventado === undefined);
    check('cirurgia inexistente => 404', (await req('POST', '/api/session/aaaaaa/schedule', { entrada: '07:00' })).status === 404);

    console.log('--- retiradas do chiller por grupo (só dono logado) ---');
    const adj1 = await req('POST', `/api/session/${id}/adjust`, { quadrant: 'occipital_dir', category: 'f1', delta: 600 }, cookieA);
    const adj2 = await req('POST', `/api/session/${id}/adjust`, { quadrant: 'occipital_dir', category: 'f2', delta: 200 }, cookieA);
    check('seed: 600 de 1 fio e 200 de 2 fios extraídos', adj1.status === 200 && adj2.status === 200);
    check('anônimo => 401', (await req('POST', `/api/session/${id}/implant/withdraw`, { group: 'f1', qty: 100 })).status === 401);
    check('outro médico => 403', (await req('POST', `/api/session/${id}/implant/withdraw`, { group: 'f1', qty: 100 }, cookieB)).status === 403);
    check('sem grupo => 400', (await req('POST', `/api/session/${id}/implant/withdraw`, { qty: 100 }, cookieA)).status === 400);
    check('grupo parcial (t2_1) não é grupo de retirada => 400', (await req('POST', `/api/session/${id}/implant/withdraw`, { group: 't2_1', qty: 1 }, cookieA)).status === 400);
    const w1 = await req('POST', `/api/session/${id}/implant/withdraw`, { group: 'f1', qty: 500 }, cookieA);
    check('dono retira 500 de 1 fio', w1.status === 200 && w1.body.implant.withdrawals.length === 1 && w1.body.implant.withdrawals[0].group === 'f1' && w1.body.implant.withdrawals[0].qty === 500);
    const over = await req('POST', `/api/session/${id}/implant/withdraw`, { group: 'f1', qty: 200 }, cookieA);
    check('retirar 200 de 1 fio (restam 100) => 409', over.status === 409);
    const other = await req('POST', `/api/session/${id}/implant/withdraw`, { group: 'f2', qty: 150 }, cookieA);
    check('saldo de 1 fio não vale para 2 fios (2 fios: 200 extraídos, retira 150) => 200', other.status === 200);
    check('1 fio ainda tem 100 (saldo por grupo)', (await req('POST', `/api/session/${id}/implant/withdraw`, { group: 'f1', qty: 100 }, cookieA)).status === 200);
    const bads = [0, -5, 1.5, 'abc', 100001, null];
    var allBad = true;
    for (const q of bads) { const r = await req('POST', `/api/session/${id}/implant/withdraw`, { group: 'f1', qty: q }, cookieA); if (r.status !== 400) allBad = false; }
    check('quantidades inválidas (0, -5, 1.5, texto, >100000, null) => 400', allBad);
    const g2 = await req('GET', `/api/session/${id}`);
    check('quem tem só o link enxerga as retiradas (somente leitura)', g2.body.implant.withdrawals.length === 3);
    const w1id = w1.body.implant.withdrawals[0].id;
    check('apagar sem login => 401', (await req('POST', `/api/session/${id}/implant/remove`, { id: w1id })).status === 401);
    check('apagar por outro médico => 403', (await req('POST', `/api/session/${id}/implant/remove`, { id: w1id }, cookieB)).status === 403);
    const rm = await req('POST', `/api/session/${id}/implant/remove`, { id: w1id }, cookieA);
    check('dono apaga a retirada de 500 (volta o saldo de 1 fio)', rm.status === 200 && rm.body.implant.withdrawals.length === 2);
    check('com o saldo devolvido, 1 fio aceita 500 de novo', (await req('POST', `/api/session/${id}/implant/withdraw`, { group: 'f1', qty: 500 }, cookieA)).status === 200);
    check('apagar id inexistente => 404', (await req('POST', `/api/session/${id}/implant/remove`, { id: 'naoexiste' }, cookieA)).status === 404);

    console.log('--- implantação depois de finalizar a extração ---');
    const fin = await req('POST', `/api/session/${id}/finalize`, {});
    check('cirurgia finalizada ainda aceita retirada dentro do saldo', fin.status === 200 && (await req('POST', `/api/session/${id}/implant/withdraw`, { group: 'f2', qty: 1 }, cookieA)).status === 200);
    const sf = await req('POST', `/api/session/${id}/schedule`, { impCoroaIni: '14:00', impCoroaFim: '16:04' });
    check('cirurgia finalizada ainda aceita horários', sf.status === 200 && sf.body.schedule.impCoroaFim === '16:04');

    console.log('--- migração de cirurgia antiga (sem schedule/implant) ---');
    const docFile = path.join(DATA_DIR, 'data', 'doctors', c.body.ownerId + '.json');
    child.kill(); await sleep(500);
    const doc = JSON.parse(fs.readFileSync(docFile, 'utf8'));
    delete doc.sessions[id].schedule; delete doc.sessions[id].implant;
    fs.writeFileSync(docFile, JSON.stringify(doc));
    child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
    child.stdout.on('data', d => serverOut += d); child.stderr.on('data', d => serverOut += d);
    await waitForServer();
    const gm = await req('GET', `/api/session/${id}`);
    check('cirurgia antiga ganha schedule vazio', gm.body.schedule && gm.body.schedule.entrada === null && gm.body.schedule.preCoroaFim === null);
    check('cirurgia antiga ganha implant vazio', gm.body.implant && Array.isArray(gm.body.implant.withdrawals) && gm.body.implant.withdrawals.length === 0);

    const done = allChecks.every(v => v);
    console.log(done ? '\nTODOS OS TESTES PASSARAM' : '\nFALHA: verificar acima');
    if (!done) { console.log(serverOut.slice(-1500)); process.exitCode = 1; }
  } catch (e) { console.log('ERRO INESPERADO:', e, serverOut); process.exitCode = 1; } finally { child.kill(); }
})();
