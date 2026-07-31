
(function(){
'use strict';
var STRINGS = {"pt":{"common.email":"E-mail","common.password":"Senha","common.confirm_password":"Confirmar senha","auth.title":"Área do médico","auth.subtitle":"Entre com sua conta pra ver e criar suas próprias cirurgias. Auxiliares que já têm o link de uma cirurgia específica não precisam de conta — só quem cria e gerencia a lista de cirurgias precisa entrar.","auth.tab_login":"Entrar","auth.tab_register":"Criar conta","auth.login_submit":"Entrar","auth.forgot_link":"Esqueci minha senha","auth.forgot_email_label":"Seu e-mail cadastrado","auth.forgot_submit":"Enviar link de redefinição","auth.field_fullname":"Nome completo","auth.field_crm":"CRM / registro profissional","auth.crm_placeholder":"Ex: 123456-SP","auth.field_phone":"Telefone (com DDD)","auth.phone_placeholder":"Ex: (11) 91234-5678","auth.register_submit":"Criar conta","reset.title":"Nova senha","reset.subtitle":"Escolha uma nova senha pra sua conta.","reset.new_password":"Nova senha","reset.confirm_password":"Confirmar nova senha","reset.submit":"Salvar nova senha","toast.fill_email_password":"Preencha e-mail e senha.","toast.welcome":"Bem-vindo(a), {name}.","toast.fill_all_fields":"Preencha todos os campos.","toast.passwords_dont_match":"As senhas não coincidem.","toast.password_too_short":"A senha precisa ter pelo menos 6 caracteres.","toast.account_created_welcome":"Conta criada. Bem-vindo(a), {name}.","toast.logged_out":"Você saiu.","toast.logout_all_confirm":"Isso desconecta sua conta de TODOS os aparelhos onde você estiver logado (inclusive este). Vai precisar entrar de novo em cada um. Continuar?","toast.logged_out_all":"Você saiu de todos os aparelhos.","toast.generic_error":"Erro: {msg}","toast.enter_your_email":"Digite seu e-mail.","toast.reset_link_sent_generic":"Se esse e-mail estiver cadastrado, enviamos um link de redefinição.","toast.enter_new_password":"Digite a nova senha.","toast.password_changed_login":"Senha alterada. Faça login com a nova senha.","errors.invalid_email":"E-mail inválido.","errors.email_already_registered":"Já existe um cadastro com esse e-mail.","errors.invalid_credentials":"E-mail ou senha incorretos.","errors.invalid_body":"Corpo inválido.","errors.reset_link_invalid":"Link inválido ou expirado. Peça um novo pela tela de login.","errors.account_not_found":"Conta não encontrada.","errors.too_many_registrations":"Muitos cadastros a partir deste endereço. Tente de novo em algumas horas.","errors.too_many_logins":"Muitas tentativas de login. Aguarde alguns minutos e tente de novo.","errors.too_many_forgot":"Muitos pedidos de redefinição a partir deste endereço. Tente de novo mais tarde.","errors.not_authenticated":"Não autenticado.","errors.invalid_image":"Imagem inválida.","errors.image_processing_error_prefix":"Erro ao processar imagem: ","errors.login_required_create_surgery":"Faça login pra criar uma cirurgia.","errors.patient_code_required":"Código do paciente é obrigatório.","errors.too_many_missing_session_attempts":"Muitas tentativas de acesso a cirurgias inexistentes a partir deste endereço. Aguarde alguns minutos.","errors.surgery_not_found_server":"Cirurgia não encontrada neste servidor.","errors.surgery_not_found":"Cirurgia não encontrada.","errors.surgery_already_finalized":"Cirurgia já finalizada.","errors.invalid_parameters":"Parâmetros inválidos.","errors.invalid_quadrant":"Quadrante inválido.","errors.invalid_value":"Valor inválido.","errors.invalid_category":"Categoria inválida.","errors.photo_processing_error_prefix":"Erro ao processar foto: ","errors.photo_not_found":"Foto não encontrada.","errors.surgery_finalized_reopen_timer":"Cirurgia finalizada — reabra pra mexer no cronômetro.","errors.login_required_delete_surgery":"Faça login pra apagar uma cirurgia.","errors.surgery_not_yours":"Essa cirurgia não é sua.","errors.quadrant_locked":"Este quadrante está travado. Reabra pra editar.","errors.value_below_carry":"O valor não pode ser menor que o total já trazido do quadrante anterior ({carry}).","errors.invalid_carry_link":"Não é possível ligar esse quadrante (criaria um ciclo).","toast.login_required_dashboard":"Faça login pra ver o dashboard.","toast.server_unreachable":"Não consegui falar com o servidor.","toast.add_at_least_one_value":"Adicione ao menos um valor.","toast.settings_saved":"Configurações salvas.","toast.defaults_restored":"Padrão restaurado.","toast.surgery_deleted":"Cirurgia apagada.","toast.enter_patient_code":"Informe um código ou iniciais do paciente.","toast.sync_failed":"Não sincronizou: {msg}","toast.uploading_photos":"Enviando {n} foto(s)...","toast.photos_uploaded":"Foto(s) enviada(s).","toast.photo_upload_error":"Erro ao enviar foto: {msg}","toast.logo_updated":"Logomarca atualizada.","toast.logo_upload_error":"Erro ao enviar logo: {msg}","toast.logo_removed":"Logomarca removida.","toast.surgery_finalized":"Cirurgia finalizada.","toast.surgery_reopened":"Cirurgia reaberta.","toast.quadrant_finished":"Quadrante finalizado.","toast.quadrant_reopened":"Quadrante reaberto.","toast.address_copied":"Endereço copiado.","toast.copy_failed_manual":"Não deu pra copiar — selecione o texto manualmente.","toast.copy_manually":"Copie o endereço manualmente: {url}","toast.no_native_share":"Este navegador não tem a opção de compartilhar direto — use WhatsApp ou Copiar.","toast.no_speech_synthesis":"Este navegador não tem síntese de voz.","confirm.delete_surgery":"Apagar a cirurgia \"{code}\" definitivamente? Isso remove todas as contagens, pré-incisões e fotos dela. Essa ação não pode ser desfeita.","confirm.delete_photo":"Remover esta foto?","confirm.delete_logo":"Remover a logomarca?","confirm.reset_extraction_timer":"Zerar o cronômetro desta cirurgia (afeta todos os aparelhos conectados)?","confirm.reset_preinc_timer":"Zerar o cronômetro de pré-incisões (afeta todos os aparelhos conectados)?","confirm.finalize_surgery":"Finalizar esta cirurgia? Trava as contagens em todos os aparelhos conectados.","confirm.finish_quadrant":"Finalizar a contagem deste quadrante? Ele fica travado até você reabrir.","confirm.reopen_quadrant":"Reabrir este quadrante pra editar de novo?","prompt.set_value_for":"Definir valor para \"{label}\":","prompt.set_quantity_for":"Definir quantidade de \"{label}\":","errors.file_read_error":"Não li o arquivo.","errors.photo_link_expired":"O acesso a esta foto pelo link expirou (cirurgia finalizada há mais de 90 dias). Peça pro médico dono da cirurgia fazer login pra ver.","email.reset_subject":"Redefinir sua senha — Graftis","email.reset_body":"Olá, {name}.\n\nVocê pediu pra redefinir sua senha no Graftis.\n\nToque no link abaixo (ou copie e cole no navegador) pra escolher uma nova senha. Esse link expira em 30 minutos e só funciona uma vez:\n\n{url}\n\nSe você não pediu isso, é só ignorar este e-mail — sua senha continua a mesma.","nav.home":"Início","nav.dashboard":"Dashboard","nav.config":"Config","nav.exit":"Sair","common.mode_complete":"Completo","common.mode_reduced":"Reduzido","common.open":"Abrir","common.delete":"Apagar","common.cancel":"Cancelar","common.ok":"OK","common.save":"Salvar","common.remove":"Remover","common.back":"Voltar","home.title":"Suas cirurgias","home.subtitle":"Só você vê essa lista. Depois de criar a cirurgia, compartilhe o link dela com as auxiliares — elas atualizam os dados ao vivo sem precisar de conta.","home.patient_code_label":"Código / iniciais do paciente","home.patient_code_placeholder":"Ex: JS-090726","home.count_mode_label":"Modo de contagem","home.mode_explanation":"Completo: cada transecção parcial é registrada no tipo exato (2→1, 3→2 etc). Reduzido: os fios da transecção parcial entram junto com os folículos íntegros, e só um contador único de transecção parcial é usado pra calcular a taxa — sem detalhar o tipo. Não dá pra trocar depois de criada.","home.create_button":"+ Nova cirurgia (criar sessão)","home.no_surgeries_yet":"Você ainda não criou nenhuma cirurgia.","config.title":"Configurações","config.increments_subtitle":"Valores extras dos botões de incremento rápido usados na contagem da extração, além do -1/+1 que aparece sempre. Configuração só deste aparelho — cada celular pode ter os próprios botões (por exemplo, só +1 e +100, ou só +50).","config.add_value":"+ Adicionar valor","config.restore_default":"Restaurar padrão (10 / 50 / 100)","config.identity_title":"Identidade visual","config.identity_subtitle":"Vale pra sua conta — aparece em todos os aparelhos onde você fizer login, e também pra quem acessar suas cirurgias só pelo link (sem login).","config.logo_label":"Logomarca","config.logo_empty":"Nenhuma logomarca ainda.","config.theme_label":"Cor do tema","config.darkmode_label":"Modo escuro","config.darkmode_hint":"As cores clínicas (íntegro/parcial/total/mini) não mudam — só o fundo e os textos.","config.language_label":"Idioma / Language / Idioma","config.language_hint":"Por enquanto só a tela de login/cadastro é traduzida — o resto do app continua em português.","config.security_title":"Segurança da conta","config.security_subtitle":"Se você perdeu ou emprestou um aparelho onde tinha feito login, use isto pra encerrar o acesso em todo lugar de uma vez.","config.logout_all_btn":"Sair de todos os aparelhos","config.backup_title":"Backup dos seus dados","config.backup_subtitle":"Baixa um arquivo com o cadastro da sua conta e todas as suas cirurgias (contagens, tempos, pré-incisões). Não inclui as fotos — essas ficam protegidas separadamente pelo backup de volume do Railway. Guarde este arquivo num lugar seguro fora do Railway (computador, Google Drive, etc.).","config.backup_btn":"Baixar backup","config.back_to_surgery":"Voltar pra cirurgia","config.audio_title":"Áudio e alarmes desta cirurgia","config.audio_subtitle":"Vale só pra cirurgia que você tinha aberta e só neste aparelho — cada celular pode ter os próprios ajustes.","config.audio_section_title":"Áudio","config.audio_announce_hint":"Anuncia em voz alta o total de folículos extraídos (somando os 4 quadrantes) a cada N.","config.audio_announce_every":"Anunciar a cada","config.audio_test_btn":"Testar voz","config.preinc_audio_section_title":"Áudio de pré-incisões","config.preinc_audio_announce_hint":"Anuncia em voz alta o novo total de pré-incisões (somando todas as áreas) toda vez que você preencher o valor de uma área.","config.quadfinish_audio_section_title":"Áudio ao finalizar quadrante","config.quadfinish_audio_announce_hint":"Anuncia o Mamba, os folículos extraídos e a diferença sempre que você tocar em \"Contagem finalizada\" num quadrante (só disponível quando a contagem em cadeia está em uso).","config.alarm_section_title":"Alarme de transecção","config.alarm_subtitle":"Avisa por voz assim que a taxa (somando os 4 quadrantes) ultrapassar o limite que você definir.","config.alert_partial_label":"Avisar se transecção parcial passar de (%)","config.alert_partial_placeholder":"Ex: 7","config.alert_total_label":"Avisar se transecção total passar de (%)","config.alert_total_placeholder":"Ex: 5","cat.f1":"1 fio","cat.f2":"2 fios","cat.f3":"3 fios","cat.f4":"4 fios","cat.f1fino":"1 fio especial","cat.f2fino":"2 fios especial","cat.t2_1":"2 → 1 fio","cat.t3_2":"3 → 2 fios","cat.t3_1":"3 → 1 fio","cat.t4_3":"4 → 3 fios","cat.t4_2":"4 → 2 fios","cat.t4_1":"4 → 1 fio","cat.parcial_geral":"Transecção parcial","cat.ttotal":"Transecção total (folículo perdido)","cat.mini":"Mini (miniaturizado)","quad.temporal_dir":"Temporal direito","quad.temporal_esq":"Temporal esquerdo","quad.occipital_dir":"Occipital direito","quad.occipital_esq":"Occipital esquerdo","preinc.recesso_dir":"Recesso direito","preinc.recesso_esq":"Recesso esquerdo","preinc.linha":"Linha","preinc.sublinha":"Sublinha","preinc.entrada_dir1":"Entrada direita 1","preinc.entrada_dir2":"Entrada direita 2","preinc.entrada_esq1":"Entrada esquerda 1","preinc.entrada_esq2":"Entrada esquerda 2","preinc.topete1":"Topete 1","preinc.topete2":"Topete 2","preinc.scalp":"Scalp","preinc.coroa":"Coroa","common.start":"Iniciar","common.pause":"Pausar","common.reset":"Zerar","common.status_finalized":"Finalizada","common.status_in_progress":"Em andamento","cnt.share_btn":"🔗 Compartilhar","cnt.tab_extracao":"Extração","cnt.tab_preinc":"Pré-incisões","cnt.tab_fotos":"Fotos","cnt.tab_paciente":"Paciente","cnt.tab_resumo":"Resumo Final","cnt.final_summary_title":"Resumo final da cirurgia","cnt.final_times_title":"Tempos","cnt.final_categories_title":"Folículos por categoria","cnt.final_preinc_title":"Resumo de pré-incisões","cnt.final_preinc_diff":"Diferença (folículos extraídos − pré-incisões)","patient.section_title":"Dados do paciente","patient.section_hint":"Opcional — preencha agora, depois, ou nunca. Não trava nada da cirurgia.","patient.age_label":"Idade","patient.age_placeholder":"Ex: 45","patient.height_label":"Altura (cm)","patient.height_placeholder":"Ex: 175","patient.weight_label":"Peso (kg)","patient.weight_placeholder":"Ex: 80","patient.hair_thickness_label":"Espessura do cabelo","patient.hair_thin":"Fino","patient.hair_thick":"Grosso","patient.hair_texture_label":"Textura do cabelo","patient.hair_straight":"Liso","patient.hair_wavy":"Ondulado","patient.hair_curly":"Crespo","patient.surgery_type_label":"Tipo de cirurgia","patient.with_shaving":"Com raspagem","patient.without_shaving":"Sem raspagem","home.patient_info_toggle":"Dados do paciente (opcional)","cnt.extraction_time_title":"Tempo de extração","cnt.rate_hint":"Ritmo médio: {rate} folículos/hora","cnt.summary_general_title":"Resumo geral (todos os quadrantes)","cnt.summary_extracted":"Folículos extraídos","cnt.summary_total_hairs":"Total de fios","cnt.summary_index":"Índice fios/folículo","cnt.summary_partial_transec":"Transecção parcial","cnt.summary_total_transec":"Transecção total","cnt.summary_mini":"Mini (fora do total)","cnt.mamba_reading":"Mamba (leitura final)","cnt.mamba_diff":"Diferença","cnt.mamba_diffpct":"Diferença (% do Mamba)","cnt.mamba_diff_extraidos":"Diferença (Mamba − Extraídos)","cnt.mamba_diffpct_extraidos":"Diferença (% Mamba × Extraídos)","cnt.mamba_rate":"Ritmo pelo Mamba (fol./h)","cnt.mamba_hint":"Preencha o Mamba na ordem em que os quadrantes forem extraídos. O valor é a leitura acumulada do aparelho ao final deste quadrante — o app calcula sozinho a diferença em relação ao quadrante anterior.","cnt.mamba_input_label":"Mamba (leitura acumulada ao final deste quadrante)","cnt.mamba_input_placeholder":"Ex: 1000","cnt.mamba_quad_val":"Mamba deste quadrante","cnt.mamba_quad_duration":"Tempo deste quadrante","cnt.chain_title":"Contagem em cadeia","cnt.chain_hint_none":"Este quadrante começa do zero.","cnt.chain_hint_from":"Contando a partir de: {label} ({total})","cnt.carry_from_label":"Carregar contagem de","cnt.carry_from_none_option":"Nenhum (começar do zero)","cnt.quadrant_finish_btn":"Contagem finalizada","cnt.quadrant_reopen_btn":"Reabrir quadrante","cnt.group_integro_title":"Folículos íntegros","cnt.group_parcial_title":"Transecção parcial (folículo aproveitado)","cnt.parcial_reduzido_hint":"Modo reduzido: registre os fios desse folículo normalmente em \"Folículos íntegros\" e toque aqui só pra contar a transecção parcial (não soma de novo no total).","cnt.group_mini_title":"Mini","cnt.mini_hint":"Folículos miniaturizados — não entram na contagem geral de folículos extraídos, fios ou taxas, mas ficam registrados aqui pra não se perderem.","preinc.time_title":"Tempo de pré-incisões","preinc.total_label":"Total de pré-incisões","preinc.by_area_title":"Pré-incisões por área","preinc.area_hint":"Toque no número de cima pra digitar o total da área. UF1/UF2/UF3 embaixo = quantas unidades foliculares de 1, 2 ou 3 fios vão pra essa área.","photos.marcacao_title":"Marcação cirúrgica","photos.marcacao_hint":"Ficam salvas neste servidor — visíveis em todos os celulares conectados.","photos.posop_title":"Pós-operatório imediato","cnt.print_btn":"Imprimir / Salvar PDF","cnt.finalize_btn":"Finalizar cirurgia","cnt.reopen_btn":"Reabrir","share.title":"Compartilhar cirurgia","share.url_label":"Endereço desta cirurgia (compartilhe com os outros celulares)","share.share_link_btn":"Compartilhar link","share.whatsapp_btn":"Enviar por WhatsApp","share.copy_btn":"Copiar","audio.test_phrase":"Teste de áudio. Cento e vinte e três folículos.","audio.milestone":"{n} folículos.","audio.preinc_update":"{n} pré-incisões.","audio.quadfinish_summary":"Mamba {mamba}. Folículos extraídos {extraidos}. Diferença {diffpct} por cento.","audio.quadfinish_extraidos_only":"Folículos extraídos {extraidos}.","cnt.mode_full":"Modo completo","cnt.mode_reduced":"Modo reduzido","cnt.global_not_started":"Tempo total: ainda não iniciado","cnt.global_timer_prefix":"⏱ Tempo total da cirurgia: ","cnt.global_finalized_suffix":" (finalizado)","cnt.global_in_progress_suffix":" (em andamento)","preinc.rate_hint":"Ritmo médio: {rate} pré-incisões/hora","cnt.hair_singular":"fio","cnt.hair_plural":"fios","cnt.per_follicle_suffix":" por folículo","cnt.hairs_not_in_total":"não entra na contagem geral","cnt.hairs_informative_only":"apenas contagem informativa","cnt.hairs_lost":"0 fios (perdido)","dash.title":"Dashboard","dash.subtitle":"Estatísticas calculadas só com cirurgias finalizadas — cirurgias em andamento têm dados parciais e ficam de fora, pra não distorcer as médias.","dash.empty":"Você ainda não tem nenhuma cirurgia finalizada. As estatísticas aparecem aqui assim que a primeira for finalizada.","dash.extracted_by_surgery_title":"Folículos extraídos por cirurgia","dash.extracted_by_surgery_hint":"Cada barra é uma cirurgia finalizada, em ordem cronológica — dá pra ver se o volume por cirurgia está subindo ou caindo ao longo do tempo.","dash.index_by_surgery_title":"Índice fios/folículo por cirurgia","dash.index_by_surgery_hint":"Cada barra é uma cirurgia finalizada, em ordem cronológica.","dash.uf_distribution_title":"Distribuição por tipo de unidade folicular","dash.uf_distribution_hint":"Percentual entre todos os folículos íntegros, somando todas as cirurgias finalizadas.","dash.transec_rate_title":"Taxa de transecção por cirurgia","dash.transec_rate_hint":"Modo completo e modo reduzido calculam a taxa de formas diferentes — por isso ficam em abas separadas, não misture os números.","dash.mode_all":"Todos","dash.rate_todos_hint":"Aqui é só pra ver a evolução cronológica de todas as cirurgias juntas — cada barra usa a taxa correta da própria cirurgia. Não existe uma \"taxa média geral\" porque completo e reduzido calculam a taxa de formas diferentes. Pra ver a média, use as abas Completo ou Reduzido.","dash.rate_empty":"Nenhuma cirurgia finalizada nesse modo ainda.","dash.quad_index_title":"Índice e transecção por quadrante","dash.quad_hint":"Usa a mesma aba Completo/Reduzido/Todos acima. Diferença Mamba × bancada só entra na média das cirurgias em que o Mamba foi preenchido naquele quadrante.","dash.quad_todos_hint":"Na aba \"Todos\" essas médias somem pelo mesmo motivo da taxa de transecção — completo e reduzido não são comparáveis. Use as abas Completo ou Reduzido.","dash.finalized_surgeries_title":"Cirurgias finalizadas","dash.stat_extracted_total":"Folículos extraídos (total)","dash.stat_hairs_total":"Fios transplantados (total)","dash.stat_avg_index":"Índice médio","dash.stat_preinc_avg":"Pré-incisões média/cirurgia","dash.stat_preinc_total":"Pré-incisões total","dash.stat_follicles_per_min":"Folículos/minuto (médio)","dash.stat_avg_time_per_1000":"Tempo médio por 1000 unidades","dash.stat_minis_per_1000":"Minis por 1000 folículos","dash.stat_surgeries_all_modes":"Cirurgias (todos os modos)","dash.stat_in_complete_mode":"— em modo completo","dash.stat_in_reduced_mode":"— em modo reduzido","dash.stat_surgeries_mode_complete":"Cirurgias (completo)","dash.stat_surgeries_mode_reduced":"Cirurgias (reduzido)","dash.stat_partial_rate_avg":"Taxa parcial média","dash.stat_total_rate_avg":"Taxa total média","dash.no_data_yet":"Sem dados suficientes ainda.","dash.table_quadrant":"Quadrante","dash.table_surgeries":"Cirurgias","dash.table_avg_index":"Índice médio","dash.table_partial_rate_avg":"Tx. parcial média","dash.table_total_rate_avg":"Tx. total média","dash.table_mamba_vs_bench":"Mamba × bancada","dash.table_category":"Categoria","dash.table_quantity":"Quantidade","dash.table_pct_intact":"% dos íntegros","dash.table_surgery":"Cirurgia","dash.table_date":"Data","dash.table_mode":"Modo","dash.table_extracted":"Extraídos","dash.table_index":"Índice","dash.table_partial_rate":"Tx. parcial","dash.table_total_rate":"Tx. total","dash.table_preinc":"Pré-inc.","print.title":"Relatório de Extração Folicular","print.patient_label":"Paciente (código)","print.status_label":"Status","print.mode_label":"Modo","print.index_label":"Índice","print.rate_avg_label":"Ritmo médio","print.fol_per_hour_suffix":" fol./h","print.preinc_per_hour_suffix":" pré-inc./h","print.total_surgery_time_label":"Tempo total da cirurgia","print.mamba_rate_label":"Ritmo pelo Mamba","print.extraction_prefix":"Extração — ","print.mamba_accumulated_label":"Mamba (leitura acumulada)","print.table_hairs_per_follicle":"Fios/folículo","print.table_qty":"Qtde","print.table_total_hairs":"Fios totais","print.table_area":"Área","print.table_preincisions":"Pré-incisões","print.dist_title":"Distribuição de unidades por área","print.table_total":"Total","print.table_grand_total":"Total geral","print.photos_prefix":"Fotos — ","print.generated_at":"Gerado em ","patrep.button":"Relatório para o paciente","patrep.doc_title":"Relatório da sua cirurgia","patrep.hero_title":"Sua restauração capilar, em números","patrep.hero_body":"Este relatório documenta os principais dados da sua cirurgia de transplante capilar por extração folicular (FUE) — do total de folículos implantados aos tempos cirúrgicos.","patrep.seal_caption":"Folículos transplantados","patrep.kpi_index":"Índice folicular","patrep.kpi_total_hairs":"Total de fios","patrep.kpi_total_time":"Tempo total da cirurgia","patrep.section_follicles":"Folículos por tipo","patrep.section_incisions":"Incisões por área","patrep.section_times":"Tempos cirúrgicos","patrep.section_photos":"Fotos","patrep.time_preinc":"Pré-incisões","patrep.time_extraction":"Extração","patrep.time_implant":"Implantação","patrep.time_total":"Tempo total","patrep.footer_signature":"Gerado com Graftis","patrep.patient_label":"Paciente","patrep.crm_prefix":"CRM "},"en":{"common.email":"Email","common.password":"Password","common.confirm_password":"Confirm password","auth.title":"Doctor area","auth.subtitle":"Log in to see and create your own surgeries. Assistants who already have the link to a specific surgery don't need an account — only whoever creates and manages the surgery list needs to log in.","auth.tab_login":"Log in","auth.tab_register":"Create account","auth.login_submit":"Log in","auth.forgot_link":"Forgot my password","auth.forgot_email_label":"Your registered email","auth.forgot_submit":"Send reset link","auth.field_fullname":"Full name","auth.field_crm":"Medical license number","auth.crm_placeholder":"e.g. 123456-SP","auth.field_phone":"Phone number","auth.phone_placeholder":"e.g. +1 555 123 4567","auth.register_submit":"Create account","reset.title":"New password","reset.subtitle":"Choose a new password for your account.","reset.new_password":"New password","reset.confirm_password":"Confirm new password","reset.submit":"Save new password","toast.fill_email_password":"Fill in email and password.","toast.welcome":"Welcome, {name}.","toast.fill_all_fields":"Fill in all fields.","toast.passwords_dont_match":"Passwords don't match.","toast.password_too_short":"Password must be at least 6 characters.","toast.account_created_welcome":"Account created. Welcome, {name}.","toast.logged_out":"You've logged out.","toast.logout_all_confirm":"This logs your account out of ALL devices where you're currently logged in (including this one). You'll need to log in again on each one. Continue?","toast.logged_out_all":"You've logged out of all devices.","toast.generic_error":"Error: {msg}","toast.enter_your_email":"Enter your email.","toast.reset_link_sent_generic":"If that email is registered, we've sent a reset link.","toast.enter_new_password":"Enter the new password.","toast.password_changed_login":"Password changed. Log in with your new password.","errors.invalid_email":"Invalid email.","errors.email_already_registered":"An account with this email already exists.","errors.invalid_credentials":"Incorrect email or password.","errors.invalid_body":"Invalid request body.","errors.reset_link_invalid":"Invalid or expired link. Request a new one from the login screen.","errors.account_not_found":"Account not found.","errors.too_many_registrations":"Too many sign-ups from this address. Try again in a few hours.","errors.too_many_logins":"Too many login attempts. Wait a few minutes and try again.","errors.too_many_forgot":"Too many reset requests from this address. Try again later.","errors.not_authenticated":"Not authenticated.","errors.invalid_image":"Invalid image.","errors.image_processing_error_prefix":"Error processing image: ","errors.login_required_create_surgery":"Log in to create a surgery.","errors.patient_code_required":"Patient code is required.","errors.too_many_missing_session_attempts":"Too many attempts to access nonexistent surgeries from this address. Wait a few minutes.","errors.surgery_not_found_server":"Surgery not found on this server.","errors.surgery_not_found":"Surgery not found.","errors.surgery_already_finalized":"Surgery already finalized.","errors.invalid_parameters":"Invalid parameters.","errors.invalid_quadrant":"Invalid quadrant.","errors.invalid_value":"Invalid value.","errors.invalid_category":"Invalid category.","errors.photo_processing_error_prefix":"Error processing photo: ","errors.photo_not_found":"Photo not found.","errors.surgery_finalized_reopen_timer":"Surgery finalized — reopen it to change the timer.","errors.login_required_delete_surgery":"Log in to delete a surgery.","errors.surgery_not_yours":"This surgery isn't yours.","errors.quadrant_locked":"This quadrant is locked. Reopen it to edit.","errors.value_below_carry":"The value can't be lower than the total already carried from the previous quadrant ({carry}).","errors.invalid_carry_link":"Can't link that quadrant (it would create a cycle).","toast.login_required_dashboard":"Log in to see the dashboard.","toast.server_unreachable":"Couldn't reach the server.","toast.add_at_least_one_value":"Add at least one value.","toast.settings_saved":"Settings saved.","toast.defaults_restored":"Defaults restored.","toast.surgery_deleted":"Surgery deleted.","toast.enter_patient_code":"Enter a patient code or initials.","toast.sync_failed":"Didn't sync: {msg}","toast.uploading_photos":"Uploading {n} photo(s)...","toast.photos_uploaded":"Photo(s) uploaded.","toast.photo_upload_error":"Error uploading photo: {msg}","toast.logo_updated":"Logo updated.","toast.logo_upload_error":"Error uploading logo: {msg}","toast.logo_removed":"Logo removed.","toast.surgery_finalized":"Surgery finalized.","toast.surgery_reopened":"Surgery reopened.","toast.quadrant_finished":"Quadrant finished.","toast.quadrant_reopened":"Quadrant reopened.","toast.address_copied":"Address copied.","toast.copy_failed_manual":"Couldn't copy — select the text manually.","toast.copy_manually":"Copy the address manually: {url}","toast.no_native_share":"This browser doesn't have native sharing — use WhatsApp or Copy.","toast.no_speech_synthesis":"This browser doesn't support speech synthesis.","confirm.delete_surgery":"Permanently delete surgery \"{code}\"? This removes all its counts, pre-incisions, and photos. This action can't be undone.","confirm.delete_photo":"Remove this photo?","confirm.delete_logo":"Remove the logo?","confirm.reset_extraction_timer":"Reset this surgery's timer (affects all connected devices)?","confirm.reset_preinc_timer":"Reset the pre-incision timer (affects all connected devices)?","confirm.finalize_surgery":"Finalize this surgery? This locks the counts on all connected devices.","confirm.finish_quadrant":"Finish counting this quadrant? It will stay locked until you reopen it.","confirm.reopen_quadrant":"Reopen this quadrant to edit it again?","prompt.set_value_for":"Set value for \"{label}\":","prompt.set_quantity_for":"Set quantity for \"{label}\":","errors.file_read_error":"Couldn't read the file.","errors.photo_link_expired":"Access to this photo via the link has expired (surgery finalized more than 90 days ago). Ask the surgery's owner to log in to view it.","email.reset_subject":"Reset your password — Graftis","email.reset_body":"Hi {name},\n\nYou asked to reset your Graftis password.\n\nTap the link below (or copy and paste it into your browser) to choose a new password. This link expires in 30 minutes and only works once:\n\n{url}\n\nIf you didn't request this, just ignore this email — your password stays the same.","nav.home":"Home","nav.dashboard":"Dashboard","nav.config":"Settings","nav.exit":"Log out","common.mode_complete":"Complete","common.mode_reduced":"Reduced","common.open":"Open","common.delete":"Delete","common.cancel":"Cancel","common.ok":"OK","common.save":"Save","common.remove":"Remove","common.back":"Back","home.title":"Your surgeries","home.subtitle":"Only you can see this list. After creating a surgery, share its link with assistants — they update the data live without needing an account.","home.patient_code_label":"Patient code / initials","home.patient_code_placeholder":"e.g. JS-090726","home.count_mode_label":"Counting mode","home.mode_explanation":"Complete: each partial transection is logged by its exact type (2→1, 3→2, etc). Reduced: partial-transection hairs are counted together with intact follicles, and a single partial-transection counter is used to calculate the rate — without detailing the type. Can't be changed after the surgery is created.","home.create_button":"+ New surgery (create session)","home.no_surgeries_yet":"You haven't created any surgeries yet.","config.title":"Settings","config.increments_subtitle":"Extra values for the quick-increment buttons used during extraction counting, besides the -1/+1 that's always shown. This device only — each phone can have its own buttons (e.g. only +1 and +100, or only +50).","config.add_value":"+ Add value","config.restore_default":"Restore default (10 / 50 / 100)","config.identity_title":"Visual identity","config.identity_subtitle":"Applies to your account — shows up on every device where you log in, and also for anyone who opens your surgeries just via the link (without logging in).","config.logo_label":"Logo","config.logo_empty":"No logo yet.","config.theme_label":"Theme color","config.darkmode_label":"Dark mode","config.darkmode_hint":"Clinical colors (intact/partial/total/mini) don't change — only the background and text.","config.language_label":"Idioma / Language / Idioma","config.language_hint":"For now only the login/sign-up screen is translated — the rest of the app is still in Portuguese.","config.security_title":"Account security","config.security_subtitle":"If you lost or lent out a device where you were logged in, use this to end access everywhere at once.","config.logout_all_btn":"Log out of all devices","config.backup_title":"Back up your data","config.backup_subtitle":"Download a file with your account registration and all your surgeries (counts, times, pre-incisions). Doesn't include photos — those are protected separately by Railway's volume backup. Keep this file somewhere safe outside Railway (your computer, Google Drive, etc.).","config.backup_btn":"Download backup","config.back_to_surgery":"Back to surgery","config.audio_title":"Audio and alarms for this surgery","config.audio_subtitle":"Applies only to the surgery you had open, and only on this device — each phone can have its own settings.","config.audio_section_title":"Audio","config.audio_announce_hint":"Announces out loud the total follicles extracted (adding up all 4 quadrants) every N.","config.audio_announce_every":"Announce every","config.audio_test_btn":"Test voice","config.preinc_audio_section_title":"Pre-incision audio","config.preinc_audio_announce_hint":"Announces out loud the new pre-incision total (adding up all areas) every time you fill in an area's value.","config.quadfinish_audio_section_title":"Quadrant-finish audio","config.quadfinish_audio_announce_hint":"Announces the Mamba reading, the extracted follicles, and the difference every time you tap \"Finish count\" on a quadrant (only available when chain counting is in use).","config.alarm_section_title":"Transection alarm","config.alarm_subtitle":"Announces by voice as soon as the rate (adding up all 4 quadrants) goes over the limit you set.","config.alert_partial_label":"Alert if partial transection goes over (%)","config.alert_partial_placeholder":"e.g. 7","config.alert_total_label":"Alert if total transection goes over (%)","config.alert_total_placeholder":"e.g. 5","cat.f1":"1 hair","cat.f2":"2 hairs","cat.f3":"3 hairs","cat.f4":"4 hairs","cat.f1fino":"1 hair (special)","cat.f2fino":"2 hairs (special)","cat.t2_1":"2 → 1 hair","cat.t3_2":"3 → 2 hairs","cat.t3_1":"3 → 1 hair","cat.t4_3":"4 → 3 hairs","cat.t4_2":"4 → 2 hairs","cat.t4_1":"4 → 1 hair","cat.parcial_geral":"Partial transection","cat.ttotal":"Total transection (lost follicle)","cat.mini":"Mini (miniaturized)","quad.temporal_dir":"Right temporal","quad.temporal_esq":"Left temporal","quad.occipital_dir":"Right occipital","quad.occipital_esq":"Left occipital","preinc.recesso_dir":"Right recess","preinc.recesso_esq":"Left recess","preinc.linha":"Hairline","preinc.sublinha":"Sub-hairline","preinc.entrada_dir1":"Right entry 1","preinc.entrada_dir2":"Right entry 2","preinc.entrada_esq1":"Left entry 1","preinc.entrada_esq2":"Left entry 2","preinc.topete1":"Forelock 1","preinc.topete2":"Forelock 2","preinc.scalp":"Scalp","preinc.coroa":"Crown","common.start":"Start","common.pause":"Pause","common.reset":"Reset","common.status_finalized":"Finalized","common.status_in_progress":"In progress","cnt.share_btn":"🔗 Share","cnt.tab_extracao":"Extraction","cnt.tab_preinc":"Pre-incisions","cnt.tab_fotos":"Photos","cnt.tab_paciente":"Patient","cnt.tab_resumo":"Final Summary","cnt.final_summary_title":"Final surgery summary","cnt.final_times_title":"Times","cnt.final_categories_title":"Follicles by category","cnt.final_preinc_title":"Pre-incision summary","cnt.final_preinc_diff":"Difference (follicles extracted − pre-incisions)","patient.section_title":"Patient info","patient.section_hint":"Optional — fill it out now, later, or never. Doesn't block anything about the surgery.","patient.age_label":"Age","patient.age_placeholder":"e.g. 45","patient.height_label":"Height (cm)","patient.height_placeholder":"e.g. 175","patient.weight_label":"Weight (kg)","patient.weight_placeholder":"e.g. 80","patient.hair_thickness_label":"Hair thickness","patient.hair_thin":"Thin","patient.hair_thick":"Thick","patient.hair_texture_label":"Hair texture","patient.hair_straight":"Straight","patient.hair_wavy":"Wavy","patient.hair_curly":"Curly","patient.surgery_type_label":"Surgery type","patient.with_shaving":"With shaving","patient.without_shaving":"Without shaving","home.patient_info_toggle":"Patient info (optional)","cnt.extraction_time_title":"Extraction time","cnt.rate_hint":"Average rate: {rate} follicles/hour","cnt.summary_general_title":"Overall summary (all quadrants)","cnt.summary_extracted":"Follicles extracted","cnt.summary_total_hairs":"Total hairs","cnt.summary_index":"Hairs/follicle index","cnt.summary_partial_transec":"Partial transection","cnt.summary_total_transec":"Total transection","cnt.summary_mini":"Mini (not in total)","cnt.mamba_reading":"Mamba (final reading)","cnt.mamba_diff":"Difference","cnt.mamba_diffpct":"Difference (% of Mamba)","cnt.mamba_diff_extraidos":"Difference (Mamba − Extracted)","cnt.mamba_diffpct_extraidos":"Difference (% Mamba × Extracted)","cnt.mamba_rate":"Rate by Mamba (follicles/h)","cnt.mamba_hint":"Fill in the Mamba value in the order quadrants are extracted. It's the device's cumulative reading at the end of this quadrant — the app calculates the difference from the previous quadrant automatically.","cnt.mamba_input_label":"Mamba (cumulative reading at the end of this quadrant)","cnt.mamba_input_placeholder":"e.g. 1000","cnt.mamba_quad_val":"Mamba for this quadrant","cnt.mamba_quad_duration":"Time for this quadrant","cnt.chain_title":"Chained count","cnt.chain_hint_none":"This quadrant starts from zero.","cnt.chain_hint_from":"Counting from: {label} ({total})","cnt.carry_from_label":"Carry count from","cnt.carry_from_none_option":"None (start from zero)","cnt.quadrant_finish_btn":"Count finished","cnt.quadrant_reopen_btn":"Reopen quadrant","cnt.group_integro_title":"Intact follicles","cnt.group_parcial_title":"Partial transection (follicle used)","cnt.parcial_reduzido_hint":"Reduced mode: log this follicle's hairs normally under \"Intact follicles\" and tap here only to count the partial transection (it isn't added again to the total).","cnt.group_mini_title":"Mini","cnt.mini_hint":"Miniaturized follicles — not included in the overall count of follicles extracted, hairs, or rates, but logged here so they aren't lost.","preinc.time_title":"Pre-incision time","preinc.total_label":"Total pre-incisions","preinc.by_area_title":"Pre-incisions by area","preinc.area_hint":"Tap the number on top to enter the area's total. UF1/UF2/UF3 below = how many follicular units of 1, 2, or 3 hairs go to that area.","photos.marcacao_title":"Surgical marking","photos.marcacao_hint":"Saved on this server — visible on every connected phone.","photos.posop_title":"Immediate post-op","cnt.print_btn":"Print / Save PDF","cnt.finalize_btn":"Finalize surgery","cnt.reopen_btn":"Reopen","share.title":"Share surgery","share.url_label":"This surgery's address (share it with other phones)","share.share_link_btn":"Share link","share.whatsapp_btn":"Send via WhatsApp","share.copy_btn":"Copy","audio.test_phrase":"Audio test. One hundred twenty-three follicles.","audio.milestone":"{n} follicles.","audio.preinc_update":"{n} pre-incisions.","audio.quadfinish_summary":"Mamba {mamba}. Extracted follicles {extraidos}. Difference {diffpct} percent.","audio.quadfinish_extraidos_only":"Extracted follicles {extraidos}.","cnt.mode_full":"Complete mode","cnt.mode_reduced":"Reduced mode","cnt.global_not_started":"Total time: not started yet","cnt.global_timer_prefix":"⏱ Total surgery time: ","cnt.global_finalized_suffix":" (finalized)","cnt.global_in_progress_suffix":" (in progress)","preinc.rate_hint":"Average rate: {rate} pre-incisions/hour","cnt.hair_singular":"hair","cnt.hair_plural":"hairs","cnt.per_follicle_suffix":" per follicle","cnt.hairs_not_in_total":"not included in the overall count","cnt.hairs_informative_only":"informational count only","cnt.hairs_lost":"0 hairs (lost)","dash.title":"Dashboard","dash.subtitle":"Statistics calculated only from finalized surgeries — surgeries in progress have partial data and are excluded, to avoid skewing the averages.","dash.empty":"You don't have any finalized surgeries yet. Statistics appear here as soon as the first one is finalized.","dash.extracted_by_surgery_title":"Follicles extracted per surgery","dash.extracted_by_surgery_hint":"Each bar is a finalized surgery, in chronological order — you can see whether volume per surgery is rising or falling over time.","dash.index_by_surgery_title":"Hairs/follicle index per surgery","dash.index_by_surgery_hint":"Each bar is a finalized surgery, in chronological order.","dash.uf_distribution_title":"Distribution by follicular unit type","dash.uf_distribution_hint":"Percentage across all intact follicles, adding up all finalized surgeries.","dash.transec_rate_title":"Transection rate per surgery","dash.transec_rate_hint":"Complete mode and reduced mode calculate the rate differently — that's why they're on separate tabs, don't mix the numbers.","dash.mode_all":"All","dash.rate_todos_hint":"This is just to see the chronological trend across all surgeries together — each bar uses that surgery's own correct rate. There's no \"overall average rate\" because complete and reduced calculate the rate differently. To see the average, use the Complete or Reduced tabs.","dash.rate_empty":"No finalized surgeries in this mode yet.","dash.quad_index_title":"Index and transection by quadrant","dash.quad_hint":"Uses the same Complete/Reduced/All tab above. Mamba × bench difference only counts toward the average for surgeries where Mamba was filled in for that quadrant.","dash.quad_todos_hint":"On the \"All\" tab these averages disappear for the same reason as the transection rate — complete and reduced aren't comparable. Use the Complete or Reduced tabs.","dash.finalized_surgeries_title":"Finalized surgeries","dash.stat_extracted_total":"Follicles extracted (total)","dash.stat_hairs_total":"Hairs transplanted (total)","dash.stat_avg_index":"Average index","dash.stat_preinc_avg":"Pre-incisions average/surgery","dash.stat_preinc_total":"Total pre-incisions","dash.stat_follicles_per_min":"Follicles/minute (average)","dash.stat_avg_time_per_1000":"Average time per 1000 units","dash.stat_minis_per_1000":"Minis per 1000 follicles","dash.stat_surgeries_all_modes":"Surgeries (all modes)","dash.stat_in_complete_mode":"— in complete mode","dash.stat_in_reduced_mode":"— in reduced mode","dash.stat_surgeries_mode_complete":"Surgeries (complete)","dash.stat_surgeries_mode_reduced":"Surgeries (reduced)","dash.stat_partial_rate_avg":"Average partial rate","dash.stat_total_rate_avg":"Average total rate","dash.no_data_yet":"Not enough data yet.","dash.table_quadrant":"Quadrant","dash.table_surgeries":"Surgeries","dash.table_avg_index":"Average index","dash.table_partial_rate_avg":"Avg. partial rate","dash.table_total_rate_avg":"Avg. total rate","dash.table_mamba_vs_bench":"Mamba × bench","dash.table_category":"Category","dash.table_quantity":"Quantity","dash.table_pct_intact":"% of intact","dash.table_surgery":"Surgery","dash.table_date":"Date","dash.table_mode":"Mode","dash.table_extracted":"Extracted","dash.table_index":"Index","dash.table_partial_rate":"Partial rate","dash.table_total_rate":"Total rate","dash.table_preinc":"Pre-inc.","print.title":"Follicular Extraction Report","print.patient_label":"Patient (code)","print.status_label":"Status","print.mode_label":"Mode","print.index_label":"Index","print.rate_avg_label":"Average rate","print.fol_per_hour_suffix":" follicles/h","print.preinc_per_hour_suffix":" pre-inc./h","print.total_surgery_time_label":"Total surgery time","print.mamba_rate_label":"Rate by Mamba","print.extraction_prefix":"Extraction — ","print.mamba_accumulated_label":"Mamba (cumulative reading)","print.table_hairs_per_follicle":"Hairs/follicle","print.table_qty":"Qty","print.table_total_hairs":"Total hairs","print.table_area":"Area","print.table_preincisions":"Pre-incisions","print.dist_title":"Unit distribution by area","print.table_total":"Total","print.table_grand_total":"Grand total","print.photos_prefix":"Photos — ","print.generated_at":"Generated on ","patrep.button":"Patient report","patrep.doc_title":"Your surgery report","patrep.hero_title":"Your hair restoration, in numbers","patrep.hero_body":"This report documents the key data from your FUE hair transplant surgery — from the total grafts implanted to the surgical times.","patrep.seal_caption":"Grafts transplanted","patrep.kpi_index":"Follicular index","patrep.kpi_total_hairs":"Total hairs","patrep.kpi_total_time":"Total surgery time","patrep.section_follicles":"Grafts by type","patrep.section_incisions":"Incisions by area","patrep.section_times":"Surgical times","patrep.section_photos":"Photos","patrep.time_preinc":"Pre-incisions","patrep.time_extraction":"Extraction","patrep.time_implant":"Implantation","patrep.time_total":"Total time","patrep.footer_signature":"Generated with Graftis","patrep.patient_label":"Patient","patrep.crm_prefix":"License "},"es":{"common.email":"Correo electrónico","common.password":"Contraseña","common.confirm_password":"Confirmar contraseña","auth.title":"Área del médico","auth.subtitle":"Inicia sesión para ver y crear tus propias cirugías. Los auxiliares que ya tienen el enlace de una cirugía específica no necesitan cuenta — solo quien crea y gestiona la lista de cirugías necesita iniciar sesión.","auth.tab_login":"Iniciar sesión","auth.tab_register":"Crear cuenta","auth.login_submit":"Iniciar sesión","auth.forgot_link":"Olvidé mi contraseña","auth.forgot_email_label":"Su correo registrado","auth.forgot_submit":"Enviar enlace de restablecimiento","auth.field_fullname":"Nombre completo","auth.field_crm":"Número de colegiado / matrícula profesional","auth.crm_placeholder":"Ej: 123456-SP","auth.field_phone":"Teléfono","auth.phone_placeholder":"Ej: +34 612 345 678","auth.register_submit":"Crear cuenta","reset.title":"Nueva contraseña","reset.subtitle":"Elige una nueva contraseña para tu cuenta.","reset.new_password":"Nueva contraseña","reset.confirm_password":"Confirmar nueva contraseña","reset.submit":"Guardar nueva contraseña","toast.fill_email_password":"Complete el correo y la contraseña.","toast.welcome":"Bienvenido/a, {name}.","toast.fill_all_fields":"Complete todos los campos.","toast.passwords_dont_match":"Las contraseñas no coinciden.","toast.password_too_short":"La contraseña debe tener al menos 6 caracteres.","toast.account_created_welcome":"Cuenta creada. Bienvenido/a, {name}.","toast.logged_out":"Cerraste sesión.","toast.logout_all_confirm":"Esto cierra la sesión de tu cuenta en TODOS los dispositivos donde esté conectada (incluido este). Tendrás que iniciar sesión de nuevo en cada uno. ¿Continuar?","toast.logged_out_all":"Cerraste sesión en todos los dispositivos.","toast.generic_error":"Error: {msg}","toast.enter_your_email":"Ingrese su correo.","toast.reset_link_sent_generic":"Si ese correo está registrado, enviamos un enlace de restablecimiento.","toast.enter_new_password":"Ingrese la nueva contraseña.","toast.password_changed_login":"Contraseña cambiada. Inicia sesión con la nueva contraseña.","errors.invalid_email":"Correo inválido.","errors.email_already_registered":"Ya existe una cuenta con este correo.","errors.invalid_credentials":"Correo o contraseña incorrectos.","errors.invalid_body":"Cuerpo de solicitud inválido.","errors.reset_link_invalid":"Enlace inválido o caducado. Solicite uno nuevo desde la pantalla de inicio de sesión.","errors.account_not_found":"Cuenta no encontrada.","errors.too_many_registrations":"Demasiados registros desde esta dirección. Vuelva a intentarlo en unas horas.","errors.too_many_logins":"Demasiados intentos de inicio de sesión. Espere unos minutos e intente de nuevo.","errors.too_many_forgot":"Demasiadas solicitudes de restablecimiento desde esta dirección. Vuelva a intentarlo más tarde.","errors.not_authenticated":"No autenticado.","errors.invalid_image":"Imagen inválida.","errors.image_processing_error_prefix":"Error al procesar la imagen: ","errors.login_required_create_surgery":"Inicia sesión para crear una cirugía.","errors.patient_code_required":"El código del paciente es obligatorio.","errors.too_many_missing_session_attempts":"Demasiados intentos de acceso a cirugías inexistentes desde esta dirección. Espere unos minutos.","errors.surgery_not_found_server":"Cirugía no encontrada en este servidor.","errors.surgery_not_found":"Cirugía no encontrada.","errors.surgery_already_finalized":"Cirugía ya finalizada.","errors.invalid_parameters":"Parámetros inválidos.","errors.invalid_quadrant":"Cuadrante inválido.","errors.invalid_value":"Valor inválido.","errors.invalid_category":"Categoría inválida.","errors.photo_processing_error_prefix":"Error al procesar la foto: ","errors.photo_not_found":"Foto no encontrada.","errors.surgery_finalized_reopen_timer":"Cirugía finalizada — reábrela para modificar el cronómetro.","errors.login_required_delete_surgery":"Inicia sesión para eliminar una cirugía.","errors.surgery_not_yours":"Esta cirugía no es tuya.","errors.quadrant_locked":"Este cuadrante está bloqueado. Reábrelo para editar.","errors.value_below_carry":"El valor no puede ser menor que el total ya traído del cuadrante anterior ({carry}).","errors.invalid_carry_link":"No se puede vincular ese cuadrante (crearía un ciclo).","toast.login_required_dashboard":"Inicia sesión para ver el dashboard.","toast.server_unreachable":"No pude comunicarme con el servidor.","toast.add_at_least_one_value":"Agrega al menos un valor.","toast.settings_saved":"Configuración guardada.","toast.defaults_restored":"Predeterminados restaurados.","toast.surgery_deleted":"Cirugía eliminada.","toast.enter_patient_code":"Ingresa un código o las iniciales del paciente.","toast.sync_failed":"No se sincronizó: {msg}","toast.uploading_photos":"Enviando {n} foto(s)...","toast.photos_uploaded":"Foto(s) enviada(s).","toast.photo_upload_error":"Error al enviar la foto: {msg}","toast.logo_updated":"Logotipo actualizado.","toast.logo_upload_error":"Error al enviar el logotipo: {msg}","toast.logo_removed":"Logotipo eliminado.","toast.surgery_finalized":"Cirugía finalizada.","toast.surgery_reopened":"Cirugía reabierta.","toast.quadrant_finished":"Cuadrante finalizado.","toast.quadrant_reopened":"Cuadrante reabierto.","toast.address_copied":"Dirección copiada.","toast.copy_failed_manual":"No se pudo copiar — selecciona el texto manualmente.","toast.copy_manually":"Copia la dirección manualmente: {url}","toast.no_native_share":"Este navegador no tiene la opción de compartir directo — usa WhatsApp o Copiar.","toast.no_speech_synthesis":"Este navegador no tiene síntesis de voz.","confirm.delete_surgery":"¿Eliminar la cirugía \"{code}\" definitivamente? Esto elimina todos sus conteos, pre-incisiones y fotos. Esta acción no se puede deshacer.","confirm.delete_photo":"¿Quitar esta foto?","confirm.delete_logo":"¿Quitar el logotipo?","confirm.reset_extraction_timer":"¿Reiniciar el cronómetro de esta cirugía (afecta a todos los dispositivos conectados)?","confirm.reset_preinc_timer":"¿Reiniciar el cronómetro de pre-incisiones (afecta a todos los dispositivos conectados)?","confirm.finalize_surgery":"¿Finalizar esta cirugía? Esto bloquea los conteos en todos los dispositivos conectados.","confirm.finish_quadrant":"¿Finalizar el conteo de este cuadrante? Quedará bloqueado hasta que lo reabras.","confirm.reopen_quadrant":"¿Reabrir este cuadrante para editar de nuevo?","prompt.set_value_for":"Definir valor para \"{label}\":","prompt.set_quantity_for":"Definir cantidad de \"{label}\":","errors.file_read_error":"No pude leer el archivo.","errors.photo_link_expired":"El acceso a esta foto por el enlace expiró (cirugía finalizada hace más de 90 días). Pide al médico dueño de la cirugía que inicie sesión para verla.","email.reset_subject":"Restablecer tu contraseña — Graftis","email.reset_body":"Hola, {name}.\n\nSolicitaste restablecer tu contraseña en Graftis.\n\nToca el enlace de abajo (o cópialo y pégalo en tu navegador) para elegir una nueva contraseña. Este enlace caduca en 30 minutos y solo funciona una vez:\n\n{url}\n\nSi no solicitaste esto, simplemente ignora este correo — tu contraseña sigue siendo la misma.","nav.home":"Inicio","nav.dashboard":"Dashboard","nav.config":"Config.","nav.exit":"Salir","common.mode_complete":"Completo","common.mode_reduced":"Reducido","common.open":"Abrir","common.delete":"Eliminar","common.cancel":"Cancelar","common.ok":"OK","common.save":"Guardar","common.remove":"Quitar","common.back":"Volver","home.title":"Tus cirugías","home.subtitle":"Solo tú ves esta lista. Después de crear la cirugía, comparte el enlace con los auxiliares — ellos actualizan los datos en vivo sin necesitar cuenta.","home.patient_code_label":"Código / iniciales del paciente","home.patient_code_placeholder":"Ej: JS-090726","home.count_mode_label":"Modo de conteo","home.mode_explanation":"Completo: cada transección parcial se registra en el tipo exacto (2→1, 3→2, etc). Reducido: los pelos de la transección parcial entran junto con los folículos íntegros, y se usa un único contador de transección parcial para calcular la tasa — sin detallar el tipo. No se puede cambiar después de creada.","home.create_button":"+ Nueva cirugía (crear sesión)","home.no_surgeries_yet":"Aún no has creado ninguna cirugía.","config.title":"Configuración","config.increments_subtitle":"Valores extra de los botones de incremento rápido usados en el conteo de extracción, además del -1/+1 que siempre aparece. Configuración solo de este dispositivo — cada celular puede tener sus propios botones (por ejemplo, solo +1 y +100, o solo +50).","config.add_value":"+ Agregar valor","config.restore_default":"Restaurar predeterminado (10 / 50 / 100)","config.identity_title":"Identidad visual","config.identity_subtitle":"Se aplica a tu cuenta — aparece en todos los dispositivos donde inicies sesión, y también para quien acceda a tus cirugías solo por el enlace (sin iniciar sesión).","config.logo_label":"Logotipo","config.logo_empty":"Aún no hay logotipo.","config.theme_label":"Color del tema","config.darkmode_label":"Modo oscuro","config.darkmode_hint":"Los colores clínicos (íntegro/parcial/total/mini) no cambian — solo el fondo y los textos.","config.language_label":"Idioma / Language / Idioma","config.language_hint":"Por ahora solo la pantalla de inicio de sesión/registro está traducida — el resto de la app sigue en portugués.","config.security_title":"Seguridad de la cuenta","config.security_subtitle":"Si perdiste o prestaste un dispositivo donde habías iniciado sesión, usa esto para cerrar el acceso en todos lados de una vez.","config.logout_all_btn":"Cerrar sesión en todos los dispositivos","config.backup_title":"Copia de seguridad de tus datos","config.backup_subtitle":"Descarga un archivo con el registro de tu cuenta y todas tus cirugías (conteos, tiempos, preincisiones). No incluye las fotos — esas están protegidas por separado por la copia de seguridad de volumen de Railway. Guarda este archivo en un lugar seguro fuera de Railway (tu computadora, Google Drive, etc.).","config.backup_btn":"Descargar copia de seguridad","config.back_to_surgery":"Volver a la cirugía","config.audio_title":"Audio y alarmas de esta cirugía","config.audio_subtitle":"Se aplica solo a la cirugía que tenías abierta y solo en este dispositivo — cada celular puede tener sus propios ajustes.","config.audio_section_title":"Audio","config.audio_announce_hint":"Anuncia en voz alta el total de folículos extraídos (sumando los 4 cuadrantes) cada N.","config.audio_announce_every":"Anunciar cada","config.audio_test_btn":"Probar voz","config.preinc_audio_section_title":"Audio de pre-incisiones","config.preinc_audio_announce_hint":"Anuncia en voz alta el nuevo total de pre-incisiones (sumando todas las áreas) cada vez que completes el valor de un área.","config.quadfinish_audio_section_title":"Audio al finalizar cuadrante","config.quadfinish_audio_announce_hint":"Anuncia el Mamba, los folículos extraídos y la diferencia cada vez que toques \"Conteo finalizado\" en un cuadrante (solo disponible cuando se usa el conteo en cadena).","config.alarm_section_title":"Alarma de transección","config.alarm_subtitle":"Avisa por voz apenas la tasa (sumando los 4 cuadrantes) supere el límite que definas.","config.alert_partial_label":"Avisar si la transección parcial supera (%)","config.alert_partial_placeholder":"Ej: 7","config.alert_total_label":"Avisar si la transección total supera (%)","config.alert_total_placeholder":"Ej: 5","cat.f1":"1 pelo","cat.f2":"2 pelos","cat.f3":"3 pelos","cat.f4":"4 pelos","cat.f1fino":"1 pelo especial","cat.f2fino":"2 pelos especial","cat.t2_1":"2 → 1 pelo","cat.t3_2":"3 → 2 pelos","cat.t3_1":"3 → 1 pelo","cat.t4_3":"4 → 3 pelos","cat.t4_2":"4 → 2 pelos","cat.t4_1":"4 → 1 pelo","cat.parcial_geral":"Transección parcial","cat.ttotal":"Transección total (folículo perdido)","cat.mini":"Mini (miniaturizado)","quad.temporal_dir":"Temporal derecho","quad.temporal_esq":"Temporal izquierdo","quad.occipital_dir":"Occipital derecho","quad.occipital_esq":"Occipital izquierdo","preinc.recesso_dir":"Receso derecho","preinc.recesso_esq":"Receso izquierdo","preinc.linha":"Línea","preinc.sublinha":"Sublínea","preinc.entrada_dir1":"Entrada derecha 1","preinc.entrada_dir2":"Entrada derecha 2","preinc.entrada_esq1":"Entrada izquierda 1","preinc.entrada_esq2":"Entrada izquierda 2","preinc.topete1":"Tupé 1","preinc.topete2":"Tupé 2","preinc.scalp":"Scalp","preinc.coroa":"Corona","common.start":"Iniciar","common.pause":"Pausar","common.reset":"Reiniciar","common.status_finalized":"Finalizada","common.status_in_progress":"En curso","cnt.share_btn":"🔗 Compartir","cnt.tab_extracao":"Extracción","cnt.tab_preinc":"Pre-incisiones","cnt.tab_fotos":"Fotos","cnt.tab_paciente":"Paciente","cnt.tab_resumo":"Resumen Final","cnt.final_summary_title":"Resumen final de la cirugía","cnt.final_times_title":"Tiempos","cnt.final_categories_title":"Folículos por categoría","cnt.final_preinc_title":"Resumen de preincisiones","cnt.final_preinc_diff":"Diferencia (folículos extraídos − preincisiones)","patient.section_title":"Datos del paciente","patient.section_hint":"Opcional — complételo ahora, después o nunca. No bloquea nada de la cirugía.","patient.age_label":"Edad","patient.age_placeholder":"Ej: 45","patient.height_label":"Altura (cm)","patient.height_placeholder":"Ej: 175","patient.weight_label":"Peso (kg)","patient.weight_placeholder":"Ej: 80","patient.hair_thickness_label":"Espesor del cabello","patient.hair_thin":"Fino","patient.hair_thick":"Grueso","patient.hair_texture_label":"Textura del cabello","patient.hair_straight":"Liso","patient.hair_wavy":"Ondulado","patient.hair_curly":"Crespo","patient.surgery_type_label":"Tipo de cirugía","patient.with_shaving":"Con rasurado","patient.without_shaving":"Sin rasurado","home.patient_info_toggle":"Datos del paciente (opcional)","cnt.extraction_time_title":"Tiempo de extracción","cnt.rate_hint":"Ritmo promedio: {rate} folículos/hora","cnt.summary_general_title":"Resumen general (todos los cuadrantes)","cnt.summary_extracted":"Folículos extraídos","cnt.summary_total_hairs":"Total de pelos","cnt.summary_index":"Índice pelos/folículo","cnt.summary_partial_transec":"Transección parcial","cnt.summary_total_transec":"Transección total","cnt.summary_mini":"Mini (fuera del total)","cnt.mamba_reading":"Mamba (lectura final)","cnt.mamba_diff":"Diferencia","cnt.mamba_diffpct":"Diferencia (% del Mamba)","cnt.mamba_diff_extraidos":"Diferencia (Mamba − Extraídos)","cnt.mamba_diffpct_extraidos":"Diferencia (% Mamba × Extraídos)","cnt.mamba_rate":"Ritmo según Mamba (fol./h)","cnt.mamba_hint":"Completa el Mamba en el orden en que se extraen los cuadrantes. El valor es la lectura acumulada del aparato al final de este cuadrante — la app calcula sola la diferencia respecto al cuadrante anterior.","cnt.mamba_input_label":"Mamba (lectura acumulada al final de este cuadrante)","cnt.mamba_input_placeholder":"Ej: 1000","cnt.mamba_quad_val":"Mamba de este cuadrante","cnt.mamba_quad_duration":"Tiempo de este cuadrante","cnt.chain_title":"Conteo en cadena","cnt.chain_hint_none":"Este cuadrante empieza desde cero.","cnt.chain_hint_from":"Contando a partir de: {label} ({total})","cnt.carry_from_label":"Cargar conteo de","cnt.carry_from_none_option":"Ninguno (empezar desde cero)","cnt.quadrant_finish_btn":"Conteo finalizado","cnt.quadrant_reopen_btn":"Reabrir cuadrante","cnt.group_integro_title":"Folículos íntegros","cnt.group_parcial_title":"Transección parcial (folículo aprovechado)","cnt.parcial_reduzido_hint":"Modo reducido: registra los pelos de ese folículo normalmente en \"Folículos íntegros\" y toca aquí solo para contar la transección parcial (no se suma de nuevo al total).","cnt.group_mini_title":"Mini","cnt.mini_hint":"Folículos miniaturizados — no entran en el conteo general de folículos extraídos, pelos o tasas, pero quedan registrados aquí para no perderse.","preinc.time_title":"Tiempo de pre-incisiones","preinc.total_label":"Total de pre-incisiones","preinc.by_area_title":"Pre-incisiones por área","preinc.area_hint":"Toca el número de arriba para escribir el total del área. UF1/UF2/UF3 abajo = cuántas unidades foliculares de 1, 2 o 3 pelos van a esa área.","photos.marcacao_title":"Marcación quirúrgica","photos.marcacao_hint":"Se guardan en este servidor — visibles en todos los celulares conectados.","photos.posop_title":"Posoperatorio inmediato","cnt.print_btn":"Imprimir / Guardar PDF","cnt.finalize_btn":"Finalizar cirugía","cnt.reopen_btn":"Reabrir","share.title":"Compartir cirugía","share.url_label":"Dirección de esta cirugía (compártela con los otros celulares)","share.share_link_btn":"Compartir enlace","share.whatsapp_btn":"Enviar por WhatsApp","share.copy_btn":"Copiar","audio.test_phrase":"Prueba de audio. Ciento veintitrés folículos.","audio.milestone":"{n} folículos.","audio.preinc_update":"{n} pre-incisiones.","audio.quadfinish_summary":"Mamba {mamba}. Folículos extraídos {extraidos}. Diferencia {diffpct} por ciento.","audio.quadfinish_extraidos_only":"Folículos extraídos {extraidos}.","cnt.mode_full":"Modo completo","cnt.mode_reduced":"Modo reducido","cnt.global_not_started":"Tiempo total: aún no iniciado","cnt.global_timer_prefix":"⏱ Tiempo total de la cirugía: ","cnt.global_finalized_suffix":" (finalizado)","cnt.global_in_progress_suffix":" (en curso)","preinc.rate_hint":"Ritmo promedio: {rate} pre-incisiones/hora","cnt.hair_singular":"pelo","cnt.hair_plural":"pelos","cnt.per_follicle_suffix":" por folículo","cnt.hairs_not_in_total":"no entra en el conteo general","cnt.hairs_informative_only":"solo conteo informativo","cnt.hairs_lost":"0 pelos (perdido)","dash.title":"Dashboard","dash.subtitle":"Estadísticas calculadas solo con cirugías finalizadas — las cirugías en curso tienen datos parciales y quedan fuera, para no distorsionar los promedios.","dash.empty":"Aún no tienes ninguna cirugía finalizada. Las estadísticas aparecen aquí en cuanto se finalice la primera.","dash.extracted_by_surgery_title":"Folículos extraídos por cirugía","dash.extracted_by_surgery_hint":"Cada barra es una cirugía finalizada, en orden cronológico — permite ver si el volumen por cirugía sube o baja con el tiempo.","dash.index_by_surgery_title":"Índice pelos/folículo por cirugía","dash.index_by_surgery_hint":"Cada barra es una cirugía finalizada, en orden cronológico.","dash.uf_distribution_title":"Distribución por tipo de unidad folicular","dash.uf_distribution_hint":"Porcentaje entre todos los folículos íntegros, sumando todas las cirugías finalizadas.","dash.transec_rate_title":"Tasa de transección por cirugía","dash.transec_rate_hint":"El modo completo y el modo reducido calculan la tasa de formas distintas — por eso están en pestañas separadas, no mezcles los números.","dash.mode_all":"Todos","dash.rate_todos_hint":"Esto es solo para ver la evolución cronológica de todas las cirugías juntas — cada barra usa la tasa correcta de su propia cirugía. No existe una \"tasa promedio general\" porque completo y reducido calculan la tasa de formas distintas. Para ver el promedio, usa las pestañas Completo o Reducido.","dash.rate_empty":"Ninguna cirugía finalizada en este modo todavía.","dash.quad_index_title":"Índice y transección por cuadrante","dash.quad_hint":"Usa la misma pestaña Completo/Reducido/Todos de arriba. La diferencia Mamba × banco solo entra en el promedio de las cirugías donde se completó el Mamba en ese cuadrante.","dash.quad_todos_hint":"En la pestaña \"Todos\" estos promedios desaparecen por el mismo motivo que la tasa de transección — completo y reducido no son comparables. Usa las pestañas Completo o Reducido.","dash.finalized_surgeries_title":"Cirugías finalizadas","dash.stat_extracted_total":"Folículos extraídos (total)","dash.stat_hairs_total":"Pelos trasplantados (total)","dash.stat_avg_index":"Índice promedio","dash.stat_preinc_avg":"Pre-incisiones promedio/cirugía","dash.stat_preinc_total":"Total de pre-incisiones","dash.stat_follicles_per_min":"Folículos/minuto (promedio)","dash.stat_avg_time_per_1000":"Tiempo promedio por 1000 unidades","dash.stat_minis_per_1000":"Minis por 1000 folículos","dash.stat_surgeries_all_modes":"Cirugías (todos los modos)","dash.stat_in_complete_mode":"— en modo completo","dash.stat_in_reduced_mode":"— en modo reducido","dash.stat_surgeries_mode_complete":"Cirugías (completo)","dash.stat_surgeries_mode_reduced":"Cirugías (reducido)","dash.stat_partial_rate_avg":"Tasa parcial promedio","dash.stat_total_rate_avg":"Tasa total promedio","dash.no_data_yet":"Aún no hay datos suficientes.","dash.table_quadrant":"Cuadrante","dash.table_surgeries":"Cirugías","dash.table_avg_index":"Índice promedio","dash.table_partial_rate_avg":"Tasa parcial prom.","dash.table_total_rate_avg":"Tasa total prom.","dash.table_mamba_vs_bench":"Mamba × banco","dash.table_category":"Categoría","dash.table_quantity":"Cantidad","dash.table_pct_intact":"% de íntegros","dash.table_surgery":"Cirugía","dash.table_date":"Fecha","dash.table_mode":"Modo","dash.table_extracted":"Extraídos","dash.table_index":"Índice","dash.table_partial_rate":"Tasa parcial","dash.table_total_rate":"Tasa total","dash.table_preinc":"Pre-inc.","print.title":"Informe de Extracción Folicular","print.patient_label":"Paciente (código)","print.status_label":"Estado","print.mode_label":"Modo","print.index_label":"Índice","print.rate_avg_label":"Ritmo promedio","print.fol_per_hour_suffix":" fol./h","print.preinc_per_hour_suffix":" pre-inc./h","print.total_surgery_time_label":"Tiempo total de la cirugía","print.mamba_rate_label":"Ritmo según Mamba","print.extraction_prefix":"Extracción — ","print.mamba_accumulated_label":"Mamba (lectura acumulada)","print.table_hairs_per_follicle":"Pelos/folículo","print.table_qty":"Cant.","print.table_total_hairs":"Total de pelos","print.table_area":"Área","print.table_preincisions":"Pre-incisiones","print.dist_title":"Distribución de unidades por área","print.table_total":"Total","print.table_grand_total":"Total general","print.photos_prefix":"Fotos — ","print.generated_at":"Generado el ","patrep.button":"Informe para el paciente","patrep.doc_title":"Informe de su cirugía","patrep.hero_title":"Su restauración capilar, en números","patrep.hero_body":"Este informe documenta los datos principales de su cirugía de trasplante capilar por extracción folicular (FUE) — desde el total de folículos implantados hasta los tiempos quirúrgicos.","patrep.seal_caption":"Folículos trasplantados","patrep.kpi_index":"Índice folicular","patrep.kpi_total_hairs":"Total de pelos","patrep.kpi_total_time":"Tiempo total de la cirugía","patrep.section_follicles":"Folículos por tipo","patrep.section_incisions":"Incisiones por área","patrep.section_times":"Tiempos quirúrgicos","patrep.section_photos":"Fotos","patrep.time_preinc":"Preincisiones","patrep.time_extraction":"Extracción","patrep.time_implant":"Implantación","patrep.time_total":"Tiempo total","patrep.footer_signature":"Generado con Graftis","patrep.patient_label":"Paciente","patrep.crm_prefix":"Matrícula "}};
function t(key, vars){
  var dict = STRINGS[state.lang] || STRINGS.pt;
  var str = dict[key] || STRINGS.pt[key] || key;
  if (vars){ Object.keys(vars).forEach(function(k){ str = str.split('{'+k+'}').join(vars[k]); }); }
  return str;
}
function getCookie(name){
  var m = document.cookie.match(new RegExp('(?:^|; )'+name+'=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
// Aplica o idioma atual (state.lang) em todo elemento estático marcado com
// data-i18n / data-i18n-placeholder. Escopo de hoje: telas de login, cadastro
// e redefinição de senha — o resto do app ainda é só em português, migrado aos
// poucos (o texto em português continua funcionando como estava, sem chave).
function applyI18n(){
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(function(el){ el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){ el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  document.querySelectorAll('.lang-switch-btn').forEach(function(btn){
    btn.className = (btn.getAttribute('data-lang')===state.lang) ? 'btn lang-switch-btn' : 'btn secondary lang-switch-btn';
  });
}
// Detecta o idioma inicial: cookie salvo > localStorage > idioma do navegador >
// português. O cookie é o que o servidor lê pra responder erros de API no
// idioma certo — por isso App.setLanguage grava nos dois lugares.
function initLanguage(){
  var saved = getCookie('fue_lang') || localStorage.getItem('fue_lang');
  if (!saved){
    var nav = (navigator.language||'pt').slice(0,2).toLowerCase();
    saved = STRINGS[nav] ? nav : 'pt';
  }
  state.lang = STRINGS[saved] ? saved : 'pt';
  applyI18n();
}
var CATS = [
  {id:'f1',get label(){return t('cat.f1');},hairs:1,group:'integro'},
  {id:'f2',get label(){return t('cat.f2');},hairs:2,group:'integro'},
  {id:'f3',get label(){return t('cat.f3');},hairs:3,group:'integro'},
  {id:'f4',get label(){return t('cat.f4');},hairs:4,group:'integro'},
  {id:'f1fino',get label(){return t('cat.f1fino');},hairs:1,group:'integro'},
  {id:'f2fino',get label(){return t('cat.f2fino');},hairs:2,group:'integro'},
  {id:'t2_1',get label(){return t('cat.t2_1');},hairs:1,group:'parcial'},
  {id:'t3_2',get label(){return t('cat.t3_2');},hairs:2,group:'parcial'},
  {id:'t3_1',get label(){return t('cat.t3_1');},hairs:1,group:'parcial'},
  {id:'t4_3',get label(){return t('cat.t4_3');},hairs:3,group:'parcial'},
  {id:'t4_2',get label(){return t('cat.t4_2');},hairs:2,group:'parcial'},
  {id:'t4_1',get label(){return t('cat.t4_1');},hairs:1,group:'parcial'},
  {id:'parcial_geral',get label(){return t('cat.parcial_geral');},hairs:0,group:'parcial_reduzida'},
  {id:'ttotal',get label(){return t('cat.ttotal');},hairs:0,group:'total'},
  {id:'mini',get label(){return t('cat.mini');},hairs:0,group:'mini'}
];
var SESSION_MODES = ['completo','reduzido'];
var QUADRANTS = [
  {id:'occipital_dir',get label(){return t('quad.occipital_dir');}},
  {id:'occipital_esq',get label(){return t('quad.occipital_esq');}},
  {id:'temporal_esq',get label(){return t('quad.temporal_esq');}},
  {id:'temporal_dir',get label(){return t('quad.temporal_dir');}}
];
var PREINC_AREAS = [
  {id:'recesso_dir',get label(){return t('preinc.recesso_dir');}},{id:'recesso_esq',get label(){return t('preinc.recesso_esq');}},
  {id:'linha',get label(){return t('preinc.linha');}},{id:'sublinha',get label(){return t('preinc.sublinha');}},
  {id:'entrada_dir1',get label(){return t('preinc.entrada_dir1');}},{id:'entrada_dir2',get label(){return t('preinc.entrada_dir2');}},
  {id:'entrada_esq1',get label(){return t('preinc.entrada_esq1');}},{id:'entrada_esq2',get label(){return t('preinc.entrada_esq2');}},
  {id:'topete1',get label(){return t('preinc.topete1');}},{id:'topete2',get label(){return t('preinc.topete2');}},
  {id:'scalp',get label(){return t('preinc.scalp');}},{id:'coroa',get label(){return t('preinc.coroa');}}
];
var DIST_FIOS = [{id:'f1',get label(){return t('cat.f1');}},{id:'f2',get label(){return t('cat.f2');}},{id:'f3',get label(){return t('cat.f3');}}];
var DEFAULT_INCREMENTS = [10,50,100];
function quadrantById(id){ for (var i=0;i<QUADRANTS.length;i++){ if (QUADRANTS[i].id===id) return QUADRANTS[i]; } return null; }
function computeSummary(counts, mode){
  var integros=0, parciais=0, totalPerdidos=0, totalFios=0, miniTotal=0, parcialGeral=counts['parcial_geral']||0;
  CATS.forEach(function(c){
    var n = counts[c.id]||0;
    if (c.group==='integro'){ integros+=n; totalFios+=n*c.hairs; }
    else if (c.group==='parcial'){ parciais+=n; totalFios+=n*c.hairs; }
    else if (c.group==='total'){ totalPerdidos+=n; }
    else if (c.group==='mini'){ miniTotal+=n; }
  });
  var reduzido = mode==='reduzido';
  var parcialParaTaxa = reduzido ? parcialGeral : parciais;
  var foliculosExtraidos = reduzido ? integros : (integros+parciais);
  var foliculosManipulados = reduzido ? (integros+totalPerdidos) : (integros+parciais+totalPerdidos);
  var indice = foliculosExtraidos>0 ? totalFios/foliculosExtraidos : 0;
  var taxaParcialDenom = reduzido ? integros : foliculosManipulados;
  var taxaParcial = taxaParcialDenom>0 ? parcialParaTaxa/taxaParcialDenom*100 : 0;
  var taxaTotal = foliculosManipulados>0 ? totalPerdidos/foliculosManipulados*100 : 0;
  return {integros:integros,parciais:parciais,parcialGeral:parcialGeral,totalPerdidos:totalPerdidos,miniTotal:miniTotal,foliculosExtraidos:foliculosExtraidos,foliculosManipulados:foliculosManipulados,totalFios:totalFios,indice:indice,taxaParcial:taxaParcial,taxaTotal:taxaTotal};
}
function combinedExtractionCounts(s){
  var combined = {}; CATS.forEach(function(c){ combined[c.id]=0; });
  QUADRANTS.forEach(function(qd){
    var qc = s.quadrants[qd.id].counts;
    CATS.forEach(function(c){ combined[c.id] = (combined[c.id]||0) + (qc[c.id]||0); });
  });
  return combined;
}
// Encontra o quadrante marcado (Mamba preenchido) mais recente ANTES do quadrante
// atual, usando o RELÓGIO REAL de quando cada um foi marcado (mambaMarkedAtMs) — não
// a ordem fixa da lista de quadrantes, e não o tempo decorrido do cronômetro de
// extração (mambaMarkTimeMs), que fica PARADO sempre que o cronômetro é pausado e
// por isso pode empatar entre dois quadrantes marcados durante a mesma pausa —
// empate esse que, com comparação estrita, fazia o sistema pular o quadrante
// verdadeiramente anterior e cair, por engano, num quadrante bem mais antigo
// (o primeiro já marcado). Isso é o que permite que cada médico/equipe preencha os
// quadrantes na ordem que quiser (direita, esquerda, temporal, occipital — tanto
// faz), em vez de assumir sempre temporal dir → temporal esq → occipital dir →
// occipital esq. Retorna null se não houver candidato confiável (aí quem chamou cai
// num último recurso baseado na ordem da lista, só pra dado antigo de antes desta
// correção, que não tem relógio real registrado).
function findPrevMarkedQuadrant(s, quadId){
  var current = s.quadrants[quadId];
  if (current.mambaMarkedAtMs===null || current.mambaMarkedAtMs===undefined) return null;
  var best = null;
  QUADRANTS.forEach(function(q){
    if (q.id===quadId) return;
    var qd = s.quadrants[q.id];
    if (qd.mambaMarkedAtMs===null || qd.mambaMarkedAtMs===undefined) return;
    if (qd.mambaMarkedAtMs < current.mambaMarkedAtMs){
      if (!best || qd.mambaMarkedAtMs > best.mambaMarkedAtMs) best = qd;
    }
  });
  return best;
}
function mambaPrevCumulativo(s, quadId){
  var current = s.quadrants[quadId];
  if (current.mambaMarkedAtMs===null || current.mambaMarkedAtMs===undefined){
    // Este quadrante em si não tem timestamp (dado antigo, marcado antes desta
    // correção existir) — não tem como saber a ordem real de preenchimento; cai no
    // último recurso: ordem fixa da lista, igual ao comportamento de antes.
    var idx=-1;
    for (var i=0;i<QUADRANTS.length;i++){ if (QUADRANTS[i].id===quadId){ idx=i; break; } }
    for (var j=idx-1;j>=0;j--){
      var v = s.quadrants[QUADRANTS[j].id].mambaCumulativo;
      if (v!==null && v!==undefined && v!=='') return Number(v);
    }
    return 0;
  }
  // Este quadrante TEM timestamp confiável — usa sempre o horário real. Se não
  // achar nenhum quadrante marcado antes dele, é porque ele genuinamente foi o
  // primeiro (delta a partir de zero) — não cai pra ordem fixa nesse caso, senão
  // volta a acontecer o bug de pegar um quadrante marcado DEPOIS só porque ele
  // aparece antes na lista fixa.
  var prev = findPrevMarkedQuadrant(s, quadId);
  return prev ? Number(prev.mambaCumulativo||0) : 0;
}
function mambaFinalCumulativo(s){
  var withTime = QUADRANTS.map(function(q){ return s.quadrants[q.id]; }).filter(function(qd){
    return qd.mambaCumulativo!==null && qd.mambaCumulativo!==undefined && qd.mambaCumulativo!=='' &&
      qd.mambaMarkedAtMs!==null && qd.mambaMarkedAtMs!==undefined;
  });
  if (withTime.length){
    withTime.sort(function(a,b){ return b.mambaMarkedAtMs - a.mambaMarkedAtMs; });
    return Number(withTime[0].mambaCumulativo);
  }
  // Nenhum quadrante tem relógio real registrado (cirurgia antiga, nunca tocada
  // depois desta correção) — último recurso: ordem fixa da lista, como antes.
  for (var i=QUADRANTS.length-1;i>=0;i--){
    var v = s.quadrants[QUADRANTS[i].id].mambaCumulativo;
    if (v!==null && v!==undefined && v!=='') return Number(v);
  }
  return null;
}
// base = número contra o qual o Mamba é comparado. Em todo o app isso é sempre
// folículos EXTRAÍDOS (íntegros + parciais) — não folículos manipulados (que
// somaria também a transecção total). Ficou assim porque as duas bases quase
// sempre coincidem (só divergem quando há transecção total na cirurgia) e
// comparar contra extraídos é mais direto de entender: 'o Mamba bateu com o que
// eu realmente extraí?'.
function computeMambaDiff(mambaCount, base){
  if (mambaCount===null||mambaCount===undefined||mambaCount==='') return null;
  var mamba = Number(mambaCount);
  var diff = mamba - base;
  var diffPct = mamba>0 ? diff/mamba*100 : 0;
  return {mamba:mamba, base:base, diff:diff, diffPct:diffPct};
}
function mambaPrevMarkTimeMs(s, quadId){
  var prev = findPrevMarkedQuadrant(s, quadId);
  return prev ? Number(prev.mambaMarkTimeMs) : 0;
}
// Duração do quadrante = tempo marcado neste quadrante menos o tempo marcado no
// quadrante marcado imediatamente antes dele por horário real (não por posição na
// lista). Só existe se o Mamba deste quadrante foi preenchido; se dois quadrantes
// forem marcados fora de ordem (ou vier de dado antigo sem timestamp confiável), a
// duração pode dar zero ou negativa — nesse caso tratamos como 'sem dado confiável' (null).
function quadrantDurationMs(s, quadId){
  var qd = s.quadrants[quadId];
  var v = qd.mambaMarkTimeMs;
  if (v===null || v===undefined) return null;
  // Sem relógio real registrado não dá pra confiar em qual quadrante veio antes —
  // sem isso, evita calcular uma duração enganosa contra o quadrante errado.
  if (qd.mambaMarkedAtMs===null || qd.mambaMarkedAtMs===undefined) return null;
  var dur = Number(v) - mambaPrevMarkTimeMs(s, quadId);
  return dur>0 ? dur : null;
}
// Ritmo de extração baseado no Mamba (folículos/hora), diferente do ritmo baseado
// na contagem manual de bancada: usa o delta da leitura do Mamba dividido pelo
// tempo marcado pra aquele quadrante.
function mambaRatePerHour(mambaDelta, durationMs){
  if (durationMs===null || durationMs===undefined || durationMs<=0) return null;
  return mambaDelta/(durationMs/3600000);
}
// Contagem em cadeia: soma a contribuição PRÓPRIA deste quadrante (counts[catId],
// nunca mexido por esta função) com o total acumulado do predecessor (carryFromId),
// recursivamente. O link é sempre um elo EXPLÍCITO (criado por 'Contagem
// finalizada' ou pelo seletor manual), nunca inferido por ordem/tempo — é por
// isso que, ao contrário do Mamba, não existe ambiguidade de 'quem vem antes' aqui.
// Dinâmico de propósito: corrigir a contagem de um quadrante anterior já reflete
// automaticamente em todos os que vêm depois dele na cadeia, sem precisar reabrir
// nada. 'seen' protege contra ciclo (não deveria existir, mas por garantia).
function chainCumulativeCat(s, quadId, catId, seen){
  seen = seen || {};
  if (seen[quadId]) return 0;
  seen[quadId] = true;
  var qd = s.quadrants[quadId];
  if (!qd) return 0;
  var own = qd.counts[catId]||0;
  if (!qd.carryFromId || !s.quadrants[qd.carryFromId]) return own;
  return own + chainCumulativeCat(s, qd.carryFromId, catId, seen);
}
// Soma TODAS as categorias que o predecessor traz pra este quadrante — usado pra
// mostrar '(230)' na dica 'Contando a partir de: Occipital direito (230)' e pra
// recalcular o valor próprio quando alguém edita o número acumulado direto (toque
// no número pra digitar).
function chainPredecessorTotalAllCats(s, quadId){
  var qd = s.quadrants[quadId];
  if (!qd || !qd.carryFromId || !s.quadrants[qd.carryFromId]) return 0;
  var total = 0;
  CATS.forEach(function(c){ total += chainCumulativeCat(s, qd.carryFromId, c.id); });
  return total;
}
// Espelho client-side da mesma checagem que o servidor faz — usado só pra já
// esconder do seletor manual as opções que o servidor recusaria de qualquer
// jeito (evita a pessoa escolher algo e levar um erro na cara).
function wouldCreateCarryCycleClient(s, quadId, candidateId){
  if (candidateId===quadId) return true;
  var seen = {}; seen[quadId] = true;
  var cur = candidateId, hops = 0;
  while (cur && hops < QUADRANTS.length+1) {
    if (seen[cur]) return true;
    seen[cur] = true;
    var qd = s.quadrants[cur];
    cur = qd ? qd.carryFromId : null;
    hops++;
  }
  return false;
}
function preincTotal(counts){ var t=0; PREINC_AREAS.forEach(function(a){ t+=counts[a.id]||0; }); return t; }
function fmtHMS(ms){
  var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  function pad(n){return String(n).padStart(2,'0');}
  return pad(h)+':'+pad(m)+':'+pad(sec);
}
function escapeHtml(str){
  return String(str==null?'':str).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c];});
}
function elapsedMs(timer){ return (timer.accumulatedMs||0) + (timer.running ? (Date.now()-timer.startedAt) : 0); }
// Tempo total do CASO, do primeiro cronômetro iniciado (extração ou pré-incisões,
// o que vier primeiro) até agora — ou até a finalização, se já finalizado. Ao
// contrário de elapsedMs(), não pausa quando os cronômetros individuais pausam.
function globalElapsedMs(s){
  if (!s.globalTimerStartedAt) return null;
  var end = s.globalTimerEndedAt || Date.now();
  return end - s.globalTimerStartedAt;
}
var state = {currentId:null, session:null, pollHandle:null, connOk:true, increments:DEFAULT_INCREMENTS.slice(), activeTab:'extracao', activeQuadrant:QUADRANTS[0].id, audioEnabled:false, audioInterval:100, lastAnnounced:0, preincAudioEnabled:false, preincLastTotal:null, quadFinishAudioEnabled:false, baseUrl:null, alertParcialEnabled:false, alertParcialThreshold:null, alertParcialFired:false, alertTotalEnabled:false, alertTotalThreshold:null, alertTotalFired:false, currentUser:null, resetToken:null, newSessionMode:'reduzido', newPatientInfo:{}, lang:'pt'};
function shareUrlFor(id){ return (state.baseUrl||window.location.origin) + '/s/' + id; }
function resolveBaseUrl(){
  var host = window.location.hostname;
  var isLocalhost = (host === 'localhost' || host === '127.0.0.1');
  if (!isLocalhost){
    // Acessado por um IP de rede ou por um domínio de verdade (nuvem) — já está correto.
    state.baseUrl = window.location.origin;
    return Promise.resolve();
  }
  // Só corrige quando acessado como "localhost", que não funciona em outros aparelhos.
  return fetch('/api/network-info').then(function(r){ return r.json(); }).then(function(info){
    var ip = (info.ips && info.ips.length) ? info.ips[0] : null;
    state.baseUrl = ip ? ('http://'+ip+':'+info.port) : window.location.origin;
  }).catch(function(){ state.baseUrl = window.location.origin; });
}
var toastTimer=null;
function toast(msg, dur){ var el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(function(){el.classList.remove('show');}, dur||1800); }
var THEME_PRESETS = {
  padrao:  { label:'Padrão (verde-água)', primary:'#0e7c86', primaryDark:'#0a5c64' },
  azul:    { label:'Azul',                primary:'#1d63c9', primaryDark:'#134a99' },
  roxo:    { label:'Roxo',                primary:'#6a3fc7', primaryDark:'#4e2b99' },
  grafite: { label:'Grafite',             primary:'#4b5563', primaryDark:'#333b45' },
  marinho: { label:'Marinho',             primary:'#1e3a5c', primaryDark:'#14283f' }
};
var THEME_ORDER = ['padrao','azul','roxo','grafite','marinho'];
var LIGHT_VARS = { bg:'#f4f6f7', card:'#fff', text:'#1c2b2e', muted:'#5c6b6e', border:'#dde3e4', tint:'#fafcfc', tintActive:'#e8f4f5', surface2:'#e8edee', toastBg:'#1c2b2e', toastText:'#fff' };
var DARK_VARS  = { bg:'#12181a', card:'#1c2528', text:'#e7edee', muted:'#9aa8ab', border:'#313d40', tint:'#222c2f', tintActive:'#2a3d40', surface2:'#2a3336', toastBg:'#e7edee', toastText:'#1c2528' };
function applyBranding(branding){
  var b = branding || { theme:'padrao', darkMode:false, logoFilename:null };
  state.activeBranding = b;
  var preset = THEME_PRESETS[b.theme] || THEME_PRESETS.padrao;
  var v = b.darkMode ? DARK_VARS : LIGHT_VARS;
  var root = document.documentElement.style;
  root.setProperty('--c-primary', preset.primary);
  root.setProperty('--c-primary-dark', preset.primaryDark);
  root.setProperty('--c-bg', v.bg);
  root.setProperty('--c-card', v.card);
  root.setProperty('--c-text', v.text);
  root.setProperty('--c-muted', v.muted);
  root.setProperty('--c-border', v.border);
  root.setProperty('--c-tint', v.tint);
  root.setProperty('--c-tint-active', v.tintActive);
  root.setProperty('--c-surface2', v.surface2);
  root.setProperty('--c-toast-bg', v.toastBg);
  root.setProperty('--c-toast-text', v.toastText);
  document.documentElement.classList.toggle('dark', !!b.darkMode);
  var logoEls = document.querySelectorAll('.brand-logo');
  logoEls.forEach(function(el){
    if (b.logoFilename && b.ownerId){
      el.src = '/api/user/'+b.ownerId+'/logo?v='+encodeURIComponent(b.logoFilename);
      el.style.display = 'inline-block';
    } else {
      el.style.display = 'none';
    }
  });
}
function setConn(ok){ state.connOk = ok; document.getElementById('conn-dot').className = 'conn-dot ' + (ok?'ok':'bad'); document.getElementById('conn-banner').className = 'conn-banner' + (ok?'':' show'); }
function api(p, method, body){
  return fetch(p, {method:method||'GET', credentials:'same-origin', headers: body?{'Content-Type':'application/json'}:undefined, body: body?JSON.stringify(body):undefined})
    .then(function(r){ setConn(true); if (!r.ok) return r.json().then(function(e){ throw new Error(e.error||('HTTP '+r.status)); }); return r.json(); })
    .catch(function(err){ setConn(false); throw err; });
}
function showScreen(name){ document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');}); document.getElementById('screen-'+name).classList.add('active'); }
var INCREMENTS_KEY = 'fue_live_increments';
function loadIncrementSettings(){
  try{
    var raw = localStorage.getItem(INCREMENTS_KEY);
    var arr = raw ? JSON.parse(raw) : null;
    state.increments = (Array.isArray(arr) && arr.length) ? arr : DEFAULT_INCREMENTS.slice();
  }catch(e){ state.increments = DEFAULT_INCREMENTS.slice(); }
}
function saveIncrementSettings(){ localStorage.setItem(INCREMENTS_KEY, JSON.stringify(state.increments)); }
function renderSettingsScreen(){
  var editor = document.getElementById('increments-editor');
  editor.innerHTML = state.increments.map(function(v, idx){
    return '<div class="inc-row"><input type="number" min="1" value="'+v+'" data-idx="'+idx+'" onchange="App.updateIncrementField(this)">'+
      '<button class="btn secondary" onclick="App.removeIncrementField('+idx+')">'+escapeHtml(t('common.remove'))+'</button></div>';
  }).join('');
  var b = (state.currentUser && state.currentUser.branding) || { theme:'padrao', darkMode:false, logoFilename:null, ownerId:null };
  var preview = document.getElementById('settings-logo-preview');
  var empty = document.getElementById('settings-logo-empty');
  var removeBtn = document.getElementById('settings-logo-remove-btn');
  if (b.logoFilename && b.ownerId){
    preview.src = '/api/user/'+b.ownerId+'/logo?v='+encodeURIComponent(b.logoFilename);
    preview.style.display = 'inline-block'; empty.style.display='none'; removeBtn.style.display='inline-block';
  } else {
    preview.style.display = 'none'; empty.style.display=''; removeBtn.style.display='none';
  }
  document.getElementById('settings-theme-swatches').innerHTML = THEME_ORDER.map(function(id){
    var preset = THEME_PRESETS[id];
    var active = (b.theme===id);
    return '<button type="button" onclick="App.setTheme(\''+id+'\')" title="'+escapeHtml(preset.label)+'" style="width:38px;height:38px;border-radius:50%;cursor:pointer;background:'+preset.primary+';border:'+(active?'3px solid var(--c-text)':'1px solid var(--c-border)')+';"></button>';
  }).join('');
  document.getElementById('settings-darkmode-toggle').checked = !!b.darkMode;
  document.getElementById('settings-security-card').style.display = state.currentUser ? 'block' : 'none';
}
var App = {};
App.goHome = function(){
  if (!state.currentUser && state.currentId){
    // Auxiliar sem login, só com o link de uma cirurgia — não existe uma lista pra
    // mostrar pra ela, então "Início" (e o botão "Voltar" da tela de Config) volta
    // pra própria cirurgia em vez de forçar login.
    history.pushState({},'','/s/'+state.currentId);
    showScreen('counting');
    return;
  }
  stopPolling(); state.currentId=null; history.pushState({},'','/'); App.checkAuthAndShowHome();
};
function renderUserBar(){
  var el = document.getElementById('user-bar');
  if (state.currentUser){
    el.innerHTML = escapeHtml(state.currentUser.nomeCompleto.split(' ')[0])+' <button class="icon-btn" onclick="App.logout()">'+escapeHtml(t('nav.exit'))+'</button>';
  } else {
    el.innerHTML = '';
  }
  document.getElementById('dashboard-btn').style.display = state.currentUser ? 'inline-block' : 'none';
}
App.checkAuthAndShowHome = function(){
  api('/api/me').then(function(r){
    state.currentUser = r.user; applyBranding(r.user.branding); App.setLanguage(r.user.branding.language, true); renderUserBar(); showScreen('home'); loadSurgeryList();
  }).catch(function(){
    state.currentUser = null; applyBranding(null); renderUserBar(); showScreen('auth'); App.switchAuthTab('login');
  });
};
App.switchAuthTab = function(tab){
  document.getElementById('authpanel-login').style.display = tab==='login' ? '' : 'none';
  document.getElementById('authpanel-cadastro').style.display = tab==='cadastro' ? '' : 'none';
  document.getElementById('authtab-login-btn').className = tab==='login' ? 'btn' : 'btn secondary';
  document.getElementById('authtab-cadastro-btn').className = tab==='cadastro' ? 'btn' : 'btn secondary';
};
App.doLogin = function(){
  var email = document.getElementById('login-email').value.trim();
  var password = document.getElementById('login-password').value;
  if (!email || !password){ toast(t('toast.fill_email_password')); return; }
  api('/api/login','POST',{email:email, password:password}).then(function(r){
    state.currentUser = r.user; applyBranding(r.user.branding); App.setLanguage(r.user.branding.language, true); renderUserBar(); showScreen('home'); loadSurgeryList();
    toast(t('toast.welcome',{name:r.user.nomeCompleto.split(' ')[0]}));
  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
App.doRegister = function(){
  var nomeCompleto = document.getElementById('reg-nome').value.trim();
  var crm = document.getElementById('reg-crm').value.trim();
  var email = document.getElementById('reg-email').value.trim();
  var telefone = document.getElementById('reg-telefone').value.trim();
  var password = document.getElementById('reg-password').value;
  var password2 = document.getElementById('reg-password2').value;
  if (!nomeCompleto || !crm || !email || !telefone || !password){ toast(t('toast.fill_all_fields')); return; }
  if (password !== password2){ toast(t('toast.passwords_dont_match')); return; }
  if (password.length < 6){ toast(t('toast.password_too_short')); return; }
  api('/api/register','POST',{nomeCompleto:nomeCompleto, crm:crm, email:email, telefone:telefone, password:password}).then(function(r){
    state.currentUser = r.user; applyBranding(r.user.branding); App.setLanguage(r.user.branding.language, true); renderUserBar(); showScreen('home'); loadSurgeryList();
    toast(t('toast.account_created_welcome',{name:r.user.nomeCompleto.split(' ')[0]}));
  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
App.logout = function(){
  api('/api/logout','POST',{}).then(function(){
    state.currentUser = null; applyBranding(null); renderUserBar(); showScreen('auth'); App.switchAuthTab('login');
    toast(t('toast.logged_out'));
  }).catch(function(){});
};
App.logoutAllDevices = function(){
  confirmDialog(t('toast.logout_all_confirm')).then(function(ok){
    if (!ok) return;
    api('/api/logout-all','POST',{}).then(function(){
      state.currentUser = null; applyBranding(null); renderUserBar(); showScreen('auth'); App.switchAuthTab('login');
      toast(t('toast.logged_out_all'));
    }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
  });
};
// Baixa o backup manual (cadastro + cirurgias do próprio médico). Navegação
// direta em vez de fetch: o servidor manda Content-Disposition:attachment, que
// faz o navegador baixar o arquivo em vez de sair da página — o cookie de
// login já vai junto automaticamente, igual qualquer outra requisição.
App.downloadBackup = function(){ window.location.href = '/api/backup'; };
// Troca o idioma da interface. skipSync evita regravar no servidor quando o
// idioma acabou de VIR de lá (login/cadastro) — só grava quando é uma escolha
// manual da pessoa (seletor na tela de login ou em Configurações).
App.setLanguage = function(lang, skipSync){
  if (!STRINGS[lang]) return;
  state.lang = lang;
  document.cookie = 'fue_lang='+lang+'; path=/; max-age=31536000; SameSite=Lax';
  try{ localStorage.setItem('fue_lang', lang); }catch(e){}
  applyI18n();
  if (typeof renderUserBar === 'function' && state.currentUser) renderUserBar();
  if (!skipSync && state.currentUser){
    api('/api/me/branding','POST',{language:lang}).catch(function(){});
  }
};
App.toggleForgotPassword = function(){
  var el = document.getElementById('forgot-password-panel');
  el.style.display = (el.style.display==='none') ? '' : 'none';
};
App.doForgotPassword = function(){
  var email = document.getElementById('forgot-email').value.trim();
  if (!email){ toast(t('toast.enter_your_email')); return; }
  api('/api/forgot-password','POST',{email:email}).then(function(){
    toast(t('toast.reset_link_sent_generic'), 4500);
  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
App.doResetPassword = function(){
  var password = document.getElementById('reset-password').value;
  var password2 = document.getElementById('reset-password2').value;
  if (!password){ toast(t('toast.enter_new_password')); return; }
  if (password !== password2){ toast(t('toast.passwords_dont_match')); return; }
  if (password.length < 6){ toast(t('toast.password_too_short')); return; }
  api('/api/reset-password','POST',{token:state.resetToken, password:password}).then(function(){
    toast(t('toast.password_changed_login'), 3500);
    history.pushState({},'','/');
    App.checkAuthAndShowHome();
  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
App.showSettings = function(){
  renderSettingsScreen();
  document.getElementById('settings-back-footer').style.display = state.currentId ? 'flex' : 'none';
  document.getElementById('settings-audio-card').style.display = state.currentId ? 'block' : 'none';
  showScreen('settings');
};
App.backToSurgery = function(){
  if (!state.currentId){ App.goHome(); return; }
  history.pushState({},'','/s/'+state.currentId);
  showScreen('counting');
};
App.showDashboard = function(){
  if (!state.currentUser){ toast(t('toast.login_required_dashboard')); return; }
  showScreen('dashboard');
  api('/api/sessions').then(function(list){
    state.dashboardSessions = list.filter(function(s){ return s.status==='finalizada'; });
    state.dashboardMode = state.dashboardMode || 'completo';
    renderDashboardScreen();
  }).catch(function(){ toast(t('toast.server_unreachable')); });
};
App.switchDashboardMode = function(mode){ state.dashboardMode = mode; renderDashboardScreen(); };
function computeDashboardData(sessions){
  var sorted = sessions.slice().sort(function(a,b){ return a.createdAt-b.createdAt; });
  var catTotals = {}; CATS.forEach(function(c){ catTotals[c.id]=0; });
  var quadStats = {}; QUADRANTS.forEach(function(q){ quadStats[q.id] = { completo:[], reduzido:[], mambaDiffs:{completo:[],reduzido:[]} }; });
  var rows = sorted.map(function(s){
    var combined = combinedExtractionCounts(s);
    var sum = computeSummary(combined, s.mode||'completo');
    var m = s.mode||'completo';
    CATS.forEach(function(c){ catTotals[c.id] += (combined[c.id]||0); });
    QUADRANTS.forEach(function(q){
      var qc = s.quadrants[q.id].counts;
      var qsum = computeSummary(qc, m);
      if (qsum.foliculosManipulados>0){ quadStats[q.id][m].push({indice:qsum.indice, taxaParcial:qsum.taxaParcial, taxaTotal:qsum.taxaTotal}); }
      var mc = s.quadrants[q.id].mambaCumulativo;
      if (mc!==null && mc!==undefined && mc!==''){
        var prev = mambaPrevCumulativo(s, q.id);
        var delta = Number(mc) - prev;
        var qmdiff = computeMambaDiff(delta, qsum.foliculosExtraidos);
        if (qmdiff) quadStats[q.id].mambaDiffs[m].push(qmdiff.diffPct);
      }
    });
    return {
      id: s.id, codigo: s.codigo, mode: m, createdAt: s.createdAt,
      extraidos: sum.foliculosExtraidos, totalFios: sum.totalFios, indice: sum.indice,
      taxaParcial: sum.taxaParcial, taxaTotal: sum.taxaTotal, miniTotal: sum.miniTotal,
      tempoMs: elapsedMs(s.timer),
      preincTotalVal: preincTotal(s.preincCounts)
    };
  });
  var withData = rows.filter(function(r){ return r.extraidos>0; });
  var mean = function(arr, key){ if (!arr.length) return 0; var sum=0; arr.forEach(function(r){ sum+=r[key]; }); return sum/arr.length; };
  var meanArr = function(arr){ if (!arr.length) return null; var t=0; arr.forEach(function(v){ t+=v; }); return t/arr.length; };
  var sumOf = function(arr, key){ var t=0; arr.forEach(function(r){ t+=r[key]; }); return t; };
  var byMode = { completo: withData.filter(function(r){ return r.mode==='completo'; }), reduzido: withData.filter(function(r){ return r.mode==='reduzido'; }) };
  var preincTotals = rows.map(function(r){ return r.preincTotalVal; });
  var preincSum = preincTotals.reduce(function(a,b){ return a+b; }, 0);
  var foliculosExtraidosGeral = sumOf(rows, 'extraidos');
  var tempoTotalMs = sumOf(rows, 'tempoMs');
  var miniTotalGeral = sumOf(rows, 'miniTotal');
  var integrosTotal = catTotals.f1+catTotals.f2+catTotals.f3+catTotals.f4+catTotals.f1fino+catTotals.f2fino;
  var pctUF = ['f1','f2','f3','f4','f1fino','f2fino'].map(function(id){
    var c = CATS.filter(function(x){ return x.id===id; })[0];
    return { id:id, label:c.label, qtd:catTotals[id], pct: integrosTotal>0 ? catTotals[id]/integrosTotal*100 : 0 };
  });
  var quadranteMedias = QUADRANTS.map(function(q){
    var qc = quadStats[q.id];
    var build = function(arr, mambaArr){ return { n:arr.length, indice:mean(arr,'indice'), taxaParcial:mean(arr,'taxaParcial'), taxaTotal:mean(arr,'taxaTotal'), mambaDiffPct:meanArr(mambaArr) }; };
    return { id:q.id, label:quadrantById(q.id).label, completo:build(qc.completo,qc.mambaDiffs.completo), reduzido:build(qc.reduzido,qc.mambaDiffs.reduzido) };
  });
  return {
    rows: rows,
    withData: withData,
    totalCirurgias: rows.length,
    indiceMedio: mean(withData, 'indice'),
    preincMedia: rows.length ? preincSum/rows.length : 0,
    preincTotal: preincSum,
    foliculosExtraidosGeral: foliculosExtraidosGeral,
    fiosGeral: sumOf(rows, 'totalFios'),
    byMode: byMode,
    taxaParcialMedia: { completo: mean(byMode.completo,'taxaParcial'), reduzido: mean(byMode.reduzido,'taxaParcial') },
    taxaTotalMedia: { completo: mean(byMode.completo,'taxaTotal'), reduzido: mean(byMode.reduzido,'taxaTotal') },
    tempoTotalMs: tempoTotalMs,
    folPerMin: tempoTotalMs>0 ? foliculosExtraidosGeral/(tempoTotalMs/60000) : 0,
    tempoPorMilMs: foliculosExtraidosGeral>0 ? (tempoTotalMs/foliculosExtraidosGeral*1000) : 0,
    miniTotalGeral: miniTotalGeral,
    minisPorMil: foliculosExtraidosGeral>0 ? (miniTotalGeral/foliculosExtraidosGeral*1000) : 0,
    pctUF: pctUF,
    quadranteMedias: quadranteMedias
  };
}
function localeForLang(){ return {pt:'pt-BR', en:'en-US', es:'es-ES'}[state.lang] || 'pt-BR'; }
function fmtBig(n){ return n.toLocaleString(localeForLang()); }
function shortDate(ts){ var d=new Date(ts); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'); }
function buildBarChartSvg(items, color, valueFmt){
  if (!items.length) return '<p class="hint">'+escapeHtml(t('dash.no_data_yet'))+'</p>';
  var h=170, barW=26, gap=14, padTop=20, padBottom=32, plotH=h-padTop-padBottom;
  var w = Math.max(220, items.length*(barW+gap)+gap);
  var maxVal = 0; items.forEach(function(it){ if (it.value>maxVal) maxVal=it.value; });
  if (maxVal<=0) maxVal=1;
  var bars = items.map(function(it,i){
    var barH = Math.max(2,(it.value/maxVal)*plotH);
    var x = gap+i*(barW+gap);
    var y = padTop+(plotH-barH);
    var lbl = escapeHtml(it.label);
    var val = valueFmt ? valueFmt(it.value) : it.value;
    return '<g><rect x="'+x+'" y="'+y+'" width="'+barW+'" height="'+barH+'" rx="3" fill="'+color+'"><title>'+lbl+': '+val+'</title></rect>'+
      '<text x="'+(x+barW/2)+'" y="'+(y-5)+'" font-size="10" text-anchor="middle" fill="var(--c-text)">'+val+'</text>'+
      '<text x="'+(x+barW/2)+'" y="'+(h-padBottom+13)+'" font-size="9" text-anchor="middle" fill="var(--c-muted)">'+lbl+'</text></g>';
  }).join('');
  return '<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'">'+
    '<line x1="0" y1="'+(padTop+plotH)+'" x2="'+w+'" y2="'+(padTop+plotH)+'" stroke="var(--c-border)"/>'+bars+'</svg>';
}
function buildRateChartSvg(items){
  if (!items.length) return '';
  var h=170, barW=11, pairGap=3, groupGap=16, padTop=20, padBottom=32, plotH=h-padTop-padBottom;
  var groupW = barW*2+pairGap;
  var w = Math.max(240, items.length*(groupW+groupGap)+groupGap);
  var maxVal=0; items.forEach(function(it){ maxVal=Math.max(maxVal,it.parcial,it.total); });
  maxVal = Math.max(5, maxVal*1.15);
  var groups = items.map(function(it,i){
    var gx = groupGap+i*(groupW+groupGap);
    var hP = Math.max(1,(it.parcial/maxVal)*plotH), hT = Math.max(1,(it.total/maxVal)*plotH);
    var yP = padTop+(plotH-hP), yT = padTop+(plotH-hT);
    var lbl = escapeHtml(it.label);
    return '<g><rect x="'+gx+'" y="'+yP+'" width="'+barW+'" height="'+hP+'" rx="2" fill="var(--c-parcial)"><title>'+lbl+' — parcial: '+it.parcial.toFixed(1)+'%</title></rect>'+
      '<rect x="'+(gx+barW+pairGap)+'" y="'+yT+'" width="'+barW+'" height="'+hT+'" rx="2" fill="var(--c-total)"><title>'+lbl+' — total: '+it.total.toFixed(1)+'%</title></rect>'+
      '<text x="'+(gx+groupW/2)+'" y="'+(h-padBottom+13)+'" font-size="9" text-anchor="middle" fill="var(--c-muted)">'+lbl+'</text></g>';
  }).join('');
  return '<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'">'+
    '<line x1="0" y1="'+(padTop+plotH)+'" x2="'+w+'" y2="'+(padTop+plotH)+'" stroke="var(--c-border)"/>'+groups+
    '<g><rect x="0" y="0" width="9" height="9" fill="var(--c-parcial)"/><text x="13" y="9" font-size="9" fill="var(--c-muted)">parcial</text>'+
    '<rect x="58" y="0" width="9" height="9" fill="var(--c-total)"/><text x="71" y="9" font-size="9" fill="var(--c-muted)">total</text></g>'+
    '</svg>';
}
function renderDashboardScreen(){
  var data = computeDashboardData(state.dashboardSessions||[]);
  document.getElementById('dash-empty').style.display = data.totalCirurgias===0 ? 'block' : 'none';
  document.getElementById('dash-content').style.display = data.totalCirurgias===0 ? 'none' : 'block';
  if (data.totalCirurgias===0) return;
  document.getElementById('dash-summary').innerHTML =
    '<div class="summary-item"><div class="val">'+data.totalCirurgias+'</div><div class="lbl">'+escapeHtml(t('dash.finalized_surgeries_title'))+'</div></div>'+
    '<div class="summary-item"><div class="val">'+fmtBig(data.foliculosExtraidosGeral)+'</div><div class="lbl">'+escapeHtml(t('dash.stat_extracted_total'))+'</div></div>'+
    '<div class="summary-item"><div class="val">'+fmtBig(data.fiosGeral)+'</div><div class="lbl">'+escapeHtml(t('dash.stat_hairs_total'))+'</div></div>'+
    '<div class="summary-item"><div class="val">'+data.indiceMedio.toFixed(2)+'</div><div class="lbl">'+escapeHtml(t('dash.stat_avg_index'))+'</div></div>'+
    '<div class="summary-item"><div class="val">'+data.preincMedia.toFixed(0)+'</div><div class="lbl">'+escapeHtml(t('dash.stat_preinc_avg'))+'</div></div>'+
    '<div class="summary-item"><div class="val">'+data.preincTotal+'</div><div class="lbl">'+escapeHtml(t('dash.stat_preinc_total'))+'</div></div>'+
    '<div class="summary-item"><div class="val">'+data.folPerMin.toFixed(1)+'</div><div class="lbl">'+escapeHtml(t('dash.stat_follicles_per_min'))+'</div></div>'+
    '<div class="summary-item"><div class="val">'+fmtHMS(data.tempoPorMilMs)+'</div><div class="lbl">'+escapeHtml(t('dash.stat_avg_time_per_1000'))+'</div></div>'+
    '<div class="summary-item"><div class="val">'+data.minisPorMil.toFixed(1)+'</div><div class="lbl">'+escapeHtml(t('dash.stat_minis_per_1000'))+'</div></div>';
  var extItems = data.withData.map(function(r){ return {label:shortDate(r.createdAt), value:r.extraidos}; });
  document.getElementById('dash-extraidos-chart').innerHTML = buildBarChartSvg(extItems, 'var(--c-integro)', function(v){ return fmtBig(v); });
  var idxItems = data.withData.map(function(r){ return {label:shortDate(r.createdAt), value:r.indice}; });
  document.getElementById('dash-index-chart').innerHTML = buildBarChartSvg(idxItems, 'var(--c-primary)', function(v){ return v.toFixed(2); });
  var mode = state.dashboardMode||'completo';
  document.getElementById('dash-mode-completo').className = 'btn'+(mode==='completo'?'':' secondary');
  document.getElementById('dash-mode-reduzido').className = 'btn'+(mode==='reduzido'?'':' secondary');
  document.getElementById('dash-mode-todos').className = 'btn'+(mode==='todos'?'':' secondary');
  var isTodos = mode==='todos';
  var modeRows = isTodos ? data.withData : data.byMode[mode];
  document.getElementById('dash-rate-todos-hint').style.display = (isTodos && modeRows.length) ? 'block' : 'none';
  document.getElementById('dash-rate-empty').style.display = modeRows.length ? 'none' : 'block';
  document.getElementById('dash-rate-summary').style.display = modeRows.length ? 'grid' : 'none';
  document.getElementById('dash-rate-chart').style.display = modeRows.length ? 'block' : 'none';
  if (modeRows.length){
    if (isTodos){
      document.getElementById('dash-rate-summary').innerHTML =
        '<div class="summary-item"><div class="val">'+modeRows.length+'</div><div class="lbl">'+escapeHtml(t('dash.stat_surgeries_all_modes'))+'</div></div>'+
        '<div class="summary-item"><div class="val">'+data.byMode.completo.length+'</div><div class="lbl">'+escapeHtml(t('dash.stat_in_complete_mode'))+'</div></div>'+
        '<div class="summary-item"><div class="val">'+data.byMode.reduzido.length+'</div><div class="lbl">'+escapeHtml(t('dash.stat_in_reduced_mode'))+'</div></div>';
    } else {
      document.getElementById('dash-rate-summary').innerHTML =
        '<div class="summary-item"><div class="val">'+modeRows.length+'</div><div class="lbl">'+escapeHtml(mode==='completo'?t('dash.stat_surgeries_mode_complete'):t('dash.stat_surgeries_mode_reduced'))+'</div></div>'+
        '<div class="summary-item"><div class="val">'+data.taxaParcialMedia[mode].toFixed(1)+'%</div><div class="lbl">'+escapeHtml(t('dash.stat_partial_rate_avg'))+'</div></div>'+
        '<div class="summary-item"><div class="val">'+data.taxaTotalMedia[mode].toFixed(1)+'%</div><div class="lbl">'+escapeHtml(t('dash.stat_total_rate_avg'))+'</div></div>';
    }
    var rateItems = modeRows.map(function(r){ return {label:shortDate(r.createdAt)+(isTodos?(r.mode==='reduzido'?' (R)':' (C)'):''), parcial:r.taxaParcial, total:r.taxaTotal}; });
    document.getElementById('dash-rate-chart').innerHTML = buildRateChartSvg(rateItems);
  }
  document.getElementById('dash-quad-todos-hint').style.display = isTodos ? 'block' : 'none';
  document.getElementById('dash-quad-table').style.display = isTodos ? 'none' : 'block';
  if (!isTodos){
    var fmtOrDash = function(v, suffix){ return v===null ? '—' : v.toFixed(1)+(suffix||''); };
    var quadRows = data.quadranteMedias.map(function(q){
      var qm = q[mode];
      return '<tr><td>'+escapeHtml(q.label)+'</td><td>'+qm.n+'</td><td>'+(qm.n?qm.indice.toFixed(2):'—')+'</td>'+
        '<td>'+(qm.n?qm.taxaParcial.toFixed(1)+'%':'—')+'</td><td>'+(qm.n?qm.taxaTotal.toFixed(1)+'%':'—')+'</td>'+
        '<td>'+fmtOrDash(qm.mambaDiffPct,'%')+'</td></tr>';
    }).join('');
    document.getElementById('dash-quad-table').innerHTML = '<div class="dash-table-wrap"><table class="dash-table">'+
      '<tr><th>'+escapeHtml(t('dash.table_quadrant'))+'</th><th>'+escapeHtml(t('dash.table_surgeries'))+'</th><th>'+escapeHtml(t('dash.table_avg_index'))+'</th><th>'+escapeHtml(t('dash.table_partial_rate_avg'))+'</th><th>'+escapeHtml(t('dash.table_total_rate_avg'))+'</th><th>'+escapeHtml(t('dash.table_mamba_vs_bench'))+'</th></tr>'+
      quadRows+'</table></div>';
  }
  var ufRows = data.pctUF.map(function(u){
    return '<tr><td>'+escapeHtml(u.label)+'</td><td>'+fmtBig(u.qtd)+'</td><td>'+u.pct.toFixed(1)+'%</td></tr>';
  }).join('');
  document.getElementById('dash-uf-table').innerHTML = '<div class="dash-table-wrap"><table class="dash-table">'+
    '<tr><th>'+escapeHtml(t('dash.table_category'))+'</th><th>'+escapeHtml(t('dash.table_quantity'))+'</th><th>'+escapeHtml(t('dash.table_pct_intact'))+'</th></tr>'+
    ufRows+'</table></div>';
  var tableRows = data.rows.map(function(r){
    return '<tr><td>'+escapeHtml(r.codigo)+'</td><td>'+shortDate(r.createdAt)+'</td><td>'+(r.mode==='reduzido'?t('common.mode_reduced'):t('common.mode_complete'))+'</td>'+
      '<td>'+r.extraidos+'</td><td>'+r.indice.toFixed(2)+'</td><td>'+r.taxaParcial.toFixed(1)+'%</td><td>'+r.taxaTotal.toFixed(1)+'%</td><td>'+r.preincTotalVal+'</td></tr>';
  }).join('');
  document.getElementById('dash-table').innerHTML = '<div class="dash-table-wrap"><table class="dash-table">'+
    '<tr><th>'+escapeHtml(t('dash.table_surgery'))+'</th><th>'+escapeHtml(t('dash.table_date'))+'</th><th>'+escapeHtml(t('dash.table_mode'))+'</th><th>'+escapeHtml(t('dash.table_extracted'))+'</th><th>'+escapeHtml(t('dash.table_index'))+'</th><th>'+escapeHtml(t('dash.table_partial_rate'))+'</th><th>'+escapeHtml(t('dash.table_total_rate'))+'</th><th>'+escapeHtml(t('dash.table_preinc'))+'</th></tr>'+
    tableRows+'</table></div>';
}
App.addIncrementField = function(){ state.increments.push(1); renderSettingsScreen(); };
App.updateIncrementField = function(inputEl){
  var idx = parseInt(inputEl.getAttribute('data-idx'),10);
  var val = parseInt(inputEl.value,10);
  if (isNaN(val) || val<1) val = 1;
  state.increments[idx] = val;
};
App.removeIncrementField = function(idx){ state.increments.splice(idx,1); renderSettingsScreen(); };
App.saveSettings = function(){
  if (!state.increments.length){ toast(t('toast.add_at_least_one_value')); return; }
  saveIncrementSettings();
  toast(t('toast.settings_saved'));
  if (state.session) render();
};
App.resetSettings = function(){
  state.increments = DEFAULT_INCREMENTS.slice();
  saveIncrementSettings();
  renderSettingsScreen();
  toast(t('toast.defaults_restored'));
  if (state.session) render();
};
function loadSurgeryList(){
  api('/api/sessions').then(function(list){
    state.surgeryList = list;
    var el = document.getElementById('surgery-list');
    if (!list.length){ el.innerHTML = '<div class="empty-state">'+escapeHtml(t('home.no_surgeries_yet'))+'</div>'; return; }
    el.innerHTML = list.map(function(s){
      var sum = computeSummary(combinedExtractionCounts(s), s.mode||'completo');
      var badgeClass = s.status==='finalizada'?'finalizada':'andamento';
      return '<div class="surgery-card"><div><b>'+escapeHtml(s.codigo)+'</b><div class="hint">'+sum.foliculosExtraidos+' folículos · índice '+sum.indice.toFixed(2)+'</div></div>'+
        '<div style="text-align:right;"><span class="badge '+badgeClass+'">'+(s.status==='finalizada'?t('common.status_finalized'):t('common.status_in_progress'))+'</span><br>'+
        '<div class="row" style="gap:6px;margin-top:8px;justify-content:flex-end;">'+
        '<button class="btn secondary" onclick="App.openSession(\''+s.id+'\')">'+escapeHtml(t('common.open'))+'</button>'+
        '<button class="btn danger" onclick="App.deleteSession(\''+s.id+'\')">'+escapeHtml(t('common.delete'))+'</button>'+
        '</div></div></div>';
    }).join('');
  }).catch(function(){ toast(t('toast.server_unreachable')); });
}
App.deleteSession = function(id){
  var found = (state.surgeryList||[]).filter(function(s){ return s.id===id; })[0];
  var codigo = found ? found.codigo : id;
  var confirmText = t('confirm.delete_surgery',{code:codigo});
  confirmDialog(confirmText).then(function(ok){
    if (!ok) return;
    api('/api/session/'+id, 'DELETE').then(function(){ toast(t('toast.surgery_deleted')); loadSurgeryList(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
  });
};
App.setNewMode = function(mode){
  state.newSessionMode = mode;
  document.getElementById('new-mode-completo').className = 'btn' + (mode==='completo' ? '' : ' secondary');
  document.getElementById('new-mode-reduzido').className = 'btn' + (mode==='reduzido' ? '' : ' secondary');
};
App.createSession = function(){
  var codigo = document.getElementById('new-codigo').value.trim();
  if (!codigo){ toast(t('toast.enter_patient_code')); return; }
  var mode = state.newSessionMode||'reduzido';
  var payload = {codigo:codigo, mode:mode};
  if (Object.keys(state.newPatientInfo||{}).length) payload.patientInfo = state.newPatientInfo;
  api('/api/session','POST',payload).then(function(s){
    document.getElementById('new-codigo').value='';
    App.setNewMode('reduzido');
    state.newPatientInfo = {};
    ['new-patient-idade','new-patient-altura','new-patient-peso'].forEach(function(id){ var el=document.getElementById(id); if (el) el.value=''; });
    App.refreshNewPatientButtons();
    App.openSession(s.id);
  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
App.openSession = function(id){ state.currentId=id; state.activeQuadrant=QUADRANTS[0].id; history.pushState({},'','/s/'+id); loadAudioPrefs(id); showScreen('counting'); App.switchTab('extracao'); fetchAndRender().then(function(){ startPolling(); }); };
function fetchAndRender(){ return api('/api/session/'+state.currentId).then(function(s){ state.session=s; render(); }).catch(function(){ toast(t('errors.surgery_not_found_server')); }); }
function startPolling(){ stopPolling(); state.pollHandle = setInterval(function(){ fetchAndRender(); }, 1500); }
function stopPolling(){ if (state.pollHandle){ clearInterval(state.pollHandle); state.pollHandle=null; } }
App.switchTab = function(tab){
  state.activeTab = tab;
  var panels = {extracao:'panel-extracao', preincisoes:'panel-preincisoes', fotos:'panel-fotos', paciente:'panel-paciente', resumofinal:'panel-resumofinal'};
  var btns = {extracao:'tab-extracao-btn', preincisoes:'tab-preinc-btn', fotos:'tab-fotos-btn', paciente:'tab-paciente-btn', resumofinal:'tab-resumo-btn'};
  Object.keys(panels).forEach(function(key){
    document.getElementById(panels[key]).style.display = (key===tab) ? '' : 'none';
    document.getElementById(btns[key]).className = (key===tab) ? 'btn' : 'btn secondary';
  });
};
App.switchQuadrant = function(quadId){ state.activeQuadrant = quadId; render(); };
function render(){
  var s = state.session; if (!s) return;
  applyBranding(s.ownerBranding);
  document.getElementById('cnt-codigo').textContent = s.codigo;
  document.getElementById('cnt-meta').textContent = new Date(s.createdAt).toLocaleString(localeForLang());
  var gMs = globalElapsedMs(s);
  var gEl = document.getElementById('cnt-global-timer');
  if (gMs===null){ gEl.textContent = t('cnt.global_not_started'); }
  else { gEl.textContent = t('cnt.global_timer_prefix')+fmtHMS(gMs)+(s.globalTimerEndedAt ? t('cnt.global_finalized_suffix') : t('cnt.global_in_progress_suffix')); }
  var badge = document.getElementById('cnt-status');
  badge.textContent = s.status==='finalizada'?t('common.status_finalized'):t('common.status_in_progress');
  badge.className = 'badge ' + (s.status==='finalizada'?'finalizada':'andamento');
  document.getElementById('cnt-mode').textContent = (s.mode==='reduzido') ? t('cnt.mode_reduced') : t('cnt.mode_full');
  document.getElementById('btn-finalizar').style.display = s.status==='finalizada'?'none':'inline-block';
  document.getElementById('btn-reabrir').style.display = s.status==='finalizada'?'inline-block':'none';
  document.getElementById('share-url').textContent = shareUrlFor(s.id);
  var readonly = s.status==='finalizada';

  var combined = combinedExtractionCounts(s);
  var sum = computeSummary(combined, s.mode||'completo');
  document.getElementById('geral-extraidos').textContent = sum.foliculosExtraidos;
  document.getElementById('geral-fios').textContent = sum.totalFios;
  document.getElementById('geral-indice').textContent = sum.indice.toFixed(2);
  document.getElementById('geral-transec-parcial').textContent = sum.taxaParcial.toFixed(1)+'%';
  document.getElementById('geral-transec-total').textContent = sum.taxaTotal.toFixed(1)+'%';
  document.getElementById('geral-mini').textContent = sum.miniTotal;
  var finalMamba = mambaFinalCumulativo(s);
  var mdiffGeral = computeMambaDiff(finalMamba, sum.foliculosExtraidos);
  var geralBox = document.getElementById('geral-mamba-summary');
  if (mdiffGeral){
    geralBox.style.display='grid';
    document.getElementById('geral-mamba-val').textContent = mdiffGeral.mamba;
    document.getElementById('geral-mamba-manip').textContent = mdiffGeral.base;
    document.getElementById('geral-mamba-diff').textContent = (mdiffGeral.diff>0?'+':'')+mdiffGeral.diff;
    document.getElementById('geral-mamba-diffpct').textContent = (mdiffGeral.diffPct>0?'+':'')+mdiffGeral.diffPct.toFixed(1)+'%';
    var geralElapsed = elapsedMs(s.timer);
    var geralMambaRate = mambaRatePerHour(mdiffGeral.mamba, geralElapsed>0?geralElapsed:null);
    document.getElementById('geral-mamba-rate').textContent = geralMambaRate===null ? '—' : geralMambaRate.toFixed(0);
  } else { geralBox.style.display='none'; }

  // ---- aba Resumo Final: reaproveita combined/sum/finalMamba/mdiffGeral já
  // calculados acima (mesmos números do Resumo geral), só acrescenta tempos,
  // o total por categoria e a diferença pré-incisões x folículos extraídos.
  document.getElementById('final-tempo-extracao').textContent = fmtHMS(elapsedMs(s.timer));
  document.getElementById('final-tempo-preinc').textContent = fmtHMS(elapsedMs(s.preincTimer));
  var gMsFinal = globalElapsedMs(s);
  document.getElementById('final-tempo-total').textContent = gMsFinal===null ? '—' : fmtHMS(gMsFinal);
  document.getElementById('final-extraidos').textContent = sum.foliculosExtraidos;
  document.getElementById('final-fios').textContent = sum.totalFios;
  document.getElementById('final-indice').textContent = sum.indice.toFixed(2);
  document.getElementById('final-transec-parcial').textContent = sum.taxaParcial.toFixed(1)+'%';
  document.getElementById('final-transec-total').textContent = sum.taxaTotal.toFixed(1)+'%';
  document.getElementById('final-mini').textContent = sum.miniTotal;
  var finalMambaBox = document.getElementById('final-mamba-summary');
  // A aba Resumo Final compara o Mamba direto com os folículos EXTRAÍDOS — mesma
  // base usada em todo o app (computeMambaDiff), calculada aqui separadamente
  // só porque esta aba usa seus próprios elementos de HTML.
  if (finalMamba!==null && finalMamba!==undefined && finalMamba!==''){
    finalMambaBox.style.display='grid';
    var diffExtraidos = finalMamba - sum.foliculosExtraidos;
    var diffExtraidosPct = finalMamba>0 ? diffExtraidos/finalMamba*100 : 0;
    document.getElementById('final-mamba-val').textContent = finalMamba;
    document.getElementById('final-mamba-diff').textContent = (diffExtraidos>0?'+':'')+diffExtraidos;
    document.getElementById('final-mamba-diffpct-extraidos').textContent = (diffExtraidosPct>0?'+':'')+diffExtraidosPct.toFixed(1)+'%';
    // Ritmo de extração pelo Mamba (fol./h) — mesma conta já usada no Resumo
    // geral da aba Extração: leitura final do Mamba dividida pelo tempo de
    // extração corrido.
    var finalExtElapsed = elapsedMs(s.timer);
    var finalMambaRate = mambaRatePerHour(finalMamba, finalExtElapsed>0?finalExtElapsed:null);
    document.getElementById('final-mamba-rate').textContent = finalMambaRate===null ? '—' : finalMambaRate.toFixed(0);
  } else { finalMambaBox.style.display='none'; }
  var modeParaCategorias = s.mode||'completo';
  var catRows = [
    {label:t('cat.f1'), val: combined.f1||0},
    {label:t('cat.f2'), val: combined.f2||0},
    {label:t('cat.f3'), val: combined.f3||0},
    {label:t('cat.f4'), val: combined.f4||0},
    {label:t('cat.f1fino'), val: combined.f1fino||0},
    {label:t('cat.f2fino'), val: combined.f2fino||0},
    {label:t('cat.parcial_geral'), val: modeParaCategorias==='reduzido' ? sum.parcialGeral : sum.parciais},
    {label:t('cat.ttotal'), val: sum.totalPerdidos},
    {label:t('cat.mini'), val: sum.miniTotal}
  ];
  document.getElementById('final-categorias').innerHTML = catRows.map(function(r){
    return '<div class="summary-item"><div class="val">'+r.val+'</div><div class="lbl">'+escapeHtml(r.label)+'</div></div>';
  }).join('');
  var pTotalFinal = preincTotal(s.preincCounts);
  // Diferença entre folículos extraídos e total de pré-incisões: cada pré-incisão
  // deveria idealmente receber um folículo — uma diferença grande sinaliza
  // pré-incisões feitas a mais (ou a menos) em relação ao que foi de fato
  // extraído.
  var preincDiff = sum.foliculosExtraidos - pTotalFinal;
  document.getElementById('final-preinc-total').textContent = pTotalFinal;
  document.getElementById('final-preinc-diff').textContent = (preincDiff>0?'+':'')+preincDiff;

  var tabsEl = document.getElementById('quadrant-tabs');
  tabsEl.innerHTML = QUADRANTS.map(function(q){
    var cls = (q.id===state.activeQuadrant) ? 'btn' : 'btn secondary';
    return '<button class="'+cls+'" onclick="App.switchQuadrant(\''+q.id+'\')">'+escapeHtml(q.label)+'</button>';
  }).join('');
  var quad = s.quadrants[state.activeQuadrant];
  document.getElementById('quad-title').textContent = quadrantById(state.activeQuadrant).label;
  document.getElementById('quad-summary-title').textContent = quadrantById(state.activeQuadrant).label;
  var qsum = computeSummary(quad.counts, s.mode||'completo');
  document.getElementById('quad-extraidos').textContent = qsum.foliculosExtraidos;
  document.getElementById('quad-fios').textContent = qsum.totalFios;
  document.getElementById('quad-indice').textContent = qsum.indice.toFixed(2);
  document.getElementById('quad-transec-parcial').textContent = qsum.taxaParcial.toFixed(1)+'%';
  document.getElementById('quad-transec-total').textContent = qsum.taxaTotal.toFixed(1)+'%';
  document.getElementById('quad-mini').textContent = qsum.miniTotal;
  var quadInput = document.getElementById('quad-mamba-input');
  if (document.activeElement !== quadInput) quadInput.value = (quad.mambaCumulativo===null||quad.mambaCumulativo===undefined) ? '' : quad.mambaCumulativo;
  var quadBox = document.getElementById('quad-mamba-summary');
  if (quad.mambaCumulativo===null||quad.mambaCumulativo===undefined||quad.mambaCumulativo===''){
    quadBox.style.display='none';
  } else {
    var prev = mambaPrevCumulativo(s, state.activeQuadrant);
    var delta = Number(quad.mambaCumulativo) - prev;
    var qmdiff = computeMambaDiff(delta, qsum.foliculosExtraidos);
    if (qmdiff){
      quadBox.style.display='grid';
      document.getElementById('quad-mamba-val').textContent = qmdiff.mamba;
      document.getElementById('quad-mamba-manip').textContent = qmdiff.base;
      document.getElementById('quad-mamba-diff').textContent = (qmdiff.diff>0?'+':'')+qmdiff.diff;
      document.getElementById('quad-mamba-diffpct').textContent = (qmdiff.diffPct>0?'+':'')+qmdiff.diffPct.toFixed(1)+'%';
      var quadDur = quadrantDurationMs(s, state.activeQuadrant);
      var quadMambaRate = mambaRatePerHour(delta, quadDur);
      document.getElementById('quad-mamba-duracao').textContent = quadDur===null ? '—' : fmtHMS(quadDur);
      document.getElementById('quad-mamba-rate').textContent = quadMambaRate===null ? '—' : quadMambaRate.toFixed(0);
    } else { quadBox.style.display='none'; }
  }

  var modeAtiva = s.mode||'completo';
  var parcialGroupReal = modeAtiva==='reduzido' ? 'parcial_reduzida' : 'parcial';
  document.getElementById('parcial-reduzido-hint').style.display = modeAtiva==='reduzido' ? 'block' : 'none';
  var quadLocked = !!quad.locked;
  var quadReadonly = readonly || quadLocked;
  ['integro','parcial','total','mini'].forEach(function(group){
    var container = document.getElementById('group-'+group);
    var filterGroup = group==='parcial' ? parcialGroupReal : group;
    container.innerHTML = CATS.filter(function(c){return c.group===filterGroup;}).map(function(c){
      var n = chainCumulativeCat(s, state.activeQuadrant, c.id);
      var hairsNote = c.group==='mini' ? t('cnt.hairs_not_in_total') : (c.hairs>0 ? (c.hairs+' '+(c.hairs===1?t('cnt.hair_singular'):t('cnt.hair_plural'))+t('cnt.per_follicle_suffix')) : (c.group==='parcial_reduzida' ? t('cnt.hairs_informative_only') : t('cnt.hairs_lost')));
      var btns = quadReadonly ? '' : incBtns(c.id);
      var countCls = quadReadonly ? 'cat-count' : 'cat-count clickable';
      var countClick = quadReadonly ? '' : ' onclick="App.editCount(\''+c.id+'\')"';
      return '<div class="cat-row group-'+group+'"><div class="cat-label">'+escapeHtml(c.label)+'<span class="cat-hairs">'+hairsNote+'</span></div>'+
        '<div class="'+countCls+'"'+countClick+'>'+n+'</div><div class="cat-btns">'+btns+'</div></div>';
    }).join('');
  });

  var chainHintEl = document.getElementById('quad-chain-hint');
  if (quad.carryFromId && s.quadrants[quad.carryFromId]) {
    var carryTotal = chainPredecessorTotalAllCats(s, state.activeQuadrant);
    chainHintEl.textContent = t('cnt.chain_hint_from', {label: quadrantById(quad.carryFromId).label, total: carryTotal});
  } else {
    chainHintEl.textContent = t('cnt.chain_hint_none');
  }
  var carrySelect = document.getElementById('quad-carry-select');
  var candidateQuads = QUADRANTS.filter(function(q){
    return q.id!==state.activeQuadrant && !wouldCreateCarryCycleClient(s, state.activeQuadrant, q.id);
  });
  carrySelect.innerHTML = '<option value="">'+escapeHtml(t('cnt.carry_from_none_option'))+'</option>' +
    candidateQuads.map(function(q){ return '<option value="'+q.id+'">'+escapeHtml(q.label)+'</option>'; }).join('');
  carrySelect.value = quad.carryFromId || '';
  carrySelect.disabled = quadLocked;
  document.getElementById('quad-finish-btn').style.display = quadLocked ? 'none' : 'inline-block';
  document.getElementById('quad-reopen-btn').style.display = quadLocked ? 'inline-block' : 'none';
  document.getElementById('quad-finish-btn').disabled = readonly;
  document.getElementById('quad-reopen-btn').disabled = readonly;

  var extMs = elapsedMs(s.timer);
  document.getElementById('timer-display').textContent = fmtHMS(extMs);
  document.getElementById('timer-toggle-btn').textContent = s.timer.running ? t('common.pause') : t('common.start');
  document.getElementById('timer-toggle-btn').disabled = readonly;
  document.getElementById('timer-reset-btn').disabled = readonly;
  var rateEl = document.getElementById('timer-rate');
  if (extMs>0 && sum.foliculosExtraidos>0){ rateEl.textContent = t('cnt.rate_hint',{rate:(sum.foliculosExtraidos/(extMs/3600000)).toFixed(0)}); } else { rateEl.textContent=''; }

  var tp = elapsedMs(s.preincTimer);
  document.getElementById('preinc-timer-display').textContent = fmtHMS(tp);
  document.getElementById('preinc-timer-toggle-btn').textContent = s.preincTimer.running ? t('common.pause') : t('common.start');
  document.getElementById('preinc-timer-toggle-btn').disabled = readonly;
  document.getElementById('preinc-timer-reset-btn').disabled = readonly;
  var pTotal = preincTotal(s.preincCounts);
  var prateEl = document.getElementById('preinc-timer-rate');
  if (tp>0 && pTotal>0){ prateEl.textContent = t('preinc.rate_hint',{rate:(pTotal/(tp/3600000)).toFixed(0)}); } else { prateEl.textContent=''; }
  document.getElementById('preinc-total').textContent = pTotal;

  checkAudioMilestone(sum.foliculosExtraidos);
  checkPreincAudioOnChange(pTotal);
  checkTransectionAlerts(sum.taxaParcial, sum.taxaTotal);
  renderPreinc(s);
  renderPhotos(s);
  renderPatientInfo(s);
}
function incBtns(catId){
  var html = '<button class="cat-btn minus" onclick="App.adjust(\''+catId+'\',-1)">-1</button>';
  html += '<button class="cat-btn" onclick="App.adjust(\''+catId+'\',1)">+1</button>';
  state.increments.forEach(function(v){ html += '<button class="cat-btn" onclick="App.adjust(\''+catId+'\','+v+')">+'+v+'</button>'; });
  return html;
}
App.adjust = function(catId, delta){
  if (!state.currentId) return;
  var quad = state.activeQuadrant;
  if (state.session){
    var counts = state.session.quadrants[quad].counts;
    counts[catId] = Math.max(0, (counts[catId]||0) + delta);
    render();
  }
  api('/api/session/'+state.currentId+'/adjust','POST',{quadrant:quad, category:catId, delta:delta}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.sync_failed',{msg:err.message})); fetchAndRender(); });
};
App.editCount = function(catId){
  var s = state.session; if (!s || s.status==='finalizada') return;
  var quad = state.activeQuadrant;
  var qd = s.quadrants[quad];
  if (qd.locked) return;
  var current = qd.counts[catId]||0;
  var predecessorTotal = qd.carryFromId ? chainCumulativeCat(s, qd.carryFromId, catId) : 0;
  var currentChain = predecessorTotal + current;
  var cat = CATS.filter(function(c){ return c.id===catId; })[0];
  promptDialog(t('prompt.set_value_for',{label:(cat?cat.label:catId)}), currentChain).then(function(input){
    if (input===null) return;
    var v = parseInt(input,10);
    if (isNaN(v) || v<0){ toast(t('errors.invalid_value')); return; }
    if (v < predecessorTotal){ toast(t('errors.value_below_carry',{carry:predecessorTotal})); return; }
    var newLocal = v - predecessorTotal;
    var delta = newLocal - current;
    if (delta===0) return;
    App.adjust(catId, delta);
  });
};
App.finishQuadrant = function(){
  var s = state.session; if (!s || s.status==='finalizada') return;
  var quad = state.activeQuadrant;
  if (s.quadrants[quad].locked) return;
  confirmDialog(t('confirm.finish_quadrant')).then(function(ok){
    if (!ok) return;
    api('/api/session/'+state.currentId+'/quadrant-finish','POST',{quadrant:quad}).then(function(updated){
      state.session=updated;
      var idx = -1;
      for (var i=0;i<QUADRANTS.length;i++){ if (QUADRANTS[i].id===quad){ idx=i; break; } }
      var nextQuad = (idx!==-1 && idx+1<QUADRANTS.length) ? QUADRANTS[idx+1] : null;
      if (nextQuad) { state.activeQuadrant = nextQuad.id; }
      render();
      announceQuadFinishAudio(updated, quad);
      toast(t('toast.quadrant_finished'));
    }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
  });
};
App.reopenQuadrant = function(){
  var s = state.session; if (!s || s.status==='finalizada') return;
  var quad = state.activeQuadrant;
  confirmDialog(t('confirm.reopen_quadrant')).then(function(ok){
    if (!ok) return;
    api('/api/session/'+state.currentId+'/quadrant-reopen','POST',{quadrant:quad}).then(function(updated){ state.session=updated; render(); toast(t('toast.quadrant_reopened')); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
  });
};
App.setQuadrantCarryFrom = function(carryFromId){
  var s = state.session; if (!s || s.status==='finalizada') return;
  var quad = state.activeQuadrant;
  api('/api/session/'+state.currentId+'/quadrant-link','POST',{quadrant:quad, carryFromId: carryFromId||null}).then(function(updated){ state.session=updated; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); fetchAndRender(); });
};
App.setQuadMamba = function(value){
  var quad = state.activeQuadrant;
  var v = value===''? null : Number(value);
  api('/api/session/'+state.currentId+'/mamba','POST',{quadrant:quad, value:v}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
function renderPreinc(s){
  var readonly = s.status==='finalizada';
  var container = document.getElementById('group-preincisoes');
  var dist = s.preincDist || {};
  container.innerHTML = PREINC_AREAS.map(function(a){
    var n = s.preincCounts[a.id]||0;
    var cls = readonly ? 'cat-count' : 'cat-count clickable';
    var click = readonly ? '' : ' onclick="App.editPreinc(\''+a.id+'\')"';
    var row = dist[a.id] || {};
    var subCells = DIST_FIOS.map(function(f){
      var dn = row[f.id]||0;
      var dcls = readonly ? 'dist-cell' : 'dist-cell clickable';
      var dclick = readonly ? '' : ' onclick="App.editPreincDist(\''+a.id+'\',\''+f.id+'\')"';
      return '<div class="dist-sub"><span class="dist-sub-lbl">'+escapeHtml(f.label)+'</span><span class="'+dcls+'"'+dclick+'>'+dn+'</span></div>';
    }).join('');
    return '<div class="preinc-item"><div class="cat-label">'+escapeHtml(a.label)+'</div>'+
      '<div class="'+cls+'"'+click+'>'+n+'</div>'+
      '<div class="dist-subrow">'+subCells+'</div></div>';
  }).join('');
  renderPreincDistTotals(s);
}
App.editPreinc = function(areaId){
  var s = state.session; if (!s || s.status==='finalizada') return;
  var area = PREINC_AREAS.filter(function(a){ return a.id===areaId; })[0];
  var current = s.preincCounts[areaId]||0;
  promptDialog(t('prompt.set_value_for',{label:(area?area.label:areaId)}), current).then(function(input){
    if (input===null) return;
    var v = parseInt(input,10);
    if (isNaN(v) || v<0){ toast(t('errors.invalid_value')); return; }
    api('/api/session/'+state.currentId+'/preinc','POST',{area:areaId, value:v}).then(function(s2){ state.session=s2; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
  });
};
function renderPreincDistTotals(s){
  var dist = s.preincDist || {};
  var totalsByFio = {}; DIST_FIOS.forEach(function(f){ totalsByFio[f.id]=0; });
  var grandTotal = 0;
  PREINC_AREAS.forEach(function(a){
    var row = dist[a.id] || {};
    DIST_FIOS.forEach(function(f){ var n=row[f.id]||0; totalsByFio[f.id]+=n; grandTotal+=n; });
  });
  var items = DIST_FIOS.map(function(f){
    return '<div class="summary-item"><div class="val">'+totalsByFio[f.id]+'</div><div class="lbl">Total '+escapeHtml(f.label)+'</div></div>';
  }).join('');
  items += '<div class="summary-item"><div class="val">'+grandTotal+'</div><div class="lbl">Total geral (UFs)</div></div>';
  document.getElementById('preinc-dist-totals').innerHTML = items;
}
App.editPreincDist = function(areaId, fioId){
  var s = state.session; if (!s || s.status==='finalizada') return;
  var area = PREINC_AREAS.filter(function(a){ return a.id===areaId; })[0];
  var fio = DIST_FIOS.filter(function(f){ return f.id===fioId; })[0];
  var current = (s.preincDist && s.preincDist[areaId]) ? (s.preincDist[areaId][fioId]||0) : 0;
  var label = (area?area.label:areaId)+' — '+(fio?fio.label:fioId);
  promptDialog(t('prompt.set_quantity_for',{label:label}), current).then(function(input){
    if (input===null) return;
    var v = parseInt(input,10);
    if (isNaN(v) || v<0){ toast(t('errors.invalid_value')); return; }
    api('/api/session/'+state.currentId+'/preinc-dist','POST',{area:areaId, fio:fioId, value:v}).then(function(s2){ state.session=s2; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
  });
};
function renderPhotos(s){
  ['marcacao','posop'].forEach(function(cat){
    var el = document.getElementById('photos-grid-'+cat);
    var list = s.photos[cat]||[];
    el.innerHTML = list.map(function(p){
      return '<div class="photo-thumb"><img src="/api/session/'+s.id+'/photos/'+p.id+'" loading="lazy">'+
        '<button class="photo-remove" onclick="App.removePhoto(\''+p.id+'\')">×</button></div>';
    }).join('');
  });
}
function renderPatientInfo(s){
  var pi = s.patientInfo || {};
  var idadeEl = document.getElementById('patient-idade');
  if (document.activeElement !== idadeEl) idadeEl.value = (pi.idade===null||pi.idade===undefined) ? '' : pi.idade;
  var alturaEl = document.getElementById('patient-altura');
  if (document.activeElement !== alturaEl) alturaEl.value = (pi.alturaCm===null||pi.alturaCm===undefined) ? '' : pi.alturaCm;
  var pesoEl = document.getElementById('patient-peso');
  if (document.activeElement !== pesoEl) pesoEl.value = (pi.pesoKg===null||pi.pesoKg===undefined) ? '' : pi.pesoKg;
  var patientChoicePairs = [
    ['patient-espessura-fino','cabeloEspessura','fino'], ['patient-espessura-grosso','cabeloEspessura','grosso'],
    ['patient-textura-liso','cabeloTextura','liso'], ['patient-textura-ondulado','cabeloTextura','ondulado'], ['patient-textura-crespo','cabeloTextura','crespo'],
    ['patient-raspagem-sim','raspagem','sim'], ['patient-raspagem-nao','raspagem','nao']
  ];
  patientChoicePairs.forEach(function(pair){
    var el = document.getElementById(pair[0]);
    if (el) el.className = 'btn' + (pi[pair[1]]===pair[2] ? '' : ' secondary');
  });
}
App.setPatientField = function(field, value){
  var payload = {}; payload[field] = value;
  api('/api/session/'+state.currentId+'/patient-info','POST',payload).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
App.refreshNewPatientButtons = function(){
  var p = state.newPatientInfo || {};
  var pairs = [
    ['new-patient-espessura-fino','cabeloEspessura','fino'], ['new-patient-espessura-grosso','cabeloEspessura','grosso'],
    ['new-patient-textura-liso','cabeloTextura','liso'], ['new-patient-textura-ondulado','cabeloTextura','ondulado'], ['new-patient-textura-crespo','cabeloTextura','crespo'],
    ['new-patient-raspagem-sim','raspagem','sim'], ['new-patient-raspagem-nao','raspagem','nao']
  ];
  pairs.forEach(function(pair){
    var el = document.getElementById(pair[0]);
    if (el) el.className = 'btn' + (p[pair[1]]===pair[2] ? '' : ' secondary');
  });
};
App.setNewPatientField = function(field, value){
  state.newPatientInfo[field] = value;
  App.refreshNewPatientButtons();
};
App.uploadPhotos = function(category, inputEl){
  var files = Array.prototype.slice.call((inputEl && inputEl.files) || []);
  if (!files.length) return;
  toast(t('toast.uploading_photos',{n:files.length}));
  var chain = Promise.resolve();
  files.forEach(function(file){
    chain = chain.then(function(){ return resizeImageFile(file, 1600, 0.82); })
      .then(function(dataUrl){ return api('/api/session/'+state.currentId+'/photos','POST',{category:category, dataUrl:dataUrl}); })
      .then(function(s){ state.session=s; render(); });
  });
  chain.then(function(){ inputEl.value=''; toast(t('toast.photos_uploaded')); })
    .catch(function(err){ toast(t('toast.photo_upload_error',{msg:err.message})); });
};
App.removePhoto = function(photoId){
  confirmDialog(t('confirm.delete_photo')).then(function(ok){
    if (!ok) return;
    api('/api/session/'+state.currentId+'/photos/'+photoId+'/delete','POST',{}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
  });
};
function resizeImageFile(file, maxDim, quality){
  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onload = function(e){
      var img = new Image();
      img.onload = function(){
        var w=img.width, h=img.height;
        var scale = Math.min(1, maxDim/Math.max(w,h));
        var cw = Math.max(1, Math.round(w*scale)), ch = Math.max(1, Math.round(h*scale));
        var canvas = document.createElement('canvas'); canvas.width=cw; canvas.height=ch;
        var ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,cw,ch);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = function(){ reject(new Error('HEIC_DECODE_FAIL')); };
      img.src = e.target.result;
    };
    reader.onerror = function(){ reject(new Error(t('errors.file_read_error'))); };
    reader.readAsDataURL(file);
  });
}
function resizeLogoFile(file, maxDim){
  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onload = function(e){
      var img = new Image();
      img.onload = function(){
        var w=img.width, h=img.height;
        var scale = Math.min(1, maxDim/Math.max(w,h));
        var cw = Math.max(1, Math.round(w*scale)), ch = Math.max(1, Math.round(h*scale));
        var canvas = document.createElement('canvas'); canvas.width=cw; canvas.height=ch;
        var ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,cw,ch);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = function(){ reject(new Error('Não consegui ler essa imagem.')); };
      img.src = e.target.result;
    };
    reader.onerror = function(){ reject(new Error(t('errors.file_read_error'))); };
    reader.readAsDataURL(file);
  });
}
App.uploadLogo = function(inputEl){
  var file = inputEl.files && inputEl.files[0];
  if (!file) return;
  resizeLogoFile(file, 480).then(function(dataUrl){
    return api('/api/me/logo','POST',{dataUrl:dataUrl});
  }).then(function(r){
    state.currentUser = r.user; applyBranding(r.user.branding); renderSettingsScreen();
    inputEl.value=''; toast(t('toast.logo_updated'));
  }).catch(function(err){ toast(t('toast.logo_upload_error',{msg:err.message})); });
};
App.removeLogo = function(){
  confirmDialog(t('confirm.delete_logo')).then(function(ok){
    if (!ok) return;
    api('/api/me/logo/delete','POST',{}).then(function(r){
      state.currentUser = r.user; applyBranding(r.user.branding); renderSettingsScreen();
      toast(t('toast.logo_removed'));
    }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
  });
};
App.setTheme = function(theme){
  api('/api/me/branding','POST',{theme:theme}).then(function(r){
    state.currentUser = r.user; applyBranding(r.user.branding); renderSettingsScreen();
  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
App.toggleDarkMode = function(checked){
  api('/api/me/branding','POST',{darkMode:checked}).then(function(r){
    state.currentUser = r.user; applyBranding(r.user.branding);
  }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
App.toggleTimer = function(){
  if (!state.currentId || !state.session) return;
  var action = state.session.timer.running ? 'pause' : 'start';
  api('/api/session/'+state.currentId+'/timer','POST',{action:action}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
App.resetTimer = function(){ confirmDialog(t('confirm.reset_extraction_timer')).then(function(ok){ if (!ok) return; api('/api/session/'+state.currentId+'/timer','POST',{action:'reset'}).then(function(s){ state.session=s; render(); }); }); };
App.togglePreincTimer = function(){
  if (!state.currentId || !state.session) return;
  var action = state.session.preincTimer.running ? 'pause' : 'start';
  api('/api/session/'+state.currentId+'/preinc-timer','POST',{action:action}).then(function(s){ state.session=s; render(); }).catch(function(err){ toast(t('toast.generic_error',{msg:err.message})); });
};
App.resetPreincTimer = function(){ confirmDialog(t('confirm.reset_preinc_timer')).then(function(ok){ if (!ok) return; api('/api/session/'+state.currentId+'/preinc-timer','POST',{action:'reset'}).then(function(s){ state.session=s; render(); }); }); };
App.finalizeSession = function(){ confirmDialog(t('confirm.finalize_surgery')).then(function(ok){ if (!ok) return; api('/api/session/'+state.currentId+'/finalize','POST',{}).then(function(s){ state.session=s; render(); App.switchTab('resumofinal'); toast(t('toast.surgery_finalized')); }); }); };
App.reopenSession = function(){ api('/api/session/'+state.currentId+'/reopen','POST',{}).then(function(s){ state.session=s; render(); toast(t('toast.surgery_reopened')); }); };
App.openShareModal = function(){
  document.getElementById('share-url').textContent = shareUrlFor(state.currentId);
  document.getElementById('share-modal-overlay').classList.add('show');
};
App.closeShareModal = function(){
  document.getElementById('share-modal-overlay').classList.remove('show');
};
// confirmDialog()/promptDialog(): substitutos do window.confirm()/window.prompt()
// nativos, usando o mesmo modal HTML (.modal-overlay/.modal-box) do modal de
// compartilhar. Ambos retornam uma Promise, então todo call site que usava
// confirm()/prompt() de forma síncrona precisou virar um .then(). O motivo é o
// bug relatado pelo Dr. Vitor: no iPad dele, depois de vários confirm()/prompt()
// na mesma cirurgia (editCount usa prompt() dezenas de vezes por quadrante), o
// Safari do iOS passa a bloquear silenciosamente TODOS os diálogos nativos
// seguintes — sem erro, sem aviso, só retornando false/null direto — fazendo o
// botão de finalizar quadrante parecer travado sem motivo aparente. Um modal
// próprio não sofre desse bloqueio.
var dialogModalResolve = null;
var dialogModalIsPrompt = false;
function showDialogModal(message, opts){
  opts = opts || {};
  return new Promise(function(resolve){
    dialogModalResolve = resolve;
    dialogModalIsPrompt = !!opts.isPrompt;
    document.getElementById('dialog-modal-message').textContent = message;
    var inputWrap = document.getElementById('dialog-modal-input-wrap');
    var input = document.getElementById('dialog-modal-input');
    if (dialogModalIsPrompt){
      inputWrap.style.display = 'block';
      input.value = (opts.defaultValue===undefined || opts.defaultValue===null) ? '' : opts.defaultValue;
    } else {
      inputWrap.style.display = 'none';
    }
    document.getElementById('dialog-modal-overlay').classList.add('show');
    if (dialogModalIsPrompt){
      setTimeout(function(){ if (input.focus) input.focus(); if (input.select) input.select(); }, 50);
    }
  });
}
function closeDialogModal(result){
  document.getElementById('dialog-modal-overlay').classList.remove('show');
  var resolveFn = dialogModalResolve;
  dialogModalResolve = null;
  if (resolveFn) resolveFn(result);
}
App.dialogModalOk = function(){
  if (dialogModalIsPrompt){
    var v = document.getElementById('dialog-modal-input').value;
    closeDialogModal(v);
  } else {
    closeDialogModal(true);
  }
};
App.dialogModalCancel = function(){
  closeDialogModal(dialogModalIsPrompt ? null : false);
};
function confirmDialog(message){ return showDialogModal(message, {isPrompt:false}); }
function promptDialog(message, defaultValue){ return showDialogModal(message, {isPrompt:true, defaultValue:defaultValue}); }
App.copyShareUrl = function(){
  var url = shareUrlFor(state.currentId);
  if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(function(){ toast(t('toast.address_copied')); }, function(){ toast(t('toast.copy_failed_manual')); }); }
  else { toast(t('toast.copy_manually',{url:url}), 4000); }
};
App.shareViaSystem = function(){
  var url = shareUrlFor(state.currentId);
  var codigo = state.session ? state.session.codigo : '';
  if (navigator.share){
    navigator.share({title:'Graftis — '+codigo, text:'Entrar na contagem da cirurgia '+codigo+':', url:url}).catch(function(){});
  } else {
    toast(t('toast.no_native_share'), 3000);
  }
};
App.shareViaWhatsapp = function(){
  var url = shareUrlFor(state.currentId);
  var codigo = state.session ? state.session.codigo : '';
  var text = 'Entrar na contagem da cirurgia '+codigo+': '+url;
  window.open('https://wa.me/?text='+encodeURIComponent(text), '_blank');
};
App.printReport = function(){
  var s = state.session; if (!s) return;
  var combined = combinedExtractionCounts(s);
  var sum = computeSummary(combined, s.mode||'completo');
  var msPrint = elapsedMs(s.timer);
  var msGlobalPrint = globalElapsedMs(s);
  var ritmoPrint = (msPrint>0 && sum.foliculosExtraidos>0) ? (sum.foliculosExtraidos/(msPrint/3600000)) : null;
  var finalMamba = mambaFinalCumulativo(s);
  var mdiffGeral = computeMambaDiff(finalMamba, sum.foliculosExtraidos);

  var pi = s.patientInfo || {};
  var piParts = [];
  if (pi.idade!==null && pi.idade!==undefined) piParts.push('<div>'+escapeHtml(t('patient.age_label'))+'<br><b>'+pi.idade+'</b></div>');
  if (pi.alturaCm!==null && pi.alturaCm!==undefined) piParts.push('<div>'+escapeHtml(t('patient.height_label'))+'<br><b>'+pi.alturaCm+'</b></div>');
  if (pi.pesoKg!==null && pi.pesoKg!==undefined) piParts.push('<div>'+escapeHtml(t('patient.weight_label'))+'<br><b>'+pi.pesoKg+'</b></div>');
  if (pi.cabeloEspessura) piParts.push('<div>'+escapeHtml(t('patient.hair_thickness_label'))+'<br><b>'+escapeHtml(t(pi.cabeloEspessura==='fino'?'patient.hair_thin':'patient.hair_thick'))+'</b></div>');
  if (pi.cabeloTextura) {
    var texturaKey = pi.cabeloTextura==='liso' ? 'patient.hair_straight' : (pi.cabeloTextura==='ondulado' ? 'patient.hair_wavy' : 'patient.hair_curly');
    piParts.push('<div>'+escapeHtml(t('patient.hair_texture_label'))+'<br><b>'+escapeHtml(t(texturaKey))+'</b></div>');
  }
  if (pi.raspagem) piParts.push('<div>'+escapeHtml(t('patient.surgery_type_label'))+'<br><b>'+escapeHtml(t(pi.raspagem==='sim'?'patient.with_shaving':'patient.without_shaving'))+'</b></div>');
  var patientInfoHtml = piParts.length ? ('<h2>'+escapeHtml(t('patient.section_title'))+'</h2><div class="print-summary">'+piParts.join('')+'</div>') : '';

  var quadrantsHtml = QUADRANTS.map(function(q){
    var qc = s.quadrants[q.id].counts;
    var qsum = computeSummary(qc, s.mode||'completo');
    var rows = function(group){
      return CATS.filter(function(c){return c.group===group;}).map(function(c){
        var n = qc[c.id]||0;
        return '<tr><td>'+escapeHtml(c.label)+'</td><td>'+c.hairs+'</td><td>'+n+'</td><td>'+(n*c.hairs)+'</td></tr>';
      }).join('');
    };
    var mc = s.quadrants[q.id].mambaCumulativo;
    var mcHtml = '';
    if (mc!==null && mc!==undefined && mc!==''){
      var prev = mambaPrevCumulativo(s, q.id);
      var delta = Number(mc) - prev;
      var qmdiff = computeMambaDiff(delta, qsum.foliculosExtraidos);
      var qDur = quadrantDurationMs(s, q.id);
      var qRate = mambaRatePerHour(delta, qDur);
      mcHtml = '<div class="print-summary">' +
        '<div>'+escapeHtml(t('print.mamba_accumulated_label'))+'<br><b>'+mc+'</b></div>' +
        '<div>'+escapeHtml(t('cnt.mamba_quad_val'))+'<br><b>'+delta+'</b></div>' +
        (qmdiff ? '<div>'+escapeHtml(t('cnt.mamba_diff'))+'<br><b>'+(qmdiff.diff>0?'+':'')+qmdiff.diff+' ('+(qmdiff.diffPct>0?'+':'')+qmdiff.diffPct.toFixed(1)+'%)</b></div>' : '') +
        (qDur ? '<div>'+escapeHtml(t('cnt.mamba_quad_duration'))+'<br><b>'+fmtHMS(qDur)+'</b></div>' : '') +
        (qRate!==null ? '<div>'+escapeHtml(t('print.mamba_rate_label'))+'<br><b>'+qRate.toFixed(0)+t('print.fol_per_hour_suffix')+'</b></div>' : '') +
      '</div>';
    }
    return '' +
      '<h2>'+escapeHtml(t('print.extraction_prefix'))+escapeHtml(q.label)+'</h2>' +
      '<div class="print-summary">' +
        '<div>'+escapeHtml(t('cnt.summary_extracted'))+'<br><b>'+qsum.foliculosExtraidos+'</b></div>' +
        '<div>'+escapeHtml(t('cnt.summary_total_hairs'))+'<br><b>'+qsum.totalFios+'</b></div>' +
        '<div>'+escapeHtml(t('print.index_label'))+'<br><b>'+qsum.indice.toFixed(2)+'</b></div>' +
        '<div>'+escapeHtml(t('cnt.summary_partial_transec'))+'<br><b>'+qsum.taxaParcial.toFixed(1)+'%</b></div>' +
        '<div>'+escapeHtml(t('cnt.summary_total_transec'))+'<br><b>'+qsum.taxaTotal.toFixed(1)+'%</b></div>' +
        '<div>'+escapeHtml(t('cnt.summary_mini'))+'<br><b>'+qsum.miniTotal+'</b></div>' +
      '</div>' +
      mcHtml +
      '<table><tr><th>'+escapeHtml(t('dash.table_category'))+'</th><th>'+escapeHtml(t('print.table_hairs_per_follicle'))+'</th><th>'+escapeHtml(t('print.table_qty'))+'</th><th>'+escapeHtml(t('print.table_total_hairs'))+'</th></tr>'+rows('integro')+rows((s.mode==='reduzido')?'parcial_reduzida':'parcial')+rows('total')+rows('mini')+'</table>';
  }).join('');

  var pTotal = preincTotal(s.preincCounts);
  var msPreinc = elapsedMs(s.preincTimer);
  var ritmoPreinc = (msPreinc>0 && pTotal>0) ? (pTotal/(msPreinc/3600000)) : null;
  var preincRows = PREINC_AREAS.map(function(a){
    return '<tr><td>'+escapeHtml(a.label)+'</td><td>'+(s.preincCounts[a.id]||0)+'</td></tr>';
  }).join('');
  var preincHtml = '<h2>'+escapeHtml(t('cnt.tab_preinc'))+'</h2>' +
    '<div class="print-summary">' +
      '<div>'+escapeHtml(t('preinc.total_label'))+'<br><b>'+pTotal+'</b></div>' +
      '<div>'+escapeHtml(t('preinc.time_title'))+'<br><b>'+fmtHMS(msPreinc)+'</b></div>' +
      (ritmoPreinc ? '<div>'+escapeHtml(t('print.rate_avg_label'))+'<br><b>'+ritmoPreinc.toFixed(0)+t('print.preinc_per_hour_suffix')+'</b></div>' : '') +
    '</div>' +
    '<table><tr><th>'+escapeHtml(t('print.table_area'))+'</th><th>'+escapeHtml(t('print.table_preincisions'))+'</th></tr>'+preincRows+'</table>';

  var distDataP = s.preincDist || {};
  var distTotalsP = {}; DIST_FIOS.forEach(function(f){ distTotalsP[f.id]=0; });
  var distGrandTotalP = 0;
  var distRowsP = PREINC_AREAS.map(function(a){
    var row = distDataP[a.id] || {};
    var rowTotal = 0;
    var cells = DIST_FIOS.map(function(f){ var n=row[f.id]||0; rowTotal+=n; distTotalsP[f.id]+=n; return '<td>'+n+'</td>'; }).join('');
    distGrandTotalP += rowTotal;
    return '<tr><td>'+escapeHtml(a.label)+'</td>'+cells+'<td>'+rowTotal+'</td></tr>';
  }).join('');
  var distHeaderP = '<tr><th>'+escapeHtml(t('print.table_area'))+'</th>'+DIST_FIOS.map(function(f){ return '<th>'+escapeHtml(f.label)+'</th>'; }).join('')+'<th>'+escapeHtml(t('print.table_total'))+'</th></tr>';
  var distFooterP = '<tr><td>'+escapeHtml(t('print.table_grand_total'))+'</td>'+DIST_FIOS.map(function(f){ return '<td>'+distTotalsP[f.id]+'</td>'; }).join('')+'<td>'+distGrandTotalP+'</td></tr>';
  var distHtml = '<h2>'+escapeHtml(t('print.dist_title'))+'</h2><table>'+distHeaderP+distRowsP+distFooterP+'</table>';

  var photoBlock = function(cat, label){
    var list = s.photos[cat]||[];
    if (!list.length) return '';
    return '<h2>'+label+'</h2><div class="photo-print-grid">'+list.map(function(p){
      return '<img src="/api/session/'+s.id+'/photos/'+p.id+'">';
    }).join('')+'</div>';
  };
  var hasPhotos = (s.photos.marcacao||[]).length || (s.photos.posop||[]).length;

  var logoHtml = (s.ownerBranding && s.ownerBranding.logoFilename && s.ownerBranding.ownerId) ?
    '<img src="/api/user/'+s.ownerBranding.ownerId+'/logo" style="max-height:60px;max-width:220px;object-fit:contain;display:block;margin-bottom:6px;">' : '';
  var html = '' +
    logoHtml +
    '<h1>'+escapeHtml(t('print.title'))+'</h1>' +
    '<div>'+escapeHtml(t('print.patient_label'))+': <b>'+escapeHtml(s.codigo)+'</b> &nbsp;|&nbsp; '+escapeHtml(t('print.status_label'))+': <b>'+(s.status==='finalizada'?t('common.status_finalized'):t('common.status_in_progress'))+'</b> &nbsp;|&nbsp; '+escapeHtml(t('print.mode_label'))+': <b>'+((s.mode==='reduzido')?t('common.mode_reduced'):t('common.mode_complete'))+'</b></div>' +
    patientInfoHtml +
    '<h2>'+escapeHtml(t('cnt.summary_general_title'))+'</h2>' +
    '<div class="print-summary">' +
      '<div>'+escapeHtml(t('cnt.summary_extracted'))+'<br><b>'+sum.foliculosExtraidos+'</b></div>' +
      '<div>'+escapeHtml(t('cnt.summary_total_hairs'))+'<br><b>'+sum.totalFios+'</b></div>' +
      '<div>'+escapeHtml(t('print.index_label'))+'<br><b>'+sum.indice.toFixed(2)+'</b></div>' +
      '<div>'+escapeHtml(t('cnt.summary_partial_transec'))+'<br><b>'+sum.taxaParcial.toFixed(1)+'%</b></div>' +
      '<div>'+escapeHtml(t('cnt.summary_total_transec'))+'<br><b>'+sum.taxaTotal.toFixed(1)+'%</b></div>' +
      '<div>'+escapeHtml(t('cnt.summary_mini'))+'<br><b>'+sum.miniTotal+'</b></div>' +
      '<div>'+escapeHtml(t('cnt.extraction_time_title'))+'<br><b>'+fmtHMS(msPrint)+'</b></div>' +
      (ritmoPrint ? '<div>'+escapeHtml(t('print.rate_avg_label'))+'<br><b>'+ritmoPrint.toFixed(0)+t('print.fol_per_hour_suffix')+'</b></div>' : '') +
      (msGlobalPrint!==null ? '<div>'+escapeHtml(t('print.total_surgery_time_label'))+'<br><b>'+fmtHMS(msGlobalPrint)+'</b></div>' : '') +
    '</div>' +
    (mdiffGeral ? '<div class="print-summary"><div>'+escapeHtml(t('cnt.mamba_reading'))+'<br><b>'+mdiffGeral.mamba+'</b></div><div>'+escapeHtml(t('cnt.summary_extracted'))+'<br><b>'+mdiffGeral.base+'</b></div><div>'+escapeHtml(t('cnt.mamba_diff'))+'<br><b>'+(mdiffGeral.diff>0?'+':'')+mdiffGeral.diff+' ('+(mdiffGeral.diffPct>0?'+':'')+mdiffGeral.diffPct.toFixed(1)+'%)</b></div>'+(mambaRatePerHour(mdiffGeral.mamba, msPrint>0?msPrint:null)!==null ? '<div>'+escapeHtml(t('print.mamba_rate_label'))+'<br><b>'+mambaRatePerHour(mdiffGeral.mamba, msPrint).toFixed(0)+t('print.fol_per_hour_suffix')+'</b></div>' : '')+'</div>' : '') +
    quadrantsHtml +
    preincHtml +
    distHtml +
    (hasPhotos ? '<div class="photo-report-page">'+photoBlock('marcacao',escapeHtml(t('print.photos_prefix'))+escapeHtml(t('photos.marcacao_title')))+photoBlock('posop',escapeHtml(t('print.photos_prefix'))+escapeHtml(t('photos.posop_title')))+'</div>' : '') +
    '<p style="margin-top:16px;font-size:11px;color:#666;">'+escapeHtml(t('print.generated_at'))+new Date().toLocaleString(localeForLang())+'</p>';
  document.getElementById('print-report').innerHTML = html;
  window.print();
};
// fmtHM: duração amigável "Xh YYmin", usada só no Relatório para o paciente — o
// relatório técnico interno (App.printReport) continua usando fmtHMS (HH:MM:SS).
function fmtHM(ms){
  var totalMin = Math.max(0, Math.round(ms/60000));
  var h = Math.floor(totalMin/60), m = totalMin%60;
  return h+'h '+String(m).padStart(2,'0')+'min';
}
// Relatório para o paciente: pedido do Dr. Vitor (17/07/2026) — versão separada e
// redesenhada do relatório de impressão, focada só no que o paciente quer ver e
// pronta pra entregar impressa: dados do paciente, fotos, total de folículos por
// tipo (só íntegros + mini — deixa de fora Mamba, transecção e distribuição de
// unidades por fio, que são controle de qualidade interno, não interessam ao
// paciente), índice, total de fios, incisões por área e tempos cirúrgicos (agora
// em 4 etapas: pré-incisões, extração, implantação — calculada como o tempo total
// menos as outras duas, não cronometrada à parte — e tempo total). O relatório
// técnico completo (App.printReport) continua existindo do jeito que está, pro uso
// interno da equipe.
App.printPatientReport = function(){
  var s = state.session; if (!s) return;
  var combined = combinedExtractionCounts(s);
  var sum = computeSummary(combined, s.mode||'completo');

  var pi = s.patientInfo || {};
  var piParts = [];
  if (pi.idade!==null && pi.idade!==undefined) piParts.push('<span class="pr-item">'+escapeHtml(t('patient.age_label'))+' <b>'+pi.idade+'</b></span>');
  if (pi.alturaCm!==null && pi.alturaCm!==undefined) piParts.push('<span class="pr-item">'+escapeHtml(t('patient.height_label'))+' <b>'+pi.alturaCm+'</b></span>');
  if (pi.pesoKg!==null && pi.pesoKg!==undefined) piParts.push('<span class="pr-item">'+escapeHtml(t('patient.weight_label'))+' <b>'+pi.pesoKg+'</b></span>');
  if (pi.cabeloEspessura) piParts.push('<span class="pr-item">'+escapeHtml(t('patient.hair_thickness_label'))+' <b>'+escapeHtml(t(pi.cabeloEspessura==='fino'?'patient.hair_thin':'patient.hair_thick'))+'</b></span>');
  if (pi.cabeloTextura){
    var texturaKey = pi.cabeloTextura==='liso' ? 'patient.hair_straight' : (pi.cabeloTextura==='ondulado' ? 'patient.hair_wavy' : 'patient.hair_curly');
    piParts.push('<span class="pr-item">'+escapeHtml(t('patient.hair_texture_label'))+' <b>'+escapeHtml(t(texturaKey))+'</b></span>');
  }

  var patientCats = CATS.filter(function(c){ return c.group==='integro' || c.group==='mini'; });
  var maxCatCount = 0;
  patientCats.forEach(function(c){ var n = combined[c.id]||0; if (n>maxCatCount) maxCatCount = n; });
  var barsHtml = patientCats.map(function(c){
    var n = combined[c.id]||0;
    var pct = (maxCatCount>0 && n>0) ? Math.max(2, Math.round(n/maxCatCount*100)) : 0;
    return '<div class="pr-bar-row"><div class="pr-bar-label">'+escapeHtml(c.label)+'</div><div class="pr-bar-track"><div class="pr-bar-fill" style="width:'+pct+'%"></div></div><div class="pr-bar-count">'+n+'</div></div>';
  }).join('');

  var half = Math.ceil(PREINC_AREAS.length/2);
  var areaRow = function(a){ return '<div class="pr-area-row"><span>'+escapeHtml(a.label)+'</span><span class="pr-n">'+(s.preincCounts[a.id]||0)+'</span></div>'; };
  var areasColA = PREINC_AREAS.slice(0,half).map(areaRow).join('');
  var areasColB = PREINC_AREAS.slice(half).map(areaRow).join('');

  var msPreinc = elapsedMs(s.preincTimer);
  var msExtraction = elapsedMs(s.timer);
  var msTotal = globalElapsedMs(s);
  var msImplant = (msTotal!==null) ? Math.max(0, msTotal - msPreinc - msExtraction) : null;
  var timesHtml = '<div class="pr-times">' +
    '<div class="pr-t"><div class="pr-t-lbl">'+escapeHtml(t('patrep.time_preinc'))+'</div><div class="pr-t-val">'+fmtHM(msPreinc)+'</div></div>' +
    '<div class="pr-t"><div class="pr-t-lbl">'+escapeHtml(t('patrep.time_extraction'))+'</div><div class="pr-t-val">'+fmtHM(msExtraction)+'</div></div>' +
    (msImplant!==null ? '<div class="pr-t"><div class="pr-t-lbl">'+escapeHtml(t('patrep.time_implant'))+'</div><div class="pr-t-val">'+fmtHM(msImplant)+'</div></div>' : '') +
    (msTotal!==null ? '<div class="pr-t"><div class="pr-t-lbl">'+escapeHtml(t('patrep.time_total'))+'</div><div class="pr-t-val">'+fmtHM(msTotal)+'</div></div>' : '') +
  '</div>';

  var photoBlock = function(cat, titleKey){
    var list = s.photos[cat]||[];
    if (!list.length) return '';
    return '<div class="pr-photos-block"><p class="pr-photo-group-title">'+escapeHtml(t(titleKey))+'</p><div class="pr-photos-grid">'+list.map(function(p){
      return '<img src="/api/session/'+s.id+'/photos/'+p.id+'">';
    }).join('')+'</div></div>';
  };
  var photosHtml = photoBlock('marcacao','photos.marcacao_title')+photoBlock('posop','photos.posop_title');
  var hasPhotos = (s.photos.marcacao||[]).length || (s.photos.posop||[]).length;

  // Sem logo do médico no cabeçalho — pedido do Dr. Vitor (17/07/2026), depois de
  // testar com a logo de verdade e preferir só o nome/CRM em texto. O cabeçalho
  // verde (teal da marca) foi mantido, ele gostou desse. A pequena assinatura
  // "Gerado com Graftis" agora aparece TAMBÉM no cabeçalho (além do rodapé) — ele
  // pediu, pra garantir que a marca apareça mesmo que alguém só veja a primeira
  // parte do documento.
  var ob = s.ownerBranding || {};
  var doctorName = ob.nomeCompleto ? escapeHtml(ob.nomeCompleto) : '';
  var crmLine = ob.crm ? escapeHtml(t('patrep.crm_prefix'))+escapeHtml(ob.crm) : '';

  var dataGridHtml = '<div class="pr-data-grid">' +
    '<div><p class="pr-eyebrow">'+escapeHtml(t('patrep.section_follicles'))+'</p>'+barsHtml+'</div>' +
    '<div class="pr-incisions-wrap"><p class="pr-eyebrow">'+escapeHtml(t('patrep.section_incisions'))+'</p><div class="pr-incisions-cols"><div>'+areasColA+'</div><div>'+areasColB+'</div></div></div>' +
  '</div>';

  var html = '' +
    '<div class="pr-masthead">' +
      '<div><div class="pr-brand-name">'+(doctorName||'Graftis')+'</div>'+(crmLine?'<div class="pr-clinic-line">'+crmLine+'</div>':'')+'</div>' +
      '<div class="pr-masthead-right"><div class="pr-doc-title">'+escapeHtml(t('patrep.doc_title'))+'</div><div class="pr-doc-date">'+new Date().toLocaleDateString(localeForLang())+'</div><div class="pr-masthead-sig">'+escapeHtml(t('patrep.footer_signature'))+'</div></div>' +
    '</div>' +
    '<div class="pr-stub"><span class="pr-item">'+escapeHtml(t('patrep.patient_label'))+' <b>'+escapeHtml(s.codigo)+'</b></span>'+piParts.join('')+'</div>' +
    '<div class="pr-hero">' +
      '<div class="pr-seal"><div class="pr-num">'+fmtBig(sum.foliculosExtraidos)+'</div><div class="pr-cap">'+escapeHtml(t('patrep.seal_caption'))+'</div></div>' +
      '<div class="pr-hero-copy"><h1>'+escapeHtml(t('patrep.hero_title'))+'</h1><p>'+escapeHtml(t('patrep.hero_body'))+'</p></div>' +
    '</div>' +
    '<div class="pr-kpi-row">' +
      '<div class="pr-kpi"><div class="pr-val">'+sum.indice.toFixed(2)+'</div><div class="pr-lbl">'+escapeHtml(t('patrep.kpi_index'))+'</div></div>' +
      '<div class="pr-kpi"><div class="pr-val">'+fmtBig(sum.totalFios)+'</div><div class="pr-lbl">'+escapeHtml(t('patrep.kpi_total_hairs'))+'</div></div>' +
      (msTotal!==null ? '<div class="pr-kpi"><div class="pr-val">'+fmtHM(msTotal)+'</div><div class="pr-lbl">'+escapeHtml(t('patrep.kpi_total_time'))+'</div></div>' : '') +
    '</div>' +
    '<div class="pr-section">'+dataGridHtml+'</div>' +
    '<div class="pr-section"><p class="pr-eyebrow">'+escapeHtml(t('patrep.section_times'))+'</p>'+timesHtml+'</div>' +
    (hasPhotos ? '<div class="pr-section"><p class="pr-eyebrow">'+escapeHtml(t('patrep.section_photos'))+'</p>'+photosHtml+'</div>' : '') +
    '<div class="pr-footer"><span class="pr-sig"><svg width="11" height="11" viewBox="0 0 120 120"><g stroke="#B8804A" stroke-width="8" stroke-linecap="round" fill="none"><line x1="60" y1="52" x2="60" y2="20"/><line x1="48" y1="55" x2="34" y2="30"/><line x1="72" y1="55" x2="86" y2="30"/></g><ellipse cx="60" cy="76" rx="27" ry="21" fill="#B8804A"/></svg>'+escapeHtml(t('patrep.footer_signature'))+'</span></div>';

  document.getElementById('print-patient-report').innerHTML = html;
  window.print();
};
function audioKey(id){ return 'fue_live_audio_'+id; }
function loadAudioPrefs(id){
  try{ var raw = localStorage.getItem(audioKey(id));
    var p = raw ? JSON.parse(raw) : {enabled:false, interval:100, lastAnnounced:0, preincEnabled:false, preincLastTotal:null, quadFinishEnabled:false, alertParcialEnabled:false, alertParcialThreshold:null, alertTotalEnabled:false, alertTotalThreshold:null};
    state.audioEnabled = !!p.enabled; state.audioInterval = p.interval||100; state.lastAnnounced = p.lastAnnounced||0;
    state.preincAudioEnabled = !!p.preincEnabled; state.preincLastTotal = (p.preincLastTotal===undefined?null:p.preincLastTotal);
    state.quadFinishAudioEnabled = !!p.quadFinishEnabled;
    state.alertParcialEnabled = !!p.alertParcialEnabled; state.alertParcialThreshold = (p.alertParcialThreshold===undefined?null:p.alertParcialThreshold);
    state.alertTotalEnabled = !!p.alertTotalEnabled; state.alertTotalThreshold = (p.alertTotalThreshold===undefined?null:p.alertTotalThreshold);
    state.alertParcialFired = false; state.alertTotalFired = false;
  }catch(e){
    state.audioEnabled=false; state.audioInterval=100; state.lastAnnounced=0;
    state.preincAudioEnabled=false; state.preincLastTotal=null; state.quadFinishAudioEnabled=false;
    state.alertParcialEnabled=false; state.alertParcialThreshold=null; state.alertTotalEnabled=false; state.alertTotalThreshold=null;
  }
  document.getElementById('audio-toggle').checked = state.audioEnabled;
  document.getElementById('audio-interval').value = state.audioInterval;
  document.getElementById('preinc-audio-toggle').checked = state.preincAudioEnabled;
  document.getElementById('quadfinish-audio-toggle').checked = state.quadFinishAudioEnabled;
  document.getElementById('alert-parcial-toggle').checked = state.alertParcialEnabled;
  document.getElementById('alert-parcial-threshold').value = (state.alertParcialThreshold===null?'':state.alertParcialThreshold);
  document.getElementById('alert-total-toggle').checked = state.alertTotalEnabled;
  document.getElementById('alert-total-threshold').value = (state.alertTotalThreshold===null?'':state.alertTotalThreshold);
}
function saveAudioPrefs(){
  if (!state.currentId) return;
  localStorage.setItem(audioKey(state.currentId), JSON.stringify({
    enabled:state.audioEnabled, interval:state.audioInterval, lastAnnounced:state.lastAnnounced,
    preincEnabled:state.preincAudioEnabled, preincLastTotal:state.preincLastTotal,
    quadFinishEnabled:state.quadFinishAudioEnabled,
    alertParcialEnabled:state.alertParcialEnabled, alertParcialThreshold:state.alertParcialThreshold,
    alertTotalEnabled:state.alertTotalEnabled, alertTotalThreshold:state.alertTotalThreshold
  }));
}
App.toggleAudio = function(checked){ state.audioEnabled = checked; saveAudioPrefs(); if (checked) speak('Áudio ativado.'); };
App.togglePreincAudio = function(checked){ state.preincAudioEnabled = checked; saveAudioPrefs(); if (checked) speak('Áudio de pré-incisões ativado.'); };
App.toggleQuadFinishAudio = function(checked){ state.quadFinishAudioEnabled = checked; saveAudioPrefs(); if (checked) speak('Áudio de finalização de quadrante ativado.'); };
App.toggleAlertParcial = function(checked){ state.alertParcialEnabled = checked; state.alertParcialFired = false; saveAudioPrefs(); if (checked) speak('Alarme de transecção parcial ativado.'); };
App.saveAlertParcialThreshold = function(value){ var n = parseFloat(value); state.alertParcialThreshold = (isNaN(n)||n<0) ? null : n; state.alertParcialFired = false; saveAudioPrefs(); };
App.toggleAlertTotal = function(checked){ state.alertTotalEnabled = checked; state.alertTotalFired = false; saveAudioPrefs(); if (checked) speak('Alarme de transecção total ativado.'); };
App.saveAlertTotalThreshold = function(value){ var n = parseFloat(value); state.alertTotalThreshold = (isNaN(n)||n<0) ? null : n; state.alertTotalFired = false; saveAudioPrefs(); };
function checkTransectionAlerts(taxaParcial, taxaTotal){
  if (state.alertParcialEnabled && state.alertParcialThreshold!==null){
    if (taxaParcial > state.alertParcialThreshold){
      if (!state.alertParcialFired){ state.alertParcialFired = true; speak('Atenção: transecção parcial passou de '+state.alertParcialThreshold+' por cento. Está em '+taxaParcial.toFixed(1)+' por cento.'); }
    } else if (state.alertParcialFired){ state.alertParcialFired = false; }
  }
  if (state.alertTotalEnabled && state.alertTotalThreshold!==null){
    if (taxaTotal > state.alertTotalThreshold){
      if (!state.alertTotalFired){ state.alertTotalFired = true; speak('Atenção: transecção total passou de '+state.alertTotalThreshold+' por cento. Está em '+taxaTotal.toFixed(1)+' por cento.'); }
    } else if (state.alertTotalFired){ state.alertTotalFired = false; }
  }
}
App.saveAudioInterval = function(value){ var n = parseInt(value,10); state.audioInterval = (isNaN(n)||n<1) ? 100 : n; saveAudioPrefs(); };
App.testAudio = function(){ speak(t('audio.test_phrase')); };
function speak(text){ if (!('speechSynthesis' in window)) { toast(t('toast.no_speech_synthesis')); return; } var u = new SpeechSynthesisUtterance(text); u.lang=({pt:'pt-BR',en:'en-US',es:'es-ES'}[state.lang]||'pt-BR'); window.speechSynthesis.speak(u); }
function checkAudioMilestone(total){
  if (!state.audioEnabled || !state.audioInterval) return;
  var milestone = Math.floor(total/state.audioInterval)*state.audioInterval;
  if (milestone>0 && milestone>state.lastAnnounced){ state.lastAnnounced=milestone; saveAudioPrefs(); speak(t('audio.milestone',{n:String(milestone)})); }
}
// Cada área de pré-incisão (recesso direito, linha, etc.) é um contador PRÓPRIO e
// ABSOLUTO — não uma leitura acumulada única tipo o Mamba — então o total (soma de
// todas as áreas) não depende da ORDEM em que você preenche cada campo, nem precisa
// de nenhum rastreamento por horário: é sempre só a soma direta do que está em cada
// campo agora. Por isso este anúncio pode ser simplesmente 'o total mudou desde a
// última vez que eu vi' — comparando com o valor mais recente já visto/anunciado
// (state.preincLastTotal), sem precisar de nenhum 'quem veio antes de quem'.
// Roda dentro de render(), então dispara tanto pela edição feita no próprio aparelho
// quanto quando o poll (a cada 1.5s) traz uma mudança feita por OUTRO aparelho —
// igual já acontece com o alarme de transecção. Na primeira renderização depois de
// abrir a cirurgia (preincLastTotal ainda null), só grava a base sem anunciar, pra
// não anunciar um total que já estava lá antes de você abrir o app.
function checkPreincAudioOnChange(total){
  if (!state.preincAudioEnabled){ state.preincLastTotal = total; return; }
  if (state.preincLastTotal===null || state.preincLastTotal===undefined){ state.preincLastTotal = total; saveAudioPrefs(); return; }
  if (total !== state.preincLastTotal){
    state.preincLastTotal = total;
    saveAudioPrefs();
    speak(t('audio.preinc_update',{n:String(total)}));
  }
}
// Disparado uma vez, na hora em que o "Contagem finalizada" de um quadrante tem
// sucesso (não fica escutando mudança nenhuma, ao contrário do checkPreincAudioOnChange
// acima) — anuncia o Mamba PRÓPRIO do quadrante que acabou de ser finalizado, os
// folículos extraídos somados até aquele ponto (todos os quadrantes já preenchidos,
// cadeia inclusa) e a diferença % do Mamba. Pedido do Dr. Vitor depois de sentir
// falta dessa leitura em voz alta durante uma cirurgia de verdade. Se o Mamba
// daquele quadrante ainda não tiver sido preenchido (equipe finalizou a contagem antes
// de anotar o Mamba), não dá pra calcular a diferença — nesse caso anuncia só os
// folículos extraídos, em vez de travar ou falar um número incompleto/errado.
//
// Correção (17/07/2026): a versão original usava mambaFinalCumulativo(s), que pega
// o Mamba com o relógio real (mambaMarkedAtMs) mais recente em TODA a cirurgia, sem
// saber qual quadrante estava sendo finalizado. Bug relatado pelo Dr. Vitor: se a
// equipe digita o Mamba de um quadrante ainda EM ABERTO (ex: adianta a leitura do
// temporal direito) antes de finalizar um quadrante anterior (ex: temporal
// esquerdo), o áudio ao finalizar o temporal esquerdo anunciava o Mamba do temporal
// direito (mais recente por horário, mas de outro quadrante, ainda nem fechado) —
// nunca o do quadrante que de fato tinha acabado de ser finalizado. Agora a função
// recebe o id do quadrante finalizado e usa só o Mamba digitado NELE, ignorando
// completamente o que estiver em qualquer outro quadrante, aberto ou não.
function announceQuadFinishAudio(s, quadId){
  if (!state.quadFinishAudioEnabled) return;
  var combined = combinedExtractionCounts(s);
  var sum = computeSummary(combined, s.mode||'completo');
  var qd = s.quadrants[quadId];
  var ownMamba = (qd && qd.mambaCumulativo!==null && qd.mambaCumulativo!==undefined && qd.mambaCumulativo!=='') ? Number(qd.mambaCumulativo) : null;
  if (ownMamba===null){
    speak(t('audio.quadfinish_extraidos_only',{extraidos:String(sum.foliculosExtraidos)}));
    return;
  }
  var mdiff = computeMambaDiff(ownMamba, sum.foliculosExtraidos);
  speak(t('audio.quadfinish_summary',{mamba:String(mdiff.mamba), extraidos:String(sum.foliculosExtraidos), diffpct:mdiff.diffPct.toFixed(1)}));
}
setInterval(function(){ api('/api/ping').catch(function(){}); }, 5000);
document.addEventListener('DOMContentLoaded', function(){
  window.App = App;
  initLanguage();
  loadIncrementSettings();
  resolveBaseUrl().then(function(){ if (state.session) render(); });
  var m = window.location.pathname.match(/^\/s\/([a-f0-9]+)$/);
  var mReset = window.location.pathname.match(/^\/reset\/([a-f0-9]+)$/);
  if (m){
    // Acesso direto a uma cirurgia via link — não exige login (fluxo das auxiliares).
    state.currentId=m[1]; loadAudioPrefs(m[1]); showScreen('counting'); App.switchTab('extracao'); fetchAndRender().then(function(){ startPolling(); });
    // Mas se o navegador já tiver uma sessão de médico logado (ex: o próprio médico
    // abrindo um atalho/link direto pra cirurgia, em vez de entrar pela Home), detecta
    // isso em paralelo — sem isso, state.currentUser ficava null a sessão toda, e o
    // botão "Início" (App.goHome) achava que era uma auxiliar sem login e voltava pra
    // própria cirurgia em vez de ir pra listagem. Se não tiver sessão válida (é mesmo
    // uma auxiliar sem login), o catch não faz nada — segue o fluxo normal.
    api('/api/me').then(function(r){ state.currentUser = r.user; renderUserBar(); }).catch(function(){});
  } else if (mReset){
    state.resetToken = mReset[1]; showScreen('reset');
  } else {
    App.checkAuthAndShowHome();
  }
});
window.addEventListener('popstate', function(){
  var m = window.location.pathname.match(/^\/s\/([a-f0-9]+)$/);
  if (m){ App.openSession(m[1]); } else { App.goHome(); }
});
})();
