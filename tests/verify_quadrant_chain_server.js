// Confere o servidor pra "Contagem em cadeia": finalizar um quadrante trava ele e
// liga o PRÓXIMO (ordem padrão occipital_dir -> occipital_esq -> temporal_esq ->
// temporal_dir) automaticamente; travar bloqueia /adjust nesse quadrante; reabrir
// libera de novo; ligação manual (/quadrant-link) funciona e recusa ciclos.
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp/fuetest/datatest_chain';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const PORT = 4773;
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

    const create = await req('POST', '/api/session', { codigo: 'PAC-CADEIA', mode: 'completo' }, cookie);
    const id = create.body.id;

    console.log('--- Estado inicial: nenhum quadrante travado, nenhum link ---');
    console.log('occipital_dir não travado:', create.body.quadrants.occipital_dir.locked === false);
    console.log('occipital_dir sem carryFromId:', create.body.quadrants.occipital_dir.carryFromId === null);

    console.log();
    console.log('--- Conta 130 em f1 no occipital_dir, depois finaliza o quadrante ---');
    await req('POST', `/api/session/${id}/adjust`, { quadrant: 'occipital_dir', category: 'f1', delta: 130 }, cookie);
    const finish1 = await req('POST', `/api/session/${id}/quadrant-finish`, { quadrant: 'occipital_dir' }, cookie);
    console.log('occipital_dir agora travado:', finish1.body.quadrants.occipital_dir.locked === true);
    console.log('occipital_esq foi auto-ligado a occipital_dir:', finish1.body.quadrants.occipital_esq.carryFromId === 'occipital_dir');
    console.log('temporal_esq e temporal_dir NÃO foram tocados ainda:', finish1.body.quadrants.temporal_esq.carryFromId === null && finish1.body.quadrants.temporal_dir.carryFromId === null);

    console.log();
    console.log('--- Quadrante travado recusa /adjust (409) ---');
    const blocked = await req('POST', `/api/session/${id}/adjust`, { quadrant: 'occipital_dir', category: 'f1', delta: 1 }, cookie);
    console.log('status 409:', blocked.status === 409);
    console.log('erro é "quadrante travado":', typeof blocked.body.error === 'string' && blocked.body.error.length > 0);

    console.log();
    console.log('--- Reabrir o quadrante libera /adjust de novo ---');
    await req('POST', `/api/session/${id}/quadrant-reopen`, { quadrant: 'occipital_dir' }, cookie);
    const afterReopen = await req('POST', `/api/session/${id}/adjust`, { quadrant: 'occipital_dir', category: 'f1', delta: 5 }, cookie);
    console.log('status 200 depois de reabrir:', afterReopen.status === 200);
    console.log('occipital_dir.counts.f1 agora 135:', afterReopen.body.quadrants.occipital_dir.counts.f1 === 135);
    console.log('occipital_dir não está mais travado:', afterReopen.body.quadrants.occipital_dir.locked === false);

    console.log();
    console.log('--- Finaliza de novo e segue a cadeia até o fim (occipital_esq -> temporal_esq -> temporal_dir) ---');
    await req('POST', `/api/session/${id}/quadrant-finish`, { quadrant: 'occipital_dir' }, cookie);
    await req('POST', `/api/session/${id}/adjust`, { quadrant: 'occipital_esq', category: 'f1', delta: 20 }, cookie);
    const finish2 = await req('POST', `/api/session/${id}/quadrant-finish`, { quadrant: 'occipital_esq' }, cookie);
    console.log('temporal_esq auto-ligado a occipital_esq:', finish2.body.quadrants.temporal_esq.carryFromId === 'occipital_esq');

    console.log();
    console.log('--- Ligação MANUAL (fora do padrão): liga temporal_dir a occipital_dir direto ---');
    const link1 = await req('POST', `/api/session/${id}/quadrant-link`, { quadrant: 'temporal_dir', carryFromId: 'occipital_dir' }, cookie);
    console.log('status 200:', link1.status === 200);
    console.log('temporal_dir.carryFromId agora occipital_dir:', link1.body.quadrants.temporal_dir.carryFromId === 'occipital_dir');

    console.log();
    console.log('--- Ligação que criaria CICLO é recusada (dois quadrantes DESTRAVADOS: liga temporal_dir -> temporal_esq, depois tenta temporal_esq -> temporal_dir) ---');
    const setupLink = await req('POST', `/api/session/${id}/quadrant-link`, { quadrant: 'temporal_dir', carryFromId: 'temporal_esq' }, cookie);
    console.log('link de preparo funcionou (temporal_dir -> temporal_esq):', setupLink.body.quadrants.temporal_dir.carryFromId === 'temporal_esq');
    const cycleAttempt = await req('POST', `/api/session/${id}/quadrant-link`, { quadrant: 'temporal_esq', carryFromId: 'temporal_dir' }, cookie);
    console.log('status 400 (cria ciclo temporal_esq -> temporal_dir -> temporal_esq):', cycleAttempt.status === 400);

    console.log();
    console.log('--- Ligar um quadrante nele mesmo é recusado ---');
    const selfLink = await req('POST', `/api/session/${id}/quadrant-link`, { quadrant: 'temporal_dir', carryFromId: 'temporal_dir' }, cookie);
    console.log('status 400:', selfLink.status === 400);

    console.log();
    console.log('--- Desligar manualmente (carryFromId null) funciona ---');
    const unlink = await req('POST', `/api/session/${id}/quadrant-link`, { quadrant: 'temporal_dir', carryFromId: null }, cookie);
    console.log('temporal_dir.carryFromId volta a null:', unlink.body.quadrants.temporal_dir.carryFromId === null);

    console.log();
    console.log('--- Não dá pra religar um quadrante TRAVADO ---');
    await req('POST', `/api/session/${id}/quadrant-finish`, { quadrant: 'temporal_esq' }, cookie);
    const lockedLinkAttempt = await req('POST', `/api/session/${id}/quadrant-link`, { quadrant: 'temporal_esq', carryFromId: 'occipital_dir' }, cookie);
    console.log('status 409:', lockedLinkAttempt.status === 409);

    console.log();
    console.log('--- Quadrante inválido é recusado nos três endpoints novos ---');
    const badFinish = await req('POST', `/api/session/${id}/quadrant-finish`, { quadrant: 'inexistente' }, cookie);
    const badReopen = await req('POST', `/api/session/${id}/quadrant-reopen`, { quadrant: 'inexistente' }, cookie);
    const badLink = await req('POST', `/api/session/${id}/quadrant-link`, { quadrant: 'inexistente', carryFromId: 'occipital_dir' }, cookie);
    console.log('finish 400:', badFinish.status === 400);
    console.log('reopen 400:', badReopen.status === 400);
    console.log('link 400:', badLink.status === 400);

    console.log('\nOK');
  } catch (err) {
    console.log('ERRO INESPERADO:', err, serverOut);
    process.exitCode = 1;
  } finally {
    child.kill();
  }
})();
