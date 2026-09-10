# Execução das pranchas web restantes — manual do OpenCode

> Escrito em 09/09/2026 para o OpenCode executar sozinho, lote a lote, até as 31 pranchas web
> estarem desenhadas com o backend que elas exigem. Autoridade: a
> [especificação funcional web de 08/09](../superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md),
> a [seção 0 do processo](../design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md#0-execução-enxuta-das-pranchas-web--08092026)
> e as regras técnicas do `AGENTS.md`.

## O que este documento resolve

A entrega anterior falhou de um jeito específico, registrado no
[handoff de 09/09](HANDOFF-2026-09-09-fidelidade-pranchas.md): **os contratos diziam "segue a
composição da prancha X" e ninguém abriu a imagem.** A auditoria visual não mede fidelidade —
mede alvo de toque, contraste, transbordo e hierarquia. Ninguém mediu o resto.

Três peças fecham esse buraco, e são o que existe agora:

| Peça | O que faz |
|---|---|
| [`PRANCHAS-WEB-RESTANTES.md`](PRANCHAS-WEB-RESTANTES.md) | Leitura elemento a elemento de cada prancha restante, feita **olhando o PNG**. É contra esta lista que a tela é conferida. Inclui 51, 57 e 58, lidas para conferir as afirmações que o handoff fez sobre elas. |
| `docs/agents/tasks/RECON-018` a `RECON-035` | Um contrato por lote, com rota, prancha, backend, cerca e prova. Validados por `node scripts/agents/task-contract.mjs`. |
| `scripts/agents/prancha-coverage.mjs` | Recusa esquecer prancha: confronta o manifesto com os contratos e falha se alguma prancha web ficar sem dono. Travado por `tests/scope/prancha-coverage.test.mjs`, que também exige que todo contrato posterior ao handoff cite a leitura, e não só a imagem. |

## Os sete contratos técnicos — aprovados em 09/09/2026

O dono aprovou os ADRs de 09/09 na sessão que os redigiu. **Os dezoito lotes estão liberados
para execução**; nenhum espera decisão técnica.

| ADR | Governa |
|---|---|
| [`ADR-20260909-midia-de-membro`](../decisions/ADR-20260909-midia-de-membro.md) | fotos de anúncio, imóvel, comunidade e publicação |
| [`ADR-20260909-anuncios-mercado-e-moradia`](../decisions/ADR-20260909-anuncios-mercado-e-moradia.md) | RECON-025 a RECON-028 |
| [`ADR-20260909-pedidos-e-conversa-contextual`](../decisions/ADR-20260909-pedidos-e-conversa-contextual.md) | RECON-022, 023, 024, 029 |
| [`ADR-20260909-guia-artigo-estruturado`](../decisions/ADR-20260909-guia-artigo-estruturado.md) | RECON-030 |
| [`ADR-20260909-canais-de-notificacao`](../decisions/ADR-20260909-canais-de-notificacao.md) | RECON-031 e a entrega do RECON-028 |
| [`ADR-20260909-perfil-bio`](../decisions/ADR-20260909-perfil-bio.md) | RECON-020 |
| [`ADR-20260909-resposta-que-resolveu`](../decisions/ADR-20260909-resposta-que-resolveu.md) | RECON-035 |

Aprovação não é revisão. **Nenhum crítico adversarial leu esses ADRs** — a revisão independente
continua exigida por lote, sobre o diff que implementa cada decisão. E ADR aprovado não é
licença para ampliar: o que está fora do texto de cada decisão continua fora.

As duas decisões de produto que faltavam foram tomadas em 09/09 e já estão nos contratos:

- **A prancha 43 vence** no pedido pendente: o rail "Sobre a comunidade" aparece com Membros,
  Criada em e Local. A regra do RECON-009 foi revisada; o que continua fechado é o roster —
  lista de participantes, avatares e perfis. Implementação no RECON-033.
- **Da prancha 15, só o marcador da resposta que resolveu entra** (RECON-035). As curtidas
  ficam fora, com a divergência declarada no relatório do RECON-033.
- **`BLOCK-LEGAL-AI`** continua sendo bloqueio externo real, e não é decisão de tela: fornecedor
  e governança do reconhecimento automático do documento. O RECON-019 entrega armazenamento,
  versionamento, substituição e situação; a transição que depende do reconhecimento fica
  declarada pendente.

## A fila

Ordem por dependência real, não por burocracia. Um lote não espera o anterior quando as
dependências dele já existem — a coluna **Depende de** é a única fila que vale.

| Lote | Pranchas | Rotas | Depende de |
|---|---|---|---|
| RECON-018 | 36, 37 | `/login`, `/signup`, `/auth/confirmar-email`, `/auth/callback-error`, `/recuperar-senha`, `/nova-senha` | nada |
| RECON-019 | 38, 69 | `/onboarding`, `/onboarding/documento`, `/onboarding/status` | nada; a parte de IA fica em `BLOCK-LEGAL-AI` |
| RECON-020 | 39, 51 | `/onboarding/locality`, `/onboarding/perfil`, `/onboarding/welcome`, bio em `/profile` | nada |
| RECON-021 | 61 | busca do cabeçalho, `/explorar/busca`, `/explorar/servicos` | nada |
| RECON-022 | 62 | `/prestadores/[id]`, `/pedidos/novo` | nada |
| RECON-023 | 17 | `/pedidos`, `/pedidos/[id]` | RECON-022 |
| RECON-024 | 23 | `/prestador`, `/prestador/pedidos/[id]`, `/prestador/atendimento`, `/prestador/conta` | RECON-022 |
| RECON-025 | 13, 63 | `/mercado`, `/mercado/[id]`, `/mercado/novo` | RECON-022, que cria a conversa de contexto usada pelo interesse |
| RECON-026 | 21, 64 | `/meus-anuncios`, `/mercado/[id]/editar` | RECON-025 |
| RECON-027 | 65 (painel 1), 19 | `/imoveis`, `/imoveis/[id]`, `/imoveis/novo`, `/imoveis/[id]/editar` | RECON-025 |
| RECON-028 | 65 (painel 2) | `/imoveis/alertas` + job de entrega | RECON-027 e RECON-031, que cria a matriz de canal |
| RECON-029 | 67 | `/events/[id]/perguntas`, `/events/novo`, `/events/[id]/editar` | RECON-022, que cria a conversa de contexto |
| RECON-030 | 25 | `/guide/[id]` (reescrita), `/guide/[id]/correcao`, `/guide-queue/[id]` | nada |
| RECON-031 | 52, 56 (painel 2) | `/configuracoes/{notificacoes,conta,familia,bloqueados}` | nada |
| RECON-032 | 54, 56 (painel 1) | `/salvos`, `/denuncias`, `/denuncias/nova`, `/denuncias/[id]`, `/messages/[id]`, `/ajuda` | nada além do que existe |
| RECON-033 | 45, 15, 56, 60, 57, 58 | reconciliação de fidelidade das telas já entregues | nada |
| RECON-034 | 43, 42 | faixa e miniatura da comunidade | nada |
| RECON-035 | 15 | marcador da resposta que resolveu, em `/publicacoes/[id]` | nada |

RECON-033 é o lote que fecha as quatro comparações que o handoff deixou pendentes (45, 15, 56,
60) e as regressões das telas de operação. **Ele não espera nenhum outro** — e é o melhor lugar
para começar, porque devolve ao operador o caminho de volta que hoje não existe.

Dez lotes não dependem de nada e podem rodar em qualquer ordem: RECON-018, 019, 020, 021,
030, 031, 032, 033, 034 e 035. As dependências que sobram são de código, não de decisão.

RECON-034 saiu de dentro do RECON-033 porque imagem de comunidade exige migration e bucket, e
não podia arrastar a reconciliação inteira junto.

## O laço, por lote

Um lote por vez, num checkout por executor. Não iniciar cópia do executor enquanto o anterior
escreve.

1. **Ler** o contrato do lote, a seção correspondente de `PRANCHAS-WEB-RESTANTES.md` e **abrir
   o PNG**. Se o modelo não vê imagem, usar a leitura — e dizer no relatório que usou a leitura.
2. **Medir o baseline.** O contrato traz um `baseline` escrito em 09/09 contra
   `codex/ajuste-de-auditoria`. Confirmar o SHA atual e o que já existe antes de escrever.
   Reconciliar, nunca apagar trabalho de outra sessão.
3. **Implementar com o backend junto.** Migration, policy, tipos, tela e teste na mesma unidade.
   *Falta de coluna não autoriza omitir elemento da prancha.*
4. **Validar durante a edição:** `gate --fast` e os testes afetados. Não rodar a suíte inteira a
   cada ajuste de CSS.
5. **Comparar com a prancha.** Capturar as rotas tocadas nos três viewports e percorrer a lista
   de **Composição** item a item. Escrever a lista de divergências — inclusive as que ficarem.
6. **Fechar o lote:** `node scripts/agents/task-contract.mjs <contrato>`, `gate` completo,
   `build`, os testes de fluxo, falha e acesso negado, e o pgTAP positivo e negativo quando
   houver banco.
7. **Atualizar o card** correspondente no quadro (`node tools/backend-kanban/src/board.mjs
   --search <termos>`), com evidência e pendência, e regenerar o resumo.
8. **Commitar** por lote, convencional, com implementação, testes e transição do quadro juntos.

## Prova de banco, na ordem certa

```sh
npx pnpm@11.18.0 exec supabase start
npx pnpm@11.18.0 exec supabase migration new <nome>
# escrever a migration: coluna/tabela E as policies que a leem, na MESMA migration
npx pnpm@11.18.0 db:reset          # sem seed, sem dev server, sem captura rodando
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 db:lint
npx supabase gen types --lang typescript --local --schema public > supabase/database.generated.ts
```

Nunca `--linked`. Nunca editar migration aplicada. **Nunca rodar dev server ou captura visual
entre `db:reset` e `test:db`** — a captura insere um perfil "Visual Capture" e seis asserções
de pgTAP quebram parecendo regressão real.

## Armadilhas confirmadas — conferir antes de culpar o próprio diff

Todas medidas na sessão de 08–09/09 e registradas no handoff.

1. **A captura visual mente sem credenciais.** Sem `BIVAQUE_VISUAL_EMAIL` /
   `BIVAQUE_VISUAL_PASSWORD` ela cai para deslogado **em silêncio** e reporta
   `ITERATION COMPLETE` com zero achados, tendo fotografado a tela de login.
   **Conferir sempre `Authenticated capture: yes` na segunda linha do `report.md`.**
2. **O worktree precisa de quatro variáveis, não duas:** `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Sem as duas
   últimas, sete rotas `(admin)` e `(provider)` devolvem erro de servidor e a auditoria reporta
   o botão "Reload" do Next como defeito de alvo de toque.
3. **O loop deixa o servidor vivo na `:3000`.** Matar a porta antes de cada execução.
4. **A conta `visual@` não é operadora.** Para `/admissions` e `/reports`:
   `BIVAQUE_VISUAL_EMAIL=operador@bivaque.example.invalid` e `BIVAQUE_VISUAL_ROUTE=/admissions`,
   com `MSYS_NO_PATHCONV=1` no Git Bash — senão a rota vira caminho do Windows.
5. **Senha do seed:** `bivaque-e2e-local`.
6. **`gate` pula o `build` sem o arquivo de ambiente local, e diz que pulou.** Verde sem build
   não prova que compila.
7. **`dev-server.pid` / `dev-server.log` obsoletos** fazem o loop se ligar a um servidor que não
   existe. Apagar e tentar de novo antes de atribuir a falha ao código.
8. **Rota nova não é capturada se não estiver cadastrada** em `scripts/visual/capture.mjs`.
   Cada lote que cria rota **acrescenta o path e a fixture** — e confere que a captura não
   terminou em login ou 403.

Captura direcionada, com servidor de pé e conta do papel correto:

```powershell
$env:BIVAQUE_VISUAL_ROUTE = "/mercado"
try { node scripts/visual/capture.mjs } finally { Remove-Item Env:BIVAQUE_VISUAL_ROUTE }
```

## O que fecha um lote

Um lote fecha quando **todas** valem:

- cada item da **Composição** da prancha está na tela, ou tem divergência registrada com motivo
  aceito pela regra do dono;
- as correções obrigatórias da `reviewNote` foram aplicadas;
- toda ação tem efeito real: nenhum `href="#"`, handler vazio, toast como única implementação
  ou "em construção";
- os estados da §3.3 aplicáveis estão fechados, e os não aplicáveis estão declarados;
- cada mutação foi testada com ator permitido **e** com ator não permitido, inclusive por
  chamada direta sem UI;
- `gate` completo verde no candidato estável, `build` verde, pgTAP positivo e negativo quando
  houver banco;
- captura em 375/768/1440 das rotas tocadas, com o papel certo e `Authenticated capture: yes`;
- o card do quadro atualizado com evidência e pendência.

`retry_budget` é 3 por contrato. **Esgotar nunca vira PASS** — vira `FAIL`, `BLOCKED` ou
`HUMAN_DECISION`, com diagnóstico.

## O que entregar ao revisor

Quando o lote fecha, o relatório tem seis linhas e nenhuma a mais:

```text
Lote:        RECON-0NN — <pranchas> — <rotas>
Revisão:     <SHA> em <branch>
Backend:     <migrations criadas, ou "nenhuma">
Provas:      <comandos executados e o que cada um disse>
Divergências: <itens da Composição que ficaram fora, e por quê>
Pendência:   <o que impede fechar, ou "nenhuma">
```

Quem implementou **não** revisa e **não** adjudica a própria evidência. O revisor recebe
contrato, prancha e diff — nunca a defesa do implementador antes do primeiro parecer.

Relatório do próprio modelo não é verificação independente. Se não houver sessão independente,
o estado é "implementado; revisão pendente" — não é concluído.
