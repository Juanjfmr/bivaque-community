# Decisões R3 tomadas por delegação — para ratificação do dono

Em 02/11/2026 o dono delegou ao agente coordenador as decisões R3 do lançamento: "Você pode tomar
decisões R3, apenas me traga no final do trabalho para que eu ratifique." Cada decisão tomada assim
tem um ADR com status `Aceito por delegação — aguarda ratificação`, revisão independente e parecer
do `security-auditor`, e entra nesta lista no mesmo commit.

Ratificar é decidir de novo, com o trabalho pronto à frente. Uma linha rebatida reabre o ADR e o
que dependia dele volta para o quadro.

| ADR | Decisão em uma linha | Aceito em | Revisão e auditoria | Ratificação |
|---|---|---|---|---|
| [ADR-20261101-entrada-unica-por-codigo](ADR-20261101-entrada-unica-por-codigo.md) | Entrada única por Google, Apple ou código no e-mail, sem senha. Emenda de 04/11 (SEC-007): limitador por e-mail e IP no banco, invalidação do código no 6º erro | 02/11/2026, por delegação (lote do F01/LAN-F01) | pendente — sem outro modelo disponível neste executor | — |
| [ADR-20261101-foto-e-resposta-nos-grupos](ADR-20261101-foto-e-resposta-nos-grupos.md) | Foto na publicação e resposta encadeada nos grupos | proposto; aceite no lote de Grupos | pendente | — |
| [ADR-20261102-progresso-da-entrada](ADR-20261102-progresso-da-entrada.md) | O rascunho da entrada mora em tabela própria, com leitura só do dono e escrita só pela rota. Emenda de 04/11 (SEC-007): apagado dentro do provisionamento, para todos os caminhos | 02/11/2026, por delegação (lote do F01/LAN-F01) | pendente — sem outro modelo disponível neste executor | — |
