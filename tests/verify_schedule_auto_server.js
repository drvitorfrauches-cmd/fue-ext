// Servidor: horários automáticos (início da extração/pré-incisão e Finalização).
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const DATA_DIR = '/tmp/fuetest/datatest_sched_auto';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
const PORT = 4786;
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
    const c = await req('POST', '/api/session', { codigo: 'AU-0001', mode: 'completo' }, cookieA);
    const id = c.body.id;
    const sch = async () => (await req('GET', `/api/session/${id}`)).body.schedule;

    console.log('--- início automático ---');
    await req('POST', `/api/session/${id}/timer`, { action: 'start' });
    check('start sem localTime não preenche extracaoIni', (await sch()).extracaoIni === null);
    await req('POST', `/api/session/${id}/timer`, { action: 'pause' });
    await req('POST', `/api/session/${id}/timer`, { action: 'start', localTime: '9:5' });
    check('localTime inválido é ignorado', (await sch()).extracaoIni === null);
    await req('POST', `/api/session/${id}/timer`, { action: 'pause' });
    await req('POST', `/api/session/${id}/timer`, { action: 'start', localTime: '07:41' });
    check('start com localTime preenche extracaoIni', (await sch()).extracaoIni === '07:41');
    await req('POST', `/api/session/${id}/timer`, { action: 'pause' });
    await req('POST', `/api/session/${id}/timer`, { action: 'start', localTime: '10:15' });
    check('retomar não sobrescreve o 1º início', (await sch()).extracaoIni === '07:41');
    await req('POST', `/api/session/${id}/timer`, { action: 'pause' });

    await req('POST', `/api/session/${id}/preinc-timer`, { action: 'start', localTime: '07:50' });
    check('1º start das pré-incisões preenche preFrontalIni', (await sch()).preFrontalIni === '07:50');
    await req('POST', `/api/session/${id}/preinc-timer`, { action: 'pause' });
    await req('POST', `/api/session/${id}/preinc-timer`, { action: 'start', localTime: '11:00' });
    check('retomar pré-incisão não sobrescreve', (await sch()).preFrontalIni === '07:50');
    check('pré-coroa continua manual', (await sch()).preCoroaIni === null);

    console.log('--- edição manual do início vale ---');
    await req('POST', `/api/session/${id}/schedule`, { extracaoIni: '07:45' });
    check('médico corrige extracaoIni manualmente', (await sch()).extracaoIni === '07:45');

    console.log('--- finalização automática ---');
    const f1 = await req('POST', `/api/session/${id}/finalize`, { localTime: '16:32' });
    check('finalizar preenche Finalização', f1.status === 200 && f1.body.schedule.finalizacao === '16:32');
    check('finalizar não mexe nos outros horários', f1.body.schedule.extracaoIni === '07:45' && f1.body.schedule.preFrontalIni === '07:50');
    const fx = await req('POST', `/api/session/${id}/fix-duration`, { minutes: 0.00002, localTime: '07:46' });
    check('corrigir duração atualiza Finalização', fx.status === 200 && fx.body.schedule.finalizacao === '07:46');
    const ro = await req('POST', `/api/session/${id}/reopen`, {});
    check('reabrir limpa Finalização', ro.status === 200 && ro.body.schedule.finalizacao === null);
    const f2 = await req('POST', `/api/session/${id}/finalize`, { localTime: '17:05' });
    check('finalizar de novo grava o novo horário', f2.body.schedule.finalizacao === '17:05');
    const f3 = await req('POST', `/api/session/${id}/finalize`, {});
    check('finalizar sem localTime (cliente antigo) mantém o valor', f3.status === 200 && f3.body.schedule.finalizacao === '17:05');
    const f4 = await req('POST', `/api/session/${id}/finalize`, { localTime: '99:99' });
    check('localTime inválido no finalizar é ignorado, sem erro', f4.status === 200 && f4.body.schedule.finalizacao === '17:05');

    const done = allChecks.every(v => v);
    console.log(done ? '\nTODOS OS TESTES PASSARAM' : '\nFALHA: verificar acima');
    if (!done) { console.log(serverOut.slice(-1500)); process.exitCode = 1; }
  } catch (e) { console.log('ERRO INESPERADO:', e, serverOut); process.exitCode = 1; } finally { child.kill(); }
})();
