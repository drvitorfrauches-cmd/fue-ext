// Servidor local de contagem de extração folicular — sem nuvem, sem dependências externas,
// UM ARQUIVO SÓ (server.js). Cria sozinho os arquivos/pastas que precisa (data.json, uploads/).
// Versão com paridade completa em relação ao app v1 (offline): 4 quadrantes de extração,
// Mamba por quadrante (leitura acumulada + delta automático), pré-incisões com cronômetro
// próprio, fotos e relatório de impressão/PDF — tudo sincronizado ao vivo entre os aparelhos.
//
// Como usar:
//   node server.js
// O terminal vai mostrar o endereço (ex: http://192.168.1.23:3000) para compartilhar
// com os celulares conectados na MESMA rede wifi.

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const DATA_FILE = path.join(__dirname, "data.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const MAX_BODY_BYTES = 15 * 1024 * 1024; // 15MB — folga generosa pra fotos comprimidas

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Mesmas 13 categorias do app v1 (íntegros / transecção parcial / transecção total).
const CATS = [
  { id: "f1",     label: "1 fio",       hairs: 1, group: "integro" },
  { id: "f1fino", label: "1 fio fino",  hairs: 1, group: "integro" },
  { id: "f2",     label: "2 fios",      hairs: 2, group: "integro" },
  { id: "f2fino", label: "2 fios fino", hairs: 2, group: "integro" },
  { id: "f3",     label: "3 fios",      hairs: 3, group: "integro" },
  { id: "f4",     label: "4 fios",      hairs: 4, group: "integro" },
  { id: "t2_1", label: "2 → 1 fio",  hairs: 1, group: "parcial" },
  { id: "t3_2", label: "3 → 2 fios", hairs: 2, group: "parcial" },
  { id: "t3_1", label: "3 → 1 fio",  hairs: 1, group: "parcial" },
  { id: "t4_3", label: "4 → 3 fios", hairs: 3, group: "parcial" },
  { id: "t4_2", label: "4 → 2 fios", hairs: 2, group: "parcial" },
  { id: "t4_1", label: "4 → 1 fio",  hairs: 1, group: "parcial" },
  { id: "ttotal", label: "Transecção total (folículo perdido)", hairs: 0, group: "total" }
];
const CAT_IDS = new Set(CATS.map(function (c) { return c.id; }));

// Mesmos 4 quadrantes de extração do app v1. A ORDEM importa: é usada para calcular
// o Mamba "deste quadrante" a partir de leituras acumuladas consecutivas.
const QUADRANTS = [
  { id: "temporal_dir",  label: "Temporal direito" },
  { id: "temporal_esq",  label: "Temporal esquerdo" },
  { id: "occipital_dir", label: "Occipital direito" },
  { id: "occipital_esq", label: "Occipital esquerdo" }
];
const QUAD_IDS = new Set(QUADRANTS.map(function (q) { return q.id; }));

// Mesmas 12 áreas de pré-incisão do app v1.
const PREINC_AREAS = [
  { id: "recesso_dir",  label: "Recesso direito" },
  { id: "recesso_esq",  label: "Recesso esquerdo" },
  { id: "linha",        label: "Linha" },
  { id: "sublinha",     label: "Sublinha" },
  { id: "entrada_dir1", label: "Entrada direita 1" },
  { id: "entrada_dir2", label: "Entrada direita 2" },
  { id: "entrada_esq1", label: "Entrada esquerda 1" },
  { id: "entrada_esq2", label: "Entrada esquerda 2" },
  { id: "topete1",      label: "Topete 1" },
  { id: "topete2",      label: "Topete 2" },
  { id: "scalp",        label: "Scalp" },
  { id: "coroa",        label: "Coroa" }
];
const PREINC_IDS = new Set(PREINC_AREAS.map(function (a) { return a.id; }));
const PHOTO_CATS = ["marcacao", "posop"];

function emptyCounts() {
  var c = {};
  CATS.forEach(function (cat) { c[cat.id] = 0; });
  return c;
}
function emptyQuadrant() {
  return { counts: emptyCounts(), mambaCumulativo: null };
}
function emptyQuadrants() {
  var q = {};
  QUADRANTS.forEach(function (qd) { q[qd.id] = emptyQuadrant(); });
  return q;
}
function emptyPreinc() {
  var c = {};
  PREINC_AREAS.forEach(function (a) { c[a.id] = 0; });
  return c;
}
function emptyTimer() {
  return { accumulatedMs: 0, running: false, startedAt: null };
}

// ---------- persistência simples em arquivo local (sobrevive a reinício do servidor) ----------
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return { sessions: {} };
  }
}
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
var db = loadData();
if (!db.sessions) db.sessions = {};
if (!db.users) db.users = {};
if (!db.authTokens) db.authTokens = {};
// Normaliza cirurgias salvas antes desta atualização (migra pro formato com quadrantes).
Object.keys(db.sessions).forEach(function (id) {
  var s = db.sessions[id];
  if (s.ownerId === undefined) s.ownerId = null;
  if (!s.quadrants) {
    s.quadrants = emptyQuadrants();
    // Cirurgia salva antes dos quadrantes existirem — os dados antigos (contagem única)
    // viram o quadrante "Temporal direito" por padrão, igual à migração do app v1.
    if (s.counts) {
      s.quadrants[QUADRANTS[0].id].counts = s.counts;
      delete s.counts;
    }
    if (s.mambaCount !== undefined) {
      if (s.mambaCount !== null) s.quadrants[QUADRANTS[0].id].mambaCumulativo = s.mambaCount;
      delete s.mambaCount;
    }
  } else {
    QUADRANTS.forEach(function (q) {
      if (!s.quadrants[q.id]) s.quadrants[q.id] = emptyQuadrant();
      if (!s.quadrants[q.id].counts) s.quadrants[q.id].counts = emptyCounts();
      CATS.forEach(function (c) { if (s.quadrants[q.id].counts[c.id] === undefined) s.quadrants[q.id].counts[c.id] = 0; });
      if (s.quadrants[q.id].mambaCumulativo === undefined) s.quadrants[q.id].mambaCumulativo = null;
    });
  }
  if (!s.preincCounts) s.preincCounts = emptyPreinc();
  if (!s.photos) s.photos = { marcacao: [], posop: [] };
  if (!s.timer) s.timer = emptyTimer();
  if (!s.preincTimer) s.preincTimer = emptyTimer();
});
saveData();

function newId(bytes) {
  return crypto.randomBytes(bytes || 4).toString("hex");
}
function newSessionId() {
  var id;
  do { id = newId(4); } while (db.sessions[id]);
  return id;
}

// ---------- autenticação (senha com hash local — sem dependências externas) ----------
function hashPassword(password) {
  var salt = crypto.randomBytes(16).toString("hex");
  var hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}
function verifyPassword(password, stored) {
  if (!stored || stored.indexOf(":") === -1) return false;
  var parts = stored.split(":");
  var salt = parts[0], hash = parts[1];
  var check = crypto.scryptSync(password, salt, 64).toString("hex");
  var a = Buffer.from(hash, "hex"), b = Buffer.from(check, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
function publicUser(u) {
  return { id: u.id, nomeCompleto: u.nomeCompleto, crm: u.crm, email: u.email, telefone: u.telefone, createdAt: u.createdAt };
}
function findUserByEmail(email) {
  var found = null;
  Object.keys(db.users).forEach(function (uid) { if (db.users[uid].email === email) found = db.users[uid]; });
  return found;
}
function parseCookies(req) {
  var out = {};
  var raw = req.headers.cookie;
  if (!raw) return out;
  raw.split(";").forEach(function (part) {
    var idx = part.indexOf("=");
    if (idx === -1) return;
    var k = part.slice(0, idx).trim();
    var v = part.slice(idx + 1).trim();
    try { out[k] = decodeURIComponent(v); } catch (e) { out[k] = v; }
  });
  return out;
}
function getAuthedUser(req) {
  var cookies = parseCookies(req);
  var token = cookies["fue_auth"];
  if (!token) return null;
  var entry = db.authTokens[token];
  if (!entry) return null;
  return db.users[entry.userId] || null;
}
function setAuthCookie(res, token) {
  res.setHeader("Set-Cookie", "fue_auth=" + token + "; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax");
}
function clearAuthCookie(res) {
  res.setHeader("Set-Cookie", "fue_auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
}

// ---------- helpers HTTP ----------
function send(res, status, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(body);
}
function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    var total = 0;
    var tooBig = false;
    req.on("data", function (c) {
      total += c.length;
      if (total > MAX_BODY_BYTES) { tooBig = true; req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", function () {
      if (tooBig) { reject(new Error("Corpo da requisição grande demais.")); return; }
      try {
        var raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}
function findPhotoCategory(s, photoId) {
  for (var i = 0; i < PHOTO_CATS.length; i++) {
    var cat = PHOTO_CATS[i];
    var list = s.photos[cat] || [];
    for (var j = 0; j < list.length; j++) {
      if (list[j].id === photoId) return { cat: cat, idx: j, photo: list[j] };
    }
  }
  return null;
}

// ==================== PÁGINA (HTML+CSS+JS embutidos — não depende de nenhum outro arquivo) ====================
const INDEX_HTML = "<!DOCTYPE html>\n" +
"<html lang=\"pt-BR\">\n" +
"<head>\n" +
"<meta charset=\"UTF-8\">\n" +
"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1\">\n" +
"<title>Contagem ao Vivo — Extração Folicular</title>\n" +
"<style>\n" +
"  :root{--c-bg:#f4f6f7;--c-card:#fff;--c-text:#1c2b2e;--c-muted:#5c6b6e;--c-border:#dde3e4;--c-primary:#0e7c86;--c-primary-dark:#0a5c64;--c-integro:#1a8f5e;--c-parcial:#c2760a;--c-total:#c62828;--c-preinc:#5b5fc7;--radius:10px;--shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06);}\n" +
"  *{box-sizing:border-box;} html,body{margin:0;padding:0;}\n" +
"  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:var(--c-bg);color:var(--c-text);-webkit-tap-highlight-color:transparent;}\n" +
"  .app{max-width:960px;margin:0 auto;padding:12px 12px 80px;}\n" +
"  header.topbar{position:sticky;top:0;z-index:20;background:var(--c-primary);color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:var(--shadow);}\n" +
"  header.topbar h1{font-size:15px;margin:0;font-weight:600;} header.topbar .sub{font-size:11px;opacity:.85;}\n" +
"  .icon-btn{background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:8px 10px;font-size:13px;cursor:pointer;}\n" +
"  .conn-dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:5px;background:#9ad;}\n" +
"  .conn-dot.ok{background:#3fdc7a;} .conn-dot.bad{background:#ff5b5b;}\n" +
"  .screen{display:none;} .screen.active{display:block;}\n" +
"  .card{background:var(--c-card);border:1px solid var(--c-border);border-radius:var(--radius);padding:16px;margin-top:14px;box-shadow:var(--shadow);}\n" +
"  .row{display:flex;gap:10px;flex-wrap:wrap;}\n" +
"  .btn{border:none;border-radius:8px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;color:#fff;background:var(--c-primary);}\n" +
"  .btn:active{background:var(--c-primary-dark);} .btn.secondary{background:#e8edee;color:var(--c-text);} .btn.danger{background:var(--c-total);}\n" +
"  .btn.block{width:100%;} .btn.lg{padding:14px 18px;font-size:16px;} .btn:disabled{opacity:.45;cursor:not-allowed;}\n" +
"  label{font-size:13px;font-weight:600;color:var(--c-muted);display:block;margin-bottom:4px;}\n" +
"  input[type=text],input[type=number],input[type=file]{width:100%;padding:10px 12px;border:1px solid var(--c-border);border-radius:8px;font-size:15px;font-family:inherit;background:#fff;color:var(--c-text);}\n" +
"  input[type=file]{border-style:dashed;font-size:13px;background:#fafcfc;}\n" +
"  .field{margin-bottom:14px;} .hint{font-size:12px;color:var(--c-muted);margin-top:4px;}\n" +
"  h2{font-size:18px;margin:0 0 4px;}\n" +
"  h3.section-title{font-size:14px;text-transform:uppercase;letter-spacing:.4px;margin:22px 0 8px;display:flex;align-items:center;gap:8px;}\n" +
"  .dot{width:10px;height:10px;border-radius:50%;display:inline-block;}\n" +
"  .summary-bar{position:sticky;top:52px;z-index:15;background:#fff;border:1px solid var(--c-border);border-radius:var(--radius);box-shadow:var(--shadow);padding:10px 14px;margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:6px;}\n" +
"  .summary-bar.static{position:static;}\n" +
"  .summary-item{text-align:center;padding:4px;} .summary-item .val{font-size:19px;font-weight:700;color:var(--c-primary-dark);line-height:1.1;}\n" +
"  .summary-item .lbl{font-size:10.5px;color:var(--c-muted);text-transform:uppercase;letter-spacing:.3px;margin-top:2px;}\n" +
"  .cat-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--c-border);border-radius:8px;margin-bottom:8px;background:#fff;}\n" +
"  .cat-row .cat-label{flex:1 1 auto;min-width:120px;font-size:14.5px;font-weight:600;}\n" +
"  .cat-row .cat-hairs{font-size:11px;color:var(--c-muted);font-weight:500;display:block;margin-top:1px;}\n" +
"  .cat-count{min-width:44px;text-align:center;font-size:20px;font-weight:700;border:1px dashed var(--c-border);border-radius:8px;padding:6px 8px;background:#fafcfc;}\n" +
"  .cat-btns{display:flex;gap:6px;flex-wrap:wrap;}\n" +
"  .cat-btn{border:none;border-radius:7px;min-width:38px;padding:8px 8px;font-size:13px;font-weight:700;cursor:pointer;color:#fff;background:var(--c-primary);}\n" +
"  .cat-btn.minus{background:#8a97992e;color:var(--c-text);border:1px solid var(--c-border);}\n" +
"  .group-integro .cat-btn{background:var(--c-integro);} .group-parcial .cat-btn{background:var(--c-parcial);} .group-total .cat-btn{background:var(--c-total);}\n" +
"  .group-integro{border-left:4px solid var(--c-integro);} .group-parcial{border-left:4px solid var(--c-parcial);} .group-total{border-left:4px solid var(--c-total);}\n" +
"  .group-preinc{border-left:4px solid var(--c-preinc);}\n" +
"  .cat-count.clickable{cursor:pointer;border-style:solid;border-color:var(--c-primary);}\n" +
"  .cat-count.clickable:active{background:#e8f4f5;}\n" +
"  .increments-editor .inc-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;}\n" +
"  .increments-editor input{width:90px;}\n" +
"  .surgery-card{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px;border:1px solid var(--c-border);border-radius:var(--radius);background:#fff;margin-top:10px;box-shadow:var(--shadow);}\n" +
"  .badge{font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;display:inline-block;}\n" +
"  .badge.andamento{background:#fff4de;color:#8a5a00;} .badge.finalizada{background:#e8f6ee;color:var(--c-integro);}\n" +
"  .empty-state{text-align:center;color:var(--c-muted);padding:40px 10px;font-size:14px;}\n" +
"  .share-url{font-size:17px;font-weight:700;background:#f0f7f7;border:1px dashed var(--c-primary);border-radius:8px;padding:12px;word-break:break-all;color:var(--c-primary-dark);}\n" +
"  footer.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid var(--c-border);}\n" +
"  .toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#1c2b2e;color:#fff;padding:10px 18px;border-radius:24px;font-size:13px;box-shadow:var(--shadow);z-index:50;opacity:0;pointer-events:none;transition:opacity .2s;max-width:90vw;text-align:center;}\n" +
"  .toast.show{opacity:1;}\n" +
"  .switch{position:relative;display:inline-block;width:44px;height:24px;} .switch input{opacity:0;width:0;height:0;}\n" +
"  .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#ccc;transition:.2s;border-radius:24px;}\n" +
"  .slider:before{position:absolute;content:'';height:18px;width:18px;left:3px;bottom:3px;background-color:#fff;transition:.2s;border-radius:50%;}\n" +
"  input:checked + .slider{background-color:var(--c-primary);} input:checked + .slider:before{transform:translateX(20px);}\n" +
"  .conn-banner{display:none;background:#fceaea;color:#8a1c1c;border:1px solid #f0b8b8;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:13px;font-weight:600;}\n" +
"  .conn-banner.show{display:block;}\n" +
"  .photo-grid{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;}\n" +
"  .photo-thumb{position:relative;width:104px;height:104px;border-radius:8px;overflow:hidden;border:1px solid var(--c-border);background:#eee;}\n" +
"  .photo-thumb img{width:100%;height:100%;object-fit:cover;display:block;}\n" +
"  .photo-remove{position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:14px;line-height:1;cursor:pointer;}\n" +
"  #print-report{display:none;}\n" +
"  @media print{\n" +
"    body *{visibility:hidden;}\n" +
"    #print-report, #print-report *{visibility:visible;}\n" +
"    #print-report{display:block;position:absolute;top:0;left:0;width:100%;padding:20px;}\n" +
"    #print-report table{width:100%;border-collapse:collapse;margin-top:10px;}\n" +
"    #print-report th,#print-report td{border:1px solid #999;padding:6px 8px;font-size:12px;text-align:left;}\n" +
"    #print-report h1{font-size:18px;margin-bottom:2px;} #print-report h2{font-size:14px;margin-top:18px;}\n" +
"    #print-report .print-summary{display:flex;gap:16px;margin:10px 0;flex-wrap:wrap;}\n" +
"    #print-report .print-summary div{border:1px solid #999;padding:8px 12px;border-radius:6px;}\n" +
"    #print-report .photo-print-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0;}\n" +
"    #print-report .photo-print-grid img{width:100%;height:190px;object-fit:cover;border:1px solid #999;border-radius:4px;}\n" +
"    #print-report .photo-report-page{page-break-before:always;}\n" +
"  }\n" +
"</style>\n" +
"</head>\n" +
"<body>\n" +
"<div class=\"app\">\n" +
"  <header class=\"topbar\">\n" +
"    <div><h1><span class=\"conn-dot\" id=\"conn-dot\"></span>Contagem ao Vivo</h1><div class=\"sub\">rede local · sem nuvem</div></div>\n" +
"    <div class=\"row\" style=\"gap:8px;align-items:center;\">\n" +
"      <span id=\"user-bar\"></span>\n" +
"      <button class=\"icon-btn\" onclick=\"App.showSettings()\">Config</button>\n" +
"      <button class=\"icon-btn\" onclick=\"App.goHome()\">Início</button>\n" +
"    </div>\n" +
"  </header>\n" +
"  <div class=\"conn-banner\" id=\"conn-banner\">Sem conexão com o servidor — verifique se está na mesma rede wifi.</div>\n" +
"\n" +
"  <section id=\"screen-auth\" class=\"screen\">\n" +
"    <div class=\"card\">\n" +
"      <h2>Área do médico</h2>\n" +
"      <p class=\"hint\">Entre com sua conta pra ver e criar suas próprias cirurgias. Auxiliares que já têm o link de uma cirurgia específica não precisam de conta — só quem cria e gerencia a lista de cirurgias precisa entrar.</p>\n" +
"      <div class=\"row\" style=\"gap:8px;margin:14px 0;\">\n" +
"        <button class=\"btn\" id=\"authtab-login-btn\" onclick=\"App.switchAuthTab('login')\">Entrar</button>\n" +
"        <button class=\"btn secondary\" id=\"authtab-cadastro-btn\" onclick=\"App.switchAuthTab('cadastro')\">Criar conta</button>\n" +
"      </div>\n" +
"      <div id=\"authpanel-login\">\n" +
"        <div class=\"field\"><label>E-mail</label><input type=\"email\" id=\"login-email\" autocomplete=\"username\"></div>\n" +
"        <div class=\"field\"><label>Senha</label><input type=\"password\" id=\"login-password\" autocomplete=\"current-password\"></div>\n" +
"        <button class=\"btn block lg\" onclick=\"App.doLogin()\">Entrar</button>\n" +
"      </div>\n" +
"      <div id=\"authpanel-cadastro\" style=\"display:none;\">\n" +
"        <div class=\"field\"><label>Nome completo</label><input type=\"text\" id=\"reg-nome\"></div>\n" +
"        <div class=\"field\"><label>CRM</label><input type=\"text\" id=\"reg-crm\" placeholder=\"Ex: 123456-SP\"></div>\n" +
"        <div class=\"field\"><label>E-mail</label><input type=\"email\" id=\"reg-email\" autocomplete=\"username\"></div>\n" +
"        <div class=\"field\"><label>Telefone (com DDD)</label><input type=\"tel\" id=\"reg-telefone\" placeholder=\"Ex: (11) 91234-5678\"></div>\n" +
"        <div class=\"field\"><label>Senha</label><input type=\"password\" id=\"reg-password\" autocomplete=\"new-password\"></div>\n" +
"        <div class=\"field\"><label>Confirmar senha</label><input type=\"password\" id=\"reg-password2\" autocomplete=\"new-password\"></div>\n" +
"        <button class=\"btn block lg\" onclick=\"App.doRegister()\">Criar conta</button>\n" +
"      </div>\n" +
"    </div>\n" +
"  </section>\n" +
"\n" +
"  <section id=\"screen-home\" class=\"screen\">\n" +
"    <div class=\"card\">\n" +
"      <h2>Suas cirurgias</h2>\n" +
"      <p class=\"hint\">Só você vê essa lista. Depois de criar a cirurgia, compartilhe o link dela com as auxiliares — elas atualizam os dados ao vivo sem precisar de conta.</p>\n" +
"      <div class=\"field\"><label>Código / iniciais do paciente</label><input type=\"text\" id=\"new-codigo\" placeholder=\"Ex: JS-090726\"></div>\n" +
"      <button class=\"btn block lg\" onclick=\"App.createSession()\">+ Nova cirurgia (criar sessão)</button>\n" +
"    </div>\n" +
"    <div id=\"surgery-list\"></div>\n" +
"  </section>\n" +
"\n" +
"  <section id=\"screen-settings\" class=\"screen\">\n" +
"    <div class=\"card\">\n" +
"      <h2>Configurações</h2>\n" +
"      <p class=\"hint\">Valores extras dos botões de incremento rápido usados na contagem da extração, além do -1/+1 que aparece sempre. Configuração só deste aparelho — cada celular pode ter os próprios botões (por exemplo, só +1 e +100, ou só +50).</p>\n" +
"      <div id=\"increments-editor\" class=\"increments-editor\"></div>\n" +
"      <div class=\"row\" style=\"margin-top:6px;\">\n" +
"        <button class=\"btn secondary\" onclick=\"App.addIncrementField()\">+ Adicionar valor</button>\n" +
"      </div>\n" +
"      <footer class=\"actions\">\n" +
"        <button class=\"btn\" onclick=\"App.saveSettings()\">Salvar</button>\n" +
"        <button class=\"btn secondary\" onclick=\"App.resetSettings()\">Restaurar padrão (10 / 50 / 100)</button>\n" +
"      </footer>\n" +
"    </div>\n" +
"  </section>\n" +
"\n" +
"  <section id=\"screen-counting\" class=\"screen\">\n" +
"    <div class=\"card\">\n" +
"      <div class=\"row\" style=\"justify-content:space-between;align-items:flex-start;\">\n" +
"        <div><h2 id=\"cnt-codigo\">—</h2><div class=\"hint\" id=\"cnt-meta\">—</div></div>\n" +
"        <span class=\"badge\" id=\"cnt-status\">—</span>\n" +
"      </div>\n" +
"      <div class=\"field\" style=\"margin-top:14px;margin-bottom:0;\">\n" +
"        <label>Endereço desta cirurgia (compartilhe com os outros celulares)</label>\n" +
"        <div class=\"share-url\" id=\"share-url\">—</div>\n" +
"        <div class=\"row\" style=\"margin-top:8px;gap:8px;\">\n" +
"          <button class=\"btn\" onclick=\"App.shareViaSystem()\">Compartilhar link</button>\n" +
"          <button class=\"btn secondary\" onclick=\"App.shareViaWhatsapp()\">Enviar por WhatsApp</button>\n" +
"          <button class=\"btn secondary\" onclick=\"App.copyShareUrl()\">Copiar</button>\n" +
"        </div>\n" +
"        <p class=\"hint\" style=\"margin-top:8px;\">A auxiliar toca no link recebido e a página abre direto na contagem desta cirurgia — não precisa digitar nada.</p>\n" +
"      </div>\n" +
"    </div>\n" +
"\n" +
"    <div class=\"row\" style=\"gap:8px;margin-top:14px;\">\n" +
"      <button class=\"btn\" id=\"tab-extracao-btn\" onclick=\"App.switchTab('extracao')\">Extração</button>\n" +
"      <button class=\"btn secondary\" id=\"tab-preinc-btn\" onclick=\"App.switchTab('preincisoes')\">Pré-incisões</button>\n" +
"      <button class=\"btn secondary\" id=\"tab-fotos-btn\" onclick=\"App.switchTab('fotos')\">Fotos</button>\n" +
"    </div>\n" +
"\n" +
"    <div id=\"panel-extracao\">\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 10px;\">Tempo de cirurgia</h2>\n" +
"        <div class=\"row\" style=\"align-items:center;gap:16px;flex-wrap:wrap;\">\n" +
"          <div id=\"timer-display\" style=\"font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--c-primary-dark);\">00:00:00</div>\n" +
"          <div class=\"row\" style=\"gap:8px;\"><button class=\"btn\" id=\"timer-toggle-btn\" onclick=\"App.toggleTimer()\">Iniciar</button><button class=\"btn secondary\" onclick=\"App.resetTimer()\">Zerar</button></div>\n" +
"        </div>\n" +
"        <div class=\"hint\" id=\"timer-rate\" style=\"margin-top:8px;\"></div>\n" +
"      </div>\n" +
"\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 8px;\">Áudio (só neste aparelho)</h2>\n" +
"        <p class=\"hint\">Anuncia em voz alta o total de folículos extraídos (somando os 4 quadrantes) a cada N. Configuração local — não afeta os outros aparelhos.</p>\n" +
"        <div class=\"row\" style=\"align-items:center;gap:16px;margin-top:8px;\">\n" +
"          <label class=\"switch\"><input type=\"checkbox\" id=\"audio-toggle\" onchange=\"App.toggleAudio(this.checked)\"><span class=\"slider\"></span></label>\n" +
"          <div class=\"field\" style=\"margin:0;max-width:160px;\"><label>Anunciar a cada</label><input type=\"number\" id=\"audio-interval\" value=\"100\" min=\"10\" step=\"10\" onchange=\"App.saveAudioInterval(this.value)\"></div>\n" +
"          <button class=\"btn secondary\" onclick=\"App.testAudio()\">Testar voz</button>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 8px;\">Alarme de transecção (só neste aparelho)</h2>\n" +
"        <p class=\"hint\">Avisa por voz assim que a taxa (somando os 4 quadrantes) ultrapassar o limite que você definir — pra decidir em tempo real durante a cirurgia.</p>\n" +
"        <div class=\"row\" style=\"align-items:center;gap:16px;margin-top:10px;flex-wrap:wrap;\">\n" +
"          <label class=\"switch\"><input type=\"checkbox\" id=\"alert-parcial-toggle\" onchange=\"App.toggleAlertParcial(this.checked)\"><span class=\"slider\"></span></label>\n" +
"          <div class=\"field\" style=\"margin:0;max-width:260px;\"><label>Avisar se transecção parcial passar de (%)</label><input type=\"number\" id=\"alert-parcial-threshold\" min=\"0\" max=\"100\" step=\"0.5\" placeholder=\"Ex: 7\" onchange=\"App.saveAlertParcialThreshold(this.value)\"></div>\n" +
"        </div>\n" +
"        <div class=\"row\" style=\"align-items:center;gap:16px;margin-top:10px;flex-wrap:wrap;\">\n" +
"          <label class=\"switch\"><input type=\"checkbox\" id=\"alert-total-toggle\" onchange=\"App.toggleAlertTotal(this.checked)\"><span class=\"slider\"></span></label>\n" +
"          <div class=\"field\" style=\"margin:0;max-width:260px;\"><label>Avisar se transecção total passar de (%)</label><input type=\"number\" id=\"alert-total-threshold\" min=\"0\" max=\"100\" step=\"0.5\" placeholder=\"Ex: 5\" onchange=\"App.saveAlertTotalThreshold(this.value)\"></div>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 10px;\">Resumo geral (todos os quadrantes)</h2>\n" +
"        <div class=\"summary-bar static\">\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-extraidos\">0</div><div class=\"lbl\">Folículos extraídos</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-fios\">0</div><div class=\"lbl\">Total de fios</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-indice\">0.00</div><div class=\"lbl\">Índice fios/folículo</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-transec-parcial\">0%</div><div class=\"lbl\">Transecção parcial</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-transec-total\">0%</div><div class=\"lbl\">Transecção total</div></div>\n" +
"        </div>\n" +
"        <div class=\"summary-bar static\" id=\"geral-mamba-summary\" style=\"display:none;margin-top:10px;\">\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-mamba-val\">0</div><div class=\"lbl\">Mamba (leitura final)</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-mamba-manip\">0</div><div class=\"lbl\">Folículos manipulados</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-mamba-diff\">0</div><div class=\"lbl\">Diferença</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-mamba-diffpct\">0%</div><div class=\"lbl\">Diferença (% do Mamba)</div></div>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <div class=\"row\" id=\"quadrant-tabs\" style=\"gap:8px;margin-top:14px;flex-wrap:wrap;\"></div>\n" +
"\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 4px;\" id=\"quad-title\">—</h2>\n" +
"        <div class=\"hint\" style=\"margin-bottom:10px;\">Preencha o Mamba na ordem em que os quadrantes forem extraídos. O valor é a leitura acumulada do aparelho ao final deste quadrante — o app calcula sozinho a diferença em relação ao quadrante anterior.</div>\n" +
"        <div class=\"field\" style=\"max-width:280px;margin-bottom:0;\">\n" +
"          <label>Mamba (leitura acumulada ao final deste quadrante)</label>\n" +
"          <input type=\"number\" id=\"quad-mamba-input\" min=\"0\" placeholder=\"Ex: 1000\" onchange=\"App.setQuadMamba(this.value)\">\n" +
"        </div>\n" +
"        <div class=\"summary-bar static\" id=\"quad-mamba-summary\" style=\"display:none;margin-top:14px;\">\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"quad-mamba-val\">0</div><div class=\"lbl\">Mamba deste quadrante</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"quad-mamba-manip\">0</div><div class=\"lbl\">Folículos manipulados</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"quad-mamba-diff\">0</div><div class=\"lbl\">Diferença</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"quad-mamba-diffpct\">0%</div><div class=\"lbl\">Diferença (% do Mamba)</div></div>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <div class=\"summary-bar\">\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-extraidos\">0</div><div class=\"lbl\">Folículos extraídos</div></div>\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-fios\">0</div><div class=\"lbl\">Total de fios</div></div>\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-indice\">0.00</div><div class=\"lbl\">Índice fios/folículo</div></div>\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-transec-parcial\">0%</div><div class=\"lbl\">Transecção parcial</div></div>\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-transec-total\">0%</div><div class=\"lbl\">Transecção total</div></div>\n" +
"      </div>\n" +
"\n" +
"      <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-integro)\"></span>Folículos íntegros</h3><div id=\"group-integro\"></div>\n" +
"      <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-parcial)\"></span>Transecção parcial (folículo aproveitado)</h3><div id=\"group-parcial\"></div>\n" +
"      <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-total)\"></span>Transecção total (folículo perdido)</h3><div id=\"group-total\"></div>\n" +
"    </div>\n" +
"\n" +
"    <div id=\"panel-preincisoes\" style=\"display:none;\">\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 10px;\">Tempo de pré-incisões</h2>\n" +
"        <div class=\"row\" style=\"align-items:center;gap:16px;flex-wrap:wrap;\">\n" +
"          <div id=\"preinc-timer-display\" style=\"font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--c-primary-dark);\">00:00:00</div>\n" +
"          <div class=\"row\" style=\"gap:8px;\"><button class=\"btn\" id=\"preinc-timer-toggle-btn\" onclick=\"App.togglePreincTimer()\">Iniciar</button><button class=\"btn secondary\" onclick=\"App.resetPreincTimer()\">Zerar</button></div>\n" +
"        </div>\n" +
"        <div class=\"hint\" id=\"preinc-timer-rate\" style=\"margin-top:8px;\"></div>\n" +
"      </div>\n" +
"      <div class=\"summary-bar static\">\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"preinc-total\">0</div><div class=\"lbl\">Total de pré-incisões</div></div>\n" +
"      </div>\n" +
"      <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-preinc)\"></span>Pré-incisões por área</h3>\n" +
"      <p class=\"hint\" style=\"margin-top:-4px;margin-bottom:10px;\">Toque no número pra digitar o total daquela área.</p>\n" +
"      <div id=\"group-preincisoes\"></div>\n" +
"    </div>\n" +
"\n" +
"    <div id=\"panel-fotos\" style=\"display:none;\">\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 4px;\">Marcação cirúrgica</h2>\n" +
"        <p class=\"hint\" style=\"margin-bottom:10px;\">Ficam salvas neste servidor — visíveis em todos os celulares conectados.</p>\n" +
"        <input type=\"file\" accept=\"image/*\" multiple capture=\"environment\" onchange=\"App.uploadPhotos('marcacao', this)\">\n" +
"        <div class=\"photo-grid\" id=\"photos-grid-marcacao\"></div>\n" +
"      </div>\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 4px;\">Pós-operatório imediato</h2>\n" +
"        <input type=\"file\" accept=\"image/*\" multiple capture=\"environment\" onchange=\"App.uploadPhotos('posop', this)\">\n" +
"        <div class=\"photo-grid\" id=\"photos-grid-posop\"></div>\n" +
"      </div>\n" +
"    </div>\n" +
"\n" +
"    <footer class=\"actions\">\n" +
"      <button class=\"btn secondary\" onclick=\"App.printReport()\">Imprimir / Salvar PDF</button>\n" +
"      <button class=\"btn secondary\" id=\"btn-finalizar\" onclick=\"App.finalizeSession()\">Finalizar cirurgia</button>\n" +
"      <button class=\"btn secondary\" id=\"btn-reabrir\" style=\"display:none;\" onclick=\"App.reopenSession()\">Reabrir</button>\n" +
"    </footer>\n" +
"  </section>\n" +
"</div>\n" +
"<div class=\"toast\" id=\"toast\"></div>\n" +
"<div id=\"print-report\"></div>\n" +
"<script>\n" +
"(function(){\n" +
"'use strict';\n" +
"var CATS = [\n" +
"  {id:'f1',label:'1 fio',hairs:1,group:'integro'},\n" +
"  {id:'f1fino',label:'1 fio fino',hairs:1,group:'integro'},\n" +
"  {id:'f2',label:'2 fios',hairs:2,group:'integro'},\n" +
"  {id:'f2fino',label:'2 fios fino',hairs:2,group:'integro'},\n" +
"  {id:'f3',label:'3 fios',hairs:3,group:'integro'},\n" +
"  {id:'f4',label:'4 fios',hairs:4,group:'integro'},\n" +
"  {id:'t2_1',label:'2 → 1 fio',hairs:1,group:'parcial'},\n" +
"  {id:'t3_2',label:'3 → 2 fios',hairs:2,group:'parcial'},\n" +
"  {id:'t3_1',label:'3 → 1 fio',hairs:1,group:'parcial'},\n" +
"  {id:'t4_3',label:'4 → 3 fios',hairs:3,group:'parcial'},\n" +
"  {id:'t4_2',label:'4 → 2 fios',hairs:2,group:'parcial'},\n" +
"  {id:'t4_1',label:'4 → 1 fio',hairs:1,group:'parcial'},\n" +
"  {id:'ttotal',label:'Transecção total (folículo perdido)',hairs:0,group:'total'}\n" +
"];\n" +
"var QUADRANTS = [\n" +
"  {id:'temporal_dir',label:'Temporal direito'},\n" +
"  {id:'temporal_esq',label:'Temporal esquerdo'},\n" +
"  {id:'occipital_dir',label:'Occipital direito'},\n" +
"  {id:'occipital_esq',label:'Occipital esquerdo'}\n" +
"];\n" +
"var PREINC_AREAS = [\n" +
"  {id:'recesso_dir',label:'Recesso direito'},{id:'recesso_esq',label:'Recesso esquerdo'},\n" +
"  {id:'linha',label:'Linha'},{id:'sublinha',label:'Sublinha'},\n" +
"  {id:'entrada_dir1',label:'Entrada direita 1'},{id:'entrada_dir2',label:'Entrada direita 2'},\n" +
"  {id:'entrada_esq1',label:'Entrada esquerda 1'},{id:'entrada_esq2',label:'Entrada esquerda 2'},\n" +
"  {id:'topete1',label:'Topete 1'},{id:'topete2',label:'Topete 2'},\n" +
"  {id:'scalp',label:'Scalp'},{id:'coroa',label:'Coroa'}\n" +
"];\n" +
"var DEFAULT_INCREMENTS = [10,50,100];\n" +
"function quadrantById(id){ for (var i=0;i<QUADRANTS.length;i++){ if (QUADRANTS[i].id===id) return QUADRANTS[i]; } return null; }\n" +
"function computeSummary(counts){\n" +
"  var integros=0, parciais=0, totalPerdidos=0, totalFios=0;\n" +
"  CATS.forEach(function(c){\n" +
"    var n = counts[c.id]||0;\n" +
"    if (c.group==='integro'){ integros+=n; totalFios+=n*c.hairs; }\n" +
"    else if (c.group==='parcial'){ parciais+=n; totalFios+=n*c.hairs; }\n" +
"    else if (c.group==='total'){ totalPerdidos+=n; }\n" +
"  });\n" +
"  var foliculosExtraidos = integros+parciais;\n" +
"  var foliculosManipulados = integros+parciais+totalPerdidos;\n" +
"  var indice = foliculosExtraidos>0 ? totalFios/foliculosExtraidos : 0;\n" +
"  var taxaParcial = foliculosManipulados>0 ? parciais/foliculosManipulados*100 : 0;\n" +
"  var taxaTotal = foliculosManipulados>0 ? totalPerdidos/foliculosManipulados*100 : 0;\n" +
"  return {integros:integros,parciais:parciais,totalPerdidos:totalPerdidos,foliculosExtraidos:foliculosExtraidos,foliculosManipulados:foliculosManipulados,totalFios:totalFios,indice:indice,taxaParcial:taxaParcial,taxaTotal:taxaTotal};\n" +
"}\n" +
"function combinedExtractionCounts(s){\n" +
"  var combined = {}; CATS.forEach(function(c){ combined[c.id]=0; });\n" +
"  QUADRANTS.forEach(function(qd){\n" +
"    var qc = s.quadrants[qd.id].counts;\n" +
"    CATS.forEach(function(c){ combined[c.id] = (combined[c.id]||0) + (qc[c.id]||0); });\n" +
"  });\n" +
"  return combined;\n" +
"}\n" +
"function mambaPrevCumulativo(s, quadId){\n" +
"  var idx=-1;\n" +
"  for (var i=0;i<QUADRANTS.length;i++){ if (QUADRANTS[i].id===quadId){ idx=i; break; } }\n" +
"  for (var j=idx-1;j>=0;j--){\n" +
"    var v = s.quadrants[QUADRANTS[j].id].mambaCumulativo;\n" +
"    if (v!==null && v!==undefined && v!=='') return Number(v);\n" +
"  }\n" +
"  return 0;\n" +
"}\n" +
"function mambaFinalCumulativo(s){\n" +
"  for (var i=QUADRANTS.length-1;i>=0;i--){\n" +
"    var v = s.quadrants[QUADRANTS[i].id].mambaCumulativo;\n" +
"    if (v!==null && v!==undefined && v!=='') return Number(v);\n" +
"  }\n" +
"  return null;\n" +
"}\n" +
"function computeMambaDiff(mambaCount, manipulados){\n" +
"  if (mambaCount===null||mambaCount===undefined||mambaCount==='') return null;\n" +
"  var mamba = Number(mambaCount);\n" +
"  var diff = mamba - manipulados;\n" +
"  var diffPct = mamba>0 ? diff/mamba*100 : 0;\n" +
"  return {mamba:mamba, manipulados:manipulados, diff:diff, diffPct:diffPct};\n" +
"}\n" +
"function preincTotal(counts){ var t=0; PREINC_AREAS.forEach(function(a){ t+=counts[a.id]||0; }); return t; }\n" +
"function fmtHMS(ms){\n" +
"  var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;\n" +
"  function pad(n){return String(n).padStart(2,'0');}\n" +
"  return pad(h)+':'+pad(m)+':'+pad(sec);\n" +
"}\n" +
"function escapeHtml(str){\n" +
"  return String(str==null?'':str).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\\'':'&#39;'}[c];});\n" +
"}\n" +
"function elapsedMs(timer){ return (timer.accumulatedMs||0) + (timer.running ? (Date.now()-timer.startedAt) : 0); }\n" +
"var state = {currentId:null, session:null, pollHandle:null, connOk:true, increments:DEFAULT_INCREMENTS.slice(), activeTab:'extracao', activeQuadrant:QUADRANTS[0].id, audioEnabled:false, audioInterval:100, lastAnnounced:0, baseUrl:null, alertParcialEnabled:false, alertParcialThreshold:null, alertParcialFired:false, alertTotalEnabled:false, alertTotalThreshold:null, alertTotalFired:false, currentUser:null};\n" +
"function shareUrlFor(id){ return (state.baseUrl||window.location.origin) + '/s/' + id; }\n" +
"function resolveBaseUrl(){\n" +
"  return fetch('/api/network-info').then(function(r){ return r.json(); }).then(function(info){\n" +
"    var ip = (info.ips && info.ips.length) ? info.ips[0] : null;\n" +
"    state.baseUrl = ip ? ('http://'+ip+':'+info.port) : window.location.origin;\n" +
"  }).catch(function(){ state.baseUrl = window.location.origin; });\n" +
"}\n" +
"var toastTimer=null;\n" +
"function toast(msg, dur){ var el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(function(){el.classList.remove('show');}, dur||1800); }\n" +
"function setConn(ok){ state.connOk = ok; document.getElementById('conn-dot').className = 'conn-dot ' + (ok?'ok':'bad'); document.getElementById('conn-banner').className = 'conn-banner' + (ok?'':' show'); }\n" +
"function api(p, method, body){\n" +
"  return fetch(p, {method:method||'GET', credentials:'same-origin', headers: body?{'Content-Type':'application/json'}:undefined, body: body?JSON.stringify(body):undefined})\n" +
"    .then(function(r){ setConn(true); if (!r.ok) return r.json().then(function(e){ throw new Error(e.error||('HTTP '+r.status)); }); return r.json(); })\n" +
"    .catch(function(err){ setConn(false); throw err; });\n" +
"}\n" +
"function showScreen(name){ document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');}); document.getElementById('screen-'+name).classList.add('active'); }\n" +
"var INCREMENTS_KEY = 'fue_live_increments';\n" +
"function loadIncrementSettings(){\n" +
"  try{\n" +
"    var raw = localStorage.getItem(INCREMENTS_KEY);\n" +
"    var arr = raw ? JSON.parse(raw) : null;\n" +
"    state.increments = (Array.isArray(arr) && arr.length) ? arr : DEFAULT_INCREMENTS.slice();\n" +
"  }catch(e){ state.increments = DEFAULT_INCREMENTS.slice(); }\n" +
"}\n" +
"function saveIncrementSettings(){ localStorage.setItem(INCREMENTS_KEY, JSON.stringify(state.increments)); }\n" +
"function renderSettingsScreen(){\n" +
"  var editor = document.getElementById('increments-editor');\n" +
"  editor.innerHTML = state.increments.map(function(v, idx){\n" +
"    return '<div class=\"inc-row\"><input type=\"number\" min=\"1\" value=\"'+v+'\" data-idx=\"'+idx+'\" onchange=\"App.updateIncrementField(this)\">'+\n" +
"      '<button class=\"btn secondary\" onclick=\"App.removeIncrementField('+idx+')\">Remover</button></div>';\n" +
"  }).join('');\n" +
"}\n" +
"var App = {};\n" +
"App.goHome = function(){ stopPolling(); state.currentId=null; history.pushState({},'','/'); App.checkAuthAndShowHome(); };\n" +
"function renderUserBar(){\n" +
"  var el = document.getElementById('user-bar');\n" +
"  if (state.currentUser){\n" +
"    el.innerHTML = escapeHtml(state.currentUser.nomeCompleto.split(' ')[0])+' <button class=\"icon-btn\" onclick=\"App.logout()\">Sair</button>';\n" +
"  } else {\n" +
"    el.innerHTML = '';\n" +
"  }\n" +
"}\n" +
"App.checkAuthAndShowHome = function(){\n" +
"  api('/api/me').then(function(r){\n" +
"    state.currentUser = r.user; renderUserBar(); showScreen('home'); loadSurgeryList();\n" +
"  }).catch(function(){\n" +
"    state.currentUser = null; renderUserBar(); showScreen('auth'); App.switchAuthTab('login');\n" +
"  });\n" +
"};\n" +
"App.switchAuthTab = function(tab){\n" +
"  document.getElementById('authpanel-login').style.display = tab==='login' ? '' : 'none';\n" +
"  document.getElementById('authpanel-cadastro').style.display = tab==='cadastro' ? '' : 'none';\n" +
"  document.getElementById('authtab-login-btn').className = tab==='login' ? 'btn' : 'btn secondary';\n" +
"  document.getElementById('authtab-cadastro-btn').className = tab==='cadastro' ? 'btn' : 'btn secondary';\n" +
"};\n" +
"App.doLogin = function(){\n" +
"  var email = document.getElementById('login-email').value.trim();\n" +
"  var password = document.getElementById('login-password').value;\n" +
"  if (!email || !password){ toast('Preencha e-mail e senha.'); return; }\n" +
"  api('/api/login','POST',{email:email, password:password}).then(function(r){\n" +
"    state.currentUser = r.user; renderUserBar(); showScreen('home'); loadSurgeryList();\n" +
"    toast('Bem-vindo(a), '+r.user.nomeCompleto.split(' ')[0]+'.');\n" +
"  }).catch(function(err){ toast('Erro: '+err.message); });\n" +
"};\n" +
"App.doRegister = function(){\n" +
"  var nomeCompleto = document.getElementById('reg-nome').value.trim();\n" +
"  var crm = document.getElementById('reg-crm').value.trim();\n" +
"  var email = document.getElementById('reg-email').value.trim();\n" +
"  var telefone = document.getElementById('reg-telefone').value.trim();\n" +
"  var password = document.getElementById('reg-password').value;\n" +
"  var password2 = document.getElementById('reg-password2').value;\n" +
"  if (!nomeCompleto || !crm || !email || !telefone || !password){ toast('Preencha todos os campos.'); return; }\n" +
"  if (password !== password2){ toast('As senhas não coincidem.'); return; }\n" +
"  if (password.length < 6){ toast('A senha precisa ter pelo menos 6 caracteres.'); return; }\n" +
"  api('/api/register','POST',{nomeCompleto:nomeCompleto, crm:crm, email:email, telefone:telefone, password:password}).then(function(r){\n" +
"    state.currentUser = r.user; renderUserBar(); showScreen('home'); loadSurgeryList();\n" +
"    toast('Conta criada. Bem-vindo(a), '+r.user.nomeCompleto.split(' ')[0]+'.');\n" +
"  }).catch(function(err){ toast('Erro: '+err.message); });\n" +
"};\n" +
"App.logout = function(){\n" +
"  api('/api/logout','POST',{}).then(function(){\n" +
"    state.currentUser = null; renderUserBar(); showScreen('auth'); App.switchAuthTab('login');\n" +
"    toast('Você saiu.');\n" +
"  }).catch(function(){});\n" +
"};\n" +
"App.showSettings = function(){ renderSettingsScreen(); showScreen('settings'); };\n" +
"App.addIncrementField = function(){ state.increments.push(1); renderSettingsScreen(); };\n" +
"App.updateIncrementField = function(inputEl){\n" +
"  var idx = parseInt(inputEl.getAttribute('data-idx'),10);\n" +
"  var val = parseInt(inputEl.value,10);\n" +
"  if (isNaN(val) || val<1) val = 1;\n" +
"  state.increments[idx] = val;\n" +
"};\n" +
"App.removeIncrementField = function(idx){ state.increments.splice(idx,1); renderSettingsScreen(); };\n" +
"App.saveSettings = function(){\n" +
"  if (!state.increments.length){ toast('Adicione ao menos um valor.'); return; }\n" +
"  saveIncrementSettings();\n" +
"  toast('Configurações salvas.');\n" +
"  if (state.session) render();\n" +
"};\n" +
"App.resetSettings = function(){\n" +
"  state.increments = DEFAULT_INCREMENTS.slice();\n" +
"  saveIncrementSettings();\n" +
"  renderSettingsScreen();\n" +
"  toast('Padrão restaurado.');\n" +
"  if (state.session) render();\n" +
"};\n" +
"function loadSurgeryList(){\n" +
"  api('/api/sessions').then(function(list){\n" +
"    var el = document.getElementById('surgery-list');\n" +
"    if (!list.length){ el.innerHTML = '<div class=\"empty-state\">Você ainda não criou nenhuma cirurgia.</div>'; return; }\n" +
"    el.innerHTML = list.map(function(s){\n" +
"      var sum = computeSummary(combinedExtractionCounts(s));\n" +
"      var badgeClass = s.status==='finalizada'?'finalizada':'andamento';\n" +
"      return '<div class=\"surgery-card\"><div><b>'+escapeHtml(s.codigo)+'</b><div class=\"hint\">'+sum.foliculosExtraidos+' folículos · índice '+sum.indice.toFixed(2)+'</div></div>'+\n" +
"        '<div style=\"text-align:right;\"><span class=\"badge '+badgeClass+'\">'+(s.status==='finalizada'?'Finalizada':'Em andamento')+'</span><br>'+\n" +
"        '<button class=\"btn secondary\" style=\"margin-top:8px;\" onclick=\"App.openSession(\\''+s.id+'\\')\">Abrir</button></div></div>';\n" +
"    }).join('');\n" +
"  }).catch(function(){ toast('Não consegui falar com o servidor.'); });\n" +
"}\n" +
"App.createSession = function(){\n" +
"  var codigo = document.getElementById('new-codigo').value.trim();\n" +
"  if (!codigo){ toast('Informe um código ou iniciais do paciente.'); return; }\n" +
"  api('/api/session','POST',{codigo:codigo}).then(function(s){ document.getElementById('new-codigo').value=''; App.openSession(s.id); }).catch(function(err){ toast('Erro: '+err.message); });\n" +
"};\n" +
"App.openSession = function(id){ state.currentId=id; state.activeQuadrant=QUADRANTS[0].id; history.pushState({},'','/s/'+id); loadAudioPrefs(id); showScreen('counting'); App.switchTab('extracao'); fetchAndRender().then(function(){ startPolling(); }); };\n" +
"function fetchAndRender(){ return api('/api/session/'+state.currentId).then(function(s){ state.session=s; render(); }).catch(function(){ toast('Cirurgia não encontrada neste servidor.'); }); }\n" +
"function startPolling(){ stopPolling(); state.pollHandle = setInterval(function(){ fetchAndRender(); }, 1500); }\n" +
"function stopPolling(){ if (state.pollHandle){ clearInterval(state.pollHandle); state.pollHandle=null; } }\n" +
"App.switchTab = function(tab){\n" +
"  state.activeTab = tab;\n" +
"  var panels = {extracao:'panel-extracao', preincisoes:'panel-preincisoes', fotos:'panel-fotos'};\n" +
"  var btns = {extracao:'tab-extracao-btn', preincisoes:'tab-preinc-btn', fotos:'tab-fotos-btn'};\n" +
"  Object.keys(panels).forEach(function(key){\n" +
"    document.getElementById(panels[key]).style.display = (key===tab) ? '' : 'none';\n" +
"    document.getElementById(btns[key]).className = (key===tab) ? 'btn' : 'btn secondary';\n" +
"  });\n" +
"};\n" +
"App.switchQuadrant = function(quadId){ state.activeQuadrant = quadId; render(); };\n" +
"function render(){\n" +
"  var s = state.session; if (!s) return;\n" +
"  document.getElementById('cnt-codigo').textContent = s.codigo;\n" +
"  document.getElementById('cnt-meta').textContent = new Date(s.createdAt).toLocaleString('pt-BR');\n" +
"  var badge = document.getElementById('cnt-status');\n" +
"  badge.textContent = s.status==='finalizada'?'Finalizada':'Em andamento';\n" +
"  badge.className = 'badge ' + (s.status==='finalizada'?'finalizada':'andamento');\n" +
"  document.getElementById('btn-finalizar').style.display = s.status==='finalizada'?'none':'inline-block';\n" +
"  document.getElementById('btn-reabrir').style.display = s.status==='finalizada'?'inline-block':'none';\n" +
"  document.getElementById('share-url').textContent = shareUrlFor(s.id);\n" +
"  var readonly = s.status==='finalizada';\n" +
"\n" +
"  var combined = combinedExtractionCounts(s);\n" +
"  var sum = computeSummary(combined);\n" +
"  document.getElementById('geral-extraidos').textContent = sum.foliculosExtraidos;\n" +
"  document.getElementById('geral-fios').textContent = sum.totalFios;\n" +
"  document.getElementById('geral-indice').textContent = sum.indice.toFixed(2);\n" +
"  document.getElementById('geral-transec-parcial').textContent = sum.taxaParcial.toFixed(1)+'%';\n" +
"  document.getElementById('geral-transec-total').textContent = sum.taxaTotal.toFixed(1)+'%';\n" +
"  var finalMamba = mambaFinalCumulativo(s);\n" +
"  var mdiffGeral = computeMambaDiff(finalMamba, sum.foliculosManipulados);\n" +
"  var geralBox = document.getElementById('geral-mamba-summary');\n" +
"  if (mdiffGeral){\n" +
"    geralBox.style.display='grid';\n" +
"    document.getElementById('geral-mamba-val').textContent = mdiffGeral.mamba;\n" +
"    document.getElementById('geral-mamba-manip').textContent = mdiffGeral.manipulados;\n" +
"    document.getElementById('geral-mamba-diff').textContent = (mdiffGeral.diff>0?'+':'')+mdiffGeral.diff;\n" +
"    document.getElementById('geral-mamba-diffpct').textContent = (mdiffGeral.diffPct>0?'+':'')+mdiffGeral.diffPct.toFixed(1)+'%';\n" +
"  } else { geralBox.style.display='none'; }\n" +
"\n" +
"  var tabsEl = document.getElementById('quadrant-tabs');\n" +
"  tabsEl.innerHTML = QUADRANTS.map(function(q){\n" +
"    var cls = (q.id===state.activeQuadrant) ? 'btn' : 'btn secondary';\n" +
"    return '<button class=\"'+cls+'\" onclick=\"App.switchQuadrant(\\''+q.id+'\\')\">'+escapeHtml(q.label)+'</button>';\n" +
"  }).join('');\n" +
"  var quad = s.quadrants[state.activeQuadrant];\n" +
"  document.getElementById('quad-title').textContent = quadrantById(state.activeQuadrant).label;\n" +
"  var qsum = computeSummary(quad.counts);\n" +
"  document.getElementById('quad-extraidos').textContent = qsum.foliculosExtraidos;\n" +
"  document.getElementById('quad-fios').textContent = qsum.totalFios;\n" +
"  document.getElementById('quad-indice').textContent = qsum.indice.toFixed(2);\n" +
"  document.getElementById('quad-transec-parcial').textContent = qsum.taxaParcial.toFixed(1)+'%';\n" +
"  document.getElementById('quad-transec-total').textContent = qsum.taxaTotal.toFixed(1)+'%';\n" +
"  var quadInput = document.getElementById('quad-mamba-input');\n" +
"  if (document.activeElement !== quadInput) quadInput.value = (quad.mambaCumulativo===null||quad.mambaCumulativo===undefined) ? '' : quad.mambaCumulativo;\n" +
"  var quadBox = document.getElementById('quad-mamba-summary');\n" +
"  if (quad.mambaCumulativo===null||quad.mambaCumulativo===undefined||quad.mambaCumulativo===''){\n" +
"    quadBox.style.display='none';\n" +
"  } else {\n" +
"    var prev = mambaPrevCumulativo(s, state.activeQuadrant);\n" +
"    var delta = Number(quad.mambaCumulativo) - prev;\n" +
"    var qmdiff = computeMambaDiff(delta, qsum.foliculosManipulados);\n" +
"    if (qmdiff){\n" +
"      quadBox.style.display='grid';\n" +
"      document.getElementById('quad-mamba-val').textContent = qmdiff.mamba;\n" +
"      document.getElementById('quad-mamba-manip').textContent = qmdiff.manipulados;\n" +
"      document.getElementById('quad-mamba-diff').textContent = (qmdiff.diff>0?'+':'')+qmdiff.diff;\n" +
"      document.getElementById('quad-mamba-diffpct').textContent = (qmdiff.diffPct>0?'+':'')+qmdiff.diffPct.toFixed(1)+'%';\n" +
"    } else { quadBox.style.display='none'; }\n" +
"  }\n" +
"\n" +
"  ['integro','parcial','total'].forEach(function(group){\n" +
"    var container = document.getElementById('group-'+group);\n" +
"    container.innerHTML = CATS.filter(function(c){return c.group===group;}).map(function(c){\n" +
"      var n = quad.counts[c.id]||0;\n" +
"      var hairsNote = c.hairs>0 ? (c.hairs+(c.hairs===1?' fio':' fios')+' por folículo') : '0 fios (perdido)';\n" +
"      var btns = readonly ? '' : incBtns(c.id);\n" +
"      return '<div class=\"cat-row group-'+group+'\"><div class=\"cat-label\">'+escapeHtml(c.label)+'<span class=\"cat-hairs\">'+hairsNote+'</span></div>'+\n" +
"        '<div class=\"cat-count\">'+n+'</div><div class=\"cat-btns\">'+btns+'</div></div>';\n" +
"    }).join('');\n" +
"  });\n" +
"\n" +
"  var t = elapsedMs(s.timer);\n" +
"  document.getElementById('timer-display').textContent = fmtHMS(t);\n" +
"  document.getElementById('timer-toggle-btn').textContent = s.timer.running ? 'Pausar' : 'Iniciar';\n" +
"  var rateEl = document.getElementById('timer-rate');\n" +
"  if (t>0 && sum.foliculosExtraidos>0){ rateEl.textContent = 'Ritmo médio: '+(sum.foliculosExtraidos/(t/3600000)).toFixed(0)+' folículos/hora'; } else { rateEl.textContent=''; }\n" +
"\n" +
"  var tp = elapsedMs(s.preincTimer);\n" +
"  document.getElementById('preinc-timer-display').textContent = fmtHMS(tp);\n" +
"  document.getElementById('preinc-timer-toggle-btn').textContent = s.preincTimer.running ? 'Pausar' : 'Iniciar';\n" +
"  var pTotal = preincTotal(s.preincCounts);\n" +
"  var prateEl = document.getElementById('preinc-timer-rate');\n" +
"  if (tp>0 && pTotal>0){ prateEl.textContent = 'Ritmo médio: '+(pTotal/(tp/3600000)).toFixed(0)+' pré-incisões/hora'; } else { prateEl.textContent=''; }\n" +
"  document.getElementById('preinc-total').textContent = pTotal;\n" +
"\n" +
"  checkAudioMilestone(sum.foliculosExtraidos);\n" +
"  checkTransectionAlerts(sum.taxaParcial, sum.taxaTotal);\n" +
"  renderPreinc(s);\n" +
"  renderPhotos(s);\n" +
"}\n" +
"function incBtns(catId){\n" +
"  var html = '<button class=\"cat-btn minus\" onclick=\"App.adjust(\\''+catId+'\\',-1)\">-1</button>';\n" +
"  html += '<button class=\"cat-btn\" onclick=\"App.adjust(\\''+catId+'\\',1)\">+1</button>';\n" +
"  state.increments.forEach(function(v){ html += '<button class=\"cat-btn\" onclick=\"App.adjust(\\''+catId+'\\','+v+')\">+'+v+'</button>'; });\n" +
"  return html;\n" +
"}\n" +
"App.adjust = function(catId, delta){\n" +
"  if (!state.currentId) return;\n" +
"  var quad = state.activeQuadrant;\n" +
"  if (state.session){\n" +
"    var counts = state.session.quadrants[quad].counts;\n" +
"    counts[catId] = Math.max(0, (counts[catId]||0) + delta);\n" +
"    render();\n" +
"  }\n" +
"  api('/api/session/'+state.currentId+'/adjust','POST',{quadrant:quad, category:catId, delta:delta}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast('Não sincronizou: '+err.message); fetchAndRender(); });\n" +
"};\n" +
"App.setQuadMamba = function(value){\n" +
"  var quad = state.activeQuadrant;\n" +
"  var v = value===''? null : Number(value);\n" +
"  api('/api/session/'+state.currentId+'/mamba','POST',{quadrant:quad, value:v}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast('Erro: '+err.message); });\n" +
"};\n" +
"function renderPreinc(s){\n" +
"  var readonly = s.status==='finalizada';\n" +
"  var container = document.getElementById('group-preincisoes');\n" +
"  container.innerHTML = PREINC_AREAS.map(function(a){\n" +
"    var n = s.preincCounts[a.id]||0;\n" +
"    var cls = readonly ? 'cat-count' : 'cat-count clickable';\n" +
"    var click = readonly ? '' : ' onclick=\"App.editPreinc(\\''+a.id+'\\')\"';\n" +
"    return '<div class=\"cat-row group-preinc\"><div class=\"cat-label\">'+escapeHtml(a.label)+'</div>'+\n" +
"      '<div class=\"'+cls+'\"'+click+'>'+n+'</div></div>';\n" +
"  }).join('');\n" +
"}\n" +
"App.editPreinc = function(areaId){\n" +
"  var s = state.session; if (!s || s.status==='finalizada') return;\n" +
"  var area = PREINC_AREAS.filter(function(a){ return a.id===areaId; })[0];\n" +
"  var current = s.preincCounts[areaId]||0;\n" +
"  var input = window.prompt('Definir valor para \"'+(area?area.label:areaId)+'\":', current);\n" +
"  if (input===null) return;\n" +
"  var v = parseInt(input,10);\n" +
"  if (isNaN(v) || v<0){ toast('Valor inválido.'); return; }\n" +
"  api('/api/session/'+state.currentId+'/preinc','POST',{area:areaId, value:v}).then(function(s2){ state.session=s2; render(); }).catch(function(err){ toast('Erro: '+err.message); });\n" +
"};\n" +
"function renderPhotos(s){\n" +
"  ['marcacao','posop'].forEach(function(cat){\n" +
"    var el = document.getElementById('photos-grid-'+cat);\n" +
"    var list = s.photos[cat]||[];\n" +
"    el.innerHTML = list.map(function(p){\n" +
"      return '<div class=\"photo-thumb\"><img src=\"/api/session/'+s.id+'/photos/'+p.id+'\" loading=\"lazy\">'+\n" +
"        '<button class=\"photo-remove\" onclick=\"App.removePhoto(\\''+p.id+'\\')\">×</button></div>';\n" +
"    }).join('');\n" +
"  });\n" +
"}\n" +
"App.uploadPhotos = function(category, inputEl){\n" +
"  var files = Array.prototype.slice.call((inputEl && inputEl.files) || []);\n" +
"  if (!files.length) return;\n" +
"  toast('Enviando '+files.length+' foto(s)...');\n" +
"  var chain = Promise.resolve();\n" +
"  files.forEach(function(file){\n" +
"    chain = chain.then(function(){ return resizeImageFile(file, 1600, 0.82); })\n" +
"      .then(function(dataUrl){ return api('/api/session/'+state.currentId+'/photos','POST',{category:category, dataUrl:dataUrl}); })\n" +
"      .then(function(s){ state.session=s; render(); });\n" +
"  });\n" +
"  chain.then(function(){ inputEl.value=''; toast('Foto(s) enviada(s).'); })\n" +
"    .catch(function(err){ toast('Erro ao enviar foto: '+err.message); });\n" +
"};\n" +
"App.removePhoto = function(photoId){\n" +
"  if (!window.confirm('Remover esta foto?')) return;\n" +
"  api('/api/session/'+state.currentId+'/photos/'+photoId+'/delete','POST',{}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast('Erro: '+err.message); });\n" +
"};\n" +
"function resizeImageFile(file, maxDim, quality){\n" +
"  return new Promise(function(resolve, reject){\n" +
"    var reader = new FileReader();\n" +
"    reader.onload = function(e){\n" +
"      var img = new Image();\n" +
"      img.onload = function(){\n" +
"        var w=img.width, h=img.height;\n" +
"        var scale = Math.min(1, maxDim/Math.max(w,h));\n" +
"        var cw = Math.max(1, Math.round(w*scale)), ch = Math.max(1, Math.round(h*scale));\n" +
"        var canvas = document.createElement('canvas'); canvas.width=cw; canvas.height=ch;\n" +
"        var ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,cw,ch);\n" +
"        resolve(canvas.toDataURL('image/jpeg', quality));\n" +
"      };\n" +
"      img.onerror = function(){ reject(new Error('HEIC_DECODE_FAIL')); };\n" +
"      img.src = e.target.result;\n" +
"    };\n" +
"    reader.onerror = function(){ reject(new Error('Não li o arquivo.')); };\n" +
"    reader.readAsDataURL(file);\n" +
"  });\n" +
"}\n" +
"App.toggleTimer = function(){\n" +
"  if (!state.currentId || !state.session) return;\n" +
"  var action = state.session.timer.running ? 'pause' : 'start';\n" +
"  api('/api/session/'+state.currentId+'/timer','POST',{action:action}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast('Erro: '+err.message); });\n" +
"};\n" +
"App.resetTimer = function(){ if (!window.confirm('Zerar o cronômetro desta cirurgia (afeta todos os aparelhos conectados)?')) return; api('/api/session/'+state.currentId+'/timer','POST',{action:'reset'}).then(function(s){ state.session=s; render(); }); };\n" +
"App.togglePreincTimer = function(){\n" +
"  if (!state.currentId || !state.session) return;\n" +
"  var action = state.session.preincTimer.running ? 'pause' : 'start';\n" +
"  api('/api/session/'+state.currentId+'/preinc-timer','POST',{action:action}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast('Erro: '+err.message); });\n" +
"};\n" +
"App.resetPreincTimer = function(){ if (!window.confirm('Zerar o cronômetro de pré-incisões (afeta todos os aparelhos conectados)?')) return; api('/api/session/'+state.currentId+'/preinc-timer','POST',{action:'reset'}).then(function(s){ state.session=s; render(); }); };\n" +
"App.finalizeSession = function(){ if (!window.confirm('Finalizar esta cirurgia? Trava as contagens em todos os aparelhos conectados.')) return; api('/api/session/'+state.currentId+'/finalize','POST',{}).then(function(s){ state.session=s; render(); toast('Cirurgia finalizada.'); }); };\n" +
"App.reopenSession = function(){ api('/api/session/'+state.currentId+'/reopen','POST',{}).then(function(s){ state.session=s; render(); toast('Cirurgia reaberta.'); }); };\n" +
"App.copyShareUrl = function(){\n" +
"  var url = shareUrlFor(state.currentId);\n" +
"  if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(function(){ toast('Endereço copiado.'); }, function(){ toast('Não deu pra copiar — selecione o texto manualmente.'); }); }\n" +
"  else { toast('Copie o endereço manualmente: '+url, 4000); }\n" +
"};\n" +
"App.shareViaSystem = function(){\n" +
"  var url = shareUrlFor(state.currentId);\n" +
"  var codigo = state.session ? state.session.codigo : '';\n" +
"  if (navigator.share){\n" +
"    navigator.share({title:'Contagem ao vivo — '+codigo, text:'Entrar na contagem da cirurgia '+codigo+':', url:url}).catch(function(){});\n" +
"  } else {\n" +
"    toast('Este navegador não tem a opção de compartilhar direto — use WhatsApp ou Copiar.', 3000);\n" +
"  }\n" +
"};\n" +
"App.shareViaWhatsapp = function(){\n" +
"  var url = shareUrlFor(state.currentId);\n" +
"  var codigo = state.session ? state.session.codigo : '';\n" +
"  var text = 'Entrar na contagem da cirurgia '+codigo+': '+url;\n" +
"  window.open('https://wa.me/?text='+encodeURIComponent(text), '_blank');\n" +
"};\n" +
"App.printReport = function(){\n" +
"  var s = state.session; if (!s) return;\n" +
"  var combined = combinedExtractionCounts(s);\n" +
"  var sum = computeSummary(combined);\n" +
"  var msPrint = elapsedMs(s.timer);\n" +
"  var ritmoPrint = (msPrint>0 && sum.foliculosExtraidos>0) ? (sum.foliculosExtraidos/(msPrint/3600000)) : null;\n" +
"  var finalMamba = mambaFinalCumulativo(s);\n" +
"  var mdiffGeral = computeMambaDiff(finalMamba, sum.foliculosManipulados);\n" +
"\n" +
"  var quadrantsHtml = QUADRANTS.map(function(q){\n" +
"    var qc = s.quadrants[q.id].counts;\n" +
"    var qsum = computeSummary(qc);\n" +
"    var rows = function(group){\n" +
"      return CATS.filter(function(c){return c.group===group;}).map(function(c){\n" +
"        var n = qc[c.id]||0;\n" +
"        return '<tr><td>'+escapeHtml(c.label)+'</td><td>'+c.hairs+'</td><td>'+n+'</td><td>'+(n*c.hairs)+'</td></tr>';\n" +
"      }).join('');\n" +
"    };\n" +
"    var mc = s.quadrants[q.id].mambaCumulativo;\n" +
"    var mcHtml = '';\n" +
"    if (mc!==null && mc!==undefined && mc!==''){\n" +
"      var prev = mambaPrevCumulativo(s, q.id);\n" +
"      var delta = Number(mc) - prev;\n" +
"      var qmdiff = computeMambaDiff(delta, qsum.foliculosManipulados);\n" +
"      mcHtml = '<div class=\"print-summary\">' +\n" +
"        '<div>Mamba (leitura acumulada)<br><b>'+mc+'</b></div>' +\n" +
"        '<div>Mamba deste quadrante<br><b>'+delta+'</b></div>' +\n" +
"        (qmdiff ? '<div>Diferença<br><b>'+(qmdiff.diff>0?'+':'')+qmdiff.diff+' ('+(qmdiff.diffPct>0?'+':'')+qmdiff.diffPct.toFixed(1)+'%)</b></div>' : '') +\n" +
"      '</div>';\n" +
"    }\n" +
"    return '' +\n" +
"      '<h2>Extração — '+escapeHtml(q.label)+'</h2>' +\n" +
"      '<div class=\"print-summary\">' +\n" +
"        '<div>Extraídos<br><b>'+qsum.foliculosExtraidos+'</b></div>' +\n" +
"        '<div>Total de fios<br><b>'+qsum.totalFios+'</b></div>' +\n" +
"        '<div>Índice<br><b>'+qsum.indice.toFixed(2)+'</b></div>' +\n" +
"        '<div>Transecção parcial<br><b>'+qsum.taxaParcial.toFixed(1)+'%</b></div>' +\n" +
"        '<div>Transecção total<br><b>'+qsum.taxaTotal.toFixed(1)+'%</b></div>' +\n" +
"      '</div>' +\n" +
"      mcHtml +\n" +
"      '<table><tr><th>Categoria</th><th>Fios/folículo</th><th>Qtde</th><th>Fios totais</th></tr>'+rows('integro')+rows('parcial')+rows('total')+'</table>';\n" +
"  }).join('');\n" +
"\n" +
"  var pTotal = preincTotal(s.preincCounts);\n" +
"  var msPreinc = elapsedMs(s.preincTimer);\n" +
"  var ritmoPreinc = (msPreinc>0 && pTotal>0) ? (pTotal/(msPreinc/3600000)) : null;\n" +
"  var preincRows = PREINC_AREAS.map(function(a){\n" +
"    return '<tr><td>'+escapeHtml(a.label)+'</td><td>'+(s.preincCounts[a.id]||0)+'</td></tr>';\n" +
"  }).join('');\n" +
"  var preincHtml = '<h2>Pré-incisões</h2>' +\n" +
"    '<div class=\"print-summary\">' +\n" +
"      '<div>Total de pré-incisões<br><b>'+pTotal+'</b></div>' +\n" +
"      '<div>Tempo de pré-incisões<br><b>'+fmtHMS(msPreinc)+'</b></div>' +\n" +
"      (ritmoPreinc ? '<div>Ritmo médio<br><b>'+ritmoPreinc.toFixed(0)+' pré-inc./h</b></div>' : '') +\n" +
"    '</div>' +\n" +
"    '<table><tr><th>Área</th><th>Pré-incisões</th></tr>'+preincRows+'</table>';\n" +
"\n" +
"  var photoBlock = function(cat, label){\n" +
"    var list = s.photos[cat]||[];\n" +
"    if (!list.length) return '';\n" +
"    return '<h2>'+label+'</h2><div class=\"photo-print-grid\">'+list.map(function(p){\n" +
"      return '<img src=\"/api/session/'+s.id+'/photos/'+p.id+'\">';\n" +
"    }).join('')+'</div>';\n" +
"  };\n" +
"  var hasPhotos = (s.photos.marcacao||[]).length || (s.photos.posop||[]).length;\n" +
"\n" +
"  var html = '' +\n" +
"    '<h1>Relatório de Extração Folicular</h1>' +\n" +
"    '<div>Paciente (código): <b>'+escapeHtml(s.codigo)+'</b> &nbsp;|&nbsp; Status: <b>'+(s.status==='finalizada'?'Finalizada':'Em andamento')+'</b></div>' +\n" +
"    '<h2>Resumo geral (todos os quadrantes)</h2>' +\n" +
"    '<div class=\"print-summary\">' +\n" +
"      '<div>Folículos extraídos<br><b>'+sum.foliculosExtraidos+'</b></div>' +\n" +
"      '<div>Total de fios<br><b>'+sum.totalFios+'</b></div>' +\n" +
"      '<div>Índice<br><b>'+sum.indice.toFixed(2)+'</b></div>' +\n" +
"      '<div>Transecção parcial<br><b>'+sum.taxaParcial.toFixed(1)+'%</b></div>' +\n" +
"      '<div>Transecção total<br><b>'+sum.taxaTotal.toFixed(1)+'%</b></div>' +\n" +
"      '<div>Tempo de cirurgia<br><b>'+fmtHMS(msPrint)+'</b></div>' +\n" +
"      (ritmoPrint ? '<div>Ritmo médio<br><b>'+ritmoPrint.toFixed(0)+' fol./h</b></div>' : '') +\n" +
"    '</div>' +\n" +
"    (mdiffGeral ? '<div class=\"print-summary\"><div>Mamba (leitura final)<br><b>'+mdiffGeral.mamba+'</b></div><div>Folículos manipulados<br><b>'+mdiffGeral.manipulados+'</b></div><div>Diferença<br><b>'+(mdiffGeral.diff>0?'+':'')+mdiffGeral.diff+' ('+(mdiffGeral.diffPct>0?'+':'')+mdiffGeral.diffPct.toFixed(1)+'%)</b></div></div>' : '') +\n" +
"    quadrantsHtml +\n" +
"    preincHtml +\n" +
"    (hasPhotos ? '<div class=\"photo-report-page\">'+photoBlock('marcacao','Fotos — Marcação cirúrgica')+photoBlock('posop','Fotos — Pós-operatório imediato')+'</div>' : '') +\n" +
"    '<p style=\"margin-top:16px;font-size:11px;color:#666;\">Gerado em '+new Date().toLocaleString('pt-BR')+'</p>';\n" +
"  document.getElementById('print-report').innerHTML = html;\n" +
"  window.print();\n" +
"};\n" +
"function audioKey(id){ return 'fue_live_audio_'+id; }\n" +
"function loadAudioPrefs(id){\n" +
"  try{ var raw = localStorage.getItem(audioKey(id));\n" +
"    var p = raw ? JSON.parse(raw) : {enabled:false, interval:100, lastAnnounced:0, alertParcialEnabled:false, alertParcialThreshold:null, alertTotalEnabled:false, alertTotalThreshold:null};\n" +
"    state.audioEnabled = !!p.enabled; state.audioInterval = p.interval||100; state.lastAnnounced = p.lastAnnounced||0;\n" +
"    state.alertParcialEnabled = !!p.alertParcialEnabled; state.alertParcialThreshold = (p.alertParcialThreshold===undefined?null:p.alertParcialThreshold);\n" +
"    state.alertTotalEnabled = !!p.alertTotalEnabled; state.alertTotalThreshold = (p.alertTotalThreshold===undefined?null:p.alertTotalThreshold);\n" +
"    state.alertParcialFired = false; state.alertTotalFired = false;\n" +
"  }catch(e){\n" +
"    state.audioEnabled=false; state.audioInterval=100; state.lastAnnounced=0;\n" +
"    state.alertParcialEnabled=false; state.alertParcialThreshold=null; state.alertTotalEnabled=false; state.alertTotalThreshold=null;\n" +
"  }\n" +
"  document.getElementById('audio-toggle').checked = state.audioEnabled;\n" +
"  document.getElementById('audio-interval').value = state.audioInterval;\n" +
"  document.getElementById('alert-parcial-toggle').checked = state.alertParcialEnabled;\n" +
"  document.getElementById('alert-parcial-threshold').value = (state.alertParcialThreshold===null?'':state.alertParcialThreshold);\n" +
"  document.getElementById('alert-total-toggle').checked = state.alertTotalEnabled;\n" +
"  document.getElementById('alert-total-threshold').value = (state.alertTotalThreshold===null?'':state.alertTotalThreshold);\n" +
"}\n" +
"function saveAudioPrefs(){\n" +
"  if (!state.currentId) return;\n" +
"  localStorage.setItem(audioKey(state.currentId), JSON.stringify({\n" +
"    enabled:state.audioEnabled, interval:state.audioInterval, lastAnnounced:state.lastAnnounced,\n" +
"    alertParcialEnabled:state.alertParcialEnabled, alertParcialThreshold:state.alertParcialThreshold,\n" +
"    alertTotalEnabled:state.alertTotalEnabled, alertTotalThreshold:state.alertTotalThreshold\n" +
"  }));\n" +
"}\n" +
"App.toggleAudio = function(checked){ state.audioEnabled = checked; saveAudioPrefs(); if (checked) speak('Áudio ativado.'); };\n" +
"App.toggleAlertParcial = function(checked){ state.alertParcialEnabled = checked; state.alertParcialFired = false; saveAudioPrefs(); if (checked) speak('Alarme de transecção parcial ativado.'); };\n" +
"App.saveAlertParcialThreshold = function(value){ var n = parseFloat(value); state.alertParcialThreshold = (isNaN(n)||n<0) ? null : n; state.alertParcialFired = false; saveAudioPrefs(); };\n" +
"App.toggleAlertTotal = function(checked){ state.alertTotalEnabled = checked; state.alertTotalFired = false; saveAudioPrefs(); if (checked) speak('Alarme de transecção total ativado.'); };\n" +
"App.saveAlertTotalThreshold = function(value){ var n = parseFloat(value); state.alertTotalThreshold = (isNaN(n)||n<0) ? null : n; state.alertTotalFired = false; saveAudioPrefs(); };\n" +
"function checkTransectionAlerts(taxaParcial, taxaTotal){\n" +
"  if (state.alertParcialEnabled && state.alertParcialThreshold!==null){\n" +
"    if (taxaParcial > state.alertParcialThreshold){\n" +
"      if (!state.alertParcialFired){ state.alertParcialFired = true; speak('Atenção: transecção parcial passou de '+state.alertParcialThreshold+' por cento. Está em '+taxaParcial.toFixed(1)+' por cento.'); }\n" +
"    } else if (state.alertParcialFired){ state.alertParcialFired = false; }\n" +
"  }\n" +
"  if (state.alertTotalEnabled && state.alertTotalThreshold!==null){\n" +
"    if (taxaTotal > state.alertTotalThreshold){\n" +
"      if (!state.alertTotalFired){ state.alertTotalFired = true; speak('Atenção: transecção total passou de '+state.alertTotalThreshold+' por cento. Está em '+taxaTotal.toFixed(1)+' por cento.'); }\n" +
"    } else if (state.alertTotalFired){ state.alertTotalFired = false; }\n" +
"  }\n" +
"}\n" +
"App.saveAudioInterval = function(value){ var n = parseInt(value,10); state.audioInterval = (isNaN(n)||n<1) ? 100 : n; saveAudioPrefs(); };\n" +
"App.testAudio = function(){ speak('Teste de áudio. Cento e vinte e três folículos.'); };\n" +
"function speak(text){ if (!('speechSynthesis' in window)) { toast('Este navegador não tem síntese de voz.'); return; } var u = new SpeechSynthesisUtterance(text); u.lang='pt-BR'; window.speechSynthesis.speak(u); }\n" +
"function checkAudioMilestone(total){\n" +
"  if (!state.audioEnabled || !state.audioInterval) return;\n" +
"  var milestone = Math.floor(total/state.audioInterval)*state.audioInterval;\n" +
"  if (milestone>0 && milestone>state.lastAnnounced){ state.lastAnnounced=milestone; saveAudioPrefs(); speak(String(milestone)+' folículos.'); }\n" +
"}\n" +
"setInterval(function(){ api('/api/ping').catch(function(){}); }, 5000);\n" +
"document.addEventListener('DOMContentLoaded', function(){\n" +
"  window.App = App;\n" +
"  loadIncrementSettings();\n" +
"  resolveBaseUrl().then(function(){ if (state.session) render(); });\n" +
"  var m = window.location.pathname.match(/^\\/s\\/([a-f0-9]+)$/);\n" +
"  if (m){\n" +
"    // Acesso direto a uma cirurgia via link — não exige login (fluxo das auxiliares).\n" +
"    state.currentId=m[1]; loadAudioPrefs(m[1]); showScreen('counting'); App.switchTab('extracao'); fetchAndRender().then(function(){ startPolling(); });\n" +
"  } else {\n" +
"    App.checkAuthAndShowHome();\n" +
"  }\n" +
"});\n" +
"window.addEventListener('popstate', function(){\n" +
"  var m = window.location.pathname.match(/^\\/s\\/([a-f0-9]+)$/);\n" +
"  if (m){ App.openSession(m[1]); } else { App.goHome(); }\n" +
"});\n" +
"})();\n" +
"</script>\n" +
"</body>\n" +
"</html>\n";

// ==================== SERVIDOR ====================
var server = http.createServer(function (req, res) {
  var u;
  try { u = new URL(req.url, "http://localhost"); } catch (e) { res.writeHead(400); res.end(); return; }
  var p = u.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST", "Access-Control-Allow-Headers": "Content-Type" });
    res.end();
    return;
  }

  if (p === "/api/register" && req.method === "POST") {
    readBody(req).then(function (body) {
      var nomeCompleto = String(body.nomeCompleto || "").trim().slice(0, 120);
      var crm = String(body.crm || "").trim().slice(0, 40);
      var email = String(body.email || "").trim().toLowerCase().slice(0, 160);
      var telefone = String(body.telefone || "").trim().slice(0, 40);
      var password = String(body.password || "");
      if (!nomeCompleto || !crm || !email || !telefone || !password) { send(res, 400, { error: "Preencha todos os campos." }); return; }
      if (email.indexOf("@") === -1) { send(res, 400, { error: "E-mail inválido." }); return; }
      if (password.length < 6) { send(res, 400, { error: "A senha precisa ter pelo menos 6 caracteres." }); return; }
      if (findUserByEmail(email)) { send(res, 409, { error: "Já existe um cadastro com esse e-mail." }); return; }
      var id = newId(6);
      var user = { id: id, nomeCompleto: nomeCompleto, crm: crm, email: email, telefone: telefone, passwordHash: hashPassword(password), createdAt: Date.now() };
      db.users[id] = user;
      var token = newId(24);
      db.authTokens[token] = { userId: id, createdAt: Date.now() };
      saveData();
      setAuthCookie(res, token);
      send(res, 200, { user: publicUser(user) });
    }).catch(function () { send(res, 400, { error: "Corpo inválido." }); });
    return;
  }

  if (p === "/api/login" && req.method === "POST") {
    readBody(req).then(function (body) {
      var email = String(body.email || "").trim().toLowerCase();
      var password = String(body.password || "");
      var user = findUserByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash)) { send(res, 401, { error: "E-mail ou senha incorretos." }); return; }
      var token = newId(24);
      db.authTokens[token] = { userId: user.id, createdAt: Date.now() };
      saveData();
      setAuthCookie(res, token);
      send(res, 200, { user: publicUser(user) });
    }).catch(function () { send(res, 400, { error: "Corpo inválido." }); });
    return;
  }

  if (p === "/api/logout" && req.method === "POST") {
    var cookiesOut = parseCookies(req);
    var tokOut = cookiesOut["fue_auth"];
    if (tokOut && db.authTokens[tokOut]) { delete db.authTokens[tokOut]; saveData(); }
    clearAuthCookie(res);
    send(res, 200, { ok: true });
    return;
  }

  if (p === "/api/me" && req.method === "GET") {
    var meUser = getAuthedUser(req);
    if (!meUser) { send(res, 401, { error: "Não autenticado." }); return; }
    send(res, 200, { user: publicUser(meUser) });
    return;
  }

  if (p === "/api/session" && req.method === "POST") {
    var creator = getAuthedUser(req);
    if (!creator) { send(res, 401, { error: "Faça login pra criar uma cirurgia." }); return; }
    readBody(req).then(function (body) {
      var codigo = String(body.codigo || "").trim().slice(0, 60);
      if (!codigo) { send(res, 400, { error: "Código do paciente é obrigatório." }); return; }
      var id = newSessionId();
      db.sessions[id] = {
        id: id, codigo: codigo, ownerId: creator.id, status: "andamento",
        quadrants: emptyQuadrants(),
        preincCounts: emptyPreinc(),
        photos: { marcacao: [], posop: [] },
        timer: emptyTimer(),
        preincTimer: emptyTimer(),
        createdAt: Date.now(), updatedAt: Date.now()
      };
      saveData();
      send(res, 200, db.sessions[id]);
    }).catch(function () { send(res, 400, { error: "Corpo inválido." }); });
    return;
  }

  if (p === "/api/sessions" && req.method === "GET") {
    var lister = getAuthedUser(req);
    if (!lister) { send(res, 401, { error: "Não autenticado." }); return; }
    var list = Object.keys(db.sessions).map(function (k) { return db.sessions[k]; })
      .filter(function (s) { return s.ownerId === lister.id; })
      .sort(function (a, b) { return b.createdAt - a.createdAt; });
    send(res, 200, list);
    return;
  }

  var m;

  m = p.match(/^\/api\/session\/([a-f0-9]+)$/);
  if (m && req.method === "GET") {
    var s = db.sessions[m[1]];
    if (!s) { send(res, 404, { error: "Cirurgia não encontrada neste servidor." }); return; }
    send(res, 200, s);
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/adjust$/);
  if (m && req.method === "POST") {
    var s2 = db.sessions[m[1]];
    if (!s2) { send(res, 404, { error: "Cirurgia não encontrada." }); return; }
    if (s2.status === "finalizada") { send(res, 409, { error: "Cirurgia já finalizada." }); return; }
    readBody(req).then(function (body) {
      var quadId = body.quadrant;
      var catId = body.category;
      var delta = Number(body.delta);
      if (!QUAD_IDS.has(quadId) || !CAT_IDS.has(catId) || !Number.isFinite(delta)) { send(res, 400, { error: "Parâmetros inválidos." }); return; }
      var counts = s2.quadrants[quadId].counts;
      var current = counts[catId] || 0;
      var next = current + delta;
      if (next < 0) next = 0;
      counts[catId] = next;
      s2.updatedAt = Date.now();
      saveData();
      send(res, 200, s2);
    }).catch(function () { send(res, 400, { error: "Corpo inválido." }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/mamba$/);
  if (m && req.method === "POST") {
    var sM = db.sessions[m[1]];
    if (!sM) { send(res, 404, { error: "Cirurgia não encontrada." }); return; }
    readBody(req).then(function (body) {
      var quadId = body.quadrant;
      if (!QUAD_IDS.has(quadId)) { send(res, 400, { error: "Quadrante inválido." }); return; }
      if (body.value === null || body.value === undefined || body.value === "") {
        sM.quadrants[quadId].mambaCumulativo = null;
      } else {
        var v = Number(body.value);
        if (!Number.isFinite(v) || v < 0) { send(res, 400, { error: "Valor inválido." }); return; }
        sM.quadrants[quadId].mambaCumulativo = v;
      }
      sM.updatedAt = Date.now();
      saveData();
      send(res, 200, sM);
    }).catch(function () { send(res, 400, { error: "Corpo inválido." }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/preinc$/);
  if (m && req.method === "POST") {
    var sP = db.sessions[m[1]];
    if (!sP) { send(res, 404, { error: "Cirurgia não encontrada." }); return; }
    if (sP.status === "finalizada") { send(res, 409, { error: "Cirurgia já finalizada." }); return; }
    readBody(req).then(function (body) {
      var area = body.area;
      var value = Number(body.value);
      if (!PREINC_IDS.has(area) || !Number.isFinite(value) || value < 0) { send(res, 400, { error: "Parâmetros inválidos." }); return; }
      sP.preincCounts[area] = Math.floor(value);
      sP.updatedAt = Date.now();
      saveData();
      send(res, 200, sP);
    }).catch(function () { send(res, 400, { error: "Corpo inválido." }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/photos$/);
  if (m && req.method === "POST") {
    var sPh = db.sessions[m[1]];
    if (!sPh) { send(res, 404, { error: "Cirurgia não encontrada." }); return; }
    readBody(req).then(function (body) {
      var category = body.category;
      var dataUrl = String(body.dataUrl || "");
      if (PHOTO_CATS.indexOf(category) === -1) { send(res, 400, { error: "Categoria inválida." }); return; }
      var match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (!match) { send(res, 400, { error: "Imagem inválida." }); return; }
      var buffer = Buffer.from(match[2], "base64");
      var photoId = newId(6);
      var sessionDir = path.join(UPLOADS_DIR, sPh.id);
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
      var filename = photoId + ".jpg";
      fs.writeFileSync(path.join(sessionDir, filename), buffer);
      sPh.photos[category].push({ id: photoId, filename: filename, createdAt: Date.now() });
      sPh.updatedAt = Date.now();
      saveData();
      send(res, 200, sPh);
    }).catch(function (err) { send(res, 400, { error: "Erro ao processar foto: " + err.message }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/photos\/([a-f0-9]+)$/);
  if (m && req.method === "GET") {
    var sPhG = db.sessions[m[1]];
    if (!sPhG) { res.writeHead(404); res.end(); return; }
    var found = findPhotoCategory(sPhG, m[2]);
    if (!found) { res.writeHead(404); res.end(); return; }
    var filePath = path.join(UPLOADS_DIR, sPhG.id, found.photo.filename);
    fs.readFile(filePath, function (err, content) {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" });
      res.end(content);
    });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/photos\/([a-f0-9]+)\/delete$/);
  if (m && req.method === "POST") {
    var sPhD = db.sessions[m[1]];
    if (!sPhD) { send(res, 404, { error: "Cirurgia não encontrada." }); return; }
    var foundD = findPhotoCategory(sPhD, m[2]);
    if (!foundD) { send(res, 404, { error: "Foto não encontrada." }); return; }
    sPhD.photos[foundD.cat].splice(foundD.idx, 1);
    sPhD.updatedAt = Date.now();
    saveData();
    var filePath2 = path.join(UPLOADS_DIR, sPhD.id, foundD.photo.filename);
    fs.unlink(filePath2, function () {});
    send(res, 200, sPhD);
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/timer$/);
  if (m && req.method === "POST") {
    var s4 = db.sessions[m[1]];
    if (!s4) { send(res, 404, { error: "Cirurgia não encontrada." }); return; }
    readBody(req).then(function (body) {
      var action = body.action;
      if (action === "start" && !s4.timer.running) { s4.timer.running = true; s4.timer.startedAt = Date.now(); }
      else if (action === "pause" && s4.timer.running) { s4.timer.accumulatedMs += Date.now() - s4.timer.startedAt; s4.timer.running = false; s4.timer.startedAt = null; }
      else if (action === "reset") { s4.timer.accumulatedMs = 0; s4.timer.running = false; s4.timer.startedAt = null; }
      s4.updatedAt = Date.now();
      saveData();
      send(res, 200, s4);
    }).catch(function () { send(res, 400, { error: "Corpo inválido." }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/preinc-timer$/);
  if (m && req.method === "POST") {
    var s4b = db.sessions[m[1]];
    if (!s4b) { send(res, 404, { error: "Cirurgia não encontrada." }); return; }
    readBody(req).then(function (body) {
      var action = body.action;
      var t = s4b.preincTimer;
      if (action === "start" && !t.running) { t.running = true; t.startedAt = Date.now(); }
      else if (action === "pause" && t.running) { t.accumulatedMs += Date.now() - t.startedAt; t.running = false; t.startedAt = null; }
      else if (action === "reset") { t.accumulatedMs = 0; t.running = false; t.startedAt = null; }
      s4b.updatedAt = Date.now();
      saveData();
      send(res, 200, s4b);
    }).catch(function () { send(res, 400, { error: "Corpo inválido." }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/(finalize|reopen)$/);
  if (m && req.method === "POST") {
    var s5 = db.sessions[m[1]];
    if (!s5) { send(res, 404, { error: "Cirurgia não encontrada." }); return; }
    s5.status = (m[2] === "finalize") ? "finalizada" : "andamento";
    if (s5.status === "finalizada") {
      if (s5.timer.running) { s5.timer.accumulatedMs += Date.now() - s5.timer.startedAt; s5.timer.running = false; s5.timer.startedAt = null; }
      if (s5.preincTimer.running) { s5.preincTimer.accumulatedMs += Date.now() - s5.preincTimer.startedAt; s5.preincTimer.running = false; s5.preincTimer.startedAt = null; }
    }
    s5.updatedAt = Date.now();
    saveData();
    send(res, 200, s5);
    return;
  }

  if (p === "/api/ping" && req.method === "GET") { send(res, 200, { ok: true, now: Date.now() }); return; }

  if (p === "/api/network-info" && req.method === "GET") {
    var ips = [];
    var nets2 = os.networkInterfaces();
    Object.keys(nets2).forEach(function (name) {
      (nets2[name] || []).forEach(function (net) {
        if (net.family === "IPv4" && !net.internal) ips.push(net.address);
      });
    });
    send(res, 200, { ips: ips, port: PORT });
    return;
  }

  // Qualquer outra rota (/ , /s/<id>, etc.) devolve a página única — o roteamento é feito no navegador.
  // Cache-Control: no-store evita que o celular guarde uma versão antiga da página em cache
  // e continue mostrando um bug já corrigido depois que o servidor for atualizado.
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(INDEX_HTML);
    return;
  }

  res.writeHead(404); res.end("Não encontrado");
});

server.listen(PORT, "0.0.0.0", function () {
  var nets = os.networkInterfaces();
  console.log("");
  console.log("========================================================");
  console.log(" Servidor de contagem rodando.");
  console.log(" Compartilhe um destes endereços com os celulares NA MESMA REDE WIFI:");
  console.log("");
  var found = false;
  Object.keys(nets).forEach(function (name) {
    (nets[name] || []).forEach(function (net) {
      if (net.family === "IPv4" && !net.internal) {
        console.log("   http://" + net.address + ":" + PORT);
        found = true;
      }
    });
  });
  if (!found) console.log("   (nenhum endereço de rede detectado — confirme que este computador está conectado ao wifi)");
  console.log("");
  console.log("   (neste computador: http://localhost:" + PORT + ")");
  console.log("========================================================");
  console.log("");
});
