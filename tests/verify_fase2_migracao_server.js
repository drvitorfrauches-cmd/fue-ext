// Confere a migração automática do data.json único pro formato dividido por
// médico: cenário feliz (números batem, arquivo antigo vira .bak, arquivos
// novos corretos) e cenário abortado (uma divergência forçada não pode
// resultar em perda de dado nem em servidor quebrado).
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

function seedOldFormatData(dataDir, users, sessions) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'data.json'), JSON.stringify({ users, sessions, authTokens: {}, resetTokens: {} }, null, 2));
}

(async () => {
  let child1 = null, child2 = null;
  try {
    console.log('--- Cenário feliz: data.json antigo com 2 médicos + 1 cirurgia órfã migra corretamente ---');
    const DIR1 = '/tmp/fuetest/datatest_fase2_ok';
    fs.rmSync(DIR1, { recursive: true, force: true });
    const userA = { id: 'medA', nomeCompleto: 'Dra. A', crm: 'CRM-A', email: 'a@teste.com', telefone: '1', passwordHash: 'x', createdAt: Date.now(), branding: { logoFilename: null, theme: 'padrao', darkMode: false, language: 'pt' } };
    const userB = { id: 'medB', nomeCompleto: 'Dr. B', crm: 'CRM-B', email: 'b@teste.com', telefone: '1', passwordHash: 'x', createdAt: Date.now(), branding: { logoFilename: null, theme: 'padrao', darkMode: false, language: 'pt' } };
    const sessions = {
      s1: { id: 's1', codigo: 'PAC-A1', ownerId: 'medA', status: 'andamento', mode: 'completo', quadrants: {}, patientInfo: {}, preincCounts: {}, preincDist: {}, photos: { marcacao: [], posop: [] }, timer: {}, preincTimer: {}, createdAt: 1, updatedAt: 1 },
      s2: { id: 's2', codigo: 'PAC-B1', ownerId: 'medB', status: 'andamento', mode: 'completo', quadrants: {}, patientInfo: {}, preincCounts: {}, preincDist: {}, photos: { marcacao: [], posop: [] }, timer: {}, preincTimer: {}, createdAt: 1, updatedAt: 1 },
      s3: { id: 's3', codigo: 'PAC-ORFA', ownerId: null, status: 'andamento', mode: 'completo', quadrants: {}, patientInfo: {}, preincCounts: {}, preincDist: {}, photos: { marcacao: [], posop: [] }, timer: {}, preincTimer: {}, createdAt: 1, updatedAt: 1 }
    };
    seedOldFormatData(DIR1, { medA: userA, medB: userB }, sessions);

    const PORT1 = 4801;
    const env1 = Object.assign({}, process.env, { DATA_DIR: DIR1, PORT: String(PORT1), SMTP_ENABLED: 'false' });
    child1 = spawn('node', [path.join(__dirname, 'server.js')], { env: env1, cwd: __dirname });
    let out1 = ''; child1.stdout.on('data', d => out1 += d); child1.stderr.on('data', d => out1 += d);
    await waitForServer(PORT1, 10000);

    console.log('data.json antigo foi renomeado (não existe mais com esse nome):', !fs.existsSync(path.join(DIR1, 'data.json')));
    const bakFiles = fs.readdirSync(DIR1).filter(f => f.startsWith('data.json.bak-migrado-'));
    console.log('existe backup data.json.bak-migrado-*:', bakFiles.length === 1);
    console.log('data/index.json existe:', fs.existsSync(path.join(DIR1, 'data', 'index.json')));
    const idx = JSON.parse(fs.readFileSync(path.join(DIR1, 'data', 'index.json'), 'utf8'));
    console.log('index.json tem os 2 médicos:', Object.keys(idx.users).length === 2);
    console.log('data/doctors/medA.json existe e tem só a sessão s1:', (() => {
      const d = JSON.parse(fs.readFileSync(path.join(DIR1, 'data', 'doctors', 'medA.json'), 'utf8'));
      return Object.keys(d.sessions).length === 1 && !!d.sessions.s1;
    })());
    console.log('data/doctors/medB.json existe e tem só a sessão s2:', (() => {
      const d = JSON.parse(fs.readFileSync(path.join(DIR1, 'data', 'doctors', 'medB.json'), 'utf8'));
      return Object.keys(d.sessions).length === 1 && !!d.sessions.s2;
    })());
    console.log('data/orfaos.json tem a sessão s3:', (() => {
      const d = JSON.parse(fs.readFileSync(path.join(DIR1, 'data', 'orfaos.json'), 'utf8'));
      return Object.keys(d.sessions).length === 1 && !!d.sessions.s3;
    })());

    console.log('--- Servidor continua funcionando normalmente depois da migração (login + GET sessão) ---');
    const login1 = await req(PORT1, 'POST', '/api/login', { email: 'a@teste.com', password: 'qualquer' });
    // senha fake não bate (hash real não foi gerado no seed) — só confirmamos que o endpoint responde coerente, não 500
    console.log('login não derruba o servidor (responde 401, não 500):', login1.status === 401);
    child1.kill();

    console.log();
    console.log('--- Cenário abortado: TEST_BREAK_MIGRATION força divergência, migração deve abortar sem perder o data.json antigo ---');
    const DIR2 = '/tmp/fuetest/datatest_fase2_abort';
    fs.rmSync(DIR2, { recursive: true, force: true });
    seedOldFormatData(DIR2, { medA: userA }, { s1: sessions.s1 });
    const PORT2 = 4802;
    const env2 = Object.assign({}, process.env, { DATA_DIR: DIR2, PORT: String(PORT2), SMTP_ENABLED: 'false', TEST_BREAK_MIGRATION: 'true' });
    child2 = spawn('node', [path.join(__dirname, 'server.js')], { env: env2, cwd: __dirname });
    let out2 = ''; child2.stdout.on('data', d => out2 += d); child2.stderr.on('data', d => out2 += d);
    await waitForServer(PORT2, 10000);

    console.log('data.json antigo AINDA existe (migração abortada, nada foi renomeado):', fs.existsSync(path.join(DIR2, 'data.json')));
    console.log('data/index.json NÃO existe (migração não foi aceita):', !fs.existsSync(path.join(DIR2, 'data', 'index.json')));
    console.log('log do servidor menciona divergência/abortando:', /diverg|abortando/i.test(out2));
    const getAfterAbort = await req(PORT2, 'GET', '/api/session/s1', null, null);
    console.log('servidor continua respondendo normalmente mesmo com migração abortada (não é 500):', getAfterAbort.status !== 500);

    console.log('\nOK');
  } catch (err) {
    console.log('ERRO INESPERADO:', err);
    process.exitCode = 1;
  } finally {
    if (child1) child1.kill();
    if (child2) child2.kill();
  }
})();
