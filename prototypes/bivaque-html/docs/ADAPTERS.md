# Protótipo HTML → Supabase: lista de adaptadores

Entregável final do kit: o que cada parte do estado local do protótipo (`localStorage`,
schema 2) vai exigir quando a interface for ligada ao backend real. O mapeamento original foi feito **por nome de tabela** e precisa ser reconciliado
com a evolução posterior do backend. Em 19/10/2026, o repositório contém 184 migrations
SQL; as colunas, políticas RLS e o funcionamento em runtime **não foram conferidos
integralmente** nesta revisão. Cada adaptador começa por essas verificações. Nenhum arquivo de backend foi alterado.

Legenda: **Existe** = estrutura identificada no código das migrations, **não** prova
de implantação em produção nem de funcionamento; **Parcial** = cobre parte;
**Lacuna** = equivalente ainda não identificado no inventário.

| Estado local | Usado em | Backend | Situação |
| --- | --- | --- | --- |
| `profile` (nome, vínculo, força, verificado) | Cadastro, Configurações | `profiles`, `profile_affiliations`, `verification_documents`, `consent_acceptances`, `read_verification_status` | Existe |
| `homeCity`, `city`, `mode`, `arrival`, `dest`, `leaveDate` | Cidade e momento | `localities`, `locality_memberships` | Parcial: o momento (chegando/saindo/datas) precisa de lugar definido |
| `plan.chegando/saindo` (checklist pessoal) | Início, Retomar | `arrival_guide_entries` é guia curado, não checklist | Lacuna |
| `invites` (convite de família) | Família | `family_invite_*` (schema privado), `family_invite_delivery` | Existe |
| `prefs.digest/cap` | Configurações | `notification_preferences`, `notification_opt_outs` | Existe |
| `prefs.appearance` | Tema | — | Só local (não precisa de backend) |
| `prefs.showHood` | Privacidade | `profiles` | Verificar coluna |
| `items` (desapegos e imóveis), `drafts`, `saved` em anúncio | Desapegos, Imóveis, Meus anúncios, Salvos | `listings` (status `draft`), `property_details`, `listing_photos`, `listing_saves`, `listing_status_events`, `transition_listing` | **Existe no código das migrations.** Adaptador de estado local, políticas RLS e execução ponta a ponta ainda exigem verificação. |
| `biz`, `myBiz`, assumir página | Negócios | `provider_profiles`, `provider_accounts`, `provider_catalog_items`, `provider_portfolio_photos`, `provider_reach`, `provider_search` | Existe |
| `biz.says/recN`, indicação | Negócios, Comunidade | `recommendation_replies`, `recommendation_requests` | Parcial: conferir se a indicação direta a negócio cabe nessas tabelas |
| `biz.saved` | Salvos | `recommendation_saves`? | Verificar |
| `subscription` (planos), patrocinado | Planos, Início | — | **Lacuna: sem planos, cobrança nem patrocínio** |
| `asks` (pergunta, resposta, resolveu, acompanhar, curtir) | Comunidade › Indicações | `recommendation_requests`, `recommendation_replies`, `recommendation_reply_promotions`, `recommendation_saves` | Existe |
| `groups` (entrar, pedido, moderadores, privacidade, aviso fixado) | Grupos | `groups`, `group_memberships`, `groups_moderation`, `add_verification_gated_admission_mode`, `user_group_interests` | Existe |
| `groups.posts`, comentários, curtidas | Publicações | `posts`, `comments`, `post_reactions`, `post_saves` | Existe |
| Enquete em publicação | Publicações | — | Lacuna (verificar) |
| `groups.notif` | Avisos do grupo | `notification_preferences`, `notification_opt_outs` | Existe |
| `events` (criar, editar, presença, cancelar) | Agenda, Encontro | `events`, `event_rsvps`, `event_invites`, `recurring_events`, `event_completion` | Existe; conferir limite de vagas no servidor |
| `threads` (conversas contextuais) | Conversas | `dm_conversations`, `dm_messages`, `dm_blocks`, `dm_provider_context` | Existe |
| `notices` | Avisos | `notifications`, `personal_notifications`, `outbox` | Existe |
| `reports` (denúncia) | Denunciar | `reports`, `resolve_report_rpc` | Existe; no protótipo continua como dependência |
| `communities` (aba Comunidade) | Comunidade | `communities`, `community_memberships`, `community_invitations` | Existe |
| `lastViewed`, `recent` (buscas) | Retomar, Busca | — | Só local, ou lacuna se precisar sincronizar entre aparelhos |
| `stage`, `incoming`, `test`, `onboarded` | Controles do protótipo | — | Só do protótipo; não migra |

## Regras que o backend precisa garantir

A interface só esconde ou recusa. Estas regras foram provadas no protótipo e
**precisam ser revalidadas no servidor**:

1. **Verificação real.** Nenhum clique concede verificação. Publicar, comentar,
   confirmar presença e enviar mensagem exigem perfil verificado.
2. **Grupo fechado:** só o moderador aprova ou recusa (decisão de 14/10/2026). Nada
   é aprovado por tempo.
3. **"Resolveu":** só o autor da pergunta ou publicação pode marcar. No protótipo, o
   handler confia na interface (Rodada 04).
4. **Vagas de encontro:** limite aplicado no servidor, com tratamento de concorrência
   (duas confirmações na última vaga).
5. **Cidade consultada** é só leitura: publicar vale apenas na cidade de origem.
6. **Pagar não altera a ordem** de indicações nem de negócios. O conteúdo pago é
   sempre rotulado "Patrocinado" (Rodada 06).
7. **Assumir página de negócio:** a propriedade precisa ser validada antes de editar.
   No protótipo é simulado.
8. **Endereço de imóvel** nunca é exposto com precisão por padrão.

## Governança

Pela `docs/decisions/RISK_MATRIX.md`, os adaptadores de verificação de identidade,
dados privados (schema `private`, convites de família), políticas RLS e planos/cobrança
são **R3**. Cada um exige um ADR aprovado por uma pessoa antes de qualquer
implementação. Este documento só descreve as lacunas e não aprova nada.

## Ordem sugerida de adaptação

1. Sessão, perfil, verificação e cidade, que já existem e destravam todo o resto.
2. Comunidade, grupos, publicações, indicações e eventos, que já existem.
3. Conversas e avisos, que já existem.
4. Negócios, que já existem como `provider_*`.
5. **Anúncios (desapegos e imóveis): reconciliar o estado do protótipo com o domínio `listings` já modelado nas migrations.** Verificar aplicação do schema, políticas RLS, transições e testes E2E antes de considerar o adaptador concluído.
6. **Planos e patrocínio: confirmar a ausência de um domínio completo de cobrança no backend atual e obter aprovação R3 para a integração comercial.**


## Reconciliação de evidências — 19/10/2026

**Escopo:** comparação estática, por GitHub, deste inventário contra a árvore `main`
do repositório. **Não houve execução do REA, migração do banco, testes E2E, nem
inspeção de políticas RLS em ambiente implantado.**

- O inventário original diz que anúncios, rascunhos e favoritos não têm tabelas.
  Porém `supabase/migrations/20260911043053_listings_market_and_homes.sql`
  cria `public.listings`, `public.property_details`, `public.listing_photos`,
  `public.listing_alerts` e `public.listing_saves`, com policies de acesso.
- `supabase/migrations/20260911043436_listing_lifecycle.sql` cria o histórico
  `listing_status_events` e a RPC `transition_listing` para as mudanças de situação.
- `docs/decisions/ADR-20260909-anuncios-mercado-e-moradia.md` já registra o desenho
  unificado de Mercado e Moradia como aprovado, de risco R3.
- Existem testes de banco em `supabase/tests/listing-market.sql`,
  `supabase/tests/listings-moradia.sql`, `supabase/tests/listing-lifecycle.sql`
  e `supabase/tests/listing-alerts.sql`; sua presença **não equivale a execução
  recente bem-sucedida**.
- A UI do protótipo continua em `localStorage`. O trabalho remanescente é verificar
  campos, contratos, autorização, migração implantada, adaptação de dados e fluxo completo.

**Próxima prova recomendada:** montar matriz de contrato para
`criar rascunho → publicar → pesquisar → salvar → iniciar conversa → alterar situação`,
ligando cada ação de `prototypes/bivaque-html/src/features/listings/` a uma tabela/RPC,
uma policy e um teste de sucesso/negação no backend real.
