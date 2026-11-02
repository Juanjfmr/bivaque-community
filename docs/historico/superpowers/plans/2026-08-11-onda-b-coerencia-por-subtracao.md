# Onda B — coerência por subtração

> Plano de execução. Sete remoções, todas verificadas no código em 2026-08-11. Marque `- [x]`
> conforme avança e **commite por task**.
>
> Esta onda quase não constrói. Ela para de prometer o que o produto não entrega — o que
> importa porque a entrada é por vila e centenas de pessoas testam tudo no mesmo dia. Botão
> que não faz nada, na primeira sessão, ensina que o produto está quebrado.

## Contexto obrigatório antes de começar

1. [`docs/BIVAQUE.md`](../../BIVAQUE.md) §12, regra 4: **UI só mostra affordance se o fluxo
   fecha hoje.** É a regra inteira desta onda.
2. [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) — as linhas com onda `B`.
3. [`apps/web/AGENTS.md`](../../../apps/web/AGENTS.md). Next 16, com mudanças de API em
   relação ao seu treino. Leia o guia em `node_modules/next/dist/docs/` antes de mexer em
   Server Component.
4. `AGENTS.md` §Known traps — o perfil fantasma do `.visual/` e o `dev-server.pid` velho.

Comandos sempre via `npx pnpm@11.18.0`.

## Antes do primeiro commit

A árvore de trabalho já tem uma modificação pendente em
`apps/web/app/(preauth)/login/components/bivaque-sign-in.tsx`: alguém removeu o campo de
senha morto e deixou o resto. **Ela pertence à Task 1** — não commite separado, incorpore.

---

## Task 1: o login promete senha que não existe

**O defeito.** Não há campo de senha: a entrada é magic link ou Google. Mesmo assim,
`bivaque-sign-in.tsx:252` mostra `<Checkbox name="rememberMe">Manter conectado</Checkbox>` e
`:258` mostra "Esqueci minha senha". O checkbox não é lido por nada; o link não leva a
recuperação nenhuma.

Depois que o campo de senha saiu, os dois ficaram ainda mais incoerentes: oferecem recuperar
uma senha que nunca existiu.

- [ ] **Step 1: remover os dois**

  Tirar o checkbox e o link. Não substitua por "em breve" — isso é a mesma promessa com outra
  roupa.

  Se o `rememberMe` estiver sendo enviado em algum submit, confirme que nada no servidor o
  lê antes de remover.

- [ ] **Step 2: a duração da sessão fica explícita**

  Sem "Manter conectado", a pessoa merece saber quanto tempo a sessão dura. O cookie está
  configurado em `apps/web/app/auth/callback/route.ts:6-11` com `maxAge` de 400 dias.
  Uma linha discreta abaixo do botão de entrar basta.

- [ ] **Step 3: teste**

  E2E ou unitário: as strings "Manter conectado" e "Esqueci minha senha" não aparecem em
  `apps/web/app`.

- [ ] **Step 4: gate e commit**

  `fix(ui): drop the password affordances from a passwordless login`.

---

## Task 2: o chevron de localidade

**O defeito.** `apps/web/app/components/bivaque/app-shell.tsx:89-93` renderiza um `MapPin`,
o texto "Manaus, AM" e um `ChevronDown` dentro de uma `<div>` — sem `onClick`, sem `button`,
sem menu. O chevron é a convenção universal de "clique para trocar", e não há para onde
trocar: o piloto tem uma localidade só.

- [ ] **Step 1: remover o chevron**

  Manter o pin e o texto, que informam onde você está. Tirar só o `ChevronDown`.

  Quando existir mais de uma localidade, o seletor volta — e aí como botão de verdade.

- [ ] **Step 2: teste**

  Unitário sobre o componente: o contexto de localidade renderiza o nome e não renderiza
  controle acionável.

- [ ] **Step 3: gate e commit**

  `fix(ui): remove the locality chevron that opens nothing`.

---

## Task 3: foto e enquete no compositor

**O defeito.** `feed-composer.tsx:62-84` tem dois botões, "Foto" e "Enquete", com
`aria-label` completo. Nenhum dos dois tem implementação: não há upload de imagem em post,
não há tabela de enquete, não há renderização de nenhum dos dois no feed.

- [ ] **Step 1: remover os dois botões**

  Inclusive os `aria-label`, que hoje anunciam a leitores de tela uma função inexistente —
  isso é pior que o botão visual, porque quem usa leitor de tela não tem como descobrir que
  não funciona senão tentando.

- [ ] **Step 2: teste**

  Unitário: o compositor não expõe controle de foto nem de enquete.

- [ ] **Step 3: gate e commit**

  `fix(a11y): remove photo and poll controls that have no implementation`.

---

## Task 4: dois textos que prometem o que não vem

**Os defeitos.** `groups/page.tsx:102` mostra "0 de 3 passos concluídos" — um indicador de
progresso de onboarding de grupo que nunca sai de zero, porque os três passos não existem.
E `events/[id]/page.tsx:237` mostra a seção de comentários com o texto "Em breve.".

- [ ] **Step 1: remover o contador de passos**

  Tirar a linha e o que só existir para sustentá-la.

- [ ] **Step 2: remover a seção de comentários do evento**

  A seção inteira, não só o texto. Cabeçalho sem conteúdo continua prometendo.

- [ ] **Step 3: teste**

  As strings "de 3 passos" e "Em breve" não aparecem em `apps/web/app`.

- [ ] **Step 4: gate e commit**

  `fix(ui): remove the empty group progress counter and the event comments stub`.

---

## Task 5: salvar publicação não tem onde ser lido

**O defeito.** `community/page.tsx:119-150` grava e apaga em `post_saves`, e lê de volta —
mas só para pintar o ícone de salvo. **Não existe tela que liste o que foi salvo.** A pessoa
salva, o dado persiste, e ela nunca mais encontra aquilo.

A aba "Salvas" que existe em `/recommendations` é outra coisa: lê `recommendation_saves`,
tabela diferente, e tem os próprios defeitos, que a onda F trata.

- [ ] **Step 1: remover a ação de salvar do post**

  Botão, estado e as chamadas a `post_saves`. **Não crie migration** — a tabela fica, os
  dados ficam, e a onda F traz a affordance de volta junto com o destino.

  Isso é remover para readicionar depois, o que parece desperdício. É deliberado: a regra 4
  do §12 não abre exceção por "vai voltar logo", e affordance sem destino no dia do
  lançamento custa mais que o retrabalho.

- [ ] **Step 2: teste**

  O feed não expõe controle de salvar.

- [ ] **Step 3: gate e commit**

  `fix(ui): remove post saving until there is somewhere to read it back`.

---

## Task 6: perfil oculto sai do produto

**O defeito.** O enum tem dois valores desde
`20260802000100_locality_profile_foundation.sql:8`, e `profile/page.tsx:193,372,384` oferece
a escolha. A copy promete que o perfil "fica oculto para outros membros" — promessa que a
policy de comunidade e o endpoint de avatar nunca cumpriram.

A decisão D09 remove o estado. Ver `BIVAQUE.md` §4.3.

- [ ] **Step 1: a pré-condição, antes de qualquer código**

  Consultar se existe perfil **não-seed** com `visibility = 'hidden'`:

  ```sql
  select count(*) from public.profiles where visibility = 'hidden';
  ```

  **Se houver, pare.** Virar a chave em silêncio inverte uma decisão de privacidade que a
  pessoa tomou. Reporte o número e espere instrução — a saída é avisar cada uma, e isso é
  decisão do dono, não do executor.

  Se for zero, ou só linhas do seed, siga.

- [ ] **Step 2: remover a escolha da UI**

  A seção de visibilidade sai de `profile/page.tsx`. Todo perfil passa a ser visível aos
  membros.

- [ ] **Step 3: migration**

  Nova, timestamped, via `npx pnpm@11.18.0 exec supabase migration new remove_hidden_visibility`.
  Ela converte as linhas restantes para `locality_members` e restringe o domínio da coluna.

  **Não edite** `20260802000100`. E revise se alguma policy referencia `'hidden'` — a policy
  aditiva `profiles_select_community_comember` de `20260805214709_community_scope.sql:531-551`
  existia justamente para essa exceção e perde objeto.

- [ ] **Step 4: pgTAP**

  As suítes que hoje afirmam que perfil oculto não aparece precisam mudar junto — procure em
  `supabase/tests/` por `locality-profile-access` e pelas matrizes de authz. Elas passam hoje;
  se continuarem passando sem alteração depois desta migration, alguma coisa está errada.

  Rode `db:reset` e `test:db` **sem dev server e sem captura visual rodando**.

- [ ] **Step 5: gate e commit**

  `feat(privacy): remove the hidden profile state`.

---

## Task 7: preferências de notificação que ninguém lê

**O defeito.** `notification-preferences-actions.ts:42,63` faz upsert de quatro booleanos em
`notification_preferences`. **Nenhum outro código lê essa tabela.** Os triggers de comentário,
RSVP e mudança de evento inserem notificação sem consultar preferência
(`20260802001400_personal_notifications.sql:70-232`). Pior: `direct_message` está no enum mas
não tem trigger, e "menção" não é sequer um tipo de notificação.

Quatro controles apresentados como efetivos; zero efeito.

- [ ] **Step 1: separar o que tem produtor do que não tem**

  Ficam: comentário e evento — os triggers existem. Saem da tela: mensagens diretas e menções.

- [ ] **Step 2: fazer os dois sobreviventes valerem**

  Migration nova que faz os triggers de comentário e de evento consultarem
  `notification_preferences` antes de inserir. Sem linha na tabela, o padrão é receber.

- [ ] **Step 3: pgTAP positivo e negativo**

  Com a preferência ligada, o comentário gera notificação. Com ela desligada, não gera. O
  mesmo para evento. Sem os dois lados o teste não prova nada.

- [ ] **Step 4: gate e commit**

  `fix(notifications): honour the two preferences that have producers`.

---

## Task 8: veredito e reconciliação

- [ ] **Step 1: auditoria visual**

  `node scripts/visual/loop.mjs` sobre `/login`, `/community`, `/groups`, `/events/[id]` e
  `/profile`. Esta onda remove elementos de layout: o risco não é achado novo, é buraco
  deixado para trás.

- [ ] **Step 2: veredito**

  `docs/agents/VISUAL_AUDIT-2026-08-XX-onda-b.md`, no formato dos existentes.

- [ ] **Step 3: reconciliar o PRODUCT_STATUS**

  Só as linhas cujo ciclo fechou. Confiança `[A]` vira `[V]` no que você reconferiu.

- [ ] **Step 4: commit final**

  `docs(status): close wave B and record the visual verdict`.

---

## Definição de pronto

- Gate verde após cada task.
- Nenhuma string removida reaparece em `apps/web/app`.
- A Task 6 só avançou depois da consulta de perfis `hidden` reais.
- Os dois lados testados nas preferências.
- Auditoria visual rodada, veredito escrito.

## O que esta onda não faz

Não remove a superfície de DM — a D36 a reaproveita para conversa com prestador. Não mexe no
filtro de vocabulário, que é a onda C. Não constrói o destino dos salvos, que é a onda F.
