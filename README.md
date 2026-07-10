# Contagem ao Vivo

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
   precisa estar logado.
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
preenchida) contra o total de folículos manipulados.

Além disso: cronômetro de cirurgia com ritmo médio, cronômetro de pré-incisões
independente (com seu próprio ritmo médio), aba de Pré-incisões (12 áreas, em grid
de duas colunas), aba de Fotos (marcação cirúrgica + pós-operatório, salvas no
computador que roda o servidor e visíveis em todos os celulares conectados), áudio
configurável por aparelho, e relatório pra imprimir/salvar em PDF com o resumo
geral, cada quadrante em detalhe, pré-incisões, distribuição de unidades e fotos.
Tudo sincronizado ao vivo entre os aparelhos.

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
  - "Folículos manipulados" (o número mostrado no card do Mamba) segue a definição
    da taxa total: íntegros + transecção total.

  **Atenção a essa diferença entre os modos**: no modo completo, a taxa parcial e a
  taxa total dividem pelo mesmo denominador (folículos manipulados = íntegros +
  parciais + totais). No modo reduzido, cada taxa tem sua própria base, como descrito
  acima. São definições diferentes de "taxa de transecção" entre os dois modos — não
  compare o percentual de uma cirurgia em modo completo com o de outra em modo
  reduzido como se fossem a mesma métrica.

Testei essa matemática isoladamente (extraindo a lógica do app e comparando contra os
seus próprios exemplos numéricos, incluindo o caso com transecção total) antes de
entregar — bate exatamente.

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
