// Bug reportado pelo Dr. Vitor (14/07/2026): no celular (Safari e Chrome), ao tocar
// pra escolher a foto de marcação/pós-operatório, o app abria a CÂMERA direto, sem
// dar a opção de escolher uma foto já existente na galeria. No computador funcionava
// normal (abria o seletor de arquivos). Causa: os dois <input type="file"> de fotos
// tinham o atributo capture="environment", que em navegadores mobile pula o seletor
// (galeria/câmera/arquivos) e manda direto pra câmera — não existe no desktop, por
// isso só reproduzia no celular. Removido dos dois inputs; sem "capture", o mobile
// volta a mostrar o seletor completo (Galeria, Tirar Foto, Procurar), igual o desktop
// já mostrava. Este teste lê o HTML gerado direto do server.js/extracted.js pra
// garantir que ninguém reintroduza esse atributo sem querer numa edição futura.
const fs = require('fs');

var srv = fs.readFileSync('server.js', 'utf8');
var marcacaoLine = srv.split('\n').filter(function(l){ return l.indexOf("uploadPhotos('marcacao'") !== -1; })[0] || '';
var posopLine = srv.split('\n').filter(function(l){ return l.indexOf("uploadPhotos('posop'") !== -1; })[0] || '';

console.log('--- server.js: os dois inputs de foto existem ---');
console.log('input de marcação encontrado:', marcacaoLine.length > 0);
console.log('input de pós-operatório encontrado:', posopLine.length > 0);

console.log();
console.log('--- server.js: nenhum dos dois tem capture="environment" (nem nenhuma variação de capture=) ---');
console.log('input de marcação sem capture=:', marcacaoLine.indexOf('capture=') === -1);
console.log('input de pós-operatório sem capture=:', posopLine.indexOf('capture=') === -1);

console.log();
console.log('--- server.js: continuam aceitando imagem e múltiplos arquivos (não foi um remove errado) ---');
console.log('marcação continua accept="image/*":', marcacaoLine.indexOf('accept=\\"image/*\\"') !== -1);
console.log('marcação continua multiple:', marcacaoLine.indexOf('multiple') !== -1);
console.log('pós-op continua accept="image/*":', posopLine.indexOf('accept=\\"image/*\\"') !== -1);
console.log('pós-op continua multiple:', posopLine.indexOf('multiple') !== -1);

console.log();
console.log('--- extracted.js (HTML de verdade que vai pro navegador): mesma checagem ---');
var extracted = fs.readFileSync('extracted.js', 'utf8');
var idxMarc = extracted.indexOf("uploadPhotos('marcacao'");
var idxPosop = extracted.indexOf("uploadPhotos('posop'");
var beforeMarc = extracted.slice(Math.max(0, idxMarc - 200), idxMarc);
var beforePosop = extracted.slice(Math.max(0, idxPosop - 200), idxPosop);
console.log('trecho antes do input de marcação sem capture=:', beforeMarc.indexOf('capture=') === -1);
console.log('trecho antes do input de pós-op sem capture=:', beforePosop.indexOf('capture=') === -1);
