# Onda T — a transferência

> Plano de execução. Escrito em **2026-08-16**. Marque `- [x]` conforme avança e **commite por
> task**.
>
> Executa
> [`ADR-20260816-transferencia-e-pertencimento`](../../decisions/ADR-20260816-transferencia-e-pertencimento.md).
> **Leia o ADR inteiro antes de abrir qualquer task.** Leia também o
> [`README.md`](README.md) deste diretório.

## O caso, em uma frase

O sargento serve no Rio e é transferido para Manaus. Precisa do Rio para vender o que não vai
levar e passar contatos; precisa de Manaus para achar escola que aceite dependente no meio do
ano, alugar casa e encontrar despachante. **Hoje o produto o obriga a escolher.**

O `BIVAQUE.md` §10 descreve exatamente essa bilateralidade como a razão de dezembro existir —
*"chega gente que precisa de moradia, escola e serviço, e sai gente que precisa vender móvel e
passar contato"*. Esta onda é a implementação disso.

## Pré-requisito duro: a P0

A base de schema vive na **Task 3 da
[P0](2026-08-16-p0-localidades-nacionais.md)** — chave primária `(user_id, locality_id)` em
`locality_memberships`, e `profiles` sem localidade. **Sem ela, esta onda não começa.** Confirme
que rodou antes de abrir a Task 1; se `locality_memberships.user_id` ainda for chave primária
sozinha, **pare e reporte**.

A separação é deliberada e o motivo é o custo assimétrico: mudar chave primária depois de existir
usuário real, sem staging (D42), é a migração que mais dói. O resto — tudo o que está neste
arquivo — é aditivo e pode chegar depois sem migração dolorosa.

## O modelo, e a inversão que ele carrega

**Quem tem prazo é a origem, não o destino.**

Ao declarar a transferência, a cidade de destino vira a localidade corrente **imediatamente** —
é justamente aí que a pessoa precisa entrar cedo, meses antes de mudar. A cidade de origem é que
passa a ser o vínculo que se encerra. Ela está saindo de lá, não chegando.

Isso soa invertido na primeira leitura e é o ponto que decide o schema inteiro. Se você se pegar
modelando "uma membership temporária de destino", parou de seguir o ADR.

## Três fronteiras que esta onda não move

1. **A vila continua sendo concedida pelo dono da comunidade.** A transferência concede acesso ao
   nível **municipal** do destino — guia de chegada, eventos da cidade, vitrine, e poder perguntar
   no nível da cidade. **Não concede vila nenhuma.** D14 e §5.2 permanecem intactas.
2. **Nada é removido sem ato do titular.** A degradação para somente-leitura é o limite. Nenhum
   caminho desta onda apaga membership.
3. **Um vínculo de saída ativo por vez.** Não é multi-membership livre. Se a implementação
   permitir dois, ela virou a alternativa C que o ADR recusou.

## Contexto obrigatório

1. O ADR da transferência, inteiro.
2. `docs/BIVAQUE.md` §3.1 (pertencimento aditivo), §3.4 (densidade), §4.1 (quem atesta o quê),
   §5.2 e D14, §6.2 e D48, **§7.8 (degradar em vez de quebrar — é o princípio da Task 3)**, §10.
3. [`ADR-20260816-shells-e-navegacao`](../../decisions/ADR-20260816-shells-e-navegacao.md) — o
   seletor da Task 4 tem que aterrissar num container, não virar aba.

---

## Task 1: o vínculo de saída

- [x] **Step 1: o modelo**

  `npx pnpm@11.18.0 exec supabase migration new locality_transfer`.

  `locality_memberships` ganha o que distingue os dois papéis. No mínimo: o papel da linha
  (corrente ou saída), a data declarada de saída, e o estado (ativa ou somente-leitura).

  **Uma linha corrente e no máximo uma de saída, por usuário.** Isso é constraint no banco, não
  convenção — um índice único parcial sobre `(user_id)` filtrado pelo papel. Convenção em
  aplicação vira duas linhas de saída no primeiro caminho que alguém esquecer.

- [x] **Step 2: declarar a transferência**

  RPC que, numa transação: cria a membership do destino como **corrente**, e converte a atual em
  **saída** com a data declarada. As duas coisas juntas ou nenhuma — um estado com duas correntes
  ou nenhuma corrente é pior que o bug que estamos corrigindo.

  A pessoa escolhe o destino no catálogo canônico da P0, validado no servidor. **Nunca texto
  livre.**

- [x] **Step 3: a declaração não é verificável, e o comentário diz por quê**

  O Portal atesta que a pessoa é militar, não onde ela serve. Mas a localidade **sempre** foi
  autodeclarada — a §4.1 diz que o Estado nunca vai saber que alguém é de Ajuricaba. Transferência
  declarada não é mais fraca que localidade declarada.

  **Escreva isso em comentário na migration.** Sem ele, alguém vai tentar "reforçar" a
  transferência com CEP ou DDD daqui a três meses — e a P0 já registra por que os dois são
  proibidos.

- [ ] **Step 4: testes**

  pgTAP em `supabase/tests/locality-transfer.sql`: declarar transferência cria destino corrente e
  converte origem em saída; **declarar duas vezes não cria duas linhas de saída** (negativo, e é
  o teste da task); destino fora do catálogo é rejeitado; usuário sem membership não declara nada.

- [ ] **Step 5: gate e commit**

  `feat(locality): declared transfer with origin, destination and term` (`1b3a94a`).

---

## Task 2: o que a transferência concede, e o que não

A task mais fácil de errar por generosidade.

- [x] **Step 1: o nível municipal do destino abre**

  Guia de chegada, eventos da cidade, vitrine quando existir (onda G), e poder **perguntar** no
  nível da cidade. Isso é o caso inteiro: escola, casa, despachante.

  `private.is_locality_member` já devolve verdadeiro para as duas localidades sem alteração
  (`20260802000300:21-26`) — confirme lendo. O trabalho aqui é garantir que nada além do nível
  municipal siga junto.

- [x] **Step 2: nenhuma vila abre**

  Pedir entrada numa vila do destino continua sendo pedido, decidido pelo dono. Esta é a fronteira
  que a §5.2 protege e que o link vazado nunca atravessou — a transferência também não atravessa.

- [x] **Step 3: testes — o negativo é a task**

  pgTAP em `supabase/tests/transfer-scope-denials.sql`:

  | Caso | Esperado |
  |---|---|
  | quem declarou transferência lê o guia do destino | **vê** |
  | lê eventos da cidade de destino | vê |
  | publica pergunta no nível municipal do destino | consegue |
  | continua publicando na vila de origem | consegue (ainda ativa) |
  | lê feed de uma vila do destino sem aprovação | **não vê** |
  | vira membro de vila do destino automaticamente | **não acontece** |
  | lê feed de vila de uma **terceira** cidade | **não vê** |

- [x] **Step 4: gate e commit**

  `feat(locality): transfer grants the municipal level, never a vila` (`T2 closes`).

---

## Task 3: degradar, não quebrar

O princípio é o mesmo do §7.8, requisito 3, que o canal de WhatsApp já adota: falha degrada para
o caminho menor, nunca corta.

**Por que isto não é preciosismo:** transferência militar é cancelada e adiada com frequência. Um
job que corta acesso na data declarada tira a pessoa da comunidade dela por causa de uma ordem que
mudou — e recuperar exige aprovação do dono da vila de novo.

- [ ] **Step 1: o lembrete**

  Antes do prazo, linha no `outbox` (D1) perguntando se a mudança aconteceu. Respeita
  `notification_preferences` — a checagem mora no worker, não neste trigger.

- [ ] **Step 2: a degradação**

  Passado o prazo sem resposta, o vínculo de origem vira **somente-leitura**: a pessoa continua
  vendo, para de publicar. **Nenhuma linha é apagada.**

  Isso é policy de escrita, não remoção de linha. Toda policy de `insert` e `update` de conteúdo
  passa a exigir que a membership da localidade esteja ativa — e essa mudança **nasce na mesma
  migration** que introduz o estado, pela regra 6 da §12. Quatro vazamentos deste repositório
  vieram de ignorar isso.

- [ ] **Step 3: sair de vez é ato da pessoa**

  Uma ação explícita, na tela, com confirmação. Nenhum job apaga membership.

- [ ] **Step 4: e se a transferência for cancelada**

  Reverter: a origem volta a ser corrente e o destino sai. Mesmo cuidado transacional da Task 1
  Step 2. Sem este caminho, quem teve a ordem cancelada fica preso num estado que o produto criou.

- [ ] **Step 5: testes**

  pgTAP em `supabase/tests/transfer-degradation.sql`: passado o prazo, a origem vira
  somente-leitura; **leitura continua funcionando** (positivo — é o ponto da degradação);
  **publicação na origem é negada** (negativo); nenhuma linha de `locality_memberships` some;
  reverter a transferência devolve a origem como corrente.

  E o lembrete: enfileira uma linha antes do prazo; **preferência desligada não enfileira**
  (negativo).

- [ ] **Step 6: gate e commit**

  `feat(locality): the origin degrades to read-only instead of being cut`.

---

## Task 4: o seletor de localidade

Superfície nova. **Ela aterrissa dentro de um container**, conforme o
[ADR dos shells](../../decisions/ADR-20260816-shells-e-navegacao.md) — não vira aba, e a onda E
já terá definido onde.

- [ ] **Step 1: onde ele mora**

  No container do nível de pertencimento, com a cidade corrente visível **sempre**. A pessoa tem
  que saber em qual cidade está falando antes de falar — é a mesma regra 2 da §12 que rege o
  seletor de audiência do compositor, aplicada um nível acima.

  Se a onda E ainda não definiu os containers, **pare e reporte**: pôr o seletor no lugar errado
  agora é criar a décima terceira aba que o ADR existe para impedir.

- [ ] **Step 2: a origem se identifica como tal**

  Quando a pessoa estiver na cidade de origem, a tela diz o que é: saindo, com a data, e o que
  isso significa. Depois da degradação, diz que ali ela só lê, **antes** de ela tentar publicar e
  descobrir sozinha.

  Isto é o que evita a pergunta de suporte que o ADR registra como risco: *"por que eu não
  consigo mais publicar no Rio?"*.

- [ ] **Step 3: o compositor sabe em qual cidade está**

  O seletor de audiência do compositor passa a operar dentro da localidade corrente. Publicar em
  Manaus e na vila do Rio ao mesmo tempo não existe — são duas cidades, dois atos.

- [ ] **Step 4: testes**

  E2E `tests/e2e/transfer-switch.spec.ts`: com transferência declarada, as duas cidades aparecem;
  trocar muda o feed; a origem exibe o estado de saída; depois da degradação, **o compositor não
  oferece publicar na origem** — negativo, e é o que prova o Step 2.

- [ ] **Step 5: gate e commit**

  `feat(nav): locality switcher inside the belonging container`.

---

## Task 5: o sinal de quem está chegando

O subproduto que o ADR reivindica como benefício, e que não custa quase nada depois das Tasks 1 a
3: o produto passa a saber **quem está chegando onde e quando**.

- [ ] **Step 1: a fila do dono da vila enxerga**

  Quem pediu entrada numa vila do destino e declarou transferência aparece como tal na fila de
  aprovação — que a onda E constrói em lote. É contexto legítimo para uma decisão que hoje é
  tomada só pelo nome.

  **Atenção à fronteira:** isso mostra "declarou transferência para cá, chegando em janeiro". Não
  mostra força, situação, OM nem turma — `AGENTS.md:205` e o
  [ADR da OM](../../decisions/ADR-20260811-om-declarada.md) seguem valendo.

- [ ] **Step 2: o console do fundador enxerga**

  Volume de chegadas por localidade, por período. É o dado que decide para onde a operação vai
  em seguida — e substitui o painel de demanda que morreu com a waitlist geográfica (Task 8 da
  P0, Step 3).

  Vive no console do fundador, definido na onda D2.

- [ ] **Step 3: testes**

  pgTAP: a fila do dono mostra a transferência declarada de quem pediu entrada; **não mostra
  nenhum campo de afiliação** (negativo — é o teste que protege a proibição); um dono não vê
  chegadas de outra comunidade.

- [ ] **Step 4: gate e commit**

  `feat(admin): surface declared arrivals to the vila owner and the founder console`.

---

## Task 6: E2E, auditoria visual e reconciliação

- [ ] **Step 1: E2E**

  Um `db:reset` **com seed**, pedido ao dono, uma vez. O cenário do sargento de ponta a ponta:
  declara transferência, lê o guia do destino, continua vendendo na origem, é degradado, e
  continua lendo.

- [ ] **Step 2: auditoria visual**

  `node scripts/visual/loop.mjs` sobre a declaração de transferência, o seletor, o estado de saída
  e a origem degradada. Veredito em `docs/agents/VISUAL_AUDIT-2026-08-XX-onda-t.md`.

- [ ] **Step 3: `PRODUCT_STATUS.md`**

  Linha nova para a transferência. Ela **só sai** de "não existe" quando o ciclo do usuário
  fechar: declarar, usar as duas cidades, ser avisado, degradar e conseguir reverter. Capacidade
  no banco não fecha linha.

- [ ] **Step 4: `BIVAQUE.md`**

  A §10 descreve dezembro como bilateral e o produto passa a atender os dois lados. Registre a
  decisão na tabela §9, apontando para o ADR — com data e motivo, como o documento exige.

- [ ] **Step 5: commit**

  `docs(status): record the transfer cycle`.

---

## Definição de pronto

- Gate verde após cada task.
- O sargento declara transferência e passa a ler guia, eventos e vitrine do destino **sem perder
  a publicação na origem**.
- Ele consegue **perguntar** no nível municipal do destino antes de morar lá.
- Ele **não** obtém acesso a vila nenhuma do destino sem aprovação do dono — teste negativo.
- No fim do prazo a origem degrada para somente-leitura, e **nenhum acesso é removido sem ato do
  titular**.
- Transferência cancelada é revertida sem perda.
- O perfil dele é **um só**, com um nome e uma foto, nas duas cidades.
- Um vínculo de saída ativo por vez, garantido por constraint no banco.
- Nenhum campo de força, situação, OM ou turma foi criado, exibido ou persistido.

## O que esta onda não faz

Múltiplas localidades sem limite — recusada no ADR. Histórico de mudanças de localidade como
superfície. Vitrine (G). Suspensão e denúncia unificada (H). Afiliação declarada: o ADR da OM
segue `proposed`, e **enquanto estiver, a proibição é o contrato**.
