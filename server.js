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
const tls = require("tls");

// DATA_DIR: onde ficam data.json e a pasta uploads/. Por padrão, do lado do server.js
// (uso local/rede local). Em nuvem (Railway, etc.), aponte pra um volume persistente
// definindo a variável de ambiente DATA_DIR (ex: DATA_DIR=/data), senão os dados somem
// a cada novo deploy/reinício.
const DATA_DIR = process.env.DATA_DIR ? process.env.DATA_DIR : __dirname;
const DATA_FILE = path.join(DATA_DIR, "data.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const LOGOS_DIR = path.join(UPLOADS_DIR, "logos");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const MAX_BODY_BYTES = 15 * 1024 * 1024; // 15MB — folga generosa pra fotos comprimidas
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // link de redefinição de senha expira em 30 minutos
const AUTH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // token de login expira em 30 dias (mesmo prazo do cookie)
// Depois desse prazo contado a partir da finalização da cirurgia, o link (sem
// login) para de servir as FOTOS do paciente — só o médico dono, autenticado,
// continua vendo. Escolhido pra cobrir o acompanhamento pós-operatório usual
// de transplante capilar sem deixar a foto exposta por um link vazado pra sempre.
const PHOTO_LINK_TTL_MS = 90 * 24 * 60 * 60 * 1000;
// SECURE_COOKIES: marca o cookie de login como "Secure" (só trafega em HTTPS). Deixe
// desligado (padrão) pra uso na rede local, que roda em HTTP puro. Ligue definindo a
// variável de ambiente SECURE_COOKIES=true quando estiver atrás de HTTPS (nuvem).
const SECURE_COOKIES = process.env.SECURE_COOKIES === "true";

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ================== CONFIGURAÇÃO DE E-MAIL (recuperação de senha) ==================
// Duas formas de configurar, escolha uma:
//  (a) Uso local/rede local: preencha os valores AQUI embaixo direto no arquivo.
//  (b) Nuvem (recomendado): defina as variáveis de ambiente SMTP_ENABLED=true,
//      SMTP_USER e SMTP_PASS no painel do serviço de hospedagem, em vez de deixar a
//      senha escrita dentro do arquivo — mais seguro se este arquivo for pra um
//      repositório Git. Variáveis de ambiente, se definidas, sempre têm prioridade
//      sobre os valores escritos aqui.
//
// Passo a passo pra gerar uma "senha de app" do Gmail (não é a senha normal da conta):
//   1. Ative a verificação em duas etapas em https://myaccount.google.com/security
//   2. Acesse https://myaccount.google.com/apppasswords
//   3. Crie uma senha de app com qualquer nome (ex: "Graftis")
//   4. Copie a senha de 16 letras gerada e use como SMTP_PASS (ou cole em "pass" abaixo)
//   5. "enabled" já vem true por padrão (só desliga se definir SMTP_ENABLED=false)
//      — reinicie o servidor depois de preencher user/pass pra valer
const SMTP_CONFIG = {
  enabled: process.env.SMTP_ENABLED === "false" ? false : true,
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
  user: process.env.SMTP_USER || "drvitorfrauches@gmail.com",
  pass: process.env.SMTP_PASS || "ajfn tmxk cvya dlxx",
  fromName: process.env.SMTP_FROM_NAME || "Graftis"
};

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });

// Mesmas 13 categorias do app v1 (íntegros / transecção parcial / transecção total).
const CATS = [
  { id: "f1",     label: "1 fio",           hairs: 1, group: "integro" },
  { id: "f2",     label: "2 fios",          hairs: 2, group: "integro" },
  { id: "f3",     label: "3 fios",          hairs: 3, group: "integro" },
  { id: "f4",     label: "4 fios",          hairs: 4, group: "integro" },
  { id: "f1fino", label: "1 fio especial",  hairs: 1, group: "integro" },
  { id: "f2fino", label: "2 fios especial", hairs: 2, group: "integro" },
  { id: "t2_1", label: "2 → 1 fio",  hairs: 1, group: "parcial" },
  { id: "t3_2", label: "3 → 2 fios", hairs: 2, group: "parcial" },
  { id: "t3_1", label: "3 → 1 fio",  hairs: 1, group: "parcial" },
  { id: "t4_3", label: "4 → 3 fios", hairs: 3, group: "parcial" },
  { id: "t4_2", label: "4 → 2 fios", hairs: 2, group: "parcial" },
  { id: "t4_1", label: "4 → 1 fio",  hairs: 1, group: "parcial" },
  { id: "parcial_geral", label: "Transecção parcial", hairs: 0, group: "parcial_reduzida" },
  { id: "ttotal", label: "Transecção total (folículo perdido)", hairs: 0, group: "total" },
  { id: "mini", label: "Mini (miniaturizado)", hairs: 0, group: "mini" }
];
const CAT_IDS = new Set(CATS.map(function (c) { return c.id; }));
const SESSION_MODES = new Set(["completo", "reduzido"]);

// Mesmos 4 quadrantes de extração do app v1, na ordem real em que o Dr. Vitor
// extrai (occipital dir → occipital esq → temporal esq → temporal dir) — é a
// ordem dos botões/abas de quadrante e a ordem no relatório impresso. NÃO
// determina mais o cálculo do Mamba: desde a correção de julho/2026, o delta de
// cada quadrante usa o horário real de preenchimento (mambaMarkedAtMs), então
// funciona em qualquer ordem que a extração aconteça de verdade. Esta lista só
// entra como último recurso pra cirurgias muito antigas, sem esse horário salvo.
const QUADRANTS = [
  { id: "occipital_dir", label: "Occipital direito" },
  { id: "occipital_esq", label: "Occipital esquerdo" },
  { id: "temporal_esq",  label: "Temporal esquerdo" },
  { id: "temporal_dir",  label: "Temporal direito" }
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

// Distribuição planejada de unidades foliculares (por número de fios) em cada área de pré-incisão.
const DIST_FIOS = [
  { id: "f1", label: "1 fio" },
  { id: "f2", label: "2 fios" },
  { id: "f3", label: "3 fios" }
];
const DIST_FIO_IDS = new Set(DIST_FIOS.map(function (d) { return d.id; }));

// Identidade visual por médico — presets de cor (as cores clínicas das categorias
// NÃO entram aqui de propósito: ficam sempre fixas, iguais pra todo mundo, porque
// têm significado clínico consistente entre toda a equipe).
const THEME_IDS = new Set(["padrao", "azul", "roxo", "grafite", "marinho"]);
function emptyBranding() {
  return { logoFilename: null, theme: "padrao", darkMode: false, language: "pt" };
}

// ==================== TRADUÇÕES (i18n) ====================
// Escopo desta primeira leva: tela de login/cadastro/recuperação de senha (a
// única parte que alguém que não lê português precisa entender ANTES de
// existir uma conta ou um idioma salvo) + os erros correspondentes do
// servidor. O resto do app (contagem, configurações, dashboard) continua só
// em português por enquanto — é trabalho futuro, migrado aos poucos.
// LANG_IDS: os únicos valores válidos de idioma. STRINGS é a fonte única da
// verdade — o mesmo objeto é usado pelo servidor (pra montar mensagens de
// erro da API) e é serializado dentro da página (pra uso no cliente), então
// a tradução nunca precisa ser escrita duas vezes.
const LANG_IDS = new Set(["pt", "en", "es"]);
const STRINGS = {
  pt: {
    "common.email": "E-mail",
    "common.password": "Senha",
    "common.confirm_password": "Confirmar senha",
    "auth.title": "Área do médico",
    "auth.subtitle": "Entre com sua conta pra ver e criar suas próprias cirurgias. Auxiliares que já têm o link de uma cirurgia específica não precisam de conta — só quem cria e gerencia a lista de cirurgias precisa entrar.",
    "auth.tab_login": "Entrar",
    "auth.tab_register": "Criar conta",
    "auth.login_submit": "Entrar",
    "auth.forgot_link": "Esqueci minha senha",
    "auth.forgot_email_label": "Seu e-mail cadastrado",
    "auth.forgot_submit": "Enviar link de redefinição",
    "auth.field_fullname": "Nome completo",
    "auth.field_crm": "CRM / registro profissional",
    "auth.crm_placeholder": "Ex: 123456-SP",
    "auth.field_phone": "Telefone (com DDD)",
    "auth.phone_placeholder": "Ex: (11) 91234-5678",
    "auth.register_submit": "Criar conta",
    "reset.title": "Nova senha",
    "reset.subtitle": "Escolha uma nova senha pra sua conta.",
    "reset.new_password": "Nova senha",
    "reset.confirm_password": "Confirmar nova senha",
    "reset.submit": "Salvar nova senha",
    "toast.fill_email_password": "Preencha e-mail e senha.",
    "toast.welcome": "Bem-vindo(a), {name}.",
    "toast.fill_all_fields": "Preencha todos os campos.",
    "toast.passwords_dont_match": "As senhas não coincidem.",
    "toast.password_too_short": "A senha precisa ter pelo menos 6 caracteres.",
    "toast.account_created_welcome": "Conta criada. Bem-vindo(a), {name}.",
    "toast.logged_out": "Você saiu.",
    "toast.logout_all_confirm": "Isso desconecta sua conta de TODOS os aparelhos onde você estiver logado (inclusive este). Vai precisar entrar de novo em cada um. Continuar?",
    "toast.logged_out_all": "Você saiu de todos os aparelhos.",
    "toast.generic_error": "Erro: {msg}",
    "toast.enter_your_email": "Digite seu e-mail.",
    "toast.reset_link_sent_generic": "Se esse e-mail estiver cadastrado, enviamos um link de redefinição.",
    "toast.enter_new_password": "Digite a nova senha.",
    "toast.password_changed_login": "Senha alterada. Faça login com a nova senha.",
    "errors.invalid_email": "E-mail inválido.",
    "errors.email_already_registered": "Já existe um cadastro com esse e-mail.",
    "errors.invalid_credentials": "E-mail ou senha incorretos.",
    "errors.invalid_body": "Corpo inválido.",
    "errors.reset_link_invalid": "Link inválido ou expirado. Peça um novo pela tela de login.",
    "errors.account_not_found": "Conta não encontrada.",
    "errors.too_many_registrations": "Muitos cadastros a partir deste endereço. Tente de novo em algumas horas.",
    "errors.too_many_logins": "Muitas tentativas de login. Aguarde alguns minutos e tente de novo.",
    "errors.too_many_forgot": "Muitos pedidos de redefinição a partir deste endereço. Tente de novo mais tarde.",
    "errors.not_authenticated": "Não autenticado.",
    "errors.invalid_image": "Imagem inválida.",
    "errors.image_processing_error_prefix": "Erro ao processar imagem: ",
    "errors.login_required_create_surgery": "Faça login pra criar uma cirurgia.",
    "errors.patient_code_required": "Código do paciente é obrigatório.",
    "errors.too_many_missing_session_attempts": "Muitas tentativas de acesso a cirurgias inexistentes a partir deste endereço. Aguarde alguns minutos.",
    "errors.surgery_not_found_server": "Cirurgia não encontrada neste servidor.",
    "errors.surgery_not_found": "Cirurgia não encontrada.",
    "errors.surgery_already_finalized": "Cirurgia já finalizada.",
    "errors.invalid_parameters": "Parâmetros inválidos.",
    "errors.invalid_quadrant": "Quadrante inválido.",
    "errors.invalid_value": "Valor inválido.",
    "errors.invalid_category": "Categoria inválida.",
    "errors.photo_processing_error_prefix": "Erro ao processar foto: ",
    "errors.photo_not_found": "Foto não encontrada.",
    "errors.surgery_finalized_reopen_timer": "Cirurgia finalizada — reabra pra mexer no cronômetro.",
    "errors.login_required_delete_surgery": "Faça login pra apagar uma cirurgia.",
    "errors.surgery_not_yours": "Essa cirurgia não é sua.",
    "errors.quadrant_locked": "Este quadrante está travado. Reabra pra editar.",
    "errors.value_below_carry": "O valor não pode ser menor que o total já trazido do quadrante anterior ({carry}).",
    "errors.invalid_carry_link": "Não é possível ligar esse quadrante (criaria um ciclo).",
    "toast.login_required_dashboard": "Faça login pra ver o dashboard.",
    "toast.server_unreachable": "Não consegui falar com o servidor.",
    "toast.add_at_least_one_value": "Adicione ao menos um valor.",
    "toast.settings_saved": "Configurações salvas.",
    "toast.defaults_restored": "Padrão restaurado.",
    "toast.surgery_deleted": "Cirurgia apagada.",
    "toast.enter_patient_code": "Informe um código ou iniciais do paciente.",
    "toast.sync_failed": "Não sincronizou: {msg}",
    "toast.uploading_photos": "Enviando {n} foto(s)...",
    "toast.photos_uploaded": "Foto(s) enviada(s).",
    "toast.photo_upload_error": "Erro ao enviar foto: {msg}",
    "toast.logo_updated": "Logomarca atualizada.",
    "toast.logo_upload_error": "Erro ao enviar logo: {msg}",
    "toast.logo_removed": "Logomarca removida.",
    "toast.surgery_finalized": "Cirurgia finalizada.",
    "toast.surgery_reopened": "Cirurgia reaberta.",
    "toast.quadrant_finished": "Quadrante finalizado.",
    "toast.quadrant_reopened": "Quadrante reaberto.",
    "toast.address_copied": "Endereço copiado.",
    "toast.copy_failed_manual": "Não deu pra copiar — selecione o texto manualmente.",
    "toast.copy_manually": "Copie o endereço manualmente: {url}",
    "toast.no_native_share": "Este navegador não tem a opção de compartilhar direto — use WhatsApp ou Copiar.",
    "toast.no_speech_synthesis": "Este navegador não tem síntese de voz.",
    "confirm.delete_surgery": "Apagar a cirurgia \"{code}\" definitivamente? Isso remove todas as contagens, pré-incisões e fotos dela. Essa ação não pode ser desfeita.",
    "confirm.delete_photo": "Remover esta foto?",
    "confirm.delete_logo": "Remover a logomarca?",
    "confirm.reset_extraction_timer": "Zerar o cronômetro desta cirurgia (afeta todos os aparelhos conectados)?",
    "confirm.reset_preinc_timer": "Zerar o cronômetro de pré-incisões (afeta todos os aparelhos conectados)?",
    "confirm.finalize_surgery": "Finalizar esta cirurgia? Trava as contagens em todos os aparelhos conectados.",
    "confirm.finish_quadrant": "Finalizar a contagem deste quadrante? Ele fica travado até você reabrir.",
    "confirm.reopen_quadrant": "Reabrir este quadrante pra editar de novo?",
    "prompt.set_value_for": "Definir valor para \"{label}\":",
    "prompt.set_quantity_for": "Definir quantidade de \"{label}\":",
    "errors.file_read_error": "Não li o arquivo.",
    "errors.photo_link_expired": "O acesso a esta foto pelo link expirou (cirurgia finalizada há mais de 90 dias). Peça pro médico dono da cirurgia fazer login pra ver.",
    "email.reset_subject": "Redefinir sua senha — Graftis",
    "email.reset_body": "Olá, {name}.\n\nVocê pediu pra redefinir sua senha no Graftis.\n\nToque no link abaixo (ou copie e cole no navegador) pra escolher uma nova senha. Esse link expira em 30 minutos e só funciona uma vez:\n\n{url}\n\nSe você não pediu isso, é só ignorar este e-mail — sua senha continua a mesma.",
    "nav.home": "Início",
    "nav.dashboard": "Dashboard",
    "nav.config": "Config",
    "nav.exit": "Sair",
    "common.mode_complete": "Completo",
    "common.mode_reduced": "Reduzido",
    "common.open": "Abrir",
    "common.delete": "Apagar",
    "common.cancel": "Cancelar",
    "common.save": "Salvar",
    "common.remove": "Remover",
    "common.back": "Voltar",
    "home.title": "Suas cirurgias",
    "home.subtitle": "Só você vê essa lista. Depois de criar a cirurgia, compartilhe o link dela com as auxiliares — elas atualizam os dados ao vivo sem precisar de conta.",
    "home.patient_code_label": "Código / iniciais do paciente",
    "home.patient_code_placeholder": "Ex: JS-090726",
    "home.count_mode_label": "Modo de contagem",
    "home.mode_explanation": "Completo: cada transecção parcial é registrada no tipo exato (2→1, 3→2 etc). Reduzido: os fios da transecção parcial entram junto com os folículos íntegros, e só um contador único de transecção parcial é usado pra calcular a taxa — sem detalhar o tipo. Não dá pra trocar depois de criada.",
    "home.create_button": "+ Nova cirurgia (criar sessão)",
    "home.no_surgeries_yet": "Você ainda não criou nenhuma cirurgia.",
    "config.title": "Configurações",
    "config.increments_subtitle": "Valores extras dos botões de incremento rápido usados na contagem da extração, além do -1/+1 que aparece sempre. Configuração só deste aparelho — cada celular pode ter os próprios botões (por exemplo, só +1 e +100, ou só +50).",
    "config.add_value": "+ Adicionar valor",
    "config.restore_default": "Restaurar padrão (10 / 50 / 100)",
    "config.identity_title": "Identidade visual",
    "config.identity_subtitle": "Vale pra sua conta — aparece em todos os aparelhos onde você fizer login, e também pra quem acessar suas cirurgias só pelo link (sem login).",
    "config.logo_label": "Logomarca",
    "config.logo_empty": "Nenhuma logomarca ainda.",
    "config.theme_label": "Cor do tema",
    "config.darkmode_label": "Modo escuro",
    "config.darkmode_hint": "As cores clínicas (íntegro/parcial/total/mini) não mudam — só o fundo e os textos.",
    "config.language_label": "Idioma / Language / Idioma",
    "config.language_hint": "Por enquanto só a tela de login/cadastro é traduzida — o resto do app continua em português.",
    "config.security_title": "Segurança da conta",
    "config.security_subtitle": "Se você perdeu ou emprestou um aparelho onde tinha feito login, use isto pra encerrar o acesso em todo lugar de uma vez.",
    "config.logout_all_btn": "Sair de todos os aparelhos",
    "config.backup_title": "Backup dos seus dados",
    "config.backup_subtitle": "Baixa um arquivo com o cadastro da sua conta e todas as suas cirurgias (contagens, tempos, pré-incisões). Não inclui as fotos — essas ficam protegidas separadamente pelo backup de volume do Railway. Guarde este arquivo num lugar seguro fora do Railway (computador, Google Drive, etc.).",
    "config.backup_btn": "Baixar backup",
    "config.back_to_surgery": "Voltar pra cirurgia",
    "config.audio_title": "Áudio e alarmes desta cirurgia",
    "config.audio_subtitle": "Vale só pra cirurgia que você tinha aberta e só neste aparelho — cada celular pode ter os próprios ajustes.",
    "config.audio_section_title": "Áudio",
    "config.audio_announce_hint": "Anuncia em voz alta o total de folículos extraídos (somando os 4 quadrantes) a cada N.",
    "config.audio_announce_every": "Anunciar a cada",
    "config.audio_test_btn": "Testar voz",
    "config.preinc_audio_section_title": "Áudio de pré-incisões",
    "config.preinc_audio_announce_hint": "Anuncia em voz alta o novo total de pré-incisões (somando todas as áreas) toda vez que você preencher o valor de uma área.",
    "config.alarm_section_title": "Alarme de transecção",
    "config.alarm_subtitle": "Avisa por voz assim que a taxa (somando os 4 quadrantes) ultrapassar o limite que você definir.",
    "config.alert_partial_label": "Avisar se transecção parcial passar de (%)",
    "config.alert_partial_placeholder": "Ex: 7",
    "config.alert_total_label": "Avisar se transecção total passar de (%)",
    "config.alert_total_placeholder": "Ex: 5",
    "cat.f1": "1 fio",
    "cat.f2": "2 fios",
    "cat.f3": "3 fios",
    "cat.f4": "4 fios",
    "cat.f1fino": "1 fio especial",
    "cat.f2fino": "2 fios especial",
    "cat.t2_1": "2 → 1 fio",
    "cat.t3_2": "3 → 2 fios",
    "cat.t3_1": "3 → 1 fio",
    "cat.t4_3": "4 → 3 fios",
    "cat.t4_2": "4 → 2 fios",
    "cat.t4_1": "4 → 1 fio",
    "cat.parcial_geral": "Transecção parcial",
    "cat.ttotal": "Transecção total (folículo perdido)",
    "cat.mini": "Mini (miniaturizado)",
    "quad.temporal_dir": "Temporal direito",
    "quad.temporal_esq": "Temporal esquerdo",
    "quad.occipital_dir": "Occipital direito",
    "quad.occipital_esq": "Occipital esquerdo",
    "preinc.recesso_dir": "Recesso direito",
    "preinc.recesso_esq": "Recesso esquerdo",
    "preinc.linha": "Linha",
    "preinc.sublinha": "Sublinha",
    "preinc.entrada_dir1": "Entrada direita 1",
    "preinc.entrada_dir2": "Entrada direita 2",
    "preinc.entrada_esq1": "Entrada esquerda 1",
    "preinc.entrada_esq2": "Entrada esquerda 2",
    "preinc.topete1": "Topete 1",
    "preinc.topete2": "Topete 2",
    "preinc.scalp": "Scalp",
    "preinc.coroa": "Coroa",
    "common.start": "Iniciar",
    "common.pause": "Pausar",
    "common.reset": "Zerar",
    "common.status_finalized": "Finalizada",
    "common.status_in_progress": "Em andamento",
    "cnt.share_btn": "🔗 Compartilhar",
    "cnt.tab_extracao": "Extração",
    "cnt.tab_preinc": "Pré-incisões",
    "cnt.tab_fotos": "Fotos",
    "cnt.tab_paciente": "Paciente",
    "cnt.tab_resumo": "Resumo Final",
    "cnt.final_summary_title": "Resumo final da cirurgia",
    "cnt.final_times_title": "Tempos",
    "cnt.final_categories_title": "Folículos por categoria",
    "cnt.final_preinc_title": "Resumo de pré-incisões",
    "cnt.final_preinc_diff": "Diferença (folículos extraídos − pré-incisões)",
    "patient.section_title": "Dados do paciente",
    "patient.section_hint": "Opcional — preencha agora, depois, ou nunca. Não trava nada da cirurgia.",
    "patient.age_label": "Idade",
    "patient.age_placeholder": "Ex: 45",
    "patient.height_label": "Altura (cm)",
    "patient.height_placeholder": "Ex: 175",
    "patient.weight_label": "Peso (kg)",
    "patient.weight_placeholder": "Ex: 80",
    "patient.hair_thickness_label": "Espessura do cabelo",
    "patient.hair_thin": "Fino",
    "patient.hair_thick": "Grosso",
    "patient.hair_texture_label": "Textura do cabelo",
    "patient.hair_straight": "Liso",
    "patient.hair_wavy": "Ondulado",
    "patient.hair_curly": "Crespo",
    "patient.surgery_type_label": "Tipo de cirurgia",
    "patient.with_shaving": "Com raspagem",
    "patient.without_shaving": "Sem raspagem",
    "home.patient_info_toggle": "Dados do paciente (opcional)",
    "cnt.extraction_time_title": "Tempo de extração",
    "cnt.rate_hint": "Ritmo médio: {rate} folículos/hora",
    "cnt.summary_general_title": "Resumo geral (todos os quadrantes)",
    "cnt.summary_extracted": "Folículos extraídos",
    "cnt.summary_total_hairs": "Total de fios",
    "cnt.summary_index": "Índice fios/folículo",
    "cnt.summary_partial_transec": "Transecção parcial",
    "cnt.summary_total_transec": "Transecção total",
    "cnt.summary_mini": "Mini (fora do total)",
    "cnt.mamba_reading": "Mamba (leitura final)",
    "cnt.mamba_diff": "Diferença",
    "cnt.mamba_diffpct": "Diferença (% do Mamba)",
    "cnt.mamba_diff_extraidos": "Diferença (Mamba − Extraídos)",
    "cnt.mamba_diffpct_extraidos": "Diferença (% Mamba × Extraídos)",
    "cnt.mamba_rate": "Ritmo pelo Mamba (fol./h)",
    "cnt.mamba_hint": "Preencha o Mamba na ordem em que os quadrantes forem extraídos. O valor é a leitura acumulada do aparelho ao final deste quadrante — o app calcula sozinho a diferença em relação ao quadrante anterior.",
    "cnt.mamba_input_label": "Mamba (leitura acumulada ao final deste quadrante)",
    "cnt.mamba_input_placeholder": "Ex: 1000",
    "cnt.mamba_quad_val": "Mamba deste quadrante",
    "cnt.mamba_quad_duration": "Tempo deste quadrante",
    "cnt.chain_title": "Contagem em cadeia",
    "cnt.chain_hint_none": "Este quadrante começa do zero.",
    "cnt.chain_hint_from": "Contando a partir de: {label} ({total})",
    "cnt.carry_from_label": "Carregar contagem de",
    "cnt.carry_from_none_option": "Nenhum (começar do zero)",
    "cnt.quadrant_finish_btn": "Contagem finalizada",
    "cnt.quadrant_reopen_btn": "Reabrir quadrante",
    "cnt.group_integro_title": "Folículos íntegros",
    "cnt.group_parcial_title": "Transecção parcial (folículo aproveitado)",
    "cnt.parcial_reduzido_hint": "Modo reduzido: registre os fios desse folículo normalmente em \"Folículos íntegros\" e toque aqui só pra contar a transecção parcial (não soma de novo no total).",
    "cnt.group_mini_title": "Mini",
    "cnt.mini_hint": "Folículos miniaturizados — não entram na contagem geral de folículos extraídos, fios ou taxas, mas ficam registrados aqui pra não se perderem.",
    "preinc.time_title": "Tempo de pré-incisões",
    "preinc.total_label": "Total de pré-incisões",
    "preinc.by_area_title": "Pré-incisões por área",
    "preinc.area_hint": "Toque no número de cima pra digitar o total da área. UF1/UF2/UF3 embaixo = quantas unidades foliculares de 1, 2 ou 3 fios vão pra essa área.",
    "photos.marcacao_title": "Marcação cirúrgica",
    "photos.marcacao_hint": "Ficam salvas neste servidor — visíveis em todos os celulares conectados.",
    "photos.posop_title": "Pós-operatório imediato",
    "cnt.print_btn": "Imprimir / Salvar PDF",
    "cnt.finalize_btn": "Finalizar cirurgia",
    "cnt.reopen_btn": "Reabrir",
    "share.title": "Compartilhar cirurgia",
    "share.url_label": "Endereço desta cirurgia (compartilhe com os outros celulares)",
    "share.share_link_btn": "Compartilhar link",
    "share.whatsapp_btn": "Enviar por WhatsApp",
    "share.copy_btn": "Copiar",
    "audio.test_phrase": "Teste de áudio. Cento e vinte e três folículos.",
    "audio.milestone": "{n} folículos.",
    "audio.preinc_update": "{n} pré-incisões.",
    "cnt.mode_full": "Modo completo",
    "cnt.mode_reduced": "Modo reduzido",
    "cnt.global_not_started": "Tempo total: ainda não iniciado",
    "cnt.global_timer_prefix": "⏱ Tempo total da cirurgia: ",
    "cnt.global_finalized_suffix": " (finalizado)",
    "cnt.global_in_progress_suffix": " (em andamento)",
    "preinc.rate_hint": "Ritmo médio: {rate} pré-incisões/hora",
    "cnt.hair_singular": "fio",
    "cnt.hair_plural": "fios",
    "cnt.per_follicle_suffix": " por folículo",
    "cnt.hairs_not_in_total": "não entra na contagem geral",
    "cnt.hairs_informative_only": "apenas contagem informativa",
    "cnt.hairs_lost": "0 fios (perdido)",
    "dash.title": "Dashboard",
    "dash.subtitle": "Estatísticas calculadas só com cirurgias finalizadas — cirurgias em andamento têm dados parciais e ficam de fora, pra não distorcer as médias.",
    "dash.empty": "Você ainda não tem nenhuma cirurgia finalizada. As estatísticas aparecem aqui assim que a primeira for finalizada.",
    "dash.extracted_by_surgery_title": "Folículos extraídos por cirurgia",
    "dash.extracted_by_surgery_hint": "Cada barra é uma cirurgia finalizada, em ordem cronológica — dá pra ver se o volume por cirurgia está subindo ou caindo ao longo do tempo.",
    "dash.index_by_surgery_title": "Índice fios/folículo por cirurgia",
    "dash.index_by_surgery_hint": "Cada barra é uma cirurgia finalizada, em ordem cronológica.",
    "dash.uf_distribution_title": "Distribuição por tipo de unidade folicular",
    "dash.uf_distribution_hint": "Percentual entre todos os folículos íntegros, somando todas as cirurgias finalizadas.",
    "dash.transec_rate_title": "Taxa de transecção por cirurgia",
    "dash.transec_rate_hint": "Modo completo e modo reduzido calculam a taxa de formas diferentes — por isso ficam em abas separadas, não misture os números.",
    "dash.mode_all": "Todos",
    "dash.rate_todos_hint": "Aqui é só pra ver a evolução cronológica de todas as cirurgias juntas — cada barra usa a taxa correta da própria cirurgia. Não existe uma \"taxa média geral\" porque completo e reduzido calculam a taxa de formas diferentes. Pra ver a média, use as abas Completo ou Reduzido.",
    "dash.rate_empty": "Nenhuma cirurgia finalizada nesse modo ainda.",
    "dash.quad_index_title": "Índice e transecção por quadrante",
    "dash.quad_hint": "Usa a mesma aba Completo/Reduzido/Todos acima. Diferença Mamba × bancada só entra na média das cirurgias em que o Mamba foi preenchido naquele quadrante.",
    "dash.quad_todos_hint": "Na aba \"Todos\" essas médias somem pelo mesmo motivo da taxa de transecção — completo e reduzido não são comparáveis. Use as abas Completo ou Reduzido.",
    "dash.finalized_surgeries_title": "Cirurgias finalizadas",
    "dash.stat_extracted_total": "Folículos extraídos (total)",
    "dash.stat_hairs_total": "Fios transplantados (total)",
    "dash.stat_avg_index": "Índice médio",
    "dash.stat_preinc_avg": "Pré-incisões média/cirurgia",
    "dash.stat_preinc_total": "Pré-incisões total",
    "dash.stat_follicles_per_min": "Folículos/minuto (médio)",
    "dash.stat_avg_time_per_1000": "Tempo médio por 1000 unidades",
    "dash.stat_minis_per_1000": "Minis por 1000 folículos",
    "dash.stat_surgeries_all_modes": "Cirurgias (todos os modos)",
    "dash.stat_in_complete_mode": "— em modo completo",
    "dash.stat_in_reduced_mode": "— em modo reduzido",
    "dash.stat_surgeries_mode_complete": "Cirurgias (completo)",
    "dash.stat_surgeries_mode_reduced": "Cirurgias (reduzido)",
    "dash.stat_partial_rate_avg": "Taxa parcial média",
    "dash.stat_total_rate_avg": "Taxa total média",
    "dash.no_data_yet": "Sem dados suficientes ainda.",
    "dash.table_quadrant": "Quadrante",
    "dash.table_surgeries": "Cirurgias",
    "dash.table_avg_index": "Índice médio",
    "dash.table_partial_rate_avg": "Tx. parcial média",
    "dash.table_total_rate_avg": "Tx. total média",
    "dash.table_mamba_vs_bench": "Mamba × bancada",
    "dash.table_category": "Categoria",
    "dash.table_quantity": "Quantidade",
    "dash.table_pct_intact": "% dos íntegros",
    "dash.table_surgery": "Cirurgia",
    "dash.table_date": "Data",
    "dash.table_mode": "Modo",
    "dash.table_extracted": "Extraídos",
    "dash.table_index": "Índice",
    "dash.table_partial_rate": "Tx. parcial",
    "dash.table_total_rate": "Tx. total",
    "dash.table_preinc": "Pré-inc.",
    "print.title": "Relatório de Extração Folicular",
    "print.patient_label": "Paciente (código)",
    "print.status_label": "Status",
    "print.mode_label": "Modo",
    "print.index_label": "Índice",
    "print.rate_avg_label": "Ritmo médio",
    "print.fol_per_hour_suffix": " fol./h",
    "print.preinc_per_hour_suffix": " pré-inc./h",
    "print.total_surgery_time_label": "Tempo total da cirurgia",
    "print.mamba_rate_label": "Ritmo pelo Mamba",
    "print.extraction_prefix": "Extração — ",
    "print.mamba_accumulated_label": "Mamba (leitura acumulada)",
    "print.table_hairs_per_follicle": "Fios/folículo",
    "print.table_qty": "Qtde",
    "print.table_total_hairs": "Fios totais",
    "print.table_area": "Área",
    "print.table_preincisions": "Pré-incisões",
    "print.dist_title": "Distribuição de unidades por área",
    "print.table_total": "Total",
    "print.table_grand_total": "Total geral",
    "print.photos_prefix": "Fotos — ",
    "print.generated_at": "Gerado em "
  },
  en: {
    "common.email": "Email",
    "common.password": "Password",
    "common.confirm_password": "Confirm password",
    "auth.title": "Doctor area",
    "auth.subtitle": "Log in to see and create your own surgeries. Assistants who already have the link to a specific surgery don't need an account — only whoever creates and manages the surgery list needs to log in.",
    "auth.tab_login": "Log in",
    "auth.tab_register": "Create account",
    "auth.login_submit": "Log in",
    "auth.forgot_link": "Forgot my password",
    "auth.forgot_email_label": "Your registered email",
    "auth.forgot_submit": "Send reset link",
    "auth.field_fullname": "Full name",
    "auth.field_crm": "Medical license number",
    "auth.crm_placeholder": "e.g. 123456-SP",
    "auth.field_phone": "Phone number",
    "auth.phone_placeholder": "e.g. +1 555 123 4567",
    "auth.register_submit": "Create account",
    "reset.title": "New password",
    "reset.subtitle": "Choose a new password for your account.",
    "reset.new_password": "New password",
    "reset.confirm_password": "Confirm new password",
    "reset.submit": "Save new password",
    "toast.fill_email_password": "Fill in email and password.",
    "toast.welcome": "Welcome, {name}.",
    "toast.fill_all_fields": "Fill in all fields.",
    "toast.passwords_dont_match": "Passwords don't match.",
    "toast.password_too_short": "Password must be at least 6 characters.",
    "toast.account_created_welcome": "Account created. Welcome, {name}.",
    "toast.logged_out": "You've logged out.",
    "toast.logout_all_confirm": "This logs your account out of ALL devices where you're currently logged in (including this one). You'll need to log in again on each one. Continue?",
    "toast.logged_out_all": "You've logged out of all devices.",
    "toast.generic_error": "Error: {msg}",
    "toast.enter_your_email": "Enter your email.",
    "toast.reset_link_sent_generic": "If that email is registered, we've sent a reset link.",
    "toast.enter_new_password": "Enter the new password.",
    "toast.password_changed_login": "Password changed. Log in with your new password.",
    "errors.invalid_email": "Invalid email.",
    "errors.email_already_registered": "An account with this email already exists.",
    "errors.invalid_credentials": "Incorrect email or password.",
    "errors.invalid_body": "Invalid request body.",
    "errors.reset_link_invalid": "Invalid or expired link. Request a new one from the login screen.",
    "errors.account_not_found": "Account not found.",
    "errors.too_many_registrations": "Too many sign-ups from this address. Try again in a few hours.",
    "errors.too_many_logins": "Too many login attempts. Wait a few minutes and try again.",
    "errors.too_many_forgot": "Too many reset requests from this address. Try again later.",
    "errors.not_authenticated": "Not authenticated.",
    "errors.invalid_image": "Invalid image.",
    "errors.image_processing_error_prefix": "Error processing image: ",
    "errors.login_required_create_surgery": "Log in to create a surgery.",
    "errors.patient_code_required": "Patient code is required.",
    "errors.too_many_missing_session_attempts": "Too many attempts to access nonexistent surgeries from this address. Wait a few minutes.",
    "errors.surgery_not_found_server": "Surgery not found on this server.",
    "errors.surgery_not_found": "Surgery not found.",
    "errors.surgery_already_finalized": "Surgery already finalized.",
    "errors.invalid_parameters": "Invalid parameters.",
    "errors.invalid_quadrant": "Invalid quadrant.",
    "errors.invalid_value": "Invalid value.",
    "errors.invalid_category": "Invalid category.",
    "errors.photo_processing_error_prefix": "Error processing photo: ",
    "errors.photo_not_found": "Photo not found.",
    "errors.surgery_finalized_reopen_timer": "Surgery finalized — reopen it to change the timer.",
    "errors.login_required_delete_surgery": "Log in to delete a surgery.",
    "errors.surgery_not_yours": "This surgery isn't yours.",
    "errors.quadrant_locked": "This quadrant is locked. Reopen it to edit.",
    "errors.value_below_carry": "The value can't be lower than the total already carried from the previous quadrant ({carry}).",
    "errors.invalid_carry_link": "Can't link that quadrant (it would create a cycle).",
    "toast.login_required_dashboard": "Log in to see the dashboard.",
    "toast.server_unreachable": "Couldn't reach the server.",
    "toast.add_at_least_one_value": "Add at least one value.",
    "toast.settings_saved": "Settings saved.",
    "toast.defaults_restored": "Defaults restored.",
    "toast.surgery_deleted": "Surgery deleted.",
    "toast.enter_patient_code": "Enter a patient code or initials.",
    "toast.sync_failed": "Didn't sync: {msg}",
    "toast.uploading_photos": "Uploading {n} photo(s)...",
    "toast.photos_uploaded": "Photo(s) uploaded.",
    "toast.photo_upload_error": "Error uploading photo: {msg}",
    "toast.logo_updated": "Logo updated.",
    "toast.logo_upload_error": "Error uploading logo: {msg}",
    "toast.logo_removed": "Logo removed.",
    "toast.surgery_finalized": "Surgery finalized.",
    "toast.surgery_reopened": "Surgery reopened.",
    "toast.quadrant_finished": "Quadrant finished.",
    "toast.quadrant_reopened": "Quadrant reopened.",
    "toast.address_copied": "Address copied.",
    "toast.copy_failed_manual": "Couldn't copy — select the text manually.",
    "toast.copy_manually": "Copy the address manually: {url}",
    "toast.no_native_share": "This browser doesn't have native sharing — use WhatsApp or Copy.",
    "toast.no_speech_synthesis": "This browser doesn't support speech synthesis.",
    "confirm.delete_surgery": "Permanently delete surgery \"{code}\"? This removes all its counts, pre-incisions, and photos. This action can't be undone.",
    "confirm.delete_photo": "Remove this photo?",
    "confirm.delete_logo": "Remove the logo?",
    "confirm.reset_extraction_timer": "Reset this surgery's timer (affects all connected devices)?",
    "confirm.reset_preinc_timer": "Reset the pre-incision timer (affects all connected devices)?",
    "confirm.finalize_surgery": "Finalize this surgery? This locks the counts on all connected devices.",
    "confirm.finish_quadrant": "Finish counting this quadrant? It will stay locked until you reopen it.",
    "confirm.reopen_quadrant": "Reopen this quadrant to edit it again?",
    "prompt.set_value_for": "Set value for \"{label}\":",
    "prompt.set_quantity_for": "Set quantity for \"{label}\":",
    "errors.file_read_error": "Couldn't read the file.",
    "errors.photo_link_expired": "Access to this photo via the link has expired (surgery finalized more than 90 days ago). Ask the surgery's owner to log in to view it.",
    "email.reset_subject": "Reset your password — Graftis",
    "email.reset_body": "Hi {name},\n\nYou asked to reset your Graftis password.\n\nTap the link below (or copy and paste it into your browser) to choose a new password. This link expires in 30 minutes and only works once:\n\n{url}\n\nIf you didn't request this, just ignore this email — your password stays the same.",
    "nav.home": "Home",
    "nav.dashboard": "Dashboard",
    "nav.config": "Settings",
    "nav.exit": "Log out",
    "common.mode_complete": "Complete",
    "common.mode_reduced": "Reduced",
    "common.open": "Open",
    "common.delete": "Delete",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.remove": "Remove",
    "common.back": "Back",
    "home.title": "Your surgeries",
    "home.subtitle": "Only you can see this list. After creating a surgery, share its link with assistants — they update the data live without needing an account.",
    "home.patient_code_label": "Patient code / initials",
    "home.patient_code_placeholder": "e.g. JS-090726",
    "home.count_mode_label": "Counting mode",
    "home.mode_explanation": "Complete: each partial transection is logged by its exact type (2→1, 3→2, etc). Reduced: partial-transection hairs are counted together with intact follicles, and a single partial-transection counter is used to calculate the rate — without detailing the type. Can't be changed after the surgery is created.",
    "home.create_button": "+ New surgery (create session)",
    "home.no_surgeries_yet": "You haven't created any surgeries yet.",
    "config.title": "Settings",
    "config.increments_subtitle": "Extra values for the quick-increment buttons used during extraction counting, besides the -1/+1 that's always shown. This device only — each phone can have its own buttons (e.g. only +1 and +100, or only +50).",
    "config.add_value": "+ Add value",
    "config.restore_default": "Restore default (10 / 50 / 100)",
    "config.identity_title": "Visual identity",
    "config.identity_subtitle": "Applies to your account — shows up on every device where you log in, and also for anyone who opens your surgeries just via the link (without logging in).",
    "config.logo_label": "Logo",
    "config.logo_empty": "No logo yet.",
    "config.theme_label": "Theme color",
    "config.darkmode_label": "Dark mode",
    "config.darkmode_hint": "Clinical colors (intact/partial/total/mini) don't change — only the background and text.",
    "config.language_label": "Idioma / Language / Idioma",
    "config.language_hint": "For now only the login/sign-up screen is translated — the rest of the app is still in Portuguese.",
    "config.security_title": "Account security",
    "config.security_subtitle": "If you lost or lent out a device where you were logged in, use this to end access everywhere at once.",
    "config.logout_all_btn": "Log out of all devices",
    "config.backup_title": "Back up your data",
    "config.backup_subtitle": "Download a file with your account registration and all your surgeries (counts, times, pre-incisions). Doesn't include photos — those are protected separately by Railway's volume backup. Keep this file somewhere safe outside Railway (your computer, Google Drive, etc.).",
    "config.backup_btn": "Download backup",
    "config.back_to_surgery": "Back to surgery",
    "config.audio_title": "Audio and alarms for this surgery",
    "config.audio_subtitle": "Applies only to the surgery you had open, and only on this device — each phone can have its own settings.",
    "config.audio_section_title": "Audio",
    "config.audio_announce_hint": "Announces out loud the total follicles extracted (adding up all 4 quadrants) every N.",
    "config.audio_announce_every": "Announce every",
    "config.audio_test_btn": "Test voice",
    "config.preinc_audio_section_title": "Pre-incision audio",
    "config.preinc_audio_announce_hint": "Announces out loud the new pre-incision total (adding up all areas) every time you fill in an area's value.",
    "config.alarm_section_title": "Transection alarm",
    "config.alarm_subtitle": "Announces by voice as soon as the rate (adding up all 4 quadrants) goes over the limit you set.",
    "config.alert_partial_label": "Alert if partial transection goes over (%)",
    "config.alert_partial_placeholder": "e.g. 7",
    "config.alert_total_label": "Alert if total transection goes over (%)",
    "config.alert_total_placeholder": "e.g. 5",
    "cat.f1": "1 hair",
    "cat.f2": "2 hairs",
    "cat.f3": "3 hairs",
    "cat.f4": "4 hairs",
    "cat.f1fino": "1 hair (special)",
    "cat.f2fino": "2 hairs (special)",
    "cat.t2_1": "2 → 1 hair",
    "cat.t3_2": "3 → 2 hairs",
    "cat.t3_1": "3 → 1 hair",
    "cat.t4_3": "4 → 3 hairs",
    "cat.t4_2": "4 → 2 hairs",
    "cat.t4_1": "4 → 1 hair",
    "cat.parcial_geral": "Partial transection",
    "cat.ttotal": "Total transection (lost follicle)",
    "cat.mini": "Mini (miniaturized)",
    "quad.temporal_dir": "Right temporal",
    "quad.temporal_esq": "Left temporal",
    "quad.occipital_dir": "Right occipital",
    "quad.occipital_esq": "Left occipital",
    "preinc.recesso_dir": "Right recess",
    "preinc.recesso_esq": "Left recess",
    "preinc.linha": "Hairline",
    "preinc.sublinha": "Sub-hairline",
    "preinc.entrada_dir1": "Right entry 1",
    "preinc.entrada_dir2": "Right entry 2",
    "preinc.entrada_esq1": "Left entry 1",
    "preinc.entrada_esq2": "Left entry 2",
    "preinc.topete1": "Forelock 1",
    "preinc.topete2": "Forelock 2",
    "preinc.scalp": "Scalp",
    "preinc.coroa": "Crown",
    "common.start": "Start",
    "common.pause": "Pause",
    "common.reset": "Reset",
    "common.status_finalized": "Finalized",
    "common.status_in_progress": "In progress",
    "cnt.share_btn": "🔗 Share",
    "cnt.tab_extracao": "Extraction",
    "cnt.tab_preinc": "Pre-incisions",
    "cnt.tab_fotos": "Photos",
    "cnt.tab_paciente": "Patient",
    "cnt.tab_resumo": "Final Summary",
    "cnt.final_summary_title": "Final surgery summary",
    "cnt.final_times_title": "Times",
    "cnt.final_categories_title": "Follicles by category",
    "cnt.final_preinc_title": "Pre-incision summary",
    "cnt.final_preinc_diff": "Difference (follicles extracted − pre-incisions)",
    "patient.section_title": "Patient info",
    "patient.section_hint": "Optional — fill it out now, later, or never. Doesn't block anything about the surgery.",
    "patient.age_label": "Age",
    "patient.age_placeholder": "e.g. 45",
    "patient.height_label": "Height (cm)",
    "patient.height_placeholder": "e.g. 175",
    "patient.weight_label": "Weight (kg)",
    "patient.weight_placeholder": "e.g. 80",
    "patient.hair_thickness_label": "Hair thickness",
    "patient.hair_thin": "Thin",
    "patient.hair_thick": "Thick",
    "patient.hair_texture_label": "Hair texture",
    "patient.hair_straight": "Straight",
    "patient.hair_wavy": "Wavy",
    "patient.hair_curly": "Curly",
    "patient.surgery_type_label": "Surgery type",
    "patient.with_shaving": "With shaving",
    "patient.without_shaving": "Without shaving",
    "home.patient_info_toggle": "Patient info (optional)",
    "cnt.extraction_time_title": "Extraction time",
    "cnt.rate_hint": "Average rate: {rate} follicles/hour",
    "cnt.summary_general_title": "Overall summary (all quadrants)",
    "cnt.summary_extracted": "Follicles extracted",
    "cnt.summary_total_hairs": "Total hairs",
    "cnt.summary_index": "Hairs/follicle index",
    "cnt.summary_partial_transec": "Partial transection",
    "cnt.summary_total_transec": "Total transection",
    "cnt.summary_mini": "Mini (not in total)",
    "cnt.mamba_reading": "Mamba (final reading)",
    "cnt.mamba_diff": "Difference",
    "cnt.mamba_diffpct": "Difference (% of Mamba)",
    "cnt.mamba_diff_extraidos": "Difference (Mamba − Extracted)",
    "cnt.mamba_diffpct_extraidos": "Difference (% Mamba × Extracted)",
    "cnt.mamba_rate": "Rate by Mamba (follicles/h)",
    "cnt.mamba_hint": "Fill in the Mamba value in the order quadrants are extracted. It's the device's cumulative reading at the end of this quadrant — the app calculates the difference from the previous quadrant automatically.",
    "cnt.mamba_input_label": "Mamba (cumulative reading at the end of this quadrant)",
    "cnt.mamba_input_placeholder": "e.g. 1000",
    "cnt.mamba_quad_val": "Mamba for this quadrant",
    "cnt.mamba_quad_duration": "Time for this quadrant",
    "cnt.chain_title": "Chained count",
    "cnt.chain_hint_none": "This quadrant starts from zero.",
    "cnt.chain_hint_from": "Counting from: {label} ({total})",
    "cnt.carry_from_label": "Carry count from",
    "cnt.carry_from_none_option": "None (start from zero)",
    "cnt.quadrant_finish_btn": "Count finished",
    "cnt.quadrant_reopen_btn": "Reopen quadrant",
    "cnt.group_integro_title": "Intact follicles",
    "cnt.group_parcial_title": "Partial transection (follicle used)",
    "cnt.parcial_reduzido_hint": "Reduced mode: log this follicle's hairs normally under \"Intact follicles\" and tap here only to count the partial transection (it isn't added again to the total).",
    "cnt.group_mini_title": "Mini",
    "cnt.mini_hint": "Miniaturized follicles — not included in the overall count of follicles extracted, hairs, or rates, but logged here so they aren't lost.",
    "preinc.time_title": "Pre-incision time",
    "preinc.total_label": "Total pre-incisions",
    "preinc.by_area_title": "Pre-incisions by area",
    "preinc.area_hint": "Tap the number on top to enter the area's total. UF1/UF2/UF3 below = how many follicular units of 1, 2, or 3 hairs go to that area.",
    "photos.marcacao_title": "Surgical marking",
    "photos.marcacao_hint": "Saved on this server — visible on every connected phone.",
    "photos.posop_title": "Immediate post-op",
    "cnt.print_btn": "Print / Save PDF",
    "cnt.finalize_btn": "Finalize surgery",
    "cnt.reopen_btn": "Reopen",
    "share.title": "Share surgery",
    "share.url_label": "This surgery's address (share it with other phones)",
    "share.share_link_btn": "Share link",
    "share.whatsapp_btn": "Send via WhatsApp",
    "share.copy_btn": "Copy",
    "audio.test_phrase": "Audio test. One hundred twenty-three follicles.",
    "audio.milestone": "{n} follicles.",
    "audio.preinc_update": "{n} pre-incisions.",
    "cnt.mode_full": "Complete mode",
    "cnt.mode_reduced": "Reduced mode",
    "cnt.global_not_started": "Total time: not started yet",
    "cnt.global_timer_prefix": "⏱ Total surgery time: ",
    "cnt.global_finalized_suffix": " (finalized)",
    "cnt.global_in_progress_suffix": " (in progress)",
    "preinc.rate_hint": "Average rate: {rate} pre-incisions/hour",
    "cnt.hair_singular": "hair",
    "cnt.hair_plural": "hairs",
    "cnt.per_follicle_suffix": " per follicle",
    "cnt.hairs_not_in_total": "not included in the overall count",
    "cnt.hairs_informative_only": "informational count only",
    "cnt.hairs_lost": "0 hairs (lost)",
    "dash.title": "Dashboard",
    "dash.subtitle": "Statistics calculated only from finalized surgeries — surgeries in progress have partial data and are excluded, to avoid skewing the averages.",
    "dash.empty": "You don't have any finalized surgeries yet. Statistics appear here as soon as the first one is finalized.",
    "dash.extracted_by_surgery_title": "Follicles extracted per surgery",
    "dash.extracted_by_surgery_hint": "Each bar is a finalized surgery, in chronological order — you can see whether volume per surgery is rising or falling over time.",
    "dash.index_by_surgery_title": "Hairs/follicle index per surgery",
    "dash.index_by_surgery_hint": "Each bar is a finalized surgery, in chronological order.",
    "dash.uf_distribution_title": "Distribution by follicular unit type",
    "dash.uf_distribution_hint": "Percentage across all intact follicles, adding up all finalized surgeries.",
    "dash.transec_rate_title": "Transection rate per surgery",
    "dash.transec_rate_hint": "Complete mode and reduced mode calculate the rate differently — that's why they're on separate tabs, don't mix the numbers.",
    "dash.mode_all": "All",
    "dash.rate_todos_hint": "This is just to see the chronological trend across all surgeries together — each bar uses that surgery's own correct rate. There's no \"overall average rate\" because complete and reduced calculate the rate differently. To see the average, use the Complete or Reduced tabs.",
    "dash.rate_empty": "No finalized surgeries in this mode yet.",
    "dash.quad_index_title": "Index and transection by quadrant",
    "dash.quad_hint": "Uses the same Complete/Reduced/All tab above. Mamba × bench difference only counts toward the average for surgeries where Mamba was filled in for that quadrant.",
    "dash.quad_todos_hint": "On the \"All\" tab these averages disappear for the same reason as the transection rate — complete and reduced aren't comparable. Use the Complete or Reduced tabs.",
    "dash.finalized_surgeries_title": "Finalized surgeries",
    "dash.stat_extracted_total": "Follicles extracted (total)",
    "dash.stat_hairs_total": "Hairs transplanted (total)",
    "dash.stat_avg_index": "Average index",
    "dash.stat_preinc_avg": "Pre-incisions average/surgery",
    "dash.stat_preinc_total": "Total pre-incisions",
    "dash.stat_follicles_per_min": "Follicles/minute (average)",
    "dash.stat_avg_time_per_1000": "Average time per 1000 units",
    "dash.stat_minis_per_1000": "Minis per 1000 follicles",
    "dash.stat_surgeries_all_modes": "Surgeries (all modes)",
    "dash.stat_in_complete_mode": "— in complete mode",
    "dash.stat_in_reduced_mode": "— in reduced mode",
    "dash.stat_surgeries_mode_complete": "Surgeries (complete)",
    "dash.stat_surgeries_mode_reduced": "Surgeries (reduced)",
    "dash.stat_partial_rate_avg": "Average partial rate",
    "dash.stat_total_rate_avg": "Average total rate",
    "dash.no_data_yet": "Not enough data yet.",
    "dash.table_quadrant": "Quadrant",
    "dash.table_surgeries": "Surgeries",
    "dash.table_avg_index": "Average index",
    "dash.table_partial_rate_avg": "Avg. partial rate",
    "dash.table_total_rate_avg": "Avg. total rate",
    "dash.table_mamba_vs_bench": "Mamba × bench",
    "dash.table_category": "Category",
    "dash.table_quantity": "Quantity",
    "dash.table_pct_intact": "% of intact",
    "dash.table_surgery": "Surgery",
    "dash.table_date": "Date",
    "dash.table_mode": "Mode",
    "dash.table_extracted": "Extracted",
    "dash.table_index": "Index",
    "dash.table_partial_rate": "Partial rate",
    "dash.table_total_rate": "Total rate",
    "dash.table_preinc": "Pre-inc.",
    "print.title": "Follicular Extraction Report",
    "print.patient_label": "Patient (code)",
    "print.status_label": "Status",
    "print.mode_label": "Mode",
    "print.index_label": "Index",
    "print.rate_avg_label": "Average rate",
    "print.fol_per_hour_suffix": " follicles/h",
    "print.preinc_per_hour_suffix": " pre-inc./h",
    "print.total_surgery_time_label": "Total surgery time",
    "print.mamba_rate_label": "Rate by Mamba",
    "print.extraction_prefix": "Extraction — ",
    "print.mamba_accumulated_label": "Mamba (cumulative reading)",
    "print.table_hairs_per_follicle": "Hairs/follicle",
    "print.table_qty": "Qty",
    "print.table_total_hairs": "Total hairs",
    "print.table_area": "Area",
    "print.table_preincisions": "Pre-incisions",
    "print.dist_title": "Unit distribution by area",
    "print.table_total": "Total",
    "print.table_grand_total": "Grand total",
    "print.photos_prefix": "Photos — ",
    "print.generated_at": "Generated on "
  },
  es: {
    "common.email": "Correo electrónico",
    "common.password": "Contraseña",
    "common.confirm_password": "Confirmar contraseña",
    "auth.title": "Área del médico",
    "auth.subtitle": "Inicia sesión para ver y crear tus propias cirugías. Los auxiliares que ya tienen el enlace de una cirugía específica no necesitan cuenta — solo quien crea y gestiona la lista de cirugías necesita iniciar sesión.",
    "auth.tab_login": "Iniciar sesión",
    "auth.tab_register": "Crear cuenta",
    "auth.login_submit": "Iniciar sesión",
    "auth.forgot_link": "Olvidé mi contraseña",
    "auth.forgot_email_label": "Su correo registrado",
    "auth.forgot_submit": "Enviar enlace de restablecimiento",
    "auth.field_fullname": "Nombre completo",
    "auth.field_crm": "Número de colegiado / matrícula profesional",
    "auth.crm_placeholder": "Ej: 123456-SP",
    "auth.field_phone": "Teléfono",
    "auth.phone_placeholder": "Ej: +34 612 345 678",
    "auth.register_submit": "Crear cuenta",
    "reset.title": "Nueva contraseña",
    "reset.subtitle": "Elige una nueva contraseña para tu cuenta.",
    "reset.new_password": "Nueva contraseña",
    "reset.confirm_password": "Confirmar nueva contraseña",
    "reset.submit": "Guardar nueva contraseña",
    "toast.fill_email_password": "Complete el correo y la contraseña.",
    "toast.welcome": "Bienvenido/a, {name}.",
    "toast.fill_all_fields": "Complete todos los campos.",
    "toast.passwords_dont_match": "Las contraseñas no coinciden.",
    "toast.password_too_short": "La contraseña debe tener al menos 6 caracteres.",
    "toast.account_created_welcome": "Cuenta creada. Bienvenido/a, {name}.",
    "toast.logged_out": "Cerraste sesión.",
    "toast.logout_all_confirm": "Esto cierra la sesión de tu cuenta en TODOS los dispositivos donde esté conectada (incluido este). Tendrás que iniciar sesión de nuevo en cada uno. ¿Continuar?",
    "toast.logged_out_all": "Cerraste sesión en todos los dispositivos.",
    "toast.generic_error": "Error: {msg}",
    "toast.enter_your_email": "Ingrese su correo.",
    "toast.reset_link_sent_generic": "Si ese correo está registrado, enviamos un enlace de restablecimiento.",
    "toast.enter_new_password": "Ingrese la nueva contraseña.",
    "toast.password_changed_login": "Contraseña cambiada. Inicia sesión con la nueva contraseña.",
    "errors.invalid_email": "Correo inválido.",
    "errors.email_already_registered": "Ya existe una cuenta con este correo.",
    "errors.invalid_credentials": "Correo o contraseña incorrectos.",
    "errors.invalid_body": "Cuerpo de solicitud inválido.",
    "errors.reset_link_invalid": "Enlace inválido o caducado. Solicite uno nuevo desde la pantalla de inicio de sesión.",
    "errors.account_not_found": "Cuenta no encontrada.",
    "errors.too_many_registrations": "Demasiados registros desde esta dirección. Vuelva a intentarlo en unas horas.",
    "errors.too_many_logins": "Demasiados intentos de inicio de sesión. Espere unos minutos e intente de nuevo.",
    "errors.too_many_forgot": "Demasiadas solicitudes de restablecimiento desde esta dirección. Vuelva a intentarlo más tarde.",
    "errors.not_authenticated": "No autenticado.",
    "errors.invalid_image": "Imagen inválida.",
    "errors.image_processing_error_prefix": "Error al procesar la imagen: ",
    "errors.login_required_create_surgery": "Inicia sesión para crear una cirugía.",
    "errors.patient_code_required": "El código del paciente es obligatorio.",
    "errors.too_many_missing_session_attempts": "Demasiados intentos de acceso a cirugías inexistentes desde esta dirección. Espere unos minutos.",
    "errors.surgery_not_found_server": "Cirugía no encontrada en este servidor.",
    "errors.surgery_not_found": "Cirugía no encontrada.",
    "errors.surgery_already_finalized": "Cirugía ya finalizada.",
    "errors.invalid_parameters": "Parámetros inválidos.",
    "errors.invalid_quadrant": "Cuadrante inválido.",
    "errors.invalid_value": "Valor inválido.",
    "errors.invalid_category": "Categoría inválida.",
    "errors.photo_processing_error_prefix": "Error al procesar la foto: ",
    "errors.photo_not_found": "Foto no encontrada.",
    "errors.surgery_finalized_reopen_timer": "Cirugía finalizada — reábrela para modificar el cronómetro.",
    "errors.login_required_delete_surgery": "Inicia sesión para eliminar una cirugía.",
    "errors.surgery_not_yours": "Esta cirugía no es tuya.",
    "errors.quadrant_locked": "Este cuadrante está bloqueado. Reábrelo para editar.",
    "errors.value_below_carry": "El valor no puede ser menor que el total ya traído del cuadrante anterior ({carry}).",
    "errors.invalid_carry_link": "No se puede vincular ese cuadrante (crearía un ciclo).",
    "toast.login_required_dashboard": "Inicia sesión para ver el dashboard.",
    "toast.server_unreachable": "No pude comunicarme con el servidor.",
    "toast.add_at_least_one_value": "Agrega al menos un valor.",
    "toast.settings_saved": "Configuración guardada.",
    "toast.defaults_restored": "Predeterminados restaurados.",
    "toast.surgery_deleted": "Cirugía eliminada.",
    "toast.enter_patient_code": "Ingresa un código o las iniciales del paciente.",
    "toast.sync_failed": "No se sincronizó: {msg}",
    "toast.uploading_photos": "Enviando {n} foto(s)...",
    "toast.photos_uploaded": "Foto(s) enviada(s).",
    "toast.photo_upload_error": "Error al enviar la foto: {msg}",
    "toast.logo_updated": "Logotipo actualizado.",
    "toast.logo_upload_error": "Error al enviar el logotipo: {msg}",
    "toast.logo_removed": "Logotipo eliminado.",
    "toast.surgery_finalized": "Cirugía finalizada.",
    "toast.surgery_reopened": "Cirugía reabierta.",
    "toast.quadrant_finished": "Cuadrante finalizado.",
    "toast.quadrant_reopened": "Cuadrante reabierto.",
    "toast.address_copied": "Dirección copiada.",
    "toast.copy_failed_manual": "No se pudo copiar — selecciona el texto manualmente.",
    "toast.copy_manually": "Copia la dirección manualmente: {url}",
    "toast.no_native_share": "Este navegador no tiene la opción de compartir directo — usa WhatsApp o Copiar.",
    "toast.no_speech_synthesis": "Este navegador no tiene síntesis de voz.",
    "confirm.delete_surgery": "¿Eliminar la cirugía \"{code}\" definitivamente? Esto elimina todos sus conteos, pre-incisiones y fotos. Esta acción no se puede deshacer.",
    "confirm.delete_photo": "¿Quitar esta foto?",
    "confirm.delete_logo": "¿Quitar el logotipo?",
    "confirm.reset_extraction_timer": "¿Reiniciar el cronómetro de esta cirugía (afecta a todos los dispositivos conectados)?",
    "confirm.reset_preinc_timer": "¿Reiniciar el cronómetro de pre-incisiones (afecta a todos los dispositivos conectados)?",
    "confirm.finalize_surgery": "¿Finalizar esta cirugía? Esto bloquea los conteos en todos los dispositivos conectados.",
    "confirm.finish_quadrant": "¿Finalizar el conteo de este cuadrante? Quedará bloqueado hasta que lo reabras.",
    "confirm.reopen_quadrant": "¿Reabrir este cuadrante para editar de nuevo?",
    "prompt.set_value_for": "Definir valor para \"{label}\":",
    "prompt.set_quantity_for": "Definir cantidad de \"{label}\":",
    "errors.file_read_error": "No pude leer el archivo.",
    "errors.photo_link_expired": "El acceso a esta foto por el enlace expiró (cirugía finalizada hace más de 90 días). Pide al médico dueño de la cirugía que inicie sesión para verla.",
    "email.reset_subject": "Restablecer tu contraseña — Graftis",
    "email.reset_body": "Hola, {name}.\n\nSolicitaste restablecer tu contraseña en Graftis.\n\nToca el enlace de abajo (o cópialo y pégalo en tu navegador) para elegir una nueva contraseña. Este enlace caduca en 30 minutos y solo funciona una vez:\n\n{url}\n\nSi no solicitaste esto, simplemente ignora este correo — tu contraseña sigue siendo la misma.",
    "nav.home": "Inicio",
    "nav.dashboard": "Dashboard",
    "nav.config": "Config.",
    "nav.exit": "Salir",
    "common.mode_complete": "Completo",
    "common.mode_reduced": "Reducido",
    "common.open": "Abrir",
    "common.delete": "Eliminar",
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.remove": "Quitar",
    "common.back": "Volver",
    "home.title": "Tus cirugías",
    "home.subtitle": "Solo tú ves esta lista. Después de crear la cirugía, comparte el enlace con los auxiliares — ellos actualizan los datos en vivo sin necesitar cuenta.",
    "home.patient_code_label": "Código / iniciales del paciente",
    "home.patient_code_placeholder": "Ej: JS-090726",
    "home.count_mode_label": "Modo de conteo",
    "home.mode_explanation": "Completo: cada transección parcial se registra en el tipo exacto (2→1, 3→2, etc). Reducido: los pelos de la transección parcial entran junto con los folículos íntegros, y se usa un único contador de transección parcial para calcular la tasa — sin detallar el tipo. No se puede cambiar después de creada.",
    "home.create_button": "+ Nueva cirugía (crear sesión)",
    "home.no_surgeries_yet": "Aún no has creado ninguna cirugía.",
    "config.title": "Configuración",
    "config.increments_subtitle": "Valores extra de los botones de incremento rápido usados en el conteo de extracción, además del -1/+1 que siempre aparece. Configuración solo de este dispositivo — cada celular puede tener sus propios botones (por ejemplo, solo +1 y +100, o solo +50).",
    "config.add_value": "+ Agregar valor",
    "config.restore_default": "Restaurar predeterminado (10 / 50 / 100)",
    "config.identity_title": "Identidad visual",
    "config.identity_subtitle": "Se aplica a tu cuenta — aparece en todos los dispositivos donde inicies sesión, y también para quien acceda a tus cirugías solo por el enlace (sin iniciar sesión).",
    "config.logo_label": "Logotipo",
    "config.logo_empty": "Aún no hay logotipo.",
    "config.theme_label": "Color del tema",
    "config.darkmode_label": "Modo oscuro",
    "config.darkmode_hint": "Los colores clínicos (íntegro/parcial/total/mini) no cambian — solo el fondo y los textos.",
    "config.language_label": "Idioma / Language / Idioma",
    "config.language_hint": "Por ahora solo la pantalla de inicio de sesión/registro está traducida — el resto de la app sigue en portugués.",
    "config.security_title": "Seguridad de la cuenta",
    "config.security_subtitle": "Si perdiste o prestaste un dispositivo donde habías iniciado sesión, usa esto para cerrar el acceso en todos lados de una vez.",
    "config.logout_all_btn": "Cerrar sesión en todos los dispositivos",
    "config.backup_title": "Copia de seguridad de tus datos",
    "config.backup_subtitle": "Descarga un archivo con el registro de tu cuenta y todas tus cirugías (conteos, tiempos, preincisiones). No incluye las fotos — esas están protegidas por separado por la copia de seguridad de volumen de Railway. Guarda este archivo en un lugar seguro fuera de Railway (tu computadora, Google Drive, etc.).",
    "config.backup_btn": "Descargar copia de seguridad",
    "config.back_to_surgery": "Volver a la cirugía",
    "config.audio_title": "Audio y alarmas de esta cirugía",
    "config.audio_subtitle": "Se aplica solo a la cirugía que tenías abierta y solo en este dispositivo — cada celular puede tener sus propios ajustes.",
    "config.audio_section_title": "Audio",
    "config.audio_announce_hint": "Anuncia en voz alta el total de folículos extraídos (sumando los 4 cuadrantes) cada N.",
    "config.audio_announce_every": "Anunciar cada",
    "config.audio_test_btn": "Probar voz",
    "config.preinc_audio_section_title": "Audio de pre-incisiones",
    "config.preinc_audio_announce_hint": "Anuncia en voz alta el nuevo total de pre-incisiones (sumando todas las áreas) cada vez que completes el valor de un área.",
    "config.alarm_section_title": "Alarma de transección",
    "config.alarm_subtitle": "Avisa por voz apenas la tasa (sumando los 4 cuadrantes) supere el límite que definas.",
    "config.alert_partial_label": "Avisar si la transección parcial supera (%)",
    "config.alert_partial_placeholder": "Ej: 7",
    "config.alert_total_label": "Avisar si la transección total supera (%)",
    "config.alert_total_placeholder": "Ej: 5",
    "cat.f1": "1 pelo",
    "cat.f2": "2 pelos",
    "cat.f3": "3 pelos",
    "cat.f4": "4 pelos",
    "cat.f1fino": "1 pelo especial",
    "cat.f2fino": "2 pelos especial",
    "cat.t2_1": "2 → 1 pelo",
    "cat.t3_2": "3 → 2 pelos",
    "cat.t3_1": "3 → 1 pelo",
    "cat.t4_3": "4 → 3 pelos",
    "cat.t4_2": "4 → 2 pelos",
    "cat.t4_1": "4 → 1 pelo",
    "cat.parcial_geral": "Transección parcial",
    "cat.ttotal": "Transección total (folículo perdido)",
    "cat.mini": "Mini (miniaturizado)",
    "quad.temporal_dir": "Temporal derecho",
    "quad.temporal_esq": "Temporal izquierdo",
    "quad.occipital_dir": "Occipital derecho",
    "quad.occipital_esq": "Occipital izquierdo",
    "preinc.recesso_dir": "Receso derecho",
    "preinc.recesso_esq": "Receso izquierdo",
    "preinc.linha": "Línea",
    "preinc.sublinha": "Sublínea",
    "preinc.entrada_dir1": "Entrada derecha 1",
    "preinc.entrada_dir2": "Entrada derecha 2",
    "preinc.entrada_esq1": "Entrada izquierda 1",
    "preinc.entrada_esq2": "Entrada izquierda 2",
    "preinc.topete1": "Tupé 1",
    "preinc.topete2": "Tupé 2",
    "preinc.scalp": "Scalp",
    "preinc.coroa": "Corona",
    "common.start": "Iniciar",
    "common.pause": "Pausar",
    "common.reset": "Reiniciar",
    "common.status_finalized": "Finalizada",
    "common.status_in_progress": "En curso",
    "cnt.share_btn": "🔗 Compartir",
    "cnt.tab_extracao": "Extracción",
    "cnt.tab_preinc": "Pre-incisiones",
    "cnt.tab_fotos": "Fotos",
    "cnt.tab_paciente": "Paciente",
    "cnt.tab_resumo": "Resumen Final",
    "cnt.final_summary_title": "Resumen final de la cirugía",
    "cnt.final_times_title": "Tiempos",
    "cnt.final_categories_title": "Folículos por categoría",
    "cnt.final_preinc_title": "Resumen de preincisiones",
    "cnt.final_preinc_diff": "Diferencia (folículos extraídos − preincisiones)",
    "patient.section_title": "Datos del paciente",
    "patient.section_hint": "Opcional — complételo ahora, después o nunca. No bloquea nada de la cirugía.",
    "patient.age_label": "Edad",
    "patient.age_placeholder": "Ej: 45",
    "patient.height_label": "Altura (cm)",
    "patient.height_placeholder": "Ej: 175",
    "patient.weight_label": "Peso (kg)",
    "patient.weight_placeholder": "Ej: 80",
    "patient.hair_thickness_label": "Espesor del cabello",
    "patient.hair_thin": "Fino",
    "patient.hair_thick": "Grueso",
    "patient.hair_texture_label": "Textura del cabello",
    "patient.hair_straight": "Liso",
    "patient.hair_wavy": "Ondulado",
    "patient.hair_curly": "Crespo",
    "patient.surgery_type_label": "Tipo de cirugía",
    "patient.with_shaving": "Con rasurado",
    "patient.without_shaving": "Sin rasurado",
    "home.patient_info_toggle": "Datos del paciente (opcional)",
    "cnt.extraction_time_title": "Tiempo de extracción",
    "cnt.rate_hint": "Ritmo promedio: {rate} folículos/hora",
    "cnt.summary_general_title": "Resumen general (todos los cuadrantes)",
    "cnt.summary_extracted": "Folículos extraídos",
    "cnt.summary_total_hairs": "Total de pelos",
    "cnt.summary_index": "Índice pelos/folículo",
    "cnt.summary_partial_transec": "Transección parcial",
    "cnt.summary_total_transec": "Transección total",
    "cnt.summary_mini": "Mini (fuera del total)",
    "cnt.mamba_reading": "Mamba (lectura final)",
    "cnt.mamba_diff": "Diferencia",
    "cnt.mamba_diffpct": "Diferencia (% del Mamba)",
    "cnt.mamba_diff_extraidos": "Diferencia (Mamba − Extraídos)",
    "cnt.mamba_diffpct_extraidos": "Diferencia (% Mamba × Extraídos)",
    "cnt.mamba_rate": "Ritmo según Mamba (fol./h)",
    "cnt.mamba_hint": "Completa el Mamba en el orden en que se extraen los cuadrantes. El valor es la lectura acumulada del aparato al final de este cuadrante — la app calcula sola la diferencia respecto al cuadrante anterior.",
    "cnt.mamba_input_label": "Mamba (lectura acumulada al final de este cuadrante)",
    "cnt.mamba_input_placeholder": "Ej: 1000",
    "cnt.mamba_quad_val": "Mamba de este cuadrante",
    "cnt.mamba_quad_duration": "Tiempo de este cuadrante",
    "cnt.chain_title": "Conteo en cadena",
    "cnt.chain_hint_none": "Este cuadrante empieza desde cero.",
    "cnt.chain_hint_from": "Contando a partir de: {label} ({total})",
    "cnt.carry_from_label": "Cargar conteo de",
    "cnt.carry_from_none_option": "Ninguno (empezar desde cero)",
    "cnt.quadrant_finish_btn": "Conteo finalizado",
    "cnt.quadrant_reopen_btn": "Reabrir cuadrante",
    "cnt.group_integro_title": "Folículos íntegros",
    "cnt.group_parcial_title": "Transección parcial (folículo aprovechado)",
    "cnt.parcial_reduzido_hint": "Modo reducido: registra los pelos de ese folículo normalmente en \"Folículos íntegros\" y toca aquí solo para contar la transección parcial (no se suma de nuevo al total).",
    "cnt.group_mini_title": "Mini",
    "cnt.mini_hint": "Folículos miniaturizados — no entran en el conteo general de folículos extraídos, pelos o tasas, pero quedan registrados aquí para no perderse.",
    "preinc.time_title": "Tiempo de pre-incisiones",
    "preinc.total_label": "Total de pre-incisiones",
    "preinc.by_area_title": "Pre-incisiones por área",
    "preinc.area_hint": "Toca el número de arriba para escribir el total del área. UF1/UF2/UF3 abajo = cuántas unidades foliculares de 1, 2 o 3 pelos van a esa área.",
    "photos.marcacao_title": "Marcación quirúrgica",
    "photos.marcacao_hint": "Se guardan en este servidor — visibles en todos los celulares conectados.",
    "photos.posop_title": "Posoperatorio inmediato",
    "cnt.print_btn": "Imprimir / Guardar PDF",
    "cnt.finalize_btn": "Finalizar cirugía",
    "cnt.reopen_btn": "Reabrir",
    "share.title": "Compartir cirugía",
    "share.url_label": "Dirección de esta cirugía (compártela con los otros celulares)",
    "share.share_link_btn": "Compartir enlace",
    "share.whatsapp_btn": "Enviar por WhatsApp",
    "share.copy_btn": "Copiar",
    "audio.test_phrase": "Prueba de audio. Ciento veintitrés folículos.",
    "audio.milestone": "{n} folículos.",
    "audio.preinc_update": "{n} pre-incisiones.",
    "cnt.mode_full": "Modo completo",
    "cnt.mode_reduced": "Modo reducido",
    "cnt.global_not_started": "Tiempo total: aún no iniciado",
    "cnt.global_timer_prefix": "⏱ Tiempo total de la cirugía: ",
    "cnt.global_finalized_suffix": " (finalizado)",
    "cnt.global_in_progress_suffix": " (en curso)",
    "preinc.rate_hint": "Ritmo promedio: {rate} pre-incisiones/hora",
    "cnt.hair_singular": "pelo",
    "cnt.hair_plural": "pelos",
    "cnt.per_follicle_suffix": " por folículo",
    "cnt.hairs_not_in_total": "no entra en el conteo general",
    "cnt.hairs_informative_only": "solo conteo informativo",
    "cnt.hairs_lost": "0 pelos (perdido)",
    "dash.title": "Dashboard",
    "dash.subtitle": "Estadísticas calculadas solo con cirugías finalizadas — las cirugías en curso tienen datos parciales y quedan fuera, para no distorsionar los promedios.",
    "dash.empty": "Aún no tienes ninguna cirugía finalizada. Las estadísticas aparecen aquí en cuanto se finalice la primera.",
    "dash.extracted_by_surgery_title": "Folículos extraídos por cirugía",
    "dash.extracted_by_surgery_hint": "Cada barra es una cirugía finalizada, en orden cronológico — permite ver si el volumen por cirugía sube o baja con el tiempo.",
    "dash.index_by_surgery_title": "Índice pelos/folículo por cirugía",
    "dash.index_by_surgery_hint": "Cada barra es una cirugía finalizada, en orden cronológico.",
    "dash.uf_distribution_title": "Distribución por tipo de unidad folicular",
    "dash.uf_distribution_hint": "Porcentaje entre todos los folículos íntegros, sumando todas las cirugías finalizadas.",
    "dash.transec_rate_title": "Tasa de transección por cirugía",
    "dash.transec_rate_hint": "El modo completo y el modo reducido calculan la tasa de formas distintas — por eso están en pestañas separadas, no mezcles los números.",
    "dash.mode_all": "Todos",
    "dash.rate_todos_hint": "Esto es solo para ver la evolución cronológica de todas las cirugías juntas — cada barra usa la tasa correcta de su propia cirugía. No existe una \"tasa promedio general\" porque completo y reducido calculan la tasa de formas distintas. Para ver el promedio, usa las pestañas Completo o Reducido.",
    "dash.rate_empty": "Ninguna cirugía finalizada en este modo todavía.",
    "dash.quad_index_title": "Índice y transección por cuadrante",
    "dash.quad_hint": "Usa la misma pestaña Completo/Reducido/Todos de arriba. La diferencia Mamba × banco solo entra en el promedio de las cirugías donde se completó el Mamba en ese cuadrante.",
    "dash.quad_todos_hint": "En la pestaña \"Todos\" estos promedios desaparecen por el mismo motivo que la tasa de transección — completo y reducido no son comparables. Usa las pestañas Completo o Reducido.",
    "dash.finalized_surgeries_title": "Cirugías finalizadas",
    "dash.stat_extracted_total": "Folículos extraídos (total)",
    "dash.stat_hairs_total": "Pelos trasplantados (total)",
    "dash.stat_avg_index": "Índice promedio",
    "dash.stat_preinc_avg": "Pre-incisiones promedio/cirugía",
    "dash.stat_preinc_total": "Total de pre-incisiones",
    "dash.stat_follicles_per_min": "Folículos/minuto (promedio)",
    "dash.stat_avg_time_per_1000": "Tiempo promedio por 1000 unidades",
    "dash.stat_minis_per_1000": "Minis por 1000 folículos",
    "dash.stat_surgeries_all_modes": "Cirugías (todos los modos)",
    "dash.stat_in_complete_mode": "— en modo completo",
    "dash.stat_in_reduced_mode": "— en modo reducido",
    "dash.stat_surgeries_mode_complete": "Cirugías (completo)",
    "dash.stat_surgeries_mode_reduced": "Cirugías (reducido)",
    "dash.stat_partial_rate_avg": "Tasa parcial promedio",
    "dash.stat_total_rate_avg": "Tasa total promedio",
    "dash.no_data_yet": "Aún no hay datos suficientes.",
    "dash.table_quadrant": "Cuadrante",
    "dash.table_surgeries": "Cirugías",
    "dash.table_avg_index": "Índice promedio",
    "dash.table_partial_rate_avg": "Tasa parcial prom.",
    "dash.table_total_rate_avg": "Tasa total prom.",
    "dash.table_mamba_vs_bench": "Mamba × banco",
    "dash.table_category": "Categoría",
    "dash.table_quantity": "Cantidad",
    "dash.table_pct_intact": "% de íntegros",
    "dash.table_surgery": "Cirugía",
    "dash.table_date": "Fecha",
    "dash.table_mode": "Modo",
    "dash.table_extracted": "Extraídos",
    "dash.table_index": "Índice",
    "dash.table_partial_rate": "Tasa parcial",
    "dash.table_total_rate": "Tasa total",
    "dash.table_preinc": "Pre-inc.",
    "print.title": "Informe de Extracción Folicular",
    "print.patient_label": "Paciente (código)",
    "print.status_label": "Estado",
    "print.mode_label": "Modo",
    "print.index_label": "Índice",
    "print.rate_avg_label": "Ritmo promedio",
    "print.fol_per_hour_suffix": " fol./h",
    "print.preinc_per_hour_suffix": " pre-inc./h",
    "print.total_surgery_time_label": "Tiempo total de la cirugía",
    "print.mamba_rate_label": "Ritmo según Mamba",
    "print.extraction_prefix": "Extracción — ",
    "print.mamba_accumulated_label": "Mamba (lectura acumulada)",
    "print.table_hairs_per_follicle": "Pelos/folículo",
    "print.table_qty": "Cant.",
    "print.table_total_hairs": "Total de pelos",
    "print.table_area": "Área",
    "print.table_preincisions": "Pre-incisiones",
    "print.dist_title": "Distribución de unidades por área",
    "print.table_total": "Total",
    "print.table_grand_total": "Total general",
    "print.photos_prefix": "Fotos — ",
    "print.generated_at": "Generado el "
  }
};
// t(key, lang): busca a tradução; cai pro português se a chave não existir no
// idioma pedido (nunca deve mostrar a chave crua pro usuário).
function t(key, lang) {
  var dict = STRINGS[lang] || STRINGS.pt;
  return dict[key] || STRINGS.pt[key] || key;
}

function emptyCounts() {
  var c = {};
  CATS.forEach(function (cat) { c[cat.id] = 0; });
  return c;
}
function emptyQuadrant() {
  // mambaMarkTimeMs = tempo decorrido do cronômetro de extração no momento da marcação
  //   (usado só pra calcular duração/ritmo do quadrante — pausas do cronômetro não contam).
  // mambaMarkedAtMs = relógio real (Date.now()) no momento da marcação (usado só pra
  //   descobrir a ORDEM real de preenchimento entre quadrantes — imune a pausas do
  //   cronômetro, ao contrário do mambaMarkTimeMs).
  // carryFromId = id de outro quadrante cuja contagem "entra" na exibição deste (contagem
  //   em cadeia) — link EXPLÍCITO, criado só quando alguém aperta "Contagem finalizada" ou
  //   escolhe manualmente no seletor. Nunca inferido por ordem/tempo, de propósito: foi
  //   exatamente a inferência por horário que causou o bug do Mamba corrigido antes.
  // locked = true depois de "Contagem finalizada" — bloqueia os botões +1/+5 deste
  //   quadrante até alguém reabrir explicitamente.
  return { counts: emptyCounts(), mambaCumulativo: null, mambaMarkTimeMs: null, mambaMarkedAtMs: null, carryFromId: null, locked: false };
}
// Dados demográficos do paciente — sempre opcionais, nunca bloqueiam nada da
// cirurgia. Ficam presos ao código da cirurgia (não ao nome real do paciente,
// que este app nunca guarda). Servem só pra permitir comparar depois cirurgias
// parecidas entre si (ex: raspada com raspada).
var PATIENT_HAIR_THICKNESS = new Set(["fino", "grosso"]);
var PATIENT_HAIR_TEXTURE = new Set(["liso", "ondulado", "crespo"]);
var PATIENT_SHAVING = new Set(["sim", "nao"]);
function emptyPatientInfo() {
  return { idade: null, alturaCm: null, pesoKg: null, cabeloEspessura: null, cabeloTextura: null, raspagem: null };
}
// Valida um objeto "flat" com qualquer subconjunto dos campos de patientInfo (vindo
// tanto do cadastro inicial quanto da aba Paciente depois) e devolve só as chaves
// válidas prontas pra aplicar com Object.assign. Campo ausente no body = não mexe
// nele. Campo vazio/null = limpa (paciente pode ter mudado de ideia). Campo com
// valor fora do esperado = ignorado silenciosamente (não derruba o resto do
// formulário por causa de um campo só).
function sanitizePatientInfoFields(body) {
  var out = {};
  function numOrNull(v, min, max) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) return undefined;
    return n;
  }
  function enumOrNull(v, allowedSet) {
    if (v === null || v === undefined || v === "") return null;
    return allowedSet.has(v) ? v : undefined;
  }
  if (body.idade !== undefined) { var v1 = numOrNull(body.idade, 0, 130); if (v1 !== undefined) out.idade = (v1 === null ? null : Math.round(v1)); }
  if (body.alturaCm !== undefined) { var v2 = numOrNull(body.alturaCm, 0, 260); if (v2 !== undefined) out.alturaCm = v2; }
  if (body.pesoKg !== undefined) { var v3 = numOrNull(body.pesoKg, 0, 400); if (v3 !== undefined) out.pesoKg = v3; }
  if (body.cabeloEspessura !== undefined) { var v4 = enumOrNull(body.cabeloEspessura, PATIENT_HAIR_THICKNESS); if (v4 !== undefined) out.cabeloEspessura = v4; }
  if (body.cabeloTextura !== undefined) { var v5 = enumOrNull(body.cabeloTextura, PATIENT_HAIR_TEXTURE); if (v5 !== undefined) out.cabeloTextura = v5; }
  if (body.raspagem !== undefined) { var v6 = enumOrNull(body.raspagem, PATIENT_SHAVING); if (v6 !== undefined) out.raspagem = v6; }
  return out;
}
// Confere se ligar quadId.carryFromId = candidateId criaria um ciclo (ex: A vem de B,
// que vem de A) — percorre a cadeia a partir do candidato e vê se volta pro próprio
// quadId. Com só 4 quadrantes um ciclo nunca deveria acontecer na prática, mas o
// seletor manual permite qualquer combinação, então a proteção é obrigatória.
function wouldCreateCarryCycle(s, quadId, candidateId) {
  if (candidateId === quadId) return true;
  var seen = {};
  seen[quadId] = true;
  var cur = candidateId;
  var hops = 0;
  while (cur && hops < QUADRANTS.length + 1) {
    if (seen[cur]) return true;
    seen[cur] = true;
    var qd = s.quadrants[cur];
    cur = qd ? qd.carryFromId : null;
    hops++;
  }
  return false;
}
// Mesma fórmula do elapsedMs() do lado do cliente, pra calcular no servidor o tempo
// decorrido de cirurgia no exato instante em que o Mamba de um quadrante é preenchido
// — evita depender do relógio do celular de quem está digitando (podem estar
// dessincronizados entre si).
function serverElapsedMs(timer) {
  return (timer.accumulatedMs || 0) + (timer.running ? (Date.now() - timer.startedAt) : 0);
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
function emptyPreincDist() {
  var d = {};
  PREINC_AREAS.forEach(function (a) {
    var row = {};
    DIST_FIOS.forEach(function (f) { row[f.id] = 0; });
    d[a.id] = row;
  });
  return d;
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
  // Escreve num arquivo temporário e só troca de nome no final (rename é atômico
  // no sistema de arquivos). Se o processo cair no meio da escrita, o pior caso é
  // perder o arquivo temporário — o data.json de verdade nunca fica pela metade.
  // Antes disso, um crash durante o writeFileSync direto podia corromper o arquivo
  // inteiro (todos os médicos, todas as cirurgias), não só o que estava sendo salvo.
  var tmpFile = DATA_FILE + ".tmp" + process.pid;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2));
  fs.renameSync(tmpFile, DATA_FILE);
}
var dataFileExistedAtStartup = fs.existsSync(DATA_FILE);
var db = loadData();
if (!db.sessions) db.sessions = {};
if (!db.users) db.users = {};
if (!db.authTokens) db.authTokens = {};
if (!db.resetTokens) db.resetTokens = {};
// Normaliza cirurgias salvas antes desta atualização (migra pro formato com quadrantes).
Object.keys(db.sessions).forEach(function (id) {
  var s = db.sessions[id];
  if (s.ownerId === undefined) s.ownerId = null;
  if (!SESSION_MODES.has(s.mode)) s.mode = "completo";
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
      if (s.quadrants[q.id].mambaMarkTimeMs === undefined) s.quadrants[q.id].mambaMarkTimeMs = null;
      // Dado de cirurgias antigas (antes desta correção) não tem relógio real —
      // fica null e cai no último recurso de ordem fixa, igual já acontecia antes.
      if (s.quadrants[q.id].mambaMarkedAtMs === undefined) s.quadrants[q.id].mambaMarkedAtMs = null;
      if (s.quadrants[q.id].carryFromId === undefined) s.quadrants[q.id].carryFromId = null;
      if (s.quadrants[q.id].locked === undefined) s.quadrants[q.id].locked = false;
    });
  }
  if (!s.patientInfo) {
    s.patientInfo = emptyPatientInfo();
  } else {
    var epi = emptyPatientInfo();
    Object.keys(epi).forEach(function (k) { if (s.patientInfo[k] === undefined) s.patientInfo[k] = epi[k]; });
  }
  if (!s.preincCounts) s.preincCounts = emptyPreinc();
  if (!s.preincDist) {
    s.preincDist = emptyPreincDist();
  } else {
    PREINC_AREAS.forEach(function (a) {
      if (!s.preincDist[a.id]) s.preincDist[a.id] = {};
      DIST_FIOS.forEach(function (f) { if (s.preincDist[a.id][f.id] === undefined) s.preincDist[a.id][f.id] = 0; });
    });
  }
  if (!s.photos) s.photos = { marcacao: [], posop: [] };
  if (!s.timer) s.timer = emptyTimer();
  if (!s.preincTimer) s.preincTimer = emptyTimer();
  // Tempo GLOBAL da cirurgia: começa a contar sozinho no instante em que QUALQUER UM
  // dos dois cronômetros (extração ou pré-incisões) é iniciado pela primeira vez —
  // não importa qual dos dois. Diferente dos outros dois, não pausa: reflete o tempo
  // total de caso, do início ao fim. Cirurgias já em andamento antes desta atualização
  // não têm como recuperar o instante exato do primeiro início — ficam com o tempo
  // global "não iniciado" até o próximo Iniciar de um dos dois cronômetros.
  if (s.globalTimerStartedAt === undefined) s.globalTimerStartedAt = null;
  if (s.globalTimerEndedAt === undefined) s.globalTimerEndedAt = null;
  // finalizedAt: marca quando a cirurgia foi finalizada, usado só pra saber
  // quando o link (sem login) deve parar de servir as FOTOS (ver PHOTO_LINK_TTL_MS).
  // Cirurgias já finalizadas antes desta atualização não têm o instante exato —
  // usamos updatedAt como aproximação conservadora (não "perdoa" essas cirurgias
  // com acesso vitalício, só começa a contar o prazo a partir da última alteração
  // conhecida).
  if (s.finalizedAt === undefined) s.finalizedAt = (s.status === "finalizada") ? s.updatedAt : null;
});
// Migra médicos cadastrados antes da identidade visual existir.
Object.keys(db.users).forEach(function (id) {
  var u = db.users[id];
  if (!u.branding) { u.branding = emptyBranding(); return; }
  if (u.branding.logoFilename === undefined) u.branding.logoFilename = null;
  if (!THEME_IDS.has(u.branding.theme)) u.branding.theme = "padrao";
  if (u.branding.darkMode === undefined) u.branding.darkMode = false;
  if (!LANG_IDS.has(u.branding.language)) u.branding.language = "pt";
});
saveData();

// ---------- diagnóstico de persistência ----------
// Mostra no log, toda vez que o servidor inicia, de onde os dados foram carregados —
// pra você conseguir confirmar (olhando o log do deploy) se o volume persistente está
// realmente sendo usado, em vez de descobrir só depois de perder um cadastro.
console.log("");
console.log("---- Diagnóstico de armazenamento ----");
console.log(" DATA_DIR: " + DATA_DIR);
console.log(" Arquivo de dados: " + DATA_FILE);
console.log(" Arquivo já existia ao iniciar: " + (dataFileExistedAtStartup ? "sim" : "não — começando do zero"));
console.log(" Médicos cadastrados carregados: " + Object.keys(db.users).length);
console.log(" Cirurgias carregadas: " + Object.keys(db.sessions).length);
if (!process.env.DATA_DIR) {
  console.log(" ATENÇÃO: a variável de ambiente DATA_DIR não está definida. Os dados estão sendo");
  console.log(" salvos do lado do server.js (" + __dirname + "). Se este servidor está rodando");
  console.log(" na nuvem (Railway ou parecido), ISSO SIGNIFICA QUE OS DADOS SOMEM A CADA NOVO");
  console.log(" DEPLOY — o disco do container é recriado do zero a cada publicação, só o que");
  console.log(" está num volume persistente sobrevive. Defina DATA_DIR apontando pro caminho");
  console.log(" do volume (ex: DATA_DIR=/data) nas variáveis de ambiente do serviço. Veja a");
  console.log(" seção \"Nuvem (Railway)\" do LEIA-ME.md, passos 6 e 7.");
} else if (!dataFileExistedAtStartup) {
  console.log(" ATENÇÃO: DATA_DIR está definida (" + DATA_DIR + "), mas não havia nenhum");
  console.log(" data.json ali — ou é a primeira vez que este servidor roda, ou o volume não");
  console.log(" está de fato montado nesse caminho (confira no painel do serviço se o volume");
  console.log(" existe e está montado exatamente em \"" + DATA_DIR + "\").");
}
console.log("---------------------------------------");
console.log("");

function newId(bytes) {
  return crypto.randomBytes(bytes || 4).toString("hex");
}
function newSessionId() {
  var id;
  do { id = newId(4); } while (db.sessions[id]);
  return id;
}

// ---------- limitador de tentativas em memória (sem dependências externas) ----------
// Protege login, cadastro, recuperação de senha e varredura de IDs de cirurgia contra
// automação em rajada. Guarda só em memória (reinicia se o servidor reiniciar) — o
// objetivo é atrapalhar ataques automatizados, não é uma lista negra permanente.
var rateBuckets = {};
function clientIp(req) {
  var xf = req.headers["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "desconhecido";
}
// Retorna true se este "bucket" (ex: "login:1.2.3.4") já estourou o limite de
// tentativas na janela de tempo atual. Cada chamada conta como uma tentativa.
function rateLimited(bucketName, key, maxHits, windowMs) {
  var now = Date.now();
  var bucketKey = bucketName + ":" + key;
  var entry = rateBuckets[bucketKey];
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateBuckets[bucketKey] = entry;
  }
  entry.count++;
  return entry.count > maxHits;
}
setInterval(function () {
  var now = Date.now();
  Object.keys(rateBuckets).forEach(function (k) { if (rateBuckets[k].resetAt < now) delete rateBuckets[k]; });
}, 5 * 60 * 1000);

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
// Tokens de login (cookie fue_auth) e de redefinição de senha nunca são salvos em
// texto puro no data.json — só o hash SHA-256 fica no disco. O valor real (que vai
// no cookie do navegador / no link do e-mail) nunca é gravado em lugar nenhum;
// existe só na memória de quem está com a sessão aberta. Se o data.json vazar (backup
// mal guardado, disco da nuvem comprometido), quem pegar o arquivo não consegue
// logar como nenhum médico — só teria o hash, que não dá pra "usar de volta" como
// cookie (diferente de senha, o token não precisa de salt por usuário: já nasce
// aleatório com 24 bytes de entropia, então um hash simples e rápido já é seguro
// contra os ataques que importam aqui — força-bruta não é viável).
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function publicUser(u) {
  var b = u.branding || emptyBranding();
  return { id: u.id, nomeCompleto: u.nomeCompleto, crm: u.crm, email: u.email, telefone: u.telefone, createdAt: u.createdAt, branding: { logoFilename: b.logoFilename || null, theme: THEME_IDS.has(b.theme) ? b.theme : "padrao", darkMode: !!b.darkMode, language: LANG_IDS.has(b.language) ? b.language : "pt", ownerId: u.id } };
}
// Identidade visual de quem é dono de uma cirurgia — usado pra que auxiliares que só
// têm o link (sem login) também vejam a marca/tema do médico responsável por aquela
// cirurgia. Só expõe o necessário pra pintar a tela (nunca nome/e-mail/telefone do
// médico pra quem acessa sem login).
function brandingForUser(ownerId) {
  var u = ownerId ? db.users[ownerId] : null;
  var b = (u && u.branding) ? u.branding : emptyBranding();
  return { logoFilename: b.logoFilename || null, theme: THEME_IDS.has(b.theme) ? b.theme : "padrao", darkMode: !!b.darkMode, ownerId: ownerId || null };
}
function withOwnerBranding(s) {
  var out = Object.assign({}, s);
  out.ownerBranding = brandingForUser(s.ownerId);
  return out;
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
// Descobre o idioma da pessoa que está fazendo a requisição — usado pra escolher
// em qual idioma responder mensagens de erro da API (ainda não tem conta logada
// nesse ponto, então não dá pra usar a preferência salva no cadastro; olha pro
// cookie "fue_lang" que o cliente grava assim que a pessoa escolhe um idioma).
function requestLang(req) {
  var lang = parseCookies(req)["fue_lang"];
  return LANG_IDS.has(lang) ? lang : "pt";
}
// Descobre o endereço "de fora" pra montar links (e-mail de redefinição, etc.).
// Se o host da requisição for um domínio público (nuvem, ex: meuapp.up.railway.app),
// usa esse domínio direto. Se for localhost/IP privado (rede local), escaneia os
// adaptadores de rede pra achar o IP do wifi, evitando gerar um link com "localhost"
// que só funciona no próprio computador.
function isUnusableHost(host) {
  var h = (host || "").split(":")[0];
  return h === "localhost" || h === "127.0.0.1" || h === "";
}
function externalBaseUrl(req) {
  var hostHeader = req.headers.host || "";
  if (!isUnusableHost(hostHeader)) {
    // Já é um endereço que funciona pra outros aparelhos: IP de rede local pelo qual
    // o próprio pedido chegou, ou um domínio público de verdade (nuvem). Usa direto.
    var proto = req.headers["x-forwarded-proto"] || (SECURE_COOKIES ? "https" : "http");
    return proto + "://" + hostHeader;
  }
  // Só cai aqui quando o pedido chegou via "localhost", que não serve pra outros aparelhos.
  var ips = [];
  var nets = os.networkInterfaces();
  Object.keys(nets).forEach(function (name) { (nets[name] || []).forEach(function (net) { if (net.family === "IPv4" && !net.internal) ips.push(net.address); }); });
  var host = ips.length ? ips[0] : "localhost";
  return "http://" + host + ":" + PORT;
}
function getAuthedUser(req) {
  var cookies = parseCookies(req);
  var token = cookies["fue_auth"];
  if (!token) return null;
  var entry = db.authTokens[hashToken(token)];
  if (!entry) return null;
  // Token expira no servidor depois de AUTH_TOKEN_TTL_MS (mesmo prazo do cookie).
  // Antes desta checagem, um token roubado (ex: notebook compartilhado da clínica)
  // continuava válido pra sempre — só o logout explícito invalidava.
  if (Date.now() - entry.createdAt > AUTH_TOKEN_TTL_MS) { delete db.authTokens[hashToken(token)]; return null; }
  return db.users[entry.userId] || null;
}
// Limpeza periódica de tokens expirados — evita que db.authTokens cresça pra sempre
// com entradas mortas de gente que nunca mais voltou a logar.
setInterval(function () {
  var now = Date.now();
  var changed = false;
  Object.keys(db.authTokens).forEach(function (tok) {
    if (now - db.authTokens[tok].createdAt > AUTH_TOKEN_TTL_MS) { delete db.authTokens[tok]; changed = true; }
  });
  if (changed) saveData();
}, 60 * 60 * 1000);
function setAuthCookie(res, token) {
  var secure = SECURE_COOKIES ? "; Secure" : "";
  res.setHeader("Set-Cookie", "fue_auth=" + token + "; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax" + secure);
}
function clearAuthCookie(res) {
  var secure = SECURE_COOKIES ? "; Secure" : "";
  res.setHeader("Set-Cookie", "fue_auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" + secure);
}

// ---------- envio de e-mail via SMTP puro (TLS implícito, porta 465) — sem nenhuma biblioteca externa ----------
function smtpSendMail(opts) {
  return new Promise(function (resolve, reject) {
    if (!SMTP_CONFIG.enabled) { reject(new Error("Envio de e-mail não está configurado neste servidor (SMTP_CONFIG.enabled = false).")); return; }
    var settled = false;
    var buf = "";
    var pending = null;
    var socket = tls.connect({ host: SMTP_CONFIG.host, port: SMTP_CONFIG.port, servername: SMTP_CONFIG.host });
    var timer = setTimeout(function () { finish(new Error("Tempo esgotado ao falar com o servidor de e-mail.")); }, 20000);

    function finish(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.end(); } catch (e) {}
      if (err) reject(err); else resolve();
    }
    function checkBuffer() {
      if (!pending) return;
      var idx = buf.indexOf("\r\n");
      while (idx !== -1) {
        var line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (/^\d{3} /.test(line)) {
          var code = parseInt(line.slice(0, 3), 10);
          var p = pending; pending = null;
          if (code >= 200 && code < 400) p.res(line); else p.rej(new Error("Servidor de e-mail respondeu: " + line));
          return;
        }
        idx = buf.indexOf("\r\n");
      }
    }
    function waitReply() { return new Promise(function (res2, rej2) { pending = { res: res2, rej: rej2 }; checkBuffer(); }); }
    function cmd(line) { socket.write(line + "\r\n"); return waitReply(); }

    socket.on("data", function (chunk) { buf += chunk.toString("utf8"); checkBuffer(); });
    socket.on("error", function (err) { finish(err); });
    socket.on("close", function () { if (!settled) finish(new Error("Conexão com o servidor de e-mail encerrada inesperadamente.")); });

    socket.once("secureConnect", function () {
      waitReply()
        .then(function () { return cmd("EHLO localhost"); })
        .then(function () { return cmd("AUTH LOGIN"); })
        .then(function () { return cmd(Buffer.from(SMTP_CONFIG.user, "utf8").toString("base64")); })
        .then(function () { return cmd(Buffer.from(SMTP_CONFIG.pass, "utf8").toString("base64")); })
        .then(function () { return cmd("MAIL FROM:<" + SMTP_CONFIG.user + ">"); })
        .then(function () { return cmd("RCPT TO:<" + opts.to + ">"); })
        .then(function () { return cmd("DATA"); })
        .then(function () {
          var fromHeader = SMTP_CONFIG.fromName ? (SMTP_CONFIG.fromName + " <" + SMTP_CONFIG.user + ">") : SMTP_CONFIG.user;
          var lines = [
            "From: " + fromHeader,
            "To: " + opts.to,
            "Subject: " + opts.subject,
            "MIME-Version: 1.0",
            "Content-Type: text/plain; charset=utf-8",
            ""
          ];
          var bodyEscaped = String(opts.text).replace(/\r\n/g, "\n").split("\n").map(function (l) {
            return l.charAt(0) === "." ? "." + l : l;
          }).join("\r\n");
          return cmd(lines.join("\r\n") + "\r\n" + bodyEscaped + "\r\n.");
        })
        .then(function () { return cmd("QUIT"); })
        .then(function () { finish(null); })
        .catch(function (err) { finish(err); });
    });
  });
}

// ---------- helpers HTTP ----------
function send(res, status, obj) {
  // Sem cabeçalho de CORS de propósito: o app é same-origin (o próprio servidor
  // serve o HTML/JS do cliente e a API), então nenhuma chamada legítima do
  // navegador precisa de CORS liberado. Um "Access-Control-Allow-Origin: *"
  // aqui só serviria pra permitir que QUALQUER site de terceiros usasse o
  // navegador de um visitante pra varrer IDs de sessão (8 chars hex) distribuindo
  // a varredura entre vários IPs de vítimas — driblando o rate-limit por IP
  // (session-miss) que existe justamente pra dificultar esse tipo de ataque.
  var body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
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
"<title>Graftis — Hair Transplant Workflow</title>\n" +
"<style>\n" +
"  :root{--c-bg:#f4f6f7;--c-card:#fff;--c-text:#1c2b2e;--c-muted:#5c6b6e;--c-border:#dde3e4;--c-primary:#0e7c86;--c-primary-dark:#0a5c64;--c-integro:#1a8f5e;--c-parcial:#c2760a;--c-total:#c62828;--c-mini:#6b7280;--c-preinc:#5b5fc7;--c-tint:#fafcfc;--c-tint-active:#e8f4f5;--c-surface2:#e8edee;--c-toast-bg:#1c2b2e;--c-toast-text:#fff;--radius:10px;--shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06);}\n" +
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
"  .btn:active{background:var(--c-primary-dark);} .btn.secondary{background:var(--c-surface2);color:var(--c-text);} .btn.danger{background:var(--c-total);}\n" +
"  .btn.block{width:100%;} .btn.lg{padding:14px 18px;font-size:16px;} .btn:disabled{opacity:.45;cursor:not-allowed;}\n" +
"  label{font-size:13px;font-weight:600;color:var(--c-muted);display:block;margin-bottom:4px;}\n" +
"  input[type=text],input[type=number],input[type=file]{width:100%;padding:10px 12px;border:1px solid var(--c-border);border-radius:8px;font-size:15px;font-family:inherit;background:var(--c-card);color:var(--c-text);}\n" +
"  input[type=file]{border-style:dashed;font-size:13px;background:var(--c-tint);}\n" +
"  .field{margin-bottom:14px;} .hint{font-size:12px;color:var(--c-muted);margin-top:4px;}\n" +
"  h2{font-size:18px;margin:0 0 4px;}\n" +
"  h3.section-title{font-size:14px;text-transform:uppercase;letter-spacing:.4px;margin:22px 0 8px;display:flex;align-items:center;gap:8px;}\n" +
"  .dot{width:10px;height:10px;border-radius:50%;display:inline-block;}\n" +
"  .summary-bar{position:sticky;top:52px;z-index:15;background:var(--c-card);border:1px solid var(--c-border);border-radius:var(--radius);box-shadow:var(--shadow);padding:10px 14px;margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:6px;}\n" +
"  .summary-bar.static{position:static;}\n" +
"  .summary-item{text-align:center;padding:4px;} .summary-item .val{font-size:19px;font-weight:700;color:var(--c-primary-dark);line-height:1.1;}\n" +
"  .summary-item .lbl{font-size:10.5px;color:var(--c-muted);text-transform:uppercase;letter-spacing:.3px;margin-top:2px;}\n" +
"  /* Grade de \"Folículos por categoria\" (aba Resumo Final): 9 itens — mais\n" +
"     apertada que o summary-bar padrão pra caber tudo numa linha só, com\n" +
"     colunas e espaçamento um pouco menores. */\n" +
"  .summary-bar.cat-grid{grid-template-columns:repeat(auto-fit,minmax(72px,1fr));gap:3px;padding:8px 10px;}\n" +
"  .summary-bar.cat-grid .summary-item{padding:2px 1px;}\n" +
"  .summary-bar.cat-grid .summary-item .val{font-size:16px;}\n" +
"  .cat-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--c-border);border-radius:8px;margin-bottom:8px;background:var(--c-card);}\n" +
"  .cat-row .cat-label{flex:1 1 auto;min-width:120px;font-size:14.5px;font-weight:600;}\n" +
"  .cat-row .cat-hairs{font-size:11px;color:var(--c-muted);font-weight:500;display:block;margin-top:1px;}\n" +
"  .cat-count{min-width:44px;text-align:center;font-size:20px;font-weight:700;border:1px dashed var(--c-border);border-radius:8px;padding:6px 8px;background:var(--c-tint);}\n" +
"  .cat-btns{display:flex;gap:6px;flex-wrap:wrap;}\n" +
"  .cat-btn{border:none;border-radius:7px;min-width:38px;padding:8px 8px;font-size:13px;font-weight:700;cursor:pointer;color:#fff;background:var(--c-primary);}\n" +
"  .cat-btn.minus{background:#8a97992e;color:var(--c-text);border:1px solid var(--c-border);}\n" +
"  .group-integro .cat-btn{background:var(--c-integro);} .group-parcial .cat-btn{background:var(--c-parcial);} .group-total .cat-btn{background:var(--c-total);} .group-mini .cat-btn{background:var(--c-mini);}\n" +
"  .group-integro{border-left:4px solid var(--c-integro);} .group-parcial{border-left:4px solid var(--c-parcial);} .group-total{border-left:4px solid var(--c-total);} .group-mini{border-left:4px solid var(--c-mini);}\n" +
"  .group-preinc{border-left:4px solid var(--c-preinc);}\n" +
"  #group-preincisoes{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;}\n" +
"  .preinc-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 8px;border:1px solid var(--c-border);border-left:4px solid var(--c-preinc);border-radius:8px;background:var(--c-card);text-align:center;}\n" +
"  .preinc-item .cat-label{font-size:12.5px;font-weight:600;line-height:1.25;}\n" +
"  .preinc-item .cat-count{width:100%;}\n" +
"  .dist-subrow{display:flex;gap:4px;width:100%;border-top:1px dashed var(--c-border);padding-top:6px;margin-top:2px;}\n" +
"  .dist-sub{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;}\n" +
"  .dist-sub-lbl{font-size:9px;font-weight:700;color:var(--c-muted);text-transform:uppercase;letter-spacing:.2px;}\n" +
"  .dist-cell{cursor:pointer;border-radius:6px;padding:4px 2px;width:100%;font-size:13px;font-weight:700;border:1px dashed var(--c-border);background:var(--c-tint);}\n" +
"  .dist-cell:active{background:var(--c-tint-active);}\n" +
"  .chart-box{background:var(--c-card);border:1px solid var(--c-border);border-radius:8px;padding:12px 8px 4px;margin-bottom:12px;overflow-x:auto;}\n" +
"  .chart-box svg{display:block;}\n" +
"  .dash-table{width:100%;border-collapse:collapse;background:var(--c-card);border:1px solid var(--c-border);border-radius:8px;overflow:hidden;font-size:12.5px;}\n" +
"  .dash-table th,.dash-table td{padding:7px 6px;text-align:center;border-bottom:1px solid var(--c-border);white-space:nowrap;}\n" +
"  .dash-table th{background:var(--c-tint);font-size:10.5px;text-transform:uppercase;letter-spacing:.3px;color:var(--c-muted);}\n" +
"  .dash-table td:first-child,.dash-table th:first-child{text-align:left;padding-left:10px;}\n" +
"  .dash-table-wrap{overflow-x:auto;}\n" +
"  .cat-count.clickable{cursor:pointer;border-style:solid;border-color:var(--c-primary);}\n" +
"  .cat-count.clickable:active{background:var(--c-tint-active);}\n" +
"  .increments-editor .inc-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;}\n" +
"  .increments-editor input{width:90px;}\n" +
"  .surgery-card{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px;border:1px solid var(--c-border);border-radius:var(--radius);background:var(--c-card);margin-top:10px;box-shadow:var(--shadow);}\n" +
"  .badge{font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;display:inline-block;}\n" +
"  .badge.andamento{background:#fff4de;color:#8a5a00;} .badge.finalizada{background:#e8f6ee;color:var(--c-integro);}\n" +
"  .empty-state{text-align:center;color:var(--c-muted);padding:40px 10px;font-size:14px;}\n" +
"  .share-url{font-size:17px;font-weight:700;background:var(--c-tint);border:1px dashed var(--c-primary);border-radius:8px;padding:12px;word-break:break-all;color:var(--c-primary-dark);}\n" +
"  footer.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid var(--c-border);}\n" +
"  .toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--c-toast-bg);color:var(--c-toast-text);padding:10px 18px;border-radius:24px;font-size:13px;box-shadow:var(--shadow);z-index:50;opacity:0;pointer-events:none;transition:opacity .2s;max-width:90vw;text-align:center;}\n" +
"  .toast.show{opacity:1;}\n" +
"  .switch{position:relative;display:inline-block;width:44px;height:24px;} .switch input{opacity:0;width:0;height:0;}\n" +
"  .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#ccc;transition:.2s;border-radius:24px;}\n" +
"  .slider:before{position:absolute;content:'';height:18px;width:18px;left:3px;bottom:3px;background-color:#fff;transition:.2s;border-radius:50%;}\n" +
"  input:checked + .slider{background-color:var(--c-primary);} input:checked + .slider:before{transform:translateX(20px);}\n" +
"  .conn-banner{display:none;background:#fceaea;color:#8a1c1c;border:1px solid #f0b8b8;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:13px;font-weight:600;}\n" +
"  .conn-banner.show{display:block;}\n" +
"  .photo-grid{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;}\n" +
"  .photo-thumb{position:relative;width:104px;height:104px;border-radius:8px;overflow:hidden;border:1px solid var(--c-border);background:var(--c-tint);}\n" +
"  .photo-thumb img{width:100%;height:100%;object-fit:cover;display:block;}\n" +
"  .photo-remove{position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:14px;line-height:1;cursor:pointer;}\n" +
"  .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:60;align-items:center;justify-content:center;padding:16px;}\n" +
"  .modal-overlay.show{display:flex;}\n" +
"  .modal-box{background:var(--c-card);border-radius:var(--radius);padding:20px;max-width:420px;width:100%;box-shadow:var(--shadow);max-height:90vh;overflow-y:auto;}\n" +
"  #print-report{display:none;}\n" +
"  @media print{\n" +
"    body *{visibility:hidden;}\n" +
"    #print-report, #print-report *{visibility:visible;}\n" +
"    #print-report{display:block;position:absolute;top:0;left:0;width:100%;padding:20px;}\n" +
"    #print-report table{width:100%;border-collapse:collapse;margin-top:10px;}\n" +
"    #print-report th,#print-report td{border:1px solid #999;padding:6px 8px;font-size:12px;text-align:left;}\n" +
"    #print-report h1{font-size:18px;margin-bottom:2px;} #print-report h2{font-size:14px;margin-top:18px;page-break-after:avoid;break-after:avoid;}\n" +
"    #print-report .print-summary{display:flex;gap:16px;margin:10px 0;flex-wrap:wrap;}\n" +
"    #print-report .print-summary div{border:1px solid #999;padding:8px 12px;border-radius:6px;page-break-inside:avoid;break-inside:avoid;}\n" +
"    #print-report .photo-print-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0;}\n" +
"    #print-report .photo-print-grid img{width:100%;height:190px;object-fit:cover;border:1px solid #999;border-radius:4px;display:block;page-break-inside:avoid;break-inside:avoid;}\n" +
"    #print-report table{page-break-inside:auto;}\n" +
"    #print-report tr{page-break-inside:avoid;break-inside:avoid;}\n" +
"    #print-report .photo-report-page{page-break-before:always;}\n" +
"  }\n" +
"</style>\n" +
"</head>\n" +
"<body>\n" +
"<div class=\"app\">\n" +
"  <header class=\"topbar\">\n" +
"    <div class=\"row\" style=\"align-items:center;gap:8px;\"><img class=\"brand-logo\" style=\"display:none;height:30px;max-width:110px;object-fit:contain;border-radius:4px;\"><div><h1><span class=\"conn-dot\" id=\"conn-dot\"></span>Graftis</h1><div class=\"sub\">__APP_SUBTITLE__</div></div></div>\n" +
"    <div class=\"row\" style=\"gap:8px;align-items:center;\">\n" +
"      <button class=\"icon-btn\" data-i18n=\"nav.home\" onclick=\"App.goHome()\">Início</button>\n" +
"      <button class=\"icon-btn\" id=\"dashboard-btn\" style=\"display:none;\" data-i18n=\"nav.dashboard\" onclick=\"App.showDashboard()\">Dashboard</button>\n" +
"      <button class=\"icon-btn\" data-i18n=\"nav.config\" onclick=\"App.showSettings()\">Config</button>\n" +
"      <span id=\"user-bar\"></span>\n" +
"    </div>\n" +
"  </header>\n" +
"  <div class=\"conn-banner\" id=\"conn-banner\">Sem conexão com o servidor — verifique se está na mesma rede wifi.</div>\n" +
"\n" +
"  <section id=\"screen-auth\" class=\"screen\">\n" +
"    <div class=\"card\">\n" +
"      <img src=\"data:image/png;base64,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\" alt=\"Graftis\" style=\"display:block;max-width:220px;width:100%;height:auto;margin:0 auto 16px;\">\n" +
"      <img class=\"brand-logo\" style=\"display:none;max-height:60px;max-width:220px;object-fit:contain;margin-bottom:10px;\">\n" +
"      <div class=\"row\" style=\"gap:6px;margin-bottom:10px;\">\n" +
"        <button type=\"button\" class=\"btn lang-switch-btn\" data-lang=\"pt\" onclick=\"App.setLanguage('pt')\">PT</button>\n" +
"        <button type=\"button\" class=\"btn secondary lang-switch-btn\" data-lang=\"en\" onclick=\"App.setLanguage('en')\">EN</button>\n" +
"        <button type=\"button\" class=\"btn secondary lang-switch-btn\" data-lang=\"es\" onclick=\"App.setLanguage('es')\">ES</button>\n" +
"      </div>\n" +
"      <h2 data-i18n=\"auth.title\">Área do médico</h2>\n" +
"      <p class=\"hint\" data-i18n=\"auth.subtitle\">Entre com sua conta pra ver e criar suas próprias cirurgias. Auxiliares que já têm o link de uma cirurgia específica não precisam de conta — só quem cria e gerencia a lista de cirurgias precisa entrar.</p>\n" +
"      <div class=\"row\" style=\"gap:8px;margin:14px 0;\">\n" +
"        <button class=\"btn\" id=\"authtab-login-btn\" data-i18n=\"auth.tab_login\" onclick=\"App.switchAuthTab('login')\">Entrar</button>\n" +
"        <button class=\"btn secondary\" id=\"authtab-cadastro-btn\" data-i18n=\"auth.tab_register\" onclick=\"App.switchAuthTab('cadastro')\">Criar conta</button>\n" +
"      </div>\n" +
"      <div id=\"authpanel-login\">\n" +
"        <div class=\"field\"><label data-i18n=\"common.email\">E-mail</label><input type=\"email\" id=\"login-email\" autocomplete=\"username\"></div>\n" +
"        <div class=\"field\"><label data-i18n=\"common.password\">Senha</label><input type=\"password\" id=\"login-password\" autocomplete=\"current-password\"></div>\n" +
"        <button class=\"btn block lg\" data-i18n=\"auth.login_submit\" onclick=\"App.doLogin()\">Entrar</button>\n" +
"        <button class=\"btn secondary\" style=\"margin-top:8px;\" data-i18n=\"auth.forgot_link\" onclick=\"App.toggleForgotPassword()\">Esqueci minha senha</button>\n" +
"        <div id=\"forgot-password-panel\" style=\"display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--c-border);\">\n" +
"          <div class=\"field\"><label data-i18n=\"auth.forgot_email_label\">Seu e-mail cadastrado</label><input type=\"email\" id=\"forgot-email\"></div>\n" +
"          <button class=\"btn secondary\" data-i18n=\"auth.forgot_submit\" onclick=\"App.doForgotPassword()\">Enviar link de redefinição</button>\n" +
"        </div>\n" +
"      </div>\n" +
"      <div id=\"authpanel-cadastro\" style=\"display:none;\">\n" +
"        <div class=\"field\"><label data-i18n=\"auth.field_fullname\">Nome completo</label><input type=\"text\" id=\"reg-nome\"></div>\n" +
"        <div class=\"field\"><label data-i18n=\"auth.field_crm\">CRM</label><input type=\"text\" id=\"reg-crm\" placeholder=\"Ex: 123456-SP\" data-i18n-placeholder=\"auth.crm_placeholder\"></div>\n" +
"        <div class=\"field\"><label data-i18n=\"common.email\">E-mail</label><input type=\"email\" id=\"reg-email\" autocomplete=\"username\"></div>\n" +
"        <div class=\"field\"><label data-i18n=\"auth.field_phone\">Telefone (com DDD)</label><input type=\"tel\" id=\"reg-telefone\" placeholder=\"Ex: (11) 91234-5678\" data-i18n-placeholder=\"auth.phone_placeholder\"></div>\n" +
"        <div class=\"field\"><label data-i18n=\"common.password\">Senha</label><input type=\"password\" id=\"reg-password\" autocomplete=\"new-password\"></div>\n" +
"        <div class=\"field\"><label data-i18n=\"common.confirm_password\">Confirmar senha</label><input type=\"password\" id=\"reg-password2\" autocomplete=\"new-password\"></div>\n" +
"        <button class=\"btn block lg\" data-i18n=\"auth.register_submit\" onclick=\"App.doRegister()\">Criar conta</button>\n" +
"      </div>\n" +
"    </div>\n" +
"  </section>\n" +
"\n" +
"  <section id=\"screen-reset\" class=\"screen\">\n" +
"    <div class=\"card\">\n" +
"      <h2 data-i18n=\"reset.title\">Nova senha</h2>\n" +
"      <p class=\"hint\" data-i18n=\"reset.subtitle\">Escolha uma nova senha pra sua conta.</p>\n" +
"      <div class=\"field\"><label data-i18n=\"reset.new_password\">Nova senha</label><input type=\"password\" id=\"reset-password\" autocomplete=\"new-password\"></div>\n" +
"      <div class=\"field\"><label data-i18n=\"reset.confirm_password\">Confirmar nova senha</label><input type=\"password\" id=\"reset-password2\" autocomplete=\"new-password\"></div>\n" +
"      <button class=\"btn block lg\" data-i18n=\"reset.submit\" onclick=\"App.doResetPassword()\">Salvar nova senha</button>\n" +
"    </div>\n" +
"  </section>\n" +
"\n" +
"  <section id=\"screen-home\" class=\"screen\">\n" +
"    <div class=\"card\">\n" +
"      <h2 data-i18n=\"home.title\">Suas cirurgias</h2>\n" +
"      <p class=\"hint\" data-i18n=\"home.subtitle\">Só você vê essa lista. Depois de criar a cirurgia, compartilhe o link dela com as auxiliares — elas atualizam os dados ao vivo sem precisar de conta.</p>\n" +
"      <div class=\"field\"><label data-i18n=\"home.patient_code_label\">Código / iniciais do paciente</label><input type=\"text\" id=\"new-codigo\" placeholder=\"Ex: JS-090726\" data-i18n-placeholder=\"home.patient_code_placeholder\"></div>\n" +
"      <div class=\"field\">\n" +
"        <label data-i18n=\"home.count_mode_label\">Modo de contagem</label>\n" +
"        <div class=\"row\" style=\"gap:8px;\">\n" +
"          <button type=\"button\" class=\"btn\" id=\"new-mode-completo\" data-i18n=\"common.mode_complete\" onclick=\"App.setNewMode('completo')\">Completo</button>\n" +
"          <button type=\"button\" class=\"btn secondary\" id=\"new-mode-reduzido\" data-i18n=\"common.mode_reduced\" onclick=\"App.setNewMode('reduzido')\">Reduzido</button>\n" +
"        </div>\n" +
"        <p class=\"hint\" style=\"margin-top:6px;\" data-i18n=\"home.mode_explanation\">Completo: cada transecção parcial é registrada no tipo exato (2→1, 3→2 etc). Reduzido: os fios da transecção parcial entram junto com os folículos íntegros, e só um contador único de transecção parcial é usado pra calcular a taxa — sem detalhar o tipo. Não dá pra trocar depois de criada.</p>\n" +
"      </div>\n" +
"      <details class=\"field\">\n" +
"        <summary style=\"cursor:pointer;\" data-i18n=\"home.patient_info_toggle\">Dados do paciente (opcional)</summary>\n" +
"        <div style=\"margin-top:10px;\">\n" +
"          <div class=\"field\">\n" +
"            <label data-i18n=\"patient.age_label\">Idade</label>\n" +
"            <input type=\"number\" id=\"new-patient-idade\" min=\"0\" max=\"130\" placeholder=\"Ex: 45\" data-i18n-placeholder=\"patient.age_placeholder\" onchange=\"App.setNewPatientField('idade', this.value)\">\n" +
"          </div>\n" +
"          <div class=\"field\">\n" +
"            <label data-i18n=\"patient.height_label\">Altura (cm)</label>\n" +
"            <input type=\"number\" id=\"new-patient-altura\" min=\"0\" max=\"260\" placeholder=\"Ex: 175\" data-i18n-placeholder=\"patient.height_placeholder\" onchange=\"App.setNewPatientField('alturaCm', this.value)\">\n" +
"          </div>\n" +
"          <div class=\"field\">\n" +
"            <label data-i18n=\"patient.weight_label\">Peso (kg)</label>\n" +
"            <input type=\"number\" id=\"new-patient-peso\" min=\"0\" max=\"400\" step=\"0.1\" placeholder=\"Ex: 80\" data-i18n-placeholder=\"patient.weight_placeholder\" onchange=\"App.setNewPatientField('pesoKg', this.value)\">\n" +
"          </div>\n" +
"          <div class=\"field\">\n" +
"            <label data-i18n=\"patient.hair_thickness_label\">Espessura do cabelo</label>\n" +
"            <div class=\"row\" style=\"gap:8px;\">\n" +
"              <button type=\"button\" class=\"btn secondary\" id=\"new-patient-espessura-fino\" data-i18n=\"patient.hair_thin\" onclick=\"App.setNewPatientField('cabeloEspessura','fino')\">Fino</button>\n" +
"              <button type=\"button\" class=\"btn secondary\" id=\"new-patient-espessura-grosso\" data-i18n=\"patient.hair_thick\" onclick=\"App.setNewPatientField('cabeloEspessura','grosso')\">Grosso</button>\n" +
"            </div>\n" +
"          </div>\n" +
"          <div class=\"field\">\n" +
"            <label data-i18n=\"patient.hair_texture_label\">Textura do cabelo</label>\n" +
"            <div class=\"row\" style=\"gap:8px;\">\n" +
"              <button type=\"button\" class=\"btn secondary\" id=\"new-patient-textura-liso\" data-i18n=\"patient.hair_straight\" onclick=\"App.setNewPatientField('cabeloTextura','liso')\">Liso</button>\n" +
"              <button type=\"button\" class=\"btn secondary\" id=\"new-patient-textura-ondulado\" data-i18n=\"patient.hair_wavy\" onclick=\"App.setNewPatientField('cabeloTextura','ondulado')\">Ondulado</button>\n" +
"              <button type=\"button\" class=\"btn secondary\" id=\"new-patient-textura-crespo\" data-i18n=\"patient.hair_curly\" onclick=\"App.setNewPatientField('cabeloTextura','crespo')\">Crespo</button>\n" +
"            </div>\n" +
"          </div>\n" +
"          <div class=\"field\" style=\"margin-bottom:0;\">\n" +
"            <label data-i18n=\"patient.surgery_type_label\">Tipo de cirurgia</label>\n" +
"            <div class=\"row\" style=\"gap:8px;\">\n" +
"              <button type=\"button\" class=\"btn secondary\" id=\"new-patient-raspagem-sim\" data-i18n=\"patient.with_shaving\" onclick=\"App.setNewPatientField('raspagem','sim')\">Com raspagem</button>\n" +
"              <button type=\"button\" class=\"btn secondary\" id=\"new-patient-raspagem-nao\" data-i18n=\"patient.without_shaving\" onclick=\"App.setNewPatientField('raspagem','nao')\">Sem raspagem</button>\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"      </details>\n" +
"      <button class=\"btn block lg\" data-i18n=\"home.create_button\" onclick=\"App.createSession()\">+ Nova cirurgia (criar sessão)</button>\n" +
"    </div>\n" +
"    <div id=\"surgery-list\"></div>\n" +
"  </section>\n" +
"\n" +
"  <section id=\"screen-settings\" class=\"screen\">\n" +
"    <div class=\"card\">\n" +
"      <h2 data-i18n=\"config.title\">Configurações</h2>\n" +
"      <p class=\"hint\" data-i18n=\"config.increments_subtitle\">Valores extras dos botões de incremento rápido usados na contagem da extração, além do -1/+1 que aparece sempre. Configuração só deste aparelho — cada celular pode ter os próprios botões (por exemplo, só +1 e +100, ou só +50).</p>\n" +
"      <div id=\"increments-editor\" class=\"increments-editor\"></div>\n" +
"      <div class=\"row\" style=\"margin-top:6px;\">\n" +
"        <button class=\"btn secondary\" data-i18n=\"config.add_value\" onclick=\"App.addIncrementField()\">+ Adicionar valor</button>\n" +
"      </div>\n" +
"      <footer class=\"actions\">\n" +
"        <button class=\"btn\" data-i18n=\"common.save\" onclick=\"App.saveSettings()\">Salvar</button>\n" +
"        <button class=\"btn secondary\" data-i18n=\"config.restore_default\" onclick=\"App.resetSettings()\">Restaurar padrão (10 / 50 / 100)</button>\n" +
"      </footer>\n" +
"    </div>\n" +
"\n" +
"    <div class=\"card\">\n" +
"      <h2 style=\"font-size:16px;\" data-i18n=\"config.identity_title\">Identidade visual</h2>\n" +
"      <p class=\"hint\" data-i18n=\"config.identity_subtitle\">Vale pra sua conta — aparece em todos os aparelhos onde você fizer login, e também pra quem acessar suas cirurgias só pelo link (sem login).</p>\n" +
"      <div class=\"field\">\n" +
"        <label data-i18n=\"config.logo_label\">Logomarca</label>\n" +
"        <div class=\"row\" style=\"align-items:center;gap:14px;\">\n" +
"          <img id=\"settings-logo-preview\" class=\"brand-logo\" style=\"display:none;max-height:56px;max-width:160px;border-radius:6px;border:1px solid var(--c-border);background:var(--c-tint);padding:4px;\">\n" +
"          <span id=\"settings-logo-empty\" class=\"hint\" style=\"margin:0;\" data-i18n=\"config.logo_empty\">Nenhuma logomarca ainda.</span>\n" +
"        </div>\n" +
"        <div class=\"row\" style=\"margin-top:8px;gap:8px;\">\n" +
"          <input type=\"file\" accept=\"image/png,image/jpeg\" id=\"settings-logo-input\" onchange=\"App.uploadLogo(this)\" style=\"max-width:260px;\">\n" +
"          <button class=\"btn secondary\" id=\"settings-logo-remove-btn\" style=\"display:none;\" data-i18n=\"common.remove\" onclick=\"App.removeLogo()\">Remover</button>\n" +
"        </div>\n" +
"      </div>\n" +
"      <div class=\"field\">\n" +
"        <label data-i18n=\"config.theme_label\">Cor do tema</label>\n" +
"        <div class=\"row\" id=\"settings-theme-swatches\" style=\"gap:8px;flex-wrap:wrap;\"></div>\n" +
"      </div>\n" +
"      <div class=\"field\">\n" +
"        <label data-i18n=\"config.darkmode_label\">Modo escuro</label>\n" +
"        <div class=\"row\" style=\"align-items:center;gap:12px;\">\n" +
"          <label class=\"switch\"><input type=\"checkbox\" id=\"settings-darkmode-toggle\" onchange=\"App.toggleDarkMode(this.checked)\"><span class=\"slider\"></span></label>\n" +
"          <span class=\"hint\" style=\"margin:0;\" data-i18n=\"config.darkmode_hint\">As cores clínicas (íntegro/parcial/total/mini) não mudam — só o fundo e os textos.</span>\n" +
"        </div>\n" +
"      </div>\n" +
"      <div class=\"field\" style=\"margin-bottom:0;\">\n" +
"        <label data-i18n=\"config.language_label\">Idioma / Language / Idioma</label>\n" +
"        <div class=\"row\" style=\"gap:6px;\">\n" +
"          <button type=\"button\" class=\"btn lang-switch-btn\" data-lang=\"pt\" onclick=\"App.setLanguage('pt')\">PT</button>\n" +
"          <button type=\"button\" class=\"btn secondary lang-switch-btn\" data-lang=\"en\" onclick=\"App.setLanguage('en')\">EN</button>\n" +
"          <button type=\"button\" class=\"btn secondary lang-switch-btn\" data-lang=\"es\" onclick=\"App.setLanguage('es')\">ES</button>\n" +
"        </div>\n" +
"        <p class=\"hint\" style=\"margin-top:6px;margin-bottom:0;\" data-i18n=\"config.language_hint\">Por enquanto só a tela de login/cadastro é traduzida — o resto do app continua em português.</p>\n" +
"      </div>\n" +
"    </div>\n" +
"\n" +
"    <div class=\"card\" id=\"settings-security-card\" style=\"display:none;\">\n" +
"      <h2 style=\"font-size:16px;\" data-i18n=\"config.security_title\">Segurança da conta</h2>\n" +
"      <p class=\"hint\" data-i18n=\"config.security_subtitle\">Se você perdeu ou emprestou um aparelho onde tinha feito login, use isto pra encerrar o acesso em todo lugar de uma vez.</p>\n" +
"      <button class=\"btn secondary\" data-i18n=\"config.logout_all_btn\" onclick=\"App.logoutAllDevices()\">Sair de todos os aparelhos</button>\n" +
"      <h2 style=\"font-size:16px;margin-top:20px;\" data-i18n=\"config.backup_title\">Backup dos seus dados</h2>\n" +
"      <p class=\"hint\" data-i18n=\"config.backup_subtitle\">Baixa um arquivo com o cadastro da sua conta e todas as suas cirurgias (contagens, tempos, pré-incisões). Não inclui as fotos — essas ficam protegidas separadamente pelo backup de volume do Railway. Guarde este arquivo num lugar seguro fora do Railway (computador, Google Drive, etc.).</p>\n" +
"      <button class=\"btn secondary\" data-i18n=\"config.backup_btn\" onclick=\"App.downloadBackup()\">Baixar backup</button>\n" +
"    </div>\n" +
"\n" +
"    <div class=\"card\" id=\"settings-audio-card\" style=\"display:none;\">\n" +
"      <h2 style=\"font-size:16px;\" data-i18n=\"config.audio_title\">Áudio e alarmes desta cirurgia</h2>\n" +
"      <p class=\"hint\" data-i18n=\"config.audio_subtitle\">Vale só pra cirurgia que você tinha aberta e só neste aparelho — cada celular pode ter os próprios ajustes.</p>\n" +
"      <h3 class=\"section-title\" style=\"margin:16px 0 8px;\" data-i18n=\"config.audio_section_title\">Áudio</h3>\n" +
"      <p class=\"hint\" style=\"margin-top:-4px;\" data-i18n=\"config.audio_announce_hint\">Anuncia em voz alta o total de folículos extraídos (somando os 4 quadrantes) a cada N.</p>\n" +
"      <div class=\"row\" style=\"align-items:center;gap:16px;margin-top:8px;\">\n" +
"        <label class=\"switch\"><input type=\"checkbox\" id=\"audio-toggle\" onchange=\"App.toggleAudio(this.checked)\"><span class=\"slider\"></span></label>\n" +
"        <div class=\"field\" style=\"margin:0;max-width:160px;\"><label data-i18n=\"config.audio_announce_every\">Anunciar a cada</label><input type=\"number\" id=\"audio-interval\" value=\"100\" min=\"10\" step=\"10\" onchange=\"App.saveAudioInterval(this.value)\"></div>\n" +
"        <button class=\"btn secondary\" data-i18n=\"config.audio_test_btn\" onclick=\"App.testAudio()\">Testar voz</button>\n" +
"      </div>\n" +
"      <h3 class=\"section-title\" style=\"margin:22px 0 8px;\" data-i18n=\"config.preinc_audio_section_title\">Áudio de pré-incisões</h3>\n" +
"      <p class=\"hint\" style=\"margin-top:-4px;\" data-i18n=\"config.preinc_audio_announce_hint\">Anuncia em voz alta o novo total de pré-incisões (somando todas as áreas) toda vez que você preencher o valor de uma área.</p>\n" +
"      <div class=\"row\" style=\"align-items:center;gap:16px;margin-top:8px;\">\n" +
"        <label class=\"switch\"><input type=\"checkbox\" id=\"preinc-audio-toggle\" onchange=\"App.togglePreincAudio(this.checked)\"><span class=\"slider\"></span></label>\n" +
"        <button class=\"btn secondary\" data-i18n=\"config.audio_test_btn\" onclick=\"App.testAudio()\">Testar voz</button>\n" +
"      </div>\n" +
"      <h3 class=\"section-title\" style=\"margin:22px 0 8px;\" data-i18n=\"config.alarm_section_title\">Alarme de transecção</h3>\n" +
"      <p class=\"hint\" style=\"margin-top:-4px;\" data-i18n=\"config.alarm_subtitle\">Avisa por voz assim que a taxa (somando os 4 quadrantes) ultrapassar o limite que você definir.</p>\n" +
"      <div class=\"row\" style=\"align-items:center;gap:16px;margin-top:10px;flex-wrap:wrap;\">\n" +
"        <label class=\"switch\"><input type=\"checkbox\" id=\"alert-parcial-toggle\" onchange=\"App.toggleAlertParcial(this.checked)\"><span class=\"slider\"></span></label>\n" +
"        <div class=\"field\" style=\"margin:0;max-width:260px;\"><label data-i18n=\"config.alert_partial_label\">Avisar se transecção parcial passar de (%)</label><input type=\"number\" id=\"alert-parcial-threshold\" min=\"0\" max=\"100\" step=\"0.5\" placeholder=\"Ex: 7\" data-i18n-placeholder=\"config.alert_partial_placeholder\" onchange=\"App.saveAlertParcialThreshold(this.value)\"></div>\n" +
"      </div>\n" +
"      <div class=\"row\" style=\"align-items:center;gap:16px;margin-top:10px;flex-wrap:wrap;\">\n" +
"        <label class=\"switch\"><input type=\"checkbox\" id=\"alert-total-toggle\" onchange=\"App.toggleAlertTotal(this.checked)\"><span class=\"slider\"></span></label>\n" +
"        <div class=\"field\" style=\"margin:0;max-width:260px;\"><label data-i18n=\"config.alert_total_label\">Avisar se transecção total passar de (%)</label><input type=\"number\" id=\"alert-total-threshold\" min=\"0\" max=\"100\" step=\"0.5\" placeholder=\"Ex: 5\" data-i18n-placeholder=\"config.alert_total_placeholder\" onchange=\"App.saveAlertTotalThreshold(this.value)\"></div>\n" +
"      </div>\n" +
"    </div>\n" +
"\n" +
"    <footer class=\"actions\" id=\"settings-back-footer\" style=\"display:none;\">\n" +
"      <button class=\"btn\" id=\"settings-back-btn\" data-i18n=\"config.back_to_surgery\" onclick=\"App.backToSurgery()\">Voltar pra cirurgia</button>\n" +
"    </footer>\n" +
"  </section>\n" +
"\n" +
"  <section id=\"screen-dashboard\" class=\"screen\">\n" +
"    <div class=\"card\">\n" +
"      <h2 data-i18n=\"dash.title\">Dashboard</h2>\n" +
"      <p class=\"hint\" data-i18n=\"dash.subtitle\">Estatísticas calculadas só com cirurgias <b>finalizadas</b> — cirurgias em andamento têm dados parciais e ficam de fora, pra não distorcer as médias.</p>\n" +
"      <div id=\"dash-empty\" class=\"empty-state\" style=\"display:none;\" data-i18n=\"dash.empty\">Você ainda não tem nenhuma cirurgia finalizada. As estatísticas aparecem aqui assim que a primeira for finalizada.</div>\n" +
"      <div id=\"dash-content\" style=\"display:none;\">\n" +
"        <div class=\"summary-bar static\" id=\"dash-summary\"></div>\n" +
"        <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-integro)\"></span><span data-i18n=\"dash.extracted_by_surgery_title\">Folículos extraídos por cirurgia</span></h3>\n" +
"        <p class=\"hint\" style=\"margin-top:-4px;\" data-i18n=\"dash.extracted_by_surgery_hint\">Cada barra é uma cirurgia finalizada, em ordem cronológica — dá pra ver se o volume por cirurgia está subindo ou caindo ao longo do tempo.</p>\n" +
"        <div id=\"dash-extraidos-chart\" class=\"chart-box\"></div>\n" +
"        <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-primary)\"></span><span data-i18n=\"dash.index_by_surgery_title\">Índice fios/folículo por cirurgia</span></h3>\n" +
"        <p class=\"hint\" style=\"margin-top:-4px;\" data-i18n=\"dash.index_by_surgery_hint\">Cada barra é uma cirurgia finalizada, em ordem cronológica.</p>\n" +
"        <div id=\"dash-index-chart\" class=\"chart-box\"></div>\n" +
"        <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-integro)\"></span><span data-i18n=\"dash.uf_distribution_title\">Distribuição por tipo de unidade folicular</span></h3>\n" +
"        <p class=\"hint\" style=\"margin-top:-4px;\" data-i18n=\"dash.uf_distribution_hint\">Percentual entre todos os folículos íntegros, somando todas as cirurgias finalizadas.</p>\n" +
"        <div id=\"dash-uf-table\"></div>\n" +
"        <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-parcial)\"></span><span data-i18n=\"dash.transec_rate_title\">Taxa de transecção por cirurgia</span></h3>\n" +
"        <p class=\"hint\" style=\"margin-top:-4px;\" data-i18n=\"dash.transec_rate_hint\">Modo completo e modo reduzido calculam a taxa de formas diferentes — por isso ficam em abas separadas, não misture os números.</p>\n" +
"        <div class=\"row\" style=\"gap:8px;margin-bottom:10px;\">\n" +
"          <button type=\"button\" class=\"btn\" id=\"dash-mode-completo\" data-i18n=\"common.mode_complete\" onclick=\"App.switchDashboardMode('completo')\">Completo</button>\n" +
"          <button type=\"button\" class=\"btn secondary\" id=\"dash-mode-reduzido\" data-i18n=\"common.mode_reduced\" onclick=\"App.switchDashboardMode('reduzido')\">Reduzido</button>\n" +
"          <button type=\"button\" class=\"btn secondary\" id=\"dash-mode-todos\" data-i18n=\"dash.mode_all\" onclick=\"App.switchDashboardMode('todos')\">Todos</button>\n" +
"        </div>\n" +
"        <div class=\"summary-bar static\" id=\"dash-rate-summary\"></div>\n" +
"        <p class=\"hint\" id=\"dash-rate-todos-hint\" style=\"display:none;margin-top:6px;\" data-i18n=\"dash.rate_todos_hint\">Aqui é só pra ver a evolução cronológica de todas as cirurgias juntas — cada barra usa a taxa correta da própria cirurgia. Não existe uma \"taxa média geral\" porque completo e reduzido calculam a taxa de formas diferentes. Pra ver a média, use as abas Completo ou Reduzido.</p>\n" +
"        <div id=\"dash-rate-chart\" class=\"chart-box\"></div>\n" +
"        <div id=\"dash-rate-empty\" class=\"hint\" style=\"display:none;\" data-i18n=\"dash.rate_empty\">Nenhuma cirurgia finalizada nesse modo ainda.</div>\n" +
"        <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-mini)\"></span><span data-i18n=\"dash.quad_index_title\">Índice e transecção por quadrante</span></h3>\n" +
"        <p class=\"hint\" style=\"margin-top:-4px;\" data-i18n=\"dash.quad_hint\">Usa a mesma aba Completo/Reduzido/Todos acima. Diferença Mamba × bancada só entra na média das cirurgias em que o Mamba foi preenchido naquele quadrante.</p>\n" +
"        <p class=\"hint\" id=\"dash-quad-todos-hint\" style=\"display:none;\" data-i18n=\"dash.quad_todos_hint\">Na aba \"Todos\" essas médias somem pelo mesmo motivo da taxa de transecção — completo e reduzido não são comparáveis. Use as abas Completo ou Reduzido.</p>\n" +
"        <div id=\"dash-quad-table\"></div>\n" +
"        <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-preinc)\"></span><span data-i18n=\"dash.finalized_surgeries_title\">Cirurgias finalizadas</span></h3>\n" +
"        <div id=\"dash-table\"></div>\n" +
"      </div>\n" +
"    </div>\n" +
"  </section>\n" +
"\n" +
"  <section id=\"screen-counting\" class=\"screen\">\n" +
"    <div class=\"card\">\n" +
"      <div class=\"row\" style=\"justify-content:space-between;align-items:flex-start;\">\n" +
"        <div><h2 id=\"cnt-codigo\">—</h2><div class=\"hint\" id=\"cnt-meta\">—</div><div class=\"hint\" id=\"cnt-global-timer\" style=\"font-weight:700;color:var(--c-primary-dark);margin-top:2px;\"></div></div>\n" +
"        <div style=\"display:flex;flex-direction:column;gap:6px;align-items:flex-end;\">\n" +
"          <span class=\"badge\" id=\"cnt-status\">—</span><span class=\"badge\" id=\"cnt-mode\" style=\"background:var(--c-primary-dark);\">—</span>\n" +
"          <button class=\"btn secondary\" style=\"padding:6px 10px;font-size:12px;white-space:nowrap;\" data-i18n=\"cnt.share_btn\" onclick=\"App.openShareModal()\">🔗 Compartilhar</button>\n" +
"        </div>\n" +
"      </div>\n" +
"    </div>\n" +
"\n" +
"    <div class=\"row\" style=\"gap:8px;margin-top:14px;\">\n" +
"      <button class=\"btn\" id=\"tab-extracao-btn\" data-i18n=\"cnt.tab_extracao\" onclick=\"App.switchTab('extracao')\">Extração</button>\n" +
"      <button class=\"btn secondary\" id=\"tab-preinc-btn\" data-i18n=\"cnt.tab_preinc\" onclick=\"App.switchTab('preincisoes')\">Pré-incisões</button>\n" +
"      <button class=\"btn secondary\" id=\"tab-fotos-btn\" data-i18n=\"cnt.tab_fotos\" onclick=\"App.switchTab('fotos')\">Fotos</button>\n" +
"      <button class=\"btn secondary\" id=\"tab-paciente-btn\" data-i18n=\"cnt.tab_paciente\" onclick=\"App.switchTab('paciente')\">Paciente</button>\n" +
"      <button class=\"btn secondary\" id=\"tab-resumo-btn\" data-i18n=\"cnt.tab_resumo\" onclick=\"App.switchTab('resumofinal')\">Resumo Final</button>\n" +
"    </div>\n" +
"\n" +
"    <div id=\"panel-extracao\">\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 10px;\" data-i18n=\"cnt.extraction_time_title\">Tempo de extração</h2>\n" +
"        <div class=\"row\" style=\"align-items:center;gap:16px;flex-wrap:wrap;\">\n" +
"          <div id=\"timer-display\" style=\"font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--c-primary-dark);\">00:00:00</div>\n" +
"          <div class=\"row\" style=\"gap:8px;\"><button class=\"btn\" id=\"timer-toggle-btn\" data-i18n=\"common.start\" onclick=\"App.toggleTimer()\">Iniciar</button><button class=\"btn secondary\" id=\"timer-reset-btn\" data-i18n=\"common.reset\" onclick=\"App.resetTimer()\">Zerar</button></div>\n" +
"        </div>\n" +
"        <div class=\"hint\" id=\"timer-rate\" style=\"margin-top:8px;\"></div>\n" +
"      </div>\n" +
"\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 10px;\" data-i18n=\"cnt.summary_general_title\">Resumo geral (todos os quadrantes)</h2>\n" +
"        <div class=\"summary-bar static\">\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-extraidos\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_extracted\">Folículos extraídos</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-fios\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_total_hairs\">Total de fios</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-indice\">0.00</div><div class=\"lbl\" data-i18n=\"cnt.summary_index\">Índice fios/folículo</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-transec-parcial\">0%</div><div class=\"lbl\" data-i18n=\"cnt.summary_partial_transec\">Transecção parcial</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-transec-total\">0%</div><div class=\"lbl\" data-i18n=\"cnt.summary_total_transec\">Transecção total</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-mini\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_mini\">Mini (fora do total)</div></div>\n" +
"        </div>\n" +
"        <div class=\"summary-bar static\" id=\"geral-mamba-summary\" style=\"display:none;margin-top:10px;\">\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-mamba-val\">0</div><div class=\"lbl\" data-i18n=\"cnt.mamba_reading\">Mamba (leitura final)</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-mamba-manip\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_extracted\">Folículos extraídos</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-mamba-diff\">0</div><div class=\"lbl\" data-i18n=\"cnt.mamba_diff\">Diferença</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-mamba-diffpct\">0%</div><div class=\"lbl\" data-i18n=\"cnt.mamba_diffpct\">Diferença (% do Mamba)</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"geral-mamba-rate\">—</div><div class=\"lbl\" data-i18n=\"cnt.mamba_rate\">Ritmo pelo Mamba (fol./h)</div></div>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <div class=\"row\" id=\"quadrant-tabs\" style=\"gap:8px;margin-top:14px;flex-wrap:wrap;\"></div>\n" +
"\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 4px;\" data-i18n=\"cnt.chain_title\">Contagem em cadeia</h2>\n" +
"        <p class=\"hint\" id=\"quad-chain-hint\" style=\"margin-bottom:10px;\">—</p>\n" +
"        <div class=\"field\" style=\"max-width:280px;margin-bottom:10px;\">\n" +
"          <label data-i18n=\"cnt.carry_from_label\">Carregar contagem de</label>\n" +
"          <select id=\"quad-carry-select\" onchange=\"App.setQuadrantCarryFrom(this.value)\"></select>\n" +
"        </div>\n" +
"        <div class=\"row\" style=\"gap:8px;\">\n" +
"          <button class=\"btn secondary\" id=\"quad-finish-btn\" data-i18n=\"cnt.quadrant_finish_btn\" onclick=\"App.finishQuadrant()\">Contagem finalizada</button>\n" +
"          <button class=\"btn secondary\" id=\"quad-reopen-btn\" style=\"display:none;\" data-i18n=\"cnt.quadrant_reopen_btn\" onclick=\"App.reopenQuadrant()\">Reabrir quadrante</button>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 4px;\" id=\"quad-title\">—</h2>\n" +
"        <div class=\"hint\" style=\"margin-bottom:10px;\" data-i18n=\"cnt.mamba_hint\">Preencha o Mamba na ordem em que os quadrantes forem extraídos. O valor é a leitura acumulada do aparelho ao final deste quadrante — o app calcula sozinho a diferença em relação ao quadrante anterior.</div>\n" +
"        <div class=\"field\" style=\"max-width:280px;margin-bottom:0;\">\n" +
"          <label data-i18n=\"cnt.mamba_input_label\">Mamba (leitura acumulada ao final deste quadrante)</label>\n" +
"          <input type=\"number\" id=\"quad-mamba-input\" min=\"0\" placeholder=\"Ex: 1000\" data-i18n-placeholder=\"cnt.mamba_input_placeholder\" onchange=\"App.setQuadMamba(this.value)\">\n" +
"        </div>\n" +
"        <div class=\"summary-bar static\" id=\"quad-mamba-summary\" style=\"display:none;margin-top:14px;\">\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"quad-mamba-val\">0</div><div class=\"lbl\" data-i18n=\"cnt.mamba_quad_val\">Mamba deste quadrante</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"quad-mamba-manip\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_extracted\">Folículos extraídos</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"quad-mamba-diff\">0</div><div class=\"lbl\" data-i18n=\"cnt.mamba_diff\">Diferença</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"quad-mamba-diffpct\">0%</div><div class=\"lbl\" data-i18n=\"cnt.mamba_diffpct\">Diferença (% do Mamba)</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"quad-mamba-duracao\">—</div><div class=\"lbl\" data-i18n=\"cnt.mamba_quad_duration\">Tempo deste quadrante</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"quad-mamba-rate\">—</div><div class=\"lbl\" data-i18n=\"cnt.mamba_rate\">Ritmo pelo Mamba (fol./h)</div></div>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <div class=\"summary-bar\">\n" +
"        <div id=\"quad-summary-title\" style=\"grid-column:1/-1;font-weight:700;font-size:13px;color:var(--c-primary-dark);text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px;\">—</div>\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-extraidos\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_extracted\">Folículos extraídos</div></div>\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-fios\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_total_hairs\">Total de fios</div></div>\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-indice\">0.00</div><div class=\"lbl\" data-i18n=\"cnt.summary_index\">Índice fios/folículo</div></div>\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-transec-parcial\">0%</div><div class=\"lbl\" data-i18n=\"cnt.summary_partial_transec\">Transecção parcial</div></div>\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-transec-total\">0%</div><div class=\"lbl\" data-i18n=\"cnt.summary_total_transec\">Transecção total</div></div>\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"quad-mini\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_mini\">Mini (fora do total)</div></div>\n" +
"      </div>\n" +
"\n" +
"      <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-integro)\"></span><span data-i18n=\"cnt.group_integro_title\">Folículos íntegros</span></h3><div id=\"group-integro\"></div>\n" +
"      <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-parcial)\"></span><span data-i18n=\"cnt.group_parcial_title\">Transecção parcial (folículo aproveitado)</span></h3>\n" +
"      <p class=\"hint\" id=\"parcial-reduzido-hint\" style=\"display:none;margin-top:-4px;margin-bottom:10px;\" data-i18n=\"cnt.parcial_reduzido_hint\">Modo reduzido: registre os fios desse folículo normalmente em \"Folículos íntegros\" e toque aqui só pra contar a transecção parcial (não soma de novo no total).</p>\n" +
"      <div id=\"group-parcial\"></div>\n" +
"      <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-total)\"></span><span data-i18n=\"cat.ttotal\">Transecção total (folículo perdido)</span></h3><div id=\"group-total\"></div>\n" +
"      <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-mini)\"></span><span data-i18n=\"cnt.group_mini_title\">Mini</span></h3>\n" +
"      <p class=\"hint\" style=\"margin-top:-4px;margin-bottom:10px;\" data-i18n=\"cnt.mini_hint\">Folículos miniaturizados — não entram na contagem geral de folículos extraídos, fios ou taxas, mas ficam registrados aqui pra não se perderem.</p>\n" +
"      <div id=\"group-mini\"></div>\n" +
"    </div>\n" +
"\n" +
"    <div id=\"panel-preincisoes\" style=\"display:none;\">\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 10px;\" data-i18n=\"preinc.time_title\">Tempo de pré-incisões</h2>\n" +
"        <div class=\"row\" style=\"align-items:center;gap:16px;flex-wrap:wrap;\">\n" +
"          <div id=\"preinc-timer-display\" style=\"font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--c-primary-dark);\">00:00:00</div>\n" +
"          <div class=\"row\" style=\"gap:8px;\"><button class=\"btn\" id=\"preinc-timer-toggle-btn\" data-i18n=\"common.start\" onclick=\"App.togglePreincTimer()\">Iniciar</button><button class=\"btn secondary\" id=\"preinc-timer-reset-btn\" data-i18n=\"common.reset\" onclick=\"App.resetPreincTimer()\">Zerar</button></div>\n" +
"        </div>\n" +
"        <div class=\"hint\" id=\"preinc-timer-rate\" style=\"margin-top:8px;\"></div>\n" +
"      </div>\n" +
"      <div class=\"summary-bar static\">\n" +
"        <div class=\"summary-item\"><div class=\"val\" id=\"preinc-total\">0</div><div class=\"lbl\" data-i18n=\"preinc.total_label\">Total de pré-incisões</div></div>\n" +
"      </div>\n" +
"      <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-preinc)\"></span><span data-i18n=\"preinc.by_area_title\">Pré-incisões por área</span></h3>\n" +
"      <p class=\"hint\" style=\"margin-top:-4px;margin-bottom:10px;\" data-i18n=\"preinc.area_hint\">Toque no número de cima pra digitar o total da área. UF1/UF2/UF3 embaixo = quantas unidades foliculares de 1, 2 ou 3 fios vão pra essa área.</p>\n" +
"      <div id=\"group-preincisoes\"></div>\n" +
"      <div class=\"summary-bar static\" id=\"preinc-dist-totals\"></div>\n" +
"    </div>\n" +
"\n" +
"    <div id=\"panel-fotos\" style=\"display:none;\">\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 4px;\" data-i18n=\"photos.marcacao_title\">Marcação cirúrgica</h2>\n" +
"        <p class=\"hint\" style=\"margin-bottom:10px;\" data-i18n=\"photos.marcacao_hint\">Ficam salvas neste servidor — visíveis em todos os celulares conectados.</p>\n" +
"        <input type=\"file\" accept=\"image/*\" multiple capture=\"environment\" onchange=\"App.uploadPhotos('marcacao', this)\">\n" +
"        <div class=\"photo-grid\" id=\"photos-grid-marcacao\"></div>\n" +
"      </div>\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 4px;\" data-i18n=\"photos.posop_title\">Pós-operatório imediato</h2>\n" +
"        <input type=\"file\" accept=\"image/*\" multiple capture=\"environment\" onchange=\"App.uploadPhotos('posop', this)\">\n" +
"        <div class=\"photo-grid\" id=\"photos-grid-posop\"></div>\n" +
"      </div>\n" +
"    </div>\n" +
"\n" +
"    <div id=\"panel-paciente\" style=\"display:none;\">\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 4px;\" data-i18n=\"patient.section_title\">Dados do paciente</h2>\n" +
"        <p class=\"hint\" style=\"margin-bottom:10px;\" data-i18n=\"patient.section_hint\">Opcional — preencha agora, depois, ou nunca. Não trava nada da cirurgia.</p>\n" +
"        <div class=\"field\">\n" +
"          <label data-i18n=\"patient.age_label\">Idade</label>\n" +
"          <input type=\"number\" id=\"patient-idade\" min=\"0\" max=\"130\" placeholder=\"Ex: 45\" data-i18n-placeholder=\"patient.age_placeholder\" onchange=\"App.setPatientField('idade', this.value)\">\n" +
"        </div>\n" +
"        <div class=\"field\">\n" +
"          <label data-i18n=\"patient.height_label\">Altura (cm)</label>\n" +
"          <input type=\"number\" id=\"patient-altura\" min=\"0\" max=\"260\" placeholder=\"Ex: 175\" data-i18n-placeholder=\"patient.height_placeholder\" onchange=\"App.setPatientField('alturaCm', this.value)\">\n" +
"        </div>\n" +
"        <div class=\"field\">\n" +
"          <label data-i18n=\"patient.weight_label\">Peso (kg)</label>\n" +
"          <input type=\"number\" id=\"patient-peso\" min=\"0\" max=\"400\" step=\"0.1\" placeholder=\"Ex: 80\" data-i18n-placeholder=\"patient.weight_placeholder\" onchange=\"App.setPatientField('pesoKg', this.value)\">\n" +
"        </div>\n" +
"        <div class=\"field\">\n" +
"          <label data-i18n=\"patient.hair_thickness_label\">Espessura do cabelo</label>\n" +
"          <div class=\"row\" style=\"gap:8px;\">\n" +
"            <button type=\"button\" class=\"btn secondary\" id=\"patient-espessura-fino\" data-i18n=\"patient.hair_thin\" onclick=\"App.setPatientField('cabeloEspessura','fino')\">Fino</button>\n" +
"            <button type=\"button\" class=\"btn secondary\" id=\"patient-espessura-grosso\" data-i18n=\"patient.hair_thick\" onclick=\"App.setPatientField('cabeloEspessura','grosso')\">Grosso</button>\n" +
"          </div>\n" +
"        </div>\n" +
"        <div class=\"field\">\n" +
"          <label data-i18n=\"patient.hair_texture_label\">Textura do cabelo</label>\n" +
"          <div class=\"row\" style=\"gap:8px;\">\n" +
"            <button type=\"button\" class=\"btn secondary\" id=\"patient-textura-liso\" data-i18n=\"patient.hair_straight\" onclick=\"App.setPatientField('cabeloTextura','liso')\">Liso</button>\n" +
"            <button type=\"button\" class=\"btn secondary\" id=\"patient-textura-ondulado\" data-i18n=\"patient.hair_wavy\" onclick=\"App.setPatientField('cabeloTextura','ondulado')\">Ondulado</button>\n" +
"            <button type=\"button\" class=\"btn secondary\" id=\"patient-textura-crespo\" data-i18n=\"patient.hair_curly\" onclick=\"App.setPatientField('cabeloTextura','crespo')\">Crespo</button>\n" +
"          </div>\n" +
"        </div>\n" +
"        <div class=\"field\" style=\"margin-bottom:0;\">\n" +
"          <label data-i18n=\"patient.surgery_type_label\">Tipo de cirurgia</label>\n" +
"          <div class=\"row\" style=\"gap:8px;\">\n" +
"            <button type=\"button\" class=\"btn secondary\" id=\"patient-raspagem-sim\" data-i18n=\"patient.with_shaving\" onclick=\"App.setPatientField('raspagem','sim')\">Com raspagem</button>\n" +
"            <button type=\"button\" class=\"btn secondary\" id=\"patient-raspagem-nao\" data-i18n=\"patient.without_shaving\" onclick=\"App.setPatientField('raspagem','nao')\">Sem raspagem</button>\n" +
"          </div>\n" +
"        </div>\n" +
"      </div>\n" +
"    </div>\n" +
"\n" +
"    <div id=\"panel-resumofinal\" style=\"display:none;\">\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 10px;\" data-i18n=\"cnt.final_summary_title\">Resumo final da cirurgia</h2>\n" +
"        <h3 class=\"section-title\" style=\"margin-top:0;\"><span class=\"dot\" style=\"background:var(--c-primary)\"></span><span data-i18n=\"cnt.final_times_title\">Tempos</span></h3>\n" +
"        <div class=\"summary-bar static\">\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-tempo-extracao\">00:00:00</div><div class=\"lbl\" data-i18n=\"cnt.extraction_time_title\">Tempo de extração</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-tempo-preinc\">00:00:00</div><div class=\"lbl\" data-i18n=\"preinc.time_title\">Tempo de pré-incisões</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-tempo-total\">—</div><div class=\"lbl\" data-i18n=\"print.total_surgery_time_label\">Tempo total da cirurgia</div></div>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 10px;\" data-i18n=\"cnt.summary_general_title\">Resumo geral (todos os quadrantes)</h2>\n" +
"        <div class=\"summary-bar static\">\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-extraidos\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_extracted\">Folículos extraídos</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-fios\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_total_hairs\">Total de fios</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-indice\">0.00</div><div class=\"lbl\" data-i18n=\"cnt.summary_index\">Índice fios/folículo</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-transec-parcial\">0%</div><div class=\"lbl\" data-i18n=\"cnt.summary_partial_transec\">Transecção parcial</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-transec-total\">0%</div><div class=\"lbl\" data-i18n=\"cnt.summary_total_transec\">Transecção total</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-mini\">0</div><div class=\"lbl\" data-i18n=\"cnt.summary_mini\">Mini (fora do total)</div></div>\n" +
"        </div>\n" +
"        <div class=\"summary-bar static\" id=\"final-mamba-summary\" style=\"display:none;margin-top:10px;\">\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-mamba-val\">0</div><div class=\"lbl\" data-i18n=\"cnt.mamba_reading\">Mamba (leitura final)</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-mamba-diff\">0</div><div class=\"lbl\" data-i18n=\"cnt.mamba_diff_extraidos\">Diferença (Mamba − Extraídos)</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-mamba-diffpct-extraidos\">0%</div><div class=\"lbl\" data-i18n=\"cnt.mamba_diffpct_extraidos\">Diferença (% Mamba × Extraídos)</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-mamba-rate\">—</div><div class=\"lbl\" data-i18n=\"cnt.mamba_rate\">Ritmo pelo Mamba (fol./h)</div></div>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <h3 class=\"section-title\"><span class=\"dot\" style=\"background:var(--c-integro)\"></span><span data-i18n=\"cnt.final_categories_title\">Folículos por categoria</span></h3>\n" +
"      <div class=\"summary-bar static cat-grid\" id=\"final-categorias\"></div>\n" +
"\n" +
"      <div class=\"card\">\n" +
"        <h2 style=\"font-size:15px;margin:0 0 10px;\" data-i18n=\"cnt.final_preinc_title\">Resumo de pré-incisões</h2>\n" +
"        <div class=\"summary-bar static\">\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-preinc-total\">0</div><div class=\"lbl\" data-i18n=\"preinc.total_label\">Total de pré-incisões</div></div>\n" +
"          <div class=\"summary-item\"><div class=\"val\" id=\"final-preinc-diff\">0</div><div class=\"lbl\" data-i18n=\"cnt.final_preinc_diff\">Diferença (pré-incisões − folículos extraídos)</div></div>\n" +
"        </div>\n" +
"      </div>\n" +
"    </div>\n" +
"\n" +
"    <footer class=\"actions\">\n" +
"      <button class=\"btn secondary\" data-i18n=\"cnt.print_btn\" onclick=\"App.printReport()\">Imprimir / Salvar PDF</button>\n" +
"      <button class=\"btn secondary\" id=\"btn-finalizar\" data-i18n=\"cnt.finalize_btn\" onclick=\"App.finalizeSession()\">Finalizar cirurgia</button>\n" +
"      <button class=\"btn secondary\" id=\"btn-reabrir\" style=\"display:none;\" data-i18n=\"cnt.reopen_btn\" onclick=\"App.reopenSession()\">Reabrir</button>\n" +
"    </footer>\n" +
"  </section>\n" +
"</div>\n" +
"<div class=\"toast\" id=\"toast\"></div>\n" +
"<div id=\"print-report\"></div>\n" +
"<div class=\"modal-overlay\" id=\"share-modal-overlay\" onclick=\"if(event.target===this) App.closeShareModal();\">\n" +
"  <div class=\"modal-box\">\n" +
"    <div class=\"row\" style=\"justify-content:space-between;align-items:center;\">\n" +
"      <h2 style=\"margin:0;font-size:16px;\" data-i18n=\"share.title\">Compartilhar cirurgia</h2>\n" +
"      <button class=\"icon-btn\" style=\"background:var(--c-surface2);color:var(--c-text);\" onclick=\"App.closeShareModal()\">✕</button>\n" +
"    </div>\n" +
"    <div class=\"field\" style=\"margin-top:14px;margin-bottom:0;\">\n" +
"      <label data-i18n=\"share.url_label\">Endereço desta cirurgia (compartilhe com os outros celulares)</label>\n" +
"      <div class=\"share-url\" id=\"share-url\">—</div>\n" +
"      <div class=\"row\" style=\"margin-top:8px;gap:8px;\">\n" +
"        <button class=\"btn\" data-i18n=\"share.share_link_btn\" onclick=\"App.shareViaSystem()\">Compartilhar link</button>\n" +
"        <button class=\"btn secondary\" data-i18n=\"share.whatsapp_btn\" onclick=\"App.shareViaWhatsapp()\">Enviar por WhatsApp</button>\n" +
"        <button class=\"btn secondary\" data-i18n=\"share.copy_btn\" onclick=\"App.copyShareUrl()\">Copiar</button>\n" +
"      </div>\n" +
"      <p class=\"hint\" style=\"margin-top:8px;\">A auxiliar toca no link recebido e a página abre direto na contagem desta cirurgia — não precisa digitar nada.</p>\n" +
"    </div>\n" +
"  </div>\n" +
"</div>\n" +
"<script>\n" +
"(function(){\n" +
"'use strict';\n" +
"var STRINGS = __STRINGS_JSON__;\n" +
"function t(key, vars){\n" +
"  var dict = STRINGS[state.lang] || STRINGS.pt;\n" +
"  var str = dict[key] || STRINGS.pt[key] || key;\n" +
"  if (vars){ Object.keys(vars).forEach(function(k){ str = str.split('{'+k+'}').join(vars[k]); }); }\n" +
"  return str;\n" +
"}\n" +
"function getCookie(name){\n" +
"  var m = document.cookie.match(new RegExp('(?:^|; )'+name+'=([^;]*)'));\n" +
"  return m ? decodeURIComponent(m[1]) : null;\n" +
"}\n" +
"// Aplica o idioma atual (state.lang) em todo elemento estático marcado com\n" +
"// data-i18n / data-i18n-placeholder. Escopo de hoje: telas de login, cadastro\n" +
"// e redefinição de senha — o resto do app ainda é só em português, migrado aos\n" +
"// poucos (o texto em português continua funcionando como estava, sem chave).\n" +
"function applyI18n(){\n" +
"  document.documentElement.lang = state.lang;\n" +
"  document.querySelectorAll('[data-i18n]').forEach(function(el){ el.textContent = t(el.getAttribute('data-i18n')); });\n" +
"  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){ el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });\n" +
"  document.querySelectorAll('.lang-switch-btn').forEach(function(btn){\n" +
"    btn.className = (btn.getAttribute('data-lang')===state.lang) ? 'btn lang-switch-btn' : 'btn secondary lang-switch-btn';\n" +
"  });\n" +
"}\n" +
"// Detecta o idioma inicial: cookie salvo > localStorage > idioma do navegador >\n" +
"// português. O cookie é o que o servidor lê pra responder erros de API no\n" +
"// idioma certo — por isso App.setLanguage grava nos dois lugares.\n" +
"function initLanguage(){\n" +
"  var saved = getCookie('fue_lang') || localStorage.getItem('fue_lang');\n" +
"  if (!saved){\n" +
"    var nav = (navigator.language||'pt').slice(0,2).toLowerCase();\n" +
"    saved = STRINGS[nav] ? nav : 'pt';\n" +
"  }\n" +
"  state.lang = STRINGS[saved] ? saved : 'pt';\n" +
"  applyI18n();\n" +
"}\n" +
"var CATS = [\n" +
"  {id:'f1',get label(){return t('cat.f1');},hairs:1,group:'integro'},\n" +
"  {id:'f2',get label(){return t('cat.f2');},hairs:2,group:'integro'},\n" +
"  {id:'f3',get label(){return t('cat.f3');},hairs:3,group:'integro'},\n" +
"  {id:'f4',get label(){return t('cat.f4');},hairs:4,group:'integro'},\n" +
"  {id:'f1fino',get label(){return t('cat.f1fino');},hairs:1,group:'integro'},\n" +
"  {id:'f2fino',get label(){return t('cat.f2fino');},hairs:2,group:'integro'},\n" +
"  {id:'t2_1',get label(){return t('cat.t2_1');},hairs:1,group:'parcial'},\n" +
"  {id:'t3_2',get label(){return t('cat.t3_2');},hairs:2,group:'parcial'},\n" +
"  {id:'t3_1',get label(){return t('cat.t3_1');},hairs:1,group:'parcial'},\n" +
"  {id:'t4_3',get label(){return t('cat.t4_3');},hairs:3,group:'parcial'},\n" +
"  {id:'t4_2',get label(){return t('cat.t4_2');},hairs:2,group:'parcial'},\n" +
"  {id:'t4_1',get label(){return t('cat.t4_1');},hairs:1,group:'parcial'},\n" +
"  {id:'parcial_geral',get label(){return t('cat.parcial_geral');},hairs:0,group:'parcial_reduzida'},\n" +
"  {id:'ttotal',get label(){return t('cat.ttotal');},hairs:0,group:'total'},\n" +
"  {id:'mini',get label(){return t('cat.mini');},hairs:0,group:'mini'}\n" +
"];\n" +
"var SESSION_MODES = ['completo','reduzido'];\n" +
"var QUADRANTS = [\n" +
"  {id:'occipital_dir',get label(){return t('quad.occipital_dir');}},\n" +
"  {id:'occipital_esq',get label(){return t('quad.occipital_esq');}},\n" +
"  {id:'temporal_esq',get label(){return t('quad.temporal_esq');}},\n" +
"  {id:'temporal_dir',get label(){return t('quad.temporal_dir');}}\n" +
"];\n" +
"var PREINC_AREAS = [\n" +
"  {id:'recesso_dir',get label(){return t('preinc.recesso_dir');}},{id:'recesso_esq',get label(){return t('preinc.recesso_esq');}},\n" +
"  {id:'linha',get label(){return t('preinc.linha');}},{id:'sublinha',get label(){return t('preinc.sublinha');}},\n" +
"  {id:'entrada_dir1',get label(){return t('preinc.entrada_dir1');}},{id:'entrada_dir2',get label(){return t('preinc.entrada_dir2');}},\n" +
"  {id:'entrada_esq1',get label(){return t('preinc.entrada_esq1');}},{id:'entrada_esq2',get label(){return t('preinc.entrada_esq2');}},\n" +
"  {id:'topete1',get label(){return t('preinc.topete1');}},{id:'topete2',get label(){return t('preinc.topete2');}},\n" +
"  {id:'scalp',get label(){return t('preinc.scalp');}},{id:'coroa',get label(){return t('preinc.coroa');}}\n" +
"];\n" +
"var DIST_FIOS = [{id:'f1',get label(){return t('cat.f1');}},{id:'f2',get label(){return t('cat.f2');}},{id:'f3',get label(){return t('cat.f3');}}];\n" +
"var DEFAULT_INCREMENTS = [10,50,100];\n" +
"function quadrantById(id){ for (var i=0;i<QUADRANTS.length;i++){ if (QUADRANTS[i].id===id) return QUADRANTS[i]; } return null; }\n" +
"function computeSummary(counts, mode){\n" +
"  var integros=0, parciais=0, totalPerdidos=0, totalFios=0, miniTotal=0, parcialGeral=counts['parcial_geral']||0;\n" +
"  CATS.forEach(function(c){\n" +
"    var n = counts[c.id]||0;\n" +
"    if (c.group==='integro'){ integros+=n; totalFios+=n*c.hairs; }\n" +
"    else if (c.group==='parcial'){ parciais+=n; totalFios+=n*c.hairs; }\n" +
"    else if (c.group==='total'){ totalPerdidos+=n; }\n" +
"    else if (c.group==='mini'){ miniTotal+=n; }\n" +
"  });\n" +
"  var reduzido = mode==='reduzido';\n" +
"  var parcialParaTaxa = reduzido ? parcialGeral : parciais;\n" +
"  var foliculosExtraidos = reduzido ? integros : (integros+parciais);\n" +
"  var foliculosManipulados = reduzido ? (integros+totalPerdidos) : (integros+parciais+totalPerdidos);\n" +
"  var indice = foliculosExtraidos>0 ? totalFios/foliculosExtraidos : 0;\n" +
"  var taxaParcialDenom = reduzido ? integros : foliculosManipulados;\n" +
"  var taxaParcial = taxaParcialDenom>0 ? parcialParaTaxa/taxaParcialDenom*100 : 0;\n" +
"  var taxaTotal = foliculosManipulados>0 ? totalPerdidos/foliculosManipulados*100 : 0;\n" +
"  return {integros:integros,parciais:parciais,parcialGeral:parcialGeral,totalPerdidos:totalPerdidos,miniTotal:miniTotal,foliculosExtraidos:foliculosExtraidos,foliculosManipulados:foliculosManipulados,totalFios:totalFios,indice:indice,taxaParcial:taxaParcial,taxaTotal:taxaTotal};\n" +
"}\n" +
"function combinedExtractionCounts(s){\n" +
"  var combined = {}; CATS.forEach(function(c){ combined[c.id]=0; });\n" +
"  QUADRANTS.forEach(function(qd){\n" +
"    var qc = s.quadrants[qd.id].counts;\n" +
"    CATS.forEach(function(c){ combined[c.id] = (combined[c.id]||0) + (qc[c.id]||0); });\n" +
"  });\n" +
"  return combined;\n" +
"}\n" +
"// Encontra o quadrante marcado (Mamba preenchido) mais recente ANTES do quadrante\n" +
"// atual, usando o RELÓGIO REAL de quando cada um foi marcado (mambaMarkedAtMs) — não\n" +
"// a ordem fixa da lista de quadrantes, e não o tempo decorrido do cronômetro de\n" +
"// extração (mambaMarkTimeMs), que fica PARADO sempre que o cronômetro é pausado e\n" +
"// por isso pode empatar entre dois quadrantes marcados durante a mesma pausa —\n" +
"// empate esse que, com comparação estrita, fazia o sistema pular o quadrante\n" +
"// verdadeiramente anterior e cair, por engano, num quadrante bem mais antigo\n" +
"// (o primeiro já marcado). Isso é o que permite que cada médico/equipe preencha os\n" +
"// quadrantes na ordem que quiser (direita, esquerda, temporal, occipital — tanto\n" +
"// faz), em vez de assumir sempre temporal dir → temporal esq → occipital dir →\n" +
"// occipital esq. Retorna null se não houver candidato confiável (aí quem chamou cai\n" +
"// num último recurso baseado na ordem da lista, só pra dado antigo de antes desta\n" +
"// correção, que não tem relógio real registrado).\n" +
"function findPrevMarkedQuadrant(s, quadId){\n" +
"  var current = s.quadrants[quadId];\n" +
"  if (current.mambaMarkedAtMs===null || current.mambaMarkedAtMs===undefined) return null;\n" +
"  var best = null;\n" +
"  QUADRANTS.forEach(function(q){\n" +
"    if (q.id===quadId) return;\n" +
"    var qd = s.quadrants[q.id];\n" +
"    if (qd.mambaMarkedAtMs===null || qd.mambaMarkedAtMs===undefined) return;\n" +
"    if (qd.mambaMarkedAtMs < current.mambaMarkedAtMs){\n" +
"      if (!best || qd.mambaMarkedAtMs > best.mambaMarkedAtMs) best = qd;\n" +
"    }\n" +
"  });\n" +
"  return best;\n" +
"}\n" +
"function mambaPrevCumulativo(s, quadId){\n" +
"  var current = s.quadrants[quadId];\n" +
"  if (current.mambaMarkedAtMs===null || current.mambaMarkedAtMs===undefined){\n" +
"    // Este quadrante em si não tem timestamp (dado antigo, marcado antes desta\n" +
"    // correção existir) — não tem como saber a ordem real de preenchimento; cai no\n" +
"    // último recurso: ordem fixa da lista, igual ao comportamento de antes.\n" +
"    var idx=-1;\n" +
"    for (var i=0;i<QUADRANTS.length;i++){ if (QUADRANTS[i].id===quadId){ idx=i; break; } }\n" +
"    for (var j=idx-1;j>=0;j--){\n" +
"      var v = s.quadrants[QUADRANTS[j].id].mambaCumulativo;\n" +
"      if (v!==null && v!==undefined && v!=='') return Number(v);\n" +
"    }\n" +
"    return 0;\n" +
"  }\n" +
"  // Este quadrante TEM timestamp confiável — usa sempre o horário real. Se não\n" +
"  // achar nenhum quadrante marcado antes dele, é porque ele genuinamente foi o\n" +
"  // primeiro (delta a partir de zero) — não cai pra ordem fixa nesse caso, senão\n" +
"  // volta a acontecer o bug de pegar um quadrante marcado DEPOIS só porque ele\n" +
"  // aparece antes na lista fixa.\n" +
"  var prev = findPrevMarkedQuadrant(s, quadId);\n" +
"  return prev ? Number(prev.mambaCumulativo||0) : 0;\n" +
"}\n" +
"function mambaFinalCumulativo(s){\n" +
"  var withTime = QUADRANTS.map(function(q){ return s.quadrants[q.id]; }).filter(function(qd){\n" +
"    return qd.mambaCumulativo!==null && qd.mambaCumulativo!==undefined && qd.mambaCumulativo!=='' &&\n" +
"      qd.mambaMarkedAtMs!==null && qd.mambaMarkedAtMs!==undefined;\n" +
"  });\n" +
"  if (withTime.length){\n" +
"    withTime.sort(function(a,b){ return b.mambaMarkedAtMs - a.mambaMarkedAtMs; });\n" +
"    return Number(withTime[0].mambaCumulativo);\n" +
"  }\n" +
"  // Nenhum quadrante tem relógio real registrado (cirurgia antiga, nunca tocada\n" +
"  // depois desta correção) — último recurso: ordem fixa da lista, como antes.\n" +
"  for (var i=QUADRANTS.length-1;i>=0;i--){\n" +
"    var v = s.quadrants[QUADRANTS[i].id].mambaCumulativo;\n" +
"    if (v!==null && v!==undefined && v!=='') return Number(v);\n" +
"  }\n" +
"  return null;\n" +
"}\n" +
"// base = número contra o qual o Mamba é comparado. Em todo o app isso é sempre\n" +
"// folículos EXTRAÍDOS (íntegros + parciais) — não folículos manipulados (que\n" +
"// somaria também a transecção total). Ficou assim porque as duas bases quase\n" +
"// sempre coincidem (só divergem quando há transecção total na cirurgia) e\n" +
"// comparar contra extraídos é mais direto de entender: 'o Mamba bateu com o que\n" +
"// eu realmente extraí?'.\n" +
"function computeMambaDiff(mambaCount, base){\n" +
"  if (mambaCount===null||mambaCount===undefined||mambaCount==='') return null;\n" +
"  var mamba = Number(mambaCount);\n" +
"  var diff = mamba - base;\n" +
"  var diffPct = mamba>0 ? diff/mamba*100 : 0;\n" +
"  return {mamba:mamba, base:base, diff:diff, diffPct:diffPct};\n" +
"}\n" +
"function mambaPrevMarkTimeMs(s, quadId){\n" +
"  var prev = findPrevMarkedQuadrant(s, quadId);\n" +
"  return prev ? Number(prev.mambaMarkTimeMs) : 0;\n" +
"}\n" +
"// Duração do quadrante = tempo marcado neste quadrante menos o tempo marcado no\n" +
"// quadrante marcado imediatamente antes dele por horário real (não por posição na\n" +
"// lista). Só existe se o Mamba deste quadrante foi preenchido; se dois quadrantes\n" +
"// forem marcados fora de ordem (ou vier de dado antigo sem timestamp confiável), a\n" +
"// duração pode dar zero ou negativa — nesse caso tratamos como 'sem dado confiável' (null).\n" +
"function quadrantDurationMs(s, quadId){\n" +
"  var qd = s.quadrants[quadId];\n" +
"  var v = qd.mambaMarkTimeMs;\n" +
"  if (v===null || v===undefined) return null;\n" +
"  // Sem relógio real registrado não dá pra confiar em qual quadrante veio antes —\n" +
"  // sem isso, evita calcular uma duração enganosa contra o quadrante errado.\n" +
"  if (qd.mambaMarkedAtMs===null || qd.mambaMarkedAtMs===undefined) return null;\n" +
"  var dur = Number(v) - mambaPrevMarkTimeMs(s, quadId);\n" +
"  return dur>0 ? dur : null;\n" +
"}\n" +
"// Ritmo de extração baseado no Mamba (folículos/hora), diferente do ritmo baseado\n" +
"// na contagem manual de bancada: usa o delta da leitura do Mamba dividido pelo\n" +
"// tempo marcado pra aquele quadrante.\n" +
"function mambaRatePerHour(mambaDelta, durationMs){\n" +
"  if (durationMs===null || durationMs===undefined || durationMs<=0) return null;\n" +
"  return mambaDelta/(durationMs/3600000);\n" +
"}\n" +
"// Contagem em cadeia: soma a contribuição PRÓPRIA deste quadrante (counts[catId],\n" +
"// nunca mexido por esta função) com o total acumulado do predecessor (carryFromId),\n" +
"// recursivamente. O link é sempre um elo EXPLÍCITO (criado por 'Contagem\n" +
"// finalizada' ou pelo seletor manual), nunca inferido por ordem/tempo — é por\n" +
"// isso que, ao contrário do Mamba, não existe ambiguidade de 'quem vem antes' aqui.\n" +
"// Dinâmico de propósito: corrigir a contagem de um quadrante anterior já reflete\n" +
"// automaticamente em todos os que vêm depois dele na cadeia, sem precisar reabrir\n" +
"// nada. 'seen' protege contra ciclo (não deveria existir, mas por garantia).\n" +
"function chainCumulativeCat(s, quadId, catId, seen){\n" +
"  seen = seen || {};\n" +
"  if (seen[quadId]) return 0;\n" +
"  seen[quadId] = true;\n" +
"  var qd = s.quadrants[quadId];\n" +
"  if (!qd) return 0;\n" +
"  var own = qd.counts[catId]||0;\n" +
"  if (!qd.carryFromId || !s.quadrants[qd.carryFromId]) return own;\n" +
"  return own + chainCumulativeCat(s, qd.carryFromId, catId, seen);\n" +
"}\n" +
"// Soma TODAS as categorias que o predecessor traz pra este quadrante — usado pra\n" +
"// mostrar '(230)' na dica 'Contando a partir de: Occipital direito (230)' e pra\n" +
"// recalcular o valor próprio quando alguém edita o número acumulado direto (toque\n" +
"// no número pra digitar).\n" +
"function chainPredecessorTotalAllCats(s, quadId){\n" +
"  var qd = s.quadrants[quadId];\n" +
"  if (!qd || !qd.carryFromId || !s.quadrants[qd.carryFromId]) return 0;\n" +
"  var total = 0;\n" +
"  CATS.forEach(function(c){ total += chainCumulativeCat(s, qd.carryFromId, c.id); });\n" +
"  return total;\n" +
"}\n" +
"// Espelho client-side da mesma checagem que o servidor faz — usado só pra já\n" +
"// esconder do seletor manual as opções que o servidor recusaria de qualquer\n" +
"// jeito (evita a pessoa escolher algo e levar um erro na cara).\n" +
"function wouldCreateCarryCycleClient(s, quadId, candidateId){\n" +
"  if (candidateId===quadId) return true;\n" +
"  var seen = {}; seen[quadId] = true;\n" +
"  var cur = candidateId, hops = 0;\n" +
"  while (cur && hops < QUADRANTS.length+1) {\n" +
"    if (seen[cur]) return true;\n" +
"    seen[cur] = true;\n" +
"    var qd = s.quadrants[cur];\n" +
"    cur = qd ? qd.carryFromId : null;\n" +
"    hops++;\n" +
"  }\n" +
"  return false;\n" +
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
"// Tempo total do CASO, do primeiro cronômetro iniciado (extração ou pré-incisões,\n" +
"// o que vier primeiro) até agora — ou até a finalização, se já finalizado. Ao\n" +
"// contrário de elapsedMs(), não pausa quando os cronômetros individuais pausam.\n" +
"function globalElapsedMs(s){\n" +
"  if (!s.globalTimerStartedAt) return null;\n" +
"  var end = s.globalTimerEndedAt || Date.now();\n" +
"  return end - s.globalTimerStartedAt;\n" +
"}\n" +
"var state = {currentId:null, session:null, pollHandle:null, connOk:true, increments:DEFAULT_INCREMENTS.slice(), activeTab:'extracao', activeQuadrant:QUADRANTS[0].id, audioEnabled:false, audioInterval:100, lastAnnounced:0, preincAudioEnabled:false, preincLastTotal:null, baseUrl:null, alertParcialEnabled:false, alertParcialThreshold:null, alertParcialFired:false, alertTotalEnabled:false, alertTotalThreshold:null, alertTotalFired:false, currentUser:null, resetToken:null, newSessionMode:'completo', newPatientInfo:{}, lang:'pt'};\n" +
"function shareUrlFor(id){ return (state.baseUrl||window.location.origin) + '/s/' + id; }\n" +
"function resolveBaseUrl(){\n" +
"  var host = window.location.hostname;\n" +
"  var isLocalhost = (host === 'localhost' || host === '127.0.0.1');\n" +
"  if (!isLocalhost){\n" +
"    // Acessado por um IP de rede ou por um domínio de verdade (nuvem) — já está correto.\n" +
"    state.baseUrl = window.location.origin;\n" +
"    return Promise.resolve();\n" +
"  }\n" +
"  // Só corrige quando acessado como \"localhost\", que não funciona em outros aparelhos.\n" +
"  return fetch('/api/network-info').then(function(r){ return r.json(); }).then(function(info){\n" +
"    var ip = (info.ips && info.ips.length) ? info.ips[0] : null;\n" +
"    state.baseUrl = ip ? ('http://'+ip+':'+info.port) : window.location.origin;\n" +
"  }).catch(function(){ state.baseUrl = window.location.origin; });\n" +
"}\n" +
"var toastTimer=null;\n" +
"function toast(msg, dur){ var el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(function(){el.classList.remove('show');}, dur||1800); }\n" +
"var THEME_PRESETS = {\n" +
"  padrao:  { label:'Padrão (verde-água)', primary:'#0e7c86', primaryDark:'#0a5c64' },\n" +
"  azul:    { label:'Azul',                primary:'#1d63c9', primaryDark:'#134a99' },\n" +
"  roxo:    { label:'Roxo',                primary:'#6a3fc7', primaryDark:'#4e2b99' },\n" +
"  grafite: { label:'Grafite',             primary:'#4b5563', primaryDark:'#333b45' },\n" +
"  marinho: { label:'Marinho',             primary:'#1e3a5c', primaryDark:'#14283f' }\n" +
"};\n" +
"var THEME_ORDER = ['padrao','azul','roxo','grafite','marinho'];\n" +
"var LIGHT_VARS = { bg:'#f4f6f7', card:'#fff', text:'#1c2b2e', muted:'#5c6b6e', border:'#dde3e4', tint:'#fafcfc', tintActive:'#e8f4f5', surface2:'#e8edee', toastBg:'#1c2b2e', toastText:'#fff' };\n" +
"var DARK_VARS  = { bg:'#12181a', card:'#1c2528', text:'#e7edee', muted:'#9aa8ab', border:'#313d40', tint:'#222c2f', tintActive:'#2a3d40', surface2:'#2a3336', toastBg:'#e7edee', toastText:'#1c2528' };\n" +
"function applyBranding(branding){\n" +
"  var b = branding || { theme:'padrao', darkMode:false, logoFilename:null };\n" +
"  state.activeBranding = b;\n" +
"  var preset = THEME_PRESETS[b.theme] || THEME_PRESETS.padrao;\n" +
"  var v = b.darkMode ? DARK_VARS : LIGHT_VARS;\n" +
"  var root = document.documentElement.style;\n" +
"  root.setProperty('--c-primary', preset.primary);\n" +
"  root.setProperty('--c-primary-dark', preset.primaryDark);\n" +
"  root.setProperty('--c-bg', v.bg);\n" +
"  root.setProperty('--c-card', v.card);\n" +
"  root.setProperty('--c-text', v.text);\n" +
"  root.setProperty('--c-muted', v.muted);\n" +
"  root.setProperty('--c-border', v.border);\n" +
"  root.setProperty('--c-tint', v.tint);\n" +
"  root.setProperty('--c-tint-active', v.tintActive);\n" +
"  root.setProperty('--c-surface2', v.surface2);\n" +
"  root.setProperty('--c-toast-bg', v.toastBg);\n" +
"  root.setProperty('--c-toast-text', v.toastText);\n" +
"  document.documentElement.classList.toggle('dark', !!b.darkMode);\n" +
"  var logoEls = document.querySelectorAll('.brand-logo');\n" +
"  logoEls.forEach(function(el){\n" +
"    if (b.logoFilename && b.ownerId){\n" +
"      el.src = '/api/user/'+b.ownerId+'/logo?v='+encodeURIComponent(b.logoFilename);\n" +
"      el.style.display = 'inline-block';\n" +
"    } else {\n" +
"      el.style.display = 'none';\n" +
"    }\n" +
"  });\n" +
"}\n" +
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
"      '<button class=\"btn secondary\" onclick=\"App.removeIncrementField('+idx+')\">'+escapeHtml(t('common.remove'))+'</button></div>';\n" +
"  }).join('');\n" +
"  var b = (state.currentUser && state.currentUser.branding) || { theme:'padrao', darkMode:false, logoFilename:null, ownerId:null };\n" +
"  var preview = document.getElementById('settings-logo-preview');\n" +
"  var empty = document.getElementById('settings-logo-empty');\n" +
"  var removeBtn = document.getElementById('settings-logo-remove-btn');\n" +
"  if (b.logoFilename && b.ownerId){\n" +
"    preview.src = '/api/user/'+b.ownerId+'/logo?v='+encodeURIComponent(b.logoFilename);\n" +
"    preview.style.display = 'inline-block'; empty.style.display='none'; removeBtn.style.display='inline-block';\n" +
"  } else {\n" +
"    preview.style.display = 'none'; empty.style.display=''; removeBtn.style.display='none';\n" +
"  }\n" +
"  document.getElementById('settings-theme-swatches').innerHTML = THEME_ORDER.map(function(id){\n" +
"    var preset = THEME_PRESETS[id];\n" +
"    var active = (b.theme===id);\n" +
"    return '<button type=\"button\" onclick=\"App.setTheme(\\''+id+'\\')\" title=\"'+escapeHtml(preset.label)+'\" style=\"width:38px;height:38px;border-radius:50%;cursor:pointer;background:'+preset.primary+';border:'+(active?'3px solid var(--c-text)':'1px solid var(--c-border)')+';\"></button>';\n" +
"  }).join('');\n" +
"  document.getElementById('settings-darkmode-toggle').checked = !!b.darkMode;\n" +
"  document.getElementById('settings-security-card').style.display = state.currentUser ? 'block' : 'none';\n" +
"}\n" +
"var App = {};\n" +
"App.goHome = function(){\n" +
"  if (!state.currentUser && state.currentId){\n" +
"    // Auxiliar sem login, só com o link de uma cirurgia — não existe uma lista pra\n" +
"    // mostrar pra ela, então \"Início\" (e o botão \"Voltar\" da tela de Config) volta\n" +
"    // pra própria cirurgia em vez de forçar login.\n" +
"    history.pushState({},'','/s/'+state.currentId);\n" +
"    showScreen('counting');\n" +
"    return;\n" +
"  }\n" +
"  stopPolling(); state.currentId=null; history.pushState({},'','/'); App.checkAuthAndShowHome();\n" +
"};\n" +
"function renderUserBar(){\n" +
"  var el = document.getElementById('user-bar');\n" +
"  if (state.currentUser){\n" +
"    el.innerHTML = escapeHtml(state.currentUser.nomeCompleto.split(' ')[0])+' <button class=\"icon-btn\" onclick=\"App.logout()\">'+escapeHtml(t('nav.exit'))+'</button>';\n" +
"  } else {\n" +
"    el.innerHTML = '';\n" +
"  }\n" +
"  document.getElementById('dashboard-btn').style.display = state.currentUser ? 'inline-block' : 'none';\n" +
"}\n" +
"App.checkAuthAndShowHome = function(){\n" +
"  api('/api/me').then(function(r){\n" +
"    state.currentUser = r.user; applyBranding(r.user.branding); App.setLanguage(r.user.branding.language, true); renderUserBar(); showScreen('home'); loadSurgeryList();\n" +
"  }).catch(function(){\n" +
"    state.currentUser = null; applyBranding(null); renderUserBar(); showScreen('auth'); App.switchAuthTab('login');\n" +
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
"  if (!email || !password){ toast(t('toast.fill_email_password')); return; }\n" +
"  api('/api/login','POST',{email:email, password:password}).then(function(r){\n" +
"    state.currentUser = r.user; applyBranding(r.user.branding); App.setLanguage(r.user.branding.language, true); renderUserBar(); showScreen('home'); loadSurgeryList();\n" +
"    toast(t('toast.welcome',{name:r.user.nomeCompleto.split(' ')[0]}));\n" +
"  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.doRegister = function(){\n" +
"  var nomeCompleto = document.getElementById('reg-nome').value.trim();\n" +
"  var crm = document.getElementById('reg-crm').value.trim();\n" +
"  var email = document.getElementById('reg-email').value.trim();\n" +
"  var telefone = document.getElementById('reg-telefone').value.trim();\n" +
"  var password = document.getElementById('reg-password').value;\n" +
"  var password2 = document.getElementById('reg-password2').value;\n" +
"  if (!nomeCompleto || !crm || !email || !telefone || !password){ toast(t('toast.fill_all_fields')); return; }\n" +
"  if (password !== password2){ toast(t('toast.passwords_dont_match')); return; }\n" +
"  if (password.length < 6){ toast(t('toast.password_too_short')); return; }\n" +
"  api('/api/register','POST',{nomeCompleto:nomeCompleto, crm:crm, email:email, telefone:telefone, password:password}).then(function(r){\n" +
"    state.currentUser = r.user; applyBranding(r.user.branding); App.setLanguage(r.user.branding.language, true); renderUserBar(); showScreen('home'); loadSurgeryList();\n" +
"    toast(t('toast.account_created_welcome',{name:r.user.nomeCompleto.split(' ')[0]}));\n" +
"  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.logout = function(){\n" +
"  api('/api/logout','POST',{}).then(function(){\n" +
"    state.currentUser = null; applyBranding(null); renderUserBar(); showScreen('auth'); App.switchAuthTab('login');\n" +
"    toast(t('toast.logged_out'));\n" +
"  }).catch(function(){});\n" +
"};\n" +
"App.logoutAllDevices = function(){\n" +
"  if (!window.confirm(t('toast.logout_all_confirm'))) return;\n" +
"  api('/api/logout-all','POST',{}).then(function(){\n" +
"    state.currentUser = null; applyBranding(null); renderUserBar(); showScreen('auth'); App.switchAuthTab('login');\n" +
"    toast(t('toast.logged_out_all'));\n" +
"  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"// Baixa o backup manual (cadastro + cirurgias do próprio médico). Navegação\n" +
"// direta em vez de fetch: o servidor manda Content-Disposition:attachment, que\n" +
"// faz o navegador baixar o arquivo em vez de sair da página — o cookie de\n" +
"// login já vai junto automaticamente, igual qualquer outra requisição.\n" +
"App.downloadBackup = function(){ window.location.href = '/api/backup'; };\n" +
"// Troca o idioma da interface. skipSync evita regravar no servidor quando o\n" +
"// idioma acabou de VIR de lá (login/cadastro) — só grava quando é uma escolha\n" +
"// manual da pessoa (seletor na tela de login ou em Configurações).\n" +
"App.setLanguage = function(lang, skipSync){\n" +
"  if (!STRINGS[lang]) return;\n" +
"  state.lang = lang;\n" +
"  document.cookie = 'fue_lang='+lang+'; path=/; max-age=31536000; SameSite=Lax';\n" +
"  try{ localStorage.setItem('fue_lang', lang); }catch(e){}\n" +
"  applyI18n();\n" +
"  if (typeof renderUserBar === 'function' && state.currentUser) renderUserBar();\n" +
"  if (!skipSync && state.currentUser){\n" +
"    api('/api/me/branding','POST',{language:lang}).catch(function(){});\n" +
"  }\n" +
"};\n" +
"App.toggleForgotPassword = function(){\n" +
"  var el = document.getElementById('forgot-password-panel');\n" +
"  el.style.display = (el.style.display==='none') ? '' : 'none';\n" +
"};\n" +
"App.doForgotPassword = function(){\n" +
"  var email = document.getElementById('forgot-email').value.trim();\n" +
"  if (!email){ toast(t('toast.enter_your_email')); return; }\n" +
"  api('/api/forgot-password','POST',{email:email}).then(function(){\n" +
"    toast(t('toast.reset_link_sent_generic'), 4500);\n" +
"  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.doResetPassword = function(){\n" +
"  var password = document.getElementById('reset-password').value;\n" +
"  var password2 = document.getElementById('reset-password2').value;\n" +
"  if (!password){ toast(t('toast.enter_new_password')); return; }\n" +
"  if (password !== password2){ toast(t('toast.passwords_dont_match')); return; }\n" +
"  if (password.length < 6){ toast(t('toast.password_too_short')); return; }\n" +
"  api('/api/reset-password','POST',{token:state.resetToken, password:password}).then(function(){\n" +
"    toast(t('toast.password_changed_login'), 3500);\n" +
"    history.pushState({},'','/');\n" +
"    App.checkAuthAndShowHome();\n" +
"  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.showSettings = function(){\n" +
"  renderSettingsScreen();\n" +
"  document.getElementById('settings-back-footer').style.display = state.currentId ? 'flex' : 'none';\n" +
"  document.getElementById('settings-audio-card').style.display = state.currentId ? 'block' : 'none';\n" +
"  showScreen('settings');\n" +
"};\n" +
"App.backToSurgery = function(){\n" +
"  if (!state.currentId){ App.goHome(); return; }\n" +
"  history.pushState({},'','/s/'+state.currentId);\n" +
"  showScreen('counting');\n" +
"};\n" +
"App.showDashboard = function(){\n" +
"  if (!state.currentUser){ toast(t('toast.login_required_dashboard')); return; }\n" +
"  showScreen('dashboard');\n" +
"  api('/api/sessions').then(function(list){\n" +
"    state.dashboardSessions = list.filter(function(s){ return s.status==='finalizada'; });\n" +
"    state.dashboardMode = state.dashboardMode || 'completo';\n" +
"    renderDashboardScreen();\n" +
"  }).catch(function(){ toast(t('toast.server_unreachable')); });\n" +
"};\n" +
"App.switchDashboardMode = function(mode){ state.dashboardMode = mode; renderDashboardScreen(); };\n" +
"function computeDashboardData(sessions){\n" +
"  var sorted = sessions.slice().sort(function(a,b){ return a.createdAt-b.createdAt; });\n" +
"  var catTotals = {}; CATS.forEach(function(c){ catTotals[c.id]=0; });\n" +
"  var quadStats = {}; QUADRANTS.forEach(function(q){ quadStats[q.id] = { completo:[], reduzido:[], mambaDiffs:{completo:[],reduzido:[]} }; });\n" +
"  var rows = sorted.map(function(s){\n" +
"    var combined = combinedExtractionCounts(s);\n" +
"    var sum = computeSummary(combined, s.mode||'completo');\n" +
"    var m = s.mode||'completo';\n" +
"    CATS.forEach(function(c){ catTotals[c.id] += (combined[c.id]||0); });\n" +
"    QUADRANTS.forEach(function(q){\n" +
"      var qc = s.quadrants[q.id].counts;\n" +
"      var qsum = computeSummary(qc, m);\n" +
"      if (qsum.foliculosManipulados>0){ quadStats[q.id][m].push({indice:qsum.indice, taxaParcial:qsum.taxaParcial, taxaTotal:qsum.taxaTotal}); }\n" +
"      var mc = s.quadrants[q.id].mambaCumulativo;\n" +
"      if (mc!==null && mc!==undefined && mc!==''){\n" +
"        var prev = mambaPrevCumulativo(s, q.id);\n" +
"        var delta = Number(mc) - prev;\n" +
"        var qmdiff = computeMambaDiff(delta, qsum.foliculosExtraidos);\n" +
"        if (qmdiff) quadStats[q.id].mambaDiffs[m].push(qmdiff.diffPct);\n" +
"      }\n" +
"    });\n" +
"    return {\n" +
"      id: s.id, codigo: s.codigo, mode: m, createdAt: s.createdAt,\n" +
"      extraidos: sum.foliculosExtraidos, totalFios: sum.totalFios, indice: sum.indice,\n" +
"      taxaParcial: sum.taxaParcial, taxaTotal: sum.taxaTotal, miniTotal: sum.miniTotal,\n" +
"      tempoMs: elapsedMs(s.timer),\n" +
"      preincTotalVal: preincTotal(s.preincCounts)\n" +
"    };\n" +
"  });\n" +
"  var withData = rows.filter(function(r){ return r.extraidos>0; });\n" +
"  var mean = function(arr, key){ if (!arr.length) return 0; var sum=0; arr.forEach(function(r){ sum+=r[key]; }); return sum/arr.length; };\n" +
"  var meanArr = function(arr){ if (!arr.length) return null; var t=0; arr.forEach(function(v){ t+=v; }); return t/arr.length; };\n" +
"  var sumOf = function(arr, key){ var t=0; arr.forEach(function(r){ t+=r[key]; }); return t; };\n" +
"  var byMode = { completo: withData.filter(function(r){ return r.mode==='completo'; }), reduzido: withData.filter(function(r){ return r.mode==='reduzido'; }) };\n" +
"  var preincTotals = rows.map(function(r){ return r.preincTotalVal; });\n" +
"  var preincSum = preincTotals.reduce(function(a,b){ return a+b; }, 0);\n" +
"  var foliculosExtraidosGeral = sumOf(rows, 'extraidos');\n" +
"  var tempoTotalMs = sumOf(rows, 'tempoMs');\n" +
"  var miniTotalGeral = sumOf(rows, 'miniTotal');\n" +
"  var integrosTotal = catTotals.f1+catTotals.f2+catTotals.f3+catTotals.f4+catTotals.f1fino+catTotals.f2fino;\n" +
"  var pctUF = ['f1','f2','f3','f4','f1fino','f2fino'].map(function(id){\n" +
"    var c = CATS.filter(function(x){ return x.id===id; })[0];\n" +
"    return { id:id, label:c.label, qtd:catTotals[id], pct: integrosTotal>0 ? catTotals[id]/integrosTotal*100 : 0 };\n" +
"  });\n" +
"  var quadranteMedias = QUADRANTS.map(function(q){\n" +
"    var qc = quadStats[q.id];\n" +
"    var build = function(arr, mambaArr){ return { n:arr.length, indice:mean(arr,'indice'), taxaParcial:mean(arr,'taxaParcial'), taxaTotal:mean(arr,'taxaTotal'), mambaDiffPct:meanArr(mambaArr) }; };\n" +
"    return { id:q.id, label:quadrantById(q.id).label, completo:build(qc.completo,qc.mambaDiffs.completo), reduzido:build(qc.reduzido,qc.mambaDiffs.reduzido) };\n" +
"  });\n" +
"  return {\n" +
"    rows: rows,\n" +
"    withData: withData,\n" +
"    totalCirurgias: rows.length,\n" +
"    indiceMedio: mean(withData, 'indice'),\n" +
"    preincMedia: rows.length ? preincSum/rows.length : 0,\n" +
"    preincTotal: preincSum,\n" +
"    foliculosExtraidosGeral: foliculosExtraidosGeral,\n" +
"    fiosGeral: sumOf(rows, 'totalFios'),\n" +
"    byMode: byMode,\n" +
"    taxaParcialMedia: { completo: mean(byMode.completo,'taxaParcial'), reduzido: mean(byMode.reduzido,'taxaParcial') },\n" +
"    taxaTotalMedia: { completo: mean(byMode.completo,'taxaTotal'), reduzido: mean(byMode.reduzido,'taxaTotal') },\n" +
"    tempoTotalMs: tempoTotalMs,\n" +
"    folPerMin: tempoTotalMs>0 ? foliculosExtraidosGeral/(tempoTotalMs/60000) : 0,\n" +
"    tempoPorMilMs: foliculosExtraidosGeral>0 ? (tempoTotalMs/foliculosExtraidosGeral*1000) : 0,\n" +
"    miniTotalGeral: miniTotalGeral,\n" +
"    minisPorMil: foliculosExtraidosGeral>0 ? (miniTotalGeral/foliculosExtraidosGeral*1000) : 0,\n" +
"    pctUF: pctUF,\n" +
"    quadranteMedias: quadranteMedias\n" +
"  };\n" +
"}\n" +
"function localeForLang(){ return {pt:'pt-BR', en:'en-US', es:'es-ES'}[state.lang] || 'pt-BR'; }\n" +
"function fmtBig(n){ return n.toLocaleString(localeForLang()); }\n" +
"function shortDate(ts){ var d=new Date(ts); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'); }\n" +
"function buildBarChartSvg(items, color, valueFmt){\n" +
"  if (!items.length) return '<p class=\"hint\">'+escapeHtml(t('dash.no_data_yet'))+'</p>';\n" +
"  var h=170, barW=26, gap=14, padTop=20, padBottom=32, plotH=h-padTop-padBottom;\n" +
"  var w = Math.max(220, items.length*(barW+gap)+gap);\n" +
"  var maxVal = 0; items.forEach(function(it){ if (it.value>maxVal) maxVal=it.value; });\n" +
"  if (maxVal<=0) maxVal=1;\n" +
"  var bars = items.map(function(it,i){\n" +
"    var barH = Math.max(2,(it.value/maxVal)*plotH);\n" +
"    var x = gap+i*(barW+gap);\n" +
"    var y = padTop+(plotH-barH);\n" +
"    var lbl = escapeHtml(it.label);\n" +
"    var val = valueFmt ? valueFmt(it.value) : it.value;\n" +
"    return '<g><rect x=\"'+x+'\" y=\"'+y+'\" width=\"'+barW+'\" height=\"'+barH+'\" rx=\"3\" fill=\"'+color+'\"><title>'+lbl+': '+val+'</title></rect>'+\n" +
"      '<text x=\"'+(x+barW/2)+'\" y=\"'+(y-5)+'\" font-size=\"10\" text-anchor=\"middle\" fill=\"var(--c-text)\">'+val+'</text>'+\n" +
"      '<text x=\"'+(x+barW/2)+'\" y=\"'+(h-padBottom+13)+'\" font-size=\"9\" text-anchor=\"middle\" fill=\"var(--c-muted)\">'+lbl+'</text></g>';\n" +
"  }).join('');\n" +
"  return '<svg viewBox=\"0 0 '+w+' '+h+'\" width=\"'+w+'\" height=\"'+h+'\">'+\n" +
"    '<line x1=\"0\" y1=\"'+(padTop+plotH)+'\" x2=\"'+w+'\" y2=\"'+(padTop+plotH)+'\" stroke=\"var(--c-border)\"/>'+bars+'</svg>';\n" +
"}\n" +
"function buildRateChartSvg(items){\n" +
"  if (!items.length) return '';\n" +
"  var h=170, barW=11, pairGap=3, groupGap=16, padTop=20, padBottom=32, plotH=h-padTop-padBottom;\n" +
"  var groupW = barW*2+pairGap;\n" +
"  var w = Math.max(240, items.length*(groupW+groupGap)+groupGap);\n" +
"  var maxVal=0; items.forEach(function(it){ maxVal=Math.max(maxVal,it.parcial,it.total); });\n" +
"  maxVal = Math.max(5, maxVal*1.15);\n" +
"  var groups = items.map(function(it,i){\n" +
"    var gx = groupGap+i*(groupW+groupGap);\n" +
"    var hP = Math.max(1,(it.parcial/maxVal)*plotH), hT = Math.max(1,(it.total/maxVal)*plotH);\n" +
"    var yP = padTop+(plotH-hP), yT = padTop+(plotH-hT);\n" +
"    var lbl = escapeHtml(it.label);\n" +
"    return '<g><rect x=\"'+gx+'\" y=\"'+yP+'\" width=\"'+barW+'\" height=\"'+hP+'\" rx=\"2\" fill=\"var(--c-parcial)\"><title>'+lbl+' — parcial: '+it.parcial.toFixed(1)+'%</title></rect>'+\n" +
"      '<rect x=\"'+(gx+barW+pairGap)+'\" y=\"'+yT+'\" width=\"'+barW+'\" height=\"'+hT+'\" rx=\"2\" fill=\"var(--c-total)\"><title>'+lbl+' — total: '+it.total.toFixed(1)+'%</title></rect>'+\n" +
"      '<text x=\"'+(gx+groupW/2)+'\" y=\"'+(h-padBottom+13)+'\" font-size=\"9\" text-anchor=\"middle\" fill=\"var(--c-muted)\">'+lbl+'</text></g>';\n" +
"  }).join('');\n" +
"  return '<svg viewBox=\"0 0 '+w+' '+h+'\" width=\"'+w+'\" height=\"'+h+'\">'+\n" +
"    '<line x1=\"0\" y1=\"'+(padTop+plotH)+'\" x2=\"'+w+'\" y2=\"'+(padTop+plotH)+'\" stroke=\"var(--c-border)\"/>'+groups+\n" +
"    '<g><rect x=\"0\" y=\"0\" width=\"9\" height=\"9\" fill=\"var(--c-parcial)\"/><text x=\"13\" y=\"9\" font-size=\"9\" fill=\"var(--c-muted)\">parcial</text>'+\n" +
"    '<rect x=\"58\" y=\"0\" width=\"9\" height=\"9\" fill=\"var(--c-total)\"/><text x=\"71\" y=\"9\" font-size=\"9\" fill=\"var(--c-muted)\">total</text></g>'+\n" +
"    '</svg>';\n" +
"}\n" +
"function renderDashboardScreen(){\n" +
"  var data = computeDashboardData(state.dashboardSessions||[]);\n" +
"  document.getElementById('dash-empty').style.display = data.totalCirurgias===0 ? 'block' : 'none';\n" +
"  document.getElementById('dash-content').style.display = data.totalCirurgias===0 ? 'none' : 'block';\n" +
"  if (data.totalCirurgias===0) return;\n" +
"  document.getElementById('dash-summary').innerHTML =\n" +
"    '<div class=\"summary-item\"><div class=\"val\">'+data.totalCirurgias+'</div><div class=\"lbl\">'+escapeHtml(t('dash.finalized_surgeries_title'))+'</div></div>'+\n" +
"    '<div class=\"summary-item\"><div class=\"val\">'+fmtBig(data.foliculosExtraidosGeral)+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_extracted_total'))+'</div></div>'+\n" +
"    '<div class=\"summary-item\"><div class=\"val\">'+fmtBig(data.fiosGeral)+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_hairs_total'))+'</div></div>'+\n" +
"    '<div class=\"summary-item\"><div class=\"val\">'+data.indiceMedio.toFixed(2)+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_avg_index'))+'</div></div>'+\n" +
"    '<div class=\"summary-item\"><div class=\"val\">'+data.preincMedia.toFixed(0)+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_preinc_avg'))+'</div></div>'+\n" +
"    '<div class=\"summary-item\"><div class=\"val\">'+data.preincTotal+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_preinc_total'))+'</div></div>'+\n" +
"    '<div class=\"summary-item\"><div class=\"val\">'+data.folPerMin.toFixed(1)+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_follicles_per_min'))+'</div></div>'+\n" +
"    '<div class=\"summary-item\"><div class=\"val\">'+fmtHMS(data.tempoPorMilMs)+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_avg_time_per_1000'))+'</div></div>'+\n" +
"    '<div class=\"summary-item\"><div class=\"val\">'+data.minisPorMil.toFixed(1)+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_minis_per_1000'))+'</div></div>';\n" +
"  var extItems = data.withData.map(function(r){ return {label:shortDate(r.createdAt), value:r.extraidos}; });\n" +
"  document.getElementById('dash-extraidos-chart').innerHTML = buildBarChartSvg(extItems, 'var(--c-integro)', function(v){ return fmtBig(v); });\n" +
"  var idxItems = data.withData.map(function(r){ return {label:shortDate(r.createdAt), value:r.indice}; });\n" +
"  document.getElementById('dash-index-chart').innerHTML = buildBarChartSvg(idxItems, 'var(--c-primary)', function(v){ return v.toFixed(2); });\n" +
"  var mode = state.dashboardMode||'completo';\n" +
"  document.getElementById('dash-mode-completo').className = 'btn'+(mode==='completo'?'':' secondary');\n" +
"  document.getElementById('dash-mode-reduzido').className = 'btn'+(mode==='reduzido'?'':' secondary');\n" +
"  document.getElementById('dash-mode-todos').className = 'btn'+(mode==='todos'?'':' secondary');\n" +
"  var isTodos = mode==='todos';\n" +
"  var modeRows = isTodos ? data.withData : data.byMode[mode];\n" +
"  document.getElementById('dash-rate-todos-hint').style.display = (isTodos && modeRows.length) ? 'block' : 'none';\n" +
"  document.getElementById('dash-rate-empty').style.display = modeRows.length ? 'none' : 'block';\n" +
"  document.getElementById('dash-rate-summary').style.display = modeRows.length ? 'grid' : 'none';\n" +
"  document.getElementById('dash-rate-chart').style.display = modeRows.length ? 'block' : 'none';\n" +
"  if (modeRows.length){\n" +
"    if (isTodos){\n" +
"      document.getElementById('dash-rate-summary').innerHTML =\n" +
"        '<div class=\"summary-item\"><div class=\"val\">'+modeRows.length+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_surgeries_all_modes'))+'</div></div>'+\n" +
"        '<div class=\"summary-item\"><div class=\"val\">'+data.byMode.completo.length+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_in_complete_mode'))+'</div></div>'+\n" +
"        '<div class=\"summary-item\"><div class=\"val\">'+data.byMode.reduzido.length+'</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_in_reduced_mode'))+'</div></div>';\n" +
"    } else {\n" +
"      document.getElementById('dash-rate-summary').innerHTML =\n" +
"        '<div class=\"summary-item\"><div class=\"val\">'+modeRows.length+'</div><div class=\"lbl\">'+escapeHtml(mode==='completo'?t('dash.stat_surgeries_mode_complete'):t('dash.stat_surgeries_mode_reduced'))+'</div></div>'+\n" +
"        '<div class=\"summary-item\"><div class=\"val\">'+data.taxaParcialMedia[mode].toFixed(1)+'%</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_partial_rate_avg'))+'</div></div>'+\n" +
"        '<div class=\"summary-item\"><div class=\"val\">'+data.taxaTotalMedia[mode].toFixed(1)+'%</div><div class=\"lbl\">'+escapeHtml(t('dash.stat_total_rate_avg'))+'</div></div>';\n" +
"    }\n" +
"    var rateItems = modeRows.map(function(r){ return {label:shortDate(r.createdAt)+(isTodos?(r.mode==='reduzido'?' (R)':' (C)'):''), parcial:r.taxaParcial, total:r.taxaTotal}; });\n" +
"    document.getElementById('dash-rate-chart').innerHTML = buildRateChartSvg(rateItems);\n" +
"  }\n" +
"  document.getElementById('dash-quad-todos-hint').style.display = isTodos ? 'block' : 'none';\n" +
"  document.getElementById('dash-quad-table').style.display = isTodos ? 'none' : 'block';\n" +
"  if (!isTodos){\n" +
"    var fmtOrDash = function(v, suffix){ return v===null ? '—' : v.toFixed(1)+(suffix||''); };\n" +
"    var quadRows = data.quadranteMedias.map(function(q){\n" +
"      var qm = q[mode];\n" +
"      return '<tr><td>'+escapeHtml(q.label)+'</td><td>'+qm.n+'</td><td>'+(qm.n?qm.indice.toFixed(2):'—')+'</td>'+\n" +
"        '<td>'+(qm.n?qm.taxaParcial.toFixed(1)+'%':'—')+'</td><td>'+(qm.n?qm.taxaTotal.toFixed(1)+'%':'—')+'</td>'+\n" +
"        '<td>'+fmtOrDash(qm.mambaDiffPct,'%')+'</td></tr>';\n" +
"    }).join('');\n" +
"    document.getElementById('dash-quad-table').innerHTML = '<div class=\"dash-table-wrap\"><table class=\"dash-table\">'+\n" +
"      '<tr><th>'+escapeHtml(t('dash.table_quadrant'))+'</th><th>'+escapeHtml(t('dash.table_surgeries'))+'</th><th>'+escapeHtml(t('dash.table_avg_index'))+'</th><th>'+escapeHtml(t('dash.table_partial_rate_avg'))+'</th><th>'+escapeHtml(t('dash.table_total_rate_avg'))+'</th><th>'+escapeHtml(t('dash.table_mamba_vs_bench'))+'</th></tr>'+\n" +
"      quadRows+'</table></div>';\n" +
"  }\n" +
"  var ufRows = data.pctUF.map(function(u){\n" +
"    return '<tr><td>'+escapeHtml(u.label)+'</td><td>'+fmtBig(u.qtd)+'</td><td>'+u.pct.toFixed(1)+'%</td></tr>';\n" +
"  }).join('');\n" +
"  document.getElementById('dash-uf-table').innerHTML = '<div class=\"dash-table-wrap\"><table class=\"dash-table\">'+\n" +
"    '<tr><th>'+escapeHtml(t('dash.table_category'))+'</th><th>'+escapeHtml(t('dash.table_quantity'))+'</th><th>'+escapeHtml(t('dash.table_pct_intact'))+'</th></tr>'+\n" +
"    ufRows+'</table></div>';\n" +
"  var tableRows = data.rows.map(function(r){\n" +
"    return '<tr><td>'+escapeHtml(r.codigo)+'</td><td>'+shortDate(r.createdAt)+'</td><td>'+(r.mode==='reduzido'?t('common.mode_reduced'):t('common.mode_complete'))+'</td>'+\n" +
"      '<td>'+r.extraidos+'</td><td>'+r.indice.toFixed(2)+'</td><td>'+r.taxaParcial.toFixed(1)+'%</td><td>'+r.taxaTotal.toFixed(1)+'%</td><td>'+r.preincTotalVal+'</td></tr>';\n" +
"  }).join('');\n" +
"  document.getElementById('dash-table').innerHTML = '<div class=\"dash-table-wrap\"><table class=\"dash-table\">'+\n" +
"    '<tr><th>'+escapeHtml(t('dash.table_surgery'))+'</th><th>'+escapeHtml(t('dash.table_date'))+'</th><th>'+escapeHtml(t('dash.table_mode'))+'</th><th>'+escapeHtml(t('dash.table_extracted'))+'</th><th>'+escapeHtml(t('dash.table_index'))+'</th><th>'+escapeHtml(t('dash.table_partial_rate'))+'</th><th>'+escapeHtml(t('dash.table_total_rate'))+'</th><th>'+escapeHtml(t('dash.table_preinc'))+'</th></tr>'+\n" +
"    tableRows+'</table></div>';\n" +
"}\n" +
"App.addIncrementField = function(){ state.increments.push(1); renderSettingsScreen(); };\n" +
"App.updateIncrementField = function(inputEl){\n" +
"  var idx = parseInt(inputEl.getAttribute('data-idx'),10);\n" +
"  var val = parseInt(inputEl.value,10);\n" +
"  if (isNaN(val) || val<1) val = 1;\n" +
"  state.increments[idx] = val;\n" +
"};\n" +
"App.removeIncrementField = function(idx){ state.increments.splice(idx,1); renderSettingsScreen(); };\n" +
"App.saveSettings = function(){\n" +
"  if (!state.increments.length){ toast(t('toast.add_at_least_one_value')); return; }\n" +
"  saveIncrementSettings();\n" +
"  toast(t('toast.settings_saved'));\n" +
"  if (state.session) render();\n" +
"};\n" +
"App.resetSettings = function(){\n" +
"  state.increments = DEFAULT_INCREMENTS.slice();\n" +
"  saveIncrementSettings();\n" +
"  renderSettingsScreen();\n" +
"  toast(t('toast.defaults_restored'));\n" +
"  if (state.session) render();\n" +
"};\n" +
"function loadSurgeryList(){\n" +
"  api('/api/sessions').then(function(list){\n" +
"    state.surgeryList = list;\n" +
"    var el = document.getElementById('surgery-list');\n" +
"    if (!list.length){ el.innerHTML = '<div class=\"empty-state\">'+escapeHtml(t('home.no_surgeries_yet'))+'</div>'; return; }\n" +
"    el.innerHTML = list.map(function(s){\n" +
"      var sum = computeSummary(combinedExtractionCounts(s), s.mode||'completo');\n" +
"      var badgeClass = s.status==='finalizada'?'finalizada':'andamento';\n" +
"      return '<div class=\"surgery-card\"><div><b>'+escapeHtml(s.codigo)+'</b><div class=\"hint\">'+sum.foliculosExtraidos+' folículos · índice '+sum.indice.toFixed(2)+'</div></div>'+\n" +
"        '<div style=\"text-align:right;\"><span class=\"badge '+badgeClass+'\">'+(s.status==='finalizada'?t('common.status_finalized'):t('common.status_in_progress'))+'</span><br>'+\n" +
"        '<div class=\"row\" style=\"gap:6px;margin-top:8px;justify-content:flex-end;\">'+\n" +
"        '<button class=\"btn secondary\" onclick=\"App.openSession(\\''+s.id+'\\')\">'+escapeHtml(t('common.open'))+'</button>'+\n" +
"        '<button class=\"btn danger\" onclick=\"App.deleteSession(\\''+s.id+'\\')\">'+escapeHtml(t('common.delete'))+'</button>'+\n" +
"        '</div></div></div>';\n" +
"    }).join('');\n" +
"  }).catch(function(){ toast(t('toast.server_unreachable')); });\n" +
"}\n" +
"App.deleteSession = function(id){\n" +
"  var found = (state.surgeryList||[]).filter(function(s){ return s.id===id; })[0];\n" +
"  var codigo = found ? found.codigo : id;\n" +
"  var confirmText = t('confirm.delete_surgery',{code:codigo});\n" +
"  if (!window.confirm(confirmText)) return;\n" +
"  api('/api/session/'+id, 'DELETE').then(function(){ toast(t('toast.surgery_deleted')); loadSurgeryList(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.setNewMode = function(mode){\n" +
"  state.newSessionMode = mode;\n" +
"  document.getElementById('new-mode-completo').className = 'btn' + (mode==='completo' ? '' : ' secondary');\n" +
"  document.getElementById('new-mode-reduzido').className = 'btn' + (mode==='reduzido' ? '' : ' secondary');\n" +
"};\n" +
"App.createSession = function(){\n" +
"  var codigo = document.getElementById('new-codigo').value.trim();\n" +
"  if (!codigo){ toast(t('toast.enter_patient_code')); return; }\n" +
"  var mode = state.newSessionMode||'completo';\n" +
"  var payload = {codigo:codigo, mode:mode};\n" +
"  if (Object.keys(state.newPatientInfo||{}).length) payload.patientInfo = state.newPatientInfo;\n" +
"  api('/api/session','POST',payload).then(function(s){\n" +
"    document.getElementById('new-codigo').value='';\n" +
"    App.setNewMode('completo');\n" +
"    state.newPatientInfo = {};\n" +
"    ['new-patient-idade','new-patient-altura','new-patient-peso'].forEach(function(id){ var el=document.getElementById(id); if (el) el.value=''; });\n" +
"    App.refreshNewPatientButtons();\n" +
"    App.openSession(s.id);\n" +
"  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.openSession = function(id){ state.currentId=id; state.activeQuadrant=QUADRANTS[0].id; history.pushState({},'','/s/'+id); loadAudioPrefs(id); showScreen('counting'); App.switchTab('extracao'); fetchAndRender().then(function(){ startPolling(); }); };\n" +
"function fetchAndRender(){ return api('/api/session/'+state.currentId).then(function(s){ state.session=s; render(); }).catch(function(){ toast(t('errors.surgery_not_found_server')); }); }\n" +
"function startPolling(){ stopPolling(); state.pollHandle = setInterval(function(){ fetchAndRender(); }, 1500); }\n" +
"function stopPolling(){ if (state.pollHandle){ clearInterval(state.pollHandle); state.pollHandle=null; } }\n" +
"App.switchTab = function(tab){\n" +
"  state.activeTab = tab;\n" +
"  var panels = {extracao:'panel-extracao', preincisoes:'panel-preincisoes', fotos:'panel-fotos', paciente:'panel-paciente', resumofinal:'panel-resumofinal'};\n" +
"  var btns = {extracao:'tab-extracao-btn', preincisoes:'tab-preinc-btn', fotos:'tab-fotos-btn', paciente:'tab-paciente-btn', resumofinal:'tab-resumo-btn'};\n" +
"  Object.keys(panels).forEach(function(key){\n" +
"    document.getElementById(panels[key]).style.display = (key===tab) ? '' : 'none';\n" +
"    document.getElementById(btns[key]).className = (key===tab) ? 'btn' : 'btn secondary';\n" +
"  });\n" +
"};\n" +
"App.switchQuadrant = function(quadId){ state.activeQuadrant = quadId; render(); };\n" +
"function render(){\n" +
"  var s = state.session; if (!s) return;\n" +
"  applyBranding(s.ownerBranding);\n" +
"  document.getElementById('cnt-codigo').textContent = s.codigo;\n" +
"  document.getElementById('cnt-meta').textContent = new Date(s.createdAt).toLocaleString(localeForLang());\n" +
"  var gMs = globalElapsedMs(s);\n" +
"  var gEl = document.getElementById('cnt-global-timer');\n" +
"  if (gMs===null){ gEl.textContent = t('cnt.global_not_started'); }\n" +
"  else { gEl.textContent = t('cnt.global_timer_prefix')+fmtHMS(gMs)+(s.globalTimerEndedAt ? t('cnt.global_finalized_suffix') : t('cnt.global_in_progress_suffix')); }\n" +
"  var badge = document.getElementById('cnt-status');\n" +
"  badge.textContent = s.status==='finalizada'?t('common.status_finalized'):t('common.status_in_progress');\n" +
"  badge.className = 'badge ' + (s.status==='finalizada'?'finalizada':'andamento');\n" +
"  document.getElementById('cnt-mode').textContent = (s.mode==='reduzido') ? t('cnt.mode_reduced') : t('cnt.mode_full');\n" +
"  document.getElementById('btn-finalizar').style.display = s.status==='finalizada'?'none':'inline-block';\n" +
"  document.getElementById('btn-reabrir').style.display = s.status==='finalizada'?'inline-block':'none';\n" +
"  document.getElementById('share-url').textContent = shareUrlFor(s.id);\n" +
"  var readonly = s.status==='finalizada';\n" +
"\n" +
"  var combined = combinedExtractionCounts(s);\n" +
"  var sum = computeSummary(combined, s.mode||'completo');\n" +
"  document.getElementById('geral-extraidos').textContent = sum.foliculosExtraidos;\n" +
"  document.getElementById('geral-fios').textContent = sum.totalFios;\n" +
"  document.getElementById('geral-indice').textContent = sum.indice.toFixed(2);\n" +
"  document.getElementById('geral-transec-parcial').textContent = sum.taxaParcial.toFixed(1)+'%';\n" +
"  document.getElementById('geral-transec-total').textContent = sum.taxaTotal.toFixed(1)+'%';\n" +
"  document.getElementById('geral-mini').textContent = sum.miniTotal;\n" +
"  var finalMamba = mambaFinalCumulativo(s);\n" +
"  var mdiffGeral = computeMambaDiff(finalMamba, sum.foliculosExtraidos);\n" +
"  var geralBox = document.getElementById('geral-mamba-summary');\n" +
"  if (mdiffGeral){\n" +
"    geralBox.style.display='grid';\n" +
"    document.getElementById('geral-mamba-val').textContent = mdiffGeral.mamba;\n" +
"    document.getElementById('geral-mamba-manip').textContent = mdiffGeral.base;\n" +
"    document.getElementById('geral-mamba-diff').textContent = (mdiffGeral.diff>0?'+':'')+mdiffGeral.diff;\n" +
"    document.getElementById('geral-mamba-diffpct').textContent = (mdiffGeral.diffPct>0?'+':'')+mdiffGeral.diffPct.toFixed(1)+'%';\n" +
"    var geralElapsed = elapsedMs(s.timer);\n" +
"    var geralMambaRate = mambaRatePerHour(mdiffGeral.mamba, geralElapsed>0?geralElapsed:null);\n" +
"    document.getElementById('geral-mamba-rate').textContent = geralMambaRate===null ? '—' : geralMambaRate.toFixed(0);\n" +
"  } else { geralBox.style.display='none'; }\n" +
"\n" +
"  // ---- aba Resumo Final: reaproveita combined/sum/finalMamba/mdiffGeral já\n" +
"  // calculados acima (mesmos números do Resumo geral), só acrescenta tempos,\n" +
"  // o total por categoria e a diferença pré-incisões x folículos extraídos.\n" +
"  document.getElementById('final-tempo-extracao').textContent = fmtHMS(elapsedMs(s.timer));\n" +
"  document.getElementById('final-tempo-preinc').textContent = fmtHMS(elapsedMs(s.preincTimer));\n" +
"  var gMsFinal = globalElapsedMs(s);\n" +
"  document.getElementById('final-tempo-total').textContent = gMsFinal===null ? '—' : fmtHMS(gMsFinal);\n" +
"  document.getElementById('final-extraidos').textContent = sum.foliculosExtraidos;\n" +
"  document.getElementById('final-fios').textContent = sum.totalFios;\n" +
"  document.getElementById('final-indice').textContent = sum.indice.toFixed(2);\n" +
"  document.getElementById('final-transec-parcial').textContent = sum.taxaParcial.toFixed(1)+'%';\n" +
"  document.getElementById('final-transec-total').textContent = sum.taxaTotal.toFixed(1)+'%';\n" +
"  document.getElementById('final-mini').textContent = sum.miniTotal;\n" +
"  var finalMambaBox = document.getElementById('final-mamba-summary');\n" +
"  // A aba Resumo Final compara o Mamba direto com os folículos EXTRAÍDOS — mesma\n" +
"  // base usada em todo o app (computeMambaDiff), calculada aqui separadamente\n" +
"  // só porque esta aba usa seus próprios elementos de HTML.\n" +
"  if (finalMamba!==null && finalMamba!==undefined && finalMamba!==''){\n" +
"    finalMambaBox.style.display='grid';\n" +
"    var diffExtraidos = finalMamba - sum.foliculosExtraidos;\n" +
"    var diffExtraidosPct = finalMamba>0 ? diffExtraidos/finalMamba*100 : 0;\n" +
"    document.getElementById('final-mamba-val').textContent = finalMamba;\n" +
"    document.getElementById('final-mamba-diff').textContent = (diffExtraidos>0?'+':'')+diffExtraidos;\n" +
"    document.getElementById('final-mamba-diffpct-extraidos').textContent = (diffExtraidosPct>0?'+':'')+diffExtraidosPct.toFixed(1)+'%';\n" +
"    // Ritmo de extração pelo Mamba (fol./h) — mesma conta já usada no Resumo\n" +
"    // geral da aba Extração: leitura final do Mamba dividida pelo tempo de\n" +
"    // extração corrido.\n" +
"    var finalExtElapsed = elapsedMs(s.timer);\n" +
"    var finalMambaRate = mambaRatePerHour(finalMamba, finalExtElapsed>0?finalExtElapsed:null);\n" +
"    document.getElementById('final-mamba-rate').textContent = finalMambaRate===null ? '—' : finalMambaRate.toFixed(0);\n" +
"  } else { finalMambaBox.style.display='none'; }\n" +
"  var modeParaCategorias = s.mode||'completo';\n" +
"  var catRows = [\n" +
"    {label:t('cat.f1'), val: combined.f1||0},\n" +
"    {label:t('cat.f2'), val: combined.f2||0},\n" +
"    {label:t('cat.f3'), val: combined.f3||0},\n" +
"    {label:t('cat.f4'), val: combined.f4||0},\n" +
"    {label:t('cat.f1fino'), val: combined.f1fino||0},\n" +
"    {label:t('cat.f2fino'), val: combined.f2fino||0},\n" +
"    {label:t('cat.parcial_geral'), val: modeParaCategorias==='reduzido' ? sum.parcialGeral : sum.parciais},\n" +
"    {label:t('cat.ttotal'), val: sum.totalPerdidos},\n" +
"    {label:t('cat.mini'), val: sum.miniTotal}\n" +
"  ];\n" +
"  document.getElementById('final-categorias').innerHTML = catRows.map(function(r){\n" +
"    return '<div class=\"summary-item\"><div class=\"val\">'+r.val+'</div><div class=\"lbl\">'+escapeHtml(r.label)+'</div></div>';\n" +
"  }).join('');\n" +
"  var pTotalFinal = preincTotal(s.preincCounts);\n" +
"  // Diferença entre folículos extraídos e total de pré-incisões: cada pré-incisão\n" +
"  // deveria idealmente receber um folículo — uma diferença grande sinaliza\n" +
"  // pré-incisões feitas a mais (ou a menos) em relação ao que foi de fato\n" +
"  // extraído.\n" +
"  var preincDiff = sum.foliculosExtraidos - pTotalFinal;\n" +
"  document.getElementById('final-preinc-total').textContent = pTotalFinal;\n" +
"  document.getElementById('final-preinc-diff').textContent = (preincDiff>0?'+':'')+preincDiff;\n" +
"\n" +
"  var tabsEl = document.getElementById('quadrant-tabs');\n" +
"  tabsEl.innerHTML = QUADRANTS.map(function(q){\n" +
"    var cls = (q.id===state.activeQuadrant) ? 'btn' : 'btn secondary';\n" +
"    return '<button class=\"'+cls+'\" onclick=\"App.switchQuadrant(\\''+q.id+'\\')\">'+escapeHtml(q.label)+'</button>';\n" +
"  }).join('');\n" +
"  var quad = s.quadrants[state.activeQuadrant];\n" +
"  document.getElementById('quad-title').textContent = quadrantById(state.activeQuadrant).label;\n" +
"  document.getElementById('quad-summary-title').textContent = quadrantById(state.activeQuadrant).label;\n" +
"  var qsum = computeSummary(quad.counts, s.mode||'completo');\n" +
"  document.getElementById('quad-extraidos').textContent = qsum.foliculosExtraidos;\n" +
"  document.getElementById('quad-fios').textContent = qsum.totalFios;\n" +
"  document.getElementById('quad-indice').textContent = qsum.indice.toFixed(2);\n" +
"  document.getElementById('quad-transec-parcial').textContent = qsum.taxaParcial.toFixed(1)+'%';\n" +
"  document.getElementById('quad-transec-total').textContent = qsum.taxaTotal.toFixed(1)+'%';\n" +
"  document.getElementById('quad-mini').textContent = qsum.miniTotal;\n" +
"  var quadInput = document.getElementById('quad-mamba-input');\n" +
"  if (document.activeElement !== quadInput) quadInput.value = (quad.mambaCumulativo===null||quad.mambaCumulativo===undefined) ? '' : quad.mambaCumulativo;\n" +
"  var quadBox = document.getElementById('quad-mamba-summary');\n" +
"  if (quad.mambaCumulativo===null||quad.mambaCumulativo===undefined||quad.mambaCumulativo===''){\n" +
"    quadBox.style.display='none';\n" +
"  } else {\n" +
"    var prev = mambaPrevCumulativo(s, state.activeQuadrant);\n" +
"    var delta = Number(quad.mambaCumulativo) - prev;\n" +
"    var qmdiff = computeMambaDiff(delta, qsum.foliculosExtraidos);\n" +
"    if (qmdiff){\n" +
"      quadBox.style.display='grid';\n" +
"      document.getElementById('quad-mamba-val').textContent = qmdiff.mamba;\n" +
"      document.getElementById('quad-mamba-manip').textContent = qmdiff.base;\n" +
"      document.getElementById('quad-mamba-diff').textContent = (qmdiff.diff>0?'+':'')+qmdiff.diff;\n" +
"      document.getElementById('quad-mamba-diffpct').textContent = (qmdiff.diffPct>0?'+':'')+qmdiff.diffPct.toFixed(1)+'%';\n" +
"      var quadDur = quadrantDurationMs(s, state.activeQuadrant);\n" +
"      var quadMambaRate = mambaRatePerHour(delta, quadDur);\n" +
"      document.getElementById('quad-mamba-duracao').textContent = quadDur===null ? '—' : fmtHMS(quadDur);\n" +
"      document.getElementById('quad-mamba-rate').textContent = quadMambaRate===null ? '—' : quadMambaRate.toFixed(0);\n" +
"    } else { quadBox.style.display='none'; }\n" +
"  }\n" +
"\n" +
"  var modeAtiva = s.mode||'completo';\n" +
"  var parcialGroupReal = modeAtiva==='reduzido' ? 'parcial_reduzida' : 'parcial';\n" +
"  document.getElementById('parcial-reduzido-hint').style.display = modeAtiva==='reduzido' ? 'block' : 'none';\n" +
"  var quadLocked = !!quad.locked;\n" +
"  var quadReadonly = readonly || quadLocked;\n" +
"  ['integro','parcial','total','mini'].forEach(function(group){\n" +
"    var container = document.getElementById('group-'+group);\n" +
"    var filterGroup = group==='parcial' ? parcialGroupReal : group;\n" +
"    container.innerHTML = CATS.filter(function(c){return c.group===filterGroup;}).map(function(c){\n" +
"      var n = chainCumulativeCat(s, state.activeQuadrant, c.id);\n" +
"      var hairsNote = c.group==='mini' ? t('cnt.hairs_not_in_total') : (c.hairs>0 ? (c.hairs+' '+(c.hairs===1?t('cnt.hair_singular'):t('cnt.hair_plural'))+t('cnt.per_follicle_suffix')) : (c.group==='parcial_reduzida' ? t('cnt.hairs_informative_only') : t('cnt.hairs_lost')));\n" +
"      var btns = quadReadonly ? '' : incBtns(c.id);\n" +
"      var countCls = quadReadonly ? 'cat-count' : 'cat-count clickable';\n" +
"      var countClick = quadReadonly ? '' : ' onclick=\"App.editCount(\\''+c.id+'\\')\"';\n" +
"      return '<div class=\"cat-row group-'+group+'\"><div class=\"cat-label\">'+escapeHtml(c.label)+'<span class=\"cat-hairs\">'+hairsNote+'</span></div>'+\n" +
"        '<div class=\"'+countCls+'\"'+countClick+'>'+n+'</div><div class=\"cat-btns\">'+btns+'</div></div>';\n" +
"    }).join('');\n" +
"  });\n" +
"\n" +
"  var chainHintEl = document.getElementById('quad-chain-hint');\n" +
"  if (quad.carryFromId && s.quadrants[quad.carryFromId]) {\n" +
"    var carryTotal = chainPredecessorTotalAllCats(s, state.activeQuadrant);\n" +
"    chainHintEl.textContent = t('cnt.chain_hint_from', {label: quadrantById(quad.carryFromId).label, total: carryTotal});\n" +
"  } else {\n" +
"    chainHintEl.textContent = t('cnt.chain_hint_none');\n" +
"  }\n" +
"  var carrySelect = document.getElementById('quad-carry-select');\n" +
"  var candidateQuads = QUADRANTS.filter(function(q){\n" +
"    return q.id!==state.activeQuadrant && !wouldCreateCarryCycleClient(s, state.activeQuadrant, q.id);\n" +
"  });\n" +
"  carrySelect.innerHTML = '<option value=\"\">'+escapeHtml(t('cnt.carry_from_none_option'))+'</option>' +\n" +
"    candidateQuads.map(function(q){ return '<option value=\"'+q.id+'\">'+escapeHtml(q.label)+'</option>'; }).join('');\n" +
"  carrySelect.value = quad.carryFromId || '';\n" +
"  carrySelect.disabled = quadLocked;\n" +
"  document.getElementById('quad-finish-btn').style.display = quadLocked ? 'none' : 'inline-block';\n" +
"  document.getElementById('quad-reopen-btn').style.display = quadLocked ? 'inline-block' : 'none';\n" +
"  document.getElementById('quad-finish-btn').disabled = readonly;\n" +
"  document.getElementById('quad-reopen-btn').disabled = readonly;\n" +
"\n" +
"  var extMs = elapsedMs(s.timer);\n" +
"  document.getElementById('timer-display').textContent = fmtHMS(extMs);\n" +
"  document.getElementById('timer-toggle-btn').textContent = s.timer.running ? t('common.pause') : t('common.start');\n" +
"  document.getElementById('timer-toggle-btn').disabled = readonly;\n" +
"  document.getElementById('timer-reset-btn').disabled = readonly;\n" +
"  var rateEl = document.getElementById('timer-rate');\n" +
"  if (extMs>0 && sum.foliculosExtraidos>0){ rateEl.textContent = t('cnt.rate_hint',{rate:(sum.foliculosExtraidos/(extMs/3600000)).toFixed(0)}); } else { rateEl.textContent=''; }\n" +
"\n" +
"  var tp = elapsedMs(s.preincTimer);\n" +
"  document.getElementById('preinc-timer-display').textContent = fmtHMS(tp);\n" +
"  document.getElementById('preinc-timer-toggle-btn').textContent = s.preincTimer.running ? t('common.pause') : t('common.start');\n" +
"  document.getElementById('preinc-timer-toggle-btn').disabled = readonly;\n" +
"  document.getElementById('preinc-timer-reset-btn').disabled = readonly;\n" +
"  var pTotal = preincTotal(s.preincCounts);\n" +
"  var prateEl = document.getElementById('preinc-timer-rate');\n" +
"  if (tp>0 && pTotal>0){ prateEl.textContent = t('preinc.rate_hint',{rate:(pTotal/(tp/3600000)).toFixed(0)}); } else { prateEl.textContent=''; }\n" +
"  document.getElementById('preinc-total').textContent = pTotal;\n" +
"\n" +
"  checkAudioMilestone(sum.foliculosExtraidos);\n" +
"  checkPreincAudioOnChange(pTotal);\n" +
"  checkTransectionAlerts(sum.taxaParcial, sum.taxaTotal);\n" +
"  renderPreinc(s);\n" +
"  renderPhotos(s);\n" +
"  renderPatientInfo(s);\n" +
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
"  api('/api/session/'+state.currentId+'/adjust','POST',{quadrant:quad, category:catId, delta:delta}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.sync_failed',{msg:err.message})); fetchAndRender(); });\n" +
"};\n" +
"App.editCount = function(catId){\n" +
"  var s = state.session; if (!s || s.status==='finalizada') return;\n" +
"  var quad = state.activeQuadrant;\n" +
"  var qd = s.quadrants[quad];\n" +
"  if (qd.locked) return;\n" +
"  var current = qd.counts[catId]||0;\n" +
"  var predecessorTotal = qd.carryFromId ? chainCumulativeCat(s, qd.carryFromId, catId) : 0;\n" +
"  var currentChain = predecessorTotal + current;\n" +
"  var cat = CATS.filter(function(c){ return c.id===catId; })[0];\n" +
"  var input = window.prompt(t('prompt.set_value_for',{label:(cat?cat.label:catId)}), currentChain);\n" +
"  if (input===null) return;\n" +
"  var v = parseInt(input,10);\n" +
"  if (isNaN(v) || v<0){ toast(t('errors.invalid_value')); return; }\n" +
"  if (v < predecessorTotal){ toast(t('errors.value_below_carry',{carry:predecessorTotal})); return; }\n" +
"  var newLocal = v - predecessorTotal;\n" +
"  var delta = newLocal - current;\n" +
"  if (delta===0) return;\n" +
"  App.adjust(catId, delta);\n" +
"};\n" +
"App.finishQuadrant = function(){\n" +
"  var s = state.session; if (!s || s.status==='finalizada') return;\n" +
"  var quad = state.activeQuadrant;\n" +
"  if (s.quadrants[quad].locked) return;\n" +
"  if (!window.confirm(t('confirm.finish_quadrant'))) return;\n" +
"  api('/api/session/'+state.currentId+'/quadrant-finish','POST',{quadrant:quad}).then(function(updated){\n" +
"    state.session=updated;\n" +
"    var idx = -1;\n" +
"    for (var i=0;i<QUADRANTS.length;i++){ if (QUADRANTS[i].id===quad){ idx=i; break; } }\n" +
"    var nextQuad = (idx!==-1 && idx+1<QUADRANTS.length) ? QUADRANTS[idx+1] : null;\n" +
"    if (nextQuad) { state.activeQuadrant = nextQuad.id; }\n" +
"    render();\n" +
"    toast(t('toast.quadrant_finished'));\n" +
"  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.reopenQuadrant = function(){\n" +
"  var s = state.session; if (!s || s.status==='finalizada') return;\n" +
"  var quad = state.activeQuadrant;\n" +
"  if (!window.confirm(t('confirm.reopen_quadrant'))) return;\n" +
"  api('/api/session/'+state.currentId+'/quadrant-reopen','POST',{quadrant:quad}).then(function(updated){ state.session=updated; render(); toast(t('toast.quadrant_reopened')); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.setQuadrantCarryFrom = function(carryFromId){\n" +
"  var s = state.session; if (!s || s.status==='finalizada') return;\n" +
"  var quad = state.activeQuadrant;\n" +
"  api('/api/session/'+state.currentId+'/quadrant-link','POST',{quadrant:quad, carryFromId: carryFromId||null}).then(function(updated){ state.session=updated; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); fetchAndRender(); });\n" +
"};\n" +
"App.setQuadMamba = function(value){\n" +
"  var quad = state.activeQuadrant;\n" +
"  var v = value===''? null : Number(value);\n" +
"  api('/api/session/'+state.currentId+'/mamba','POST',{quadrant:quad, value:v}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"function renderPreinc(s){\n" +
"  var readonly = s.status==='finalizada';\n" +
"  var container = document.getElementById('group-preincisoes');\n" +
"  var dist = s.preincDist || {};\n" +
"  container.innerHTML = PREINC_AREAS.map(function(a){\n" +
"    var n = s.preincCounts[a.id]||0;\n" +
"    var cls = readonly ? 'cat-count' : 'cat-count clickable';\n" +
"    var click = readonly ? '' : ' onclick=\"App.editPreinc(\\''+a.id+'\\')\"';\n" +
"    var row = dist[a.id] || {};\n" +
"    var subCells = DIST_FIOS.map(function(f){\n" +
"      var dn = row[f.id]||0;\n" +
"      var dcls = readonly ? 'dist-cell' : 'dist-cell clickable';\n" +
"      var dclick = readonly ? '' : ' onclick=\"App.editPreincDist(\\''+a.id+'\\',\\''+f.id+'\\')\"';\n" +
"      return '<div class=\"dist-sub\"><span class=\"dist-sub-lbl\">'+escapeHtml(f.label)+'</span><span class=\"'+dcls+'\"'+dclick+'>'+dn+'</span></div>';\n" +
"    }).join('');\n" +
"    return '<div class=\"preinc-item\"><div class=\"cat-label\">'+escapeHtml(a.label)+'</div>'+\n" +
"      '<div class=\"'+cls+'\"'+click+'>'+n+'</div>'+\n" +
"      '<div class=\"dist-subrow\">'+subCells+'</div></div>';\n" +
"  }).join('');\n" +
"  renderPreincDistTotals(s);\n" +
"}\n" +
"App.editPreinc = function(areaId){\n" +
"  var s = state.session; if (!s || s.status==='finalizada') return;\n" +
"  var area = PREINC_AREAS.filter(function(a){ return a.id===areaId; })[0];\n" +
"  var current = s.preincCounts[areaId]||0;\n" +
"  var input = window.prompt(t('prompt.set_value_for',{label:(area?area.label:areaId)}), current);\n" +
"  if (input===null) return;\n" +
"  var v = parseInt(input,10);\n" +
"  if (isNaN(v) || v<0){ toast(t('errors.invalid_value')); return; }\n" +
"  api('/api/session/'+state.currentId+'/preinc','POST',{area:areaId, value:v}).then(function(s2){ state.session=s2; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"function renderPreincDistTotals(s){\n" +
"  var dist = s.preincDist || {};\n" +
"  var totalsByFio = {}; DIST_FIOS.forEach(function(f){ totalsByFio[f.id]=0; });\n" +
"  var grandTotal = 0;\n" +
"  PREINC_AREAS.forEach(function(a){\n" +
"    var row = dist[a.id] || {};\n" +
"    DIST_FIOS.forEach(function(f){ var n=row[f.id]||0; totalsByFio[f.id]+=n; grandTotal+=n; });\n" +
"  });\n" +
"  var items = DIST_FIOS.map(function(f){\n" +
"    return '<div class=\"summary-item\"><div class=\"val\">'+totalsByFio[f.id]+'</div><div class=\"lbl\">Total '+escapeHtml(f.label)+'</div></div>';\n" +
"  }).join('');\n" +
"  items += '<div class=\"summary-item\"><div class=\"val\">'+grandTotal+'</div><div class=\"lbl\">Total geral (UFs)</div></div>';\n" +
"  document.getElementById('preinc-dist-totals').innerHTML = items;\n" +
"}\n" +
"App.editPreincDist = function(areaId, fioId){\n" +
"  var s = state.session; if (!s || s.status==='finalizada') return;\n" +
"  var area = PREINC_AREAS.filter(function(a){ return a.id===areaId; })[0];\n" +
"  var fio = DIST_FIOS.filter(function(f){ return f.id===fioId; })[0];\n" +
"  var current = (s.preincDist && s.preincDist[areaId]) ? (s.preincDist[areaId][fioId]||0) : 0;\n" +
"  var label = (area?area.label:areaId)+' — '+(fio?fio.label:fioId);\n" +
"  var input = window.prompt(t('prompt.set_quantity_for',{label:label}), current);\n" +
"  if (input===null) return;\n" +
"  var v = parseInt(input,10);\n" +
"  if (isNaN(v) || v<0){ toast(t('errors.invalid_value')); return; }\n" +
"  api('/api/session/'+state.currentId+'/preinc-dist','POST',{area:areaId, fio:fioId, value:v}).then(function(s2){ state.session=s2; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
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
"function renderPatientInfo(s){\n" +
"  var pi = s.patientInfo || {};\n" +
"  var idadeEl = document.getElementById('patient-idade');\n" +
"  if (document.activeElement !== idadeEl) idadeEl.value = (pi.idade===null||pi.idade===undefined) ? '' : pi.idade;\n" +
"  var alturaEl = document.getElementById('patient-altura');\n" +
"  if (document.activeElement !== alturaEl) alturaEl.value = (pi.alturaCm===null||pi.alturaCm===undefined) ? '' : pi.alturaCm;\n" +
"  var pesoEl = document.getElementById('patient-peso');\n" +
"  if (document.activeElement !== pesoEl) pesoEl.value = (pi.pesoKg===null||pi.pesoKg===undefined) ? '' : pi.pesoKg;\n" +
"  var patientChoicePairs = [\n" +
"    ['patient-espessura-fino','cabeloEspessura','fino'], ['patient-espessura-grosso','cabeloEspessura','grosso'],\n" +
"    ['patient-textura-liso','cabeloTextura','liso'], ['patient-textura-ondulado','cabeloTextura','ondulado'], ['patient-textura-crespo','cabeloTextura','crespo'],\n" +
"    ['patient-raspagem-sim','raspagem','sim'], ['patient-raspagem-nao','raspagem','nao']\n" +
"  ];\n" +
"  patientChoicePairs.forEach(function(pair){\n" +
"    var el = document.getElementById(pair[0]);\n" +
"    if (el) el.className = 'btn' + (pi[pair[1]]===pair[2] ? '' : ' secondary');\n" +
"  });\n" +
"}\n" +
"App.setPatientField = function(field, value){\n" +
"  var payload = {}; payload[field] = value;\n" +
"  api('/api/session/'+state.currentId+'/patient-info','POST',payload).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.refreshNewPatientButtons = function(){\n" +
"  var p = state.newPatientInfo || {};\n" +
"  var pairs = [\n" +
"    ['new-patient-espessura-fino','cabeloEspessura','fino'], ['new-patient-espessura-grosso','cabeloEspessura','grosso'],\n" +
"    ['new-patient-textura-liso','cabeloTextura','liso'], ['new-patient-textura-ondulado','cabeloTextura','ondulado'], ['new-patient-textura-crespo','cabeloTextura','crespo'],\n" +
"    ['new-patient-raspagem-sim','raspagem','sim'], ['new-patient-raspagem-nao','raspagem','nao']\n" +
"  ];\n" +
"  pairs.forEach(function(pair){\n" +
"    var el = document.getElementById(pair[0]);\n" +
"    if (el) el.className = 'btn' + (p[pair[1]]===pair[2] ? '' : ' secondary');\n" +
"  });\n" +
"};\n" +
"App.setNewPatientField = function(field, value){\n" +
"  state.newPatientInfo[field] = value;\n" +
"  App.refreshNewPatientButtons();\n" +
"};\n" +
"App.uploadPhotos = function(category, inputEl){\n" +
"  var files = Array.prototype.slice.call((inputEl && inputEl.files) || []);\n" +
"  if (!files.length) return;\n" +
"  toast(t('toast.uploading_photos',{n:files.length}));\n" +
"  var chain = Promise.resolve();\n" +
"  files.forEach(function(file){\n" +
"    chain = chain.then(function(){ return resizeImageFile(file, 1600, 0.82); })\n" +
"      .then(function(dataUrl){ return api('/api/session/'+state.currentId+'/photos','POST',{category:category, dataUrl:dataUrl}); })\n" +
"      .then(function(s){ state.session=s; render(); });\n" +
"  });\n" +
"  chain.then(function(){ inputEl.value=''; toast(t('toast.photos_uploaded')); })\n" +
"    .catch(function(err){ toast(t('toast.photo_upload_error',{msg:err.message})); });\n" +
"};\n" +
"App.removePhoto = function(photoId){\n" +
"  if (!window.confirm(t('confirm.delete_photo'))) return;\n" +
"  api('/api/session/'+state.currentId+'/photos/'+photoId+'/delete','POST',{}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
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
"    reader.onerror = function(){ reject(new Error(t('errors.file_read_error'))); };\n" +
"    reader.readAsDataURL(file);\n" +
"  });\n" +
"}\n" +
"function resizeLogoFile(file, maxDim){\n" +
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
"        resolve(canvas.toDataURL('image/png'));\n" +
"      };\n" +
"      img.onerror = function(){ reject(new Error('Não consegui ler essa imagem.')); };\n" +
"      img.src = e.target.result;\n" +
"    };\n" +
"    reader.onerror = function(){ reject(new Error(t('errors.file_read_error'))); };\n" +
"    reader.readAsDataURL(file);\n" +
"  });\n" +
"}\n" +
"App.uploadLogo = function(inputEl){\n" +
"  var file = inputEl.files && inputEl.files[0];\n" +
"  if (!file) return;\n" +
"  resizeLogoFile(file, 480).then(function(dataUrl){\n" +
"    return api('/api/me/logo','POST',{dataUrl:dataUrl});\n" +
"  }).then(function(r){\n" +
"    state.currentUser = r.user; applyBranding(r.user.branding); renderSettingsScreen();\n" +
"    inputEl.value=''; toast(t('toast.logo_updated'));\n" +
"  }).catch(function(err){ toast(t('toast.logo_upload_error',{msg:err.message})); });\n" +
"};\n" +
"App.removeLogo = function(){\n" +
"  if (!window.confirm(t('confirm.delete_logo'))) return;\n" +
"  api('/api/me/logo/delete','POST',{}).then(function(r){\n" +
"    state.currentUser = r.user; applyBranding(r.user.branding); renderSettingsScreen();\n" +
"    toast(t('toast.logo_removed'));\n" +
"  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.setTheme = function(theme){\n" +
"  api('/api/me/branding','POST',{theme:theme}).then(function(r){\n" +
"    state.currentUser = r.user; applyBranding(r.user.branding); renderSettingsScreen();\n" +
"  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.toggleDarkMode = function(checked){\n" +
"  api('/api/me/branding','POST',{darkMode:checked}).then(function(r){\n" +
"    state.currentUser = r.user; applyBranding(r.user.branding);\n" +
"  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.toggleTimer = function(){\n" +
"  if (!state.currentId || !state.session) return;\n" +
"  var action = state.session.timer.running ? 'pause' : 'start';\n" +
"  api('/api/session/'+state.currentId+'/timer','POST',{action:action}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.resetTimer = function(){ if (!window.confirm(t('confirm.reset_extraction_timer'))) return; api('/api/session/'+state.currentId+'/timer','POST',{action:'reset'}).then(function(s){ state.session=s; render(); }); };\n" +
"App.togglePreincTimer = function(){\n" +
"  if (!state.currentId || !state.session) return;\n" +
"  var action = state.session.preincTimer.running ? 'pause' : 'start';\n" +
"  api('/api/session/'+state.currentId+'/preinc-timer','POST',{action:action}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });\n" +
"};\n" +
"App.resetPreincTimer = function(){ if (!window.confirm(t('confirm.reset_preinc_timer'))) return; api('/api/session/'+state.currentId+'/preinc-timer','POST',{action:'reset'}).then(function(s){ state.session=s; render(); }); };\n" +
"App.finalizeSession = function(){ if (!window.confirm(t('confirm.finalize_surgery'))) return; api('/api/session/'+state.currentId+'/finalize','POST',{}).then(function(s){ state.session=s; render(); App.switchTab('resumofinal'); toast(t('toast.surgery_finalized')); }); };\n" +
"App.reopenSession = function(){ api('/api/session/'+state.currentId+'/reopen','POST',{}).then(function(s){ state.session=s; render(); toast(t('toast.surgery_reopened')); }); };\n" +
"App.openShareModal = function(){\n" +
"  document.getElementById('share-url').textContent = shareUrlFor(state.currentId);\n" +
"  document.getElementById('share-modal-overlay').classList.add('show');\n" +
"};\n" +
"App.closeShareModal = function(){\n" +
"  document.getElementById('share-modal-overlay').classList.remove('show');\n" +
"};\n" +
"App.copyShareUrl = function(){\n" +
"  var url = shareUrlFor(state.currentId);\n" +
"  if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(function(){ toast(t('toast.address_copied')); }, function(){ toast(t('toast.copy_failed_manual')); }); }\n" +
"  else { toast(t('toast.copy_manually',{url:url}), 4000); }\n" +
"};\n" +
"App.shareViaSystem = function(){\n" +
"  var url = shareUrlFor(state.currentId);\n" +
"  var codigo = state.session ? state.session.codigo : '';\n" +
"  if (navigator.share){\n" +
"    navigator.share({title:'Graftis — '+codigo, text:'Entrar na contagem da cirurgia '+codigo+':', url:url}).catch(function(){});\n" +
"  } else {\n" +
"    toast(t('toast.no_native_share'), 3000);\n" +
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
"  var sum = computeSummary(combined, s.mode||'completo');\n" +
"  var msPrint = elapsedMs(s.timer);\n" +
"  var msGlobalPrint = globalElapsedMs(s);\n" +
"  var ritmoPrint = (msPrint>0 && sum.foliculosExtraidos>0) ? (sum.foliculosExtraidos/(msPrint/3600000)) : null;\n" +
"  var finalMamba = mambaFinalCumulativo(s);\n" +
"  var mdiffGeral = computeMambaDiff(finalMamba, sum.foliculosExtraidos);\n" +
"\n" +
"  var pi = s.patientInfo || {};\n" +
"  var piParts = [];\n" +
"  if (pi.idade!==null && pi.idade!==undefined) piParts.push('<div>'+escapeHtml(t('patient.age_label'))+'<br><b>'+pi.idade+'</b></div>');\n" +
"  if (pi.alturaCm!==null && pi.alturaCm!==undefined) piParts.push('<div>'+escapeHtml(t('patient.height_label'))+'<br><b>'+pi.alturaCm+'</b></div>');\n" +
"  if (pi.pesoKg!==null && pi.pesoKg!==undefined) piParts.push('<div>'+escapeHtml(t('patient.weight_label'))+'<br><b>'+pi.pesoKg+'</b></div>');\n" +
"  if (pi.cabeloEspessura) piParts.push('<div>'+escapeHtml(t('patient.hair_thickness_label'))+'<br><b>'+escapeHtml(t(pi.cabeloEspessura==='fino'?'patient.hair_thin':'patient.hair_thick'))+'</b></div>');\n" +
"  if (pi.cabeloTextura) {\n" +
"    var texturaKey = pi.cabeloTextura==='liso' ? 'patient.hair_straight' : (pi.cabeloTextura==='ondulado' ? 'patient.hair_wavy' : 'patient.hair_curly');\n" +
"    piParts.push('<div>'+escapeHtml(t('patient.hair_texture_label'))+'<br><b>'+escapeHtml(t(texturaKey))+'</b></div>');\n" +
"  }\n" +
"  if (pi.raspagem) piParts.push('<div>'+escapeHtml(t('patient.surgery_type_label'))+'<br><b>'+escapeHtml(t(pi.raspagem==='sim'?'patient.with_shaving':'patient.without_shaving'))+'</b></div>');\n" +
"  var patientInfoHtml = piParts.length ? ('<h2>'+escapeHtml(t('patient.section_title'))+'</h2><div class=\"print-summary\">'+piParts.join('')+'</div>') : '';\n" +
"\n" +
"  var quadrantsHtml = QUADRANTS.map(function(q){\n" +
"    var qc = s.quadrants[q.id].counts;\n" +
"    var qsum = computeSummary(qc, s.mode||'completo');\n" +
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
"      var qmdiff = computeMambaDiff(delta, qsum.foliculosExtraidos);\n" +
"      var qDur = quadrantDurationMs(s, q.id);\n" +
"      var qRate = mambaRatePerHour(delta, qDur);\n" +
"      mcHtml = '<div class=\"print-summary\">' +\n" +
"        '<div>'+escapeHtml(t('print.mamba_accumulated_label'))+'<br><b>'+mc+'</b></div>' +\n" +
"        '<div>'+escapeHtml(t('cnt.mamba_quad_val'))+'<br><b>'+delta+'</b></div>' +\n" +
"        (qmdiff ? '<div>'+escapeHtml(t('cnt.mamba_diff'))+'<br><b>'+(qmdiff.diff>0?'+':'')+qmdiff.diff+' ('+(qmdiff.diffPct>0?'+':'')+qmdiff.diffPct.toFixed(1)+'%)</b></div>' : '') +\n" +
"        (qDur ? '<div>'+escapeHtml(t('cnt.mamba_quad_duration'))+'<br><b>'+fmtHMS(qDur)+'</b></div>' : '') +\n" +
"        (qRate!==null ? '<div>'+escapeHtml(t('print.mamba_rate_label'))+'<br><b>'+qRate.toFixed(0)+t('print.fol_per_hour_suffix')+'</b></div>' : '') +\n" +
"      '</div>';\n" +
"    }\n" +
"    return '' +\n" +
"      '<h2>'+escapeHtml(t('print.extraction_prefix'))+escapeHtml(q.label)+'</h2>' +\n" +
"      '<div class=\"print-summary\">' +\n" +
"        '<div>'+escapeHtml(t('cnt.summary_extracted'))+'<br><b>'+qsum.foliculosExtraidos+'</b></div>' +\n" +
"        '<div>'+escapeHtml(t('cnt.summary_total_hairs'))+'<br><b>'+qsum.totalFios+'</b></div>' +\n" +
"        '<div>'+escapeHtml(t('print.index_label'))+'<br><b>'+qsum.indice.toFixed(2)+'</b></div>' +\n" +
"        '<div>'+escapeHtml(t('cnt.summary_partial_transec'))+'<br><b>'+qsum.taxaParcial.toFixed(1)+'%</b></div>' +\n" +
"        '<div>'+escapeHtml(t('cnt.summary_total_transec'))+'<br><b>'+qsum.taxaTotal.toFixed(1)+'%</b></div>' +\n" +
"        '<div>'+escapeHtml(t('cnt.summary_mini'))+'<br><b>'+qsum.miniTotal+'</b></div>' +\n" +
"      '</div>' +\n" +
"      mcHtml +\n" +
"      '<table><tr><th>'+escapeHtml(t('dash.table_category'))+'</th><th>'+escapeHtml(t('print.table_hairs_per_follicle'))+'</th><th>'+escapeHtml(t('print.table_qty'))+'</th><th>'+escapeHtml(t('print.table_total_hairs'))+'</th></tr>'+rows('integro')+rows((s.mode==='reduzido')?'parcial_reduzida':'parcial')+rows('total')+rows('mini')+'</table>';\n" +
"  }).join('');\n" +
"\n" +
"  var pTotal = preincTotal(s.preincCounts);\n" +
"  var msPreinc = elapsedMs(s.preincTimer);\n" +
"  var ritmoPreinc = (msPreinc>0 && pTotal>0) ? (pTotal/(msPreinc/3600000)) : null;\n" +
"  var preincRows = PREINC_AREAS.map(function(a){\n" +
"    return '<tr><td>'+escapeHtml(a.label)+'</td><td>'+(s.preincCounts[a.id]||0)+'</td></tr>';\n" +
"  }).join('');\n" +
"  var preincHtml = '<h2>'+escapeHtml(t('cnt.tab_preinc'))+'</h2>' +\n" +
"    '<div class=\"print-summary\">' +\n" +
"      '<div>'+escapeHtml(t('preinc.total_label'))+'<br><b>'+pTotal+'</b></div>' +\n" +
"      '<div>'+escapeHtml(t('preinc.time_title'))+'<br><b>'+fmtHMS(msPreinc)+'</b></div>' +\n" +
"      (ritmoPreinc ? '<div>'+escapeHtml(t('print.rate_avg_label'))+'<br><b>'+ritmoPreinc.toFixed(0)+t('print.preinc_per_hour_suffix')+'</b></div>' : '') +\n" +
"    '</div>' +\n" +
"    '<table><tr><th>'+escapeHtml(t('print.table_area'))+'</th><th>'+escapeHtml(t('print.table_preincisions'))+'</th></tr>'+preincRows+'</table>';\n" +
"\n" +
"  var distDataP = s.preincDist || {};\n" +
"  var distTotalsP = {}; DIST_FIOS.forEach(function(f){ distTotalsP[f.id]=0; });\n" +
"  var distGrandTotalP = 0;\n" +
"  var distRowsP = PREINC_AREAS.map(function(a){\n" +
"    var row = distDataP[a.id] || {};\n" +
"    var rowTotal = 0;\n" +
"    var cells = DIST_FIOS.map(function(f){ var n=row[f.id]||0; rowTotal+=n; distTotalsP[f.id]+=n; return '<td>'+n+'</td>'; }).join('');\n" +
"    distGrandTotalP += rowTotal;\n" +
"    return '<tr><td>'+escapeHtml(a.label)+'</td>'+cells+'<td>'+rowTotal+'</td></tr>';\n" +
"  }).join('');\n" +
"  var distHeaderP = '<tr><th>'+escapeHtml(t('print.table_area'))+'</th>'+DIST_FIOS.map(function(f){ return '<th>'+escapeHtml(f.label)+'</th>'; }).join('')+'<th>'+escapeHtml(t('print.table_total'))+'</th></tr>';\n" +
"  var distFooterP = '<tr><td>'+escapeHtml(t('print.table_grand_total'))+'</td>'+DIST_FIOS.map(function(f){ return '<td>'+distTotalsP[f.id]+'</td>'; }).join('')+'<td>'+distGrandTotalP+'</td></tr>';\n" +
"  var distHtml = '<h2>'+escapeHtml(t('print.dist_title'))+'</h2><table>'+distHeaderP+distRowsP+distFooterP+'</table>';\n" +
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
"  var logoHtml = (s.ownerBranding && s.ownerBranding.logoFilename && s.ownerBranding.ownerId) ?\n" +
"    '<img src=\"/api/user/'+s.ownerBranding.ownerId+'/logo\" style=\"max-height:60px;max-width:220px;object-fit:contain;display:block;margin-bottom:6px;\">' : '';\n" +
"  var html = '' +\n" +
"    logoHtml +\n" +
"    '<h1>'+escapeHtml(t('print.title'))+'</h1>' +\n" +
"    '<div>'+escapeHtml(t('print.patient_label'))+': <b>'+escapeHtml(s.codigo)+'</b> &nbsp;|&nbsp; '+escapeHtml(t('print.status_label'))+': <b>'+(s.status==='finalizada'?t('common.status_finalized'):t('common.status_in_progress'))+'</b> &nbsp;|&nbsp; '+escapeHtml(t('print.mode_label'))+': <b>'+((s.mode==='reduzido')?t('common.mode_reduced'):t('common.mode_complete'))+'</b></div>' +\n" +
"    patientInfoHtml +\n" +
"    '<h2>'+escapeHtml(t('cnt.summary_general_title'))+'</h2>' +\n" +
"    '<div class=\"print-summary\">' +\n" +
"      '<div>'+escapeHtml(t('cnt.summary_extracted'))+'<br><b>'+sum.foliculosExtraidos+'</b></div>' +\n" +
"      '<div>'+escapeHtml(t('cnt.summary_total_hairs'))+'<br><b>'+sum.totalFios+'</b></div>' +\n" +
"      '<div>'+escapeHtml(t('print.index_label'))+'<br><b>'+sum.indice.toFixed(2)+'</b></div>' +\n" +
"      '<div>'+escapeHtml(t('cnt.summary_partial_transec'))+'<br><b>'+sum.taxaParcial.toFixed(1)+'%</b></div>' +\n" +
"      '<div>'+escapeHtml(t('cnt.summary_total_transec'))+'<br><b>'+sum.taxaTotal.toFixed(1)+'%</b></div>' +\n" +
"      '<div>'+escapeHtml(t('cnt.summary_mini'))+'<br><b>'+sum.miniTotal+'</b></div>' +\n" +
"      '<div>'+escapeHtml(t('cnt.extraction_time_title'))+'<br><b>'+fmtHMS(msPrint)+'</b></div>' +\n" +
"      (ritmoPrint ? '<div>'+escapeHtml(t('print.rate_avg_label'))+'<br><b>'+ritmoPrint.toFixed(0)+t('print.fol_per_hour_suffix')+'</b></div>' : '') +\n" +
"      (msGlobalPrint!==null ? '<div>'+escapeHtml(t('print.total_surgery_time_label'))+'<br><b>'+fmtHMS(msGlobalPrint)+'</b></div>' : '') +\n" +
"    '</div>' +\n" +
"    (mdiffGeral ? '<div class=\"print-summary\"><div>'+escapeHtml(t('cnt.mamba_reading'))+'<br><b>'+mdiffGeral.mamba+'</b></div><div>'+escapeHtml(t('cnt.summary_extracted'))+'<br><b>'+mdiffGeral.base+'</b></div><div>'+escapeHtml(t('cnt.mamba_diff'))+'<br><b>'+(mdiffGeral.diff>0?'+':'')+mdiffGeral.diff+' ('+(mdiffGeral.diffPct>0?'+':'')+mdiffGeral.diffPct.toFixed(1)+'%)</b></div>'+(mambaRatePerHour(mdiffGeral.mamba, msPrint>0?msPrint:null)!==null ? '<div>'+escapeHtml(t('print.mamba_rate_label'))+'<br><b>'+mambaRatePerHour(mdiffGeral.mamba, msPrint).toFixed(0)+t('print.fol_per_hour_suffix')+'</b></div>' : '')+'</div>' : '') +\n" +
"    quadrantsHtml +\n" +
"    preincHtml +\n" +
"    distHtml +\n" +
"    (hasPhotos ? '<div class=\"photo-report-page\">'+photoBlock('marcacao',escapeHtml(t('print.photos_prefix'))+escapeHtml(t('photos.marcacao_title')))+photoBlock('posop',escapeHtml(t('print.photos_prefix'))+escapeHtml(t('photos.posop_title')))+'</div>' : '') +\n" +
"    '<p style=\"margin-top:16px;font-size:11px;color:#666;\">'+escapeHtml(t('print.generated_at'))+new Date().toLocaleString(localeForLang())+'</p>';\n" +
"  document.getElementById('print-report').innerHTML = html;\n" +
"  window.print();\n" +
"};\n" +
"function audioKey(id){ return 'fue_live_audio_'+id; }\n" +
"function loadAudioPrefs(id){\n" +
"  try{ var raw = localStorage.getItem(audioKey(id));\n" +
"    var p = raw ? JSON.parse(raw) : {enabled:false, interval:100, lastAnnounced:0, preincEnabled:false, preincLastTotal:null, alertParcialEnabled:false, alertParcialThreshold:null, alertTotalEnabled:false, alertTotalThreshold:null};\n" +
"    state.audioEnabled = !!p.enabled; state.audioInterval = p.interval||100; state.lastAnnounced = p.lastAnnounced||0;\n" +
"    state.preincAudioEnabled = !!p.preincEnabled; state.preincLastTotal = (p.preincLastTotal===undefined?null:p.preincLastTotal);\n" +
"    state.alertParcialEnabled = !!p.alertParcialEnabled; state.alertParcialThreshold = (p.alertParcialThreshold===undefined?null:p.alertParcialThreshold);\n" +
"    state.alertTotalEnabled = !!p.alertTotalEnabled; state.alertTotalThreshold = (p.alertTotalThreshold===undefined?null:p.alertTotalThreshold);\n" +
"    state.alertParcialFired = false; state.alertTotalFired = false;\n" +
"  }catch(e){\n" +
"    state.audioEnabled=false; state.audioInterval=100; state.lastAnnounced=0;\n" +
"    state.preincAudioEnabled=false; state.preincLastTotal=null;\n" +
"    state.alertParcialEnabled=false; state.alertParcialThreshold=null; state.alertTotalEnabled=false; state.alertTotalThreshold=null;\n" +
"  }\n" +
"  document.getElementById('audio-toggle').checked = state.audioEnabled;\n" +
"  document.getElementById('audio-interval').value = state.audioInterval;\n" +
"  document.getElementById('preinc-audio-toggle').checked = state.preincAudioEnabled;\n" +
"  document.getElementById('alert-parcial-toggle').checked = state.alertParcialEnabled;\n" +
"  document.getElementById('alert-parcial-threshold').value = (state.alertParcialThreshold===null?'':state.alertParcialThreshold);\n" +
"  document.getElementById('alert-total-toggle').checked = state.alertTotalEnabled;\n" +
"  document.getElementById('alert-total-threshold').value = (state.alertTotalThreshold===null?'':state.alertTotalThreshold);\n" +
"}\n" +
"function saveAudioPrefs(){\n" +
"  if (!state.currentId) return;\n" +
"  localStorage.setItem(audioKey(state.currentId), JSON.stringify({\n" +
"    enabled:state.audioEnabled, interval:state.audioInterval, lastAnnounced:state.lastAnnounced,\n" +
"    preincEnabled:state.preincAudioEnabled, preincLastTotal:state.preincLastTotal,\n" +
"    alertParcialEnabled:state.alertParcialEnabled, alertParcialThreshold:state.alertParcialThreshold,\n" +
"    alertTotalEnabled:state.alertTotalEnabled, alertTotalThreshold:state.alertTotalThreshold\n" +
"  }));\n" +
"}\n" +
"App.toggleAudio = function(checked){ state.audioEnabled = checked; saveAudioPrefs(); if (checked) speak('Áudio ativado.'); };\n" +
"App.togglePreincAudio = function(checked){ state.preincAudioEnabled = checked; saveAudioPrefs(); if (checked) speak('Áudio de pré-incisões ativado.'); };\n" +
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
"App.testAudio = function(){ speak(t('audio.test_phrase')); };\n" +
"function speak(text){ if (!('speechSynthesis' in window)) { toast(t('toast.no_speech_synthesis')); return; } var u = new SpeechSynthesisUtterance(text); u.lang=({pt:'pt-BR',en:'en-US',es:'es-ES'}[state.lang]||'pt-BR'); window.speechSynthesis.speak(u); }\n" +
"function checkAudioMilestone(total){\n" +
"  if (!state.audioEnabled || !state.audioInterval) return;\n" +
"  var milestone = Math.floor(total/state.audioInterval)*state.audioInterval;\n" +
"  if (milestone>0 && milestone>state.lastAnnounced){ state.lastAnnounced=milestone; saveAudioPrefs(); speak(t('audio.milestone',{n:String(milestone)})); }\n" +
"}\n" +
// Cada área de pré-incisão (recesso direito, linha, etc.) é um contador PRÓPRIO e\n" +
"// ABSOLUTO — não uma leitura acumulada única tipo o Mamba — então o total (soma de\n" +
"// todas as áreas) não depende da ORDEM em que você preenche cada campo, nem precisa\n" +
"// de nenhum rastreamento por horário: é sempre só a soma direta do que está em cada\n" +
"// campo agora. Por isso este anúncio pode ser simplesmente 'o total mudou desde a\n" +
"// última vez que eu vi' — comparando com o valor mais recente já visto/anunciado\n" +
"// (state.preincLastTotal), sem precisar de nenhum 'quem veio antes de quem'.\n" +
"// Roda dentro de render(), então dispara tanto pela edição feita no próprio aparelho\n" +
"// quanto quando o poll (a cada 1.5s) traz uma mudança feita por OUTRO aparelho —\n" +
"// igual já acontece com o alarme de transecção. Na primeira renderização depois de\n" +
"// abrir a cirurgia (preincLastTotal ainda null), só grava a base sem anunciar, pra\n" +
"// não anunciar um total que já estava lá antes de você abrir o app.\n" +
"function checkPreincAudioOnChange(total){\n" +
"  if (!state.preincAudioEnabled){ state.preincLastTotal = total; return; }\n" +
"  if (state.preincLastTotal===null || state.preincLastTotal===undefined){ state.preincLastTotal = total; saveAudioPrefs(); return; }\n" +
"  if (total !== state.preincLastTotal){\n" +
"    state.preincLastTotal = total;\n" +
"    saveAudioPrefs();\n" +
"    speak(t('audio.preinc_update',{n:String(total)}));\n" +
"  }\n" +
"}\n" +
"setInterval(function(){ api('/api/ping').catch(function(){}); }, 5000);\n" +
"document.addEventListener('DOMContentLoaded', function(){\n" +
"  window.App = App;\n" +
"  initLanguage();\n" +
"  loadIncrementSettings();\n" +
"  resolveBaseUrl().then(function(){ if (state.session) render(); });\n" +
"  var m = window.location.pathname.match(/^\\/s\\/([a-f0-9]+)$/);\n" +
"  var mReset = window.location.pathname.match(/^\\/reset\\/([a-f0-9]+)$/);\n" +
"  if (m){\n" +
"    // Acesso direto a uma cirurgia via link — não exige login (fluxo das auxiliares).\n" +
"    state.currentId=m[1]; loadAudioPrefs(m[1]); showScreen('counting'); App.switchTab('extracao'); fetchAndRender().then(function(){ startPolling(); });\n" +
"    // Mas se o navegador já tiver uma sessão de médico logado (ex: o próprio médico\n" +
"    // abrindo um atalho/link direto pra cirurgia, em vez de entrar pela Home), detecta\n" +
"    // isso em paralelo — sem isso, state.currentUser ficava null a sessão toda, e o\n" +
"    // botão \"Início\" (App.goHome) achava que era uma auxiliar sem login e voltava pra\n" +
"    // própria cirurgia em vez de ir pra listagem. Se não tiver sessão válida (é mesmo\n" +
"    // uma auxiliar sem login), o catch não faz nada — segue o fluxo normal.\n" +
"    api('/api/me').then(function(r){ state.currentUser = r.user; renderUserBar(); }).catch(function(){});\n" +
"  } else if (mReset){\n" +
"    state.resetToken = mReset[1]; showScreen('reset');\n" +
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

// Detecta se está rodando na nuvem (Railway injeta essas variáveis automaticamente
// no ambiente do serviço) pra trocar o subtítulo do topo — evita o app dizer
// "rede local · sem nuvem" quando na verdade está publicado no Railway.
var IS_CLOUD_ENV = !!(
  process.env.RAILWAY_ENVIRONMENT_NAME ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_SERVICE_ID ||
  process.env.RAILWAY_STATIC_URL ||
  process.env.RAILWAY_PUBLIC_DOMAIN
);
var APP_SUBTITLE = IS_CLOUD_ENV ? "nuvem (Railway)" : "rede local · sem nuvem";
// Escapa "<" pra "<" antes de embutir o dicionário como JSON dentro do <script> —
// evita que qualquer valor traduzido que por acaso contenha "</script>" feche a tag
// mais cedo e quebre a página.
var STRINGS_JSON_SAFE = JSON.stringify(STRINGS).replace(/</g, "\\u003c");
var INDEX_HTML_RENDERED = INDEX_HTML.replace("__APP_SUBTITLE__", APP_SUBTITLE).replace("__STRINGS_JSON__", STRINGS_JSON_SAFE);

// ==================== SERVIDOR ====================
var server = http.createServer(function (req, res) {
  var u;
  try { u = new URL(req.url, "http://localhost"); } catch (e) { res.writeHead(400); res.end(); return; }
  var p = u.pathname;

  // Cabeçalhos de segurança básicos, em toda resposta. A página é um único HTML
  // autocontido (sem CDN, sem fonte externa) com um <script> inline só — por isso
  // dá pra usar um CSP relativamente restrito sem quebrar nada.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  if (SECURE_COOKIES) res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");

  // Sem cabeçalhos de CORS aqui também, pelo mesmo motivo do comentário em
  // send() — app same-origin não precisa liberar chamadas cross-origin.
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (p === "/api/register" && req.method === "POST") {
    var registerLang = requestLang(req);
    if (rateLimited("register", clientIp(req), 10, 60 * 60 * 1000)) { send(res, 429, { error: t("errors.too_many_registrations", registerLang) }); return; }
    readBody(req).then(function (body) {
      var nomeCompleto = String(body.nomeCompleto || "").trim().slice(0, 120);
      var crm = String(body.crm || "").trim().slice(0, 40);
      var email = String(body.email || "").trim().toLowerCase().slice(0, 160);
      var telefone = String(body.telefone || "").trim().slice(0, 40);
      var password = String(body.password || "");
      if (!nomeCompleto || !crm || !email || !telefone || !password) { send(res, 400, { error: t("toast.fill_all_fields", registerLang) }); return; }
      if (email.indexOf("@") === -1) { send(res, 400, { error: t("errors.invalid_email", registerLang) }); return; }
      if (password.length < 6) { send(res, 400, { error: t("toast.password_too_short", registerLang) }); return; }
      if (findUserByEmail(email)) { send(res, 409, { error: t("errors.email_already_registered", registerLang) }); return; }
      var id = newId(6);
      var branding = emptyBranding();
      branding.language = registerLang; // herda o idioma usado no cadastro
      var user = { id: id, nomeCompleto: nomeCompleto, crm: crm, email: email, telefone: telefone, passwordHash: hashPassword(password), createdAt: Date.now(), branding: branding };
      db.users[id] = user;
      var token = newId(24);
      db.authTokens[hashToken(token)] = { userId: id, createdAt: Date.now() };
      saveData();
      setAuthCookie(res, token);
      send(res, 200, { user: publicUser(user) });
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", registerLang) }); });
    return;
  }

  if (p === "/api/login" && req.method === "POST") {
    var loginLang = requestLang(req);
    if (rateLimited("login", clientIp(req), 8, 15 * 60 * 1000)) { send(res, 429, { error: t("errors.too_many_logins", loginLang) }); return; }
    readBody(req).then(function (body) {
      var email = String(body.email || "").trim().toLowerCase();
      var password = String(body.password || "");
      var user = findUserByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash)) { send(res, 401, { error: t("errors.invalid_credentials", loginLang) }); return; }
      var token = newId(24);
      db.authTokens[hashToken(token)] = { userId: user.id, createdAt: Date.now() };
      saveData();
      setAuthCookie(res, token);
      send(res, 200, { user: publicUser(user) });
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", loginLang) }); });
    return;
  }

  if (p === "/api/logout" && req.method === "POST") {
    var cookiesOut = parseCookies(req);
    var tokOut = cookiesOut["fue_auth"];
    if (tokOut && db.authTokens[hashToken(tokOut)]) { delete db.authTokens[hashToken(tokOut)]; saveData(); }
    clearAuthCookie(res);
    send(res, 200, { ok: true });
    return;
  }

  // Invalida todos os tokens de login do médico (todos os aparelhos, não só este) —
  // útil se um celular/notebook com a sessão aberta foi perdido ou compartilhado.
  if (p === "/api/logout-all" && req.method === "POST") {
    var logoutAllUser = getAuthedUser(req);
    if (!logoutAllUser) { send(res, 401, { error: t("errors.not_authenticated", requestLang(req)) }); return; }
    Object.keys(db.authTokens).forEach(function (tok) {
      if (db.authTokens[tok].userId === logoutAllUser.id) delete db.authTokens[tok];
    });
    saveData();
    clearAuthCookie(res);
    send(res, 200, { ok: true });
    return;
  }

  if (p === "/api/me" && req.method === "GET") {
    var meUser = getAuthedUser(req);
    if (!meUser) { send(res, 401, { error: t("errors.not_authenticated", requestLang(req)) }); return; }
    send(res, 200, { user: publicUser(meUser) });
    return;
  }

  // Tema (preset de cor) e modo escuro/claro — preferência do médico, sincronizada
  // entre aparelhos (fica salva no cadastro, não no navegador).
  if (p === "/api/me/branding" && req.method === "POST") {
    var brUser = getAuthedUser(req);
    var brLang = requestLang(req);
    if (!brUser) { send(res, 401, { error: t("errors.not_authenticated", brLang) }); return; }
    readBody(req).then(function (body) {
      if (body.theme !== undefined) {
        brUser.branding.theme = THEME_IDS.has(body.theme) ? body.theme : "padrao";
      }
      if (body.darkMode !== undefined) {
        brUser.branding.darkMode = !!body.darkMode;
      }
      if (body.language !== undefined) {
        brUser.branding.language = LANG_IDS.has(body.language) ? body.language : "pt";
      }
      saveData();
      send(res, 200, { user: publicUser(brUser) });
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", brLang) }); });
    return;
  }

  // Logo do médico — sempre salva com o mesmo nome (userId.png), então cada upload
  // novo simplesmente substitui o anterior; não precisa de faxina de arquivo órfão.
  if (p === "/api/me/logo" && req.method === "POST") {
    var logoUser = getAuthedUser(req);
    var logoLang = requestLang(req);
    if (!logoUser) { send(res, 401, { error: t("errors.not_authenticated", logoLang) }); return; }
    readBody(req).then(function (body) {
      var dataUrl = String(body.dataUrl || "");
      var match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (!match) { send(res, 400, { error: t("errors.invalid_image", logoLang) }); return; }
      var buffer = Buffer.from(match[2], "base64");
      var filename = logoUser.id + ".png";
      fs.writeFileSync(path.join(LOGOS_DIR, filename), buffer);
      logoUser.branding.logoFilename = filename;
      saveData();
      send(res, 200, { user: publicUser(logoUser) });
    }).catch(function (err) { send(res, 400, { error: t("errors.image_processing_error_prefix", logoLang) + err.message }); });
    return;
  }

  if (p === "/api/me/logo/delete" && req.method === "POST") {
    var logoDelUser = getAuthedUser(req);
    if (!logoDelUser) { send(res, 401, { error: t("errors.not_authenticated", requestLang(req)) }); return; }
    if (logoDelUser.branding.logoFilename) {
      var logoPath = path.join(LOGOS_DIR, logoDelUser.branding.logoFilename);
      fs.unlink(logoPath, function () {});
      logoDelUser.branding.logoFilename = null;
      saveData();
    }
    send(res, 200, { user: publicUser(logoDelUser) });
    return;
  }

  // Serve a imagem do logo sem exigir login — de propósito, igual ao resto do
  // modelo de acesso por link: um auxiliar que abre uma cirurgia só pelo link
  // também precisa conseguir ver a marca do médico dono dela.
  m = p.match(/^\/api\/user\/([a-f0-9]+)\/logo$/);
  if (m && req.method === "GET") {
    var logoOwner = db.users[m[1]];
    if (!logoOwner || !logoOwner.branding || !logoOwner.branding.logoFilename) { res.writeHead(404); res.end(); return; }
    var logoFilePath = path.join(LOGOS_DIR, logoOwner.branding.logoFilename);
    fs.readFile(logoFilePath, function (err, content) {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" });
      res.end(content);
    });
    return;
  }

  if (p === "/api/forgot-password" && req.method === "POST") {
    var forgotLang = requestLang(req);
    if (rateLimited("forgot", clientIp(req), 6, 60 * 60 * 1000)) { send(res, 429, { error: t("errors.too_many_forgot", forgotLang) }); return; }
    readBody(req).then(function (body) {
      var email = String(body.email || "").trim().toLowerCase();
      var user = findUserByEmail(email);
      if (!user) {
        console.log("[recuperar senha] pedido para e-mail não cadastrado: " + email);
        send(res, 200, { ok: true }); // resposta genérica — não revela se o e-mail existe
        return;
      }
      var token = newId(24);
      db.resetTokens[hashToken(token)] = { userId: user.id, createdAt: Date.now(), expiresAt: Date.now() + RESET_TOKEN_TTL_MS };
      saveData();
      var resetUrl = externalBaseUrl(req) + "/reset/" + token;
      // O e-mail vai no idioma salvo na CONTA do médico (não no idioma de quem está
      // pedindo agora) — importante porque quem pede pode estar num computador
      // compartilhado da clínica com outro idioma selecionado.
      var emailLang = (user.branding && LANG_IDS.has(user.branding.language)) ? user.branding.language : "pt";
      var text = t("email.reset_body", emailLang).replace("{name}", user.nomeCompleto).replace("{url}", resetUrl);
      smtpSendMail({ to: user.email, subject: t("email.reset_subject", emailLang), text: text })
        .then(function () { console.log("[recuperar senha] e-mail enviado para " + user.email); })
        .catch(function (err) { console.log("[recuperar senha] ERRO ao enviar e-mail para " + user.email + ": " + err.message); });
      send(res, 200, { ok: true });
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", forgotLang) }); });
    return;
  }

  if (p === "/api/reset-password" && req.method === "POST") {
    var resetLang = requestLang(req);
    readBody(req).then(function (body) {
      var token = String(body.token || "");
      var password = String(body.password || "");
      var entry = db.resetTokens[hashToken(token)];
      if (!entry || entry.expiresAt < Date.now()) { send(res, 400, { error: t("errors.reset_link_invalid", resetLang) }); return; }
      if (password.length < 6) { send(res, 400, { error: t("toast.password_too_short", resetLang) }); return; }
      var user = db.users[entry.userId];
      if (!user) { send(res, 400, { error: t("errors.account_not_found", resetLang) }); return; }
      user.passwordHash = hashPassword(password);
      delete db.resetTokens[hashToken(token)];
      saveData();
      send(res, 200, { ok: true });
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", resetLang) }); });
    return;
  }

  if (p === "/api/session" && req.method === "POST") {
    var creator = getAuthedUser(req);
    var createLang = requestLang(req);
    if (!creator) { send(res, 401, { error: t("errors.login_required_create_surgery", createLang) }); return; }
    readBody(req).then(function (body) {
      var codigo = String(body.codigo || "").trim().slice(0, 60);
      if (!codigo) { send(res, 400, { error: t("errors.patient_code_required", createLang) }); return; }
      var mode = String(body.mode || "completo");
      if (!SESSION_MODES.has(mode)) { mode = "completo"; }
      var id = newSessionId();
      var newPatientInfo = emptyPatientInfo();
      // Dados demográficos são opcionais mesmo aqui na criação — quem estiver com
      // pressa no dia da cirurgia simplesmente não manda "patientInfo" e preenche
      // depois na aba Paciente, sem nada travar.
      if (body.patientInfo && typeof body.patientInfo === "object") {
        Object.assign(newPatientInfo, sanitizePatientInfoFields(body.patientInfo));
      }
      db.sessions[id] = {
        id: id, codigo: codigo, ownerId: creator.id, status: "andamento",
        mode: mode,
        quadrants: emptyQuadrants(),
        patientInfo: newPatientInfo,
        preincCounts: emptyPreinc(),
        preincDist: emptyPreincDist(),
        photos: { marcacao: [], posop: [] },
        timer: emptyTimer(),
        preincTimer: emptyTimer(),
        globalTimerStartedAt: null, globalTimerEndedAt: null,
        finalizedAt: null,
        createdAt: Date.now(), updatedAt: Date.now()
      };
      saveData();
      send(res, 200, db.sessions[id]);
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", createLang) }); });
    return;
  }

  // Dados demográficos do paciente (idade, altura, peso, cabelo, raspagem) — sempre
  // opcionais, preenchíveis a qualquer momento, tanto na criação quanto depois na aba
  // Paciente. Aceita atualização parcial (só os campos enviados são alterados).
  m = p.match(/^\/api\/session\/([a-f0-9]+)\/patient-info$/);
  if (m && req.method === "POST") {
    var sPat = db.sessions[m[1]];
    var sPatLang = requestLang(req);
    if (!sPat) { send(res, 404, { error: t("errors.surgery_not_found", sPatLang) }); return; }
    readBody(req).then(function (body) {
      if (!sPat.patientInfo) sPat.patientInfo = emptyPatientInfo();
      Object.assign(sPat.patientInfo, sanitizePatientInfoFields(body));
      sPat.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(sPat));
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", sPatLang) }); });
    return;
  }

  if (p === "/api/sessions" && req.method === "GET") {
    var lister = getAuthedUser(req);
    if (!lister) { send(res, 401, { error: t("errors.not_authenticated", requestLang(req)) }); return; }
    var list = Object.keys(db.sessions).map(function (k) { return db.sessions[k]; })
      .filter(function (s) { return s.ownerId === lister.id; })
      .sort(function (a, b) { return b.createdAt - a.createdAt; });
    send(res, 200, list);
    return;
  }

  // Backup manual pro próprio médico: baixa um arquivo com o cadastro da conta e
  // TODAS as cirurgias dele (contagens, tempos, pré-incisões — tudo que fica em
  // data.json), pra guardar uma cópia fora do Railway (computador, Drive, etc.).
  // Só cobre os dados numéricos/cadastrais, não as fotos — essas continuam
  // dependendo só do backup de volume do próprio Railway (ver LEIA-ME.md). Só
  // funciona logado, e só devolve os dados do médico autenticado, nunca de
  // outra conta.
  if (p === "/api/backup" && req.method === "GET") {
    var backupUser = getAuthedUser(req);
    if (!backupUser) { send(res, 401, { error: t("errors.not_authenticated", requestLang(req)) }); return; }
    var backupSessions = Object.keys(db.sessions).map(function (k) { return db.sessions[k]; })
      .filter(function (s) { return s.ownerId === backupUser.id; })
      .sort(function (a, b) { return b.createdAt - a.createdAt; });
    var backupPayload = {
      geradoEm: new Date().toISOString(),
      app: "Graftis",
      medico: publicUser(backupUser),
      cirurgias: backupSessions
    };
    var backupJson = JSON.stringify(backupPayload, null, 2);
    var backupDate = new Date().toISOString().slice(0, 10);
    var backupFilename = "graftis-backup-" + backupDate + ".json";
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"" + backupFilename + "\""
    });
    res.end(backupJson);
    return;
  }

  var m;

  // Freia varredura de IDs de cirurgia (o ID tem só 8 caracteres — alguém tentando
  // adivinhar IDs ao acaso vai bater várias vezes em "não encontrada" rapidamente,
  // o que uma auxiliar com o link certo nunca faz). Verifica ANTES de cada rota
  // específica de sessão, cobrindo todos os sub-caminhos (/adjust, /mamba, /photos etc).
  var sessionScanMatch = p.match(/^\/api\/session\/([a-f0-9]+)/);
  if (sessionScanMatch && !db.sessions[sessionScanMatch[1]]) {
    if (rateLimited("session-miss", clientIp(req), 20, 5 * 60 * 1000)) {
      send(res, 429, { error: t("errors.too_many_missing_session_attempts", requestLang(req)) });
      return;
    }
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)$/);
  if (m && req.method === "GET") {
    var s = db.sessions[m[1]];
    if (!s) { send(res, 404, { error: t("errors.surgery_not_found_server", requestLang(req)) }); return; }
    send(res, 200, withOwnerBranding(s));
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/adjust$/);
  if (m && req.method === "POST") {
    var s2 = db.sessions[m[1]];
    var s2Lang = requestLang(req);
    if (!s2) { send(res, 404, { error: t("errors.surgery_not_found", s2Lang) }); return; }
    if (s2.status === "finalizada") { send(res, 409, { error: t("errors.surgery_already_finalized", s2Lang) }); return; }
    readBody(req).then(function (body) {
      var quadId = body.quadrant;
      var catId = body.category;
      var delta = Number(body.delta);
      if (!QUAD_IDS.has(quadId) || !CAT_IDS.has(catId) || !Number.isFinite(delta)) { send(res, 400, { error: t("errors.invalid_parameters", s2Lang) }); return; }
      if (s2.quadrants[quadId].locked) { send(res, 409, { error: t("errors.quadrant_locked", s2Lang) }); return; }
      var counts = s2.quadrants[quadId].counts;
      var current = counts[catId] || 0;
      var next = current + delta;
      if (next < 0) next = 0;
      counts[catId] = next;
      s2.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(s2));
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", s2Lang) }); });
    return;
  }

  // Contagem em cadeia: "Contagem finalizada" trava o quadrante atual e liga o
  // PRÓXIMO (ordem padrão da lista QUADRANTS, que já é a ordem real de extração) a
  // ele, só se esse próximo ainda não tiver um link definido nem estiver travado —
  // assim o fluxo comum (extrair na ordem padrão) fica em 1 toque, sem sobrescrever
  // um link que já tenha sido escolhido manualmente.
  m = p.match(/^\/api\/session\/([a-f0-9]+)\/quadrant-finish$/);
  if (m && req.method === "POST") {
    var sQF = db.sessions[m[1]];
    var sQFLang = requestLang(req);
    if (!sQF) { send(res, 404, { error: t("errors.surgery_not_found", sQFLang) }); return; }
    if (sQF.status === "finalizada") { send(res, 409, { error: t("errors.surgery_already_finalized", sQFLang) }); return; }
    readBody(req).then(function (body) {
      var quadId = body.quadrant;
      if (!QUAD_IDS.has(quadId)) { send(res, 400, { error: t("errors.invalid_quadrant", sQFLang) }); return; }
      sQF.quadrants[quadId].locked = true;
      var idx = -1;
      for (var i = 0; i < QUADRANTS.length; i++) { if (QUADRANTS[i].id === quadId) { idx = i; break; } }
      var nextQuad = (idx !== -1 && idx + 1 < QUADRANTS.length) ? QUADRANTS[idx + 1] : null;
      if (nextQuad && !sQF.quadrants[nextQuad.id].carryFromId && !sQF.quadrants[nextQuad.id].locked) {
        sQF.quadrants[nextQuad.id].carryFromId = quadId;
      }
      sQF.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(sQF));
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", sQFLang) }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/quadrant-reopen$/);
  if (m && req.method === "POST") {
    var sQR = db.sessions[m[1]];
    var sQRLang = requestLang(req);
    if (!sQR) { send(res, 404, { error: t("errors.surgery_not_found", sQRLang) }); return; }
    if (sQR.status === "finalizada") { send(res, 409, { error: t("errors.surgery_already_finalized", sQRLang) }); return; }
    readBody(req).then(function (body) {
      var quadId = body.quadrant;
      if (!QUAD_IDS.has(quadId)) { send(res, 400, { error: t("errors.invalid_quadrant", sQRLang) }); return; }
      sQR.quadrants[quadId].locked = false;
      sQR.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(sQR));
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", sQRLang) }); });
    return;
  }

  // Liga (ou desliga, com carryFromId null/vazio) manualmente um quadrante a outro
  // como predecessor da cadeia — usado quando a ordem real de extração foge do padrão.
  m = p.match(/^\/api\/session\/([a-f0-9]+)\/quadrant-link$/);
  if (m && req.method === "POST") {
    var sQL = db.sessions[m[1]];
    var sQLLang = requestLang(req);
    if (!sQL) { send(res, 404, { error: t("errors.surgery_not_found", sQLLang) }); return; }
    if (sQL.status === "finalizada") { send(res, 409, { error: t("errors.surgery_already_finalized", sQLLang) }); return; }
    readBody(req).then(function (body) {
      var quadId = body.quadrant;
      var carryFromId = body.carryFromId;
      if (!QUAD_IDS.has(quadId)) { send(res, 400, { error: t("errors.invalid_quadrant", sQLLang) }); return; }
      if (sQL.quadrants[quadId].locked) { send(res, 409, { error: t("errors.quadrant_locked", sQLLang) }); return; }
      if (carryFromId === null || carryFromId === undefined || carryFromId === "") {
        sQL.quadrants[quadId].carryFromId = null;
      } else {
        if (!QUAD_IDS.has(carryFromId)) { send(res, 400, { error: t("errors.invalid_quadrant", sQLLang) }); return; }
        if (wouldCreateCarryCycle(sQL, quadId, carryFromId)) { send(res, 400, { error: t("errors.invalid_carry_link", sQLLang) }); return; }
        sQL.quadrants[quadId].carryFromId = carryFromId;
      }
      sQL.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(sQL));
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", sQLLang) }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/mamba$/);
  if (m && req.method === "POST") {
    var sM = db.sessions[m[1]];
    var sMLang = requestLang(req);
    if (!sM) { send(res, 404, { error: t("errors.surgery_not_found", sMLang) }); return; }
    readBody(req).then(function (body) {
      var quadId = body.quadrant;
      if (!QUAD_IDS.has(quadId)) { send(res, 400, { error: t("errors.invalid_quadrant", sMLang) }); return; }
      if (body.value === null || body.value === undefined || body.value === "") {
        sM.quadrants[quadId].mambaCumulativo = null;
        sM.quadrants[quadId].mambaMarkTimeMs = null;
        sM.quadrants[quadId].mambaMarkedAtMs = null;
      } else {
        var v = Number(body.value);
        if (!Number.isFinite(v) || v < 0) { send(res, 400, { error: t("errors.invalid_value", sMLang) }); return; }
        sM.quadrants[quadId].mambaCumulativo = v;
        // Marca, no exato momento em que o Mamba é preenchido, quanto tempo de cirurgia
        // já tinha decorrido — é isso que permite calcular o ritmo de extração por
        // quadrante baseado no Mamba (em vez da contagem manual de bancada). Esse valor
        // FICA PARADO enquanto o cronômetro estiver pausado (de propósito — não conta
        // tempo de pausa como tempo de extração do quadrante).
        sM.quadrants[quadId].mambaMarkTimeMs = serverElapsedMs(sM.timer);
        // Marca também o relógio real (nunca pausa, nunca empata entre quadrantes
        // diferentes) — é isso que garante a ORDEM verdadeira de preenchimento entre
        // quadrantes, mesmo que dois deles sejam marcados com o cronômetro de extração
        // pausado (o que fazia o cálculo acima empatar e o sistema cair, por engano,
        // no quadrante mais antigo em vez do mais recente).
        sM.quadrants[quadId].mambaMarkedAtMs = Date.now();
      }
      sM.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(sM));
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", sMLang) }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/preinc$/);
  if (m && req.method === "POST") {
    var sP = db.sessions[m[1]];
    var sPLang = requestLang(req);
    if (!sP) { send(res, 404, { error: t("errors.surgery_not_found", sPLang) }); return; }
    if (sP.status === "finalizada") { send(res, 409, { error: t("errors.surgery_already_finalized", sPLang) }); return; }
    readBody(req).then(function (body) {
      var area = body.area;
      var value = Number(body.value);
      if (!PREINC_IDS.has(area) || !Number.isFinite(value) || value < 0) { send(res, 400, { error: t("errors.invalid_parameters", sPLang) }); return; }
      sP.preincCounts[area] = Math.floor(value);
      sP.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(sP));
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", sPLang) }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/preinc-dist$/);
  if (m && req.method === "POST") {
    var sPD = db.sessions[m[1]];
    var sPDLang = requestLang(req);
    if (!sPD) { send(res, 404, { error: t("errors.surgery_not_found", sPDLang) }); return; }
    if (sPD.status === "finalizada") { send(res, 409, { error: t("errors.surgery_already_finalized", sPDLang) }); return; }
    readBody(req).then(function (body) {
      var area = body.area;
      var fio = body.fio;
      var value = Number(body.value);
      if (!PREINC_IDS.has(area) || !DIST_FIO_IDS.has(fio) || !Number.isFinite(value) || value < 0) { send(res, 400, { error: t("errors.invalid_parameters", sPDLang) }); return; }
      if (!sPD.preincDist) sPD.preincDist = emptyPreincDist();
      sPD.preincDist[area][fio] = Math.floor(value);
      sPD.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(sPD));
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", sPDLang) }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/photos$/);
  if (m && req.method === "POST") {
    var sPh = db.sessions[m[1]];
    var sPhLang = requestLang(req);
    if (!sPh) { send(res, 404, { error: t("errors.surgery_not_found", sPhLang) }); return; }
    readBody(req).then(function (body) {
      var category = body.category;
      var dataUrl = String(body.dataUrl || "");
      if (PHOTO_CATS.indexOf(category) === -1) { send(res, 400, { error: t("errors.invalid_category", sPhLang) }); return; }
      var match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (!match) { send(res, 400, { error: t("errors.invalid_image", sPhLang) }); return; }
      var buffer = Buffer.from(match[2], "base64");
      var photoId = newId(6);
      var sessionDir = path.join(UPLOADS_DIR, sPh.id);
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
      var filename = photoId + ".jpg";
      fs.writeFileSync(path.join(sessionDir, filename), buffer);
      sPh.photos[category].push({ id: photoId, filename: filename, createdAt: Date.now() });
      sPh.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(sPh));
    }).catch(function (err) { send(res, 400, { error: t("errors.photo_processing_error_prefix", sPhLang) + err.message }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/photos\/([a-f0-9]+)$/);
  if (m && req.method === "GET") {
    var sPhG = db.sessions[m[1]];
    if (!sPhG) { res.writeHead(404); res.end(); return; }
    var found = findPhotoCategory(sPhG, m[2]);
    if (!found) { res.writeHead(404); res.end(); return; }
    // Prazo de acesso às fotos por link sem login (ver PHOTO_LINK_TTL_MS): depois
    // de finalizada a cirurgia, passado o prazo, só o médico dono autenticado
    // continua vendo as fotos — quem só tem o link (ex: recebeu por WhatsApp)
    // passa a precisar que o médico faça login pra reabrir o acesso.
    if (sPhG.finalizedAt && (Date.now() - sPhG.finalizedAt > PHOTO_LINK_TTL_MS)) {
      var photoAuthUser = getAuthedUser(req);
      if (!photoAuthUser || photoAuthUser.id !== sPhG.ownerId) {
        send(res, 403, { error: t("errors.photo_link_expired", requestLang(req)) });
        return;
      }
    }
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
    var sPhDLang = requestLang(req);
    if (!sPhD) { send(res, 404, { error: t("errors.surgery_not_found", sPhDLang) }); return; }
    var foundD = findPhotoCategory(sPhD, m[2]);
    if (!foundD) { send(res, 404, { error: t("errors.photo_not_found", sPhDLang) }); return; }
    sPhD.photos[foundD.cat].splice(foundD.idx, 1);
    sPhD.updatedAt = Date.now();
    saveData();
    var filePath2 = path.join(UPLOADS_DIR, sPhD.id, foundD.photo.filename);
    fs.unlink(filePath2, function () {});
    send(res, 200, withOwnerBranding(sPhD));
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/timer$/);
  if (m && req.method === "POST") {
    var s4 = db.sessions[m[1]];
    var s4Lang = requestLang(req);
    if (!s4) { send(res, 404, { error: t("errors.surgery_not_found", s4Lang) }); return; }
    if (s4.status === "finalizada") { send(res, 409, { error: t("errors.surgery_finalized_reopen_timer", s4Lang) }); return; }
    readBody(req).then(function (body) {
      var action = body.action;
      if (action === "start" && !s4.timer.running) {
        s4.timer.running = true; s4.timer.startedAt = Date.now();
        if (!s4.globalTimerStartedAt) s4.globalTimerStartedAt = s4.timer.startedAt;
      }
      else if (action === "pause" && s4.timer.running) { s4.timer.accumulatedMs += Date.now() - s4.timer.startedAt; s4.timer.running = false; s4.timer.startedAt = null; }
      else if (action === "reset") { s4.timer.accumulatedMs = 0; s4.timer.running = false; s4.timer.startedAt = null; }
      s4.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(s4));
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", s4Lang) }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/preinc-timer$/);
  if (m && req.method === "POST") {
    var s4b = db.sessions[m[1]];
    var s4bLang = requestLang(req);
    if (!s4b) { send(res, 404, { error: t("errors.surgery_not_found", s4bLang) }); return; }
    if (s4b.status === "finalizada") { send(res, 409, { error: t("errors.surgery_finalized_reopen_timer", s4bLang) }); return; }
    readBody(req).then(function (body) {
      var action = body.action;
      var ptTimer = s4b.preincTimer;
      if (action === "start" && !ptTimer.running) {
        ptTimer.running = true; ptTimer.startedAt = Date.now();
        if (!s4b.globalTimerStartedAt) s4b.globalTimerStartedAt = ptTimer.startedAt;
      }
      else if (action === "pause" && ptTimer.running) { ptTimer.accumulatedMs += Date.now() - ptTimer.startedAt; ptTimer.running = false; ptTimer.startedAt = null; }
      else if (action === "reset") { ptTimer.accumulatedMs = 0; ptTimer.running = false; ptTimer.startedAt = null; }
      s4b.updatedAt = Date.now();
      saveData();
      send(res, 200, withOwnerBranding(s4b));
    }).catch(function () { send(res, 400, { error: t("errors.invalid_body", s4bLang) }); });
    return;
  }

  m = p.match(/^\/api\/session\/([a-f0-9]+)\/(finalize|reopen)$/);
  if (m && req.method === "POST") {
    var s5 = db.sessions[m[1]];
    if (!s5) { send(res, 404, { error: t("errors.surgery_not_found", requestLang(req)) }); return; }
    s5.status = (m[2] === "finalize") ? "finalizada" : "andamento";
    if (s5.status === "finalizada") {
      if (s5.timer.running) { s5.timer.accumulatedMs += Date.now() - s5.timer.startedAt; s5.timer.running = false; s5.timer.startedAt = null; }
      if (s5.preincTimer.running) { s5.preincTimer.accumulatedMs += Date.now() - s5.preincTimer.startedAt; s5.preincTimer.running = false; s5.preincTimer.startedAt = null; }
      // Congela o tempo global no instante da finalização — só na primeira vez (se
      // reabrir e finalizar de novo, não estica o relógio do meio, só continua dele).
      if (s5.globalTimerStartedAt && !s5.globalTimerEndedAt) s5.globalTimerEndedAt = Date.now();
      // Marca o instante de finalização — é a partir daqui que o prazo de acesso
      // às fotos via link (PHOTO_LINK_TTL_MS) começa a contar.
      s5.finalizedAt = Date.now();
    } else {
      // Reabriu: o caso volta a estar "em andamento", o tempo global volta a contar,
      // e o prazo de acesso às fotos via link é cancelado até finalizar de novo.
      s5.globalTimerEndedAt = null;
      s5.finalizedAt = null;
    }
    s5.updatedAt = Date.now();
    saveData();
    send(res, 200, withOwnerBranding(s5));
    return;
  }

  // Apagar cirurgia — diferente dos endpoints acima, esta ação exige login E ser o
  // dono da cirurgia (não é acessível por quem só tem o link, de propósito: apagar
  // é destrutivo e permanente, deve ficar restrito a quem criou a lista).
  m = p.match(/^\/api\/session\/([a-f0-9]+)$/);
  if (m && req.method === "DELETE") {
    var deleter = getAuthedUser(req);
    var delLang = requestLang(req);
    if (!deleter) { send(res, 401, { error: t("errors.login_required_delete_surgery", delLang) }); return; }
    var sDel = db.sessions[m[1]];
    if (!sDel) { send(res, 404, { error: t("errors.surgery_not_found", delLang) }); return; }
    if (sDel.ownerId !== deleter.id) { send(res, 403, { error: t("errors.surgery_not_yours", delLang) }); return; }
    delete db.sessions[m[1]];
    saveData();
    var delDir = path.join(UPLOADS_DIR, m[1]);
    if (fs.existsSync(delDir)) {
      try { fs.rmSync(delDir, { recursive: true, force: true }); } catch (e) { console.error("Não consegui apagar fotos da cirurgia " + m[1] + ":", e.message); }
    }
    send(res, 200, { ok: true });
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
    res.end(INDEX_HTML_RENDERED);
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
