# Onda E — a vila

> Plano de execução. Escrito em **2026-08-16**. Marque `- [x]` conforme avança e **commite por
> task**.
>
> Leia [`README.md`](README.md) deste diretório inteiro antes de abrir qualquer task.

## Aviso sobre a idade deste plano

Escrito antes de a D2 fechar. A camada de comunidade que esta onda liga **não** é tocada pela
D2, então a evidência de banco abaixo é estável. Mas `middleware.ts`, `consent/` e
`(admin)/admissions/` mudam na D2. **Reconfira antes de tocar nesses três** — as referências de
linha aqui são de 2026-08-16.

## Precedência: três ondas vêm antes desta

Emendado em **2026-08-16**, depois da sessão de treze decisões que produziu quatro ADRs. Esta é a
onda **mais afetada**: cinco dos oito arquivos que ainda usam `PILOT_LOCALITY_ID` são editados
aqui, e ela ganhou duas tasks novas.

**Execute nesta ordem, antes desta onda:**
[`P0 — localidades nacionais`](2026-08-16-p0-localidades-nacionais.md) →
[`Onda T — a transferência`](2026-08-16-onda-t-transferencia.md) →
[`Onda D2 — a porta`](2026-08-16-onda-d2-a-porta.md).

1. **A Task 3 mudou de nome.** A rota que eu havia proposto como `/manaus` hardcodava o piloto na
   URL — o mesmo erro que a P0 corrige. Ver a task, reescrita.
2. **A Task 1 já nasceu alinhada** e não muda: ela manda derivar a localidade da comunidade e diz,
   com essas palavras, "não use `PILOT_LOCALITY_ID`".
3. **Task 10 é nova:** a arquitetura de informação da navegação, executando o
   [`ADR-20260816-shells-e-navegacao`](../../decisions/ADR-20260816-shells-e-navegacao.md). **Ela
   vem antes da Task 3**, porque é ela que define onde a camada da cidade aterrissa — e o seletor
   de localidade da onda T depende dela.
4. **Task 11 é nova:** assuntos de interesse com grupos sugeridos, que o
   [ADR da forma da admissão](../../decisions/ADR-20260816-forma-da-admissao.md) mandou para cá
   em vez de deixar no passo pós-elegibilidade.
5. **A Task 5 muda de casa parcialmente.** O shell do console do dono nasce na **D2, Task 9**; a
   fila em lote com paginação continua sendo trabalho daqui, dentro daquele shell.
6. Onde este plano cita `BIVAQUE.md` §5.2 ou D14, vale a ressalva do ADR das localidades — e ela
   é importante aqui: a **parte geográfica** de D14 ("Manaus é concedida por verificação") está
   superada; a **parte não geográfica** ("a vila é concedida pelo dono da comunidade") continua
   valendo e é o alicerce das Tasks 5 e 6. Não leia "D14 superada" e conclua demais.

## A decisão que organiza a onda inteira

A D48 diz: **a vila é a sala; Manaus não é.** Manaus vira quatro coisas, nenhuma delas uma
linha do tempo — alcance de post, eventos da cidade, vitrine e guia de chegada (§6.2).

Hoje o código faz o contrário em dois lugares, e nenhum dos dois é opinião:

1. **`feed_community` não devolve post de alcance Manaus.**
   `20260805215020_community_feeds.sql`, cláusula `where` do `feed_community`:
   `p.community_id = p_community_id or p.group_id in (select id from visible_groups)`.
   Post com `community_id is null` **nunca** entra no feed de vila nenhuma. Ou seja: o seletor
   de audiência já existe, a opção "Manaus" já grava `community_id = null`, e o resultado é um
   post que ninguém vê — porque o único lugar que o mostrava era o feed municipal que a D48
   remove. **Sem a Task 1, a Task 2 apaga conteúdo.**

2. **A referência municipal é inalcançável para quem tem vila.**
   `community/page.tsx:203-210` só renderiza o link do Guia de chegada quando
   `!primaryCommunityName` — quem entrou numa vila perde o acesso. `bottom-nav.tsx:32-77` não
   tem entrada nem para `/communities` nem para `/guide`. A camada que a D48 diz ser o valor de
   Manaus está atrás de uma condição que a nega.

**Ordem obrigatória: Task 1 antes da Task 2.** Inverter tira posts de circulação entre um
commit e o outro.

## Contexto obrigatório antes de começar

1. [`docs/BIVAQUE.md`](../../BIVAQUE.md) §3 (os três níveis), §5.2 e §5.4 (as duas concessões e
   os dois convites), **§6 inteiro** (a experiência-alvo — é a onda) e a D48 na tabela §9.
2. [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) §3 e §4.
3. [`docs/superpowers/specs/2026-08-05-comunidade-design.md`](../specs/2026-08-05-comunidade-design.md),
   lembrando que a D9 dela foi superada pela D09 do `BIVAQUE.md`.

## Uma parada obrigatória, e ela é da §5.2

O `BIVAQUE.md` §5.2 pede a fila de aprovação "de lote, com seleção múltipla **e afiliação
visível**". A afiliação — força, situação, OM, turma — é exatamente o que
[`ADR-20260811-om-declarada`](../../decisions/ADR-20260811-om-declarada.md) propõe e que
`AGENTS.md:205` proíbe enquanto o ADR estiver `proposed`.

**A Task 5 entrega o lote e a delegação. Não entrega afiliação.** Não persista força, situação,
organização militar nem turma; não crie coluna "para depois". Registre a lacuna no veredito da
onda e siga. Se alguém tiver aprovado o ADR entre a escrita deste plano e a execução, **pare e
confirme com o dono** — não deduza aprovação de um arquivo.

---

## Task 1: post de alcance Manaus chega ao feed da vila

O mecanismo central da D48, e ele é uma migration.

- [ ] **Step 1: a migration**

  `npx pnpm@11.18.0 exec supabase migration new community_feed_locality_reach`.

  `feed_community` passa a devolver também os posts de alcance municipal. A condição nova, no
  `where`:

  - `p.community_id is null`
  - **e** `p.locality_id` = a localidade **daquela** comunidade (junte `public.communities` pelo
    `p_community_id`; não use `PILOT_LOCALITY_ID` — a segunda cidade quebra isso em silêncio)
  - **e** `p.group_id is null` — post de grupo já entra pelo ramo `visible_groups`, e sem esta
    cláusula um post de grupo municipal privado vaza para a vila inteira.

  Isso é seguro por construção porque o pertencimento é aditivo (§3.1): quem está na vila está
  em Manaus. Mas **não confie na frase** — a Task exige o teste negativo do Step 3.

  A função devolve `community_id`, então a UI já consegue distinguir. Não invente coluna nova.

- [ ] **Step 2: `drop` + `create`, nunca `create or replace`**

  A assinatura de retorno não muda, mas `create or replace function` com `returns table` falha
  quando qualquer nome de coluna difere. Siga o padrão do próprio arquivo original
  (`drop function if exists` → `create function`) e **repita os `revoke`/`grant`** — recriar a
  função descarta os privilégios anteriores. Esquecer isso deixa `authenticated` sem `execute` e
  o feed inteiro em branco.

- [ ] **Step 3: pgTAP — três positivos e três negativos**

  `supabase/tests/community-feed-locality-reach.sql`:

  | Caso | Esperado |
  |---|---|
  | membro aprovado da vila A, post com `community_id null` na mesma localidade | **vê** |
  | membro aprovado da vila A, post da vila A | vê |
  | membro aprovado da vila A, post de grupo público da vila A | vê |
  | membro aprovado da vila A, post da **vila B** | **não vê** |
  | membro aprovado da vila A, post de outra **localidade** com `community_id null` | **não vê** |
  | membro **pendente** da vila A | **não vê nada** |

  Rode também `full-regression.sql` — `feed_community` é lida por
  `community-feeds.sql` e `community-feed-denials.sql`, e mudar a cláusula mexe nos dois.

- [ ] **Step 4: gate e commit**

  `feat(feed): locality-reach posts land in every vila feed`.

---

## Task 2: a home é o feed da vila; sem vila, é a referência de Manaus

- [ ] **Step 1: quem tem vila**

  `community/page.tsx:76-84` já chama `feed_community` para a primeira comunidade aprovada.
  Mantenha, com duas correções:

  - a escolha da comunidade é `limit(1)` sem ordenação (`:56-62`) — a "primeira" é indefinida.
    Ordene por `joined_at` e trate quem tem duas vilas: um seletor no cabeçalho, não um sorteio.
  - `membershipsData` e `communityData` descartam o `error` (`:56`, `:68`). Leia os dois. É
    exatamente o defeito que deixou a lista de membros de grupo quebrada em produção sem
    ninguém notar — ver `README.md` §"Duas coisas que o E2E ensinou".

- [ ] **Step 2: quem não tem vila cai na referência, não num feed**

  O ramo `feed_posts(PILOT_LOCALITY_ID)` (`:81-84`) **sai**. Quem não pertence a comunidade
  nenhuma vê a home de Manaus da §6.2: eventos da cidade, guia de chegada, vitrine (ainda vazia
  — é a onda G, e a seção diz isso em vez de fingir) e o caminho para pedir entrada numa vila.

  Não é uma tela vazia com aviso: é a tela que o §6.2 descreve. Militar que não mora em vila é
  usuário legítimo do produto.

- [ ] **Step 3: `feed_posts` continua existindo, e por quê**

  A RPC não é removida — `profile/page.tsx:129` a usa (e a Task 7 conserta esse uso), e a
  reabertura da D48 depende de poder medir. Remover a função é decisão de outra onda.

- [ ] **Step 4: testes**

  E2E `tests/e2e/vila-home.spec.ts`: sessão com vila aprovada vê o nome da vila no cabeçalho e o
  post de alcance Manaus no feed; sessão **sem** vila **não** encontra lista de publicações na
  home e encontra o guia. Commite sem executar se o banco estiver sem seed.

- [ ] **Step 5: gate e commit**

  `feat(home): the vila is the room and Manaus becomes reference`.

---

## Task 3: a camada de referência da cidade fica alcançável

> **Reescrita em 2026-08-16.** A primeira versão propunha uma rota literalmente chamada
> `/manaus`. Sob o ADR isso é `PILOT_LOCALITY_ID` promovido a URL — o piloto virando fronteira
> de produto, exatamente o erro que a P0 corrige. A rota é genérica e resolve a localidade do
> membro.

- [ ] **Step 1: a rota**

  `apps/web/app/(shell)/localidade/page.tsx` reunindo as quatro coisas da §6.2, **para a
  localidade do membro** — não para uma cidade nomeada no caminho. Guia e eventos já existem
  (`/guide`, `/events`) — esta tela é a porta, não uma reimplementação.

  O título da página é o nome da cidade resolvido em runtime. Nenhuma string "Manaus" no código.

- [ ] **Step 2: a navegação**

  > **Reescrito em 2026-08-16.** A primeira versão mandava trocar "Mensagens" pela camada da
  > cidade, resolvendo a disputa pela quinta vaga. Recusado: hoje são cinco destinos, amanhã
  > treze, e decidir vaga a vaga sob prazo é o que produziu a divergência entre o
  > `VISUAL_GUIDE.md` e o código que a Task 10 documenta.

  A camada da cidade **não ganha uma vaga** — ela é um dos containers definidos na **Task 10**,
  que precisa estar feita antes desta. O rótulo vem do nome da cidade do membro, **nunca "Manaus"
  fixo**.

  Se a Task 10 ainda não rodou, **pare e faça a 10 primeiro**. Acrescentar um item a
  `bottom-nav.tsx:32-77` agora é criar a décima terceira aba que o ADR existe para impedir.

- [ ] **Step 3: a condicional que esconde o guia sai**

  `community/page.tsx:203-210`: o link do Guia de chegada deixa de depender de
  `!primaryCommunityName`. Quem chega transferido em dezembro está justamente entrando numa
  vila — é a pessoa que mais precisa do guia, e é a única que hoje não o alcança.

- [ ] **Step 4: testes**

  E2E `tests/e2e/locality-reference.spec.ts`: com vila aprovada, `/localidade` responde, exibe o
  nome da cidade **do membro** e o guia é alcançável a partir da home em um toque. **Negativo:
  uma sessão numa segunda localidade vê o nome dela, não "Manaus"** — é o que prova que a rota
  não reintroduziu o hardcode.

  Teste de escopo em `tests/scope/`: `NAV_ITEMS` filtrado tem no máximo cinco entradas — é a
  regra que o comentário afirma e nada verifica.

- [ ] **Step 5: gate e commit**

  `feat(nav): make the locality reference layer reachable`.

---

## Task 4: o seletor de audiência mostra o alcance antes do submit

O seletor existe (`feed-post.tsx:641-658`) e faz metade do trabalho. Falta a metade que a regra
2 da §12 exige: **toda criação de conteúdo mostra a audiência antes do submit** — e isso é
privacidade, não polimento.

- [ ] **Step 1: HeroUI, não `<select>` cru**

  `feed-post.tsx:645-657` é um `<select>` nativo com classes soltas. O `AGENTS.md` lista
  `Select` entre os componentes em uso. Troque. O mesmo vale para o `<select>` de transferência
  de posse em `communities/[id]/page.tsx:248-264`, que está na mesma tela desta onda.

- [ ] **Step 2: os rótulos dizem o alcance, não o nome da entidade**

  Hoje as opções são o literal `Manaus` (`feed-post.tsx:651`) e o nome da comunidade. Passe a
  dizer o que acontece, **com o nome da cidade resolvido da localidade do membro** — a P0 acabou
  de tirar esse literal do resto do código, não o reintroduza aqui:

  - `Só a Vila Ajuricaba` — quem lê: os aprovados da vila.
  - `<Cidade> inteira` — quem lê: todos os membros verificados da cidade.

  Uma linha de texto abaixo do seletor, viva, com a contagem de quem vai ler. É a diferença
  entre um campo de formulário e um aviso de audiência.

- [ ] **Step 3: o padrão é a vila**

  `feed-post.tsx:477` já usa `defaultCommunityId`. Mantenha — o padrão largo é o que produz
  vazamento por desatenção. Confirme que `resetForm` (`:524-534`) não zera para `null`
  silenciosamente: hoje zera, e o segundo post da sessão sai para Manaus sem a pessoa escolher.
  **Isso é bug de privacidade, não de UX.**

- [ ] **Step 4: o card mostra o alcance**

  Post com `community_id null` aparecendo no feed da vila (Task 1) precisa de um `Chip` com o
  nome da cidade — senão a pessoa responde algo de vizinhança achando que fala para 500 pessoas
  quando fala para milhares. O nome vem da localidade do post, não de constante.

- [ ] **Step 5: testes**

  - Unitário sobre `resetForm`: depois de publicar na vila, o estado do seletor continua na
    vila (**este é o teste da task** — sem ele o Step 3 volta na primeira refatoração).
  - E2E: publicar com alcance Manaus faz o post aparecer no feed da vila **com** o chip; alcance
    de vila não aparece para membro de outra vila.

- [ ] **Step 6: gate e commit**

  `feat(composer): show reach before submit and default to the vila`.

---

## Task 5: fila de aprovação em lote e delegação

A fila existe (`communities/[id]/page.tsx:164-196`), com um `<form>` por pessoa e dois botões.
Para uma vila que chega inteira — centenas de pedidos numa tarde (§5.1) — é inutilizável.

**Releia a parada obrigatória no topo antes de começar: afiliação não entra.**

- [ ] **Step 1: seleção múltipla**

  Checkbox por linha, "selecionar todos", e duas ações de lote. As RPCs
  `approve_community_member` e `remove_community_member` já existem
  (`20260805215419_community_rpcs.sql:79,105`) e são chamadas por `authenticated` — **não crie
  RPC nova**. Itere no servidor, com a mesma checagem por item.

  Aprovar em lote não afrouxa a autorização por item: cada chamada continua validando o papel
  de quem aprova. Um laço que confere uma vez e escreve N vezes é escalada de privilégio.

- [ ] **Step 2: o `limit(30)` sai**

  `:87` e `:94` cortam em 30. Numa vila de 630 pessoas, o dono aprova 30 e acha que acabou.
  Paginação de verdade, com contagem total visível.

- [ ] **Step 3: delegação**

  `add_community_moderator` / `remove_community_moderator` já existem (`:129`, `:156`) e não têm
  UI. O §5.2 diz que o dono delega — sem tela, não delega. Ligar é o trabalho.

- [ ] **Step 4: o que a fila mostra**

  Nome, data do pedido e nada mais. **Escreva um comentário no componente** dizendo que
  afiliação está fora pelo ADR e que a linha do §5.2 fica parcialmente aberta — senão daqui a
  três meses alguém lê a §5.2, acha que faltou implementar, e implementa.

- [ ] **Step 5: testes**

  - pgTAP em `supabase/tests/community-batch-approval.sql`: dono aprova N e todos ficam
    `approved`; **membro comum chamando a mesma RPC em lote é negado item a item** (negativo);
    moderador pode aprovar; moderador **não** pode promover outro moderador (confira o que a RPC
    faz hoje antes de afirmar — se ela permitir, isso é achado, reporte).
  - E2E: aprovar 3 de 5 selecionados deixa exatamente 2 na fila.

- [ ] **Step 6: gate e commit**

  `feat(communities): batch approval, pagination and moderator delegation`.

---

## Task 6: convite de membro, com atribuição e escopo

Não existe nada (`PRODUCT_STATUS.md` §2, primeira linha). É o motor de crescimento da D15, e a
semântica é **oposta** à do convite familiar — leia a tabela da §5.4 antes de escrever a
primeira linha:

| | Convite de membro | Convite familiar |
|---|---|---|
| Verificação de CPF | **obrigatória, sem exceção** | é a via alternativa, dispensa |
| Carrega | quem convidou **e** para qual comunidade | vínculo com o titular |

**O link não concede a vila** (§5.2, D14). Ele carrega o escopo para que o aceite vire um
**pedido de entrada** já direcionado — o dono ainda aprova. Três ganhos, e o primeiro é o que
importa: link vazado vira pedido, não acesso.

- [ ] **Step 1: a migration**

  Tabela `public.community_invitations`: comunidade, quem convidou, digest do token, expiração,
  estado, quem aceitou, timestamps. Digest, nunca o token — o modelo é
  `private.family_invitations`.

  **A coluna de escopo e as policies que a leem nascem nesta mesma migration.** Regra 6 da §12,
  e a falha que este repositório já cometeu quatro vezes.

- [ ] **Step 2: quota**

  A D1 deixou o limite "cota de convite por usuário" definido no Upstash e **não ligado**
  (`PRODUCT_STATUS.md` §11). Ligue aqui. Se a chave não existir na D1, **pare e reporte** — não
  crie um contador em tabela ao lado, que é exatamente o que a Task 1 da D1 proíbe.

- [ ] **Step 3: o aceite exige verificação**

  Quem abre o link e não é membro verificado vai para `/onboarding` **com o convite guardado**,
  e o pedido de entrada na comunidade só nasce depois de a verificação passar. Nunca o
  contrário. Este é o ponto em que a D15 pode ser quebrada por engano: um atalho aqui torna o
  convite de membro uma via sem CPF, que é o que a D16 reserva ao familiar.

- [ ] **Step 4: atribuição**

  O aceite grava quem convidou. É o que permite ao dono da vila reconhecer o pedido, e é o que
  transforma aprovação em ato com dono (§5.2).

- [ ] **Step 5: entrega**

  Link copiável na tela + linha no `outbox`, como a Task 4 da D2 faz para o familiar. Reuse o
  mesmo caminho; não escreva um segundo mecanismo de convite.

- [ ] **Step 6: testes**

  - pgTAP em `supabase/tests/community-invitations.sql`: aceite de convite válido por usuário
    **verificado** cria membership `pending`; **aceite por usuário não verificado não cria
    nada** (negativo, e é o teste que prova a D15); convite expirado nega; convite de outra
    comunidade não concede acesso a esta; `authenticated` não lê convite alheio.
  - Unitário: a cota do Upstash é consultada antes de gravar.

- [ ] **Step 7: gate e commit**

  `feat(communities): member invitations with attribution and scope`.

---

## Task 7: perfil de outro membro, e as duas abas que mentem hoje

`profile/page.tsx` tem três defeitos, e dois deles mostram dado de terceiro como se fosse do
titular:

- **`:129-132`** — a aba "Publicações" chama `feed_posts(PILOT_LOCALITY_ID)` e corta em 20. É o
  feed da cidade rotulado como histórico da pessoa. **Depois da P0 essa chamada já não existe
  como está** — o escopo vem da localidade do perfil que se está olhando, que não é
  necessariamente a de quem olha.
- **`:133-137`** — a aba "Eventos" lê os dez próximos eventos da tabela, sem nenhum filtro por
  usuário.
- **não existe `/profile/[userId]`** — a copy de privacidade do produto pressupõe uma tela de
  perfil alheio que não há.

- [ ] **Step 1: as duas abas passam a filtrar pelo titular**

  Publicações: posts do usuário, respeitando o escopo de quem olha — um post que o titular fez
  na vila A **não** aparece para quem não é da vila A. Não filtre no cliente: se a consulta
  devolve a linha, ela já vazou.

  Eventos: eventos organizados pelo titular, ou dos quais ele participa. Decida qual, escreva
  qual, e teste o outro como negativo.

- [ ] **Step 2: `/profile/[userId]`**

  Server Component, cliente autenticado, RLS decide. Alvo invisível → `notFound()`.

  Lembre do que o E2E da onda A ensinou: **`notFound()` no Next 16 responde 200**, não 404.
  Asserte a UI (ausência do conteúdo protegido, presença da página de não encontrado), não o
  status.

- [ ] **Step 3: leia o `error` de toda consulta**

  E **não** use embed do PostREST entre tabelas sem FK. `group_memberships` → `profiles` é o
  caso conhecido: as duas referenciam `auth.users` em separado e o embed nunca resolve, falhando
  em silêncio. Se precisar do nome, faça a segunda consulta —
  `communities/[id]/page.tsx:113-127` é o padrão certo e está a duas telas daqui.

- [ ] **Step 4: uma representação só do avatar**

  Hoje são três: inicial no cabeçalho, foto na seção, foto no feed
  (`profile/page.tsx`, `avatar-section.tsx:14-20`). O wrapper `MemberAvatar` existe para isso —
  use-o nos três lugares.

- [ ] **Step 5: política de nomes (D23)**

  `20260802000100:31-40` valida só comprimento 2-80. Migration nova: normalização Unicode NFC,
  barrar caracteres de controle e marcas bidi. É segurança, não produto — nome que se lê como
  outro é o vetor mais barato de engano numa rede onde as pessoas se reconhecem por nome.

- [ ] **Step 6: testes**

  - pgTAP em `supabase/tests/display-name-policy.sql`: nome com `U+202E` é rejeitado; nome com
    caractere de controle é rejeitado; nome legítimo com acento passa (positivo e negativo).
  - pgTAP: post de vila A não aparece no perfil do titular para quem não é de A.
  - E2E `tests/e2e/member-profile-denials.spec.ts`: perfil de membro de outra localidade não
    revela conteúdo.

- [ ] **Step 7: gate e commit**

  `feat(profile): other-member profile, owner-scoped tabs and a name policy`.

---

## Task 8: o guia recebe sugestão da comunidade — pelo caminho manual

A rota `/guide` e a fila `/guide-queue` existem e funcionam — **para uma cidade só**:
`guide/page.tsx:47` filtra por `PILOT_LOCALITY_ID`. Depois da P0 o guia é por localidade, e a
consequência de produto é séria: quem se cadastrar numa cidade nova encontra um guia vazio. Isso
é a Task 8 da P0 (estado vazio honesto), não um detalhe de filtro.

O parser e o adaptador DeepSeek existem e a chamada externa está **desligada por governança** —
corretamente:
[`ADR-20260815-guia-curadoria-ia`](../../decisions/ADR-20260815-guia-curadoria-ia.md) está
`proposed` e a D49 depende da governança LGPD (§4.4) e da onda F.

- [ ] **Step 1: a IA continua desligada**

  Não ligue `lib/guide/deepseek.ts` a nada. Não é timidez: mandar resposta de membro para
  terceiro sem base legal declarada é o tipo de decisão que a §4.4 chama de pré-requisito de
  lançamento, não de backlog.

- [ ] **Step 2: o caminho manual, que não depende do ADR**

  Na fila do operador, criar item do guia **a partir de uma resposta de indicação existente**,
  com o texto que o operador escreve. O gatilho de IA da D49 substitui o operador na
  *extração*; a aprovação continua humana nos dois desenhos. Construir o manual agora não
  antecipa nada do ADR e faz o guia crescer em dezembro.

  Depende da onda F ter as respostas de indicação fechadas. Se F ainda não rodou, **este step
  fica aberto e a onda fecha assim** — escreva isso na linha do `PRODUCT_STATUS.md`. Onda pode
  fechar com item pendente; o que não pode é a linha dizer que fechou.

- [ ] **Step 3: notificações com destino**

  `notifications/page.tsx:121-144` navega, e os destinos de grupo e evento foram corrigidos na
  onda A. Confira o que sobrou: a notificação de aceite de convite familiar abre o perfil do
  próprio titular. Aponte para onde o dependente aparece.

- [ ] **Step 4: testes**

  pgTAP: item do guia criado pelo operador nasce `approved` com autor registrado; **membro comum
  não cria item aprovado** (negativo). Unitário: nenhum caminho de código chama o adaptador
  DeepSeek — teste de escopo, que é o que impede o religamento acidental.

- [ ] **Step 5: gate e commit**

  `feat(guide): curate entries from community answers, operator-approved`.

---

## Task 10: os containers de navegação

Task nova, acrescentada em 2026-08-16. Executa a regra 2 do
[`ADR-20260816-shells-e-navegacao`](../../decisions/ADR-20260816-shells-e-navegacao.md).

**Faça esta task antes da Task 3.** Ela define onde a camada da cidade aterrissa, e o seletor de
localidade da onda T depende dela.

O problema não é "quem ganha a quinta vaga". É que hoje são cinco destinos e o roadmap traz a
camada da cidade (esta onda), vitrine, busca e dashboard de prestador (G) e três painéis de
operação (H). A pergunta se repete a cada onda e é decidida sob prazo — que é como o sintoma
abaixo apareceu.

**Spec e código já divergem, e nada testa isso.** `docs/agents/VISUAL_GUIDE.md:46-49` especifica
bottom nav com **4 itens** (Minha comunidade, Grupos, Eventos, Perfil), Indicações via ícone no
cabeçalho, e sidebar desktop com 5 incluindo Perfil. `bottom-nav.tsx:107` **remove** Perfil e
entrega 5 itens, com Mensagens e Indicações dentro.

- [ ] **Step 1: os containers vêm do modelo, não da lista de features**

  Derive da §3.1 (três níveis de pertencimento) e da §6.3 (os dois ciclos). Eles são estáveis
  porque não mudam quando uma feature nasce.

  **Todo destino novo aterrissa DENTRO de um container, nunca como aba nova.** Vitrine e busca de
  prestador caem na camada da cidade; convite de membro cai em "eu"; o seletor de localidade da
  onda T cai onde o nível de pertencimento é escolhido.

- [ ] **Step 2: a regra é falsificável, e é isso que a faz durar**

  Se um destino novo não couber em nenhum container, **o destino está confuso — não falta vaga**.
  Nesse caso, pare e reporte.

  Aplicando a régua ao estado atual, o item fora do lugar **não é Mensagens** — é **Eventos**, que
  flutua como aba própria enquanto a §6.2 lista "eventos da cidade" como uma das quatro coisas
  que o nível municipal é, e evento de vila pertence à vila. Resolva isso aqui.

- [ ] **Step 3: papéis não entram**

  Os consoles de fundador e de dono são **shells separados** (D2, Task 9) e não disputam
  container nenhum. O prestador (D37) não tem membership e não compartilha esta navegação.

- [ ] **Step 4: reconciliar o `VISUAL_GUIDE.md`**

  §0 Navegação passa a descrever os containers. Sem isso ficam duas fontes de verdade, que é
  exatamente o estado de hoje.

- [ ] **Step 5: testes**

  Teste de escopo em `tests/scope/navigation.test.mjs`: o número de itens de navegação respeita o
  teto declarado, e `NAV_ITEMS` bate com o que o `VISUAL_GUIDE.md` especifica. **Este teste é a
  task** — é a única coisa que impede a divergência de voltar, e hoje a regra só existe em
  comentário (`bottom-nav.tsx:104-107`).

  E2E: cada container é alcançável e a camada da cidade abre em um toque a partir da home, com ou
  sem vila.

- [ ] **Step 6: gate e commit**

  `refactor(nav): containers derived from the product model`.

---

## Task 11: assuntos de interesse e grupos sugeridos

Task nova, acrescentada em 2026-08-16. O
[ADR da forma da admissão](../../decisions/ADR-20260816-forma-da-admissao.md) mandou isto para cá
em vez de deixar no passo pós-elegibilidade, por dois motivos que valem repetir: em cidade
recém-aberta não existe grupo a sugerir, e o passo apareceria vazio exatamente onde a solidão já
é o risco principal; e coletar interesses lá para usar aqui quebraria a regra 3 da §12 além de
exigir finalidade declarada na coleta.

**Faça depois da Task 6** (convite de membro) — as duas são os mecanismos de crescimento da onda,
e a sugestão fica melhor quando há alguém para convidar.

- [ ] **Step 1: interesse é grupo, e o modelo já diz isso**

  A §3.2 é explícita: *"se o pertencimento é por interesse, é grupo. Se é por circunstância, é
  comunidade."* Assuntos de interesse mapeiam em **grupos**, nunca em comunidades. Não crie uma
  taxonomia paralela ao que `groups` já é.

- [ ] **Step 2: a finalidade é declarada na coleta**

  A tela diz para que serve antes de perguntar: sugerir grupos. Sem promessa de mais nada. É
  requisito de LGPD, não copy.

- [ ] **Step 3: o caso da cidade vazia**

  Sem grupo na localidade, a tela **não** aparece vazia: ela oferece criar o primeiro, ou
  convidar. Mesmo princípio da Task 9 da P0 — o estado vazio diz a verdade em vez de fingir
  movimento.

- [ ] **Step 4: testes**

  pgTAP: interesse gravado sugere grupo da **própria** localidade; **não sugere grupo de outra
  localidade** (negativo); **não sugere grupo privado do qual a pessoa não participa** (negativo,
  e é o que protege a §3.3 — público é relativo ao container).

  Unitário: sem grupos na localidade, a tela devolve o caminho de criação, não lista vazia.

- [ ] **Step 5: gate e commit**

  `feat(onboarding): interest topics with suggested groups`.

---

## Task 9: E2E, auditoria visual e reconciliação

- [ ] **Step 1: rodar o lote de E2E**

  Um `db:reset` com seed, pedido ao dono, uma vez. Junto com o que D2 tiver deixado.

- [ ] **Step 2: auditoria visual**

  `node scripts/visual/loop.mjs` sobre `/community`, `/localidade`, `/communities`,
  `/communities/[id]`, `/guide`, `/profile`, `/profile/[userId]`, o modal de publicação, a
  navegação reorganizada da Task 10 e a tela de interesses da Task 11.

  Esta é a onda com mais telas novas do roadmap — a auditoria **bloqueia** a onda F, e o
  backlog de 106 achados `high` da Phase 2 (touch targets de cabeçalho, 67×32 e 56×32) segue
  sob a exceção de acessibilidade: pode ser atacado a qualquer momento e não espera vez.

- [ ] **Step 3: veredito**

  `docs/agents/VISUAL_AUDIT-2026-08-XX-onda-e.md`.

- [ ] **Step 4: reconciliar o `PRODUCT_STATUS.md`**

  §4 inteira muda. A linha "Feed municipal" descreve um comportamento que esta onda remove; a
  linha "Seletor de audiência" passa a ter o mecanismo completo. **A linha de afiliação declarada
  continua "não existe"** e a lacuna passa a citar a Task 5 desta onda.

- [ ] **Step 5: commit**

  `docs(status): reconcile the vila layer after wave E`.

---

## Definição de pronto

- Gate verde após cada task.
- Post com alcance Manaus aparece no feed de toda vila da localidade, com chip, e **não**
  aparece para outra localidade — com teste positivo e negativo.
- Nenhuma home renderiza uma linha do tempo municipal.
- O guia é alcançável por quem tem vila.
- Aprovar 300 pedidos não exige 300 cliques.
- Convite de membro nunca dispensa verificação — provado por teste negativo.
- Nenhuma aba de perfil mostra conteúdo de terceiro.
- Nenhuma coluna, tela ou copy de força, situação, OM ou turma foi criada.

## O que esta onda não faz

Não constrói a vitrine nem a conta de prestador (G). Não faz suspensão nem denúncia unificada
(H). Não liga a IA do guia — depende do ADR e da LGPD. Não implementa afiliação declarada, e
**isso é o contrato, não um adiamento de conveniência**.
