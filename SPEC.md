# SPEC — especificação técnica do Bivaque Community

> **O que este documento é.** A camada normativa do sistema: entidades, fronteira de
> confiança, matriz de autorização, máquinas de estado, invariantes e limites. Cada
> requisito tem **ID**, deriva de uma decisão já tomada e aponta **onde é imposto**.
>
> **O que este documento não é.** Não é visão, não é justificativa e não é roadmap — isso é
> [`docs/BIVAQUE.md`](docs/BIVAQUE.md). Não é estado de implementação — isso é
> [`docs/PRODUCT_STATUS.md`](docs/PRODUCT_STATUS.md).
>
> **Um requisito estar aqui não significa que esteja construído.** A coluna *Imposto por*
> diz a verdade: quando ela traz `—`, nada no sistema garante aquele requisito hoje.
>
> Escrito em **2026-08-13**, contra o schema em `supabase/migrations/` e o código em
> `apps/web` no commit `1b95fa4`.

| Pergunta | Documento |
|---|---|
| por que o produto é assim | [`docs/BIVAQUE.md`](docs/BIVAQUE.md) |
| **o que precisa ser verdade no sistema** | **este arquivo** |
| o que é verdade hoje, com evidência arquivo:linha | [`docs/PRODUCT_STATUS.md`](docs/PRODUCT_STATUS.md) |
| comandos, armadilhas de ambiente, contratos de repo | [`AGENTS.md`](AGENTS.md) |
| decisões R3 e a régua de risco | [`docs/decisions/`](docs/decisions/) |
| desenhos aprovados e planos executáveis | [`docs/superpowers/`](docs/superpowers/) |

---

## 1. Convenções

**Força normativa.** **DEVE** / **NÃO PODE** são obrigatórios: violá-los é defeito, e o
gate ou a revisão devem barrar. **PODE** é permissão explícita, escrita para fechar
ambiguidade — não é sugestão de implementar.

**Rastreabilidade.** Todo requisito carrega:

- **Deriva de** — a decisão (`D##`) ou seção do `BIVAQUE.md` de onde nasce. Requisito sem
  origem não entra aqui; vira proposta em `docs/decisions/`.
- **Imposto por** — migration, teste, ou arquivo que garante o requisito. `—` significa
  que nada garante hoje; a onda que fecha está no `PRODUCT_STATUS.md`.

**Prefixos de ID:** `IDENT` identidade e papéis · `SCOPE` escopo e autorização · `VERIF`
verificação · `INVITE` convites · `CONT` conteúdo · `MOD` moderação · `PRIV` privacidade e
dado · `LIMIT` limites não-funcionais · `ARCH` invariantes de arquitetura.

**IDs são permanentes.** Requisito revogado fica na tabela com status `revogado` e a
decisão que o revogou. Nunca se reaproveita número.

---

## 2. Fronteira de confiança

Três zonas, e a linha entre elas é o ativo principal do produto.

| Zona | Conteúdo | Exposição via Data API | Privilégio de `anon` / `authenticated` |
|---|---|---|---|
| `public` | entidades de produto: perfil, feed, grupos, comunidades, eventos, indicações, notificações, denúncias | sim, sempre sob RLS | apenas o que a policy conceder |
| `private` | `verification_outcomes`, `family_invitations`, `family_account_links` | **nunca** | **nenhum privilégio de tabela**; só execução dos helpers |
| `storage` | buckets `avatars` e `event-photos`, ambos `public = false` | via Storage API sob RLS | conforme policies em `20260802000500` |

O acesso ao `private` acontece por **wrapper em `public`** que chama a função homônima em
`private` — `public.accept_family_invitation`, `public.read_verification_status`,
`public.list_pending_invites`, `public.upsert_verification_outcome`. O wrapper é a única
porta; a tabela não tem porta.

---

## 3. Modelo de domínio

### 3.1 Entidades

| Área | Tabelas | Migration de origem |
|---|---|---|
| Fundação | `localities`, `locality_memberships`, `profiles` | `20260802000100` |
| Confiança | `private.verification_outcomes`, `private.family_invitations`, `private.family_account_links` | `20260802000200` |
| Admissão | `waitlist` | `20260802000600` |
| Feed | `posts`, `comments`, `post_reactions`, `post_saves` | `20260802000900`, `20260804212011`, `20260805153451` |
| Grupos | `groups`, `group_memberships` | `20260802001000` |
| Comunidades | `communities`, `community_memberships` | `20260805211933` |
| Eventos | `events`, `event_rsvps`, `event_invites` | `20260802001200`, `20260806171204` |
| Indicações | `recommendation_requests`, `recommendation_replies`, `recommendation_saves` | `20260802001100` |
| Mensagens | `dm_conversations`, `dm_messages`, `dm_blocks`, `dm_reports` | `20260802001500` |
| Notificação | `notifications`, `notification_preferences` | `20260802001400`, `20260806165606` |
| Operação | `reports`, `operators` | `20260802001600`, `20260806040949` |

**A hierarquia de pertencimento é aditiva** (D03): `locality` ⊃ `community` ⊃ `group`.
Estar na comunidade não tira ninguém da localidade. `groups.community_id` é o elo, e
`private.enforce_group_community_membership` mais `private.block_group_community_change`
mantêm o grupo dentro da comunidade em que nasceu.

### 3.2 Vocabulários fechados

Todo enum é contrato: acrescentar valor é migration, e o valor novo **DEVE** ser tratado em
toda policy e todo `switch` que leia o tipo.

| Enum | Valores | Schema |
|---|---|---|
| `locality_admission_mode` | `invite_only`, `waitlist_only`, `verification_gated` | `public` |
| `profile_visibility` | `locality_members`, `hidden` | `public` |
| `verification_status` | `pending`, `verified`, `rejected`, `temporary_error` | `private` |
| `eligibility_class` | `active_federal_military`, `veteran`, `military_pensioner` | `private` |
| `family_invitation_status` | `pending`, `accepted`, `revoked`, `expired` | `private` |
| `post_type` | `text`, `photo`, `link`, `poll` | `public` |
| `group_visibility` | `public`, `private` | `public` |
| `group_membership_role` / `community_membership_role` | `member`, `moderator`, `owner` | `public` |
| `group_membership_status` / `community_membership_status` | `pending`, `approved` | `public` |
| `event_status` | `upcoming`, `cancelled` | `public` |
| `event_rsvp_status` | `interested`, `going` | `public` |
| `event_invite_status` | `pending`, `accepted`, `declined` | `public` |
| `recommendation_category` | `servicos_locais`, `saude_bem_estar`, `educacao`, `esporte_lazer`, `alimentacao`, `transporte`, `moradia`, `outros` | `public` |
| `notification_type` | `comment`, `group_admission`, `invitation_accepted`, `event_rsvp`, `event_change`, `direct_message` | `public` |
| `dm_context_type` | `shared_group`, `shared_event`, `recommendation_thread`, `accepted_family` | `public` |
| `report_target_type` | `post`, `comment`, `group`, `message` | `public` |
| `report_status` | `open`, `resolved` | `public` |

**`Manaus` é `verification_gated`** (`20260809120100`). `invite_only` fica no enum para
localidade futura com allowlist distribuída fora de banda; nenhuma localidade o usa.

### 3.3 Helpers de autorização

Toda policy que precise de decisão além de `auth.uid() = coluna` chama um destes. Todos são
`security definer` — imposto por `tests/scope/rls-structure.test.mjs`.

| Helper | Responde |
|---|---|
| `private.is_locality_member(uuid)` | pertence à localidade |
| `private.is_verified_locality_member(uuid)` | pertence **e** está verificado |
| `private.is_verified_holder(uuid)` / `private.check_verified_holder(uuid)` | é titular verificado (pode convidar familiar) |
| `private.is_community_member(uuid)` / `private.is_community_moderator(uuid)` | pertence / modera a comunidade |
| `private.is_group_member(uuid)` / `private.is_group_moderator(uuid)` / `private.is_group_owner(uuid)` | pertence / modera / é dono do grupo |
| `private.can_access_post(uuid)` / `private.can_access_post_scope(...)` | alcança o post pelo escopo dele |
| `private.can_access_event(uuid)` / `private.is_event_locality_member(uuid)` | alcança o evento |
| `private.can_see_locality_recommendation(uuid)` | alcança o pedido de indicação |
| `private.can_dm_between(uuid, uuid)` / `private.is_dm_participant(uuid)` / `private.is_dm_blocked_by_other(uuid)` | pode conversar |
| `private.is_operator()` / `private.is_operator(uuid)` | é operador |
| `private.has_accepted_family(...)` | há vínculo familiar aceito |

---

## 4. Papéis e autorização

### 4.1 Papéis

| Papel | Como se torna | Membership | Deriva de |
|---|---|---|---|
| **Membro** | verificação de CPF, ou upload auditado como exceção | `locality_memberships` | §1.3, D07 |
| **Dependente** | aceite de convite familiar do titular | `locality_memberships`, igual ao membro | §1.3, D16 |
| **Prestador civil** | indicação de membro verificado | **nenhuma** — usuário do Auth com papel | D17, D37 |
| **Operador** | designação, via `private.promote_operator_by_email` | linha em `operators` | D24 |
| **Dono de comunidade** | designado ao provisionar; transferível | `community_memberships.role = owner` | D13, D14 |

### 4.2 Matriz de acesso

Leitura da esquerda para a direita: o papel na linha, sobre o objeto na coluna.

| | Perfil de membro | Feed da localidade | Feed da comunidade | Feed do grupo | Detalhe de evento | Pedido de indicação | Painel de operação |
|---|---|---|---|---|---|---|---|
| **Visitante** | — | — | — | — | — | — | — |
| **Membro não verificado** | — | — | — | — | — | — | — |
| **Membro verificado da localidade** | ✔ | ✔ | apenas as suas | apenas os seus | ✔ se alcança o escopo | ✔ se alcança o escopo | — |
| **Dependente** | ✔ | ✔ | apenas as suas | apenas os seus | ✔ se alcança o escopo | ✔ se alcança o escopo | — |
| **Prestador civil** | — | — | — | — | — | — | — |
| **Operador** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

Três leituras que a matriz fixa e que valem como requisito:

- **Grupo público é público dentro do container** (D06). Um grupo `public` numa comunidade é
  visível a quem está **na comunidade**, nunca à localidade inteira.
- **Prestador não lê conteúdo de membro** (D17, D37). Sem membership, nenhuma policy de
  conteúdo casa — falha fechado por construção, e não por regra escrita.
- **Operador é papel de operação, não de leitura ampla por conveniência.** O acesso existe
  para moderar e admitir; todo uso deixa rastro.

---

## 5. Máquinas de estado

Transição fora destas tabelas é defeito. Estado terminal não volta.

### 5.1 Verificação — `private.verification_status`

```
        ┌─────────────► verified   (terminal)
        │
  pending ──────────► rejected    (terminal até recurso — VERIF-07)
        │
        └─────────► temporary_error ──► pending
```

`verified` **DEVE** carregar `eligibility_class` e `checked_at` não nulos; qualquer outro
estado **DEVE** ter `eligibility_class` nulo. Imposto por CHECK em `20260802000200`.

O mapeamento do rótulo do Portal `reformado` → `veteran` é interno e **NÃO PODE** vazar para
o cliente.

### 5.2 Convite familiar — `private.family_invitation_status`

```
  pending ──► accepted   (terminal; exige accepted_by_user_id e accepted_at)
     │
     ├────► revoked      (terminal)
     └────► expired      (terminal)
```

`accepted` **DEVE** ter `accepted_by_user_id` e `accepted_at` preenchidos; os demais estados
**DEVEM** ter ambos nulos. Imposto por CHECK em `20260802000200`.

### 5.3 Membership de grupo e de comunidade

```
  (sem linha) ──► pending ──► approved ──► (sem linha, ao sair ou ser removido)
```

Comunidade e grupo compartilham a forma. A perda de membership na comunidade **DEVE**
cascatear para os grupos dela — `private.cascade_community_membership_loss` e
`private.cascade_community_membership_downgrade`.

### 5.4 Evento, RSVP, convite de evento e denúncia

| Máquina | Transições |
|---|---|
| `event_status` | `upcoming → cancelled`; conclusão por `public.complete_event` |
| `event_rsvp_status` | `interested ⇄ going`; retirada é remover a linha |
| `event_invite_status` | `pending → accepted` ou `pending → declined`, ambos terminais |
| `report_status` | `open → resolved`, terminal |

---

## 6. Requisitos normativos

### 6.1 Identidade e papéis — `IDENT`

| ID | Requisito | Deriva de | Imposto por |
|---|---|---|---|
| `IDENT-01` | Todo perfil **DEVE** referenciar um `locality_membership` existente do mesmo usuário e da mesma localidade | D02 | FK composta, `20260802000100` |
| `IDENT-02` | `display_name` **DEVE** ter entre 2 e 80 caracteres | D23 | CHECK, `20260802000100` |
| `IDENT-03` | `display_name` **DEVE** ser normalizado em Unicode, e caracteres de controle e bidi **NÃO PODEM** ser aceitos | D23 | — |
| `IDENT-04` | O produto **NÃO PODE** oferecer busca de pessoas no piloto | D43 | — |
| `IDENT-05` | O dependente **DEVE** ter conta própria e independente após aceitar o convite; **NÃO PODE** ser sub-conta do titular | §1.3, D16 | `private.family_account_links`, `20260802000200` |
| `IDENT-06` | O prestador civil **NÃO PODE** ter `locality_membership` | D17, D37 | — |
| `IDENT-07` | Afiliação declarada — força, situação, OM, turma — **NÃO PODE** ser implementada enquanto o ADR estiver `proposed` | D10, `AGENTS.md` §Supabase | `docs/decisions/ADR-20260811-om-declarada.md` |

### 6.2 Escopo e autorização — `SCOPE`

| ID | Requisito | Deriva de | Imposto por |
|---|---|---|---|
| `SCOPE-01` | RLS **DEVE** estar `enabled` **e** `forced` em toda tabela de `public` e de `private` | §4.3 | `20260802000300`, pgTAP `foundation-schema` |
| `SCOPE-02` | Coluna de escopo e as policies que a leem **DEVEM** nascer na mesma migration | §12.6 | revisão; quatro vazamentos vieram de ignorar isto |
| `SCOPE-03` | Nenhuma policy **PODE** consultar a relação que ela mesma protege | recursão em produção no produto-mãe | `tests/scope/rls-structure.test.mjs` |
| `SCOPE-04` | Nenhuma policy **PODE** referenciar relação criada em migration posterior | idem | `tests/scope/rls-structure.test.mjs` |
| `SCOPE-05` | Toda função chamada de dentro de policy **DEVE** ser `security definer` | idem | `tests/scope/rls-structure.test.mjs` |
| `SCOPE-06` | Nenhum Server Component ou route de usuário **PODE** renderizar objeto de domínio com `service_role` sem chamar o helper de acesso e **negar antes de montar a UI** | §12.1 | — (onda A) |
| `SCOPE-07` | Grupo `public` dentro de comunidade **DEVE** ser visível apenas a membros daquela comunidade | D06 | `20260805214709`, pgTAP `community-scope` |
| `SCOPE-08` | Grupo **NÃO PODE** trocar de comunidade após criado | invariante da spec de comunidade §7.4 | `private.block_group_community_change` |
| `SCOPE-09` | Perda de membership na comunidade **DEVE** cascatear para os grupos dela | idem §7.3 | `private.cascade_community_membership_loss` |
| `SCOPE-10` | Todo caminho de permissão **DEVE** ter teste positivo **e** negativo | §12.7 | `supabase/tests/authz-allowed-matrix.sql` + `authz-denied-matrix.sql` |
| `SCOPE-11` | O destino de redirecionamento pós-autenticação **DEVE** ser caminho relativo validado; destino externo **NÃO PODE** ser aceito | onda A | `auth/callback/route.ts` (`61929a4`) |
| `SCOPE-12` | O endpoint de avatar **DEVE** conferir localidade e autorização antes de servir a imagem | onda A | `api/avatar/[userId]/route.ts` (`3871b4d`) |

### 6.3 Verificação — `VERIF`

| ID | Requisito | Deriva de | Imposto por |
|---|---|---|---|
| `VERIF-01` | A consulta ao Portal **DEVE** ser server-side; o navegador **NÃO PODE** chamá-lo | `AGENTS.md` §Portal | `lib/portal/` |
| `VERIF-02` | A chave `chave-api-dados` **DEVE** vir de variável de ambiente e **NÃO PODE** ser commitada nem logada | idem | `tests/scope/secrets-scan.test.mjs` |
| `VERIF-03` | A resposta ao cliente **DEVE** ser genérica e idêntica para CPF inexistente, não-militar, falha de API e hash divergente | §4.2 | — |
| `VERIF-04` | O limite **DEVE** ser de 3 consultas por hora por usuário | §4.2, D07 | — (onda D1, Upstash) |
| `VERIF-05` | Timeout e instabilidade do Portal **DEVEM** produzir `pending`, nunca erro que devolva a pessoa ao formulário sem memória | D08 | — (onda D2) |
| `VERIF-06` | **DEVE** existir caminho de exceção por upload auditado, storage privado e TTL curto, com decisão humana na fila | D07 | — (onda D2) |
| `VERIF-07` | Rejeição **DEVE** ter recurso: retentativa limitada mais caso na fila de admissões | D07 | — (onda D2) |
| `VERIF-08` | O gate do shell **DEVE** derivar do estado real de verificação; `pending`, `rejected` e `temporary_error` **NÃO PODEM** alcançar superfície de publicação | D08 | — (onda D2) |
| `VERIF-09` | O estado de verificação **DEVE** vir do servidor; **NÃO PODE** ser lido da query string | §12.5 | — (onda D2) |
| `VERIF-10` | O CPF **NÃO PODE** ser guardado no cliente, incluindo `sessionStorage` | D11 | — (onda A) |
| `VERIF-11` | Retry automático em laço contra o Portal **NÃO PODE** existir; ao receber 429 o circuit breaker **DEVE** parar as chamadas e mandar todos para `pending` | D46, §7.9 | — (onda D1) |

### 6.4 Convites — `INVITE`

| ID | Requisito | Deriva de | Imposto por |
|---|---|---|---|
| `INVITE-01` | Convite de membro **DEVE** exigir verificação; **NÃO PODE** conceder acesso por si | D15 | — (onda E) |
| `INVITE-02` | Convite de membro **DEVE** carregar quem convidou e para qual comunidade | D15 | — (onda E) |
| `INVITE-03` | Convite familiar é a **única** via que concede acesso sem CPF | D16 | `20260802000400` |
| `INVITE-04` | O aceite do convite familiar **DEVE** conferir o `invitee_email_digest` | D16 | — (onda D2) |
| `INVITE-05` | Só o token em digest **DEVE** ser persistido; o token em claro **NÃO PODE** ser guardado | D11 | CHECK `octet_length = 32`, `20260802000200` |
| `INVITE-06` | Cada titular verificado **PODE** manter no máximo 5 convites familiares ativos | §5.4 | `private.verified_holder_active_invitations` |
| `INVITE-07` | Expirado, usado, revogado e inexistente **DEVEM** ser quatro ramos distintos para quem abre o link | D08 aplicado ao convite | — (onda D2) |
| `INVITE-08` | Só titular verificado **PODE** criar convite familiar | §4.1 | `private.check_verified_holder` |
| `INVITE-09` | A concessão da vila **DEVE** ser aprovação explícita do dono da comunidade; o link **NÃO PODE** conceder | D14 | — (onda E) |
| `INVITE-10` | A fila de aprovação **DEVE** ser de lote, com seleção múltipla, e delegável a moderadores | §5.2 | — (onda E) |

### 6.5 Conteúdo — `CONT`

| ID | Requisito | Deriva de | Imposto por |
|---|---|---|---|
| `CONT-01` | Post **DEVE** ter até 2000 caracteres; comentário, até 1000 | contrato | `packages/domain`, CHECK nas migrations |
| `CONT-02` | O tipo do post **DEVE** casar com o payload: `photo` exige `photoPath`, `link` exige `linkUrl`, `poll` exige ≥2 opções — e nenhum **PODE** carregar payload de outro tipo | contrato | `packages/contracts/src/index.ts:121-138` |
| `CONT-03` | Toda criação de conteúdo **DEVE** mostrar a audiência antes do submit | §12.2 | — (onda E) |
| `CONT-04` | A UI **NÃO PODE** mostrar affordance cujo fluxo não feche hoje | §12.4 | — (onda B) |
| `CONT-05` | O filtro de vocabulário no banco **DEVE** ser removido, e o aviso de PII na UI ocupa o lugar dele | D21 | — (onda C) |
| `CONT-06` | O campo `venue` de evento **NÃO PODE** conter endereço pessoal, residencial ou militar | D11 | `EventCreateSchema`, `packages/contracts/src/index.ts:68-79` |
| `CONT-07` | Pedido de indicação **DEVE** ter exatamente um escopo — localidade **ou** grupo, nunca ambos, nunca nenhum | D18 | `RecommendationRequestInsertSchema:219-221` |
| `CONT-08` | `recommendation_requests.group_id` **DEVE** ter FK e checagem de membership, na mesma migration que expuser o escopo | §12.6, D18 | — (onda F) |
| `CONT-09` | Resposta de indicação **DEVE** ser positiva por construção | D19 | — (onda F) |
| `CONT-10` | O autor **DEVE** conseguir encontrar, editar e excluir o próprio pedido pela interface | D18 | — (onda F) |
| `CONT-11` | Upload **DEVE** respeitar 5 MB para avatar, 10 MB para foto de evento, e apenas `image/jpeg`, `image/png`, `image/webp` | contrato | `20260802000500`, `packages/domain` |

### 6.6 Moderação e operação — `MOD`

| ID | Requisito | Deriva de | Imposto por |
|---|---|---|---|
| `MOD-01` | A denúncia **DEVE** ser um modelo só, cobrindo todos os alvos, incluindo mensagem direta e indicação | D24 | — (onda H) |
| `MOD-02` | O motivo da denúncia **DEVE** ser sanitizado e limitado; **NÃO PODE** persistir PII que o produto se recusa a guardar | D11, D24 | — (onda H) |
| `MOD-03` | O operador **DEVE** poder agir sobre a pessoa, não só sobre o conteúdo | D24 | — (onda H) |
| `MOD-04` | A suspensão **DEVE** ser flag em `profiles` mais helper na RLS, e entra em toda policy de escrita na mesma migration | D38 | — (onda H) |
| `MOD-05` | O denunciante **DEVE** receber retorno quando a análise concluir | D24 | `20260809184316_notify_report_resolved.sql` (parcial) |
| `MOD-06` | A moderação **DEVE** ter prazo público de resposta | D25 | — |
| `MOD-07` | Ninguém **PODE** denunciar a si mesmo | invariante | `private.reports_block_self` |
| `MOD-08` | O roster de operadores **NÃO PODE** ser legível por membro comum | correção de `using (true)` | `20260806100231` |
| `MOD-09` | O probe de RLS **DEVE** rodar como usuário comum, nunca `service_role`, e **NÃO PODE** ecoar conteúdo de linha na resposta nem no log | onda 8 | `tests/scope/rls-probe-contract.test.mjs` |

### 6.7 Privacidade e dado — `PRIV`

| ID | Requisito | Deriva de | Imposto por |
|---|---|---|---|
| `PRIV-01` | **NÃO PODE** persistir: CPF em claro, payload do Portal, organização militar, posto, endereço residencial, documento além do TTL, selo público de verificação | D11 | `tests/privacy/*`, revisão |
| `PRIV-02` | O schema `private` **NÃO PODE** ser exposto via Data API; `anon` e `authenticated` **NÃO PODEM** ter privilégio de tabela ali | §4.3 | `20260802000200`, `20260802000300` |
| `PRIV-03` | Os tipos de cliente **DEVEM** ser gerados apenas do schema `public` | `AGENTS.md` §Supabase | `supabase/database.generated.ts` |
| `PRIV-04` | O consentimento **DEVE** ser aceite versionado, com código de conduta, registrado em trilha | D12 | `profiles.consent_version`, `consented_at` (existem, não usados) |
| `PRIV-05` | Perfil oculto **DEVE** sair do produto — um estado só. A migration **DEVE** ser precedida de verificação de perfil real com `hidden`, e **NÃO PODE** virar a chave em silêncio | D09, §4.3 | — (onda B, com parada obrigatória) |
| `PRIV-06` | Copy de privacidade é contrato: ou muda a copy antes do piloto, ou muda o comportamento | §12.5 | — |
| `PRIV-07` | Fixture de teste **NÃO PODE** conter dado pessoal real; identidades **DEVEM** usar `example.invalid` e UUID fixo | `AGENTS.md` §Supabase | `supabase/tests/fixtures/foundation.inc` |
| `PRIV-08` | O rastreamento de erro **DEVE** filtrar PII antes do envio a terceiro | D39 | — (onda D1) |
| `PRIV-09` | A saída de dado comportamental para terceiro **DEVE** ter base legal declarada na governança LGPD | D40 | — (onda H) |
| `PRIV-10` | O log **NÃO PODE** conter CPF, token, payload do Portal ou conteúdo de mensagem | D11 | `tests/privacy/log-redaction.test.ts` |

### 6.8 Limites não-funcionais — `LIMIT`

| ID | Requisito | Deriva de | Imposto por |
|---|---|---|---|
| `LIMIT-01` | Throttle global contra o Portal **DEVE** ficar bem abaixo de 180 req/min | §7.9, D46 | — (onda D1) |
| `LIMIT-02` | Os quatro limites — CPF por hora, cota de convite, leitura de perfil, throttle do Portal — **DEVEM** viver num mecanismo só | D34 | — (onda D1) |
| `LIMIT-03` | O documento de verificação **DEVE** ser apagado em 7 dias; a exclusão de conta, em 30; o registro de moderação retido por 2 anos | `legal/PRIVACIDADE.md` | — (onda D1/D2) |
| `LIMIT-04` | O envio de notificação **DEVE** passar por `outbox` com estado, e o worker **DEVE** conferir preferência e opt-out antes de cada envio | D35 | — (onda D1) |
| `LIMIT-05` | Falha ou banimento do canal WhatsApp **DEVE** degradar para e-mail automaticamente, nunca quebrar | D33, §7.8 | — (onda D1) |
| `LIMIT-06` | O número de WhatsApp **DEVE** ser dedicado e descartável; **NÃO PODE** ser o do fundador nem o de administrador de vila | D33 | — (bloqueio humano) |

### 6.9 Invariantes de arquitetura — `ARCH`

| ID | Requisito | Deriva de | Imposto por |
|---|---|---|---|
| `ARCH-01` | Os workspaces **DEVEM** ser exatamente `apps/web` e `packages/{contracts,domain,tokens}` | contrato de repo | `tests/scope/workspace-foundation.test.mjs` |
| `ARCH-02` | O Next **DEVE** permanecer em runtime de servidor; `output: "export"` **NÃO PODE** ser usado | idem | idem |
| `ARCH-03` | HeroUI v3 **DEVE** ser a única biblioteca de componentes | idem | idem |
| `ARCH-04` | Todo primitivo com wrapper em `app/components/bivaque/` **DEVE** ser consumido pelo wrapper, nunca por import direto do HeroUI | `AGENTS.md` §wrappers | revisão |
| `ARCH-05` | O `ToastProvider` **DEVE** permanecer montado sob `(shell)/layout.tsx` | regressão conhecida | revisão |
| `ARCH-06` | Migration aplicada **NÃO PODE** ser editada; toda mudança entra como migration timestamped | `AGENTS.md` §Supabase | revisão |
| `ARCH-07` | Capability em migration **NÃO PODE** entrar em produto sem entrada → ação → feedback → acompanhamento → sad path principal | §12.3 | regra de atualização do `PRODUCT_STATUS.md` |
| `ARCH-08` | Implementação e teste **DEVEM** ser a mesma unidade de entrega | `AGENTS.md` §Style | `plan-execution` |
| `ARCH-09` | `supabase/config.toml` **DEVE** usar `[inbucket]`, nunca `[local_smtp]` | CLI 2.107.0 pinada | `tests/scope/supabase-config.test.mjs` |
| `ARCH-10` | O script de teste de banco **DEVE** chamar-se `test:db`; `db:test` **NÃO PODE** existir | contrato de repo | `tests/scope/local-command-surface.test.mjs` |
| `ARCH-11` | Spec de E2E **NÃO PODE** usar `import.meta` — as specs são transpiladas para CJS | armadilha conhecida | `AGENTS.md` §Playwright |
| `ARCH-12` | Spec de E2E **NÃO PODE** trazer credencial inline; **DEVE** ler do ambiente e falhar quando faltar | contrato de segredo | `tests/scope/secrets-scan.test.mjs` |
| `ARCH-13` | `npx pnpm@11.18.0 gate` verde é a única autorização para declarar trabalho pronto | `CLAUDE.md` | `gate-before-done` |

---

## 7. Superfície pública

Rotas em `apps/web/app`. A coluna *Gate* diz o que **DEVE** barrar antes de renderizar.

| Grupo | Rota | Gate |
|---|---|---|
| público | `/`, `/api/health`, `/api/manifest`, `/api/sw` | nenhum |
| `(preauth)` | `/login`, `/consent`, `/onboarding`, `/onboarding/status`, `/onboarding/welcome` | sessão para `status`; **membership real para `welcome`** (`VERIF-08`) |
| `(shell)` | `/community`, `/groups`, `/groups/[id]`, `/events`, `/events/[id]`, `/recommendations`, `/messages`, `/notifications`, `/profile` | sessão + consentimento + **estado real de verificação** (`VERIF-08`); detalhe exige o helper de acesso (`SCOPE-06`) |
| `(admin)` | `/admissions`, `/reports` | `private.is_operator()` |
| API de usuário | `/api/onboarding`, `/api/onboarding/status`, `/api/avatar/[userId]` | sessão; avatar exige localidade e autorização (`SCOPE-12`) |
| API de operador | `/api/admin/admissions`, `/api/admin/reports/[id]`, `/api/admin/rls-health`, `/api/admin/portal-health` | Bearer + `is_current_user_operator` |
| Auth | `/auth/callback` | destino relativo validado (`SCOPE-11`) |

O smoke de E2E fixa dois contratos: o heading `Bivaque` na home e `/api/health` respondendo
`{"status":"ok"}`. Mudar qualquer um quebra o gate.

---

## 8. Onde cada classe de requisito é provada

| Camada | Ferramenta | Prova |
|---|---|---|
| Contrato de repo | `node --test`, `tests/scope/` | workspace, runtime, biblioteca de componentes, config do Supabase, superfície de comandos, segredo |
| Estrutura de RLS | `tests/scope/rls-structure.test.mjs` | recursão, ordem de migration, `security definer` — roda em milissegundos, falha antes do pgTAP |
| Contrato de dado | Vitest, `tests/unit/` | schemas de `packages/contracts`, valores permitidos |
| Privacidade | Vitest, `tests/privacy/` | redação de PII em log, DM, notificação, denúncia e Portal |
| Autorização real | pgTAP, `supabase/tests/` | matriz permitido/negado, escopo de comunidade, feeds, denials de grupo e evento |
| Jornada | Playwright, `tests/e2e/` | 375 / 768 / 1440, login persistente, gate de sessão, denials |
| Tela | `scripts/visual/loop.mjs` | alvo de toque, contraste, overflow, disciplina de token |

**As duas execuções de `db:reset` no CI são deliberadas.** O pgTAP compara o conjunto exato
de perfis visíveis em Manaus contra as próprias fixtures e roda **sem** o seed; o E2E precisa
do oposto. Colapsar em um reset só deixa seis asserts vermelhos.

---

## 9. Divergências registradas

Conflitos encontrados ao escrever esta spec, contra o código em `1b95fa4`. Ficam escritos em
vez de escondidos — é a regra de `docs/superpowers/specs/`. Nenhum foi corrigido aqui.

**9.1 — Dois vocabulários para visibilidade de perfil, e o tipado não é o usado.**
`packages/domain/src/index.ts:6` declara `PRIVACY_VISIBILITIES = ["community", "private"]`,
exportado como `PrivacyVisibilitySchema` em `packages/contracts/src/index.ts:21`. O banco
declara `profile_visibility` como `('locality_members', 'hidden')`
(`20260802000100_locality_profile_foundation.sql:6`). O app não usa o schema tipado: escreve
os literais direto (`profile/page.tsx:193,372`). O único consumidor de
`PrivacyVisibilitySchema` é `tests/unit/contracts/allowed-values.test.ts`. Ou seja, existe um
contrato que valida um vocabulário que a persistência não conhece. A `PRIV-05` remove o
estado `hidden` — **a onda B deve decidir o destino do enum órfão junto**, senão sobra um
schema validando dois valores que não existem em lugar nenhum.

**9.2 — A onda C não alcança a terceira cópia do filtro de vocabulário.**
O regex de vocabulário proibido existe em três lugares: as constraints CHECK
(`20260802001300:15,21`), o espelho no frontend (`feed-post.tsx:186,560`) e
`PROHIBITED_CONTENT_PATTERN` em `packages/domain/src/index.ts:42`, consumido pelos schemas
`PostContentSchema` e `CommentContentSchema`. A Task 4 do plano da onda C manda varrer
`apps/web` atrás de espelhos — e a terceira cópia está em `packages/domain`, **fora** desse
caminho. Derrubando só as duas primeiras, a `CONT-05` continua violada: a validação de
contrato segue rejeitando "patente", "OM" e "CPF" antes de qualquer chamada ao banco.

**9.3 — `recommendation_category` tem `outros`.**
O enum inclui `'outros'` (`20260802001100:9`). A regra 1 do `BIVAQUE.md` §7.2.1 diz que
"Não existe 'Outros'", porque vira depósito e mata o filtro. A regra está escrita para as
categorias da **vitrine**, que é entidade diferente e ainda não existe — então isto não é
violação hoje. Fica registrado para a onda G decidir explicitamente se as duas taxonomias
convergem ou permanecem separadas.

**9.4 — `.claude/memory.md` aponta para documento histórico.**
O arquivo indica `docs/journeys/MAP.md` como "entry point" e "read first". O `AGENTS.md`
declara esse mapa superado desde 2026-08-11 e proíbe usá-lo. Um agente que entre pelo
`memory.md` é mandado exatamente para a fonte que os dois documentos atuais substituíram.

---

## 10. Como manter esta spec

1. **Requisito novo entra com origem.** Sem `D##` ou seção do `BIVAQUE.md`, não é requisito
   — é proposta, e o lugar dela é `docs/decisions/`.
2. **A coluna *Imposto por* muda quando o teste existe**, não quando o código existe. Teste
   é o que impede o requisito de regredir.
3. **Requisito revogado não sai.** Vira linha com status `revogado` e a decisão que o
   revogou. O ID nunca se reaproveita.
4. **Divergência achada se escreve no §9**, mesmo sem correção na mesma sessão.
5. **Esta spec não recebe estado de implementação.** Se a vontade for escrever "já está
   pronto", o lugar é o `PRODUCT_STATUS.md` — e a linha só sai de lá quando o ciclo do
   usuário fecha.
