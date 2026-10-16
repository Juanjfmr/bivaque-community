# Bivaque — Rodada 17: central de avisos

Data: 15/10/2026. Contrato: `docs/agents/tasks/HTML-017.task.yml` (R2). Base: `0cc6a86c`.
Quarto item da ordem aprovada. Referência: Notification Inbox Popover, do 21st.dev.

**Veredito: PASS.**

## O que mudou

O sino abre a central de avisos, em todas as larguras:

- **Abas.** "Todos (N)" e "Não lidos (M)". Se não houver nada a ler, a aba "Não lidos"
  mostra "Tudo em dia".
- **Marcar todos como lidos.** O botão aparece só quando há aviso não lido. Ele grava apenas
  os avisos da cidade de origem. Se a gravação falhar, a central avisa e mantém os não
  lidos.
- **Grupos.** "Hoje" reúne os avisos de "Agora", "Hoje" e "há N min/h"; os demais ficam em
  "Anteriores".
- **Ícone por tipo:**
  - proposta e pedido;
  - conversa;
  - desapego;
  - negócio;
  - pergunta;
  - encontro;
  - grupo.
- **Não lidos.** Ganham ponto, negrito e fundo no ícone. O ponto continua visível em modo de
  alto contraste.

As ações de abrir e marcar um aviso, e a mensagem de retorno, continuam as mesmas. A prova da
Rodada 01 segue passando.

A prova encontrou dois ícones ausentes na fonte embutida. Um deles, o "marcar como lido",
já aparecia como texto antes desta rodada. Os dois foram trocados por `drafts` e
`check_circle`.

## Revisão independente

Sem CRITICAL nem HIGH.

- **MEDIUM corrigido:** o foco se perdia ao trocar de aba, ao marcar todos e ao marcar um aviso
  na aba "Não lidos". Agora ele volta para a aba atual ou para o próprio aviso.
- **MEDIUM corrigido:** ao voltar de um aviso aberto pela aba "Não lidos", a lista reabria sem
  ele. Agora reabre em "Todos", com o aviso visível e focado.
- **MEDIUM corrigido, lacunas de prova:**
  - a falha de gravação passou a ser conferida no estado;
  - entraram testes para aviso de outra cidade, aviso com HTML, foco e retorno do aviso;
  - entrou o teste de todos os ícones de tipo.
- **LOW corrigidos:**
  - aviso sem data fica em "Hoje", como o texto "Agora" indica;
  - o ponto de não lido aparece em modo de alto contraste.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 17 (8 verificações; 375, 768, 1024 e 1440, claro e escuro) | PASS, 48/48 |
| Rodada 01 (inclui os testes antigos de avisos) | PASS |
| Gate completo | PASS |

Candidato: `ea32bcc0…`. A bateria completa e o novo congelamento visual acontecem no
fechamento do lote.
