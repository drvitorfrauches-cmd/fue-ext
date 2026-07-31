// Confere que /api/register agora exige um convite válido — exceto pro
// e-mail do Dr. Vitor (ADMIN_EMAIL), que continua podendo se cadastrar
// direto (bootstrap: precisa existir antes de qualquer convite poder ser
// gerado). Ainda não testa os endpoints de gerar/listar convite (isso é a
// Tarefa 3) — aqui só confere a exigência em si, usando um token seedado
// direto no arquivo de índice. Como o servidor só lê data/index.json no
// boot (não fica observando o arquivo), o convite seedado só é visto por
// um SEGUNDO boot do servidor no mesmo DATA_DIR — daí este teste derruba
// o primeiro processo, seed o token no disco, e sobe um segundo processo.
const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');
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
// Mesmo algoritmo de hashToken() do server.js (sha256 hex) — duplicado aqui
// só pra poder seedar um convite válido direto no arquivo, sem depender do
// endpoint de gerar convite (que é assunto da Tarefa 3).
function hashTokenLike(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

var allChecks = [];
function check(label, ok) { allChecks.push(ok); console.log(label + ':', ok); }

(async () => {
  let child = null;
  let out = '';
  try {
    console.log('--- /api/register agora exige convite (exceto pro e-mail do Dr. Vitor) ---');
    const DIR = '/tmp/fuetest/datatest_register_invite';
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });

    const PORT1 = 4806;
    const env1 = Object.assign({}, process.env, { DATA_DIR: DIR, PORT: String(PORT1), SMTP_ENABLED: 'false' });
    child = spawn('node', [path.join(__dirname, 'server.js')], { env: env1, cwd: __dirname });
    child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
    await waitForServer(PORT1, 10000);

    console.log('--- Cadastro do Dr. Vitor (ADMIN_EMAIL) funciona SEM convite ---');
    const regAdmin = await req(PORT1, 'POST', '/api/register', { nomeCompleto: 'Dr Vitor', crm: 'CRM-V', email: 'drvitorfrauches@gmail.com', telefone: '1', password: 'senha123' });
    check('status 200', regAdmin.status === 200);
    check('isAdmin true', regAdmin.body.user && regAdmin.body.user.isAdmin === true);

    console.log();
    console.log('--- Cadastro de outro médico SEM inviteToken é recusado ---');
    const regNoToken = await req(PORT1, 'POST', '/api/register', { nomeCompleto: 'Dr Outro', crm: 'CRM-O', email: 'outro1@teste.com', telefone: '1', password: 'senha123' });
    check('status 400', regNoToken.status === 400);

    console.log();
    console.log('--- Cadastro com inviteToken INVENTADO (não existe) é recusado ---');
    const regBadToken = await req(PORT1, 'POST', '/api/register', { nomeCompleto: 'Dr Outro', crm: 'CRM-O', email: 'outro2@teste.com', telefone: '1', password: 'senha123', inviteToken: 'tokenquenaoexiste' });
    check('status 400', regBadToken.status === 400);

    // O servidor só lê data/index.json no boot — pra seedar um convite
    // válido e o processo em execução realmente enxergar, precisa derrubar
    // este processo, escrever o arquivo, e subir um segundo processo no
    // mesmo DATA_DIR (senão o próximo saveIndex() do processo 1, que ainda
    // tem o db antigo em memória, sobrescreveria nosso seed).
    child.kill();
    await sleep(300);

    const rawToken = 'convitedetestevalido123';
    const idxPath = path.join(DIR, 'data', 'index.json');
    const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    idx.inviteTokens = idx.inviteTokens || {};
    idx.inviteTokens[hashTokenLike(rawToken)] = { createdAt: Date.now(), expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, createdBy: regAdmin.body.user.id, usedAt: null };
    fs.writeFileSync(idxPath, JSON.stringify(idx));

    const PORT2 = 4816;
    const env2 = Object.assign({}, process.env, { DATA_DIR: DIR, PORT: String(PORT2), SMTP_ENABLED: 'false' });
    child = spawn('node', [path.join(__dirname, 'server.js')], { env: env2, cwd: __dirname });
    child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
    await waitForServer(PORT2, 10000);

    console.log();
    console.log('--- Cadastro com inviteToken VÁLIDO (seedado direto no índice, servidor reiniciado) funciona ---');
    const regGoodToken = await req(PORT2, 'POST', '/api/register', { nomeCompleto: 'Dr Outro', crm: 'CRM-O', email: 'outro3@teste.com', telefone: '1', password: 'senha123', inviteToken: rawToken });
    check('status 200', regGoodToken.status === 200);
    check('isAdmin false (não é o e-mail do Dr. Vitor)', regGoodToken.body.user && regGoodToken.body.user.isAdmin === false);

    console.log();
    console.log('--- Reusar o MESMO token uma segunda vez é recusado (uso único) ---');
    const regReuse = await req(PORT2, 'POST', '/api/register', { nomeCompleto: 'Dr Quarto', crm: 'CRM-Q', email: 'outro4@teste.com', telefone: '1', password: 'senha123', inviteToken: rawToken });
    check('status 400', regReuse.status === 400);

    console.log();
    console.log('--- Token foi marcado como usado no arquivo ---');
    const idxDepois = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    check('usedAt preenchido', idxDepois.inviteTokens[hashTokenLike(rawToken)].usedAt !== null);

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
