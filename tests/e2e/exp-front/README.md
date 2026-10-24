# Bateria EXP-001

A bateria é neutra em relação à implementação: os specs da jornada localizam controles por papel/nome acessível; não leem classes, IDs, `data-*` ou estrutura de componentes. O Playwright executa os projetos mobile-375, tablet-768 e desktop-1440.

## O que cada parte prova

- `navegacao.spec.ts`: os nove casos da tabela em `docs/agents/experimento-front/navegacao.md`: voltar, avançar, reload, link direto, origem, filtro, rolagem (±24 px), aba ativa e foco.
- `eliminatorios.spec.ts`: as três contas da carga; redirecionamento sem cidade; isolamento da cidade e do detalhe; ausência de segredo no JavaScript; timeout depois do insert e contagem com a chave de serviço apenas no teste; preservação de rascunho após abort de rede; escape do título HTML. O eliminatório “navegação” é o resultado agregado dos nove casos do spec anterior.
- `falhas.spec.ts`: resposta atrasada de filtro, sessão expirada durante publicação e atualização entre duas abas.
- `tema.spec.ts`: a cor calculada de `body` acompanha `emulateMedia` sem navegação/reload.
- `scripts/exp-front/capturas.mjs`: constrói o protótipo, captura protótipo e candidata em 375/768/1440, claro/escuro e normal/carregando/erro, grava PNGs lado a lado por origem e diferenças percentuais/absolutas em `capturas-report.json`.
- `scripts/exp-front/celular.mjs`: Chromium com CPU 4× e 4G lenta; registra conteúdo pronto a frio/quente, latência percebida das três ações, intervalos de frame e frames acima de 32 ms, heap quando disponível e bytes transferidos em `celular-report.json`.
- `scripts/exp-front/medir.mjs`: sequência única para a fila: reset com seed, aplicação de `carga.sql`, leitura do env exclusivamente via `supabase status -o env`, servidor de produção já compilado na porta 3000, specs nos três projetos, capturas e celular. Escreve `resumo.json`, o JSON bruto do Playwright e encerra o servidor iniciado.

## Comandos

```sh
# Dentro da fila, com o build de produção da candidata já pronto:
node scripts/agents/prova-fila.mjs -- node scripts/exp-front/medir.mjs A

# Componentes isolados (pressupõem banco/carga e servidor prontos):
npx pnpm@11.18.0 exec playwright test tests/e2e/exp-front/navegacao.spec.ts
npx pnpm@11.18.0 exec playwright test tests/e2e/exp-front/eliminatorios.spec.ts
npx pnpm@11.18.0 exec playwright test tests/e2e/exp-front/falhas.spec.ts
npx pnpm@11.18.0 exec playwright test tests/e2e/exp-front/tema.spec.ts
node scripts/exp-front/capturas.mjs A
node scripts/exp-front/celular.mjs A
```

## Limites de confirmação sem candidata

- Não foi possível confirmar se a tela usa exatamente `POST /rest/v1/recommendation_requests`, os parâmetros de `list_indications`, nem o envelope/status que a candidata devolve depois de inserir. O spec intercepta o endpoint REST exigido pelo contrato; confirme esse nome quando a primeira candidata existir.
- A política de idempotência não está definida por contrato de banco. O caso de timeout detecta duplicação depois de gravar e exige uma linha, mas só passará se a candidata conseguir reconhecer/reconciliar a tentativa repetida.
- O HTML do protótipo não oferece nomes acessíveis congelados idênticos em todos os controles; capturas usam apenas a rota comunitária do protótipo e não comparam interações do protótipo. A equivalência semântica das capturas precisa de revisão visual.
- Sessão expirada e respostas fora de ordem dependem de como a candidata implementa renovação/cache. A prova força 401 nos endpoints de auth e atrasa a RPC, mas não foi executada contra runtime.
- Chrome expõe heap por `performance.memory` apenas em algumas compilações; nesse caso o relatório registra `null`. O teste de CPU/rede é emulação, não aparelho físico.
- A verificação solicitada não cobre execução de banco, E2E ou build. O board não tem cartão EXP-001 identificado; o escopo desta preparação não permite editar o board, então essa reconciliação fica com o coordenador.
