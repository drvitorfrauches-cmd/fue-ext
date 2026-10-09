// Renomear paciente: só o médico dono (logado). Auxiliar com link, outro médico e
// anônimo não conseguem; nome vazio é rejeitado; nome é cortado em 60 caracteres.
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const DATA_DIR = '/tmp/fuetest/datatest_rename';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
const PORT = 4783;
const env = Object.assign({}, process.env, { DATA_DIR, PORT: String(PORT), SMTP_ENABLED: 'false' });
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
    check('sessão criada', c.status === 200 && !!id);

    const anon = await req('POST', `/api/session/${id}/rename`, { codigo: 'HACK' });
    check('quem só tem o link (sem login) => 401', anon.status === 401);
    const other = await req('POST', `/api/session/${id}/rename`, { codigo: 'HACK' }, cookieB);
    check('outro médico logado => 403', other.status === 403);
    const g1 = await req('GET', `/api/session/${id}`);
    check('nome não mudou após tentativas indevidas', g1.body.codigo === 'JS-0001');

    const empty = await req('POST', `/api/session/${id}/rename`, { codigo: '   ' }, cookieA);
    check('nome vazio => 400', empty.status === 400);
    const missing = await req('POST', `/api/session/aaaaaa/rename`, { codigo: 'X' }, cookieA);
    check('cirurgia inexistente => 404', missing.status === 404);

    const ok = await req('POST', `/api/session/${id}/rename`, { codigo: '  Maria Silva  ' }, cookieA);
    check('dono renomeia => 200 e nome aparado', ok.status === 200 && ok.body.codigo === 'Maria Silva');
    const g2 = await req('GET', `/api/session/${id}`);
    check('persistiu (GET sem login vê o novo nome)', g2.body.codigo === 'Maria Silva');
    const lst = await req('GET', '/api/sessions', null, cookieA);
    const listed = Array.isArray(lst.body) ? lst.body : (lst.body.sessions || []);
    check('lista do médico mostra o novo nome', listed.some(x => x.codigo === 'Maria Silva'));

    const long = await req('POST', `/api/session/${id}/rename`, { codigo: 'x'.repeat(100) }, cookieA);
    check('nome cortado em 60 caracteres', long.body.codigo.length === 60);

    const done = allChecks.every(v => v);
    console.log(done ? '\nTODOS OS TESTES PASSARAM' : '\nFALHA: verificar acima');
    if (!done) process.exitCode = 1;
  } catch (e) { console.log('ERRO INESPERADO:', e, serverOut); process.exitCode = 1; } finally { child.kill(); }
})();
