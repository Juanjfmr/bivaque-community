# R2 — Decisões sobre as perguntas da matriz

Os quatro rascunhos da matriz deixaram 31 perguntas. O coordenador fechou 29 em 24/10/2026 por uma regra só: **o
protótipo decide; onde ele não decide, vale o ADR; onde nenhum dos dois decide, fica o comportamento atual e mais
seguro.** As duas que são decisão de produto foram ao dono, que decidiu em 24/10/2026 (seção 2).

**Matriz aprovada pelo dono em 25/10/2026.** A R3 (migration e pgTAP) pode começar a partir dela.

## 1. Fechadas pelo coordenador

| # | Pergunta | Decisão | Base |
|---|---|---|---|
| G1, G5 | Prazo para ler e reabrir grupo encerrado | Sem prazo: os antigos participantes leem e o admin reabre quando quiser | ADR-20261023, seção 3 (escolha do dono) |
| G3, E6, F11 | Conta suspensa ou em exclusão | Não cria, não entra, não pede, não edita, não modera, não contata. Lê o que já podia ler, pelas mesmas regras, e os próprios anúncios, conversas, notificações e denúncias | Regra comum: o estado da conta só tira permissão |
| G4 | Limites dos campos do grupo | Os do protótipo: nome 3 a 60, descrição até 300, regras até 600, aviso fixado até 300 | Protótipo |
| G7 | Funções de interesses e sugestões | Ficam, sem interface nesta leva, e deixam de sugerir grupos Encerrados | ADR-20261023, fora do lote |
| G8 | Ler depois de sair do grupo | Quem sai deixa de ler o conteúdo de grupo Fechado na hora; o que escreveu fica para os membros | ADR-20261023, seção 4 |
| E2 | Confirmações depois de sair ou ser removido | A lista de confirmações é de quem lê o evento; quem perde o vínculo sai das próprias confirmações | ADR-20261023, seção 4 |
| E3 | O organizador conta como presença | Sim, como no protótipo, sem se notificar a si mesmo e sem contar duas vezes | Protótipo |
| E4 | Campos obrigatórios do evento | Os do protótipo: nome 5 a 100, data, horário, local 4 a 160, descrição 12 a 2000, vagas opcionais | Protótipo (`events/editor.js`) |
| E5 | Convite e pergunta ao organizador em evento de grupo | Só entre quem lê o evento; não expõe evento nem lista a quem não é do grupo | ADR-20261023, seção 4 |
| P1 | Tipos de publicação | Publicação, Pergunta e Evento; saem `poll` e `poll_options` | ADR-20261023, seção 4 |
| P2 | Editar e excluir publicação com respostas | O autor edita o texto (marca "editada") e exclui a publicação; comentários de outros saem junto, como no protótipo; a evidência de denúncia fica com o operador | ADR-20261023, seções 2 e 4 |
| P3 | Moderação pelo operador | Como hoje: só operador, com registro, sem o autor restaurar o que foi removido | Comportamento atual |
| P4 | "Útil" | Uma por pessoa por publicação, liga e desliga; mostra a contagem, não a lista de pessoas | ADR-20261023 ("só o rótulo") |
| P5 | Salvos e seguidos em grupo Encerrado | Quem participava continua lendo e pode desfazer; não cria vínculo novo | Regra de Encerrado |
| P6 | Publicação ocultada aberta pelo link | Abre se a pessoa ainda pode ler; ocultar é só da lista pessoal | Protótipo (`profile/hidden.js`) |
| F1, F4 | Busca de prestador e alcance | Como hoje, menos a vila: filtrado pela cidade escolhida, com o alcance que já existe | Comportamento atual; o resto é do lote 6 |
| F2 | Página de negócio sem atestado | Fica para o lote 6 (Negócios); nesta leva nada muda além de tirar a vila | ADR-20261023, fora do lote |
| F3 | Aceitar convite de prestador | O convite do operador é a autorização; só a conta do e-mail convidado aceita | ADR-20261024, seção 6 |
| F5 | Contextos de conversa privada | Só os contextos que já existem, menos a vila, e revalidados na hora | Matriz corrigida pela auditoria |
| F6, F7 | Rascunho e ciclo do anúncio | Como hoje: cidade obrigatória para publicar; as transições de `transition_listing` | Comportamento atual |
| F8 | Tipos de denúncia | Como hoje | Comportamento atual |
| F9 | Retenção da denúncia | Como hoje. O prazo já está pendente com o dono, para a política de privacidade (ADR-20261023, seção 2), e não trava a migration | ADR-20261023 |
| F10 | `notification_type_enabled` e `notification_type_key` | Ficam, com a mesma assinatura; os tipos acompanham comentário e evento | Comportamento atual |

## 2. Decididas pelo dono (24/10/2026)

| # | Pergunta | Decisão |
|---|---|---|
| G2, G6 | Quem é de outra cidade vê nome, descrição e regras de um grupo Fechado? | Não, salvo quem declarou transferência para a cidade do grupo (`declare_locality_transfer`). O conteúdo continua só dos membros |
| E1 | A pergunta feita num grupo Aberto com "também perguntar à cidade": o que acontece com ela na cidade se o grupo fechar, encerrar ou o autor sair? | Continua na cidade: foi feita para a cidade, com aviso. Só o nome do grupo deixa de levar ao grupo para quem não pode lê-lo |
