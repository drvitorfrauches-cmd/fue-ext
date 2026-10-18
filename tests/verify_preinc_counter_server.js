// Servidor: contador de incisões — trava de área (um aparelho por vez), gravação do total
// com o mesmo holder libera a trava, edição manual bloqueada durante a contagem,
// trava expirada, sessão finalizada.
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const DATA_DIR = '/tmp/fuetest/datatest_preinc_counter';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
const PORT = 4789;
const env = Object.assign({}, process.env, { DATA_DIR, PORT: String(PORT), SMTP_ENABLED: 'false', BACKUP_BOOT_DELAY_MS: '99999999' });
let child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
let serverOut = '';
child.stdout.on('data', d => serverOut += d); child.stderr.on('data', d => serverOut += d);
function req(method, urlPath, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const h = Object.assign({ 'Content-Type': 'application/json' }, data ? { 'Content-Length': Buffer.byteLength(data) } : {}, cookie ? { Cookie: cookie } : {});
    const r = http.request({ hostname: '127.0.0.1', port: PORT, path: urlPath, method, headers: h }, res => {
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
    const c = await req('POST', '/api/session', { codigo: 'PC-0001', mode: 'completo' }, cookieA);
    const id = c.body.id;
    const lockUrl = `/api/session/${id}/preinc-lock`;
    const preUrl = `/api/session/${id}/preinc`;

    console.log('--- trava ---');
    check('sessão nova começa sem travas', c.body.preincLocks && Object.keys(c.body.preincLocks).length === 0);
    const s1 = await req('POST', lockUrl, { area: 'linha', holder: 'AAA', action: 'start' });
    check('aparelho A trava a linha', s1.status === 200 && s1.body.preincLocks.linha.holder === 'AAA');
    const s2 = await req('POST', lockUrl, { area: 'linha', holder: 'BBB', action: 'start' });
    check('aparelho B não consegue travar a mesma linha (409)', s2.status === 409);
    const s3 = await req('POST', lockUrl, { area: 'linha', holder: 'AAA', action: 'start' });
    check('o mesmo aparelho renova a trava (200)', s3.status === 200);
    const s4 = await req('POST', lockUrl, { area: 'sublinha', holder: 'BBB', action: 'start' });
    check('outra área continua livre para o aparelho B', s4.status === 200);
    const s5 = await req('POST', lockUrl, { area: 'linha', holder: 'BBB', action: 'end' });
    check('B não consegue liberar a trava de A (continua travada)', s5.status === 200 && s5.body.preincLocks.linha.holder === 'AAA');

    console.log('--- gravação ---');
    const manual = await req('POST', preUrl, { area: 'linha', value: 10 }, cookieA);
    check('edição manual (sem holder) é bloqueada enquanto a área está travada (409)', manual.status === 409);
    const wrong = await req('POST', preUrl, { area: 'linha', value: 150, holder: 'BBB' });
    check('outro aparelho não grava na área travada (409)', wrong.status === 409);
    const ok = await req('POST', preUrl, { area: 'linha', value: 150, holder: 'AAA' });
    check('A grava 150 e a trava é liberada junto', ok.status === 200 && ok.body.preincCounts.linha === 150 && !ok.body.preincLocks.linha);
    const relock = await req('POST', lockUrl, { area: 'linha', holder: 'BBB', action: 'start' });
    check('depois de gravar, B já pode contar a linha', relock.status === 200);
    await req('POST', lockUrl, { area: 'linha', holder: 'BBB', action: 'end' });
    const manualFree = await req('POST', preUrl, { area: 'linha', value: 151 }, cookieA);
    check('sem trava, edição manual volta a funcionar', manualFree.status === 200 && manualFree.body.preincCounts.linha === 151);

    console.log('--- validação ---');
    check('área inválida => 400', (await req('POST', lockUrl, { area: 'xxx', holder: 'AAA', action: 'start' })).status === 400);
    check('sem holder => 400', (await req('POST', lockUrl, { area: 'linha', action: 'start' })).status === 400);
    check('ação inválida => 400', (await req('POST', lockUrl, { area: 'linha', holder: 'AAA', action: 'zzz' })).status === 400);
    check('sessão inexistente => 404', (await req('POST', '/api/session/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/preinc-lock', { area: 'linha', holder: 'AAA', action: 'start' })).status === 404);

    console.log('--- trava expirada ---');
    await req('POST', lockUrl, { area: 'coroa', holder: 'AAA', action: 'start' });
    const docFile = path.join(DATA_DIR, 'data', 'doctors', c.body.ownerId + '.json');
    child.kill(); await sleep(500);
    const doc = JSON.parse(fs.readFileSync(docFile, 'utf8'));
    doc.sessions[id].preincLocks.coroa.since = 0; // trava de 1970: já expirou
    fs.writeFileSync(docFile, JSON.stringify(doc));
    child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
    child.stdout.on('data', d => serverOut += d); child.stderr.on('data', d => serverOut += d);
    await waitForServer();
    const exp = await req('POST', lockUrl, { area: 'coroa', holder: 'BBB', action: 'start' });
    check('trava expirada não bloqueia outro aparelho (200)', exp.status === 200 && exp.body.preincLocks.coroa.holder === 'BBB');

    console.log('--- sessão finalizada ---');
    await req('POST', `/api/session/${id}/finalize`, { localTime: '10:00' }, cookieA);
    check('não trava área de cirurgia finalizada (409)', (await req('POST', lockUrl, { area: 'topete1', holder: 'AAA', action: 'start' })).status === 409);

    const done = allChecks.every(v => v);
    console.log(done ? '\nTODOS OS TESTES PASSARAM' : '\nFALHA: verificar acima');
    if (!done) { console.log(serverOut.slice(-1500)); process.exitCode = 1; }
  } catch (e) { console.log('ERRO INESPERADO:', e, serverOut); process.exitCode = 1; } finally { child.kill(); }
})();
