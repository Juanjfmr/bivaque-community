# R3 — primeira revisão independente de segurança, 25/10/2026

Veredito **FAIL estático, parcial**. Revisor independente do produtor e do coordenador,
sem acesso à defesa/logs do produtor. Nenhum banco ou teste de exploração executado.
Base `5e43e7d7`; migration não rastreada, com alterações durante a revisão.
Snapshot de 2863 linhas: SHA256
`F89646EE7FD00465B97DAEB01E94CDCE2C61E5A64F00BE8FA99D4AE934F5E97F`.
Arquivo: `supabase/migrations/20261025113717_redesenho_comunidade.sql`.
Referências abaixo são deste snapshot, não de versões posteriores.

1. **HIGH — contas suspensas/em exclusão ganham vínculo e administram.**
   `join_group:765` usa apenas is_locality_member; create_group:712 usa apenas
   is_verified_locality_member. Helpers não verificam conta ativa. RPCs administrativas
   590/797/825/906/933 dependem só de papel. Negativos: suspenso entra em Aberto, dono
   suspenso remove membro, exclusão aberta cria grupo/pedido. G3/E6/F11 devem negar.
2. **HIGH — não participante escreve em Aberto.** can_write_post_to:328 aceita
   visibility=open OR is_group_member; policies 2508/2544/2588 herdam. Negativos:
   membro da cidade sem membership do grupo publica, comenta e reage. R2 nega.
3. **HIGH — organizador transforma evento Fechado em evento da cidade.**
   events_update_organizer:2695 só preserva organizer_id; grants permitem UPDATE da
   tabela; triggers vigentes não congelam escopo/estado. Negativos: group_id para NULL,
   troca locality_id, status/recorrência/sistema, escrita em Encerrado.
4. **HIGH — transplante de comentário e metadados alteráveis.**
   comments_update_own:2563 autoriza novo post_id sem congelar o anterior. Post
   update:2518 preserva só group_id por trigger antigo. Negativos: mover comentário
   Fechado → Aberto; trocar id/created_at/post_type/autoria/escopo de conteúdo.
5. **HIGH — nomes dos reagentes expostos.** post_reactions SELECT:2581 libera linhas
   de qualquer post legível e grant inclui user_id. R2/P4 permitem contagem e reação
   própria, nunca lista de pessoas. Provar contagem útil sem revelar quem reagiu.
6. **HIGH — consumidores de bloqueio incompletos.** profile_posts_for:1134,
   storage:2842, perguntas:2719, RSVP:2701–2712, profile_events_for:1446, DM vigente.
   Comentário SELECT:2532 consulta autor do post em vez do comentário. Substituir
   block_allows só na transação de teste e provar veto em todos os consumidores;
   corpo true em produção desta etapa continua autorizado, assinatura não muda.
7. **HIGH — notificação após perder grupo.** leave_group:965/remove_group_member:933
   não retiram RSVPs; notify_event_change:2244 e reminders:2403 não revalidam acesso.
   outbox_delivery_allowed vigente só confere preferência. Negativos: sair/remover
   corta RSVP e lembrete de Fechado; item já enfileirado também é recusado antes da entrega.
8. **HIGH — Encerrado ainda aceita mutações.** Aprovação/promoção/remoção não
   conferem status; set_group_rules/set_group_notify_level/transfer_group_ownership
   vigentes não foram substituídas; RSVP permite escrita com mera leitura.
   Negativos: promoção, aprovação, preferência e RSVP após arquivamento.

**Aplicabilidade bloqueada:** DROP TYPE group_visibility:143 mantém dependentes
create_group/list_available_groups_for_interests/suggest_groups_for_user; post_type:164
mantém retornos de feeds/perfil. CREATE OR REPLACE não troca arbitrariamente retorno.
Rever dependências nome a nome e obter replay pela fila, sem CASCADE cego.

Salvaguardas vistas: transação, exclusões nomeadas, search_path vazio, digest/e-mail
de convite, revogação de escrita direta em membership, notify_level fora do SELECT.
Não anulam os achados. Revisão final exige snapshot estável, negativos executáveis,
estado persistido e regressão da fundação; seed e cobertura ainda não examinados.

## Conferência inicial do coordenador

Contra contrato/matriz, sem usar a defesa do produtor, foram também observados:
can_write_post_to aceita não membro em Aberto; updates/deletes perdem controles
de conta ativa/grupo; update_guard_group_direct_update ainda permite nome/descrição/
regras diretamente, embora R2 exija RPC. Conferir grants padrão de hidden_posts:
criar policy não revoga privilégios herdados, em especial TRUNCATE que ignora RLS.
Exigir negativo com papel real e estado persistido, não teste de string ou nome.

Rodada de reparo 1 de até 3 por achado. Não há PASS ou autorização de integração.
