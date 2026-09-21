---
id: 2026-09-20-resposta-candidata-guia
status: draft-para-decisao
risk: R3 (exige schema e RLS novos)
owner: Juan
created_at: 2026-09-20
linked_task: docs/agents/tasks/DS-006.task.yml
linked_authority:
  - docs/design/visual-guide-2026-09-06/MOBBIN-INDICACOES-2026-09-20.md
  - docs/agents/AUDIT-PRODUCAO-2026-09-19-INICIO.md (correção de 20/09/2026)
  - docs/decisions/ADR-20260909-resposta-que-resolveu.md
---

# Contrato funcional — resposta, referência candidata e religação ao Guia

## 1. Por que este documento existe

O fluxo aprovado em 20/09/2026 para indicações tem uma dependência que **não cabe nos
contratos atuais**:

> uma resposta publicada pela comunidade precisa poder (a) apontar para um item já existente
> do Guia, (b) quando não existe item, publicar-se **imediatamente** enquanto a referência
> **candidata** segue para curadoria humana, e (c) quando a curadoria aprova ou mescla a
> candidata, a resposta original passa a apontar para o item **canônico**.

As três partes têm de ser verdade de servidor. Hoje nenhuma das três é, no momento da
escrita. O contrato `DS-006.task.yml` proíbe explicitamente simular esse vínculo
(`forbidden: fingir que uma resposta esta ligada ao Guia quando nao ha verdade persistida`),
e por isso o DS-006 **não fecha** este fluxo — ele entrega a parte que os contratos atuais
sustentam e registra o resto aqui.

**Estado: pendente de decisão técnica.** Nada neste documento autoriza implementação. Ele
existe para que a decisão seja tomada uma vez, com o custo à vista, em vez de ser improvisada
dentro de uma tarefa visual.

## 2. O que existe hoje, com evidência

| Mecanismo | Onde | O que faz |
|---|---|---|
| `recommendation_replies` | `supabase/migrations/20260802001100_recommendations.sql` | Colunas: `id, request_id, author_id, body, created_at, is_deleted`. **Nenhuma referência ao Guia.** |
| `suggest_guide_entry(...)` | `20260915210000_guide_entry_suggestion.sql:23-126` | Membro com localidade grava linha `pending` em `arrival_guide_entries`, com `source='manual'`, `submitted_by`, localidade **da associação do chamador** (nunca do cliente) e cota de 5 pendentes por pessoa/cidade. Devolve o id. **Não recebe id de resposta.** |
| `arrival_guide_entries.source_reply_id` | `20260821000006_promote_reply_to_guide.sql:88` | Liga um item do Guia à resposta que o originou. |
| `recommendation_reply_promotions(reply_id, guide_entry_id, promoted_by, promoted_at)` | `20260821000006:19-24` | Registra a promoção. `reply_id` é PK → promove no máximo uma vez. `RLS forced`, `revoke all` de `anon`/`authenticated`, `grant all` a `service_role`. |
| `promote_reply_to_guide_entry(...)` | `20260821000006:43-103` | **Operador** (`is_current_user_operator`) cria o item canônico já `approved` e a promoção. É a religação retroativa que existe. |
| Política de leitura do Guia | `arrival_guide_select_approved_locality_member` | `authenticated` lê item **aprovado** da sua localidade — incluindo `source_reply_id`. |
| `mark_recommendation_reply_resolved(request, reply)` + `recommendation_requests.resolved_reply_id` | `20260911025357:94` / `ADR-20260909` | Verdade de servidor sobre **qual resposta resolveu** o pedido. É o sinal de fechamento. |

### O que isso já permite (e o DS-006 usa)

Um membro consegue ler, **com verdade de servidor**, o item canônico ligado a uma resposta
**já promovida**: `arrival_guide_entries where source_reply_id = <reply> and status='approved'`.
É isso que sustenta `Ver no Guia` na prancha 80 — e é implementável sem schema novo. Quando
esse dado não existe, a interface **não pode** exibir vínculo.

### O que não existe

1. **Vínculo no momento da escrita.** Nada grava "esta resposta foi escrita apontando para o
   item X" quando X já existe. `recommendation_replies` não tem coluna para isso.
2. **Atomicidade resposta + candidata.** A resposta entra por INSERT em
   `recommendation_replies`; a candidata entra por RPC separada. São duas idas ao servidor.
   Se a segunda falhar, a resposta já está publicada e a candidata se perde — sem
   reconciliação, sem retry, sem registro de que falhou.
3. **Religação no sentido membro → canônico.** A promoção existe, mas só na direção do
   operador e só a partir da fila. Não há caminho em que a candidata enviada **por causa de
   uma resposta específica** seja depois mesclada no item daquela resposta.

## 3. A decisão técnica necessária

O dono (ou um ADR) precisa escolher **uma** das formas abaixo. As três exigem schema novo, e
por isso as três são R3 — nenhuma pode ser decidida por um agente de implementação.

### Opção A — coluna de vínculo na resposta

`recommendation_replies` ganha `guide_entry_id uuid null references public.arrival_guide_entries(id) on delete set null`.

- **A favor:** menor superfície; leitura trivial; o vínculo imediato passa a existir; uma
  coluna anulável, custo de reversão baixo.
- **Contra:** só resolve (1). Não resolve (2) nem (3) sozinha. Um `guide_entry_id` apontando
  para item `pending` misturaria "item do Guia" com "candidata" no mesmo campo — e a leitura
  pública do Guia filtra `status='approved'`, então a UI teria de saber diferenciar os dois
  estados para não prometer o que não existe.
- **Exige decidir:** a coluna aceita `pending` ou só `approved`? Se aceita `pending`, a
  interface precisa de um estado visual distinto e honesto. Se só `approved`, não resolve o
  caso "referência ausente".

### Opção B — vínculo explícito entre resposta e candidata

Nova relação `recommendation_reply_candidates(reply_id, guide_entry_id, created_at)`, com o
candidato em `pending`, mais uma RPC que **recebe a resposta e a candidata na mesma transação**.

- **A favor:** resolve (1), (2) e (3) de uma vez; mantém "candidata" e "item canônico"
  separados por construção, o que é o que a prancha 80 desenha (chip `Ainda não está no Guia`
  vs. `Ver no Guia`); a religação vira uma atualização de estado do mesmo vínculo.
- **Contra:** mais superfície (tabela + RPC + policies + pgTAP positivo e negativo). Precisa
  decidir o que acontece quando a curadoria **rejeita** a candidata: o vínculo fica órfão? A
  resposta continua exibindo `Ainda não está no Guia` para sempre?
- **Exige decidir:** rejeição, mesclagem em item já existente (deduplicação) e o que acontece
  se a resposta for apagada depois.

### Opção C — não persistir, só a busca

Manter o fluxo como o DS-006 entrega: busca no Guia antes do formulário, vínculo exibido
apenas quando `source_reply_id` o provar, e **nada** de candidata imediata.

- **A favor:** zero schema; é o que os contratos atuais sustentam; honesto por construção.
- **Contra:** não entrega a direção aprovada em 20/09 (publicação imediata + candidata em
  curadoria + religação). Deixa a prancha 80 parcialmente não implementada — e isso precisa
  ficar declarado como divergência, não escondido.
- **Exige decidir:** aceitar formalmente a divergência da prancha 80 por ora, e registrar a
  pendência no card.

**Recomendação do coordenador (não é decisão):** Opção B. É a única que resolve as três partes
sem misturar candidata e canônico no mesmo campo, que é exatamente a distinção que a prancha 80
desenha e que o `forbidden` do DS-006 protege. Custa uma tabela, uma RPC e um par de testes
pgTAP.

## 4. Decisões acessórias obrigatórias (qualquer opção)

1. **Quota.** `suggest_guide_entry` já limita a 5 pendentes por pessoa/cidade. A candidata
   vinda de uma resposta conta para essa cota? A decisão muda a UX quando a cota estoura
   **depois** de a resposta já ter sido publicada.
2. **Falha parcial.** Se a resposta entra e a candidata não, qual é o estado visível? A
   interface não pode dizer "referência enviada para revisão" (prancha 80) sem que isso seja
   verdade. Precisa existir um estado de erro recuperável com nova tentativa.
3. **Rejeição.** O que a resposta exibe quando a curadoria rejeita a candidata.
4. **Mesclagem/deduplicação.** Quando a candidata é mesclada em um item que **já existia**, a
   resposta passa a apontar para o canônico — é a religação da prancha 74.
5. **Exclusão.** `on delete set null` / `on delete cascade` em cada FK nova, e o que a
   interface mostra quando a resposta é apagada.
6. **RLS na mesma migration.** Qualquer tabela nova entra com RLS habilitada **e forçada**,
   policies mínimas e grants mínimos, com pgTAP positivo **e** negativo — a regra que este
   repositório já violou quatro vezes.
7. **Autoria.** Só quem escreveu a resposta pode vincular a candidata àquela resposta; e a
   candidata não pode ser usada para publicar conteúdo no Guia sem a aprovação humana
   (prancha 74: "Nada é publicado automaticamente").

## 5. Aceite para quando isto for implementado

Funcional, provado por interação real de navegador e por pgTAP:

- responder com item existente grava o vínculo e a interface mostra `Ver no Guia` **lendo o
  servidor**, não o estado do cliente;
- responder sem item publica a resposta **na mesma transação** da candidata; falha de uma
  desfaz ou registra a outra de forma recuperável, nunca perde em silêncio;
- a resposta sem correspondência exibe `Ainda não está no Guia` **porque o servidor diz isso**,
  e não porque o cliente escolheu;
- após aprovação/mesclagem, a mesma resposta passa a exibir o item canônico sem novo POST;
- a candidata **não** aparece como item do Guia para outros membros antes da aprovação;
- negativos: outra pessoa não consegue vincular candidata à resposta alheia; membro de outra
  localidade não lê item nem candidata; resposta apagada não deixa ponteiro pendurado.

## 6. Não-objetivos

- Transformar indicação em marketplace, nota, estrela, ranking ou promessa comercial.
- Publicar automaticamente qualquer referência no Guia.
- Introduzir curtida, polegar ou `Isso ajudou?` no fluxo — ver `ADR-20260909`, D4.
- Reabrir a redação do marcador de fechamento. O ADR aprovado fixa `Ajudou a resolver`
  (`ADR-20260909:142-143`), e é o rótulo implementado. **Verificado em 21/09/2026: não havia
  divergência a decidir** — `Resolveu meu pedido` era paráfrase descritiva do mesmo marcador,
  sem ocorrência em imagem ou código. A pendência está fechada; este item segue como
  não-objetivo apenas no sentido de que a string do código não se troca.

## 7. Rastreabilidade

- Contrato que revelou a lacuna: `docs/agents/tasks/DS-006.task.yml` (`traps`, linhas 91-95).
- Card correspondente: `PROD-INICIO-UX-20260919` em `tools/backend-kanban/public/board.json`.
- Card novo desta dependência: `GUIA-RESPOSTA-CANDIDATA` (status `blocked`, com o motivo real).
- Direção de produto: `MOBBIN-INDICACOES-2026-09-20.md`, itens 3, 4 e 5.
- Pranchas: `45-web-publicacao.png` (Guia antes do pedido), `74-web-guia-curadoria.png`
  (aprovação humana), `80-web-recomendacoes.png` (vinculada vs candidata).