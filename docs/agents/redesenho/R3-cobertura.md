# R3 — cobertura da suíte pgTAP por célula da matriz

Revisão base: `66eda09b` (25/10/2026). Suíte nova em `supabase/tests/redesenho-*.sql`,
fixtures em `supabase/tests/fixtures/redesenho.inc`. Cada linha abaixo diz arquivo,
objeto, ação, ator e estado. Onde a célula não tem teste, isso está dito — não há
cobertura inferida de contagem de arquivos.

Fixtures do novo esquema (sem vila):
`810…001` grupo Aberto/ativo, `810…002` Fechado/ativo (dono 001, moderador 002),
`810…003` Encerrado (dono 001), `810…004` Aberto de outra cidade (dono 003).
Atores: 001 dono, 002 moderador do Fechado, 003 outra cidade, 004 cidade sem vínculo,
005 sem cidade.

## R2-matriz-grupos — `redesenho-grupos.sql` (42 asserções)

| Objeto | Ação | Atores/estados | Teste |
|---|---|---|---|
| groups | ler apresentação/regras | cidade (004) Aberto e Fechado; outra cidade (003); não participante em Encerrado; participante (001) em Encerrado | grupos 1–5 |
| groups | roster | cidade lê Aberto; cidade não lê Fechado | grupos 6–7 |
| group_memberships | entrar em Aberto | cidade pela RPC; status aprovado; escrita direta negada | grupos 8–10 |
| group_memberships | pedir em Fechado / estado pendente | cidade | grupos 11–12 |
| group_memberships | entrar em Encerrado | negado | grupos 13 |
| group_memberships | entrar sem cidade | negado | grupos 14 |
| group_join_reasons | ler próprio motivo / por moderador / por terceiro | privacidade | grupos 15–17 |
| group_join_attempts | teto 3/30 dias | 4 tentativas, contagem persistida | grupos 18–23 |
| group_memberships | antipromoção | moderador não promove; papel imutável por UPDATE; dono promove | grupos 24–27 |
| group_memberships | sair / transferir | dono não sai sem transferir; saída após transferir | grupos 28–30 |
| groups | encerrar/reabrir | direto negado; RPC encerra, limpa pendentes; reabre | grupos 31–36 |
| group_memberships | notify_level privado | coluna negada; RPC lê a própria | grupos 37–38 |
| posts | Encerrado é só leitura | não participante; participante | grupos 39–40 |
| grupos | conta suspensa / em exclusão | não cria, não entra | grupos 41–42 |

## R2-matriz-publicacoes — `redesenho-publicacoes.sql` (26 asserções)

| Objeto | Ação | Atores/estados | Teste |
|---|---|---|---|
| posts | ler | cidade em Aberto/Fechado; membro em Fechado; Encerrado; outra cidade | publicacoes 1–5 |
| posts | criar | membro em Fechado; Encerrado negado; sem grupo negado | publicacoes 6–8 |
| comments | criar/editar | autor comenta e edita | publicacoes 9, 13 |
| post_reactions | reagir/unicidade/desfazer | uma por pessoa; retirar própria | publicacoes 10–12 |
| posts | moderação | autor não ressuscita removido | publicacoes 14 |
| post_saves / post_follows | salvar/seguir/privacidade | próprios legíveis, alheios não | publicacoes 15–18 |
| hidden_posts | ocultar/mostrar/privacidade | próprio; ilegível negado | publicacoes 19–22 |
| feed_group / feed_posts | leitura | membro vs cidade; Fechado não vaza | publicacoes 23–26 |

## R2-matriz-evento-pergunta — `redesenho-evento-pergunta.sql` (26 asserções)

| Objeto | Ação | Atores/estados | Teste |
|---|---|---|---|
| events | ler cidade / grupo | membro da cidade; outra cidade; membro do grupo; não membro do Fechado | evento 3–6 |
| events | criar | cidade sem grupo; grupo Fechado | evento 1–2 |
| event_rsvps | confirmar | organizador confirma e conta uma vez (E3, sem autonotificar); membro ok; não membro negado | evento 7–11 |
| event_rsvps | ler lista | quem lê o evento vs quem não lê | evento 10–11 |
| recommendation_requests | origem dupla | membro de Aberto ok; não membro negado; grupo Fechado negado; cidade divergente negada | pergunta 12–15 |
| recommendation_requests | origem inexistente | CHECK | pergunta 16 |
| recommendation_requests | pergunta só da cidade | autor da cidade | pergunta 17 |
| recommendation_requests | projeção na cidade (E1) | permanece após encerrar o grupo | pergunta 21 |
| events | concluir | Encerrado negado; organizador ok; alheio negado; chamador trocado negado | evento 20, 22–24 |
| events | escopo imutável | group_id/locality_id/status direto negado | seguranca 2–4 |

## R2-matriz-vila-fundacao — `redesenho-vila.sql`, `redesenho-seguranca.sql`

| Objeto | Ação | Teste |
|---|---|---|
| communities, community_memberships/invitations/join_reasons | qualquer | vila 1–13 (tabelas, enums, colunas, funções ausentes) |
| storage `community-images` | qualquer | vila 14 (bucket ausente) |
| enums do domínio | valores | vila 15–19 |
| groups/posts | colunas | vila 20–23 |
| provider_accounts / provider_invitations | community_id ausente | vila 8 (nenhuma coluna community_id) |
| provider_reach | escopo cidade | vila 19 |
| listings | audiência cidade | publicacoes + seed (coluna ausente) |
| notifications | bloqueio antes de emitir | bloqueio 11–12 |
| reports | operador resolve | fundação preservada (suíte antiga) |

## Contrato do bloqueio — `redesenho-bloqueio.sql` (12 asserções)

Assinatura, SECURITY DEFINER, search_path vazio, retorno `true`, PUBLIC sem EXECUTE;
consumidores: leitura de posts/comentários/eventos, `profile_posts_for`,
`list_indications`, `event_rsvps`, `notify_group_post`, `notify_comment`. O corpo é
substituído por `false` só na transação do teste e a mudança de comportamento é medida.

## Definições travadas — `redesenho-definicoes.sql` (12 asserções)

RLS ligado e forçado; veto de `USING (true)`; **golden fixo** normalizado de
`USING`/`WITH CHECK` das policies sem subconsulta; conjunto exato de nomes de policy do
domínio; grants por coluna (`notify_level`, `user_id` de reações); triggers por tabela;
self-check que prova que uma policy relaxada com o mesmo nome não passa.

## Negativos da revisão de segurança — `redesenho-seguranca.sql` (27 asserções)

Um negativo por achado HIGH de `R3-revisao-seguranca-1.md` (conta suspensa/em exclusão,
escrita de não membro em Aberto, escopo de evento, transplante de comentário/metadados,
identidade de reagentes, consumidores de bloqueio, notificação após perder o grupo,
mutações em Encerrado).

## O que NÃO está coberto (limites declarados)

- **Golden de texto das policies com subconsulta** (`events_select_locality_member`,
  `events_insert_verified_member`, `comments_insert_member`, `comments_update_own`,
  `post_reactions_insert/select`, `post_saves/post_follows` select/insert,
  `recommendation_requests` ×4, `provider_reach` insert/update/delete,
  `reports_insert_authenticated`, `event_rsvps_select_locality_member`): entram no
  conjunto de nomes, no veto de `(true)` e nos grants, mas a comparação textual exata
  depende de uma captura real do banco (aliases internos de `EXISTS`) e precisa ser
  fixada na rodada do coordenador. Não é cobertura alegada.
- **E2E** (captura, três tamanhos) e **e2e de grupo/publicação** ficam para R4/R5.
- **Migrations antigas adaptadas**: a suíte antiga ainda não foi reconciliada ao esquema
  novo (vila removida) — ver `R3-evidencias.md`.
- **`database.generated.ts`** não foi regenerado (precisa do banco local).