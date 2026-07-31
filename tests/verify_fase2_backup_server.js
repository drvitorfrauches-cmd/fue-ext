// Confere que "Baixar backup" continua funcionando depois da Fase 2, e que o
// conteúdo baixado bate 1:1 com o que está em data/doctors/<id>.json daquele
// médico (o efeito colateral positivo descrito na especificação).
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

(async () => {
  let child = null;
  try {
    console.log('--- Backup por médico continua correto depois da divisão ---');
    const DIR = '/tmp/fuetest/datatest_backup';
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });

    const PORT = 4804;
    const env = Object.assign({}, process.env, { DATA_DIR: DIR, PORT: String(PORT), SMTP_ENABLED: 'false' });
    child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
    let out = ''; child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
    await sleep(600);

    const reg = await req(PORT, 'POST', '/api/register', { nomeCompleto: 'Dra. Backup', crm: 'CRM-BK', email: 'backup@teste.com', telefone: '1', password: 'senha123' });
    const cookie = extractCookie(reg.headers);
    const userId = reg.body.user.id;
    console.log('médico cadastrado:', reg.status === 200);

    await req(PORT, 'POST', '/api/session', { codigo: 'PAC-1' }, cookie);
    await req(PORT, 'POST', '/api/session', { codigo: 'PAC-2' }, cookie);

    const backupRes = await req(PORT, 'GET', '/api/backup', null, cookie);
    console.log('endpoint de backup responde 200:', backupRes.status === 200);
    console.log('backup tem 2 cirurgias:', backupRes.body.cirurgias.length === 2);

    const docFile = path.join(DIR, 'data', 'doctors', userId + '.json');
    const docContent = JSON.parse(fs.readFileSync(docFile, 'utf8'));
    const docIds = Object.keys(docContent.sessions).sort();
    const backupIds = backupRes.body.cirurgias.map(function (s) { return s.id; }).sort();
    console.log('IDs do backup batem 1:1 com data/doctors/<id>.json:', JSON.stringify(docIds) === JSON.stringify(backupIds));

    console.log('\nOK');
  } catch (err) {
    console.log('ERRO INESPERADO:', err);
    process.exitCode = 1;
  } finally {
    if (child) child.kill();
  }
})();
