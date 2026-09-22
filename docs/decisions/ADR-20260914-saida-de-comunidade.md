---
id: ADR-20260914-saida-de-comunidade
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-14
expires_at:
linked_plan:
critic_verdict: pass
critic_review: Veredito registrado por autorização explícita do dono (Juan) em 14/09/2026, seguindo o precedente do ADR-20260816-transferencia-e-pertencimento. Não houve revisor independente — este campo não afirma revisão independente, e sim que o dono aceitou o draft como contrato vigente.
---

# Sair da comunidade é ato do titular, e o conteúdo permanece

## Problem

A prancha 43 desenha duas ações que o runtime não tem: **"Sair"** no hero da comunidade
(`43-web-comunidade-grupos`) e **"Cancelar pedido"** no estado de pedido pendente. O grep em
`apps/web` não encontra nenhum `leave_community`, `cancel` de membership ou equivalente: hoje um
membro não consegue sair de uma vila sozinho, e um pedido pendente fica preso até o dono decidir —
inclusive quando o solicitante já não quer mais entrar.

Isto é R3 pela `RISK_MATRIX.md`: remover uma linha de membership mexe em RLS, em dados pessoais
(quem participa de onde) e no alcance de conteúdo de terceiros. A decisão que falta não é de UI —
é de contrato: o que acontece com o conteúdo de quem sai, com o acesso aos grupos, e com o caso do
dono.

## Decision

**Proposta:** a saída é um ato do titular, imediato, sem aprovação de terceiros, e não apaga o que
ele já construiu na vila.

1. **Saída imediata.** O membro sai quando quiser; a linha de `community_memberships` é removida
   pelo próprio titular, via RPC `security definer` que resolve o caller no servidor. Nenhum
   terceiro aprova a saída.
2. **O conteúdo permanece, atribuído.** Publicações, respostas e reações continuam na vila com o
   `display_name` do autor. Sair não apaga conteúdo de terceiros nem o próprio: apagar conteúdo
   tem fluxo próprio (denúncia/operação) e jamais é efeito colateral de saída.
3. **Grupos caem junto, sem apagar nada.** O acesso aos grupos da vila é consequência da
   membership; ao sair, o acesso cessa e nada é removido dos grupos. A regra existente de acesso
   por grupo permanece intacta.
4. **Reentrada exige novo pedido e nova aprovação do dono.** Não há janela de arrependimento nem
   restauração automática: reentrar é pedir de novo.
5. **Pedido pendente pode ser cancelado pelo solicitante** antes da decisão. O cancelamento
   remove o pedido e notifica o dono pelo `outbox`; o motivo do cancelamento não é coletado.
6. **O dono não sai sozinho.** Enquanto for o único dono, a saída exige transferir a administração
   antes; este ADR **não** constrói transferência de dono — registra isso como pré-requisito
   separado (card próprio) para que "Sair" não deixe comunidade órfã.
7. **Denúncia aberta não bloqueia a saída.** O vínculo de participação termina; os registros de
   denúncia já existentes permanecem e seguem o fluxo da operação. Sair não é rota de fuga de
   moderação — é só a saída da sala.
8. **Nada de dado novo.** A operação não coleta motivo, não exporta dados e não cria superfície de
   histórico de entradas e saídas. A UI segue a prancha 43: confirmação explícita antes de sair
   ("Sair" no hero) e "Cancelar pedido" no corpo do pedido pendente.

## Alternatives considered

### A. Saída imediata com conteúdo preservado

**Escolhida.** Trata o titular como dono da própria participação e a vila como sala: sair não
reescreve o que aconteceu nela. É a alternativa de menor perda para os dois lados e a única que
não inventa um novo fluxo de moderação.

### B. Saída com anonimização do autor

Rejeitada. Quebra o contexto das conversas (a pergunta fica sem quem perguntou, e as respostas
ficam sem destinatário) sem ganho real de privacidade: `display_name` já é o nome público de
exibição, e o produto nunca prometeu apagar a autoria ao sair.

### C. Saída degradada para somente-leitura

Rejeitada para vila. É o modelo que a origem da localidade usa
(`ADR-20260816-transferencia-e-pertencimento`, decisão 4), mas ali existe o evento de
transferência e um prazo real. Numa vila, meia-presença confunde exatamente a permissão que a
vila existe para governar — quem participa e quem não.

### D. Manter a mediação pela operação

O comportamento de hoje: sem caminho próprio, a saída vira pedido de suporte. Rejeitada: transforma
um direito do titular em fila humana e mantém o pedido pendente preso a uma decisão alheia.

## Market or reference baseline

Produtos de comunidade tratam sair como ação do membro e preservam o conteúdo: o Discourse permite
"leave group" mantendo postagens; Slack permite sair de canais e workspaces com histórico
preservado; o Reddit permite "leave" de subreddits sem apagar comentários. Anonimização na saída é
rara e normalmente ligada a exclusão de conta, não a saída de comunidade.

## Proposed divergence from baseline

**Divergência pequena e deliberada.** O caso "dono sai" costuma ser resolvido com transferência de
propriedade automática (Slack promove outro admin). Aqui ele fica explicitamente fora de escopo e
bloqueado até existir transferência de dono — porque o dono da vila é quem aprova entrada, e
promover alguém automaticamente concederia poder que ninguém escolheu.

## Evidence and sources

- Prancha 43 (`docs/design/visual-guide-2026-09-06/43-web-comunidade-grupos.png`) — "Sair" no hero
  e "Cancelar pedido" no pedido pendente.
- `.visual/compare/julgamento.md` — 43: itens 1 e 5 registram as duas ausências; grep sem
  `leave_community`/cancelamento em `apps/web`.
- `supabase/migrations/` — `community_memberships` e as policies de participação; a saída precisa
  de RPC `security definer` no mesmo padrão das demais operações de membership.
- [`ADR-20260816-transferencia-e-pertencimento`](ADR-20260816-transferencia-e-pertencimento.md) —
  "degradar em vez de quebrar" para a origem; aqui a vila termina por ato do titular.
- [`ADR-20260820-suspensao-de-conta`](ADR-20260820-suspensao-de-conta.md) — bloqueio e denúncia
  são autodefesa e permanecem; nenhum dos dois depende de continuar membro.
- `docs/BIVAQUE.md` §5.2 / D14 — a vila é concedida pelo dono; sair não muda quem concede.

## Benefits

- Devolve ao titular uma ação que hoje depende de terceiro.
- Destrava a prancha 43 sem inventar moderação nova: conteúdo fica, permissão termina.
- Fecha a última brecha do ciclo de participação (pedir → ser aprovado → participar → sair).
- O cancelamento do pedido limpa a fila do dono de pedidos que já morreram.

## Risks

- **Saída por engano.** Mitigação: confirmação explícita na UI (prancha 43) e reentrada por novo
  pedido — o custo do engano é um pedido, não uma perda de conteúdo.
- **Evasão de moderação.** Um membro com denúncia aberta sai da vila. Mitigação: os registros de
  denúncia persistem e a operação segue com eles; a saída não apaga evidência nem suspende nada.
- **Comunidade órfã.** O dono único sai e deixa a vila sem quem aprove entradas. Mitigação:
  decisão 6 — a saída do dono fica bloqueada até existir transferência de administração.
- **Expectativa de restauração.** Quem sai espera voltar sem pedir. Mitigação: a UI diz
  explicitamente que a entrada precisa de nova aprovação.
- **RLS mal recortada.** Um delete amplo demais apagaria vínculo de terceiro. Mitigação: RPC
  `security definer` com `auth.uid()` resolvido no servidor e pgTAP negativo (terceiro não apaga
  vínculo alheio).

## Reversal cost

Baixo. Reverter significa deixar de oferecer a ação (código + UI) — as memberships removidas são
um estado legítimo e não precisam de restauração em massa. O custo sobe depois de lançamento
apenas no suporte ("quero voltar"), que a reentrada por pedido cobre.

## Success metric

A decisão é considerada implementada quando:

1. um membro sai da vila sozinho e o conteúdo dele permanece visível e atribuído;
2. o acesso aos grupos da vila cessa na saída, provado por teste negativo;
3. um pedido pendente é cancelado pelo solicitante e some da fila do dono;
4. um terceiro **não** consegue remover vínculo alheio (pgTAP negativo);
5. o dono único não consegue sair — recebe a instrução de transferir a administração.

## Reopen condition

Reabrir se a saída virar rota de evasão de moderação em volume mensurável (membros com denúncia
aberta saindo e reentrando), ou se a reentrada por novo pedido produzir carga de suporte
desproporcional — o sinal seria pedidos de reentrada repetidos do mesmo usuário em janela curta.

## Approval

Aprovação humana explícita por Juan em **2026-09-14** ("Aprovo", na sessão de revisão dos ADRs desta data). As oito decisões — saída imediata, conteúdo preservado e atribuído, grupos caem sem apagar, reentrada por novo pedido, cancelamento do pedido pendente, dono não sai sozinho, denúncia aberta não bloqueia a saída e nenhuma coleta nova — foram aceitas como estão. `critic_verdict: pass` registrado por autorização do dono, sem revisor independente disponível. A implementação está destravada (`RECON-050`).
