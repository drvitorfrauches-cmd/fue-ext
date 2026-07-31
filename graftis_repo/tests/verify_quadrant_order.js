// A lista QUADRANTS existe DUPLICADA no server.js: uma cópia server-side (JS puro,
// usada nos endpoints) e outra client-side (dentro do template HTML, com labels
// via i18n). As duas precisam estar sempre na mesma ordem — já aconteceu de eu
// editar só uma das duas por engano. Este teste lê as DUAS cópias direto do
// server.js/extracted.js (sem confiar em memória) e confere que baterem entre si
// e com a ordem real de extração do Dr. Vitor (occipital dir -> occipital esq ->
// temporal esq -> temporal dir), além do botão de aba no HTML seguir essa mesma ordem.
const fs = require('fs');

var EXPECTED_ORDER = ['occipital_dir', 'occipital_esq', 'temporal_esq', 'temporal_dir'];

// --- cópia server-side (const QUADRANTS = [...], fora do template HTML) ---
var full = fs.readFileSync('server.js', 'utf8');
var srvStart = full.indexOf('const QUADRANTS = [');
var srvEnd = full.indexOf('];', srvStart) + 2;
var srvSrc = full.slice(srvStart, srvEnd).replace(/^const QUADRANTS = /, 'var SERVER_QUADRANTS = ');
var SERVER_QUADRANTS;
eval(srvSrc);
var serverOrder = SERVER_QUADRANTS.map(function (q) { return q.id; });

console.log('--- cópia server-side (endpoints) ---');
console.log('ordem:', serverOrder.join(' -> '));
console.log('bate com a ordem esperada:', JSON.stringify(serverOrder) === JSON.stringify(EXPECTED_ORDER));

// --- cópia client-side (dentro do <script>, usa getters de i18n) ---
var elements = {};
function fakeEl(id) { if (!elements[id]) elements[id] = { id: id, className: '', style: {}, classList: { add: function () {}, remove: function () {} }, _innerHTML: '', get innerHTML() { return this._innerHTML; }, set innerHTML(v) { this._innerHTML = v; }, textContent: '', value: '' }; return elements[id]; }
global.document = { documentElement: { style: { setProperty: function () {} }, classList: { add: function () {}, remove: function () {}, toggle: function () {} } }, addEventListener: function () {}, getElementById: function (id) { return fakeEl(id); }, createElement: function () { return {}; }, querySelectorAll: function () { return []; }, activeElement: null };
global.window = { addEventListener: function () {}, location: { hostname: 'localhost', origin: 'http://localhost:3000', pathname: '/' }, history: {} };
global.navigator = {};
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };
global.history = { pushState: function () {}, replaceState: function () {} };
global.setInterval = function () { return 0; };
global.fetch = function () { return Promise.reject(new Error('no net')); };
var clientSrc = fs.readFileSync('extracted.js', 'utf8');
var marker = '})();';
var idx = clientSrc.lastIndexOf(marker);
clientSrc = clientSrc.slice(0, idx) + 'global.QUADRANTS=QUADRANTS; global.state=state;\n' + marker;
eval(clientSrc);
var clientOrder = QUADRANTS.map(function (q) { return q.id; });

console.log();
console.log('--- cópia client-side (dentro do HTML) ---');
console.log('ordem:', clientOrder.join(' -> '));
console.log('bate com a ordem esperada:', JSON.stringify(clientOrder) === JSON.stringify(EXPECTED_ORDER));
console.log('bate com a cópia server-side:', JSON.stringify(clientOrder) === JSON.stringify(serverOrder));

console.log();
console.log('--- quadrante ativo padrão ao abrir uma cirurgia (QUADRANTS[0]) ---');
console.log('é occipital_dir:', state.activeQuadrant === 'occipital_dir');

// --- ordem dos botões de aba no HTML (tab-*-btn) ---
var indexStart = full.indexOf('const INDEX_HTML = ');
var tabBtnIds = ['tab-extracao-btn', 'tab-preinc-btn', 'tab-fotos-btn', 'tab-paciente-btn', 'tab-resumo-btn'];
var positions = tabBtnIds.map(function (id) { return full.indexOf('id=\\"' + id + '\\"', indexStart); });
var sorted = positions.slice().sort(function (a, b) { return a - b; });
console.log();
console.log('--- ordem das ABAS (Extração/Pré-inc/Fotos/Paciente/Resumo) não mudou por engano ---');
console.log('todas encontradas:', positions.every(function (p) { return p !== -1; }));
console.log('aparecem na ordem esperada no HTML:', JSON.stringify(positions) === JSON.stringify(sorted));
