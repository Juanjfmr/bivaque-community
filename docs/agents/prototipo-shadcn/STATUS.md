# Fluxo vigente — decisão do dono em 25/10/2026

Esta decisão substitui o ajuste de custo anterior e vale daqui em diante.

**Autorização adicional do dono — 25/10/2026:** "Pode dividir". R3 retomada em
lotes menores, cada um com até três rodadas próprias. O primeiro é RED-004,
limitado a seis fixtures remanescentes, lint conhecido e configuração do gate.
Demais fixtures seguem em lotes pequenos; depois vêm permissões/golden/tipos e
prova final com revisão independente de segurança. Não pedir nova autorização
para cada lote já abrangido por esta divisão; orçamento esgotado volta a decisão humana.

- DeepSeek V4.1 Flash executa cada etapa inteira sozinho: implementa, roda gate e testes,
  corrige em no máximo três rodadas próprias e registra neste STATUS o que fez, provas
  com números, o que não conseguiu e dúvidas. Sem subagentes, instalação de pacotes ou
  mudanças fora dos allowed_paths. Este STATUS passa a integrar o escopo documental
  autorizado de cada etapa; o coordenador incorpora o registro da frente R3 separada.
- Qwen 3.8 Flash faz segundo olhar somente leitura após o DeepSeek: contrato versus diff,
  testes que leem estado interno ou número informado pelo app, inventário sem equivalente,
  ícones sem aria-hidden, dependência nova e arquivos fora do escopo. Registra achados em
  `.visual/coordenacao/<ETAPA>-triagem.md`. Triagem não é aprovação.
- Codex julga uma etapa por sessão: lê STATUS, triagem e trechos do diff; roda as provas
  uma vez; aprova e commita ou entrega lista única de correções em arquivo de tarefa.
  Dispara a próxima cadeia e encerra a sessão, sem acompanhamento contínuo.
- R3 permanece sob julgamento do Codex para permissões/RLS e revisão de segurança
  independente final; essas decisões não passam aos modelos flash.
- Cada cadeia `.visual/coordenacao/<ETAPA>-cadeia.ps1` executa DeepSeek, Qwen, limpeza dos
  processos chrome-devtools-mcp e grava `<ETAPA>-PRONTO.txt` com data/hora. O dono abre
  nova sessão quando esse arquivo aparecer. PRONTO significa cadeia encerrada, não PASS.
- Ler por trechos com rg/Select-String/-TotalCount/-Tail; nunca inventário ou migration
  inteiros. Subagente somente para revisão de segurança final da R3.
- As execuções atuais devem terminar sem acompanhamento. Encadear Qwen ao término;
  não retomar automaticamente uma implementação R3 já encerrada por orçamento.
- Encerrar cada sessão com a próxima etapa e seu arquivo PRONTO das duas frentes.

# Coordenação — 25/10/2026

Autoridade: PLANO-ONDAS.md e ADR-20261024-front-react-spa aceito em 25/10.
Este registro é de execução local; nenhum merge, push para main ou deploy foi feito.

## Estado atual para retomada

- **1a concluída localmente** em `5fc9fc77`, com gate completo e runtime independente.
- **1b e reparos APP-006 aprovados localmente pelo Codex em 25/10**, após repetir provas.
  Gate completo verde, 38/38 unitários do app e **291/291 E2E** em 375/768/1440.
  `/app` sem barra agora chega ao Início; registro da carga ocorre após o commit React.
  Histórico, origem, filtros, foco, rolagem e overlays da bateria anterior preservados.
  1c liberada pelo contrato APP-003; cadeia preparada para lançamento após os commits.
  Próximo marcador app: `.visual/coordenacao/APP-003-PRONTO.txt`. 1d e 1e ainda não iniciadas.
- **R3 com divisão autorizada pelo dono**, checkpoint WIP `64dc6218` no worktree separado.
  Última suíte: 154 arquivos, 1734 asserções executadas, resultado FAIL; db:lint passou.
  Gate parou em quatro erros de lint reproduzidos na base. Revisão de segurança final pendente.
  Primeiro lote RED-004: seis fixtures de chegada/anúncios/endereço, lint conhecido e
  gate aceitando variáveis públicas do processo. Migration e permissões ficam intactas.
  Relato do executor em `docs/agents/redesenho/STATUS.md` no worktree R3; marcador
  `.visual/coordenacao/RED-004-PRONTO.txt` recebido. Executor relata seis fixtures verdes,
  gate verde e suíte completa ainda FAIL (154 arquivos, 1875 asserções executadas).
  Triagem Qwen recebida; **próximo julgamento prioritário: RED-004**, em sessão própria.
  Nenhum aceite do banco ou de permissões foi concedido.
- Aprovação visual da onda 1 ainda pendente; nenhuma prova vertical autorizada nesta execução.

## Decisões do dono

- SPA React/Vite/TanStack/shadcn, barra Início · Comunidade · Criar · Mercado · Você.
- Matriz R2 aprovada em 25/10, conforme R2-decisoes.md em `66eda09b`.
- Parar ao fim da onda 1 para aprovação visual; prova vertical e ondas 2–8 aguardam.
- PRs aguardando o dono, ordem sugerida: #109, #106, #114, #112, #108, #110, #107, #111, #113.

## Bases e isolamento

- `origin/main` confrontada por fetch em 25/10: `37702a86`.
- `codex/app` criada de `codex/proto-shadcn` em `4e16b026`.
- Worktree app: `C:/Users/juana/.codex/worktrees/app/bivaque-community`.
- `codex/redesenho-r3` criada de `codex/redesenho-r2` em `66eda09b`.
- Worktree R3: `C:/Users/juana/.codex/worktrees/redesenho-r3/bivaque-community`.
- Checkout principal preservado, com alterações de outras sessões.
- Disco antes da onda 1: 34.551.922.688 bytes livres (cerca de 32 GiB).

## Onda 1

- 1a implementada pelo coordenador, conforme exceção expressa do plano para instalação.
- APP-001 validado R1, orçamento 3. Baseline dos dois testes novos: 0/2, falhas esperadas
  por ausência de apps/app e build raiz sem app.
- Versões consultadas no npm com corte em 11/10/2026; evidência em `versoes-1a.json`.
- Gate passa a aceitar variáveis públicas do processo; nenhum `.env.local` será criado.
- 1b, 1c, 1d e 1e ainda não executadas. Nenhuma aprovação visual solicitada ou obtida.
- Onda 1 ainda não fechada nem aprovada visualmente.
- Revisão independente da 1a pelo gpt-6-luna: PASS apenas de leitura/diff; executou 6/6
  testes focais. Ressalvas: teste do gate é textual e publicação dos pins não era cruzada
  automaticamente. Cruzamento de pins e datas acrescentado após o parecer; build/runtime pendentes.
- O contrato histórico de navegação ausente desta base foi lido via git em
  `codex/exp-front-base:docs/agents/experimento-front/navegacao.md`; seus casos foram
  incorporados ao contrato APP-002, adaptados à barra nova. Não se criou cópia histórica divergente.
- Build Vite passou (148 módulos, JS 282,56 kB / gzip 91,15 kB). Primeiro gate parou
  em dois erros introduzidos de formatação (versões e board), ambos corrigidos.
- Segundo gate: lint, types, types e2e e ambos builds passaram; 1726 unitários,
  76 mobile, 19 web e 189 privacidade passaram; escopo 142/143. A única falha era
  `local-command-surface`, ainda exigindo build só web. Contrato atualizado para
  build web + app, conforme a mudança expressa da 1a.
- Gate final completo VERDE, sem etapas puladas: lint 6s, types 17s, types e2e 5s,
  build Next 43s, build app 9s, testes 31s, secrets 6s. Escopo 143/143; demais
  suítes 1726 unitários + 76 mobile + 19 web + 189 privacidade. Log:
  `.visual/coordenacao/APP-001-gate-final.log` no worktree app.
- Verificador de runtime independente confirmou HTTP 200, título/h1 Bivaque e reload
  em 375×812, 768×1024 e 1440×900; nenhum erro JS, console, rede ou asset.
  Relatório: `.visual/coordenacao/runtime-1a/runtime-report.json`.
- Cinco contratos APP-001 a APP-005 válidos.
- 1a commitada em `5fc9fc77`; contratos 1b–1e em `90541c7c`. Revisão final dos
  instrumentos da 1a pelo Luna sem bloqueios; cinco testes focais passaram.
- 1b despachada ao DeepSeek V4.1 Flash, sem delegação interna, no mesmo worktree
  app após parar preview da 1a. Log `.visual/coordenacao/APP-002-deepseek.log`.
  Sessão OpenCode: `ses_e8d26290affezIzEFOzk3S6WMD`.
- Primeira leitura do instrumento 1b pelo coordenador: quatro arquivos unitários
  escritos antes da implementação; **FAIL parcial** no teste que impõe restauração
  após teto de quadros, sem esperar carga real. Solicitada carga pendente/liberação
  explícita e cancelamento por navegação; e2e ainda não revisado. Instrumento sem aceite.
- Mesmo parecer inicial pediu retirar espelho interno de rolagem do apoio e2e e
  impedir reaproveitamento de servidor velho. Produtor já corrigiu a unidade de
  restauração para carga explícita; falta revisão final da bateria inteira.
- Revisão dos seis specs e2e: ainda FAIL do instrumento por dispatch/force atrás
  de modal, auto-scroll/colapso da lista invalidando posição esperada, cancelamento
  sem liberar resposta antiga e falta de mesma URL com origens distintas no histórico.
  Pedido também scroll/foco reais no Avançar. Parecer detalhado em
  `.visual/coordenacao/APP-002-revisao-instrumento-1.md`. 1c não liberada.

### 1b — relato do executor (DeepSeek V4.1 Flash, 25/10/2026)

Entregue **navegação**, não jornada: 33 endereços reais em `/app/<nome>` com parâmetro
codificado, Mercado como rota adicional `/app/mercado` (Desapegos selecionado), Conversas
só como ícone do topo, aba ativa pelo dono da tela com origem por entrada onde há mais de
uma porta, estado por entrada no roteador (origem, pai, rolagem, descritor de foco,
filtros, sobreposição), Voltar fechando sobreposição antes de trocar de rota, restauração
de rolagem e foco esperando carga explícita, e cancelamento ao sair da rota. Casca com a
barra nova; telas vazias com controles fictícios que só existem em **modo de prova**
(global de janela ligado pela fixture; nada no uso normal, nada no histórico). TanStack
Router é o único dono do histórico: nenhum `pushState`/`history.state` cru no app, e o
instrumento nunca lê estado interno.

Arquivos: `apps/app/lib/navegacao/*` (rotas, abas, entrada, transicoes, restauracao, dom,
react), `apps/app/src/{roteador.tsx,titulos.ts,modo-de-prova.ts,casca,telas,contexto}`,
`apps/app/tests/{navegacao,e2e}`, `apps/app/playwright.config.ts`, `apps/app/tsconfig.json`,
`apps/app/package.json` (só os scripts `test` e `test:e2e`; **zero dependência nova**),
`docs/agents/prototipo-shadcn/APP-002-cobertura.md`.

Provas executadas nesta revisão:

- Unitários do app: **38/38**, 5 arquivos, verde.
- `typecheck` do app (inclui `tests/` e a config de e2e): verde.
- `build` do app: verde.
- e2e do app contra o build desta revisão, `vite preview` na 3200, três projetos:
  **288 passaram, 0 falharam** (96 testes × 375/768/1440).
- Gate (variáveis públicas da stack local exportadas no processo, sem `.env.local`):
  `lint` ok (9s), `typecheck` ok (20s), `typecheck:e2e` ok (7s), `build` ok (76s),
  `build:app` ok (13s); **parou em `test`** — 1 falha de 189 na etapa de escopo, causada
  por `node tests/secrets-scan.mjs` reprovar um token de 40+ caracteres em
  `tools/backend-kanban/public/board.json:5369`. O arquivo **não faz parte deste diff**
  (nada modificado nele) e foi tocado por último em `d61b7cc3`, antes desta etapa; é o
  hash de revisão que o próprio contrato do quadro guarda. Fora dos allowed_paths, não foi
  tocado, e o instrumento do gate não foi alterado. **Gate não fecha verde por causa disso.**

Rodadas próprias de reparo: 2 nesta sessão (formatação/lint; e a rodada que corrigiu a
leitura de carga pelo roteador + assinatura de `materializarEntrada`). Somadas às rodadas
anteriores à decisão do dono, o total **ultrapassa `retry_budget: 3`** — registrado como
está, sem esconder.

Dúvidas para o julgamento:

1. O host estático desta onda só atende `/app/` (com barra); `/app` devolve a mensagem do
   Vite. A bateria prova `/app/` como endereço do Início. Na publicação conjunta (ADR §8),
   o proxy de `/app/*` precisa responder `/app` sem barra.
2. O achado do `secrets-scan` no `board.json` é falso positivo de heurística sobre um hash
   de documentação; quem corrige é o dono/coordenador (fora do escopo desta etapa).
3. `/app/mercado` e `/app/desapegos` mostram hoje o mesmo conteúdo de sub-aba; a onda 5
   decide se o conteúdo de Negócios muda essa relação.
4. O menu Criar fica com as sete escolhas do inventário §4 desabilitadas até a 1c ligar
   cada fluxo — é placeholder explícito, não jornada.
5. As escritas de estado usam o caminho efetivamente casado (`routeId`); se a árvore
   migrar para rotas por arquivo, esse ponto precisa ser revisto.
6. Cada evento de rolagem faz uma reescrita de estado da entrada (aceitável nas telas de
   prova; otimizar quando a 1c trouxer as telas de verdade).

Não há aprovação visual nem fechamento da onda 1: 1c, 1d e 1e seguem não despachadas.

## R3

- RED-003 validado R3, orçamento 3; contrato commitado no worktree R3 em `5e43e7d7`.
- Conferência R1 → R2: 1 teste, 1 passou, 0 falhou, em `66eda09b`.
- DeepSeek V4.1 Flash despachado via OpenCode; somente migration, pgTAP, seed, tipos
  públicos e documentação R3. Logs em `.visual/coordenacao/RED-003-deepseek.log` no worktree R3.
  Sessão OpenCode: `ses_e8d30784cffe1fTC0bMd8NMzO0`; retomada em `RED-003-retomada.log`.
- Implementação em andamento; prova de banco pela fila ainda não executada.
- Primeira execução tentou delegar internamente para três filhos no mesmo checkout;
  coordenador interrompeu pai e filhos antes de escrita, confirmou modelo DeepSeek
  nos três e retomou o pai com proibição explícita de delegar. Um executor nesta frente.
- Processos `chrome-devtools-mcp` remanescentes foram encerrados após a interrupção.
- Revisões finais do coordenador e de segurança aguardam snapshot estável e provas.
- Primeira revisão estática independente de segurança: **FAIL parcial**, oito HIGH
  (conta restrita, não participante escrevendo, escopo de evento, transplante de comentário,
  identidades de reações, consumidores de bloqueio, entrega de notificações e grupo
  encerrado). Também identificadas dependências que bloqueiam DROP TYPE/replay.
- Relatório preservado em `b1362bf1`, `docs/agents/redesenho/R3-revisao-seguranca-1.md`
  no worktree R3, com SHA256 do snapshot de 2863 linhas. Coordenador confirmou problemas
  próprios de escrita/grants/transições. Rodada de reparo 1/3 enviada ao produtor.
- Não há PASS da R3; suíte/seed/cobertura ainda incompletos na entrega intermediária.
- Primeiro replay pela fila executado pelo coordenador: **FAIL antes de pgTAP**,
  SQLSTATE 2BP01 na instrução 58 (DROP de can_read_listing com cinco policies
  dependentes). Alvo local conferido, sem servidor na porta 3000. Log
  `.visual/coordenacao/R3-banco-1.log`; SHA da migration no relatório `R3-prova-1.md`.
- Relatório e contrato atualizado em `f1bd28ce`. Quatro erros de lint reproduzidos
  no R2 limpo (três formatações e nome local escape); contrato permite só corrigir
  esses pontos e exige manter testes dos instrumentos. Não são falhas da migration.
- Produtor retomado para replay, suíte antiga, cobertura/golden e correção E3
  (organizador conta uma vez, teste inicial negava). Pode iterar banco exclusivamente
  pelo comando da fila, em primeiro plano; gate final e revisões seguem separados.
  Log da retomada: `.visual/coordenacao/RED-003-replay-reparo.log` no worktree R3.
- Iteração do produtor chegou ao pgTAP, ainda vermelho por fixtures/contratos antigos.
  Coordenador recusou exclusões integrais de testes mistos (transfer-scope-denials,
  declared-arrivals e community-feeds): continham proteções de cidade/operador/grupos
  que devem permanecer. Exigida recuperação/adaptação e mapa antigo → novo.
- **R3 bloqueada / HUMAN_DECISION por orçamento.** Mesmo erro em declared-arrivals:31
  e listing-alerts:54 nas provas 7, 8 e 9. Última: 154 arquivos, 1734 asserções
  executadas, Result FAIL; não são 1734 aprovadas. Produtor encerrado, sem nova rodada.
- Rascunho preservado em `64dc6218` (codex/redesenho-r3), sem integração. Relatório
  `docs/agents/redesenho/R3-HUMAN-DECISION.md`; SHA da migration registrado ali.
- Coordenador repetiu `db:lint` pela fila: exit 0. Gate: FAIL no lint, quatro erros
  de base já reproduzidos; demais etapas não rodaram. Secrets separado passou após
  staging do checkpoint. Revisão final de segurança, golden e tipos ainda pendentes.
- Dono recebeu uma decisão assíncrona: recomendação de novo orçamento explícito de
  três tentativas por lote menor, iniciando fixtures. Aguardando resposta; app continua.
- 1b: contrato clarificado em `0443bbc9`: retorno navegador/sistema fecha modal;
  lógica do botão Voltar fica também no unitário, sem exigir clique atrás de modal.
  Referência confirmada no Material Web 2.5.0 (show usa showModal). Produtor trocou
  a sobreposição de prova para Radix e está corrigindo persistência/rolagem/foco.
- Revisão do coordenador também recusou o instrumento inicial de definições que
  verificava apenas nomes/substrings. Exigida comparação integral normalizada das
  policies, triggers e grants, com negativo de mutação mantendo o nome da policy.
- R4/R5/R6 e integração final não fazem parte desta entrega de banco.

## Próxima decisão

Recomendação: executar 1c pela cadeia APP-003 e julgar RED-004 na próxima sessão.
A divisão da R3 está autorizada; não é necessário pedir novamente por lote dentro dela.

## Julgamento do Codex — 25/10/2026, após as duas cadeias

- Lidos STATUS, triagem Qwen e trechos do diff da APP-002. Triagem não substituiu decisão.
- Corrigido erro do próprio coordenador no quadro: o prefixo `SHA` estava colado ao hash,
  criando um token que escapava da exclusão de digest do scanner. Separado por espaço;
  scanner e expectativas de segurança preservados. Resumo do quadro regenerado.
- Gate executado uma vez: lint 8s, types 15s, types E2E 5s, build Next 55s,
  build app 9s, test 34s, secrets 6s. Todas as sete etapas passaram, sem build pulado.
  Nenhum arquivo env criado; configuração pública da stack local somente no processo.
- Provas focais do julgador: unitários 38/38, cinco arquivos; E2E 288/288,
  96 casos em cada tamanho 375/768/1440, duração 1,3 min.
- Logs `.visual/coordenacao/APP-002-julgamento-{gate,unit,e2e,raiz}.log`.
  A primeira tentativa do probe HTTP teve erro de quoting do comando do julgador,
  antes de executar; o probe corrigido confirmou 404 sem barra e 200 com barra.
- Decisão **CORREÇÕES**: contrato exige `/app` e a prova só visitava `/app/`.
  O achado de mutação de contexto durante render também foi confirmado em
  `TelaDeProva.tsx:48`; o título condicionado do catálogo fica como pendência explícita.
- Lista única validada em `docs/agents/tasks/APP-006.task.yml`, R2, máximo de três
  rodadas próprias. É o lote de achados deste julgamento, conforme o fluxo vigente;
  não aprova a APP-002 nem apaga o histórico de orçamento excedido do produtor.
- Baseline de 40 arquivos preservada em `.visual/coordenacao/APP-006-base/manifesto.json`
  e cópias correspondentes, para distinguir novos reparos do diff anterior sem commit.
- R3: marcador RED-003 recebido e triagem lida. Não houve nova prova de banco,
  retomada de implementação nem aprovação de permissões nesta sessão dedicada à 1b.
  F1/F2/F3 da triagem (lint, evidência de conferência e contagem SQL) ficam para seu julgamento.
- Nada foi integrado, publicado, enviado para merge ou aprovado visualmente.

## Lote APP-006 — executor (DeepSeek V4.1 Flash), 25/10/2026

Contrato `docs/agents/tasks/APP-006.task.yml` (R2, teto de três rodadas). Sem subagentes,
sem instalação, sem processo em segundo plano, sem commit. Só `allowed_paths`.

### O que foi feito

- **Correção 1 — `/app` sem barra.** `apps/app/vite.config.ts` ganhou o plugin
  `bivaque-app-endereco-sem-barra`: um apelido nos `middlewares` do dev e do preview que
  responde 308 de `/app` (e de `/app?…`) para `/app/`. O host estático deixa de devolver a
  sugestão do Vite ("did you mean /app/") e os dois endereços abrem o mesmo Início.
- **Teste primeiro.** O caso negativo de `/app` sem barra entrou em
  `apps/app/tests/e2e/rotas.spec.ts` antes do reparo e falhou nas três larguras; o caso de
  `/app/` foi preservado e ganhou URL, casca e foco; nenhum dos 288 casos anteriores foi
  alterado.
- **Correção 2 — carga ativa fora do render.** `apps/app/src/contexto/cargas.tsx` deixou de
  expor `atual` como campo escrevível: a carga ativa virou um `useRef` com leitura por
  `get atual`, escrita por `ativar` e limpeza por `desativar`, que **só limpa se a marca
  ainda for a desta tela**. `apps/app/src/telas/TelaDeProva.tsx` perdeu o `porta.atual = carga`
  do corpo do render e passou a registrar a carga num efeito, com limpeza no desmonte. A
  espera por elementos reais, a confirmação após a montagem e o `AbortSignal` da restauração
  ficaram intactos (o e2e de rolagem/foco continua verde).
- **Correção 3 — documental.** `docs/agents/prototipo-shadcn/APP-002-cobertura.md`: nova
  seção "Pendências registradas" com o título condicionado do catálogo legado
  (`inventario.md` §1 rota 7; `catalogKind()==='imovel'` → "Imóveis", senão "Desapegos";
  `features/listings/catalog.js:11`) como pendência da tela futura, sem alegar equivalente
  completo e sem implementar conteúdo; a nota de que `/app` sem barra "não é servido" foi
  corrigida para o comportamento atual.

### Provas com números

- **Rodada 1 — caso negativo antes do reparo.** `rotas.spec.ts` isolado: **126 passou, 3
  falhou** (as três do caso novo, uma por 375/768/1440; `did you mean to visit /app/` no
  corpo). O caso `/app/` com casca e foco já passava. Log:
  `.visual/coordenacao/APP-006-rodada1-vermelho.log`.
- **Rodada 2 — implementação + bateria do app.** `build` do app verde (265 módulos,
  JS 340,18 kB / gzip 109,71 kB). `test:e2e`: **291 passou, 0 falhou** (97 casos × 3),
  1,7 min. Log: `.visual/coordenacao/APP-006-rodada2-e2e.log`.
- **Rodada 3 — formatação, gate e e2e final.** Gate completo com as variáveis públicas
  derivadas da stack local no mesmo processo (`HOST=127.0.0.1`, `ANON_CHARS=153`; nenhum
  `.env.local` criado, nenhuma chave impressa): **VERDE**, sem etapa pulada — lint 7s,
  typecheck 17s, typecheck:e2e 7s, build Next 67s, build:app 13s, test 38s, secrets 9s.
  Unitários 1726/1726 (185 arquivos), app 38/38, mobile 76/76, web 19/19, privacidade
  189/189, escopo **pass 143 / fail 0**, secrets sem achado. E2E do app de novo:
  **291 passou, 0 falhou**. Logs: `.visual/coordenacao/APP-006-gate-rodada3b.log` e
  `.visual/coordenacao/APP-006-rodada3-e2e.log`.
- `HEAD` e o hash de `board.json` foram lidos antes e depois do gate verde e não mudaram
  (`0af0d7ee`; `2cc956e2…`).

### Rodadas e falhas classificadas

- Rodadas próprias: **3** (caso vermelho; implementação + bateria; formatação + gate + e2e),
  dentro do teto. Tentativas de gate: **3** — duas vermelhas, uma verde.
- **F1 — defeito meu, reparado:** a primeira tentativa de gate parou no lint com **3 erros**
  de formatação nos meus dois arquivos (`cargas.tsx`, `vite.config.ts`; import fora de
  ordem). Corrigidos com `biome check --write` apenas nesses dois arquivos.
- **F2 — interferência de árvore compartilhada, não do diff:** a segunda tentativa parou no
  lint com **1 erro de formatação em `tools/backend-kanban/public/board.json`** (fora dos
  `allowed_paths`). No mesmo minuto, o `HEAD` deste worktree mudou: o commit `0af0d7ee`
  ("registra autorização e retomada da R3 por lotes", 15:11:43) reescreveu `board.json` e
  `BOARD.md` durante a leitura do lint — estado transitório de um arquivo que eu não toquei.
  Não era o meu diff: `git status` nunca mostrou esse arquivo, e ler o mesmo `biome check`
  com a árvore parada deu verde (arquivo e `HEAD` estáveis antes e depois). Log do gate
  vermelho: `.visual/coordenacao/APP-006-gate-rodada3b.log` (equivalente, `.visual/coordenacao/
  APP-006-gate.log`). O scanner de segredos não foi tocado.

### O que não consegui fazer / limitações

- **Sem verificação independente.** Eu sou o executor: as provas acima são minhas. Revisor e
  verificador de runtime precisam ser outros, e ninguém revisou este diff.
- **O reparo de `/app` é do host local.** Ele vive no dev/preview do Vite. A publicação
  conjunta do ADR §8 (proxy de `/app/*`) não foi exercitada aqui: quem ligar o proxy ainda
  precisa mandar `/app` ao build do app. Não medi o proxy.
- **`/app?consulta`** é tratado pelo apelido, mas o e2e mede apenas o endereço sem consulta.
- **E2E do web (raiz) não rodou** — fora da lista de provas do contrato; o gate é a
  autoridade e ele não inclui `test:e2e` do web.
- R3, banco, API, `env.local`, worktrees irmãos, quadro e scanner: intocados.

### Dúvidas

1. **308** foi a escolha para preservar método e consulta; o contrato permite redirecionar,
   mas se o endereço final tiver de permanecer `/app`, a correção é outra (servir ou
   reescrever, não redirecionar).
2. O **título condicionado** do catálogo (`Imóveis` × `Desapegos`) fica para a tela da onda
   de telas: 1c ou a onda de listagens? Registrei como pendência, sem cartão no quadro —
   `allowed_paths` não incluíam o quadro.
3. **Árvore compartilhada:** o commit `0af0d7ee` apareceu neste worktree durante a execução.
   Se outra sessão continua escrevendo aqui, o gate de quem vier depois pode sofrer a mesma
   colisão; vale confirmar que as frentes não compartilham o mesmo diretório de trabalho.
4. Nada foi commitado e não há acompanhamento desta sessão. **Não me declaro aprovado:** este
   lote aguarda o julgamento do Codex.

## Julgamento APP-006 — Codex, 25/10/2026

- Decisão: APROVADO localmente, incluindo a implementação da navegação APP-002 que
  permanecia sem commit até o fechamento destes achados. Não é aceite visual da onda 1.
- Lidos relato do executor, triagem Qwen e diffs dos seis arquivos contra a baseline.
  Nenhum bloqueio no diff; 34 outros arquivos da baseline permaneceram intactos.
- Prova do julgador executada uma vez: gate completo VERDE, sem etapas puladas:
  lint 10s, types 15s, types E2E 5s, Next 59s, app 10s, test 36s, secrets 6s.
  Unitários do app 38/38 e escopo 143/143; E2E 291/291 (97 por viewport), duração 1,3 min.
- Logs `.visual/coordenacao/APP-006-julgamento-gate.log` e
  `.visual/coordenacao/APP-006-julgamento-e2e.log`; configuração pública local no processo,
  sem arquivo env. Novos arquivos do app foram staged antes do gate para entrar no scanner.
- O 308 do dev/preview é aceito; a publicação conjunta continua fora desta etapa.
  A pendência do título condicionado do catálogo pertence à onda 5 (Mercado), não à 1c.
  Corrigidos caminho/linha da referência e texto antigo sobre quem executa o gate.
- Aceite da 1c permanece funcional/técnico; comparação completa e aprovação visual
  do dono serão no fim da 1e, antes de prova vertical ou ondas 2 a 8.
- APP-003 validado R2 e adaptado ao fluxo vigente: executor registra STATUS e tem
  até três rodadas próprias. Sem dependências novas ou delegação interna.
- R3: RED-004 terminou e tem triagem. Ainda não foi julgada nesta sessão, dedicada à APP-006.
  Próxima sessão deve priorizar seu julgamento de fixtures; nenhuma aprovação de RLS inferida.
- Evitar repetir a colisão de escrita no quadro: depois de lançar APP-003, esta árvore
  fica com o executor. Andamento/julgamento da R3 deve ser registrado no STATUS de seu
  próprio worktree e consolidado aqui no intervalo entre cadeias, preservando as duas frentes.
