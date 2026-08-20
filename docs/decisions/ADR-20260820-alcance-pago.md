---
id: ADR-20260820-alcance-pago
status: accepted
risk: R3
owner: Juan
approved_at: 2026-08-20
expires_at:
linked_plan: docs/superpowers/plans/2026-08-20-onda-g-vitrine.md
critic_verdict: PASS
critic_review: Revisao adversarial executada em 2026-08-20 na mesma sessao que escreveu o ADR — o critico NAO foi independente, e isso fica registrado aqui em vez de ser omitido. A revisao achou e corrigiu seis defeitos de implementabilidade antes da aprovacao (helper inalcancavel por policy, leitura de display_name negada pela RLS, sync_paid_reach contradizendo a tolerancia de 7 dias, recurso sem tabela, revogacao de ficha sem task, e uma citacao de migration errada sobre exclusao de conta). Nenhum defeito atingiu as decisoes em si. Veredito PASS.
---

# O que o prestador compra quando paga, e o que o dinheiro nunca compra

## Problem

A onda G é a única com receita (`BIVAQUE.md` §10.2), e a §7 já decidiu a **linha**: acesso
nunca se cobra, amplificação se cobra. O que a §7 **não** decidiu é o contrato operacional que
uma migration e um webhook precisam ter para existir:

- o que exatamente o pagante recebe, em unidades que a RLS consiga expressar;
- o que acontece com o alcance quando o pagamento atrasa, falha ou é cancelado;
- quanto custa;
- como o produto **prova**, e não apenas promete, que a ordenação não mudou.

Sem isso, a implementação decide sozinha — e cada uma dessas quatro respostas é irreversível
depois que houver o primeiro prestador pagante, porque muda o que ele comprou depois de ele ter
comprado.

A `RISK_MATRIX.md` classifica `monetização`, `pricing` e pagamento como R3. Este é o ADR.

## Decision

**1. A unidade vendida é o escopo, e é uma linha de tabela.** O alcance de uma ficha é o
conjunto de escopos onde ela aparece: `('community', <id>)` ou `('locality', <id>)`. O
prestador nasce com **uma** linha `source = 'free'` — a comunidade que o indicou — e ela é
**permanente, completa e nunca cobrada** (D28). Comprar alcance é ganhar linhas
`source = 'paid'`: outras vilas, e o nível municipal.

**2. Assinatura mensal, preço único de lançamento: R$ 49/mês.** Cobre **todas** as vilas da
localidade mais o nível municipal — não se vende vila avulsa. Na implementação isso é **uma**
linha `('locality', <id>, 'paid')`, não uma linha por vila: `private.can_see_provider` resolve
o escopo `locality` contra `locality_memberships`, que todo membro da cidade tem, inclusive
quem mora em vila. Inserir uma linha por comunidade daria o mesmo resultado hoje e quebraria
amanhã, quando uma vila nova nascer depois da assinatura. O número fica no piso da faixa de
R$ 40 a 80 do §7.5, que já é o Nextdoor
([US$ 32 a 150/mês por CEP](https://powerdigitalmarketing.com/blog/nextdoor-advertising-cost/))
ajustado para baixo. Preço único porque um prestador pequeno brasileiro não compara planos: ele
decide se paga ou não.

**3. Falha de pagamento tem sete dias de tolerância.** `past_due` mantém o alcance pago ativo
por 7 dias corridos, com aviso pelo canal de retorno; depois disso, as linhas `paid` são
desativadas. Cancelamento desativa no fim do período já pago. **Em nenhum dos casos a linha
`free` é tocada** — enterrar quem parou de pagar é o proibido nº 2 do §7.3, e é o proibido que
circula numa comunidade onde todo mundo se conhece.

**4. A ordenação nunca lê o dinheiro, e existe um teste para provar.** `search_providers`
devolve `reach_source` para a UI **rotular**, e a cláusula `order by` não o menciona. A onda G
Task 5 tem uma asserção de pgTAP cuja única função é ficar vermelha se alguém "otimizar" isso:
duas fichas na mesma categoria, uma paga e outra grátis, com nomes escolhidos para que a ordem
natural coloque a grátis primeiro.

**5. Alcance pago é declarado, visivelmente.** Toda ficha exibida num escopo por
`source = 'paid'` carrega o rótulo **"Alcance patrocinado"**, na busca e na própria ficha. É o
filtro 2 do §7.4: *o que o pagante comprou está declarado como pago, visivelmente? Se não, é
engano.*

**6. Asaas, checkout hospedado, cartão nunca toca o Bivaque** (D41). O produto guarda uma
referência opaca (`external_reference`), reage a webhook assinado e idempotente, e **nunca**
persiste dado de cartão nem o CNPJ/CPF do pagante. Retry automático em laço é proibido — a
regra que o §7.9 fixou contra o Portal vale para qualquer terceiro; quem reentrega é o
provedor.

**7. O que nunca entra na venda**, e não é lista aberta: posição em resultado, prioridade em
indicação, ausência do rótulo, remoção de concorrente, anúncio em feed, e crédito consignado
militar em qualquer forma (§7.3, D29).

**O que não muda:** o Bivaque não intermedia o pagamento do serviço (D26, §7.3 regra 1, §12
regra 8). O que se cobra é produto da plataforma. A fronteira é entre *ser o caixa da transação
alheia* e *vender o que é seu*.

## Alternatives considered

**A. Comissão por transação** — o modelo de marketplace clássico (GetNinjas cobra o prestador
por lead). Rejeitada por decisão herdada e por viabilidade: a D26 proíbe intermediar transação,
e meio de pagamento traz regulação, obrigação fiscal e disputa de estorno que um fundador solo
não sustenta (§7.3). Ela também exigiria observar a transação, que é justamente o que o produto
não quer saber.

**B. Cobrar por lead / por conversa iniciada** — o modelo do GetNinjas. Rejeitada: cria
incentivo para o produto **gerar** conversa, e conversa gerada por incentivo é ruído no canal
que a §1.1 existe para despoluir. Também torna o preço imprevisível para quem paga, que é o
oposto do que um prestador pequeno tolera.

**C. Freemium por recurso** — catálogo limitado no grátis, ilimitado no pago. Rejeitada: a D28
garante ficha **completa** na própria vila. Limitar catálogo é cobrar para não ser inferior,
que é vizinho demais do proibido nº 2.

**D. Venda de vila avulsa** — R$ X por vila adicional. Rejeitada por operação, não por
princípio: multiplica estados de assinatura, multiplica caminhos de webhook e transforma o
`provider_reach` numa máquina de billing. Fica registrada como a primeira extensão a
considerar se o preço único não converter.

**E. Patrocínio de momento apenas** (a corrida da vila patrocinada pela academia, §7.2).
Rejeitada como *linha principal* — é sazonal e não sustenta recorrência —, mas **mantida como
linha futura**: ela não conflita com nada aqui e depende da onda de eventos, não desta.

## Market or reference baseline

- **Nextdoor**: ficha gratuita com upgrade pago por CEP,
  [US$ 32 a 150/mês](https://powerdigitalmarketing.com/blog/nextdoor-advertising-cost/), gasto
  típico de pequeno negócio entre US$ 100 e 500/mês. É a âncora de faixa que a §7.5 usa.
- **The Military App**:
  [cobra das organizações, não dos membros](https://www.militaryapp.org/policies/app-terms-and-conditions).
- **GetNinjas**: cobrança por lead, no mercado brasileiro do mesmo público de prestador.
- **Asaas**: Pix e boleto nativos com checkout hospedado — é como prestador pequeno brasileiro
  paga, e é o motivo da D41.

## Proposed divergence from baseline

**Duas.**

1. **Preço muito abaixo da âncora.** R$ 49/mês contra o equivalente a algumas centenas de reais
   no Nextdoor. Deliberado: a vila piloto tem 500 a 600 pessoas, não um CEP americano, e o §7.5
   é explícito ao chamar o número de *hipótese para dimensionar ambição, não meta*.
2. **Nenhum produto de posicionamento.** O mercado inteiro vende posição — "apareça primeiro".
   Aqui a posição não está à venda em nenhuma forma, e há teste automatizado guardando a regra.
   Esta é a divergência que define o produto: numa comunidade onde todos se conhecem, a
   percepção de que a resposta mudou por dinheiro circula em dias e mata o único ativo (§7.3
   regra 3, §7.4 filtro 3).

## Evidence and sources

- `docs/BIVAQUE.md` §7.1 a §7.5 (a linha, as cinco linhas de receita, as doze categorias, os
  cinco proibidos, o filtro de três perguntas, a ordem de grandeza), §10.2, §12 regra 8.
- Decisões D26, D27, D28, D29, D41 na tabela do §9.
- `docs/PRODUCT_STATUS.md` §7, linha "Alcance pago", e §11, linha "Cobrança" — as duas marcadas
  como bloqueio externo por CNPJ.
- `apps/web/lib/portal/client.ts` e `apps/web/lib/portal/guard.ts` — o padrão de terceiro
  server-side com chave em ambiente, throttle e breaker, que o cliente do Asaas segue.
- `packages/domain/src/pii-scrub.ts` — o filtro que roda antes de qualquer log de payload.
- `docs/superpowers/plans/2026-08-20-onda-g-vitrine.md`, Tasks 7 e 8.

## Benefits

- **A única receita do piloto existe**, e existe sem o produto virar caixa de ninguém.
- **O grátis fica melhor, não pior.** A ficha completa na própria vila é o que faz o dono da
  comunidade mandar o link (§5.3); o pago é distribuição adicional, não desbloqueio.
- **O prestador entende o que comprou em uma frase** — "sua ficha aparece nas outras vilas e na
  cidade" — e vê o rótulo que prova.
- **A infraestrutura é pequena.** Uma tabela de assinatura, uma função de sincronização, um
  webhook. Nenhum estado de billing dentro da RLS de conteúdo.

## Risks

- **Percepção de vitrine de duas classes.** Mitigado pela D27: a regra é sobre **papel**, não
  sobre pessoa — o militar como membro nunca paga; o negócio dele, como negócio, paga igual ao
  civil. Escrever ao contrário criaria as duas classes.
- **Webhook perdido deixa alcance pago eterno ou ausente.** Mitigado por `sync_paid_reach` ser
  o **único** caminho que escreve `source = 'paid'`, por idempotência por
  `external_event_id`, e por reconciliação: o estado do banco deriva da assinatura, nunca do
  evento isolado.
- **Cobrança sem CNPJ é impossível** (§7.6, dependente de parecer). É bloqueio externo, e é o
  motivo de o bloco G2 ser separável do G1.
- **Estorno e disputa.** Existem mesmo em checkout hospedado. Aceito: o volume esperado é de
  dezenas de assinaturas, e o Asaas é a parte que responde por elas.
- **Preço errado.** R$ 49 pode ser alto demais para converter ou baixo demais para valer o
  suporte. Mitigado pelo fato de assinatura mensal ser o instrumento mais barato de corrigir
  preço que existe.
- **Churn não estimado.** A §7.5 marca isto como **lacuna** e diz que muda o resultado
  materialmente. Continua lacuna; a métrica abaixo é o primeiro dado real.

## Reversal cost

**Baixo antes da primeira cobrança; médio depois.** Antes: desativar as linhas `paid`, e o
produto volta a ser só G1 sem que ninguém perceba. Depois da primeira assinatura: reembolso
proporcional, comunicação com quem pagou, e o custo reputacional de retirar o que foi vendido —
numa comunidade onde os administradores de vila se conhecem, esse custo é maior que o
financeiro.

O que é **irreversível**: a percepção. Se a primeira versão paga parecer proteção — "pague para
não ser enterrado" —, nenhuma correção posterior desfaz a leitura. Por isso a decisão 3 e a
decisão 4 são as duas que não podem ser flexibilizadas na implementação.

## Success metric

Cento e oitenta dias após a primeira vila abrir com vitrine:

- **≥ 10 assinaturas ativas** (a §7.5 hipotetiza 50 a 100 prestadores pagantes no total; 10 na
  primeira vila é o sinal mínimo de que a hipótese não está morta);
- **churn mensal ≤ 15%** — o primeiro número real para a lacuna que a §7.5 registra;
- **zero** relato, em suporte ou no grupo, de que a busca "favorece quem paga".

## Reopen condition

- Se em 180 dias houver menos de 10 assinaturas com ≥ 15 fichas ativas, o problema é o preço ou
  a proposta: reabrir a alternativa D (vila avulsa) ou revisar o valor.
- Se o churn passar de 25%/mês, reabrir a decisão 2 — assinatura pode ser o instrumento errado
  para um público sazonal, e o patrocínio de momento (alternativa E) passa a ser a linha
  principal.
- Se o Asaas deixar de atender (cobrança internacional, mudança de termos), reabrir a D41.
- Se algum dia se propuser vender posição em qualquer forma, este ADR precisa ser **revogado
  explicitamente** — não emendado.

## Approval

**Aprovado.** Autorizacao explicita do dono (Juan) em 2026-08-20, na sessao de planejamento das ondas G e H: *"Revise as adr, se não tiver nada que impeça o desenvolvimento, pode autorizar"*. A revisao esta registrada em `critic_review` — inclusive a ressalva de que o critico foi o proprio autor do ADR.

Mesmo formato do `ADR-20260816-shells-e-navegacao`, que registra veredito por autorizacao explicita do dono em sessao.

**A aprovacao nao destrava o bloco G2 sozinha.** Falta o **CNPJ**, que depende do veiculo juridico do §7.6 e de parecer profissional, e sem ele nao ha conta Asaas. As Tasks 7 e 8 ficam paradas ate la; as Tasks 1 a 6 da onda G nao dependem disto.

Aprovados junto: o preco de **R$ 49/mes** da decisao 2 e a **tolerancia de 7 dias** da decisao 3 — os dois foram propostos aqui, nao herdados de documento anterior.
