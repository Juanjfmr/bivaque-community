# Bivaque — Rodada 20: balões de conversa

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-020.task.yml` (R1). Base: `863d49fd`.
Sétimo item da ordem aprovada. Referências: Chat Bubble e Message Reactions, do 21st.dev.

**Veredito: PASS.**

## O que mudou

- **Grupos:**
  - mensagens seguidas da mesma pessoa, no mesmo dia e com menos de 5 min entre elas, formam
    um grupo;
  - os cantos se juntam e a hora aparece só no fim do grupo.
- **Dias:** separador "Hoje", "Ontem" ou a data. Mensagens antigas sem horário não ganham hora
  nem dia; antes mostravam a hora atual.
- **Estado:** a última mensagem, quando é sua, mostra "Salva no aparelho". Nada é enviado de
  verdade, e o texto não promete entrega.
- **Reações:**
  - nas mensagens recebidas, com 4 opções (Curtir, Amei, Haha, Obrigado);
  - ficam salvas no aparelho, e tocar na reação a remove;
  - o seletor fecha com Esc, clique fora ou Tab, e o foco volta ao gatilho;
  - sem perfil verificado ou em cidade só de consulta, explica o motivo antes de abrir;
  - o leitor de tela ouve qual mensagem recebeu a reação.
- **Entrada:** mensagem nova desliza ao entrar, uma vez só. O histórico não anima ao abrir, e
  com movimento reduzido nada anima.
- Os balões de grupos e pedidos não mudaram.

## Revisão independente

Sem CRITICAL nem HIGH.

- **MEDIUM corrigido:** com o seletor aberto, a busca aberta pelo teclado perdia o primeiro
  Esc. Agora o seletor fecha quando o foco sai dele, e o Esc só é dele com o foco na conversa.
- **MEDIUM corrigido:** "Enviada" prometia entrega numa demonstração local. Agora o estado é
  "Salva no aparelho".
- **LOW corrigidos:**
  - seletor fechado ao sair com Tab;
  - rótulo do gatilho e anúncio com um trecho da mensagem;
  - área de toque maior;
  - bloqueio explicado antes de abrir;
  - histórico de outro cenário sem animação;
  - horário corrompido ignorado;
  - hora e estado em 11 px.

## Método

A partir desta rodada, a pedido do usuário, cada rodada roda só a prova nova (375 e 1440,
claro) e o gate. A revisão independente passa a ser uma por lote, e as provas antigas da área
rodam na bateria completa do fechamento. Esta rodada ainda teve revisão própria e uma rodada
das provas antigas da conversa, antes das correções.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 20 (11 verificações; 375 e 1440, claro), depois das correções | PASS, 22/22 |
| Rodada 20 contra o código sem a rodada | FAIL esperado, 7/8 vermelhas |
| Rodadas 03, 06, 07, 10, 11 e 17 (antes das correções da revisão) | PASS |
| Gate completo | PASS |

Candidato: `9647fa63…`. A bateria completa e o novo congelamento visual acontecem no fechamento
do lote.
