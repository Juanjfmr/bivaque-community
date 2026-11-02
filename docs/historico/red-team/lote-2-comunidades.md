# Lote 2 — Comunidades (RT-17..23)

Varredura feita em 2026-08-10 contra `apps/web/app` + Camada 0. Este é um
domínio especial: a entidade **Comunidade** existe no banco, mas a superfície
de produto não existe. Logo, os cenários RT-17..23 viram uma decisão
arquitetural antes de virarem bugs de tela.

---

## Contexto do domínio

Na Camada 0, **Comunidade** é uma entidade intermediária entre Localidade e
Grupo: metadata descobrível por membros da localidade, memberships com
`pending/approved`, papéis `member/moderator/owner`, feeds próprios
`feed_community`, grupos internos e cascata de memberships de grupo ao sair
da comunidade. Ver `camada-0-contratos.md` C5 e C7.

No app atual, não há rota ou componente dedicado:

- `glob apps/web/app/**/{*commun*,*comun*,*community*}*` → nenhum arquivo.
- `glob apps/web/app/components/bivaque/**/{*commun*,*comun*,*community*}*` → nenhum arquivo.
- O único `/community` é o feed da localidade Manaus:
  `apps/web/app/(shell)/community/page.tsx:55-58` chama
  `supabase.rpc("feed_posts", { p_locality_id: PILOT_LOCALITY_ID, p_order })`.
- Não há uso de `feed_community` em `apps/web`; `grep` encontrou apenas
  `feed_posts` em `/community` e `feed_group` em `/groups/[id]`.

---

## Cenários

| RT | Pergunta | Estado atual |
|---|---|---|
| RT-17 — descobrir comunidade | Usuário descobre vilas/turmas/comunidades? | Não há rota/lista/seletor. |
| RT-18 — solicitar entrada | Usuário pede entrada em comunidade? | RPC existe no banco; não há UI. |
| RT-19 — aprovação | Moderador aprova entrada? | RPC existe no banco; não há UI. |
| RT-20 — feed agregado | Usuário vê feed da comunidade? | `feed_community` existe; não há chamada no app. |
| RT-21 — navegar Comunidade → Grupo | Há breadcrumb/contexto de grupo dentro da comunidade? | Não há nível Comunidade na navegação. |
| RT-22 — sair / ser removido | Usuário sai de comunidade? | RPC existe; não há UI. |
| RT-23 — ownership/moderação | Owner/moderator de comunidade operam? | RPCs existem; sem superfície. |

---

## Findings do domínio

### F150 · Entidade Comunidade existe no banco, mas não existe no produto — P1 · SPLIT/MERGE · Balde B

- **Promessa/estrutura:** migrations criaram `communities`,
  `community_memberships`, `feed_community`, grupos/eventos/posts escopáveis
  por `community_id` e RPCs de request/approve/remove/transfer.
- **Comportamento:** o app não tem rota, seletor, lista, página de detalhe,
  feed, solicitação, aprovação, saída ou moderação de comunidade.
- **Evidência:** Camada 0 C5/C7; `community/page.tsx:55-58` usa
  `feed_posts` com `PILOT_LOCALITY_ID`; glob de `apps/web/app/**` não
  encontrou arquivos `commun*`/`comun*`/`community*` além da rota legada
  `/community`.
- **Veredicto:** SPLIT/MERGE antes de implementar. Ou Comunidade vira entidade
  de produto com superfície própria, ou o conceito deve ser absorvido por
  Grupo/Localidade para não manter uma camada invisível.
- **Decisão (você):** Comunidade é entidade necessária ou complicação do
  conceito de grupo?

### F151 · A palavra "Comunidade" significa duas coisas diferentes — P1 · MODIFY · Balde B

- **Promessa mental:** no app, "Comunidade" é a cidade/localidade Manaus
  (`/community`, bottom-nav "Minha comunidade"). No banco, `communities` é
  uma subdivisão opcional dentro da localidade.
- **Comportamento:** a UI usa "comunidade" genericamente para Manaus, grupos,
  eventos e recomendações, sem distinguir Localidade × Comunidade × Grupo.
- **Evidência:** `components/bivaque/bottom-nav.tsx:34-37` (`id:
  "community", label: "Minha comunidade", href: "/community"`);
  `community/page.tsx:223` (`Manaus, AM`); `groups/page.tsx:508,574,600`;
  `recommendations/page.tsx:431,484,599`; `events/page.tsx:374,429,468`.
- **Impacto:** quando a UI de Comunidade real for criada, o vocabulário já
  estará ocupado. Usuário não terá modelo mental estável.
- **Veredicto:** MODIFY a taxonomia antes da superfície. Sugestão: reservar
  "Manaus"/"Bivaque Manaus" para localidade, "Comunidade" para entidade
  intermediária, e "Grupo" para grupos.

### F152 · Conteúdo escopado por comunidade é inalcançável no app — P1 · MODIFY · Balde B

- **Contrato:** `feed_community` existe e o feed da cidade exclui conteúdo de
  comunidade (Camada 0 C7). Logo, conteúdo `community_id` deve viver fora do
  feed geral.
- **Comportamento:** nenhum caminho do app chama `feed_community`; `/community`
  chama só `feed_posts(PILOT_LOCALITY_ID)`; `/groups/[id]` chama `feed_group`.
- **Evidência:** `community/page.tsx:55-58`; `groups/[id]/page.tsx:145`;
  grep em `apps/web` encontrou `feed_community` em 0 arquivos.
- **Impacto:** se algum post/evento for criado com `community_id`, ele fica
  protegido corretamente pelo banco, mas sem superfície de descoberta/leitura
  no app.
- **Veredicto:** MODIFY se Comunidade continuar existindo; caso contrário,
  remover/evitar criação de escopo `community_id` até a superfície existir.

### F153 · Membership e moderação de comunidade existem só como operação invisível — P1 · MODIFY · Balde B

- **Contrato:** membership de comunidade tem `pending/approved`, roles
  `member/moderator/owner`, RPCs de request/approve/remove/transfer, e cascata
  sobre grupos internos (Camada 0 C5).
- **Comportamento:** não há UI para request, approval, leave, remove,
  transfer ownership ou moderação de comunidade.
- **Evidência:** ausência de rotas/componentes `commun*`/`community*` em
  `apps/web/app`; Camada 0 C5 cita `20260805215419_community_rpcs.sql:7-229`.
- **Impacto:** operador/agente pode criar estado no banco que nenhum usuário
  consegue entender ou operar. Isso é o mesmo padrão recorrente do MAP:
  capacidade existe, superfície não.
- **Veredicto:** MODIFY se a entidade continuar; caso contrário, não criar
  comunidade em produção/piloto.

### F154 · Comunidade reabre a semântica de perfil oculto sem explicar ao usuário — P1 · MODIFY · Balde B

- **Contrato:** co-membro aprovado de comunidade vê perfil `hidden` (Camada 0
  C3; Finding F14).
- **Comportamento:** como a UI de Comunidade não existe, o usuário não tem
  como entender que entrar numa comunidade altera quem consegue ver seu
  perfil oculto.
- **Impacto:** mesmo que a policy seja deliberada, hoje ela é mentalmente
  invisível. Isso transforma uma regra de privacidade em surpresa.
- **Veredicto:** depende da decisão F14. Se `hidden` continuar exposto a
  co-membros, a superfície de comunidade precisa avisar isso no momento de
  entrar/solicitar entrada.

### F155 · Grupos podem ser internos a comunidades, mas a UI não mostra o contêiner — P2 · MODIFY · Balde B

- **Contrato:** grupos podem carregar `community_id`; membership de comunidade
  condiciona membership em grupos internos (Camada 0 C5/C6).
- **Comportamento:** páginas de grupo existem, mas a camada Comunidade não
  aparece na navegação ou breadcrumb; o usuário vê grupos como objetos soltos
  da localidade.
- **Evidência:** ausência de uso de `community_id` em `apps/web/app` (grep de
  `community_id` não encontrou uso em componentes/páginas); `groups/[id]`
  usa `feed_group`, mas sem contexto de comunidade visível.
- **Veredicto:** MODIFY se a entidade continuar; caso contrário, não usar
  grupos internos a comunidade no piloto.

---

## Decisões necessárias

1. **Comunidade permanece como entidade?** Se sim, precisa de superfície
   própria. Se não, congelar ou remover o escopo `community_id` da operação
   de produto.
2. **Taxonomia:** Localidade, Comunidade e Grupo precisam de nomes distintos
   na UI antes de qualquer seletor/chip/breadcrumb.
3. **Privacidade:** resolver F14 antes de lançar qualquer fluxo de entrada em
   comunidade.

## Placar

| Balde | Findings | Ação |
|---|---|---|
| A — correção inequívoca | 0 | — |
| B — decisão do dono | F150, F151, F152, F153, F154, F155 (6) | Decisão arquitetural antes de implementação |
