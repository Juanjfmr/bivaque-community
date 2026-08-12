# Onda C — devolver a fala

> Plano de execução. O banco proíbe palavras que a comunidade usa todo dia. Marque `- [x]`
> conforme avança e **commite por task**.
>
> Onda pequena e quase toda de banco. Ela bloqueia as ondas F e G: não dá para construir
> pedido de indicação com "plano", "preço" e "telefone" proibidos, nem vitrine onde o
> vendedor não pode escrever o preço.

## O que está acontecendo

Quatro tabelas têm `CHECK` que rejeita **palavras**, não comportamento:

`posts.content` e `comments.content`, por
`20260802001300_fix_forbidden_content_regex.sql:15,21`, bloqueiam: anônimo, vídeo,
marketplace, comercial, venda, compro/compra, IA, verificado publicamente, selo de
verificação, organização militar, **OM**, **patente**, **posto militar**, graduação militar,
endereço residencial, **CEP**, **CPF**.

`recommendation_requests.title/body` e `recommendation_replies.body`, por
`20260802001100_recommendations.sql:36-41,55-63`, bloqueiam: pago, pagamento, compra, venda,
anúncio, patrocín, **preço**, promoção, desconto, oferta, contrat, **plano**, assinatura,
mensalidade, **whatsapp**, **telefone**, **celular**, ligue, contato comercial.

O efeito real, numa rede **para militares**:

| A pessoa escreve | Resultado |
|---|---|
| "Alguém sabe se a OM já divulgou a escala?" | rejeitado |
| "Cuidado com golpe pedindo CPF" | rejeitado |
| "Qual sua patente?" | rejeitado |
| "Procuro plano de saúde para dependente" | rejeitado |
| "Alguém tem o telefone do despachante?" | rejeitado |

E falha como violação de constraint do Postgres, não como mensagem de produto.

Dois agravantes. Por causa do `\y`, as entradas `contrat` e `patroc[ií]n` só casam com os
tokens exatos — "contrato" e "patrocínio" passam limpos. O filtro bloqueia "plano de saúde" e
deixa passar "patrocínio". E o conteúdo real da comunidade é ilegal no schema: o grupo de
classificados da vila anuncia peixe com preço por pacote.

A decisão está em `BIVAQUE.md` D21.

## Contexto obrigatório antes de começar

1. [`docs/BIVAQUE.md`](../../BIVAQUE.md) §4.3 e D21.
2. `AGENTS.md` — migration aplicada **não se edita**; toda mudança entra timestamped via
   `npx pnpm@11.18.0 exec supabase migration new`.
3. `AGENTS.md` §Known traps — sem dev server e sem captura entre `db:reset` e `test:db`.

---

## Task 1: derrubar as constraints de posts e comentários

- [ ] **Step 1: migration**

  `supabase migration new drop_forbidden_terms_check`. Ela dá `drop constraint` em
  `post_no_forbidden_terms` e `comment_no_forbidden_terms`.

  Não recrie versão mais frouxa. O mecanismo inteiro sai: abuso passa a ser tratado por
  denúncia e moderação, que é o que a D21 determina.

- [ ] **Step 2: `db:reset` e `test:db`**

  Vai quebrar. É esperado — a Task 3 conserta.

---

## Task 2: derrubar as constraints de indicações

- [ ] **Step 1: migration**

  `drop constraint` em `recommendation_no_commercial_title`,
  `recommendation_no_commercial_body` e `recommendation_reply_no_commercial`.

  Pode ir na mesma migration da Task 1 se preferir uma só — são a mesma decisão. Se separar,
  mantenha as duas na mesma sequência de commit.

---

## Task 3: os pgTAP que afirmam a rejeição

**Atenção.** Estes testes passam hoje e vão falhar depois das Tasks 1 e 2. Eles não estão
errados: eles afirmam o comportamento antigo. Precisam mudar junto, no mesmo todo.

- [ ] **Step 1: localizar**

  Conhecidos: `supabase/tests/community-feed-denials.sql:150-155` (post com "marketplace") e
  `:289-294` (post com "comercial" e "venda"). **Varra o diretório inteiro** — pode haver
  outros que eu não mapeei, inclusive em `recommendations-scope-denials.sql`.

- [ ] **Step 2: inverter o que afirmam**

  Onde o teste afirmava rejeição, ele passa a afirmar **aceitação**. Não apague o caso: um
  post contendo "marketplace" agora deve ser inserido com sucesso, e isso merece asserção
  tanto quanto a rejeição merecia.

  Acrescente os casos que motivaram a decisão: "Qual sua patente?", "Procuro plano de saúde",
  "Alguém tem o telefone do despachante?". Se algum deles falhar, sobrou constraint.

- [ ] **Step 3: verde**

  `db:reset` seguido de `test:db`, sem dev server e sem captura rodando. E `db:lint` sem erro.

- [ ] **Step 4: gate e commit**

  `feat(content): drop the vocabulary filter from the database`.

---

## Task 4: o espelho no cliente

**O defeito.** O mesmo regex existe **no frontend**, em
`apps/web/app/components/bivaque/feed-post.tsx:186` e `:560`. Derrubar só a constraint deixa
o cliente bloqueando as mesmas palavras — a pessoa nem chega a tentar.

- [ ] **Step 1: remover as duas ocorrências**

  E qualquer helper que só exista para elas.

- [ ] **Step 2: procurar outros espelhos**

  Varra `apps/web` por fragmentos do regex — `an[ôo]nimo`, `organiza[çc]`, `patente`. Se
  houver terceira cópia, ela sai também.

- [ ] **Step 3: teste**

  Unitário: um post com "patente" e um com "preço" passam pela validação do cliente.

- [ ] **Step 4: gate e commit**

  `fix(content): remove the client-side mirror of the vocabulary filter`.

---

## Task 5: aviso de PII, que substitui o bloqueio

A D21 troca bloqueio por aviso. O produto continua tendo interesse em que ninguém publique o
próprio CPF por descuido — só não vai mais impedir.

- [ ] **Step 1: detectar padrão, não palavra**

  A diferença é o ponto inteiro desta onda. Detectar **um CPF de verdade** — onze dígitos, com
  ou sem máscara, com dígito verificador válido — e **um CEP formatado**. Nunca a palavra
  "CPF".

  Valide o dígito verificador: sem isso, qualquer sequência de onze números vira alarme falso
  e o aviso perde credibilidade em uma semana.

- [ ] **Step 2: avisar, não impedir**

  Antes do envio, no compositor e no formulário de pedido: "Isso parece um CPF. Quer mesmo
  publicar?" com as duas saídas, e a de publicar funcionando.

- [ ] **Step 3: teste**

  Positivos — CPF com e sem máscara, CEP formatado. Negativos — a palavra "CPF", telefone de
  onze dígitos, sequência de onze dígitos com verificador inválido, valor em reais.

  O negativo aqui vale mais que o positivo: aviso que dispara à toa é ignorado, e aviso
  ignorado é o mesmo que aviso ausente.

- [ ] **Step 4: gate e commit**

  `feat(privacy): warn on real PII patterns instead of blocking words`.

---

## Task 6: a regra `forbidden-copy` da auditoria visual

**O defeito.** `scripts/visual/capture.mjs` tem uma regra que reprova a exposição de posto e
OM na tela. Com afiliação declarada permitida (ADR da OM), o critério muda: o que precisa ser
reprovado é exibir esses campos **como se o sistema os tivesse verificado**.

- [ ] **Step 1: ajustar o critério**

  Declaração do membro passa. Asserção do sistema não. Na prática: rótulo que apresenta o
  campo como dado verificado reprova; campo marcado como declarado passa.

  O commit `1724c3d` já refinou essa regra uma vez para detectar exposição em vez de menção
  crua — leia o que ele fez antes de mexer.

- [ ] **Step 2: teste de escopo**

  Em `tests/scope/`: a regra reprova o caso de asserção do sistema e aprova o de declaração.

- [ ] **Step 3: gate e commit**

  `fix(audit): forbidden-copy targets system assertion, not member declaration`.

> Esta task pode ser adiada para quando o ADR da OM for aprovado. Se for, **registre no
> `PRODUCT_STATUS.md`** em vez de deixar implícito.

---

## Task 7: veredito e reconciliação

- [ ] **Step 1: auditoria visual** sobre `/community` e `/recommendations`, as duas telas com
  campo de texto tocado.
- [ ] **Step 2: veredito** em `docs/agents/VISUAL_AUDIT-2026-08-XX-onda-c.md`.
- [ ] **Step 3: reconciliar** as linhas de "Conteúdo" no `PRODUCT_STATUS.md`.
- [ ] **Step 4: commit** `docs(status): close wave C and record the visual verdict`.

---

## Definição de pronto

- As cinco frases da tabela de abertura são publicáveis, e existe teste provando cada uma.
- Nenhum espelho do regex sobrou em `apps/web`.
- O aviso de PII dispara em CPF válido e não dispara na palavra "CPF".
- `db:lint` limpo, pgTAP verde, gate verde.

## O que esta onda não faz

Não altera `AGENTS.md:205` sobre organização militar — depende do
[ADR](../../decisions/ADR-20260811-om-declarada.md), que está `proposed`. Não implementa
afiliação declarada, que é a onda E. Não constrói moderação de conteúdo comercial, que é a
onda H.
