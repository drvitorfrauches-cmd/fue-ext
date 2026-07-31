// Confere o comportamento do servidor pra dados demográficos do paciente
// (patientInfo): criação sem dados (tudo null por padrão), criação já com dados
// (incluindo validação de valores fora do esperado, que devem ser ignorados sem
// derrubar o resto da cirurgia), atualização parcial pela aba Paciente depois
// (só o campo enviado muda, resto fica intocado), e limpar um campo mandando
// string vazia.
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp/fuetest/datatest_patient_info';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const PORT = 4772;
const env = Object.assign({}, process.env, { DATA_DIR, PORT: String(PORT), SMTP_ENABLED: 'false' });
const child = spawn('node', [path.join(__dirname, 'server.js')], { env, cwd: __dirname });
let serverOut = '';
child.stdout.on('data', d => serverOut += d);
child.stderr.on('data', d => serverOut += d);

function req(method, urlPath, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1', port: PORT, path: urlPath, method,
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        data ? { 'Content-Length': Buffer.byteLength(data) } : {},
        cookie ? { Cookie: cookie } : {}
      )
    };
    const r = http.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
// Espera o servidor de verdade aceitar conexão, em vez de um sleep fixo — em
// runners de CI mais lentos/variáveis (GitHub Actions), um sleep fixo curto
// demais dava ECONNREFUSED mesmo com o servidor subindo normal, só mais devagar.
function waitForServer(timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 10000);
  function attempt() {
    return req('GET', '/api/session/__ping__', null, null)
      .catch(err => {
        if (Date.now() > deadline) throw new Error('Servidor não respondeu a tempo (' + err.message + ')');
        return sleep(150).then(attempt);
      });
  }
  return attempt();
}
function extractCookie(headers) {
  const sc = headers['set-cookie'];
  if (!sc) return null;
  return sc.map(c => c.split(';')[0]).join('; ');
}

(async () => {
  try {
    await waitForServer(10000);

    const email = 'drvitorfrauches@gmail.com';
    const reg = await req('POST', '/api/register', { email, password: 'SenhaForte123', nomeCompleto: 'Dr Teste', crm: 'CRM-1234', telefone: '11999999999' });
    if (reg.status !== 200) { console.log('FALHOU registro:', reg.status, reg.body); process.exitCode = 1; return; }
    const cookie = extractCookie(reg.headers);

    console.log('--- Criação SEM patientInfo: tudo fica null por padrão ---');
    const c1 = await req('POST', '/api/session', { codigo: 'PAC-SEMDADOS', mode: 'completo' }, cookie);
    const pi1 = c1.body.patientInfo;
    console.log('idade null:', pi1.idade === null);
    console.log('alturaCm null:', pi1.alturaCm === null);
    console.log('pesoKg null:', pi1.pesoKg === null);
    console.log('cabeloEspessura null:', pi1.cabeloEspessura === null);
    console.log('cabeloTextura null:', pi1.cabeloTextura === null);
    console.log('raspagem null:', pi1.raspagem === null);

    console.log();
    console.log('--- Criação JÁ COM patientInfo válido (tela de cadastro) ---');
    const c2 = await req('POST', '/api/session', {
      codigo: 'PAC-COMDADOS', mode: 'completo',
      patientInfo: { idade: 52, alturaCm: 178, pesoKg: 82.5, cabeloEspessura: 'grosso', cabeloTextura: 'crespo', raspagem: 'sim' }
    }, cookie);
    const id2 = c2.body.id;
    const pi2 = c2.body.patientInfo;
    console.log('idade 52:', pi2.idade === 52);
    console.log('alturaCm 178:', pi2.alturaCm === 178);
    console.log('pesoKg 82.5:', pi2.pesoKg === 82.5);
    console.log('cabeloEspessura grosso:', pi2.cabeloEspessura === 'grosso');
    console.log('cabeloTextura crespo:', pi2.cabeloTextura === 'crespo');
    console.log('raspagem sim:', pi2.raspagem === 'sim');

    console.log();
    console.log('--- Criação com valores INVÁLIDOS: ignorados, sem derrubar a criação ---');
    const c3 = await req('POST', '/api/session', {
      codigo: 'PAC-INVALIDO', mode: 'completo',
      patientInfo: { idade: 999, alturaCm: -5, pesoKg: 'abc', cabeloEspessura: 'afro', cabeloTextura: 'crespo', raspagem: 'talvez' }
    }, cookie);
    console.log('criação não falhou (status 200):', c3.status === 200);
    const pi3 = c3.body.patientInfo;
    console.log('idade fora do range (999) ignorada, fica null:', pi3.idade === null);
    console.log('alturaCm negativa ignorada, fica null:', pi3.alturaCm === null);
    console.log('pesoKg não-numérico ignorado, fica null:', pi3.pesoKg === null);
    console.log('cabeloEspessura inválido ("afro") ignorado, fica null:', pi3.cabeloEspessura === null);
    console.log('cabeloTextura válida (crespo) aplicada normalmente:', pi3.cabeloTextura === 'crespo');
    console.log('raspagem inválida ("talvez") ignorada, fica null:', pi3.raspagem === null);

    console.log();
    console.log('--- Atualização parcial pela aba Paciente (só idade, resto intocado) ---');
    const u1 = await req('POST', `/api/session/${id2}/patient-info`, { idade: 53 }, cookie);
    const piU1 = u1.body.patientInfo;
    console.log('idade atualizada pra 53:', piU1.idade === 53);
    console.log('alturaCm continua 178 (não foi tocado):', piU1.alturaCm === 178);
    console.log('cabeloTextura continua crespo (não foi tocado):', piU1.cabeloTextura === 'crespo');

    console.log();
    console.log('--- Limpar um campo mandando string vazia ---');
    const u2 = await req('POST', `/api/session/${id2}/patient-info`, { cabeloTextura: '' }, cookie);
    const piU2 = u2.body.patientInfo;
    console.log('cabeloTextura limpa (volta a null):', piU2.cabeloTextura === null);
    console.log('idade continua 53 (não foi tocado):', piU2.idade === 53);

    console.log();
    console.log('--- Persistência: GET da cirurgia reflete as mudanças ---');
    const getS = await req('GET', `/api/session/${id2}`, null, cookie);
    console.log('GET reflete idade 53:', getS.body.patientInfo.idade === 53);
    console.log('GET reflete cabeloTextura null:', getS.body.patientInfo.cabeloTextura === null);
    console.log('GET reflete raspagem sim (nunca tocado, continua):', getS.body.patientInfo.raspagem === 'sim');

    const allLines = [];
    console.log('\nOK');
  } catch (err) {
    console.log('ERRO INESPERADO:', err, serverOut);
    process.exitCode = 1;
  } finally {
    child.kill();
  }
})();
