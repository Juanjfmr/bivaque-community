# Coordenação — 25/10/2026

Autoridade: PLANO-ONDAS.md e ADR-20261024-front-react-spa aceito em 25/10.
Este registro é de execução local; nenhum merge, push para main ou deploy foi feito.

## Estado atual para retomada

- **1a concluída localmente** em `5fc9fc77`, com gate completo e runtime independente.
- **1b em implementação/revisão**, sessão `ses_e8d26290affezIzEFOzk3S6WMD`.
  Último recorte de rolagem/foco: 5/6 passaram em 375; o sexto tinha uma exigência
  incorreta de foco após clicar no liberador da carga e está sendo corrigido.
  Isso não é aceite da bateria completa. 1c–1e ainda não despachadas.
- **R3 bloqueada por orçamento**, checkpoint WIP `64dc6218` no worktree separado.
  Última suíte: 154 arquivos, 1734 asserções executadas, resultado FAIL; db:lint passou.
  Gate parou em quatro erros de lint reproduzidos na base. Revisão de segurança final pendente.
  Pedido ao dono: autorizar lotes menores com novo teto de três tentativas por lote,
  ou manter bloqueada até o Claude. Sem resposta, não retomar a implementação R3.
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

Recomendação: manter a sequência 1a → bateria 1b → casca 1c → dados 1d → instrumentos 1e,
com R3 independente. Não há nova decisão do dono necessária neste momento.
