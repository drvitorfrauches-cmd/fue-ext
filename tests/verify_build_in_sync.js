// Garante que o server.js (o que o Railway executa) é exatamente o que os pedaços de
// src/ geram. Falha se alguém editou o server.js direto sem editar src/ (a edição se
// perderia no próximo build), ou editou src/ e esqueceu de rodar "node build.js".
const fs = require('fs');
const path = require('path');
var allChecks = [];
function check(label, ok, detail) { allChecks.push(!!ok); console.log(label + ':', !!ok); if (!ok && detail) console.log('   ->', detail); }

const srcDir = path.join(__dirname, 'src');
check('pasta src/ existe', fs.existsSync(srcDir));
const parts = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter(f => /^\d\d-.+\.part$/.test(f)).sort() : [];
check('há pedaços em src/ (' + parts.length + ')', parts.length >= 10);
const nums = parts.map(f => f.slice(0, 2));
check('numeração dos pedaços sem repetição', new Set(nums).size === nums.length);

const built = require(path.join(__dirname, 'build.js')).build();
const current = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
check('server.js é igual ao gerado por src/ (se falhar: node build.js)', built === current,
  'tamanhos: gerado=' + built.length + ' server.js=' + current.length);
check('server.js gerado tem sintaxe válida', (function () {
  try { new (require('vm').Script)(built.replace(/^#!.*\n/, '')); return true; } catch (e) { console.log('   ->', e.message); return false; }
})());

const ok = allChecks.every(v => v === true);
console.log(ok ? '\nTODOS OS TESTES PASSARAM' : '\nFALHA: verificar acima');
if (!ok) process.exitCode = 1;
