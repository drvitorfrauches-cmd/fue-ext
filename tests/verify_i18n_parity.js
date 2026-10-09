// Guarda de consistência do i18n. Falha (exit 1) se:
//  1. algum idioma (pt/en/es) tem chave a menos/a mais que os outros;
//  2. alguma tradução está vazia, ou tem placeholders {x} diferentes entre idiomas
//     (ex: pt usa {n} e en esqueceu);
//  3. o código usa t('chave') ou data-i18n="chave" que não existe no dicionário;
//  4. o código chama toast()/speak()/alert() com texto literal em vez de t('...')
//     (texto solto em português que nunca seria traduzido).
// Lê o server.js como texto — não sobe servidor.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const start = src.indexOf('const STRINGS = {');
const end = src.indexOf('\n};', start);
if (start < 0 || end < 0) { console.log('ERRO: bloco STRINGS não encontrado em server.js'); process.exit(1); }
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src.slice(start, end + 3).replace('const STRINGS', 'STRINGS') + ';this.S=STRINGS', ctx);
const S = ctx.S;
const rest = src.slice(end + 3);

var allChecks = [];
function check(label, ok, detail) { allChecks.push(ok); console.log(label + ':', ok); if (!ok && detail) console.log('   ->', detail); }

const langs = Object.keys(S);
check('idiomas são pt, en, es', langs.slice().sort().join(',') === 'en,es,pt');

const all = new Set();
langs.forEach(l => Object.keys(S[l]).forEach(k => all.add(k)));
langs.forEach(l => {
  const missing = [...all].filter(k => !(k in S[l]));
  check('[' + l + '] nenhuma chave faltando (' + Object.keys(S[l]).length + ' chaves)', missing.length === 0, missing.join(', '));
  const empty = Object.keys(S[l]).filter(k => typeof S[l][k] !== 'string' || !S[l][k].trim());
  check('[' + l + '] nenhuma tradução vazia', empty.length === 0, empty.join(', '));
});

const ph = s => (String(s).match(/\{[a-zA-Z_]+\}/g) || []).sort().join(',');
const badPh = [...all].filter(k => new Set(langs.map(l => ph(S[l][k] || ''))).size > 1);
check('placeholders {x} iguais nos três idiomas', badPh.length === 0, badPh.join(', '));

const keys = new Set(Object.keys(S.pt));
const used = new Set();
let m;
const reT = /\bt\(\s*\\?['"]([a-z_]+\.[a-z0-9_.]+)\\?['"]/g;
while ((m = reT.exec(rest))) used.add(m[1]);
const reD = /data-i18n(?:-placeholder|-title)?=\\?"([a-z_]+\.[a-z0-9_.]+)\\?"/g;
while ((m = reD.exec(rest))) used.add(m[1]);
const ghost = [...used].filter(k => !keys.has(k));
check('toda chave usada no código existe no dicionário (' + used.size + ' usadas)', ghost.length === 0, ghost.join(', '));

// Texto literal em toast()/speak()/alert() dentro do código do navegador.
const lines = src.split('\n');
const s0 = lines.findIndex(l => l.startsWith('const INDEX_HTML'));
const s1 = lines.findIndex(l => l.startsWith('var STRINGS_JSON_SAFE'));
const literal = /\b(toast|speak|alert)\(\s*\\?['"][^'"\\]*[A-Za-zÀ-ÿ]{3,}/;
const offenders = [];
for (let i = s0; i < s1; i++) {
  const t = lines[i].trim();
  if (/^"\s*\/\//.test(t)) continue;
  if (literal.test(lines[i])) offenders.push((i + 1) + ': ' + t.slice(0, 140));
}
check('nenhum toast()/speak()/alert() com texto literal (use t(...))', offenders.length === 0, offenders.join('\n      '));

const ok = allChecks.every(v => v === true);
console.log();
console.log(ok ? 'TODOS OS TESTES PASSARAM' : 'FALHA: verificar acima');
if (!ok) process.exitCode = 1;
