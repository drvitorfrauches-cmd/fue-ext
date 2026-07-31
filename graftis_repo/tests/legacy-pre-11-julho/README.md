# Testes antigos (pré-11/07/2026) — não fazem parte da suíte ativa

Estes 17 arquivos são os primeiros testes escritos para o app, dos primeiros
dias de desenvolvimento (9-11/07/2026). O app evoluiu bastante desde então
(modelo de quadrantes, Mamba, cadeia de contagem, etc.) e a maioria deles
ficou desatualizada — rodando contra o `server.js` atual, **13 dos 17
falham** (referenciam estruturas de dados ou comportamentos que já mudaram).

Mantidos aqui só por histórico, não como sinal de cobertura de teste real.
A suíte ativa e mantida é a pasta `tests/` (nível acima) — são esses os 29
arquivos que rodo a cada mudança no `server.js`, e que continuam 100%
passando.

Se algum dia quiser aposentar de vez esses arquivos, é seguro apagar esta
pasta inteira — nada no app depende deles.
