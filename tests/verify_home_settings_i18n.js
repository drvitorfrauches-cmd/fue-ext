// Confere que TODO data-i18n / data-i18n-placeholder usado nas telas Início e
// Configurações aponta pra uma chave que existe nos 3 idiomas (pt/en/es), e que
// as chaves nav.* (barra superior) também têm cobertura completa.
const fs = require('fs');
const full = fs.readFileSync('server.js', 'utf8');

// extrai STRINGS do jeito que extract.js já faz
const stringsStart = full.indexOf('const STRINGS = ');
const stringsEndMarker = '\n};\n';
const stringsEndIdx = full.indexOf(stringsEndMarker, stringsStart);
let stringsSrc = full.slice(stringsStart, stringsEndIdx + stringsEndMarker.length - 1);
stringsSrc = stringsSrc.replace(/^const STRINGS = /, 'STRINGS = ');
var STRINGS;
eval(stringsSrc);

const langs = Object.keys(STRINGS);
console.log('idiomas:', langs);

// extrai o bloco INDEX_HTML bruto (sem eval) só pra varrer os data-i18n
const htmlStart = full.indexOf('const INDEX_HTML = ');
const htmlEndMarker = '</html>\\n";';
const htmlEndIdx = full.indexOf(htmlEndMarker, htmlStart);
const rawIndexHtmlSrc = full.slice(htmlStart, htmlEndIdx);

function scanSection(label, startMarker, endMarker){
  const s = rawIndexHtmlSrc.indexOf(startMarker);
  const e = rawIndexHtmlSrc.indexOf(endMarker, s);
  if (s === -1 || e === -1) { console.log(label + ': MARCADORES NAO ENCONTRADOS'); return []; }
  const section = rawIndexHtmlSrc.slice(s, e);
  const keys = [];
  const reAttr = /data-i18n(?:-placeholder)?=\\"([^\\]+)\\"/g;
  let m;
  while ((m = reAttr.exec(section))) keys.push(m[1]);
  console.log(label + ': ' + keys.length + ' atributos data-i18n encontrados');
  return keys;
}

const homeKeys = scanSection('Tela Início', 'id=\\"screen-home\\"', 'id=\\"screen-settings\\"');
const settingsKeys = scanSection('Tela Configurações', 'id=\\"screen-settings\\"', 'id=\\"screen-dashboard\\"');
const navKeys = scanSection('Barra superior (nav)', 'class=\\"topbar\\"', 'id=\\"conn-banner\\"');

let allOk = true;
function checkKeys(label, keys){
  keys.forEach(function(k){
    langs.forEach(function(lang){
      if (STRINGS[lang][k] === undefined){
        console.log('FALTANDO: ' + label + ' chave "' + k + '" ausente em [' + lang + ']');
        allOk = false;
      }
    });
  });
}
checkKeys('Início', homeKeys);
checkKeys('Configurações', settingsKeys);
checkKeys('Nav', navKeys);

console.log();
console.log('total de chaves únicas cobertas (Início+Config+Nav):', new Set([...homeKeys, ...settingsKeys, ...navKeys]).size);
console.log('todas as chaves usadas existem nos 3 idiomas:', allOk);
