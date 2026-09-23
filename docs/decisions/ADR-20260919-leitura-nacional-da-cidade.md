---
id: ADR-20260919-leitura-nacional-da-cidade
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-19
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
supersedes_partially: ADR-20260816-transferencia-e-pertencimento (somente a recusa da leitura nacional; ver "Relação com decisões anteriores")
critic_verdict: pending
critic_review: 2026-09-23 FAIL (2 BLOCKER, 6 MAJOR) — esta revisão responde a cada achado; aguarda nova revisão independente
---

# Leitura nacional do nível municipal e o seletor de localidade

Revisão de 2026-09-23. A versão de 19/09 foi aprovada pelo dono e reprovada pela
revisão independente de 23/09 por não cumprir o contrato: faltava a evidência
mínima R3 e os predicados das policies não estavam escritos. Esta versão fixa o
contrato; a decisão de produto é a mesma. As três escolhas de produto novas desta
revisão (texto livre, artigo do Guia e "Pedir mais informações") foram feitas
pelo dono em 23/09 e estão marcadas como tal.

## Problem

Duas queixas de produção:

1. **O membro não consegue consultar outra cidade.** Um militar que sai do Rio de
   férias para Brasília não vê nada de Brasília: `arrival_guide_entries` e `events`
   são liberados por vínculo (`private.is_locality_member`; policies
   `arrival_guide_select_approved_locality_member` em
   `20260815210000_arrival_guide_curation.sql` e `events_select_locality_member`
   em `20260820060533_fix_events_insert_returning_rls.sql:39-73`). A promessa já
   existe na interface: `CityReference` aceita outra localidade e consulta
   `events.eq("locality_id", viewing.id)`
   (`apps/web/app/components/bivaque/city-reference.tsx:60-68,88-100`), e hoje
   volta vazio porque a RLS nega — lista vazia fingindo "não há nada".
2. **O membro não consegue mudar a residência.** O vínculo mora em
   `locality_memberships`. `declare_locality_transfer(destino, prazo)` existe, é
   `security definer`, tem `grant execute … to authenticated`
   (`20260819021416`) e **nenhum código do app a chama** (só comentários).

## Decision

### D1 — O nível municipal vira legível nacionalmente, para titular verificado

Quatro tabelas ganham **uma policy de SELECT aditiva cada**. Nenhuma policy
existente é editada, renomeada ou removida. `private.can_access_event` não é
tocado. Os predicados são estes, exatamente, e nenhum outro:

```sql
-- events: só o nível cidade
create policy events_select_city_level_verified_holder
on public.events for select to authenticated
using (
  community_id is null
  and group_id is null
  and private.is_verified_holder((select auth.uid()))
);

-- arrival_guide_entries: só o aprovado (a tabela guarda pending/rejected da curadoria)
create policy arrival_guide_select_approved_verified_holder
on public.arrival_guide_entries for select to authenticated
using (
  status = 'approved'
  and private.is_verified_holder((select auth.uid()))
);

-- guide_articles: só publicado, de entrada aprovada (decisão do dono, 23/09)
create policy guide_articles_select_published_verified_holder
on public.guide_articles for select to authenticated
using (
  status = 'published'
  and private.is_verified_holder((select auth.uid()))
  and exists (
    select 1 from public.arrival_guide_entries e
    where e.id = public.guide_articles.entry_id
      and e.status = 'approved'
  )
);

-- guide_article_sections: só de artigo publicado de entrada aprovada
create policy guide_article_sections_select_published_verified_holder
on public.guide_article_sections for select to authenticated
using (
  private.is_verified_holder((select auth.uid()))
  and exists (
    select 1
    from public.guide_articles a
    join public.arrival_guide_entries e on e.id = a.entry_id
    where a.id = public.guide_article_sections.article_id
      and a.status = 'published'
      and e.status = 'approved'
  )
);
```

Regras de escrita das policies:

- `(select auth.uid())`, nunca `auth.uid()` direto (convenção do repositório).
- A policy de `events` **não** faz subconsulta a `events`: foi uma subconsulta
  auto-referente que quebrou `INSERT … RETURNING`
  (`20260820060533_fix_events_insert_returning_rls.sql`).
- As subconsultas das policies do Guia leem `arrival_guide_entries` e
  `guide_articles`, que têm RLS própria. A implementação prova (teste A13/B8
  abaixo) que isso não recursa nem abre o que a policy de origem fecha.

**Quem entra:** titular com `private.verification_outcomes.status = 'verified'`
(`private.is_verified_holder`, `20260802000700_authorization_helpers.sql:68-82`).
**Quem não entra:** `anon`, conta não verificada e **familiar aceito por convite**
(o familiar não é titular verificado; continua lendo só a própria cidade pelo
vínculo). Ampliar para familiar é decisão futura, não analogia.

**Ler não é participar:** nenhuma linha de vínculo é criada, nenhuma vila é
concedida, nada é publicável, nenhum RSVP, convite, pergunta ou salvamento é
possível na cidade visitada.

### D2 — O que continua fechado, de propósito

- **posts e feed municipal** — o nível municipal é referência, não sala;
- **RSVP e "quem vai"** (`event_rsvps`), convites (`event_invites`) e pergunta ao
  organizador (`open_event_question`) — todos passam por `private.can_access_event`
  ou por participação direta, que não mudam;
- **eventos de grupo e de comunidade** — o predicado exige
  `community_id is null and group_id is null`;
- **entradas `pending`/`rejected` do Guia**, com `submitted_by`, `source`,
  `confidence`, `source_reply_id` e `review_note` — o predicado exige
  `status = 'approved'`;
- **salvar referência** (`guide_entry_saves` exige vínculo) e **sugerir referência**
  (`suggest_guide_entry` grava na localidade do solicitante);
- **vitrine de prestadores** — o alcance é declarado pelo próprio prestador em
  `provider_reach` (`private.can_see_provider`,
  `20260825185327_provider_showcase.sql`); abrir nacionalmente contradiria o
  consentimento dele.

### D3 — A cidade visitada é filtro efêmero de requisição

O seletor de cidade do shell (O06, PR #76) troca a cidade observada por parâmetro
de URL (`?locality=`), sem alterar autorização. **A cidade visitada nunca é
persistida no servidor**: não vira coluna em `profiles`, tabela nova, preferência
nem registro de navegação. Persistir "cidade que pretendo visitar" seria dado
pessoal novo (plano de deslocamento) e exige outro ADR.

### D4 — Mudar residência é a transferência declarada, não uma troca

`declare_locality_transfer(p_destination_locality_id, p_term_date)`: o destino
vira corrente na hora; a origem vira vínculo de saída, legível e publicável até o
prazo declarado. A troca simples — perder a origem no mesmo ato — continua
recusada (alternativa D do `ADR-20260816`). A pessoa declara a data; o produto não
inventa prazo. Esta é a única escrita nova, e usa a RPC existente.

### D5 — O que a tela mostra ao visitante

- **Detalhe de evento de outra cidade:** o botão "Pedir mais informações" (correção
  do dono de 07/09) **não aparece** para o visitante; no lugar, uma frase: perguntar
  ao organizador é para quem é da cidade. Decisão do dono, 23/09. Nunca um botão
  que devolve 42501.
- **Artigo do Guia de outra cidade:** abre, pela policy de D1. Decisão do dono,
  23/09.
- **Identidade do organizador:** a linha de `events` traz `organizer_id`. O perfil
  do organizador de outra cidade continua negado pela RLS de `profiles`
  (`shares_locality_with`, `profile_is_visible_to_viewer`). **É proibido** resolver
  nome, foto ou contato do organizador de outra cidade por cliente `service_role`
  (`apps/web/lib/supabase/server.ts`); a tela do visitante mostra o evento sem o
  nome de quem organiza, e o link de perfil não é renderizado para quem não o
  pode abrir.
- Onde a leitura não estiver liberada, a tela diz que não está — nunca lista vazia.

### D6 — Texto livre de evento: risco aceito, com mitigação real

Hoje só `events.venue` tem `CHECK` contra endereço residencial e militar
(`20260802001200_events_rsvp.sql:19-27`); `title` e `description` são texto livre.
**Decisão do dono (23/09): aceitar o risco**, sem estender a checagem. Motivo: o
evento de cidade já é público para a cidade inteira, a responsabilidade pelo texto
é de quem organiza, e uma deny-list em texto livre gera falso positivo em evento
legítimo. Mitigação que vale: o evento de cidade continua sujeito à denúncia e à
moderação existentes, e a condição de reabertura abaixo nomeia o sinal que muda
esta decisão.

## Alternatives considered

1. **Manter como está (nada abre).** Zero risco novo de RLS; mantém a promessa
   vazia da interface e o militar de férias continua sem nada. Rejeitada: é o
   defeito que motivou o ADR.
2. **Leitura nacional só de eventos (sem Guia).** Menor superfície. Rejeitada: o
   Guia de chegada é a referência mais útil de quem vai para outra cidade, e já é
   curado (só o aprovado aparece).
3. **Leitura nacional de eventos + Guia (esta decisão).** Abre o que a cidade já
   publica como referência e mantém fechado tudo que é conversa, presença ou
   dado da pessoa.
4. **Abertura por analogia (eventos, Guia, vitrine, perguntas, feed municipal).**
   Rejeitada: a vitrine depende do consentimento do prestador; perguntar e o feed
   são participação (o motivo da recusa em `ADR-20260816`); presença é dado
   pessoal.
5. **Leitura anônima (sem login).** Rejeitada: a comunidade é gated por
   verificação; abrir para `anon` transformaria referência da comunidade em
   conteúdo público indexável.

## Market or reference baseline

Produtos de comunidade com recorte geográfico separam **descoberta** de
**participação**: é comum mostrar eventos e referências públicas de outra cidade a
quem está logado, enquanto grupos, conversa e presença exigem participação
(padrão de apps de eventos e de redes de bairro com "explorar outra região").
Nesta base de código, a mesma separação já é regra escrita:
`PROCESSO-DE-CONSTRUCAO.md` §3 ("Selecionar uma cidade para explorar não concede
participação em uma comunidade privada") e §8 ("a busca manual de cidade deve
funcionar"); a spec de 08/09 §3.1 ("Cidade de exploração é filtro… O catálogo
nacional pode mostrar dados de descoberta autorizados em outra cidade").

## Proposed divergence from baseline

O portão é mais estreito que o padrão de mercado: exige **titular verificado**, não
apenas conta logada, e deixa o familiar de fora. A vitrine de prestadores, que em
muitos produtos é descoberta pública, fica fechada por consentimento.

## Evidence and sources

- Policies atuais: `20260815210000_arrival_guide_curation.sql`,
  `20260820060533_fix_events_insert_returning_rls.sql:39-73`,
  `20260910202110_guide_article.sql:136-165`.
- Helper: `20260802000700_authorization_helpers.sql:68-82`.
- Fechamentos que não mudam: `20260805214709_community_scope.sql:392-407`
  (RSVP), `20260806171204_event_invites.sql:40-88`,
  `20260911051230_event_question_thread.sql:55`,
  `20260915190000_guide_entry_saves.sql:33-43`,
  `20260825185327_provider_showcase.sql`.
- Guardas de contagem que mudam deliberadamente:
  `supabase/tests/rls-or-column-regression.test.sql:587` (`events`: 3 → 4) e
  `:697` (`arrival_guide_entries`: 1 → 2); nomes existentes travados em `:321-327`
  e `:454-458`; `supabase/tests/full-regression.sql:181`.
- Interface que já espera a leitura: `city-reference.tsx:60-68,88-100`; seletor
  O06 (PR #76, `components/bivaque/locality-switcher.tsx`).
- Pedido do dono: citado em "Approval".

## Benefits

O militar em trânsito lê os eventos e o Guia da cidade de destino antes de chegar,
que é o momento em que a informação vale mais. A promessa da interface deixa de
ser vazia. A transferência declarada, que já existe no banco, ganha a porta que
faltava.

## Risks

- **Privacidade — texto livre de evento lido nacionalmente** (D6): aceito pelo
  dono, com moderação e condição de reabertura.
- **Privacidade — identidade do organizador:** mitigada por D5 (proibição de
  service role) e provada por teste negativo.
- **Segurança — policy mal escrita abre o que D2 fecha:** mitigado pelos predicados
  fixos de D1 e pela lista de testes negativos obrigatória.
- **Regressão — `INSERT … RETURNING` em `events`:** mitigado pela regra de não
  auto-referência e pelo teste A13.
- **Suporte/adoção:** visitante pode esperar poder confirmar presença ou perguntar;
  mitigado pela frase de D5 no lugar do botão.
- **Operacional:** zero (sem job, sem dado novo, sem escrita nova além da RPC de
  transferência existente).

## Reversal cost

Baixo. Reverter = uma migration que remove as quatro policies novas e volta as
contagens dos guardas. Não há dado novo a migrar nem a apagar (D3 proíbe persistir
a cidade visitada). Comunicação: a interface volta a dizer que a outra cidade não
está disponível.

## Success metric

Provado em pgTAP num banco sem seed, na mesma entrega da migration:
titular verificado da cidade A **lê** evento de nível cidade e Guia aprovado (lista
e artigo publicado) da cidade B; e **não** lê evento de grupo/comunidade de B,
entrada pendente/rejeitada de B, RSVP/convite/post de B, nem cria RSVP, pergunta,
evento, salvamento ou sugestão em B. `anon`, não verificado e familiar não leem.
Em produção: nenhum incidente de privacidade aberto sobre evento/Guia de outra
cidade nos 30 dias após a publicação.

## Reopen condition

Qualquer um destes reabre o ADR: (a) denúncia de evento de cidade com endereço
residencial, OM ou dado pessoal no título/descrição lido por alguém de outra
cidade (reabre D6 e a extensão do `CHECK`); (b) qualquer caminho que exponha o
nome do organizador de outra cidade (reabre D5); (c) pedido para ampliar a leitura
a familiar, `anon`, vitrine, perguntas ou feed; (d) falha de qualquer teste
negativo da lista.

## Relação com decisões anteriores

Substitui o `ADR-20260816-transferencia-e-pertencimento` **somente** na recusa da
alternativa B quanto à **leitura**. A razão daquela recusa — sem vínculo, a pessoa
não consegue **perguntar** antes de chegar — continua valendo: perguntar segue
fechado (D2, D5). A transferência declarada (alternativa A daquele ADR) continua
sendo o caminho de mudança de residência (D4). O `ADR-20260816` recebe ponteiro
para este.

## What this ADR does not decide

- Mercado e Moradia nacionais (RLS e privacidade próprias).
- Perguntar na cidade visitada.
- Cancelar a transferência (`reverse_locality_transfer` é `service_role`).
- Recorte de notificações entre cidades.
- Leitura nacional para familiar.

## Contrato de testes (pgTAP, banco sem seed, na mesma entrega)

A. Eventos: (A1+) verificado de A lê evento de cidade de B; (A2−) não lê evento de
grupo de B; (A3−) não lê evento de comunidade de B; (A4−) não verificado de A não
lê; (A5−) `anon` não lê; (A6−) familiar de A não lê; (A7−) verificado de A não
insere evento em B (42501); (A8−) não atualiza evento de B; (A9−) não cria RSVP em
evento de cidade de B (42501); (A10−) não lê `event_rsvps` de B; (A11−) não lê
`event_invites` de B; (A12−) `open_event_question` em evento de B dá 42501;
(A13+) `insert … returning *` em evento continua funcionando; (A14+) membro de B
continua lendo evento de B; (A15−) verificação revogada não lê; (A16−) não lê post
municipal de B.

B. Guia: (B1+) verificado de A lê entrada aprovada de B; (B2−) não lê pendente de
B; (B3−) não lê rejeitada de B; (B4−) não verificado não lê; (B5−) `anon` não lê;
(B6−) familiar de A não lê; (B7−) não salva entrada de B; (B8+) lê artigo
publicado e suas seções de entrada aprovada de B; (B9−) não lê artigo `draft` ou
`withdrawn` de B nem artigo de entrada pendente; (B10−) `suggest_guide_entry` de A
grava em A, nunca em B; (B11+) membro de B continua lendo o Guia de B.

C. Guardas: `rls-or-column-regression.test.sql:587` → 4 e `:697` → 2, com o motivo
escrito no mesmo commit; `:321-327`, `:454-458` e `full-regression.sql:181`
continuam passando sem alteração.

## Approval

Aprovação humana explícita por Juan em **2026-09-19**: *"Eu quero as duas coisas,
poder mudar meu local de residência declarando transferência, e uma simples
consulta em outra localidade, por exemplo, um militar que sai do RJ de férias para
Brasília, poderia ver entre outras coisas os eventos da cidade."*

Decisões complementares do dono em **2026-09-23**, nesta sessão, depois do parecer
independente: aceitar o risco do texto livre de evento (D6); o artigo do Guia de
outra cidade abre (D1/D5); "Pedir mais informações" fica oculto para o visitante,
com explicação (D5); implementar a leitura nacional junto com o conserto dos
grupos.

Pela `RISK_MATRIX.md` isto é **R3**. A implementação só começa com
`critic_verdict: PASS` de revisão independente desta versão.
