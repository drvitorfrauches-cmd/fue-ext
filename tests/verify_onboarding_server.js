// Onboarding de médico novo: flag onboardingPending no cadastro por convite,
// admin não recebe, endpoint /api/onboarding/complete, migração de usuário antigo.
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp/fuetest/datatest_onboarding';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
const PORT = 4781;
const env = Object.assign({}, process.env, { DATA_DIR, PORT: String(PORT), SMTP_ENABLED: 'false' });
let child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
let serverOut = '';
child.stdout.on('data', d => serverOut += d);
child.stderr.on('data', d => serverOut += d);

function req(method, urlPath, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = { hostname: '127.0.0.1', port: PORT, path: urlPath, method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, data ? { 'Content-Length': Buffer.byteLength(data) } : {}, cookie ? { Cookie: cookie } : {}) };
    const r = http.request(options, res => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => { let p; try { p = JSON.parse(raw); } catch (e) { p = raw; } resolve({ status: res.statusCode, body: p, headers: res.headers }); });
    });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function waitForServer(ms) {
  const deadline = Date.now() + (ms || 10000);
  const attempt = () => req('GET', '/api/session/__ping__').catch(err => { if (Date.now() > deadline) throw err; return sleep(150).then(attempt); });
  return attempt();
}
const cookieOf = h => (h['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

var allChecks = [];
function check(label, ok) { allChecks.push(!!ok); console.log(label + ':', !!ok); }

(async () => {
  try {
    await waitForServer();
    const admin = await req('POST', '/api/register', { email: 'drvitorfrauches@gmail.com', password: 'SenhaForte123', nomeCompleto: 'Dr Admin', crm: 'CRM-1', telefone: '11999999999' });
    check('admin registrou (200)', admin.status === 200);
    check('admin NÃO tem onboardingPending', admin.body.user.onboardingPending === false);
    const adminCookie = cookieOf(admin.headers);

    const inv = await req('POST', '/api/admin/invites', {}, adminCookie);
    const url = inv.body.url || inv.body.link || '';
    const token = inv.body.token || (String(url).split('/').pop());
    check('convite gerado', inv.status === 200 && !!token);

    const doc = await req('POST', '/api/register', { email: 'novo@exemplo.com', password: 'SenhaForte123', nomeCompleto: 'Dra Nova', crm: 'CRM-2', telefone: '11888888888', inviteToken: token });
    check('médico por convite registrou (200)', doc.status === 200);
    check('médico por convite tem onboardingPending true', doc.body.user.onboardingPending === true);
    const docCookie = cookieOf(doc.headers);

    const me1 = await req('GET', '/api/me', null, docCookie);
    check('/api/me expõe onboardingPending true', me1.body.user.onboardingPending === true);

    const noAuth = await req('POST', '/api/onboarding/complete', {});
    check('complete sem login => 401', noAuth.status === 401);

    const done = await req('POST', '/api/onboarding/complete', {}, docCookie);
    check('complete => 200 e flag false', done.status === 200 && done.body.user.onboardingPending === false);
    const me2 = await req('GET', '/api/me', null, docCookie);
    check('/api/me depois do complete devolve flag desligada', me2.body.user.onboardingPending === false);

    // migração: usuário antigo sem o campo vira false
    child.kill(); await sleep(400);
    const idxPath = path.join(DATA_DIR, 'data', 'index.json');
    const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    Object.values(idx.users).forEach(u => { delete u.onboardingPending; });
    fs.writeFileSync(idxPath, JSON.stringify(idx));
    child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
    child.stdout.on('data', d => serverOut += d); child.stderr.on('data', d => serverOut += d);
    await waitForServer();
    const login = await req('POST', '/api/login', { email: 'novo@exemplo.com', password: 'SenhaForte123' });
    check('usuário antigo (sem campo) migra para false', login.body.user && login.body.user.onboardingPending === false);

    const ok = allChecks.every(v => v);
    console.log(ok ? '\nTODOS OS TESTES PASSARAM' : '\nFALHA: verificar acima');
    if (!ok) process.exitCode = 1;
  } catch (err) {
    console.log('ERRO INESPERADO:', err, serverOut); process.exitCode = 1;
  } finally { child.kill(); }
})();
