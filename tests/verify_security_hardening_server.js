// Servidor: endurecimento de segurança — id de cirurgia de 128 bits, senha mínima de 10
// com lista de senhas comuns, cookie/HSTS Secure quando a requisição é HTTPS.
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const DATA_DIR = '/tmp/fuetest/datatest_security';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
const PORT = 4787;
const env = Object.assign({}, process.env, { DATA_DIR, PORT: String(PORT), SMTP_ENABLED: 'false', BACKUP_BOOT_DELAY_MS: '99999999' });
let child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
let serverOut = '';
child.stdout.on('data', d => serverOut += d); child.stderr.on('data', d => serverOut += d);
function req(method, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const h = Object.assign({ 'Content-Type': 'application/json' }, data ? { 'Content-Length': Buffer.byteLength(data) } : {}, headers || {});
    const r = http.request({ hostname: '127.0.0.1', port: PORT, path: urlPath, method, headers: h }, res => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => { let p; try { p = JSON.parse(raw); } catch (e) { p = raw; } resolve({ status: res.statusCode, body: p, headers: res.headers }); });
    });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function waitForServer(ms) { const dl = Date.now() + (ms || 10000); const a = () => req('GET', '/api/session/__ping__').catch(e => { if (Date.now() > dl) throw e; return sleep(150).then(a); }); return a(); }
var allChecks = [];
function check(label, ok) { allChecks.push(!!ok); console.log(label + ':', !!ok); }
const reg = (email, password) => ({ email, password, nomeCompleto: 'Dr Teste', crm: 'CRM-1', telefone: '11999999999' });
(async () => {
  try {
    await waitForServer();
    console.log('--- senha: mínimo e lista de senhas comuns ---');
    check('9 caracteres => 400', (await req('POST', '/api/register', reg('drvitorfrauches@gmail.com', 'Abcdefgh1'))).status === 400);
    check('senha comum (1234567890) => 400', (await req('POST', '/api/register', reg('drvitorfrauches@gmail.com', '1234567890'))).status === 400);
    check('senha comum com caixa alta (PASSWORD1) => 400', (await req('POST', '/api/register', reg('drvitorfrauches@gmail.com', 'PASSWORD12'))).status === 400);
    check('igual ao e-mail (drvitor) => 400', (await req('POST', '/api/register', reg('drvitor@exemplo.com', 'drvitor'))).status === 400);
    const ok = await req('POST', '/api/register', reg('drvitorfrauches@gmail.com', 'SenhaForte123'));
    check('10+ caracteres e fora da lista => cadastra', ok.status === 200);
    const cookieA = (ok.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

    console.log('--- id da cirurgia: 128 bits ---');
    const c = await req('POST', '/api/session', { codigo: 'SEC-0001', mode: 'completo' }, { Cookie: cookieA });
    check('id tem 32 caracteres hex (16 bytes)', /^[a-f0-9]{32}$/.test(c.body.id));

    console.log('--- cookie e HSTS conforme o protocolo ---');
    const httpLogin = await req('POST', '/api/login', { email: 'drvitorfrauches@gmail.com', password: 'SenhaForte123' });
    const cookieHttp = (httpLogin.headers['set-cookie'] || []).join(';');
    check('rede local (http) => cookie sem Secure', cookieHttp.indexOf('fue_auth=') !== -1 && cookieHttp.indexOf('Secure') === -1);
    check('rede local (http) => sem HSTS', !httpLogin.headers['strict-transport-security']);
    const httpsLogin = await req('POST', '/api/login', { email: 'drvitorfrauches@gmail.com', password: 'SenhaForte123' }, { 'X-Forwarded-Proto': 'https' });
    const cookieHttps = (httpsLogin.headers['set-cookie'] || []).join(';');
    check('via HTTPS (proxy) => cookie com Secure', cookieHttps.indexOf('Secure') !== -1);
    check('via HTTPS (proxy) => HSTS presente', !!httpsLogin.headers['strict-transport-security']);

    const done = allChecks.every(v => v);
    console.log(done ? '\nTODOS OS TESTES PASSARAM' : '\nFALHA: verificar acima');
    if (!done) { console.log(serverOut.slice(-1500)); process.exitCode = 1; }
  } catch (e) { console.log('ERRO INESPERADO:', e, serverOut); process.exitCode = 1; } finally { child.kill(); }
})();
