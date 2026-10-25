# APP-002 — navegação: cobertura da onda 1b

Contrato: [`docs/agents/tasks/APP-002.task.yml`](../tasks/APP-002.task.yml). Autoridade:
[`PLANO-ONDAS.md`](PLANO-ONDAS.md) onda 1b, [`ADR-20261024-front-react-spa`](../../decisions/ADR-20261024-front-react-spa.md)
§3, §3.1 e §3.2, e [`inventario.md`](inventario.md) §1 e §5.

Esta onda entrega **navegação**, não jornada: as rotas desenham o título real e, em
**modo de prova**, os controles que deixam a bateria medir a navegação. Fora do modo de
prova a tela fica vazia. O visual é da onda 1c.

## Onde está

| Papel | Arquivo |
|---|---|
| Catálogo das 33 rotas + Mercado + fallback | `apps/app/lib/navegacao/rotas.ts` |
| Aba ativa (ADR §3.1/§3.2) e sub-abas do Mercado | `apps/app/lib/navegacao/abas.ts` |
| Estado por entrada (origem, pai, rolagem, foco, filtros, sobreposição) | `apps/app/lib/navegacao/entrada.ts` |
| Decisões puras (navegar, filtrar, abrir/fechar sobreposição, voltar) | `apps/app/lib/navegacao/transicoes.ts` |
| Carga da entrada + restauração (espera explícita, sem tempo de parede) | `apps/app/lib/navegacao/restauracao.ts` |
| Verbetes de DOM (rolagem, foco, visibilidade) | `apps/app/lib/navegacao/dom.ts` |
| Ligação com o React (`useRolagemEFoco`, `useNavegacao`) | `apps/app/lib/navegacao/react.tsx` |
| Árvore de rotas e dono do histórico | `apps/app/src/roteador.tsx` |
| Casca (topo, barra Início·Comunidade·Criar·Mercado·Você, sobreposições) | `apps/app/src/casca/Casca.tsx`, `Sobreposicoes.tsx` |
| Telas vazias de prova e fallback | `apps/app/src/telas/TelaDeProva.tsx`, `TelaIndisponivel.tsx` |
| Modo de prova (liga os controles fictícios) | `apps/app/src/modo-de-prova.ts` |

TanStack Router é o único dono do histórico: estado da entrada entra por `navigate({ state })`;
nunca há `pushState`/`history.state` cru. A camada não conhece nenhuma tela do produto.

## Regra → arquivo → teste

| Regra (contrato) | Onde vive | Teste |
|---|---|---|
| 33 rotas com URL real `/app/<nome>`, parâmetro codificado | `rotas.ts` | `units rotas.test.ts`; `e2e rotas.spec.ts` |
| `/app` leva ao início (aba, título, casca e foco como Início) | `roteador.tsx` (`path: "/"`), `rotas.ts` (`rotaPeloCaminho("/")`) | `e2e rotas.spec.ts` ("/app/ leva ao início") |
| Mercado é rota adicional `/app/mercado` com as sub-abas | `rotas.ts`, `roteador.tsx`, `abas.ts` | `e2e rotas.spec.ts`, `abas.spec.ts` |
| Parâmetro obrigatório ausente tem fallback visível | `rotas.ts validarParametros`, `TelaIndisponivel` | `e2e rotas.spec.ts` ("ID obrigatório ausente") |
| Tópico de Ajuda em branco cai na forma sem tópico | `rotas.ts validarParametros` | `e2e rotas.spec.ts` |
| Rota fora do catálogo tem fallback visível | `roteador.tsx` (`notFoundComponent`, `defaultNotFoundComponent`) | `e2e rotas.spec.ts` |
| Aba: dono fixo, origem por entrada, ou nenhuma (Conversas no topo) | `abas.ts` | `units abas.test.ts`; `e2e abas.spec.ts` |
| Mesma URL em duas entradas guarda a origem de cada uma (Voltar/Avançar) | `entrada.ts`, `react.tsx` | `e2e abas.spec.ts` (Salvos, Meus anúncios, busca, destino de aviso) |
| Origem não vence dono fixo de pergunta, anúncio e negócio | `abas.ts` | `e2e abas.spec.ts` |
| Estado por entrada tipado, sem singleton entre entradas | `entrada.ts` | `units entrada.test.ts`; `e2e filtros.spec.ts` |
| Filtro não empilha histórico e volta a cada entrada | `transicoes.ts definirFiltro`, `react.tsx` | `units transicoes.test.ts`; `e2e filtros.spec.ts` |
| Reload restaura a entrada | `entrada.ts` no estado do roteador | `e2e filtros.spec.ts`, `rolagem-foco.spec.ts` |
| Rolagem e foco restauram **depois** da carga, alvo ausente → título | `restauracao.ts`, `react.tsx useRolagemEFoco` | `units restauracao.test.ts`; `e2e rolagem-foco.spec.ts` |
| Sair da rota cancela a restauração pendente (resposta tarde não mexe na tela nova) | `restauracao.ts` (`AbortSignal`), `react.tsx` | `units restauracao.test.ts`; `e2e rolagem-foco.spec.ts` |
| Identidade da entrada é estável: re-render não reinicia restauração | `entrada.ts` (`CHAVE_SEM_REGISTRO`, `temEntrada`), `react.tsx materializarEntrada` | `units entrada.test.ts`; `e2e rolagem-foco.spec.ts` |
| Voltar fecha diálogo, folha e menu antes de trocar de rota | `transicoes.ts voltar`, `Sobreposicoes.tsx` (Radix Dialog) | `units transicoes.test.ts`; `e2e sobreposicoes.spec.ts` |
| Fechamento por Escape/clique/Fechar devolve o foco e não deixa entrada fantasma | `react.tsx abrir/fecharSobreposicao`, Radix | `e2e sobreposicoes.spec.ts` |
| Link direto de detalhe foca o título; Voltar usa o pai sem sair do app | `transicoes.ts voltar`, `react.tsx` | `e2e link-direto.spec.ts` |
| Parâmetro Unicode/espaço codifica e recarrega | `rotas.ts caminhoComParametros`, roteador | `units rotas.test.ts`; `e2e link-direto.spec.ts`, `rotas.spec.ts` |

## Esclarecimentos de contrato (revisão do coordenador)

- **Voltar atrás de sobreposição modal não se testa.** APP-002 foi clarificado: quem fecha
  é o Voltar real do navegador/sistema, e a decisão pura do handler está no unitário
  (`transicoes.test.ts`). O e2e com `dispatchEvent`/`force` para alcançar a barra atrás do
  modal foi **removido**, e a sobreposição passou a ser modal de verdade (Radix Dialog):
  fundo inerte, foco contido e devolvido. Não se testa clique em conteúdo inerte, e a
  navegação com sobreposição aberta partiria de ação alcançável dentro dela (o conteúdo é
  provisório nesta onda, então o caso não é medido aqui).
- **`/app/mercado` é endereço próprio**, com Desapegos selecionado — não redireciona. O
  redirecionamento inicial era escolha do produtor; a rota própria é o que o contrato pede
  ("rota adicional com suas sub-abas") e o que mantém a pilha de Voltar/Avançar previsível.
- **`/app` e `/app/` chegam ao mesmo Início.** O host estático publica o app em `/app/`; o
  apelido de `vite.config.ts` redireciona `/app` (com a consulta que vier) para `/app/` no
  dev e no preview, para que o endereço que o ADR §8 publica não caia na sugestão do host
  ("did you mean /app/"). `rotas.spec.ts` mede os dois endereços, nos três tamanhos, com
  URL, título, casca, aba e foco — o caso negativo de `/app` sem barra veio antes do reparo.
- **Rolagem medida com gesto real.** A rolagem por script não dispara evento de `scroll`
  neste Chromium sem tela; a bateria rola com a roda do mouse e espera os quadros do
  navegador. Nada de espelho de estado do app nem de `history.state` no instrumento.
- **Sem instrumento temporário.** O arquivo de diagnóstico (`_debug.spec.ts`), que lia o
  histórico, foi removido; a depuração passa a usar falha visível de URL/rolagem/foco.

## Pendências registradas (não entregues nesta onda)

- **Título condicionado do catálogo legado.** No protótipo, a rota `catalogo` tem título
  condicionado: "Imóveis" quando `catalogKind()==='imovel'` e "Desapegos" caso contrário
  (`inventario.md` §1, rota 7; `prototypes/bivaque-html/src/features/listings/catalog.js:13`). Esta onda desenha o
  título fixo "Desapegos" para `/app/catalogo` — nav, endereço e casca corretos, sem
  conteúdo — e **não** é o equivalente completo do título legado. O título condicionado fica
  para a tela de catálogo da onda 5 (Mercado); nenhum conteúdo de catálogo é implementado agora.

## Provas executadas nesta entrega

- `npx pnpm@11.18.0 --filter @bivaque/app test` — 38 unitários, 5 arquivos, verde.
- `npx pnpm@11.18.0 --filter @bivaque/app typecheck` — verde (inclui `tests/` e a config de e2e).
- `npx pnpm@11.18.0 --filter @bivaque/app build` — verde.
- `npx pnpm@11.18.0 --filter @bivaque/app test:e2e` — **288 passou, 0 falhou** (96 testes ×
  375/768/1440), contra o build desta revisão, servido por `vite preview` na porta 3200.
- Lote APP-006 (achados do julgamento): o caso negativo de `/app` sem barra foi escrito
  antes do reparo e falhou como esperado (3 falhas, uma por tamanho, em `rotas.spec.ts`);
  com o apelido de `vite.config.ts` e a carga ativa registrada no commit, a bateria inteira
  ficou **291 passou, 0 falhou** (97 testes × 375/768/1440), preservando os 288 anteriores.

O executor roda o gate da etapa; Codex repete as provas uma vez para julgamento.
Banco não faz parte da 1b. Capturas comparadas e aceite visual da onda 1 aguardam a 1e.
