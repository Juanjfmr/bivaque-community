---
id: ADR-20260829-guia-auto-curadoria-evidencia
status: proposed
risk: R3
owner: Juan
approved_at: 2026-08-29
expires_at:
linked_plan: docs/agents/tasks/SEC-001.task.yml
critic_verdict: pending
critic_review:
supersedes_if_approved: ADR-20260815-guia-curadoria-ia
---

# Guia autoalimentado por evidência comunitária

## Problem

O ciclo de indicações já produz conhecimento local útil, mas hoje duas falhas impedem que esse
conhecimento vire um ativo cumulativo do Bivaque:

1. um membro pode abrir um pedido semanticamente equivalente a outro já respondido no mesmo
   escopo, fragmentando respostas e repetindo a mesma pergunta;
2. respostas úteis só chegam ao Guia de Chegada por uma fila de promoção manual operada por
   `service_role`.

A segunda falha é estrutural. Um produto nacional por localidade não pode depender de um operador
lendo e promovendo cada indicação. O operador seria o gargalo proporcional ao próprio crescimento
da comunidade.

O ADR anterior (`ADR-20260815-guia-curadoria-ia`) tentou reduzir esse trabalho com
**IA sugere → operador aprova**. Essa solução ainda mantém revisão humana no caminho feliz e cria
uma dependência externa/LGPD desnecessária para o primeiro mecanismo de consolidação.

Em 2026-08-29, o dono decidiu explicitamente que a curadoria ordinária não pode ser humana: a
comunidade deve autoalimentar o guia e humanos devem tratar apenas exceções.

## Decision

Adotar **convergência de demanda + consolidação automática por evidência independente**.

### 1. Convergência antes de criar um pedido

Ao preencher um pedido de indicação, o cliente procura pedidos semelhantes que o próprio membro
já tem autorização para ler, limitados ao mesmo `category` e ao mesmo escopo de origem
(`locality_id` ou `group_id`).

Quando houver correspondência suficiente, a interface mostra primeiro o conhecimento existente:

- `Ver respostas` abre o pedido já existente;
- `Acompanhar` usa `recommendation_saves`, portanto novas respostas continuam chegando ao mesmo
  tópico;
- `Perguntar mesmo assim` permanece disponível. Similaridade é uma sugestão de convergência,
  nunca uma restrição de escrita ou uma unicidade semântica no banco.

O mecanismo não atravessa RLS, não mistura cidade com grupo e não revela existência de conteúdo
que o chamador não poderia ler normalmente.

### 2. Resposta passa a poder declarar a entidade indicada

`recommendation_replies` ganha um campo estruturado opcional `subject_name` (nome do serviço,
local, profissional ou entidade recomendada). O texto livre continua existindo para contexto.

O campo é explícito na UI — por exemplo, **“Quem ou qual lugar você indica?”** — porque extrair um
nome canônico silenciosamente de prosa livre exigiria heurística frágil ou modelo externo.

Não entram neste mecanismo CPF, endereço residencial, preço, pagamento ou dado de contato. O
objetivo da estrutura é identidade da indicação, não criar cadastro comercial por inferência.

### 3. Só pedidos de localidade alimentam o guia municipal

Respostas de pedidos com `group_id` nunca são promovidas automaticamente para uma superfície de
localidade. Conteúdo compartilhado num grupo não ganha audiência municipal por efeito colateral.

Somente respostas cujo pedido de origem tenha `locality_id` podem gerar evidência para o guia da
mesma localidade.

### 4. Evidência independente, não volume bruto

Uma entidade consolidada é identificada por:

`(locality_id, recommendation_category, normalized_subject_name)`.

A contagem relevante é o número de **autores distintos** que a recomendaram, não o número de
respostas. Um mesmo membro não consegue fabricar confiança respondendo várias vezes.

Estados:

- `candidate`: 1 recomendador distinto; não aparece no guia público;
- `published`: 2 ou mais recomendadores distintos; aparece automaticamente;
- `needs_review`: conflito/ambiguidade detectado pelo mecanismo de consolidação; sai do caminho
  automático até tratamento de exceção;
- `suppressed`: exceção removida da leitura pública por governança/moderação.

Se edição ou exclusão de respostas reduzir a evidência abaixo do limiar, a entidade volta a
`candidate`. Publicação não é irreversível.

O limiar inicial de 2 é deliberadamente simples e falsificável. Não é reputação pública nem nota
de prestador; é apenas a quantidade mínima de fontes independentes para transformar conversa em
referência comunitária.

### 5. Guia público mostra proveniência agregada, não identidade

Uma entrada comunitária publicada mostra nome, categoria e algo como **“Confirmado por 3 membros”**.
O guia não publica quem recomendou nem replica o texto integral das respostas.

O membro continua podendo abrir os pedidos de indicação que já tem autorização para ler, mas o
novo acervo não cria um atalho para conteúdo de grupos ou para identidades dos autores.

### 6. Humano apenas no caminho de exceção

O operador deixa de aprovar item por item. A fila administrativa passa a existir para exceções,
por exemplo:

- nomes quase iguais que parecem representar a mesma entidade;
- conflito entre consolidações;
- conteúdo reportado/moderado;
- necessidade de suprimir ou fundir entradas.

A ausência de operador não impede publicação quando as regras determinísticas de evidência são
satisfeitas.

### 7. IA externa sai do caminho crítico

Nenhuma chamada externa é necessária para a primeira versão. O bloqueio jurídico de envio de
texto comunitário a um modelo externo deixa de bloquear a autoalimentação do guia.

IA pode voltar futuramente para sugerir fusões/normalização, mas qualquer saída que altere o guia
continua subordinada a um ADR próprio e não substitui a evidência comunitária.

## Trust boundaries

1. **RLS continua soberana.** Similaridade só considera linhas visíveis ao chamador.
2. **Escopo não sobe silenciosamente.** Grupo nunca alimenta localidade automaticamente.
3. **Autores distintos.** Evidência é `count(distinct author_id)`.
4. **Sem promoção comercial implícita.** `subject_name` não cria conta/ficha de prestador nem
   concede alcance pago.
5. **Sem dado de contato inferido.** O guia automático não copia telefone/site/endereço da prosa.
6. **Demissão automática.** Perda de evidência derruba `published` para `candidate`.
7. **Moderação prevalece.** Conteúdo excluído/suprimido não permanece como evidência ativa.

## Alternatives considered

1. **Continuar 100% manual.** Rejeitada: custo cresce linearmente com o uso.
2. **IA sugere → operador aprova.** Rejeitada como caminho feliz: ainda preserva o gargalo humano
   e introduz transferência de texto a terceiro.
3. **IA publica direto.** Rejeitada: alucinação e ausência de evidência independente.
4. **Uma única indicação publica.** Rejeitada: um membro isolado vira curador de fato.
5. **Bloquear pedidos semanticamente duplicados.** Rejeitada: similaridade tem falso positivo e
   contextos aparentemente iguais podem ter necessidades diferentes.
6. **Convergência + duas fontes independentes.** Escolhida: reduz fragmentação e cria um limiar
   auditável, reversível e sem fornecedor externo.

## Data model target

A implementação aprovada deve, no mínimo:

- adicionar `subject_name` opcional a `recommendation_replies`;
- criar uma projeção de guia comunitário por localidade/categoria/nome normalizado;
- manter `evidence_count` por autores distintos;
- recalcular estado em INSERT/UPDATE/DELETE de evidência;
- habilitar e forçar RLS na nova projeção;
- permitir SELECT autenticado somente de `published` dentro da localidade visível;
- manter escrita da projeção fora do cliente (trigger/função privada), sem GRANT de INSERT/UPDATE
  para `authenticated`;
- criar índices para localidade/categoria/nome e para o caminho de recomputação;
- provar por pgTAP os caminhos positivos e negativos de RLS e escopo.

## Rollout

1. Entregar primeiro a convergência não bloqueante de pedidos, que reutiliza a leitura existente.
2. Entregar a estrutura `subject_name` e a projeção comunitária atrás dos gates R3.
3. Backfill é **não automático**: respostas históricas sem `subject_name` permanecem como estão.
   Não inferir entidade retroativamente de texto livre.
4. Exibir entradas comunitárias publicadas no Guia ao lado do acervo legado, com origem visual
   distinta.
5. Manter o fluxo manual legado apenas para itens já existentes e tratamento de exceções durante
   a transição; ele deixa de ser requisito para o caminho feliz.

## Success metrics

- proporção de tentativas de novo pedido que convergem para tópico existente;
- redução de pedidos semanticamente repetidos por localidade/categoria;
- número de entradas comunitárias `published` por localidade;
- tempo mediano entre primeira e segunda recomendação independente;
- taxa de entradas depois rebaixadas/suprimidas;
- taxa de exceções `needs_review`.

Reabrir o limiar de 2 se a taxa de supressão/rebaixamento superar 10% das entradas publicadas em
uma janela de 90 dias, ou se a densidade local tornar o tempo até a segunda evidência inviável.

## Risks

- **Colisão de nomes.** Duas entidades diferentes podem normalizar para o mesmo texto. Mitigar com
  normalização conservadora e fila `needs_review`, sem fuzzy merge automático.
- **Brigading.** Duas contas coordenadas conseguem atingir o limiar. A mitigação inicial é acesso
  controlado + autores distintos + moderação; sinais reputacionais exigem decisão separada.
- **Dado pessoal no nome.** Um profissional pessoa física pode ser uma indicação legítima. O guia
  deve tratar o nome como conteúdo comunitário público ao escopo local e oferecer o mesmo caminho
  de denúncia/supressão aplicável ao restante do produto.
- **Taxonomia ampla.** `recommendation_category` é mais ampla que o antigo Guia de Chegada. A UI
  deve apresentar isso como guia comunitário/local, sem fingir que todo item é “chegada”.
- **False positive na convergência.** Nunca bloquear a criação; sempre manter “Perguntar mesmo
  assim”.

## Reversal cost

Baixo a médio. A projeção comunitária é derivada das respostas estruturadas; pode ser descartada
e reconstruída. `subject_name` é aditivo e opcional. Desligar a publicação automática não apaga
as conversas de origem.

## Approval

A direção de produto foi aprovada explicitamente pelo dono em 2026-08-29. Por ser R3, este ADR
permanece `proposed` até receber revisão independente (`critic_verdict: PASS`) e evidência dos
gates de segurança/runtime exigidos pelo harness. A implementação que cruza a trust boundary não
pode ser considerada fechada antes disso.
