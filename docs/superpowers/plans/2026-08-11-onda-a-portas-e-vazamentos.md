# Onda A — portas e vazamentos

> Plano de execução. Cinco defeitos de fronteira de confiança, todos verificados no código em
> 2026-08-11. Marque `- [x]` conforme avança e **commite por task**.
>
> Esta onda não espera nenhuma outra: `AGENTS.md` isenta segurança da fila de ondas. Ela é
> **pré-condição de lançamento**, não higiene — a entrada é por vila, centenas de pessoas
> chegam no mesmo dia, e vazamento descoberto por 630 militares de uma vez não é o mesmo
> problema que vazamento descoberto por dez.

## Contexto obrigatório antes de começar

Leia, nesta ordem:

1. [`docs/BIVAQUE.md`](../../BIVAQUE.md) §4 (confiança e privacidade) e §12 (regras
   permanentes). A regra 1 é o que este plano aplica: nenhum Server Component ou route de
   usuário renderiza objeto de domínio com `service_role` sem chamar o helper de acesso e
   negar antes de montar a UI.
2. [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) §1, §3 e §4 — as linhas com onda `A`.
3. [`apps/web/AGENTS.md`](../../../apps/web/AGENTS.md). **Este Next não é o que você
   conhece.** É o Next 16, com mudanças de API em relação ao que está no seu treino. Antes de
   escrever código de rota ou de Server Component, leia o guia correspondente em
   `node_modules/next/dist/docs/` — resolvido a partir de `apps/web`, não da raiz.
4. [`AGENTS.md`](../../../AGENTS.md) §Known traps. Em especial: não rode dev server nem
   captura visual entre `db:reset` e `test:db`.

Comandos: `npx pnpm@11.18.0 gate` é a porta única. `pnpm` não está no PATH — sempre via
`npx pnpm@11.18.0`.

## Regras deste plano

- **Implementação e teste são um todo só.** Nenhuma task fecha sem teste na mesma unidade.
- **Todo caminho de permissão tem teste positivo e negativo.** Quem pode, consegue; quem não
  pode, é negado. Só o positivo não prova nada.
- Migration aplicada não se edita. Nenhuma task aqui precisa de migration.
- Se um todo estiver errado ou impossível, **pare e diga**. Não improvise em fronteira de
  confiança.

---

## Task 1: o callback aceita destino externo

**O defeito.** `apps/web/app/auth/callback/route.ts:16,51`:

```ts
const next = searchParams.get("next") ?? "/"
// ...
const redirectUrl = new URL(next, request.url)
```

`new URL()` **ignora a base quando o primeiro argumento é absoluto**. Com
`?next=https://exemplo.invalid`, a pessoa é levada para fora do domínio logo depois de
autenticar — com a sessão recém-criada. Protocolo relativo (`//exemplo.invalid`) tem o mesmo
efeito.

Isso é saída pós-autenticação aproveitável para phishing: o atacante manda o magic link com
`next` apontando para uma cópia da tela de login, e a vítima acabou de provar que confia no
domínio.

- [ ] **Step 1: validar o destino**

  Aceitar apenas caminho interno. A regra mínima: começa com uma única `/`, não começa com
  `//`, não contém `\`, e não tem esquema. Qualquer outra coisa cai no padrão `/`.

  Não use allowlist de rotas: o parâmetro precisa carregar deep link arbitrário interno
  (`/groups/<uuid>`), e allowlist quebraria isso.

- [ ] **Step 2: testes**

  Em `tests/unit/`, sobre a função de validação extraída:

  positivos — `/`, `/community`, `/groups/abc?tab=feed`, `/events/1#top`;
  negativos — `https://exemplo.invalid`, `//exemplo.invalid`, `/\exemplo.invalid`,
  `javascript:alert(1)`, `http:/exemplo.invalid`, string vazia.

  Cada negativo tem que resultar em `/`, nunca em erro não tratado.

- [ ] **Step 3: gate e commit**

  `npx pnpm@11.18.0 gate` verde, depois
  `fix(security): restrict the auth callback to internal destinations`.

---

## Task 2: o endpoint de avatar serve a foto de qualquer pessoa

**O defeito.** `apps/web/app/api/avatar/[userId]/route.ts:30-52`. A rota autentica —
qualquer sessão válida serve — e daí em diante usa `createServiceClient()`, que é
`service_role` e **passa por cima da RLS**. Ela lista e assina o avatar do `userId` que veio
na URL, sem checar se quem pede tem qualquer relação com quem é pedido.

Consequência: qualquer conta autenticada, de qualquer localidade, sem membership nenhuma,
obtém a foto de qualquer membro conhecendo o id. A URL assinada dura uma hora.

- [ ] **Step 1: reaplicar autorização**

  Depois de obter `user`, negar quando quem pede não pode ver quem é pedido. O caso próprio
  (`user.id === userId`) sempre passa.

  Para o caso de terceiro, **deixe a RLS responder**: leia o perfil do alvo com o
  **cliente autenticado** — o mesmo `authClient` que já está na rota — e não com o
  `service_role`.

  ```ts
  const { data: target } = await authClient
    .from("profiles").select("user_id").eq("user_id", userId).maybeSingle()
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 })
  ```

  Se a linha volta, quem pede tem permissão de ver aquela pessoa; se não volta, não tem. A
  policy de `profiles` já codifica a regra inteira, e é a mesma que governa todo o resto do
  produto — nenhuma lógica nova para divergir depois.

  > **Não use `private.is_locality_member` aqui.** Ela recebe uma **localidade**, não um
  > usuário, e responde "o chamador é membro desta localidade" resolvendo `auth.uid()`
  > (`20260802000300_foundation_rls.sql:14-26`). Sob `service_role`, `auth.uid()` é nulo e
  > ela devolve falso sempre. Usá-la aqui exigiria buscar a localidade do alvo antes, com
  > privilégio elevado — reintroduzindo o padrão que esta onda existe para eliminar.

  Só depois da linha voltar é que o `service_role` entra, e apenas para assinar o arquivo no
  storage — que é a única coisa que ele precisa fazer aqui.

  Resposta para negado: **404, não 403**. 403 confirma que o id existe, o que transforma o
  endpoint em oráculo de existência de conta.

- [ ] **Step 2: reduzir a validade da URL assinada**

  3600 segundos é longo demais para uma imagem de avatar. 300 basta e limita o estrago de um
  link vazado.

- [ ] **Step 3: testes**

  Em `tests/unit/`, sobre a função de autorização extraída da rota: titular vê a própria;
  co-membro da localidade vê; autenticado sem membership recebe 404; membro de outra
  localidade recebe 404; não autenticado recebe 401.

  Se a autorização não for extraível sem reescrever a rota, cubra em `tests/e2e/` com duas
  contas do seed — uma dentro e uma fora — e mantenha a asserção sobre o **status**, não
  sobre o corpo.

- [ ] **Step 4: gate e commit**

  `fix(security): authorise avatar reads instead of serving any user id`.

---

## Task 3: detalhe de grupo e de evento leem com service_role sem reaplicar a policy

**O defeito.** `apps/web/app/(shell)/groups/[id]/page.tsx:113` e
`apps/web/app/(shell)/events/[id]/page.tsx` (mesmo padrão, confira a linha) trocam o cliente
autenticado por `createServiceClient()` e a partir daí leem tudo sem RLS:

```ts
const supabase = createServiceClient()
const { data: groupData } = await supabase.from("groups").select("*").eq("id", groupId)...
const { data: membersData } = await supabase.from("group_memberships")
  .select("user_id, role, status, joined_at, profiles:profiles!inner(display_name)")...
```

A membership do visitante é lida, mas **só decide estado de UI** (`isApproved`, `isPending`).
Nome do grupo, visibilidade e **dez nomes de membros** são renderizados de qualquer forma.

Quem não é do grupo, com o link, vê a lista de quem é. Num grupo privado isso é a fronteira
inteira do produto.

> **Verifique antes de assumir sobre o feed.** `feed_group` é `security definer` e resolve as
> memberships de `auth.uid()`. Chamada por `service_role`, `auth.uid()` é nulo, então ela
> provavelmente devolve vazio — o vazamento confirmado é o **metadado e a lista de
> membros**, não o conteúdo. Confirme com um teste antes de descrever o alcance no commit.

- [ ] **Step 1: negar antes de montar a UI**

  Em ambas as páginas, logo após obter o usuário: chamar o helper de acesso e sair antes de
  qualquer leitura de conteúdo. Para evento existe `private.can_access_event(uuid)`; para
  grupo, use `private.is_group_member` combinado com a regra de visibilidade da §4.1 da
  [spec de comunidade](../specs/2026-08-05-comunidade-design.md) — grupo público é visível a
  quem é do contêiner; privado, só a membro.

  Grupo público continua acessível a membro da localidade; é o esperado.

  Negado vai para `notFound()`, não para uma tela de "sem permissão". A tela de permissão
  confirma que o grupo existe.

- [ ] **Step 2: preferir o cliente autenticado**

  Onde a leitura passa pela RLS sem ajuda, use o cliente autenticado e deixe a policy
  trabalhar. `service_role` deve sobrar apenas onde há razão explícita — e essa razão vai
  escrita em comentário na linha.

- [ ] **Step 3: testes**

  pgTAP em `supabase/tests/` cobre a policy; o que falta aqui é a **página**. Em
  `tests/e2e/`, com contas do seed: membro do grupo privado abre e vê; membro da localidade
  que não é do grupo recebe 404; membro de outra localidade recebe 404; grupo público abre
  para membro da localidade. Repita para evento.

  Nomeie o arquivo `group-event-detail-denials.spec.ts`, seguindo o padrão de
  `onboarding-denials.spec.ts`.

- [ ] **Step 4: gate e commit**

  `fix(security): reapply access checks on group and event detail`.

> **Consequência de graça:** os destinos de notificação (`/groups/:id`, `/events/:id`) deixam
> de ser caminho para objeto inacessível assim que esta task fecha. A página de notificações
> usa cliente anônimo com RLS e **não precisa de correção própria** — a linha do
> `PRODUCT_STATUS.md` que sugeria o contrário já foi corrigida.

---

## Task 4: o CPF fica no sessionStorage

**O defeito.** `apps/web/app/(preauth)/onboarding/page.tsx:160` e `:197` gravam o CPF em
`sessionStorage`, e `:93` o lê de volta na inicialização. A tela imediatamente anterior,
`consent/page.tsx:47-49`, promete que dado sensível não é armazenado.

A promessa é contrato (§4.3 do `BIVAQUE.md`). E `sessionStorage` é legível por qualquer
script na origem, o que transforma qualquer XSS futuro em vazamento de CPF.

- [ ] **Step 1: parar de gravar o CPF**

  Remover as duas escritas e a leitura. O propósito era sobreviver a expiração de sessão no
  meio do fluxo; o custo é guardar CPF no navegador.

  A reidratação continua valendo para `onboarding:familyToken` (`:223`) e
  `onboarding:email` (`:271`) — **não mexa nessas**. Token de convite e e-mail não são o
  mesmo tipo de dado, e a perda do `familyToken` é um defeito separado que a onda D2 fecha.

  Quem perder a sessão redigita o CPF. É atrito aceito conscientemente.

- [ ] **Step 2: limpar resíduo**

  A chave pode existir no navegador de quem já usou. Na inicialização, chamar
  `sessionStorage.removeItem("onboarding:cpf")` uma vez.

- [ ] **Step 3: testes**

  Unitário sobre o boot do onboarding: com a chave presente, ela é removida e o campo nasce
  vazio. E um teste que falhe se `"onboarding:cpf"` reaparecer em `setItem` no arquivo —
  varredura simples de fonte, no espírito de `tests/scope/`.

- [ ] **Step 4: gate e commit**

  `fix(privacy): stop storing the CPF in sessionStorage`.

---

## Task 5: o selo público de "Membro verificado"

**O defeito.** `apps/web/app/components/bivaque/feed-post.tsx:287` renderiza
`aria-label="Membro verificado"`. O contrato em `AGENTS.md:205` proíbe selo público de
verificação, e a própria regra de conteúdo do repositório trata "selo de verificação" como
termo proibido.

Além de proibido, é redundante: numa rede onde a elegibilidade é conferida na entrada, todo
mundo é verificado, e um selo que todos têm não informa nada.

- [ ] **Step 1: remover**

  Tirar o selo e o `aria-label`. Se ele carrega significado visual no card, confirme com a
  rubrica em `docs/agents/VISUAL_GUIDE.md` §9 antes de deixar buraco no layout.

- [ ] **Step 2: teste**

  Unitário ou scope: a string "Membro verificado" não aparece em `apps/web/app`.

- [ ] **Step 3: gate e commit**

  `fix(privacy): remove the public verified-member badge`.

---

## Task 6: veredito e reconciliação

- [ ] **Step 1: auditoria visual**

  `node scripts/visual/loop.mjs` sobre as telas tocadas: `/groups/[id]`, `/events/[id]`,
  `/onboarding`, e o feed em `/community`. A onda não fecha sem isso — §10.2 do MAP, hoje em
  `BIVAQUE.md` §10.

  Se a captura reclamar de `dev-server.pid` velho, apague e tente de novo antes de atribuir
  ao código.

- [ ] **Step 2: escrever o veredito**

  `docs/agents/VISUAL_AUDIT-2026-08-XX-onda-a.md`, no formato dos vereditos existentes:
  o que rodou, quantas capturas, quantos achados novos, e o que ficou como débito herdado.

- [ ] **Step 3: reconciliar o PRODUCT_STATUS**

  Tirar de [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) as linhas fechadas — e só
  elas. **Uma linha só sai quando o ciclo do usuário fecha**, não quando o commit entra.
  Trocar a confiança `[A]` por `[V]` nas linhas que você reconferiu.

- [ ] **Step 4: commit final**

  `docs(status): close wave A and record the visual verdict`.

---

## Definição de pronto

- Gate verde após cada task, não só no fim.
- Todo caminho negado tem teste que prova a negação.
- Nenhuma resposta nova distingue "não existe" de "não pode" para quem não pode.
- Auditoria visual rodada, com veredito escrito.
- `PRODUCT_STATUS.md` reflete o que passou a ser verdade.

## O que esta onda não faz

Não remove a superfície de DM — isso saiu da onda B pela D36. Não mexe em `AGENTS.md:205`
sobre organização militar: aquilo depende do
[ADR da OM](../../decisions/ADR-20260811-om-declarada.md), que está `proposed`. Não toca no
filtro de vocabulário, que é a onda C. E não adiciona rate limit: Upstash é a onda D1.
