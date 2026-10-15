---
id: ADR-20261015-pedido-aberto-e-propostas
status: approved
risk: R3
owner: Juan
approved_at: 2026-10-15
expires_at:
amends: ADR-20260909-pedidos-e-conversa-contextual (D1 e D5)
critic_verdict:
critic_review:
---

# Pedido aberto: a necessidade vai a todos os prestadores do ramo, que enviam propostas

## Problem

O dono do produto pediu (15/10/2026) um fluxo no estilo GetNinjas. A pessoa descreve a
necessidade, escolhe o tipo de serviço e anexa fotos, se tiver. O pedido é **disparado para
todas as empresas do ramo**, e elas respondem com **propostas de orçamento** (valor, prazo,
data).

O [ADR de 09/09](ADR-20260909-pedidos-e-conversa-contextual.md) decidiu o contrário em dois
pontos: **D1**, pedido com um único prestador fixo, e **D5**, "sem valor, sem prazo". A
condição de reabertura dele se cumpre: *"Se o produto passar a intermediar orçamento [...],
D1 e D5 mudam."*

## Decision

### P1 — Dois tipos de pedido

- **Direto** (mantido, D1 original): a partir da página de um negócio, para aquele prestador.
- **Aberto** (novo): a partir de "Contratar serviço". Vai para os **prestadores elegíveis**:
  - categoria igual à escolhida;
  - mesma cidade;
  - que atendem o bairro informado;
  - página assumida e prestador verificado.

### P2 — Conteúdo do pedido aberto

Categoria, descrição (mínimo de 20 caracteres), bairro (nunca o endereço), "quando"
(o quanto antes / até uma data / data específica) e até 4 fotos opcionais. Prazo para
receber propostas: **7 dias**; depois disso, o pedido expira.

### P3 — Proposta estruturada

Cada prestador envia **uma** proposta por pedido, com:
- **valor**: fixo, faixa ou "a combinar após visita";
- **data disponível**;
- **prazo de execução**;
- **validade da proposta**;
- **mensagem curta**.

O prestador pode editar a proposta enquanto o pedido estiver aberto e retirá-la depois. Um
prestador **não vê** as propostas dos outros.

### P4 — Limite e escolha

O pedido aceita no máximo **N propostas** (padrão 5); ao atingir o limite, sai da fila dos
prestadores. A pessoa compara as propostas lado a lado e **escolhe uma**. A escolha abre a
conversa contextual (D2 original, contexto `service_request`) com aquele prestador; as
outras propostas são **recusadas automaticamente**, com aviso a cada prestador.

### P5 — Situação do pedido

`aberto → com propostas → proposta escolhida (em conversa) → encerrado`, mais `cancelado`
(pela pessoa) e `expirado` (sem escolha em 7 dias). Como no D1 original, encerrado **não
significa serviço prestado nem pago**.

### P6 — O que o Bivaque continua não fazendo (D5 revisado)

O valor passa a ser **exibido** como parte da proposta, mas:
- não há **pagamento, custódia nem garantia**;
- a frase "Valores e pagamento são combinados entre vocês" continua obrigatória;
- **não há cobrança do prestador por proposta** nesta decisão; isso seria monetização, R3, e
  precisaria de ADR própria;
- **não há ranking pago** de propostas: a ordem é a de chegada;
- avaliação de prestador fica fora; pode vir em ADR futura.

### P7 — Privacidade e abuso

- Fotos visíveis **só** aos prestadores elegíveis enquanto o pedido estiver aberto, e depois
  só ao escolhido.
- Aviso para não fotografar documentos, pessoas ou o número da casa.
- Limite de **3 pedidos abertos por pessoa** ao mesmo tempo.
- Denúncia de pedido ou proposta.

## Alternatives considered

1. **Manter só o pedido direto** (D1): seguro, mas não atende à demanda de comparar
   orçamentos.
2. **Pedido aberto sem valor estruturado** (só conversa): volta a misturar estado com
   conversa, que a §4.6 recusa.
3. **Cobrança por proposta**, como no GetNinjas: modelo de receita conhecido, mas mistura
   com monetização, que é uma decisão separada.

## Risks

- **Spam e baixa qualidade:** muitos prestadores respondendo de forma genérica. Mitigação:
  limite N, proposta estruturada e só prestadores verificados.
- **Privacidade das fotos**, agora vistas por vários prestadores (P7).
- **Expectativa:** a pessoa entender que o Bivaque garante preço ou serviço (P6).
- **Concorrência na escolha:** duas escolhas simultâneas. A escolha precisa ser
  transacional.

## Reversal cost

Médio. O pedido direto continua existindo, então desligar o aberto é remover uma entrada e
uma fila.

## Prototype first

Antes de qualquer tabela, o fluxo é implementado no **protótipo HTML**, com prestadores de
exemplo **simulados** (nos Controles do protótipo, como o moderador) e com o lado do
prestador visível para quem tiver "Meu negócio". Só depois de testado com pessoas, o ADR é
aprovado e vai ao backend.

## Approval

**Aprovado em 15/10/2026 pelo dono do produto (Juan), com escopo restrito ao protótipo HTML**,
por resposta explícita na sessão do Claude Code: "Aprovo para o protótipo". As escolhas
feitas na mesma resposta foram:

- limite de **5 propostas** por pedido (P4);
- valor **fixo, faixa ou "a combinar após visita"** (P3);
- **sem cobrança** do prestador por proposta (P6).

**Não autoriza backend.** Tabelas, políticas e funções exigem nova aprovação depois do teste
do protótipo com pessoas. **Nenhum crítico adversarial revisou este ADR.**
