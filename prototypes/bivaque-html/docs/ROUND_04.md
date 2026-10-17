# Bivaque — Rodada 04: Comunidades, Grupos e Memória/Indicações

Data: 14/10/2026. Contrato: `docs/agents/tasks/HTML-004.task.yml` (R2). Base: `a4c7e223`.

**Veredito: PASS.** Grupos, moderação e Memória/Indicações comprovados em execução, com 3 defeitos corrigidos e gate completo verde.

## Decisão de produto aplicada

Em grupo fechado, **quem aprova o pedido de entrada é o moderador** (decisão do
usuário, 14/10/2026). O pedido fica pendente até haver uma decisão; nada é aprovado
por tempo. No protótipo:

- **grupo de terceiros:** "Controles do protótipo → Simular decisão do moderador"
  lista os pedidos pendentes, com Aprovar e Recusar. O texto deixa claro que é
  simulação;
- **grupo que a pessoa modera:** "Gerenciar grupo → Pedidos de entrada", que já
  existia;
- aprovação e recusa geram aviso com link para o grupo. Depois de uma recusa, é
  possível pedir de novo.

## Defeitos encontrados e corrigidos

Cada um tem checkpoint que falhou antes e passa depois.

1. **Grupo fechado aprovava sozinho em 4,5 s** (`join-group`) e o aviso falava em
   "admin". Era o defeito conhecido desde a Rodada 01 (categoria 2 no inventário). O
   timer foi removido e o aviso agora fala no moderador.
2. **Aprovar ou recusar pedido anunciava sucesso com falha de gravação** e tirava o
   pedido da lista sem salvar (`approve-req`/`deny-req`). Agora só avisa se gravou;
   índice inexistente é ignorado.
3. **Revisão independente (MEDIUM):** ao decidir o último pedido, o aviso "Nenhum
   pedido aguardando" encobria a confirmação da decisão. Agora o diálogo só fecha e a
   confirmação continua visível.

Também foi corrigida uma prova instável da Rodada 02. A troca de cenário era lida
antes de a gravação assíncrona terminar; a captura da falha mostrava a troca já
aplicada. A pausa fixa virou espera pela condição. O app não mudou nesse ponto.

## Comprovado em execução

Prova: `scripts/bivaque-html/round04-proof.mjs`. São 13 checkpoints por contexto, em
375/768/1440 × claro/escuro:

- entrar e sair de grupo aberto;
- grupo fechado pendente sem aprovação por tempo, inclusive após 6 s e após reload;
- moderador aprova (aviso com link, confirmação visível) e recusa (aviso; novo
  pedido possível);
- simulador sem pedidos mostra estado vazio;
- admin aprova e recusa pedidos; com falha de gravação, não anuncia nem remove o pedido;
- admin só sai com moderador nomeado;
- criar grupo valida nome curto e duplicado; editor com texto pede descarte;
- publicação e comentário com tamanho mínimo; enquete exige ser membro;
- pergunta e resposta com tamanho mínimo, acompanhar, resolver, reabrir, curtir e
  ver origem.

| Prova | Resultado |
| --- | --- |
| Referência, build determinístico, testes do builder | PASS |
| Rodada 04, matriz completa | PASS, 78/78, 0 erros JS, 0 requisições externas |
| Regressão Rodada 03 | PASS, 108/108 |
| Regressão Rodada 02 | PASS, 72/72 |
| Regressão Rodada 01 | PASS |
| Visual | PASS |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |
| Revisão independente | 1 MEDIUM corrigido; 2 LOW abaixo |

Candidato: `7a638d2bec91919963ffd43b804fce0310ace8653c2b480ee566b1aa221920ca`.

## Pendências registradas

- LOW: o diálogo do moderador abre a partir do painel lateral do protótipo e fecha
  com a animação vertical (só estético); `closeDialog(true)` sem `await` nesse ponto
  é inofensivo.
- O "Resolveu" de comentário é protegido pela interface (só o autor vê o botão); o
  handler não revalida o autor. É de baixo risco no protótipo, mas precisa de
  verificação no backend real.
- A moderação real (fila do moderador, notificações para outras pessoas) depende de
  backend.
- Próxima pelo roadmap: **05 Eventos e Conversas/Notificações**. O inventário traz
  `create-event`, `edit-event`, `attend-event` e outros que hoje abrem a explicação de
  dependência futura.
