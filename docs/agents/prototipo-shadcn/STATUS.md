# Coordenação — 25/10/2026

Autoridade: PLANO-ONDAS.md e ADR-20261024-front-react-spa aceito em 25/10.
Este registro é de execução local; nenhum merge, push para main ou deploy foi feito.

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
- Cinco contratos APP-001 a APP-005 válidos. 1b será executada pelo DeepSeek após commit da 1a.

## R3

- RED-003 validado R3, orçamento 3; contrato commitado no worktree R3 em `5e43e7d7`.
- Conferência R1 → R2: 1 teste, 1 passou, 0 falhou, em `66eda09b`.
- DeepSeek V4.1 Flash despachado via OpenCode; somente migration, pgTAP, seed, tipos
  públicos e documentação R3. Logs em `.visual/coordenacao/RED-003-deepseek.log` no worktree R3.
- Implementação em andamento; prova de banco pela fila ainda não executada.
- Primeira execução tentou delegar internamente para três filhos no mesmo checkout;
  coordenador interrompeu pai e filhos antes de escrita, confirmou modelo DeepSeek
  nos três e retomou o pai com proibição explícita de delegar. Um executor nesta frente.
- Processos `chrome-devtools-mcp` remanescentes foram encerrados após a interrupção.
- Revisão do coordenador e revisão independente de segurança ainda não executadas.
- R4/R5/R6 e integração final não fazem parte desta entrega de banco.

## Próxima decisão

Recomendação: manter a sequência 1a → bateria 1b → casca 1c → dados 1d → instrumentos 1e,
com R3 independente. Não há nova decisão do dono necessária neste momento.
