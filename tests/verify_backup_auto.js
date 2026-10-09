// Backup automático: roda sozinho no boot (sem estado prévio), verifica a cópia,
// só admin dispara/consulta, cópia corrompida é detectada (FALHA) sem apagar as boas,
// e a rotação mantém só as últimas N cópias.
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const DATA_DIR = '/tmp/fuetest/datatest_backup';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
const PORT = 4784;
const env = Object.assign({}, process.env, { DATA_DIR, PORT: String(PORT), SMTP_ENABLED: 'false', BACKUP_BOOT_DELAY_MS: '600', BACKUP_KEEP: '2', BACKUP_INTERVAL_DAYS: '10' });
const child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
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
const snaps = () => fs.existsSync(path.join(DATA_DIR, 'backups')) ? fs.readdirSync(path.join(DATA_DIR, 'backups')).filter(n => /^\d{4}-/.test(n)).sort() : [];
var allChecks = [];
function check(label, ok) { allChecks.push(!!ok); console.log(label + ':', !!ok); }
(async () => {
  try {
    await waitForServer();
    const a = await req('POST', '/api/register', { email: 'drvitorfrauches@gmail.com', password: 'SenhaForte123', nomeCompleto: 'Dr Admin', crm: 'CRM-1', telefone: '11999999999' });
    const cookieA = cookieOf(a.headers);
    const inv = await req('POST', '/api/admin/invites', {}, cookieA);
    const token = inv.body.token || String(inv.body.url || inv.body.link || '').split('/').pop();
    const b = await req('POST', '/api/register', { email: 'outro@exemplo.com', password: 'SenhaForte123', nomeCompleto: 'Dra Outra', crm: 'CRM-2', telefone: '11888888888', inviteToken: token });
    const cookieB = cookieOf(b.headers);
    await req('POST', '/api/session', { codigo: 'JS-0001', mode: 'completo' }, cookieA);
    await req('POST', '/api/session', { codigo: 'MS-0002', mode: 'reduzido' }, cookieB);

    console.log('--- agendador automático (sem estado prévio, dispara no boot) ---');
    await sleep(1800);
    const st0 = await req('GET', '/api/admin/backup', null, cookieA);
    check('rodou sozinho (status com lastRunAt)', st0.status === 200 && st0.body.status && st0.body.status.lastRunAt > 0);
    check('intervalo configurado = 10 dias', st0.body.intervalDays === 10);
    check('existe 1 cópia em disco', snaps().length === 1);

    console.log('--- permissões ---');
    check('anônimo => 401', (await req('GET', '/api/admin/backup')).status === 401);
    check('médico não-admin => 403 (GET)', (await req('GET', '/api/admin/backup', null, cookieB)).status === 403);
    check('médico não-admin => 403 (POST)', (await req('POST', '/api/admin/backup', {}, cookieB)).status === 403);

    console.log('--- execução manual verificada ---');
    const r1 = await req('POST', '/api/admin/backup', {}, cookieA);
    check('manual OK', r1.status === 200 && r1.body.ok === true && r1.body.problems.length === 0);
    check('status mostra 2 cirurgias e 2 médicos', r1.body.status.sessions === 2 && r1.body.status.users === 2);
    const lastSnap = snaps().slice(-1)[0];
    const files = [];
    (function walk(d) { fs.readdirSync(d).forEach(n => { const f = path.join(d, n); fs.statSync(f).isDirectory() ? walk(f) : files.push(f); }); })(path.join(DATA_DIR, 'backups', lastSnap));
    check('todos os arquivos da cópia abrem como JSON', files.length > 0 && files.every(f => { try { JSON.parse(fs.readFileSync(f, 'utf8')); return true; } catch (e) { return false; } }));

    console.log('--- rotação (mantém só 2) ---');
    await req('POST', '/api/admin/backup', {}, cookieA);
    await req('POST', '/api/admin/backup', {}, cookieA);
    check('só 2 cópias permanecem', snaps().length === 2);

    console.log('--- cópia corrompida é detectada ---');
    const before = snaps();
    fs.writeFileSync(path.join(DATA_DIR, 'data', 'doctors', 'quebrado.json'), '{ isto nao e json');
    const bad = await req('POST', '/api/admin/backup', {}, cookieA);
    check('verificação FALHA (ok=false) com problema descrito', bad.body.ok === false && bad.body.problems.length > 0);
    check('cópias boas anteriores foram mantidas', JSON.stringify(snaps()) === JSON.stringify(before));
    check('status registra a falha', (await req('GET', '/api/admin/backup', null, cookieA)).body.status.lastOk === false);
    fs.rmSync(path.join(DATA_DIR, 'data', 'doctors', 'quebrado.json'));
    const fixed = await req('POST', '/api/admin/backup', {}, cookieA);
    check('depois de consertar, volta a OK', fixed.body.ok === true);

    console.log('--- health check ---');
    const h = await req('GET', '/api/health');
    check('/api/health 200 {ok:true}', h.status === 200 && h.body.ok === true);
    const hh = await req('HEAD', '/api/health');
    check('HEAD /api/health 200', hh.status === 200);

    const done = allChecks.every(v => v);
    console.log(done ? '\nTODOS OS TESTES PASSARAM' : '\nFALHA: verificar acima');
    if (!done) { console.log(serverOut.slice(-1500)); process.exitCode = 1; }
  } catch (e) { console.log('ERRO INESPERADO:', e, serverOut); process.exitCode = 1; } finally { child.kill(); }
})();
