// Confere o principal benefício da Fase 2: uma ação do médico A nunca escreve
// no arquivo do médico B. Cadastra dois médicos de verdade (via /api/register),
// cria uma cirurgia pro médico A e confirma que data/doctors/medB.json nem foi
// tocado (mtime + conteúdo idênticos antes/depois).
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function req(port, method, urlPath, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost', port, path: urlPath, method,
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
// Espera o servidor de verdade aceitar conexão, em vez de um sleep fixo — em
// runners de CI mais lentos/variáveis (GitHub Actions), um sleep fixo curto
// demais dava ECONNREFUSED mesmo com o servidor subindo normal, só mais devagar.
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
  try {
    console.log('--- Isolamento: ação do médico A não escreve no arquivo do médico B ---');
    const DIR = '/tmp/fuetest/datatest_isolamento';
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });

    const PORT = 4803;
    const env = Object.assign({}, process.env, { DATA_DIR: DIR, PORT: String(PORT), SMTP_ENABLED: 'false' });
    child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
    let out = ''; child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
    await waitForServer(PORT, 10000);

    const regA = await req(PORT, 'POST', '/api/register', { nomeCompleto: 'Dra. A', crm: 'CRM-A', email: 'medA@teste.com', telefone: '1', password: 'senha123' });
    console.log('médico A cadastrado:', regA.status === 200);
    const cookieA = extractCookie(regA.headers);

    const regB = await req(PORT, 'POST', '/api/register', { nomeCompleto: 'Dr. B', crm: 'CRM-B', email: 'medB@teste.com', telefone: '1', password: 'senha123' });
    console.log('médico B cadastrado:', regB.status === 200);

    // Médico B já precisa ter uma cirurgia própria pra ter um doctors/<id>.json
    // de verdade pra vigiar (senão não existe arquivo nenhum pra comparar).
    const cookieB = extractCookie(regB.headers);
    const sessionB = await req(PORT, 'POST', '/api/session', { codigo: 'PAC-B1' }, cookieB);
    console.log('cirurgia do médico B criada:', sessionB.status === 200);

    const idB = regB.body.user.id;
    const fileB = path.join(DIR, 'data', 'doctors', idB + '.json');
    console.log('data/doctors/<medB>.json existe antes da ação do médico A:', fs.existsSync(fileB));
    const beforeMtime = fs.statSync(fileB).mtimeMs;
    const beforeContent = fs.readFileSync(fileB, 'utf8');

    await sleep(20); // garante que um mtime novo, se acontecer, seria detectável

    const sessionA = await req(PORT, 'POST', '/api/session', { codigo: 'PAC-A1' }, cookieA);
    console.log('cirurgia do médico A criada:', sessionA.status === 200);

    const afterMtime = fs.statSync(fileB).mtimeMs;
    const afterContent = fs.readFileSync(fileB, 'utf8');
    console.log('arquivo do médico B NÃO mudou de mtime:', beforeMtime === afterMtime);
    console.log('arquivo do médico B NÃO mudou de conteúdo:', beforeContent === afterContent);

    const idA = regA.body.user.id;
    const fileA = path.join(DIR, 'data', 'doctors', idA + '.json');
    const contentA = JSON.parse(fs.readFileSync(fileA, 'utf8'));
    console.log('arquivo do médico A tem a cirurgia recém-criada:', Object.keys(contentA.sessions).length === 1);

    console.log('\nOK');
  } catch (err) {
    console.log('ERRO INESPERADO:', err);
    process.exitCode = 1;
  } finally {
    if (child) child.kill();
  }
})();
