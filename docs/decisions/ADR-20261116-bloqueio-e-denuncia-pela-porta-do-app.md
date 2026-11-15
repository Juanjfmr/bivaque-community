# ADR-20261116 — bloqueio e denúncia de mensagem pela porta do app

- Status: Aceito por delegação — aguarda ratificação do dono (16/11/2026, lote RUN-165/F09)
- Decisor: agente coordenador (mandato de 02/11); revisão independente e parecer de segurança registrados no card no fechamento
- Lotes afetados: F09 (conversas, avisos, preferências), fase 6 (troca do `/messages`)

## Contexto

O bloqueio entre pessoas existe no banco (`dm_blocks`, policies próprias provadas em pgTAP) e o
efeito de escrita é o vigente: bloquear fecha a conversa nos dois sentidos, a caixa mantém o
histórico legível, e o bloqueado não descobre o bloqueio. Mas o app nunca teve o verbo: a rota
`/api/app/voce/bloqueados` só lista e desbloqueia, e o gesto existia só na web antiga — hoje
sombrada pelo 307 de `/messages`, ou seja, quase morto no produto. Denunciar mensagem pelo app
também não tem rota (o alvo `message` existe no enum de reports e na fila do operador). Critério
"inteira" do lançamento e a régua de conduta (F04/F09) pedem os dois gestos antes que a tela
antiga saia de vez (fase 6).

## Decisão

1. `POST /api/app/voce/bloqueados` com `{ id }`: sessão + CSRF pelo molde ADR §5; insert em
   `dm_blocks` pelo cliente da sessão — o banco é quem autoriza (permissão de próprio), sem
   `service_role` no cliente; duplicata idempotente; auto-bloqueio recusado; nenhuma resposta
   revela o estado de quem foi bloqueado (404 para id inválido, sem eco de erro do banco).
2. `POST /api/app/mensagens/[id]/denuncia` (alvo `message`), reusando a validação compartilhada
   de `lib/reports` e o mapa de erros das denúncias existentes (visibilidade pela leitura sob a
   sessão → 404; conteúdo próprio → 403; duplicata → 409).
3. Gestos na `Conversa.tsx` com o `Confirmacao` existente; o texto promete apenas o que vale hoje
   ("a conversa com esta pessoa fica fechada") — esconder conteúdo/cortar fila de notificação é a
   frente D1/D2 do ADR-20261023, deliberadamente adiada, e não entra aqui.
4. Preferência de avisos do tipo `messages` ("Mensagens") na UI e no contrato do app (coluna e
   matriz tipo×canal já existem; sem migration).

## Consequências

- O gesto existe no app ANTES da remoção da tela web `/messages` (lote RUN-166), sem perda de
  cobertura no critério 6.
- Bloquear/desbloquear passa a ser prova E2E de duas sessões (destino do aviso de DM já é
  `/app/conversa/{id}` por NOTIF-DEEPLINKS; este lote só comprova em runtime).
- A cópia de `Bloqueados.tsx:80` (promete esconder conteúdo) fica marcada para reconciliar no
  mesmo card — ou o texto é ajustado, ou D1/D2 vira cartão próprio com o dono decidindo no marco.
