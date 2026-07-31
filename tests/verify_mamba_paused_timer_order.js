// Reproduz, via HTTP real contra o server.js, o bug relatado em cirurgia ao vivo:
// occipital_dir=919, occipital_esq=2190 (cronômetro RODANDO -> delta certo, 1271),
// depois o cronômetro é PAUSADO e o médico preenche temporal_esq=2400 e
// temporal_dir=2700 nessa ordem. Antes da correção, os dois recebiam o mesmo
// mambaMarkTimeMs (congelado pela pausa) e o sistema, por causa da comparação
// estrita "<", caía sempre no occipital_dir (o primeiro já marcado) em vez do
// quadrante realmente anterior -- dando 1481 e 1781 em vez dos esperados 210 e 300.
// Este teste teria FALHADO antes da correção (mambaMarkedAtMs) e deve passar agora.
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp/fuetest/datatest_mamba_pause';
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const PORT = 4771;
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

    // Cadastro + login
    const email = 'drvitorfrauches@gmail.com';
    const reg = await req('POST', '/api/register', { email, password: 'SenhaForte123', nomeCompleto: 'Dr Teste', crm: 'CRM-1234', telefone: '11999999999' });
    if (reg.status !== 200) { console.log('FALHOU registro:', reg.status, reg.body); process.exitCode = 1; return; }
    const cookie = extractCookie(reg.headers);

    // Cria cirurgia
    const create = await req('POST', '/api/session', { codigo: 'PAC-PAUSE', mode: 'completo' }, cookie);
    if (create.status !== 200) { console.log('FALHOU criar cirurgia:', create.status, create.body); process.exitCode = 1; return; }
    const id = create.body.id;

    // Inicia o cronômetro de extração
    await req('POST', `/api/session/${id}/timer`, { action: 'start' }, cookie);
    await sleep(120);

    // occipital_dir = 919 (cronômetro rodando)
    await req('POST', `/api/session/${id}/mamba`, { quadrant: 'occipital_dir', value: 919 }, cookie);
    await sleep(120);

    // occipital_esq = 2190 (cronômetro ainda rodando) -> delta esperado 2190-919=1271
    await req('POST', `/api/session/${id}/mamba`, { quadrant: 'occipital_esq', value: 2190 }, cookie);
    await sleep(120);

    // PAUSA o cronômetro de extração (o cenário real: pausou pra trocar de campo/descansar)
    await req('POST', `/api/session/${id}/timer`, { action: 'pause' }, cookie);
    await sleep(50);

    // temporal_esq = 2400, preenchido DURANTE a pausa -> delta esperado 2400-2190=210
    let r1 = await req('POST', `/api/session/${id}/mamba`, { quadrant: 'temporal_esq', value: 2400 }, cookie);
    await sleep(50);

    // temporal_dir = 2700, também DURANTE a mesma pausa -> delta esperado 2700-2400=300
    let r2 = await req('POST', `/api/session/${id}/mamba`, { quadrant: 'temporal_dir', value: 2700 }, cookie);

    const s = r2.body;
    const od = s.quadrants.occipital_dir, oe = s.quadrants.occipital_esq;
    const te = s.quadrants.temporal_esq, td = s.quadrants.temporal_dir;

    console.log('--- Reprodução do bug relatado em cirurgia real (cronômetro pausado entre marcações) ---');
    console.log('occipital_dir.mambaCumulativo (919):', od.mambaCumulativo === 919);
    console.log('occipital_esq.mambaCumulativo (2190):', oe.mambaCumulativo === 2190);
    console.log('temporal_esq.mambaCumulativo (2400):', te.mambaCumulativo === 2400);
    console.log('temporal_dir.mambaCumulativo (2700):', td.mambaCumulativo === 2700);

    console.log();
    console.log('mambaMarkedAtMs presente e crescente na ordem real de preenchimento (od < oe < te <= td):',
      od.mambaMarkedAtMs !== null && oe.mambaMarkedAtMs !== null && te.mambaMarkedAtMs !== null && td.mambaMarkedAtMs !== null &&
      od.mambaMarkedAtMs < oe.mambaMarkedAtMs && oe.mambaMarkedAtMs < te.mambaMarkedAtMs && te.mambaMarkedAtMs <= td.mambaMarkedAtMs);

    console.log('temporal_esq e temporal_dir têm o MESMO mambaMarkTimeMs (cronômetro congelado pela pausa, como no caso real):',
      te.mambaMarkTimeMs === td.mambaMarkTimeMs);

    // Recalcula os deltas do jeito que a aba de Extração/Resumo Final calcula
    // (mesma lógica de findPrevMarkedQuadrant, agora baseada em mambaMarkedAtMs).
    const QUADRANTS = ['temporal_dir', 'temporal_esq', 'occipital_dir', 'occipital_esq'];
    function findPrev(quadId) {
      const current = s.quadrants[quadId];
      if (current.mambaMarkedAtMs == null) return null;
      let best = null;
      QUADRANTS.forEach(qid => {
        if (qid === quadId) return;
        const qd = s.quadrants[qid];
        if (qd.mambaMarkedAtMs == null) return;
        if (qd.mambaMarkedAtMs < current.mambaMarkedAtMs) {
          if (!best || qd.mambaMarkedAtMs > best.mambaMarkedAtMs) best = qd;
        }
      });
      return best;
    }
    function deltaFor(quadId) {
      const prev = findPrev(quadId);
      const prevVal = prev ? Number(prev.mambaCumulativo || 0) : 0;
      return Number(s.quadrants[quadId].mambaCumulativo) - prevVal;
    }

    console.log();
    console.log('delta occipital_esq (esperado 1271):', deltaFor('occipital_esq'), deltaFor('occipital_esq') === 1271);
    console.log('delta temporal_esq (esperado 210, ANTES da correção dava 1481):', deltaFor('temporal_esq'), deltaFor('temporal_esq') === 210);
    console.log('delta temporal_dir (esperado 300, ANTES da correção dava 1781):', deltaFor('temporal_dir'), deltaFor('temporal_dir') === 300);

    const allPass = od.mambaCumulativo === 919 && oe.mambaCumulativo === 2190 && te.mambaCumulativo === 2400 &&
      td.mambaCumulativo === 2700 && deltaFor('occipital_esq') === 1271 && deltaFor('temporal_esq') === 210 && deltaFor('temporal_dir') === 300;
    console.log();
    console.log(allPass ? 'TODOS OS TESTES PASSARAM' : 'FALHA: verificar acima');
    if (!allPass) process.exitCode = 1;
  } catch (err) {
    console.log('ERRO INESPERADO:', err, serverOut);
    process.exitCode = 1;
  } finally {
    child.kill();
  }
})();
