const fs = require('fs');
const full = fs.readFileSync('server.js', 'utf8');
const startIdx = full.indexOf('const INDEX_HTML = ');
if (startIdx === -1) { console.error('INDEX_HTML start not found'); process.exit(1); }
const endMarker = '</html>\\n";';
const endIdx = full.indexOf(endMarker, startIdx);
if (endIdx === -1) { console.error('INDEX_HTML end not found'); process.exit(1); }
const endPos = endIdx + endMarker.length;
let src = full.slice(startIdx, endPos);
src = src.replace(/^const INDEX_HTML = /, 'INDEX_HTML = ');
var INDEX_HTML;
eval(src);
// STRINGS (dicionário de i18n) precisa ser extraído e injetado igual o server.js
// faz de verdade (INDEX_HTML_RENDERED), senão sobra o placeholder __STRINGS_JSON__
// cru no meio do JS extraído e ele nem chega a fazer parse.
const stringsStart = full.indexOf('const STRINGS = ');
if (stringsStart === -1) { console.error('STRINGS not found'); process.exit(1); }
const stringsEndMarker = '\n};\n';
const stringsEndIdx = full.indexOf(stringsEndMarker, stringsStart);
if (stringsEndIdx === -1) { console.error('STRINGS end not found'); process.exit(1); }
let stringsSrc = full.slice(stringsStart, stringsEndIdx + stringsEndMarker.length - 1);
stringsSrc = stringsSrc.replace(/^const STRINGS = /, 'STRINGS = ');
var STRINGS;
eval(stringsSrc);
const stringsJsonSafe = JSON.stringify(STRINGS).replace(/</g, '\\u003c');

const html = INDEX_HTML.replace('__APP_SUBTITLE__', 'rede local · sem nuvem').replace('__STRINGS_JSON__', stringsJsonSafe);
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) { console.error('NO SCRIPT FOUND'); process.exit(1); }
fs.writeFileSync('extracted.js', scriptMatch[1]);
console.log('extracted.js written, length', scriptMatch[1].length);
const opens = (html.match(/<div/g)||[]).length;
const closes = (html.match(/<\/div>/g)||[]).length;
console.log('divs open/close:', opens, closes, opens===closes ? 'OK' : 'MISMATCH');
