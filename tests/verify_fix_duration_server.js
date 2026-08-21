// Confere o endpoint /api/session/:id/fix-duration — a correção manual de
// duração pra quando alguém esquece de apertar "Finalizar cirurgia" na hora
// certa. Reproduz o bug de verdade: inicia o cronômetro global, derruba o
// servidor, edita o arquivo do médico no disco pra jogar o horário de início
// 25h pro passado (simula "esqueci ontem"), sobe o servidor de novo e
// finaliza — reproduzindo o globalTimerEndedAt errado (~25h de duração).
// Depois confere que fix-duration corrige pro valor real, e os casos de erro
// (não finalizada, minutos inválidos, minutos que jogariam o término no
// futuro).
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
    console.log('--- Correção manual de duração (esqueceu de finalizar) ---');
    const DIR = '/tmp/fuetest/datatest_fix_duration';
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });

    const PORT1 = 4826;
    const env1 = Object.assign({}, process.env, { DATA_DIR: DIR, PORT: String(PORT1), SMTP_ENABLED: 'false' });
    child = spawn('node', [path.join(__dirname, 'server.js')], { env: env1, cwd: __dirname });
    child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
    await waitForServer(PORT1, 10000);

    const reg = await req(PORT1, 'POST', '/api/register', { nomeCompleto: 'Dr Vitor', crm: 'CRM-V', email: 'drvitorfrauches@gmail.com', telefone: '1', password: 'senha123' });
    check('registro ok', reg.status === 200);
    const cookie = extractCookie(reg.headers);
    const ownerId = reg.body.user.id;

    const create = await req(PORT1, 'POST', '/api/session', { codigo: 'PAC-DURACAO', mode: 'completo' }, cookie);
    const id = create.body.id;
    check('sessão criada', create.status === 200);

    console.log();
    console.log('--- Cirurgia AINDA em andamento: fix-duration é recusado (409) ---');
    const startTimer = await req(PORT1, 'POST', `/api/session/${id}/timer`, { action: 'start' }, cookie);
    check('timer iniciado', startTimer.body.globalTimerStartedAt !== null);
    const tryWhileRunning = await req(PORT1, 'POST', `/api/session/${id}/fix-duration`, { minutes: 60 }, cookie);
    check('status 409', tryWhileRunning.status === 409);

    // O servidor só lê o arquivo do médico no boot — pra simular "esqueci
    // ontem" de verdade (globalTimerStartedAt bem no passado), derruba o
    // processo, edita o arquivo em disco, e sobe um segundo processo no
    // mesmo DATA_DIR.
    child.kill();
    await sleep(300);

    const docPath = path.join(DIR, 'data', 'doctors', ownerId + '.json');
    const doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));
    const TWENTY_FIVE_H_MS = 25 * 60 * 60 * 1000;
    doc.sessions[id].globalTimerStartedAt -= TWENTY_FIVE_H_MS;
    var backdatedStart = doc.sessions[id].globalTimerStartedAt;
    fs.writeFileSync(docPath, JSON.stringify(doc));

    const PORT2 = 4836;
    const env2 = Object.assign({}, process.env, { DATA_DIR: DIR, PORT: String(PORT2), SMTP_ENABLED: 'false' });
    child = spawn('node', [path.join(__dirname, 'server.js')], { env: env2, cwd: __dirname });
    child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
    await waitForServer(PORT2, 10000);

    console.log();
    console.log('--- Finaliza (tarde, como no bug relatado): globalTimerEndedAt fica ~25h depois do início ---');
    const finalize = await req(PORT2, 'POST', `/api/session/${id}/finalize`, {}, cookie);
    check('status 200', finalize.status === 200);
    const wrongDurationMs = finalize.body.globalTimerEndedAt - finalize.body.globalTimerStartedAt;
    check('duração errada bate ~25h (bug reproduzido)', wrongDurationMs > 24.9 * 3600 * 1000 && wrongDurationMs < 25.1 * 3600 * 1000);

    console.log();
    console.log('--- Minutos inválidos são recusados (400): zero, negativo, acima de 1440 ---');
    const zero = await req(PORT2, 'POST', `/api/session/${id}/fix-duration`, { minutes: 0 }, cookie);
    check('zero -> 400', zero.status === 400);
    const negative = await req(PORT2, 'POST', `/api/session/${id}/fix-duration`, { minutes: -10 }, cookie);
    check('negativo -> 400', negative.status === 400);
    const tooBig = await req(PORT2, 'POST', `/api/session/${id}/fix-duration`, { minutes: 1441 }, cookie);
    check('acima de 1440 -> 400', tooBig.status === 400);

    console.log();
    console.log('--- Duração que jogaria o término no FUTURO é recusada (400) ---');
    // globalTimerStartedAt está ~25h no passado; pedir os 1440 minutos (24h)
    // máximos permitidos ainda deixa o término ~1h no passado — não serve pra
    // testar "futuro". Em vez disso usamos a MESMA sessão logo depois de já
    // ter sido corrigida uma vez pra um valor pequeno (ver bloco abaixo) não
    // funcionaria por já não ser mais 25h atrás — por isso testamos aqui,
    // ANTES de qualquer correção bem-sucedida, com um valor que baseado no
    // start real (25h atrás) ainda underestima o quanto precisaria pra
    // estourar "agora": como start é 25h atrás, qualquer valor <=1440 (24h)
    // cai no passado. Pra forçar "futuro" de forma determinística, criamos
    // uma segunda cirurgia com início AGORA (sem backdate) e finalizamos na
    // hora — cronômetro global vai ter só alguns ms de duração real.
    const create2 = await req(PORT2, 'POST', '/api/session', { codigo: 'PAC-FUTURO', mode: 'completo' }, cookie);
    const id2 = create2.body.id;
    await req(PORT2, 'POST', `/api/session/${id2}/timer`, { action: 'start' }, cookie);
    await req(PORT2, 'POST', `/api/session/${id2}/finalize`, {}, cookie);
    const future = await req(PORT2, 'POST', `/api/session/${id2}/fix-duration`, { minutes: 1440 }, cookie);
    check('1440 min a partir de um início recente -> 400 (cairia no futuro)', future.status === 400);

    console.log();
    console.log('--- Correção válida: 180 minutos (3h) ---');
    const fixed = await req(PORT2, 'POST', `/api/session/${id}/fix-duration`, { minutes: 180 }, cookie);
    check('status 200', fixed.status === 200);
    const fixedDurationMs = fixed.body.globalTimerEndedAt - fixed.body.globalTimerStartedAt;
    check('duração agora é exatamente 180min', fixedDurationMs === 180 * 60000);
    check('globalTimerStartedAt não mudou', fixed.body.globalTimerStartedAt === backdatedStart);
    check('finalizedAt foi ajustado junto (mesmo instante do novo término)', fixed.body.finalizedAt === fixed.body.globalTimerEndedAt);

    console.log();
    console.log('--- Sessão inexistente -> 404 ---');
    const notFound = await req(PORT2, 'POST', `/api/session/000000000000/fix-duration`, { minutes: 60 }, cookie);
    check('status 404', notFound.status === 404);

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
