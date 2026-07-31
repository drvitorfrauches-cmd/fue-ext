# Graftis

App de contagem ao vivo de extração folicular (antes chamado "Contagem ao Vivo", depois
"Foliq" — o nome do produto mudou pra Graftis, mas o funcionamento é o mesmo).

Versão com múltiplos celulares conectados na mesma cirurgia, atualizando em tempo real,
com login por médico. O mesmo arquivo `server.js` roda de dois jeitos:

- **Rede local** (seção principal deste arquivo): dentro da wifi da clínica, sem depender
  de internet. Só quem está na mesma rede acessa.
- **Nuvem** (seção "Nuvem (Railway)" no fim deste arquivo): acessível de qualquer lugar,
  pra você e seus colegas médicos operarem de fora da clínica.

**Agora é um arquivo só: `server.js`.** Se você tiver uma pasta vazia chamada `public`
por perto, pode apagar — era de uma versão anterior e não é mais usada. O único arquivo
que importa é o `server.js`.

## O que você precisa

- **Um notebook/computador** que fique ligado durante a cirurgia (não dá pra rodar isso
  direto num iPhone — iOS não permite servidor em segundo plano de forma simples).
- **Node.js instalado** nesse computador. Pra verificar se já tem, abra o Terminal e digite:
  ```
  node -v
  ```
  Se aparecer um erro, baixe em https://nodejs.org (versão "LTS") e instale — é um
  instalador comum, próximo/próximo/concluir.
- Todos os celulares (seu e das auxiliares) **na mesma rede wifi** do notebook.

## Como usar

1. Copie o arquivo `server.js` pro notebook (só ele — não precisa de mais nada junto).
2. Abra o Terminal (Mac) ou Prompt de Comando (Windows) na pasta onde ele está.
3. Rode:
   ```
   node server.js
   ```
4. O terminal vai mostrar um endereço parecido com `http://192.168.1.23:3000`.
5. No **notebook** (ou no seu próprio celular), abra esse endereço no navegador.
   Na primeira vez, clique em "Criar conta" e cadastre nome completo, CRM, e-mail,
   telefone e uma senha — isso cria a sua conta de médico. Nas próximas vezes, é só
   fazer login com o e-mail e a senha.
6. Depois de logado, você só vê **as suas próprias cirurgias**. Crie a cirurgia,
   depois toque em "Compartilhar link" ou "Enviar por WhatsApp" pra mandar o endereço
   daquela cirurgia específica pras auxiliares.
7. Nos **celulares das auxiliares**: elas abrem o link recebido direto — **não
   precisam de conta nem de login**, só quem cria e organiza a lista de cirurgias
   precisa estar logado. Nos botões "Início" e "Voltar pra cirurgia" (esse último
   aparece na tela de Config quando tem uma cirurgia aberta), elas voltam pra própria
   cirurgia normalmente — sem cair numa tela de login que elas não têm conta pra usar.
8. Pra encerrar o servidor no fim do dia, volte no Terminal e aperte `Ctrl+C`.

Os dados ficam salvos automaticamente num arquivo `data.json`, criado do lado do
`server.js` na primeira vez que rodar. Se o servidor cair ou o notebook reiniciar
durante a cirurgia, é só rodar `node server.js` de novo que a cirurgia em andamento
continua de onde parou.

## Se aparecer "não encontrado" ou a página não abrir

- Confirme que rodou `node server.js` **de dentro da pasta onde o arquivo está** (não de
  outro lugar).
- Confirme que copiou o arquivo inteiro — se o download ficou pela metade, o Node vai
  reclamar de erro de sintaxe ao iniciar, não abrir silenciosamente.
- Tente `http://localhost:3000` no PRÓPRIO notebook primeiro, antes de testar no
  celular — isso isola se o problema é o servidor ou a rede.

## Se os celulares não conseguirem conectar (mas o notebook sim)

Algumas redes wifi (principalmente wifi de "convidados") têm um recurso chamado
**isolamento de cliente**, que impede um aparelho de "ver" o outro mesmo estando na
mesma rede. Se `localhost:3000` funciona no notebook mas o celular não abre o
`http://192.168.x.x:3000`, esse é o suspeito número um — fale com quem administra o
wifi da clínica pra desligar esse isolamento, ou use uma rede sem essa restrição.

## O que já tem nesta versão (paridade com o app v1)

Extração dividida nos 4 quadrantes (Temporal direito, Temporal esquerdo, Occipital
direito, Occipital esquerdo), cada um com as 13 categorias e seu próprio Mamba
parcial — você preenche a leitura acumulada do aparelho ao final de cada quadrante,
na ordem em que for extraindo, e o app calcula sozinho a diferença em relação ao
quadrante anterior (mesma lógica do exemplo que você deu: 1000 no primeiro quadrante
preenchido, 1900 no segundo → delta de 900). Tem também um "Resumo geral" que soma
os 4 quadrantes, com a comparação final do Mamba (última leitura acumulada
preenchida) contra o total de folículos extraídos.

No momento em que o Mamba de um quadrante é preenchido, o servidor marca sozinho
(sem depender do relógio de nenhum celular) quanto tempo de cirurgia já tinha
decorrido naquele instante. Com isso o app calcula, por quadrante: quanto tempo
aquele quadrante levou (a diferença entre o momento em que o Mamba foi preenchido
ali e no quadrante marcado imediatamente antes dele **por horário real**, não pela
ordem fixa Temporal dir → Temporal esq → Occipital dir → Occipital esq) e o **ritmo
de extração pelo Mamba** (folículos/hora), que é diferente do "ritmo médio" que já
existia — aquele é calculado em cima da contagem manual de bancada, este novo é em
cima da leitura do próprio aparelho. Os dois aparecem lado a lado no resumo do
quadrante, no resumo geral e no relatório impresso.

Isso importa porque cada médico extrai numa ordem diferente — o app não assume que
você segue Temporal dir → Temporal esq → Occipital dir → Occipital esq; ele usa o
horário real de quando cada Mamba foi preenchido pra descobrir sozinho qual
quadrante veio antes de qual, então funciona em qualquer ordem (por exemplo:
Occipital dir → Occipital esq → Temporal esq → Temporal dir). Se um quadrante nunca
teve Mamba preenchido, o app mostra "—" em vez de forçar um número sem sentido.
Cirurgias muito antigas (de antes desta correção, sem esse horário registrado) usam
a ordem fixa como último recurso, só pra não quebrar dado já salvo.

**Correção (13/07/2026): Mamba errado quando o cronômetro fica pausado entre
marcações.** Em cirurgia real apareceu um bug: ao marcar dois quadrantes com o
cronômetro de extração PAUSADO entre um e outro, o app calculava o delta contra o
quadrante errado (o primeiro já marcado, não o mais recente). Causa: o "horário"
usado pra descobrir a ordem de preenchimento era o tempo decorrido do cronômetro de
extração — que fica parado durante uma pausa, fazendo dois quadrantes marcados na
mesma pausa empatarem no mesmo valor. Agora o app usa dois relógios separados: um
pro ritmo/duração (tempo de cronômetro, sem contar pausa — continua correto) e outro
só pra ordem de preenchimento (relógio real do servidor, nunca pausa, nunca empata).
Cirurgias em andamento no momento desta atualização: os quadrantes já marcados antes
da correção não têm esse novo relógio registrado, então caem no último recurso (ordem
fixa da lista) até serem tocados de novo. Se uma cirurgia específica ficou com o
delta errado por causa desse bug, reabrir o Mamba de cada quadrante afetado e digitar
de novo o mesmo valor final, na ordem real em que foram extraídos, corrige o cálculo
daquele quadrante em diante (contanto que a cirurgia ainda não esteja finalizada).

**Correção (14/07/2026): botão "Início" às vezes não voltava pra listagem de
cirurgias.** Reportado pelo Dr. Vitor: ao abrir o app direto por um link de
cirurgia (`/s/<id>` — atalho salvo, link do WhatsApp, ou dar refresh na própria
tela de contagem), o app nunca conferia se havia uma sessão de médico logada
naquele navegador. Resultado: mesmo com o médico logado de verdade, o app tratava
esse acesso como se fosse sempre uma auxiliar sem login — e o botão "Início"
(que decide entre ir pra listagem ou voltar pra própria cirurgia dependendo se
tem um médico logado) achava que não tinha login nenhum e voltava pra própria
cirurgia toda vez, em vez de ir pra Home. Agora, nesse fluxo de link direto, o
app confere em paralelo se existe sessão válida — se tiver, "Início" passa a
levar pra listagem normalmente; se não tiver (auxiliar sem login de verdade),
continua voltando pra própria cirurgia, exatamente como antes.

Além disso: cronômetro de cirurgia com ritmo médio, cronômetro de pré-incisões
independente (com seu próprio ritmo médio), aba de Pré-incisões (12 áreas, em grid
de duas colunas), aba de Fotos (marcação cirúrgica + pós-operatório, salvas no
computador que roda o servidor e visíveis em todos os celulares conectados), áudio
configurável por aparelho, e relatório pra imprimir/salvar em PDF com o resumo
geral, cada quadrante em detalhe, pré-incisões, distribuição de unidades e fotos.
Tudo sincronizado ao vivo entre os aparelhos.

**Correção (14/07/2026): upload de fotos abria a câmera direto no celular.**
Reportado pelo Dr. Vitor: no celular (testado em Safari e Chrome), tocar pra
escolher a foto de marcação ou pós-operatório abria a câmera na hora, sem dar a
opção de escolher uma foto já existente na galeria — no computador funcionava
normal (abria o seletor de arquivos). Causa: os dois campos de upload tinham o
atributo `capture="environment"`, que em navegadores mobile pula direto pra
câmera (esse atributo não tem efeito nenhum no desktop, por isso só aparecia no
celular). Removido dos dois — agora o celular volta a mostrar o seletor
completo (Galeria, Tirar Foto, Procurar arquivos), igual o desktop já mostrava.

**Correção (16/07/2026): botão "Contagem finalizada" parava de responder depois do
primeiro quadrante (bug real de cirurgia, reportado pelo Dr. Vitor).** Numa cirurgia
de verdade, no iPad dele, o botão funcionou certinho no Occipital direito, mas nos
quadrantes seguintes parecia travado — sem nenhum erro na tela. Causa: o Safari do
iOS bloqueia silenciosamente TODOS os diálogos nativos do navegador (`confirm()`,
`prompt()`, `alert()`) numa mesma página depois de mostrar vários deles na mesma
sessão — sem avisar o usuário, sem erro nenhum, o `confirm()` simplesmente passa a
retornar `false` direto daquele ponto em diante. O app usava `window.prompt()` toda
vez que alguém tocava num número pra editar o valor (dezenas de vezes por
quadrante), o que quase garantia disparar esse bloqueio do Safari antes de chegar no
`confirm()` de finalizar o segundo ou terceiro quadrante. Correção: `window.confirm()`
e `window.prompt()` nativos foram removidos do app inteiro (12 lugares no total) e
substituídos por um modal próprio (mesmo visual do modal de "Compartilhar cirurgia"),
que não é um diálogo do navegador e por isso nunca sofre desse bloqueio. Nada muda
visualmente pro time — continua sendo uma caixinha pra confirmar ou digitar um
valor — só que agora funciona de forma confiável, mesmo depois de muitos toques
seguidos numa cirurgia longa.

Cada cartão de área na aba de Pré-incisões também tem, embaixo do número total, um
espaço pra **distribuição de unidades** — UF1/UF2/UF3 (unidades foliculares de 1, 2
ou 3 fios que vão pra aquela área). Toque em qualquer um dos três números pra
digitar (mesmo padrão de clique→janela usado no resto da pré-incisão, pra evitar o
problema de digitação ao vivo). Uma barra logo abaixo da grade mostra o total geral
de cada tipo de fio somando as 12 áreas. Essa distribuição também entra no
relatório impresso, numa tabela separada por área.

Cirurgias criadas na versão anterior (sem quadrantes) são migradas automaticamente
na primeira vez que você rodar este `server.js` — os dados antigos viram o quadrante
"Temporal direito", sem perda de contagem.

Na aba de Extração, a caixinha de número de cada categoria também é editável por
toque: além dos botões de +1/+5/etc., você pode tocar diretamente no número pra
abrir uma janela e digitar o valor exato que quiser (mesmo padrão de clique→janela
usado nas pré-incisões). O app calcula sozinho a diferença em relação ao valor atual
e aplica como um ajuste normal — funciona só enquanto a cirurgia está em andamento
(some quando finalizada).

As categorias "1 fio" e "2 fios" fino viraram "1 fio especial" e "2 fios especial",
e agora ficam no final do grupo de folículos íntegros (ordem: 1, 2, 3, 4 fios, 1
especial, 2 especial).

Logo abaixo de "Transecção total" tem uma categoria nova, **Mini**: folículos
miniaturizados, que ficam registrados e visíveis (na tela, no resumo e no relatório
impresso) mas propositalmente **não entram** na contagem geral de folículos
extraídos, total de fios, índice ou nas taxas de transecção — só no seu próprio
contador ("Mini (fora do total)").

As fotos ficam salvas numa pasta `uploads/` que o próprio servidor cria do lado do
`server.js` (não precisa criar nada manualmente). Junto com `data.json`, é o que você
deve copiar/guardar se quiser manter o histórico de uma cirurgia.

## Login por médico

Agora existe cadastro (nome completo, CRM, e-mail, telefone, senha) e login. Cada
médico só enxerga a própria lista de cirurgias na tela inicial — a lista é privada.

Importante entender o modelo de segurança: o login protege **a lista** de cada
médico, não o link individual de cada cirurgia. Quem tem o link de uma cirurgia
específica (`/s/xxxxxxxx`) consegue abrir e editar aquela cirurgia sem precisar de
conta — é assim de propósito, pra auxiliares continuarem entrando só com o link,
sem cadastro. Trate o link de cada cirurgia como uma senha: só compartilhe com quem
deve ter acesso àquela cirurgia.

A senha fica salva com hash (nunca em texto puro) no `data.json`, usando criptografia
já embutida no Node — não depende de nenhum pacote externo.

Cirurgias criadas antes desta atualização (sem dono) continuam abrindo normalmente
pelo link direto, mas não aparecem na lista de nenhum médico — se você tiver
cirurgias antigas importantes, guarde o link delas antes de atualizar.

## Identidade visual por médico

Em Configurações há uma seção "Identidade visual" onde cada médico pode subir uma
logomarca (PNG ou JPG — é redimensionada e convertida pra PNG automaticamente),
escolher a cor do tema (5 opções: padrão, azul, roxo, grafite, marinho) e ativar
modo escuro. Tudo isso fica salvo na conta do médico, sincronizado entre os
aparelhos onde ele fizer login — não é uma configuração só deste celular.

A logomarca e o tema aparecem na barra superior do app, na tela de login/cadastro
(quando já dá pra saber de qual médico é) e no relatório impresso. Auxiliares que
acessam uma cirurgia só pelo link (sem login) também veem a marca e o tema do
médico dono daquela cirurgia — a identidade visual "segue a cirurgia".

As cores das categorias clínicas (íntegro, parcial, transecção total, mini) **não
mudam** com o tema nem com o modo escuro — têm significado clínico fixo, pra nunca
gerar confusão na hora da contagem. Só o fundo, os cartões e os textos mudam.

## Idioma (Português / English / Español) — cobertura completa

O Graftis tem um seletor de idioma (PT / EN / ES), com um dicionário de
traduções (383 chaves, com paridade total entre os 3 idiomas) embutido no
próprio `server.js` (sem depender de internet ou serviço externo de
tradução).

**O que está traduzido:** login, criar conta, esqueci/redefinir senha, tela
Início (lista de cirurgias), Configurações (incrementos, identidade visual,
áudio/alarmes, segurança da conta), tela de Extração completa (cronômetros,
resumo geral e por quadrante, Mamba, as 15 categorias de folículo, os 4
quadrantes), Pré-incisões (as 12 áreas) e Fotos, Dashboard (todos os
resumos, gráficos e tabelas), o relatório impresso/PDF inteiro, e as
mensagens de erro de praticamente todos os endpoints da API (login,
cadastro, criar/apagar cirurgia, ajustar contagem, Mamba, pré-incisões,
fotos, cronômetros, finalizar/reabrir). O e-mail de redefinição de senha
também sai traduzido, sempre no idioma salvo na conta do médico.

Os nomes dos quadrantes, categorias de folículo e áreas de pré-incisão são
traduzidos ao vivo (mudam na hora ao trocar o idioma em Configurações, sem
precisar recarregar a página) — não é preciso recriar a cirurgia nem perder
dados já contados.

**Onde escolher o idioma:**
- Na própria tela de login, antes de ter conta (tem que ser assim, senão
  quem não lê português nem consegue se cadastrar).
- Em Configurações → Identidade visual, pra trocar depois de já estar
  logado. Fica salvo na conta do médico (sincroniza entre aparelhos, igual
  tema e logo).
- Se a pessoa nunca escolheu nada, o app tenta adivinhar pelo idioma do
  navegador na primeira visita; senão, cai em português.

**Limitação conhecida:** como a tela é montada uma vez só no servidor e o
texto é trocado por JavaScript depois que a página carrega, pode aparecer um
piscar rápido em português antes da tradução ser aplicada, no primeiro
carregamento. É rápido (menos de um segundo) e só acontece na primeira
tela.

## Correção: cronômetros travando de verdade ao finalizar

Bug corrigido: depois de finalizar uma cirurgia, os botões "Iniciar" dos
cronômetros de extração e de pré-incisões continuavam funcionando — dava pra
clicar e o tempo voltava a contar, mesmo com a cirurgia já finalizada. Agora
os dois botões (Iniciar/Pausar e Zerar) ficam desabilitados na tela assim que
finaliza, e o servidor também passou a recusar essas ações numa cirurgia
finalizada (antes só os contadores de folículos e pré-incisões tinham essa
trava — os cronômetros tinham escapado). Reabrir a cirurgia libera os dois de
novo, normalmente.

## Tempo total da cirurgia

Agora existem três tempos diferentes, cada um com seu propósito:

- **Tempo de extração** e **Tempo de pré-incisões**: os dois cronômetros que já
  existiam, continuam do mesmo jeito — cada um pausa e retoma independente,
  cada um mede só o tempo ativo daquela etapa.
- **Tempo total da cirurgia** (novo): aparece junto ao código do paciente, no
  topo da tela. Começa a contar sozinho no instante em que QUALQUER UM dos
  dois cronômetros acima é iniciado pela primeira vez — não importa qual dos
  dois foi primeiro. Ao contrário deles, não pausa: reflete o tempo total do
  caso, do início ao fim, mesmo que extração e pré-incisões fiquem pausadas
  no meio. Congela no momento em que a cirurgia é finalizada, e volta a
  contar se a cirurgia for reaberta. Também aparece no relatório impresso,
  ao lado do tempo de extração.

Cirurgias que já estavam em andamento antes desta atualização não têm como
recuperar o instante exato em que realmente começaram — o tempo total delas
só passa a contar a partir da próxima vez que um dos dois cronômetros for
iniciado.

## Logo Graftis na tela de login

A tela inicial de login/cadastro agora mostra a logomarca oficial do Graftis
(fixa, embutida no próprio `server.js` como imagem — não depende de internet
nem de arquivo externo). Ela aparece pra todo mundo, antes de saber quem é o
médico logado. Isso é diferente da logomarca por médico (seção acima): aquela
é a marca pessoal de cada médico, que só aparece depois que o app já sabe de
qual conta se trata; a logo do Graftis é a marca do próprio produto.

## Segurança (hardening da Fase 1)

Depois de uma análise de segurança do código, quatro reforços foram aplicados —
nenhum deles muda como você usa o app no dia a dia, só fecham brechas:

- **Limite de tentativas por IP**: login (8 tentativas / 15 min), cadastro
  (10/hora) e recuperação de senha (6/hora) agora bloqueiam automação em
  rajada. Também protege contra alguém tentando adivinhar IDs de cirurgia ao
  acaso (20 tentativas erradas / 5 min por IP).
- **Token de login expira no servidor** depois de 30 dias (igual ao cookie) —
  antes, um token roubado continuava válido pra sempre. Também foi
  adicionado, em Configurações → "Segurança da conta", um botão **"Sair de
  todos os aparelhos"**, útil se você perder ou emprestar um celular/notebook
  onde tinha feito login.
- **Escrita do banco de dados agora é atômica** (arquivo temporário + rename)
  — antes, se o servidor caísse no meio de uma gravação, o `data.json`
  inteiro (todos os médicos, todas as cirurgias) podia corromper. Agora o
  pior caso é perder só o arquivo temporário.
- **Cabeçalhos de segurança** (Content-Security-Policy, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy) foram adicionados em toda
  resposta do servidor.

Isso é a "Fase 1" de um plano maior — o próximo passo (Fase 2, descrita mais
abaixo em "Banco de dados dividido por médico") reestrutura como os dados são
salvos em disco pra suportar vários médicos usando ao mesmo tempo sem travar
uns aos outros.

## Segurança (reforços adicionais)

Depois de revisar a Fase 1 junto com o Dr. Vitor, mais dois reforços entraram:

- **CORS fechado**: o app sempre foi "mesma origem" (o mesmo `server.js` serve
  tanto a página quanto a API) — não existia motivo legítimo pra liberar
  `Access-Control-Allow-Origin: *`. Deixar isso aberto permitia que um site
  malicioso, rodando no navegador de qualquer visitante, usasse o navegador dele
  pra tentar adivinhar IDs de cirurgia em massa, distribuindo a varredura entre
  vários IPs diferentes e furando o limite de tentativas por IP. Removido — não
  muda nada no uso normal do app, porque nunca foi preciso acessar de outro
  domínio.
- **Acesso a fotos por link com prazo (90 dias)**: o link de uma cirurgia
  (`/s/xxxxxxxx`) continua funcionando sem login, como sempre — isso não muda.
  O que muda é só a **foto** em si: depois que uma cirurgia é **finalizada**,
  o link sem login continua servindo as fotos por **90 dias**. Passado esse
  prazo, quem só tem o link (por exemplo, uma auxiliar que recebeu por
  WhatsApp meses atrás) para de conseguir ver as fotos — só o médico dono da
  cirurgia, fazendo login, continua enxergando. Pensado pro prazo comum de
  acompanhamento pós-operatório, sem deixar uma foto de paciente exposta pra
  sempre num link que pode ter vazado ou ficado esquecido numa conversa antiga.
  Reabrir a cirurgia cancela a contagem do prazo até finalizar de novo. O resto
  da cirurgia (contagens, cronômetros, relatório) não é afetado — só o arquivo
  da foto em si.
- **Tokens de login e de redefinição de senha não ficam mais em texto puro no
  `data.json`**: antes, o token que vai no cookie do navegador (`fue_auth`) e o
  que vai no link do e-mail de redefinição de senha eram salvos no arquivo
  exatamente como são usados. Agora só o hash (SHA-256) de cada um fica salvo —
  o valor real nunca é gravado em disco, só existe no cookie do navegador ou no
  e-mail enviado. Se o `data.json` vazar (backup mal guardado, disco da nuvem
  comprometido), quem pegar o arquivo não consegue logar como nenhum médico nem
  reaproveitar um link de redefinição de senha ainda válido — antes, conseguia.
  Não muda nada no uso: login, logout, "sair de todos os aparelhos" e
  "esqueci minha senha" continuam funcionando exatamente igual.

## Nome do quadrante fixo junto do resumo

A barra de números que já ficava travada no topo ao rolar a tela durante a
extração (Folículos extraídos, Total de fios, Índice, Transecção parcial/total,
Mini) agora também mostra, dentro dela mesma, o nome do quadrante ativo
("Temporal direito", "Occipital esquerdo" etc.). Antes, ao rolar a tela pra
baixo pra registrar as contagens, os números ficavam visíveis mas sem indicar
de qual quadrante eram — risco de confundir quadrante durante a contagem. Não
criamos uma barra nova: só aproveitamos a que já estava fixa, pra não voltar a
ocupar mais espaço de tela.

## Tela de contagem mais enxuta

Pra sobrar mais espaço de tela durante a cirurgia, dois blocos saíram da tela de
extração e foram reorganizados:

- **Link da cirurgia**: em vez de aparecer sempre aberto no topo, agora é um botão
  pequeno "🔗 Compartilhar" ao lado do status/modo da cirurgia. Tocando nele, abre um
  popup com o link, os botões de Compartilhar/WhatsApp/Copiar e a dica de uso — ao
  fechar, a tela de contagem volta a ficar limpa, sem nenhum bloco extra ocupando
  espaço.
- **Áudio e alarme de transecção**: mudaram para Configurações, numa seção "Áudio e
  alarmes desta cirurgia" que só aparece quando você entra em Configurações vindo de
  dentro de uma cirurgia (do contrário não faz sentido mostrar, já que são ajustes
  por cirurgia). O comportamento é o mesmo de antes — cada celular guarda os próprios
  ajustes pra cada cirurgia — só o lugar na tela que mudou.

**Novo (14/07/2026): alarme de áudio pra pré-incisões**. Numa subseção própria
"Áudio de pré-incisões" logo abaixo do alarme de folículos, dentro da mesma seção de
Configurações — é um toggle independente, sem interferir no alarme de folículos
extraídos. Anuncia por voz o novo total de pré-incisões (somando todas as áreas:
recessos, linha, sublinha, entradas, topete, escalpo, coroa) **toda vez que você
preencher o valor de uma área**, não a cada marco redondo. Exemplo: recesso direito
= 100 → "100 pré-incisões."; recesso esquerdo = 150 → "250 pré-incisões." (soma);
linha = 250 → "500 pré-incisões." — e assim por diante, incluindo se você voltar
numa área já preenchida pra corrigir o número.

Não depende da ORDEM em que você preenche as áreas nem de nenhum controle por
horário — diferente do Mamba (que é uma leitura acumulada única do aparelho, onde a
ordem de preenchimento importa pro cálculo do delta), cada área de pré-incisão é um
contador próprio e absoluto. O total é sempre só a soma direta do que está em cada
campo agora; o app só guarda "qual foi o último total que eu já anunciei" pra saber
quando anunciar de novo, sem depender de quem foi preenchido antes de quem. Na
primeira renderização depois de abrir a cirurgia, o app só grava o total atual como
referência, sem anunciar nada (senão reabrir uma cirurgia com pré-incisões já
preenchidas dispararia um anúncio falso). Mesma lógica de armazenamento do alarme de
folículos: guardado por cirurgia e por aparelho (localStorage), não sincroniza entre
celulares — mas roda dentro do ciclo de atualização a cada 1,5s que já existe no app,
então também anuncia quando OUTRO aparelho preenche uma área (não só o seu).

## Apagar cirurgia

Cada cirurgia na tela inicial agora tem um botão "Apagar" além de "Abrir". Apaga a
cirurgia e todas as fotos dela permanentemente — pede confirmação antes, com o
código do paciente escrito no aviso, e não tem como desfazer depois. Só o médico
dono da cirurgia consegue apagar (mesma regra de posse da lista): nem outro médico
logado, nem quem só tem o link da cirurgia, conseguem apagar — só quem criou.

## Recuperar senha ("Esqueci minha senha")

A senha fica salva com hash — o servidor literalmente não consegue ler nem reenviar
sua senha original, nem eu nem ninguém. O "Esqueci minha senha" manda um **link pra
escolher uma senha nova**, que expira em 30 minutos e só funciona uma vez — não manda
a senha antiga.

Pra habilitar o envio de e-mail, abra o `server.js` num editor de texto, procure por
`SMTP_CONFIG` (fica perto do topo do arquivo) e siga os passos escritos ali:

1. Ative a verificação em duas etapas na sua conta Google, em
   https://myaccount.google.com/security
2. Crie uma "senha de app" em https://myaccount.google.com/apppasswords
   (não é a senha normal da sua conta — é uma senha de 16 letras só pra isso)
3. Cole seu e-mail em `user` e a senha de app em `pass`
4. Troque `enabled: false` para `enabled: true`
5. Salve o arquivo e reinicie o servidor (`Ctrl+C` e `node server.js` de novo)

Enquanto isso não estiver preenchido, o botão "Esqueci minha senha" continua na
tela, mas o servidor não consegue mandar o e-mail — ele registra isso no Terminal
(não trava nem quebra o resto do app).

**Ponto de atenção real**: eu escrevi o envio de e-mail usando só recursos do Node
(sem nenhum pacote externo), falando diretamente com o Gmail pelo protocolo de
e-mail. Testei toda a lógica que dá pra testar sem internet de verdade daqui de
onde eu trabalho (geração e validação do link, expiração, uso único, etc.) — mas
a parte de "o e-mail realmente chega na caixa de entrada" só se confirma testando
no seu computador, que tem internet. Depois de configurar, use "Esqueci minha
senha" com o seu próprio e-mail primeiro, antes de contar com isso numa cirurgia
de verdade. Se o e-mail não chegar, o Terminal onde o `node server.js` está
rodando vai mostrar a mensagem de erro exata — me manda ela que eu ajusto.

## Modo completo x modo reduzido

**Ajuste (14/07/2026):** na tela inicial (onde você cadastra a cirurgia), os botões
agora aparecem na ordem **Reduzido primeiro, Completo depois**, e **Reduzido já vem
pré-selecionado** ao abrir a tela — pedido do Dr. Vitor, que usa reduzido na maioria
das cirurgias. Vale pra cada cirurgia nova que você cadastrar (o modo escolhido
continua fixo depois de criada, como sempre); se precisar de Completo, é só tocar
no botão pra trocar antes de cadastrar.

Ao criar uma cirurgia, você escolhe um dos dois modos — **fica fixo depois de criada**,
porque muda o jeito que as auxiliares registram cada folículo:

- **Completo** (padrão): toda transecção parcial é detalhada por tipo (2→1, 3→2, 3→1,
  4→3, 4→2, 4→1 fios), igual já era antes.
- **Reduzido**: some o detalhamento por tipo. A auxiliar registra os fios daquele
  folículo normalmente em "Folículos íntegros" (como se fosse um folículo comum) e,
  além disso, toca em "Transecção parcial" só pra contar que aquele folículo teve uma
  transecção parcial. Esse contador é puramente informativo — não soma de novo nos
  fios nem nos folículos manipulados, senão o mesmo folículo seria contado duas vezes.
  Nesse modo, as duas taxas usam bases diferentes uma da outra — isso é intencional,
  não incoerência:
  - **Taxa de transecção parcial** = contador de transecção parcial ÷ folículos
    íntegros. Não soma a transecção total nem soma a parcial de novo (o folículo já
    está dentro dos íntegros). Exemplo: 1000 íntegros + 10 transecções parciais =
    1% (10/1000). Com transecção total no meio: 100 íntegros + 8 parciais + 8 totais
    = 8% de taxa parcial (8/100 — a base é só os íntegros).
  - **Taxa de transecção total** = contador de transecção total ÷ (folículos
    íntegros + transecção total). Aqui a base soma os dois, porque o folículo com
    transecção total nunca entrou nos íntegros (não sobrou fio nenhum dele) — pra
    saber que fração de tudo que você tentou foi perdida, precisa contar a tentativa
    também. Exemplo: 1000 folículos extraídos + 100 transeccionados total = 1100 no
    total; 100 dos 1100 foram perdidos = 9,09% de taxa total.
  - "Folículos manipulados" (usado só no cálculo interno das taxas, não aparece
    mais como rótulo em nenhuma tela) segue a definição da taxa total: íntegros +
    transecção total.

  **Atenção a essa diferença entre os modos**: no modo completo, a taxa parcial e a
  taxa total dividem pelo mesmo denominador (folículos manipulados = íntegros +
  parciais + totais). No modo reduzido, cada taxa tem sua própria base, como descrito
  acima. São definições diferentes de "taxa de transecção" entre os dois modos — não
  compare o percentual de uma cirurgia em modo completo com o de outra em modo
  reduzido como se fossem a mesma métrica.

Testei essa matemática isoladamente (extraindo a lógica do app e comparando contra os
seus próprios exemplos numéricos, incluindo o caso com transecção total) antes de
entregar — bate exatamente.

## Aba "Resumo Final"

Nova 4ª aba na tela de contagem (Extração / Pré-incisões / Fotos / **Resumo
Final**), pensada pra dar uma visão de fácil leitura da cirurgia inteira num
lugar só — sem precisar rolar por cada quadrante. Ao tocar em "Finalizar
cirurgia", o app já abre direto nesta aba (não precisa procurar). Ela também
pode ser aberta a qualquer momento, inclusive com a cirurgia ainda em
andamento — os números são ao vivo, iguais ao resto do app.

Traz:

- **Tempos**: tempo de extração, tempo de pré-incisões e tempo total da
  cirurgia (os três cronômetros que já existiam, só reunidos aqui).
- **Resumo geral** (igual ao que já existe na aba Extração): folículos
  extraídos, total de fios, índice fios/folículo, % de transecção parcial, %
  de transecção total, minis, e — quando o Mamba foi preenchido — a leitura
  final do Mamba, a diferença entre o Mamba e os **folículos extraídos** (em
  número e em %), e o ritmo de extração pelo Mamba (folículos/hora, mesma
  conta já usada na aba Extração: leitura final do Mamba ÷ tempo de extração
  corrido). Essa é a mesma base usada em **todo o app** (card geral e por
  quadrante da aba Extração, este Resumo Final, o relatório impresso e o
  Dashboard) — o Mamba sempre é comparado contra os folículos extraídos
  (íntegros + parciais), nunca contra os manipulados (que também somaria a
  transecção total). Antes do ajuste de 14/07/2026 a aba Extração comparava
  contra manipulados enquanto esta aba já usava extraídos; unificar numa base
  só evita confusão, já que as duas só divergem quando há transecção total na
  cirurgia.
- **Folículos por categoria**: total de 1, 2, 3 e 4 fios, 1 fio especial, 2
  fios especial, transecção parcial (total), transecção total e minis — soma
  de todos os quadrantes.
- **Resumo de pré-incisões**: total de pré-incisões e a diferença entre
  **folículos extraídos e o total de pré-incisões** (nessa ordem) — pensada
  pra sinalizar rapidamente se sobraram ou faltaram pré-incisões em relação
  ao que foi de fato extraído.

Não é um dado novo sendo coletado — é tudo reaproveitado do que já é
registrado nas outras abas, só organizado numa visão final única.

## Aba "Paciente" (dados demográficos)

Nova aba, entre Fotos e Resumo Final: idade, altura (cm), peso (kg), espessura
do cabelo (fino/grosso), textura do cabelo (liso/ondulado/crespo) e tipo de
cirurgia (com/sem raspagem). Serve pra permitir comparar depois cirurgias
parecidas entre si (por exemplo, raspada com raspada) — hoje isso é feito
olhando o relatório impresso de cada uma; segmentação automática no Dashboard
por esses campos é uma etapa futura, não faz parte desta versão.

Importante: o app continua **nunca guardando o nome real do paciente** — as
cirurgias continuam identificadas só pelo código (ex: PAC-1234), igual sempre
foi. Os dados demográficos ficam presos a esse código, não a uma identidade.

Todos os campos são **opcionais e podem ser preenchidos a qualquer momento** —
nenhum trava a criação da cirurgia nem a extração. Tem dois jeitos de
preencher:

- **No cadastro da cirurgia** (tela inicial): uma seção retrátil "Dados do
  paciente (opcional)", fechada por padrão, pra não atrapalhar quem só quer
  criar rápido a cirurgia no meio da correria do dia. Quem quiser já
  preencher tudo de uma vez, é só abrir e preencher antes de criar.
- **Na aba Paciente**, dentro da cirurgia já criada: os mesmos campos,
  editáveis a qualquer momento (antes, durante ou depois da extração). Cada
  campo salva sozinho assim que preenchido, sem botão de salvar.

Esses dados também aparecem no relatório impresso (só os campos que tiverem
sido preenchidos), logo abaixo do código do paciente — é onde a comparação
"raspada com raspada" pode ser feita manualmente por enquanto.

## Contagem em cadeia entre quadrantes

Pedido da equipe: em vez de cada quadrante começar do zero, poder continuar
somando a partir do total do quadrante anterior — sem ter que fazer conta de
cabeça pra saber quanto foi extraído só ali.

Cada quadrante tem um novo bloco "Contagem em cadeia" (logo acima do card do
Mamba). Ao terminar de contar um quadrante, o botão **"Contagem finalizada"**
trava esse quadrante (os botões de +1/+5 somem, e o número não muda mais até
alguém apertar "Reabrir quadrante") e liga automaticamente o **próximo**
quadrante na ordem padrão (occipital direito → occipital esquerdo → temporal
esquerdo → temporal direito, a mesma ordem real de extração) como
predecessor. A partir daí, o número que aparece ao lado de cada categoria
nesse próximo quadrante já soma o total do anterior — a equipe só continua
tocando +1/+5 normalmente, sem se preocupar com o número de onde partiu.

Se a ordem real de extração num dia específico fugir do padrão, dá pra trocar
manualmente de qual quadrante puxar a contagem no seletor "Carregar contagem
de" (dentro do mesmo bloco) — o app recusa qualquer escolha que criasse um
ciclo (ex: A puxa de B, que puxa de A).

Importante — e diferente do Mamba, de propósito: esse elo entre quadrantes é
sempre **explícito** (criado só quando alguém aperta o botão ou escolhe no
seletor), nunca inferido por horário ou por ordem de tela. Foi justamente a
inferência por horário que causou o bug do Mamba corrigido nesta mesma
atualização — aqui esse tipo de erro não pode acontecer, porque não existe
adivinhação envolvida.

A cadeia é **dinâmica**: se alguém perceber um erro num quadrante já
finalizado, reabre ele (sem precisar desfazer o quadrante seguinte),
corrige o número, e todos os quadrantes que vêm depois dele na cadeia
recalculam sozinhos, ao vivo. Por baixo dos panos nada muda nos cálculos que
já existiam — Resumo geral, relatório impresso, Resumo Final e a comparação
com o Mamba continuam usando só a contribuição própria de cada quadrante
(nunca o número acumulado exibido na tela), exatamente como antes desta
atualização.

**Novo (14/07/2026): áudio ao finalizar quadrante.** Pedido do Dr. Vitor depois de
sentir falta dessa leitura numa cirurgia de verdade — em Configurações, seção
"Áudio ao finalizar quadrante" (dentro do mesmo card de áudio/alarmes, com toggle
próprio, desligado por padrão). Quando ativado, toda vez que a equipe tocar em
"Contagem finalizada", o app fala em voz alta: o Mamba **daquele quadrante
específico**, os folículos extraídos somados até aquele ponto (todos os
quadrantes já preenchidos, incluindo o que acabou de fechar) e a diferença % do
Mamba, já atualizados. Os folículos extraídos são sempre o total acumulado — no
primeiro quadrante isso já é o total da cirurgia até ali; no segundo em diante,
some automaticamente com o que veio antes; no último quadrante, é o fechamento da
cirurgia inteira. Se a equipe finalizar um quadrante sem ter preenchido o Mamba
daquele quadrante ainda, o app anuncia só os folículos extraídos (não dá pra
calcular a diferença sem o Mamba, e um número incompleto seria pior que nenhum).
Como depende do botão "Contagem finalizada", só faz sentido — e só aparece de
fato em uso — junto da contagem em cadeia acima, que por enquanto está só local,
não subiu pro Railway.

**Correção (17/07/2026): o áudio podia anunciar o Mamba do quadrante ERRADO.**
Reportado pelo Dr. Vitor: se a equipe digitasse o Mamba de um quadrante ainda em
aberto (por exemplo, adiantar a leitura do temporal direito) antes de finalizar
um quadrante anterior (o temporal esquerdo, digamos), o áudio ao fechar o
temporal esquerdo anunciava o Mamba do temporal direito — o mais recente por
horário, mas de um quadrante que nem tinha sido finalizado ainda. Causa: a função
usava "o Mamba com o relógio mais recente em toda a cirurgia", sem saber qual
quadrante estava realmente sendo fechado naquele momento. Corrigido pra usar
sempre o Mamba digitado especificamente NO quadrante que está sendo finalizado,
ignorando qualquer valor solto em outro quadrante (aberto ou não). Isso não
depende de qual navegador ou aparelho a equipe usa — era um bug de lógica, não
relacionado ao problema do Safari/iPad descrito acima.

## Relatório para o paciente

Botão novo "Relatório para o paciente" na tela de contagem, ao lado do "Imprimir /
Salvar PDF" já existente. São duas coisas separadas: o botão antigo continua sendo
o relatório técnico completo (Mamba, taxas de transecção, distribuição de unidades
por fio) pro uso interno da equipe; o novo é uma versão redesenhada, pensada
especificamente pra imprimir e entregar ao paciente — pedido do Dr. Vitor, que quer
um documento bonito o bastante pros pacientes mostrarem pros amigos (e virar
propaganda orgânica da clínica).

O relatório do paciente traz só o que interessa a ele: dados do paciente (idade,
altura, peso, tipo de cabelo), fotos (3 de marcação cirúrgica + 3 de pós-operatório
imediato, o padrão de envio), o total de folículos transplantados em destaque (um
selo circular, o número que o paciente vai querer mostrar), a distribuição por tipo
de folículo (1, 2, 3 e 4 fios, 1 e 2 fios especial, e mini) em barras, índice
folicular, total de fios, incisões por área (as 12 áreas de pré-incisão), e os
tempos cirúrgicos em 4 etapas: pré-incisões, extração, implantação e tempo total.
A etapa "Implantação" não é cronometrada à parte — é calculada como o tempo total
menos pré-incisões e extração, exatamente como pedido. Fica de fora do relatório do
paciente qualquer dado de controle de qualidade interno (Mamba, taxa de
transecção, distribuição de unidades por fio) — esse continua só no relatório
técnico.

O rodapé traz uma assinatura discreta "Gerado com Graftis" — pedido explícito do
Dr. Vitor pra virar uma fonte pequena de propaganda boca a boca.

O visual foi desenhado à parte (paleta e tipografia próprias, sem depender de
fontes externas — mesmo princípio de "roda sem internet" do resto do app) e
aprovado numa pré-visualização antes de entrar no código.

**Correção (17/07/2026): sem logo no cabeçalho + tudo numa página só.** Depois
de testar com um PDF de cirurgia real, o Dr. Vitor pediu dois ajustes: (1) tirar
a logomarca do médico do cabeçalho — ficou só o nome e o CRM em texto, o
cabeçalho continua verde/teal como estava; (2) o relatório real tinha saído em
3 páginas (2 de conteúdo + 1 em branco), então o layout foi compactado bastante:
folículos por tipo e incisões por área agora dividem a mesma grade de 3 colunas
(antes eram dois blocos separados, um embaixo do outro), as fotos de marcação e
de pós-operatório ficam lado a lado (antes eram empilhadas), o parágrafo de
abertura do "hero" foi removido, e a margem de impressão da página foi reduzida.
A assinatura "Gerado com Graftis" agora aparece **duas vezes**: no cabeçalho
(canto direito, junto da data) e no rodapé — assim a propaganda continua visível
mesmo que o documento acabe saindo em mais de uma página.

**Nível de confiança sobre caber numa página só: [Provável], não garantido.**
O ajuste foi testado e confere no código (grade compacta, fotos menores, margem
reduzida), mas este ambiente não tem um navegador de verdade pra renderizar o
`window.print()` e confirmar visualmente quantas páginas saem no PDF final —
isso depende também do navegador e da impressora/driver de PDF que a equipe
usa. Se ainda sair em 2 páginas com uma cirurgia de muitos dados (13-15 áreas
de pré-incisão preenchidas + 6 fotos + todas as 7 categorias com números
grandes), me avise com um exemplo real que eu aperto mais o layout.

**Confirmado (26/07/2026) com PDF de cirurgia real do Dr. Vitor: cabe em 1
página** ("1/1" no rodapé do próprio navegador). Duas correções feitas em cima
desse teste real:

- **Cabeçalho saiu sem a cor verde/teal de fundo.** Causa: faltava a
  propriedade `print-color-adjust: exact` no CSS de impressão — por padrão, o
  Chrome (e a maioria dos navegadores) **remove cores de fundo ao gerar
  PDF/imprimir**, a menos que o CSS force explicitamente "imprimir cores
  exatas" ou a pessoa marque manualmente "Gráficos de segundo plano" na janela
  de impressão. Corrigido forçando essa propriedade em todo o relatório do
  paciente — o cabeçalho volta a sair preenchido em verde-teal (#073A40), igual
  à pré-visualização aprovada originalmente.
- **Fotos: de duas colunas lado a lado para duas linhas cheias, e maiores.**
  Pedido do Dr. Vitor depois de ver que sobrava espaço na página: agora
  "Marcação cirúrgica" ocupa uma linha inteira com as 3 fotos maiores, e
  "Pós-operatório imediato" vem embaixo, também numa linha inteira — em vez de
  ficarem espremidas lado a lado em meia largura cada. As fotos aumentaram de
  altura em duas etapas (62px → 130px → 165px, a última pra reduzir o corte
  que aparecia nas bordas com `object-fit:cover`).
- **Parágrafo explicativo de volta abaixo do título "Sua restauração capilar,
  em números".** Esse texto existia desde a primeira versão do relatório
  (chave `patrep.hero_body`, já traduzida nas 3 línguas) mas tinha parado de
  aparecer durante a compactação pra 1 página. Voltou por pedido do Dr. Vitor:
  "Este relatório documenta os principais dados da sua cirurgia de transplante
  capilar por extração folicular (FUE) — do total de folículos implantados aos
  tempos cirúrgicos."

**Correção (26/07/2026): PDF saía com 2 páginas em branco além da principal.**
Reportado pelo Dr. Vitor. Causa: a técnica usada pra imprimir só o relatório
(escondendo o resto do app) usava `visibility:hidden` no restante da página —
isso esconde visualmente, mas **não remove a altura ocupada** por aquele
conteúdo no layout. O app inteiro (cabeçalho, abas, tabelas) continuava lá,
invisível mas ocupando espaço, e o navegador paginava aquele espaço vazio como
páginas em branco extras. Corrigido forçando `display:none` (que aí sim remove
a altura) no contêiner principal do app, no aviso de toast e nos modais,
durante a impressão — vale tanto pro relatório do paciente quanto pro técnico,
já que os dois usavam a mesma técnica.

## Dashboard

Botão "Dashboard" no topo (só aparece quando você está logado) — mostra estatísticas
juntando **todas as suas cirurgias finalizadas**, ao longo do tempo. Cirurgias em
andamento ficam de fora (têm dados parciais, distorceriam as médias); uma cirurgia
finalizada sem nenhuma extração registrada conta no total de cirurgias mas não entra
nas médias de índice/taxa.

Traz: total de cirurgias finalizadas, **total de folículos extraídos e total de
fios transplantados somando todas as cirurgias** (formatado com separador de milhar
— número simples de somar já que não tem o problema de mistura de modo das taxas,
e serve pra usar em material de marketing, tipo "já são mais de X fios
transplantados"), índice médio (fios/folículo), pré-incisões média por cirurgia e
total geral; um gráfico de barras de folículos extraídos por cirurgia em ordem cronológica
(pra ver visualmente se o volume por cirurgia está subindo ou caindo ao longo do
tempo) e outro do índice fios/folículo por cirurgia, também cronológico; e taxa de transecção parcial/total por cirurgia com sua média,
em três abas — **Completo**, **Reduzido** e **Todos**. As duas primeiras existem
porque, como vimos nas correções anteriores, os dois modos calculam a taxa de
transecção de formas diferentes (bases de cálculo diferentes) — misturar as duas
numa média só produziria um número sem significado real. A aba "Todos" junta as
cirurgias dos dois modos num só gráfico cronológico (cada barra usa a taxa correta
da própria cirurgia, marcada com "(C)" ou "(R)"), mas **não calcula uma média
combinada** — só mostra quantas cirurgias são de cada modo. Pra ver a média, use
Completo ou Reduzido. Tem também uma tabela com uma linha por cirurgia finalizada
(código, data, modo, extraídos, índice, taxas, pré-incisões).

Também traz, no resumo geral: folículos por minuto (médio), tempo médio pra cada
1000 unidades foliculares, e minis por 1000 folículos — tudo calculado em cima do
cronômetro e das contagens que você já registra, sem coleta nova. Uma tabela mostra
a distribuição percentual entre os tipos de unidade folicular (1, 2, 3, 4 fios e as
variantes "especial"), somando todas as cirurgias.

Reaproveitando as mesmas abas Completo/Reduzido/Todos da taxa de transecção, tem uma
tabela de **índice e transecção por quadrante** — quantas cirurgias tiveram dado
naquele quadrante, índice médio, taxa parcial/total média e a diferença média entre
Mamba e bancada (só entra na média quando o Mamba foi de fato preenchido naquele
quadrante daquela cirurgia). Na aba "Todos" essa tabela some pelo mesmo motivo da
taxa de transecção geral — completo e reduzido não são comparáveis numa média só.

Não precisa de nenhum banco de dados novo — o `data.json` que já é salvo a cada
cirurgia já é o histórico completo; o dashboard só lê e agrega o que já está lá.
Os gráficos são desenhados na hora, direto no navegador (SVG simples, sem depender
de nenhuma biblioteca externa nem de internet), então funcionam igual na rede local
e na nuvem.

## O que NÃO está nesta versão

Não tem QR code ainda (só o endereço em texto pra digitar/copiar, ou os botões de
compartilhar/WhatsApp) — eu não tinha como testar de forma confiável um gerador de
QR code sem depender de internet neste momento, e preferi entregar algo que eu tenha
certeza que funciona a arriscar um QR code que não escaneia.

## Controle de versão (git) — novo (30/07/2026)

Até agora, cada mudança no `server.js` existia só como "o arquivo mais
recente" — sem histórico, sem jeito de comparar versões, sem como reverter uma
mudança ruim além de eu ter guardado uma cópia anterior por conta própria.
Isso virou risco real conforme o app cresceu (383 chaves de tradução, dezenas
de features, uma suíte de 29 testes). A partir de agora, o projeto tem um
repositório git de verdade.

**Onde está:** `graftis-git-repo.zip`, na pasta de saída desta conversa.
Dentro dele tem uma pasta `graftis_repo/` com `server.js`, `LEIA-ME.md`,
`.gitignore` e `tests/` (a suíte de 29 testes ativa, mais uma subpasta
`tests/legacy-pre-11-julho/` com os 17 testes bem antigos do início do
projeto — 13 deles já não passam contra o código atual, então ficaram
isolados e identificados como histórico, não como suíte válida). Já tem um
primeiro commit feito ("Commit inicial: Graftis v1").

**Por que um .zip e não já dentro da pasta do projeto:** o ambiente onde eu
trabalho consegue criar e sobrescrever arquivos na pasta sincronizada com você,
mas não consegue apagar nem renomear nada nela — e o git precisa disso o
tempo todo (arquivos de trava, objetos temporários) pra funcionar. Por isso
montei o repositório de verdade num espaço à parte e empacotei num .zip só
pra te entregar.

**O que fazer com o .zip:**

1. Baixe `graftis-git-repo.zip` e descompacte no seu computador (dá pra
   substituir a pasta `fue-live-rede-local` antiga por essa, ou colocar em
   outro lugar — o `server.js` de dentro é idêntico ao que você já vinha
   usando).
2. Se ainda não tiver o git instalado, baixe em https://git-scm.com (Mac já
   vem com ele, geralmente).
3. Pra ver o histórico: abra o Terminal dentro da pasta descompactada e rode
   `git log`.

**IMPORTANTE:** a pasta `fue-live-rede-local` antiga (a que você já vinha
usando, sincronizada por aqui) ficou com uma pasta `.git` quebrada e incompleta
— uma tentativa de repositório que não terminou de ser criada por causa dessa
mesma limitação de apagar arquivo. Ela não atrapalha o funcionamento do app
(o `server.js` continua normal), mas é lixo. Pode apagar a pasta `.git` de
dentro dela quando quiser, direto pelo Finder/Explorador — só não dá pra eu
fazer isso por aqui.

**Daqui pra frente:** toda vez que eu mexer no `server.js`, o ideal é que você
me diga pra continuar trabalhando dentro dessa pasta já com git (ou eu te
aviso quando tiver uma mudança nova pra você aplicar e commitar). Cada mudança
vira um commit revisável — se algo der errado, dá pra comparar com uma versão
anterior ou reverter, coisa que não existia até agora.

## Banco de dados dividido por médico (Fase 2) — novo (31/07/2026)

Até aqui, todo o banco de dados do Graftis (todos os médicos, todas as
cirurgias, todos os tokens de login) vivia num único arquivo, `data.json`.
Qualquer ação — uma contagem de folículo, um upload de foto, um login —
reescrevia esse arquivo inteiro. Já era escrita atômica (arquivo temporário +
rename), então não corrompia, mas era uma única unidade de gravação
compartilhada por todos os médicos. Pensando no cenário real de 5 a 20 médicos
na mesma instância, cada um podendo estar numa cirurgia ao vivo ao mesmo
tempo, o risco era uma escrita pesada de um médico (cirurgia grande, muitos
dados) atrasar a resposta pra outro médico completamente sem relação, só
porque os dois disputavam o mesmo arquivo.

**O que mudou:** o banco de dados agora fica dividido em vários arquivos,
todos dentro da mesma pasta de dados de sempre (`DATA_DIR`) — nenhuma variável
de ambiente nova, nenhum ajuste no volume do Railway:

```
DATA_DIR/
  data/
    index.json            — auth global: médicos cadastrados, tokens de login
    doctors/
      <id-do-médico>.json — só as cirurgias daquele médico
    orfaos.json            — cirurgias sem dono (casos legados, raros)
  uploads/                 — continua exatamente como sempre foi, fora de escopo
```

Uma ação do médico A agora só regrava o arquivo do médico A — nunca disputa
recurso com o médico B. Testado diretamente: cadastrar dois médicos, criar uma
cirurgia pro médico A e conferir que o arquivo do médico B (mtime e conteúdo)
não mudou nem um pouco.

**Migração automática, sem risco pros dados que já existem.** Na primeira vez
que você rodar esta versão com um `data.json` antigo presente, o servidor
migra sozinho: lê o arquivo antigo, separa as cirurgias por dono, escreve os
arquivos novos, e só então confirma — soma o número de cirurgias e de médicos
nos arquivos novos e compara com o arquivo antigo. Se os números baterem
exatamente, o `data.json` antigo é renomeado pra
`data.json.bak-migrado-<data/hora>` (nunca apagado) e o servidor passa a
rodar com os arquivos novos. **Se os números não baterem por qualquer
motivo**, a migração é cancelada automaticamente, os arquivos novos que
tinham acabado de ser criados são removidos, e o servidor continua rodando
normalmente com o `data.json` antigo, sem aplicar a divisão — nenhuma
cirurgia é arriscada. Essa é exatamente a garantia pedida: nunca perder uma
cirurgia já registrada por causa desta atualização.

Isso já foi testado nos dois caminhos: migração com sucesso (2 médicos + 1
cirurgia sem dono, todos os arquivos batendo com o conteúdo esperado) e
migração forçada a divergir de propósito (confirma que o `data.json` antigo
fica intacto e o servidor continua respondendo normalmente, sem erro 500).

**Efeito colateral positivo: o botão "Baixar backup"** (Configurações →
Segurança da conta) não precisou de nenhuma mudança de código — o arquivo que
cada médico baixa já era, e continua sendo, só as próprias cirurgias; agora
esse recorte bate exatamente com o arquivo `data/doctors/<id>.json` daquele
médico por baixo dos panos.

Pra você que já está rodando o Graftis: não precisa fazer nada de especial —
é só atualizar o `server.js` pra esta versão e rodar normalmente
(`node server.js` na rede local, ou `railway up` na nuvem). A migração
acontece sozinha no próximo boot, uma única vez.

## Nuvem (Railway)

Rodar na nuvem faz sentido quando você quer acessar de qualquer lugar (não só da
clínica) ou compartilhar o app com outros médicos, cada um com a própria conta.
O mesmo `server.js` roda na nuvem sem nenhuma mudança de código — só precisa de
três variáveis de ambiente configuradas no painel do serviço de hospedagem.

Escolhi o Railway porque: não tem "hibernação" nos planos pagos (diferente do plano
grátis do Render, que dorme depois de 15 minutos parado e demora até 1 minuto pra
acordar — inaceitável no meio de uma cirurgia), suporta disco persistente (essencial
pra não perder os dados a cada atualização), e dá pra publicar direto do seu
computador, sem precisar criar conta no GitHub.

**Eu não posso fazer esses passos por você** — envolvem criar conta e possivelmente
cadastrar forma de pagamento, e isso só você deve fazer.

### Passo a passo

1. Crie uma pasta só com o arquivo `server.js` dentro (nenhum outro arquivo precisa
   ir junto).
2. Crie uma conta em https://railway.com
3. No Terminal, instale a ferramenta de linha de comando do Railway:
   ```
   bash <(curl -fsSL railway.com/install.sh) -y
   ```
4. Faça login (abre o navegador pra confirmar):
   ```
   railway login
   ```
5. Entre na pasta onde está o `server.js` e rode:
   ```
   railway init
   railway up
   ```
   Isso envia o arquivo direto do seu computador e já sobe o serviço.
6. No painel do Railway (abre sozinho, ou acesse https://railway.com/dashboard):
   abra o serviço que acabou de subir e crie um **volume** (disco persistente) —
   tecla de atalho `⌘K`/`Ctrl+K` e busque "volume", ou clique com o botão direito
   na tela do projeto. Monte esse volume no caminho `/data`.
7. Ainda no painel, na aba de **variáveis de ambiente** do serviço, adicione:
   - `DATA_DIR` = `/data` (pra usar o disco persistente que você acabou de criar)
   - `SECURE_COOKIES` = `true` (a nuvem serve em HTTPS, então o cookie de login
     deve exigir HTTPS)
   - `SMTP_ENABLED` = `true`, `SMTP_USER` = seu Gmail, `SMTP_PASS` = a senha de
     app do Gmail (veja o passo a passo na seção de e-mail acima) — se quiser
     habilitar "Esqueci minha senha" também na nuvem
8. Gere um domínio público:
   ```
   railway domain
   ```
   Esse é o endereço que você e seus colegas vão usar — funciona de qualquer
   lugar com internet, não só da clínica.
9. Abra esse domínio no navegador, crie sua conta de novo (a nuvem começa vazia,
   é um banco de dados separado do seu computador) e teste criar uma cirurgia.

Depois disso, qualquer mudança futura no `server.js` é reenviada com `railway up`
de dentro da mesma pasta.

### Coisas importantes de saber

- **Sem `DATA_DIR` apontando pro volume, os dados somem a cada nova publicação** —
  não pule o passo 6/7.
- Sem os volumes, cada `railway up` recria o serviço do zero.
- O plano pago do Railway tem um custo mensal (na casa de alguns dólares, mais uma
  fração de centavo por GB de armazenamento) — confirme o valor atual direto em
  https://railway.com/pricing antes de assinar, preços mudam.
- Os arquivos ficam num serviço fora do seu controle direto (diferente da rede
  local, onde os dados nunca saíam do seu computador) — isso muda a postura de
  privacidade dos dados de pacientes. Vale considerar como parte da decisão.

### Se os cadastros/cirurgias somem depois de um `railway up`

Isso é sempre falta de volume persistente de verdade — não é o app "esquecendo"
os dados. A cada `railway up`, o Railway recria o container do zero; só o que
está dentro de um volume montado sobrevive.

O `server.js` agora imprime um bloco "Diagnóstico de armazenamento" toda vez que
inicia. Depois do próximo deploy, veja os logs do serviço no painel do Railway
(aba "Deployments" → clique no deploy → "View Logs") logo no início, e confira:

1. **`DATA_DIR:`** — se aparecer o caminho da pasta do próprio `server.js` (algo
   como `/app`) em vez de `/data`, a variável de ambiente `DATA_DIR` não está
   chegando ao serviço. Confira em Settings → Variables do serviço se ela ainda
   está lá — variáveis de ambiente **não se perdem sozinhas**, mas se você criou
   um serviço novo (por engano, ou apagou e recriou) elas não são copiadas
   automaticamente.
2. Se `DATA_DIR` aparecer certa (`/data`) mas o log disser **"Arquivo já existia
   ao iniciar: não"** e "Médicos cadastrados carregados: 0" mesmo depois de você
   já ter cadastros — o volume não está de fato montado nesse serviço. No painel,
   confira: o volume existe? Está anexado a este mesmo serviço (não a um serviço
   antigo/duplicado)? O caminho de montagem é exatamente `/data`, sem erro de
   digitação?
3. Um erro comum: rodar `railway init` de novo sem querer cria um **serviço
   novo**, sem o volume do serviço antigo. Se isso aconteceu, o volume antigo
   (com os dados) ainda existe no painel — é só anexar ele ao serviço atual, ou
   apagar o serviço novo e voltar a publicar no antigo com `railway up`.

Se depois de conferir os três pontos acima o log ainda mostrar algo inesperado,
me manda o texto exato do bloco "Diagnóstico de armazenamento" que aparece no
log do próximo deploy — com isso dá pra identificar exatamente onde está o
descompasso.

### Backup: como garantir que um deploy nunca apague os dados

São duas camadas de proteção, uma na plataforma (Railway) e uma dentro do
próprio app. As duas são independentes — vale ter as duas.

**1. Volume persistente (`DATA_DIR=/data`) — já é o que impede o `railway up`
de apagar os dados.** Isso já foi configurado no passo a passo acima. Sem
isso, cada novo deploy recria o container do zero e perde tudo — **com**
isso, o `railway up` não toca nos dados, porque eles vivem fora do container
que é recriado. Se você já fez esse passo (você confirmou que sim), essa
parte já está resolvida — o `railway up` sozinho não é mais risco.

**2. Backup automático de volume do Railway (proteção contra acidente, não
só contra deploy).** O volume persistente protege contra deploy, mas não
contra: alguém apagar o volume sem querer, um problema na própria infra do
Railway, ou corrupção do arquivo. Pra isso, o Railway tem uma função de
backup de volume com agendamento — vale ativar:

1. Painel do Railway → clique no serviço → aba do **Volume** (ícone de
   disco) → aba **Backups**.
2. Configure um agendamento — diário (guarda os últimos 6 dias), semanal
   (guarda 1 mês) ou mensal (guarda 3 meses). Os backups são incrementais
   (só cobra pelo espaço extra de cada versão), então o custo é baixo.
3. Se precisar restaurar: ache o backup pela data na mesma aba e clique em
   "Restore" — ele sobe um volume novo a partir daquele snapshot.

Isso cobre **tudo** que está no volume (o `data.json` inteiro E a pasta
`uploads/` com as fotos).

**3. Backup manual dentro do próprio app (cópia fora do Railway).** Em
Configurações → Segurança da conta, tem um botão **"Baixar backup"** — cada
médico baixa um arquivo `.json` com o cadastro da própria conta e todas as
próprias cirurgias (contagens, tempos, pré-incisões). Não inclui as fotos
(essas dependem só do backup de volume do item 2) — é pensado como uma
segunda cópia, fora do Railway inteiramente (guardada no seu computador, no
Google Drive, etc.), pro caso extremo de perder acesso à própria conta do
Railway. Cada médico só consegue baixar os próprios dados, nunca os de outro
médico cadastrado no mesmo app.

Recomendação prática: ative o backup automático do Railway (item 2, é o que
protege de verdade contra acidente) e, de vez em quando, use o botão "Baixar
backup" (item 3) como uma segunda camada bem mais simples.
