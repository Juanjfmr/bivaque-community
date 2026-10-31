---
id: ADR-20260919-leitura-nacional-da-cidade
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-19
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
critic_verdict:
critic_review:
---

# Leitura nacional do nível municipal e o seletor de localidade

## Problem

Duas queixas de produção, na revisão publicada (`main`, `90e4c94`):

1. **O membro não consegue consultar outra cidade.** Um militar que sai do Rio
   de férias para Brasília não vê nada de Brasília: `arrival_guide_entries` e
   `events` são liberados por vínculo (`private.is_locality_member`, migrations
   `20260815181708:36` e `20260820060533:39`). A promessa existe na tela — a
   busca escreve *"Buscar em outra cidade: troque a cidade atual em Localidade —
   a busca refaz as três consultas"* — e três telas mandam "Trocar de cidade"
   para `/localidade` (busca vazia, serviços vazio, comunidade de fora).
2. **O membro não consegue mudar a residência.** `profiles` não tem mais campo
   de localidade: o vínculo mora em `locality_memberships` (migration
   `20260817031237`). A única escrita de vínculo no app é o onboarding
   (`lib/onboarding/verifyAndProvision.ts:125`, `provision_member_locality`), uma
   vez. `declare_locality_transfer(destino, prazo)` existe, é
   `security definer` e tem `grant execute … to authenticated`
   (`20260819021416:91-149`) — e **nenhum código a chama**. `/localidade` é uma
   tela de leitura: sem transferência declarada ela renderiza a referência da
   cidade em que a pessoa já está; com transferência, mostra as duas cidades em
   abas. O comentário de `(shell)/inicio/right-rail.tsx:85-87`, que chama a rota
   de "a rota real do declare_locality_transfer", é drift: é comentário, não
   chamada.

O `ADR-20260816-transferencia-e-pertencimento` escolheu a transferência
declarada (alternativa A) e **recusou** a referência nacional (alternativa B),
com um motivo registrado: com B sozinho "ele não conseguiria perguntar nada em
Manaus antes de chegar". B ficou escrito como caminho de recuo.

A autoridade de construção atual afirma o oposto **para leitura**:
`PROCESSO-DE-CONSTRUCAO.md` §3 ("Cidade e comunidade são conceitos distintos.
Selecionar uma cidade para explorar não concede participação em uma comunidade
privada"), §8 ("a busca manual de cidade deve funcionar") e a regra do guia
("A experiência é nacional; cidade de exploração não é autorização de
comunidade"). A D48 já afirma que o nível municipal é **referência, não sala**.

## Decision

Aprovado pelo responsável nesta sessão (19/09/2026). Quatro decisões:

### D1 — O nível municipal vira legível nacionalmente, para membro verificado

Duas superfícies, e só elas:

- **eventos da cidade**: `events` com `community_id is null and group_id is null`;
- **Guia de chegada**: `arrival_guide_entries` da cidade escolhida.

O portão é `private.is_verified_holder(auth.uid())` — verificado, em qualquer
cidade. Não é `anon`. **Ler não é participar:** nenhuma linha de vínculo é
criada, nenhuma vila é concedida, nada é publicável na cidade visitada.

### D2 — O que continua fechado, de propósito

- **posts/feed municipal** — D48: o nível municipal é referência, não sala;
- **RSVP e "quem vai"** (`event_rsvps`) — presença é dado da pessoa, não
  referência da cidade. `private.can_access_event` fica intocado, e é ele que
  gateia os RSVPs (`20260805214709:392-407`);
- **comunidades e grupos** — a leitura nacional não alcança nenhum dos dois;
- **vitrine de prestadores** — o alcance é **declarado pelo próprio prestador**
  em `provider_reach` (`20260825185327:76-120`); abrir nacionalmente
  contradizeria o consentimento dele. Fica como está.

### D3 — O seletor de localidade existe, com dois estados

`/localidade` passa a ter: **busca de cidade** (UF → município, pelo catálogo
que o onboarding já usa em `/api/localities`), **estado de visita** (ler a
cidade escolhida, com aviso de que ali não se participa) e **declaração de
transferência** (mudar a residência). A pill da cidade no cabeçalho do shell
vira a entrada dessa tela — hoje ela é um `<div>` sem link
(`components/bivaque/app-shell.tsx`, `data-testid="shell-locality-pill"`).

### D4 — Mudar residência é a transferência declarada, não uma troca

`declare_locality_transfer(p_destination_locality_id, p_term_date)`: o destino
vira corrente **na hora**; a origem vira vínculo de saída, legível e publicável
até o prazo declarado, depois somente-leitura (`20260820000000:62-107`). A troca
simples — perder a origem no mesmo ato — continua **recusada** (alternativa D do
`ADR-20260816`). A pessoa declara a data; o produto não inventa prazo.

## Consequences

- Alarga o alcance de RLS de **duas** tabelas. As policies novas são
  **aditivas** (permissivas são OR): nenhuma policy existente é editada, e
  `private.can_access_event` não é tocado — por isso o RSVP continua fechado
  enquanto o evento abre.
- O que passa a ser legível é o que a cidade **já publica**: o `CHECK` de
  `events.venue` rejeita endereço residencial e militar (`Rua`, `Avenida`,
  `Quartel General` — `supabase/tests/events-private-venue-denials.sql:20-60`).
- `rls-or-column-regression.test.sql` trava **contagem exata** de policies por
  tabela (`:697` para o guia, `:323` para eventos). A contagem muda junto, no
  mesmo commit, com o motivo escrito — é mudança de contrato deliberada, não
  regressão silenciosa.
- Lançamentos obrigatórios nos dois sentidos: verificado de outra cidade **lê**
  evento e guia; `anon` **não** lê; não-verificado **não** lê; RSVP de evento de
  outra cidade continua **negado**; post municipal de outra cidade continua
  **negado**.
- A visita não pode virar promessa vazia na UI: onde a leitura não estiver
  liberada, a tela diz que não está — nunca lista vazia fingindo "não há nada".

## What this ADR does not decide

- **Mercado e Moradia nacionais.** Segundo lote: cada um tem RLS e privacidade
  próprias (endereço de imóvel, anúncio de pessoa) e não entram por analogia.
- **Perguntar na cidade visitada** (pergunta de evento, pedido de informação).
  A D1 abre leitura; participação continua exigindo vínculo, como o
  `ADR-20260816` decidiu.
- **Cancelar a transferência.** `reverse_locality_transfer` é `service_role`
  (`20260820000000:151`); expor isso ao membro exige server action com o caller
  resolvido no servidor, não um grant novo.
- **Recorte de notificações entre cidades.**

## Approval

Aprovação humana explícita por Juan em **2026-09-19**, nesta sessão, ao
responder as duas perguntas de produto: *"Eu quero as duas coisas, poder mudar
meu local de residência declarando transferência, e uma simples consulta em
outra localidade, por exemplo, um militar que sai do RJ de férias para Brasília,
poderia ver entre outras coisas os eventos da cidade."*

Pela `RISK_MATRIX.md` isto é **R3** (toca RLS e alcance de leitura). O
`critic_verdict` continua vazio até a revisão independente — quem implementa não
adjudica a própria evidência.