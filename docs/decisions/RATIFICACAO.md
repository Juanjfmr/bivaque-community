# Decisões R3 tomadas por delegação — para ratificação do dono

Em 02/11/2026 o dono delegou ao agente coordenador as decisões R3 do lançamento: "Você pode tomar
decisões R3, apenas me traga no final do trabalho para que eu ratifique." Cada decisão tomada assim
tem um ADR com status `Aceito por delegação — aguarda ratificação`, revisão independente e parecer
do `security-auditor`, e entra nesta lista no mesmo commit.

Ratificar é decidir de novo, com o trabalho pronto à frente. Uma linha rebatida reabre o ADR e o
que dependia dele volta para o quadro.

| ADR | Decisão em uma linha | Aceito em | Revisão e auditoria | Ratificação |
|---|---|---|---|---|
| [ADR-20261101-entrada-unica-por-codigo](ADR-20261101-entrada-unica-por-codigo.md) | Entrada única por Google, Apple ou código no e-mail, sem senha. Emenda de 04/11 (SEC-007): limitador por e-mail e IP no banco, invalidação do código no 6º erro. Emenda de 04/11 (SEC-008): verificação limitada por IP, teto global de envio, reset das tentativas só depois do GoTrue, invalidação pelo estado da conta, segredo do limitador sem padrão em produção, IPv6 pelo /64, RLS forçada; DoS dirigido a um e-mail aceito. Emenda de 05/11 (RUN-004): envio por IP em 8/h, global em 500/h só como disjuntor, e a decisão do dono de que o CPF pode devolver nome e resultado (o vínculo nome–militar é público no Portal) | 02/11/2026, por delegação (lote do F01/LAN-F01) | SEC-007: revisão independente de 04/11 sobre `1ea22a9f` (reviewer, PASS com ressalva: I-1, I-2, M-1, M-5) e auditoria do `security-auditor` de 04/11 sobre `1ea22a9f` (LIBERA com M1, M2, L1 a L5); as ressalvas são fechadas pelo SEC-008, exceto o resíduo do `/auth/v1/verify` público (L5), aceito no ADR e levado a BLOCK-RESEND. SEC-008: revisão independente e auditoria do lote ainda pendentes (o executor não revisa o que implementou). RUN-004: pendente a nova revisão do PR #128 | — |
| [ADR-20261101-foto-e-resposta-nos-grupos](ADR-20261101-foto-e-resposta-nos-grupos.md) | Foto na publicação e resposta encadeada nos grupos | proposto; aceite no lote de Grupos | pendente | — |
| [ADR-20261102-progresso-da-entrada](ADR-20261102-progresso-da-entrada.md) | O rascunho da entrada mora em tabela própria, com leitura só do dono e escrita só pela rota. Emenda de 04/11 (SEC-007): apagado dentro do provisionamento, para todos os caminhos. Emenda de 04/11 (lote B): o combinado com a versão do Código de Conduta mora em `entry_commitments`, tabela própria com leitura só do dono e sem escrita de cliente. Emenda de 05/11 (RUN-004): o provisionamento troca o rascunho por um marcador da etapa seguinte (a tela não escreve mais), o marcador some na última etapa e o rascunho abandonado expira em 30 dias aplicados no servidor | 02/11/2026, por delegação (lote do F01/LAN-F01) | pendente — sem outro modelo disponível neste executor; revisão do lote B (combinado) e da emenda do RUN-004 também pendentes | — |
