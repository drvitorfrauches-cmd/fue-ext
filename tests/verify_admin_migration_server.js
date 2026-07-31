// Confere a migração do papel de admin: um usuário já cadastrado (seedado
// direto no índice, sem passar pelo /api/register) que não tem o campo
// isAdmin ganha isAdmin:true se o e-mail for o do Dr. Vitor (ADMIN_EMAIL) e
// isAdmin:false pra qualquer outro e-mail — sem precisar fazer login, só
// inspecionando o data/index.json depois do boot.
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

(async () => {
  let child = null;
  let out = '';
  try {
    console.log('--- Migração: isAdmin é preenchido pra usuários já cadastrados ---');
    const DIR = '/tmp/fuetest/datatest_admin_migration';
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(path.join(DIR, 'data', 'doctors'), { recursive: true });

    // Seed direto no índice — simula uma base de produção real, cadastrada
    // antes deste recurso existir (sem o campo isAdmin).
    const userAdmin = { id: 'medAdmin', nomeCompleto: 'Dr Vitor', crm: 'CRM-V', email: 'drvitorfrauches@gmail.com', telefone: '1', passwordHash: 'x', createdAt: Date.now(), branding: { logoFilename: null, theme: 'padrao', darkMode: false, language: 'pt' } };
    const userOutro = { id: 'medOutro', nomeCompleto: 'Dr Outro', crm: 'CRM-O', email: 'outro@teste.com', telefone: '1', passwordHash: 'x', createdAt: Date.now(), branding: { logoFilename: null, theme: 'padrao', darkMode: false, language: 'pt' } };
    fs.writeFileSync(path.join(DIR, 'data', 'index.json'), JSON.stringify({
      users: { medAdmin: userAdmin, medOutro: userOutro }, authTokens: {}, resetTokens: {}
    }));
    fs.writeFileSync(path.join(DIR, 'data', 'doctors', 'medAdmin.json'), JSON.stringify({ sessions: {} }));
    fs.writeFileSync(path.join(DIR, 'data', 'doctors', 'medOutro.json'), JSON.stringify({ sessions: {} }));
    fs.writeFileSync(path.join(DIR, 'data', 'orfaos.json'), JSON.stringify({ sessions: {} }));

    const PORT = 4805;
    const env = Object.assign({}, process.env, { DATA_DIR: DIR, PORT: String(PORT), SMTP_ENABLED: 'false' });
    child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
    child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
    await waitForServer(PORT, 10000);

    const idx = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'index.json'), 'utf8'));
    console.log('drvitorfrauches@gmail.com virou isAdmin:true:', idx.users.medAdmin.isAdmin === true);
    console.log('outro@teste.com ficou isAdmin:false:', idx.users.medOutro.isAdmin === false);
    console.log('db.inviteTokens nasce vazio ({}) no índice depois do boot:', JSON.stringify(idx.inviteTokens) === '{}');

    console.log('\nOK');
  } catch (err) {
    console.log('ERRO INESPERADO:', err, out);
    process.exitCode = 1;
  } finally {
    if (child) child.kill();
  }
})();
