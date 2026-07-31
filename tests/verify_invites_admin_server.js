// Confere o ciclo de vida completo de um convite pelos endpoints reais:
// admin gera (POST), o link é válido (GET check), outro médico se cadastra
// com ele, o link vira inválido depois de usado, reusar falha, e a listagem
// do admin (GET) mostra o status certo. Também confere que um médico
// comum (não-admin) não consegue gerar nem listar convites (403).
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function req(port, method, urlPath, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1', port, path: urlPath, method,
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        data ? { 'Content-Length': Buffer.byteLength(data) } : {},
        cookie ? { Cookie: cookie } : {}
      )
    };
    const r = http.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { let parsed; try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; } resolve({ status: res.statusCode, body: parsed, headers: res.headers }); });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function extractCookie(headers) { const sc = headers['set-cookie']; if (!sc) return null; return sc.map(c => c.split(';')[0]).join('; '); }
function waitForServer(port, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 10000);
  function attempt() {
    return req(port, 'GET', '/api/session/__ping__', null, null)
      .catch(err => {
        if (Date.now() > deadline) throw new Error('Servidor não respondeu a tempo na porta ' + port + ' (' + err.message + ')');
        return sleep(150).then(attempt);
      });
  }
  return attempt();
}

var allChecks = [];
function check(label, ok) { allChecks.push(ok); console.log(label + ':', ok); }

(async () => {
  let child = null;
  let out = '';
  try {
    console.log('--- Ciclo de vida completo de um convite via endpoints reais ---');
    const DIR = '/tmp/fuetest/datatest_invites_admin';
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });

    const PORT = 4807;
    const env = Object.assign({}, process.env, { DATA_DIR: DIR, PORT: String(PORT), SMTP_ENABLED: 'false' });
    child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
    child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
    await waitForServer(PORT, 10000);

    const regAdmin = await req(PORT, 'POST', '/api/register', { nomeCompleto: 'Dr Vitor', crm: 'CRM-V', email: 'drvitorfrauches@gmail.com', telefone: '1', password: 'senha123' });
    const cookieAdmin = extractCookie(regAdmin.headers);
    check('admin cadastrado', regAdmin.status === 200 && regAdmin.body.user.isAdmin === true);

    console.log();
    console.log('--- Admin gera um convite ---');
    const gen = await req(PORT, 'POST', '/api/admin/invites', {}, cookieAdmin);
    check('status 200', gen.status === 200);
    check('token presente', typeof gen.body.token === 'string' && gen.body.token.length > 0);
    check('url contém /convite/', gen.body.url && gen.body.url.indexOf('/convite/' + gen.body.token) !== -1);
    check('expiresAt no futuro', gen.body.expiresAt > Date.now());

    console.log();
    console.log('--- Link recém-gerado é válido ---');
    const check1 = await req(PORT, 'GET', '/api/invites/' + gen.body.token + '/check');
    check('valid true', check1.body.valid === true);

    console.log();
    console.log('--- Cadastro de um segundo médico com esse token funciona ---');
    const regB = await req(PORT, 'POST', '/api/register', { nomeCompleto: 'Dr. B', crm: 'CRM-B', email: 'medB@teste.com', telefone: '1', password: 'senha123', inviteToken: gen.body.token });
    check('status 200', regB.status === 200);
    check('isAdmin false', regB.body.user.isAdmin === false);

    console.log();
    console.log('--- Link fica inválido depois de usado ---');
    const check2 = await req(PORT, 'GET', '/api/invites/' + gen.body.token + '/check');
    check('valid false', check2.body.valid === false);

    console.log();
    console.log('--- Reusar o token falha ---');
    const regReuse = await req(PORT, 'POST', '/api/register', { nomeCompleto: 'Dr. C', crm: 'CRM-C', email: 'medC@teste.com', telefone: '1', password: 'senha123', inviteToken: gen.body.token });
    check('status 400', regReuse.status === 400);

    console.log();
    console.log('--- Token que nunca existiu: check retorna valid:false, sem 500 ---');
    const checkFake = await req(PORT, 'GET', '/api/invites/0000000000000000000000/check');
    check('status 200', checkFake.status === 200);
    check('valid false', checkFake.body.valid === false);

    console.log();
    console.log('--- GET /api/admin/invites (admin) lista o convite gerado, com status "usado" ---');
    const list = await req(PORT, 'GET', '/api/admin/invites', null, cookieAdmin);
    check('status 200', list.status === 200);
    check('1 convite listado', list.body.invites.length === 1);
    check('status usado', list.body.invites[0].status === 'usado');

    console.log();
    console.log('--- Médico comum (não-admin) NÃO consegue gerar convite ---');
    const cookieB = extractCookie(regB.headers);
    const genForbidden = await req(PORT, 'POST', '/api/admin/invites', {}, cookieB);
    check('status 403', genForbidden.status === 403);

    console.log();
    console.log('--- Médico comum (não-admin) NÃO consegue listar convites ---');
    const listForbidden = await req(PORT, 'GET', '/api/admin/invites', null, cookieB);
    check('status 403', listForbidden.status === 403);

    console.log();
    console.log('--- Sem login nenhum, gerar convite dá 401 ---');
    const genNoAuth = await req(PORT, 'POST', '/api/admin/invites', {});
    check('status 401', genNoAuth.status === 401);

    var allPass = allChecks.every(function (v) { return v === true; });
    console.log();
    console.log(allPass ? 'TODOS OS TESTES PASSARAM' : 'FALHA: verificar acima');
    if (!allPass) process.exitCode = 1;
  } catch (err) {
    console.log('ERRO INESPERADO:', err, out);
    process.exitCode = 1;
  } finally {
    if (child) child.kill();
  }
})();
