# Handoff — 2026-09-22 — fechamento do DS-006 e paginação do feed em curso

Sessão anterior: Claude Opus 5 como **coordenador**; a execução foi do DeepSeek V4.1 Flash no
DeepSeek Harness. Este documento é autossuficiente: o material de apoio em `.visual/` é
gitignored e só existe na máquina que rodou a sessão.

Leia "Armadilhas confirmadas" antes de rodar qualquer comando.

## Onde está o trabalho

| Item | Valor |
|---|---|
| Checkout | `C:\Users\juana\.codex\worktrees\auditoria-producao-inicio\bivaque-community` |
| Branch | `audit/producao-inicio-2026-09-19` — **nunca publicado** (sem upstream) |
| HEAD de trabalho | `6e463b75` (commit `wip`, ver abaixo) |
| Dev server | `:3210`, subido pelo DeepSeek às 08:15 de 22/09. Portas 3000, 3080 e 3100 são de outras sessões |
| Árvore | limpa, exceto `apps/web/next-env.d.ts` — **não commitar**, ver armadilha 1 |

## 1. DS-006 — encerrado

Card `PROD-INICIO-UX-20260919`: **10 de 15**, zero bloqueadores (eram dois). Adjudicação visual
**r6: PASS** contra a revisão congelada `82fb64a` — sete dimensões em 4, sem média; zero alvo
abaixo de 44 px e zero overflow nos três viewports. Registro do veredicto em `f4df3b0`.

Itens abertos, com a causa real:

- **[1] Compositor** — provado em 375×568, 667 e 812 por hit-test. Falta **safe area** e
  **teclado virtual**, que só se medem em aparelho real.
- **[3] Variantes implantadas do card** — depende de evidência de produção. O relato do dono
  (20/09) não foi reproduzido porque a conta de auditoria estava vazia.
- **[10] Home sem comunidade** — estado vazio e saída ("Ver comunidades") provados. Falta
  "não contradizer a política de feed municipal": o compositor oferecia "Toda a cidade ·
  Brasília" e o grupo "Corrida" a quem não tem comunidade aprovada.
- **[12] e [13]** — estados vazios de Recentes/Acompanhando e cidade no cabeçalho compacto.
  Nunca entraram em rodada.

Pendência declarada pela r6: o e2e rodou 35 min contra `:3210` e foi morto. **Não há e2e verde
medido desde `82fb64a`.** A não-regressão ali é argumento estrutural (só comentários mudaram).

## 2. FEED-PAGINACAO-CURSOR — em curso, parado no meio

Origem: achado A1 da r6 — a Home a 1440 carregava 372 cartões e ~130.000 px de rolagem, porque
`public.feed_community` não tinha limite nem cursor e rodava quatro subconsultas por post.
Decisão em `docs/decisions/ADR-20260922-feed-paginado-por-cursor.md`.

### Rodada 1 — banco: commitada, conferida pelo coordenador

Commits `1bfbf612` (migration + pgTAP), `9a56d5ef` (fixtures em `now()`), `f4ef54e4` (tipos).

Conferido **lendo o SQL e comparando o pgTAP**, sem verificador independente ainda:

- assinatura `(p_community_id, p_order, p_before_created_at, p_before_id, p_limit default 20)`;
- teto aplicado pelo servidor: `least(greatest(coalesce(p_limit,20),1), private.feed_community_max_limit())`, máximo 50;
- assinatura antiga `(uuid, text)` apagada na mesma migration;
- `security definer`, checagem `am_member`, `grant execute` só a `authenticated`;
- pgTAP completo: **conjunto de vermelhos idêntico** à linha de base (armadilha 4); os quatro
  arquivos que chamam o feed e o pgTAP novo estão verdes;
- `database.generated.ts` sem schema `private`.

### Rodada 2 — tela: NÃO verificada

O implementador falhou **duas vezes** sem terminar nem relatar. O trabalho sobrevivente
(15 arquivos) está no commit `6e463b75 wip(feed): ...`. **Só está provado que compila.** A
alegação do implementador de "e2e 6/6 em 34,1 s" não foi reproduzida por ninguém.

Leitura do coordenador (não é verificação):

- `tests/e2e/two-localities.spec.ts` preserva a intenção: pagina até o marcador e mantém o
  `toBeVisible` final; 19 `expect` antes e depois;
- lógica do cursor isolada em `apps/web/lib/feed/`, com 14 casos em `tests/unit/feed/`;
- `data-post-id` no cartão só para o e2e contar ids;
- `tests/e2e/feed-pagination.playwright.config.ts` é resíduo de execução local e **deve sair**.

### Próximos passos, nesta ordem

1. **Se continuar pelo DeepSeek Harness:** a aba perdeu a autenticação (401). Reabrir a URL
   impressa pelo `dsh web`. O processo do harness é o mesmo desde 18/09.
2. **Verificar o WIP:** gate completo; `tests/unit/feed`; e2e `feed-pagination`,
   `two-localities` e `inicio-phone-typography`.
3. **Descobrir por que o e2e travava.** Hipótese a medir, não a aceitar: o feed sem limite
   abrindo 372 cartões em cada teste. Tempo antes e depois vira prova.
4. Remover `tests/e2e/feed-pagination.playwright.config.ts` (ou mover para `.visual/`).
5. **Substituir o commit `wip`** por commits convencionais (`feat`/`test`). O branch nunca foi
   publicado, então reescrever localmente é seguro. `wip` não é tipo convencional.
6. **Verificador independente** — novo, somente leitura, contexto limpo, sem a justificativa do
   implementador: roda pgTAP **antes** de qualquer captura visual (armadilha 2), e2e, mutação, e
   remede a altura da Home a 1440.
7. **Congelamento declarado** com hash, e adjudicação visual das superfícies tocadas (Home,
   `/community`, detalhe da comunidade): sete dimensões ≥ 4, sem média, mais os invariantes.
   O único commit permitido depois é o registro do veredicto. Se reprovar, parar e relatar.
8. Marcar os itens do card `FEED-PAGINACAO-CURSOR` só com prova registrada.

## 3. Decisões do dono vigentes — não reabrir

- **Publicações são "Fazer uma pergunta" e "Pedir uma indicação".** Não existe enquete, e o
  formato não é escolha primária (prancha 44, painel 1).
- **"Ajudou a resolver"** é o rótulo do produto (ADR-20260909). A prancha 80 desenha "Resolveu
  meu pedido": divergência registrada e resolvida a favor do ADR, não decisão em aberto.
- **ADR-20260921:** o Guia é alimentado por job agendado; o membro não vê maquinaria de
  curadoria. O corpo das respostas não é sigiloso.
- **ADR-20260922:** Recentes paginado por cursor; Relevantes é lista limitada. A forma e a
  recusa dos 30 dias são do dono; 7 dias, 20 posts e mínimo de 1 comentário são parâmetros
  reversíveis do coordenador.
- **Ambiente de DOM para testes (jsdom):** o dono adiou. Fora de escopo até ele trazer.

Preferências de trabalho do dono: coordenar até o fim sem levar cada passo a ele; verificar
**automaticamente**, sem esperar ser pedido; decisões reversíveis são do agente.

## 4. Armadilhas confirmadas nesta sessão

1. **`next-env.d.ts`** — o dev server troca `./.next/types/` por `./.next/dev/types/`. Commitar
   essa versão quebra o typecheck da CI, que roda antes do build. Nunca `git add -A`.
2. **Perfil fantasma "Visual Capture"** — captura visual insere um perfil no banco e quebra
   seis asserts de pgTAP. Rodar pgTAP antes de qualquer captura.
3. **`.next/dev/types/` corrompido** por escrita parcial do dev server dá typecheck vermelho
   falso (`routes.d.ts` com linha órfã). Apagar o diretório inteiro e rodar de novo.
4. **Resíduo no pgTAP local** — 19 arquivos vermelhos pré-existentes. Comparar o **conjunto**,
   arquivo a arquivo e contagem a contagem, nunca só o total. Linha de base (falhas/testes):
   `account-deletion-possession 1/11`, `arrival-guide 1/5`, `authz-allowed-matrix 3/29`,
   `authz-denied-matrix 1/21`, `community-feed-happy-path 2/18`, `event-completion 1/4`,
   `events-rsvp 4/18`, `family-invite-locality 0/0`, `full-regression 4/85`,
   `groups-public-private 1/26`, `listing-alerts 9/38`, `locality-profile-access 1/5`,
   `outbox-worker 1/9`, `recommendations-scope 4/19`, `reports-denials 1/16`,
   `reports-resolution 1/11`, `service-request-cancelled-notice 2/8`,
   `user-group-interests 1/8`, `verification-reconcile 2/13`. A CI roda com banco limpo.
5. **BOM em mensagem de commit** — o único detector confiável lê os bytes da primeira linha da
   **mensagem** no objeto do commit (o BOM fica depois do cabeçalho, perto do offset 254).
   `git log --format=%s`, `Select-String` e o offset 0 dão falso negativo.
6. **Sonda ou spec avulso em `tests/e2e/`** — o Playwright casa `*.spec.ts` por glob e roda
   junto dos reais. Sondas vão para `.visual/`.
7. **Painel do harness mostra "rodando" parado.** Atividade real se mede por mtime em disco e
   por commit. O DeepSeek costuma parar depois de relatar; precisa de instrução explícita de
   seguir.
8. **Timeout de CDP ao digitar no harness** — o texto quase sempre entra mesmo assim. Conferir
   a caixa antes de reenviar, para não despachar em dobro.
9. **grep não lê PNG.** Afirmação sobre o conteúdo de uma prancha exige abrir a imagem.
10. **Nomear um arquivo em vez da classe** deixou o defeito sobreviver três vezes nesta
    sessão. Mandato de correção varre a classe inteira.
11. **Harness sem autenticação** — recarregar a aba dá 401. Reabrir a URL do `dsh web`; não
    contornar.

## 5. Backlog registrado, não despachado

- **r6 A6** — parada de Tab duplicada na lateral a 768 px: 14 paradas para 7 itens
  (`div role=button tabindex=0` embrulhando o link). Concreto e pequeno.
- **r6 A3** — `h1` "Indicações" e `h2` "Perguntar à comunidade" com o mesmo 24 px/600 em
  `/recommendations`: o ponto mais contestável de Hierarquia.
- **r6 A4, A5, A7, A8** — duas lupas iguais na busca do cabeçalho; selo "Ctrl + B" cobrindo o
  trilho de `/guide` a 1440; `aria-invalid` nunca `true`; "Rascunho salvo" da prancha 45
  painel 3 inexistente.
- Botão de fechar do **toast** em inglês — limitação do template do fornecedor.
- **GUIA-RESPOSTA-CANDIDATA:** P3a entregue. **P3b** (endpoint interno + ligação dos módulos
  de IA) depende de o dono configurar `DEEPSEEK_API_KEY` e os segredos no Vault, exige alterar
  `tests/unit/guide/deepseek-disconnected.test.ts` citando o ADR, e tem uma decisão pendente:
  um marcador de "já tentado" para respostas cujo lugar já está no Guia. **P3c** é a tela do
  operador.

## 6. Material local (só nesta máquina)

`.visual/ds-006-cycle/` — `STATE.md` do ciclo, pareceres (`verify-p3a/`,
`verify-comportamento/`, `verify-visual-r5/`, `verify-visual-r6/RELATORIO-R6.md`) e os
instrumentos de mutação em `comportamento/`. `.visual/feed-paginacao/` — linha de base do e2e
e saída do pgTAP da rodada 1.
