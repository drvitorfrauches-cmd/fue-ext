// Monta o server.js a partir dos pedaços em src/ (NN-nome.part), na ordem do número.
// Fluxo de trabalho:
//   1. edite o pedaço certo em src/            (ex.: src/11-client-ui.part)
//   2. rode:  node build.js                    (regrava o server.js)
//   3. suba pro GitHub o server.js (é ele que o Railway executa) E a pasta src/
// "node build.js --check" só confere se o server.js está igual ao que o src/ gera
// (o teste verify_build_in_sync.js faz isso em todo push, pra ninguém esquecer).
const fs = require("fs");
const path = require("path");
const SRC_DIR = path.join(__dirname, "src");
function build() {
  return fs.readdirSync(SRC_DIR)
    .filter(function (f) { return /^\d\d-.+\.part$/.test(f); })
    .sort()
    .map(function (f) { return fs.readFileSync(path.join(SRC_DIR, f), "utf8"); })
    .join("");
}
module.exports = { build: build };
if (require.main === module) {
  const out = build();
  const target = path.join(__dirname, "server.js");
  if (process.argv.indexOf("--check") !== -1) {
    const cur = fs.readFileSync(target, "utf8");
    if (cur !== out) { console.error("server.js está FORA de sincronia com src/ — rode: node build.js"); process.exit(1); }
    console.log("server.js em sincronia com src/ (" + out.split("\n").length + " linhas)");
  } else {
    fs.writeFileSync(target, out);
    console.log("server.js gerado a partir de src/ (" + out.split("\n").length + " linhas)");
  }
}
