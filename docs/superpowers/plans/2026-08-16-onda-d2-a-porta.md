# Onda D2 — a porta

> Plano de execução. Escrito em **2026-08-16**, contra o código no estado real após a
> reconciliação de 2026-08-15. Marque `- [x]` conforme avança e **commite por task**.
>
> Antes de abrir este arquivo você já deveria ter lido
> [`README.md`](README.md) deste diretório inteiro. Se não leu, leia agora.

## Precedência: duas ondas vêm antes desta

Emendado em **2026-08-16**, depois da sessão de treze decisões que produziu quatro ADRs. Seis
consequências, e a primeira é bloqueante.

**Execute nesta ordem, antes desta onda:**
[`P0 — localidades nacionais`](2026-08-16-p0-localidades-nacionais.md) →
[`Onda T — a transferência`](2026-08-16-onda-t-transferencia.md).

Quatro das quinze chamadas a `PILOT_LOCALITY_ID` estão em `verifyAndProvision.ts` (linhas 86, 94,
155, 163), que é o arquivo central das Tasks 2, 4 e 6 daqui — e a P0 **parte essa função em
duas**. Rodar D2 primeiro é escrever teste sobre código que deixa de existir.

Os ADRs que mandam nesta onda:
[`forma-da-admissao`](../../decisions/ADR-20260816-forma-da-admissao.md) (R3) e
[`shells-e-navegacao`](../../decisions/ADR-20260816-shells-e-navegacao.md) (R2).

1. **A Task 1 muda de forma.** A tabela de roteamento do gate ganha um estado que não existia: a
   admissão passa a ter duas fases, então "elegível **sem** membership" vira um destino próprio —
   o passo de localidade da Task 5 da P0, e não `/community`.
2. **A Task 2 ficou mais simples, não mais complexa.** A pergunta "de onde o job lê a localidade?"
   **desapareceu**: com a admissão em duas fases, a reconciliação responde só "esta pessoa é
   elegível?" e não provisiona nada. Não adicione coluna a `verification_outcomes`.
3. **A Task 6 muda de casa.** A decisão sobre documento passa a viver dentro do **console do
   fundador**, que a Task 9 desta onda cria.
4. **A Task 7 foi superada** pela Task 8 da P0 e **não deve ser executada**. O texto ficou
   riscado, com o motivo.
5. **Task 9 é nova:** os dois consoles. Ver o fim deste arquivo.
6. Onde este plano cita `BIVAQUE.md` §5.2 ou D14, vale a ressalva do ADR das localidades: a
   **parte geográfica** está superada; a não geográfica — a vila é concedida pelo dono —
   continua valendo e é justamente o que sustenta a Task 9.

## O que já está feito, e por que isso muda o plano

A sessão de 2026-08-15 entregou mais da D2 do que o `BIVAQUE.md` §10 sugere. **Confira antes
de reimplementar** — cinco migrations já existem e passaram no pgTAP:

| Peça | Onde | Estado |
|---|---|---|
| Validação de CPF (cliente + servidor) | `onboarding/page.tsx`, `api/onboarding/route.ts:75`, `@bivaque/domain` | pronta |
| `pending` com produtor (timeout, não-2xx, 429) | `lib/portal/client.ts`, `lib/portal/guard.ts` | **produtor** pronto; **reconciliação** não |
| Limite de 3 tentativas por hora | `20260815133000_verification_attempt_limit.sql` | pronta |
| Upload de documento com TTL de 7 dias | `20260815132000_verification_documents.sql` | **upload** pronto; **decisão e expurgo** não |
| Aceite versionado em banco | `20260815131000_consent_acceptances.sql` | pronta; **a tela não mostra o código de conduta** |
| Convite familiar amarrado ao e-mail | `20260815130000_family_invite_email_binding.sql` | pronta; **o link não chega a ninguém** |
| Waitlist com cidade/UF | `20260815120000_waitlist_desired_city.sql` | pronta; **ninguém é avisado** |

A linha `PRODUCT_STATUS.md` §2 que diz "link encaminhado provisiona quem abrir" está
**vencida** — a evidência dela é `[A]`, de `20260802000400`, e a migration de 2026-08-15
sobrescreveu a função. Corrigir essa linha faz parte da Task 8.

Portanto esta onda **não** reconstrói verificação. Ela fecha os ciclos que a capacidade
deixou abertos, que é exatamente o que a regra 3 da §12 exige: capability em migration não é
produto sem entrada → ação → feedback → acompanhamento → sad path.

## Contexto obrigatório antes de começar

1. [`docs/BIVAQUE.md`](../../BIVAQUE.md) §4 inteiro (confiança e verificação), §5.4 (as duas
   semânticas de convite) e §7.9 (o limite do Portal).
2. [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) §1 e §2.
3. [`docs/legal/CODIGO_DE_CONDUTA.md`](../../legal/CODIGO_DE_CONDUTA.md) e
   [`docs/legal/PRIVACIDADE.md`](../../legal/PRIVACIDADE.md) — são o texto que a Task 3 exibe.
4. `AGENTS.md` §Supabase e §Portal da Transparência.

## Dependências e bloqueios

- **A D1 precisa estar fechada nas Tasks 3 e 4** (`outbox` + worker + adaptador Resend). As
  Tasks 4, 5 e 7 daqui enfileiram e-mail. Se o adaptador do Resend ainda não existir, **a
  linha no `outbox` continua sendo o entregável** — enfileirar é o contrato, entregar é da
  D1. Escreva o teste sobre a linha enfileirada, não sobre o e-mail enviado.
- **Bloqueio humano, e ele não é de agente:** a D12 só fecha quando o dono assinar o código de
  conduta e a política de privacidade passar por revisão jurídica (§11.11 do `BIVAQUE.md`). A
  Task 3 constrói o mecanismo com o texto que existe hoje e **versiona**; publicar é decisão do
  dono. Não invente controlador, canal nem encarregado.

---

## Task 1: o gate passa a ler o estado real da verificação

Hoje `middleware.ts:108-117` faz uma coisa só: se não há linha em `locality_memberships`,
manda para `/onboarding`. Quem está em `pending` cai no formulário de CPF de novo, redigita, e
**queima uma das três tentativas por hora** para receber a mesma resposta genérica. A tela
`/onboarding/status` existe, deriva o estado corretamente
(`onboarding/status/page.tsx:41-64`) e **nada roteia para ela**.

- [ ] **Step 1: uma função que devolve só o próprio estado**

  `read_verification_status(p_user_id uuid)` hoje é chamada com `service_role`
  (`onboarding/status/page.tsx:42`). O middleware roda no Edge e **não pode** carregar
  `service_role` — chave de serviço em middleware é escalada de privilégio disponível em toda
  requisição.

  Migration nova criando `public.my_verification_status()` — **sem parâmetro**, `security
  definer`, `set search_path = ''`, lendo `private.verification_outcomes` por
  `(select auth.uid())`. `grant execute` só para `authenticated`.

  Sem parâmetro é o ponto: uma função que aceita `p_user_id` e é chamada por `authenticated`
  vira enumeração de estado alheio no dia em que alguém esquecer a checagem interna.

- [ ] **Step 2: o roteamento**

  Em `middleware.ts`, depois da checagem de membership (linha 108), quando `isMember.data` for
  nulo:

  | Estado devolvido | Destino |
  |---|---|
  | nenhuma linha | `/onboarding` — nunca verificou |
  | `pending` | `/onboarding/status` |
  | `temporary_error` | `/onboarding/status` |
  | `rejected` | `/onboarding/status` |
  | **`verified` sem membership** | **o passo de localidade** (Task 5 da P0) |

  A última linha é a que a admissão em duas fases criou, e é a mais fácil de errar. Antes da P0,
  `verified` implicava membership porque as duas coisas nasciam na mesma função. Agora não:
  elegível e provisionado são estados distintos, e quem está entre os dois tem uma tela própria.

  Confirme que `onboarding/status/page.tsx:58` já foi corrigido pela Task 4 Step 4 da P0 — ele
  mandava `verified` direto para `/community`. Se ainda mandar, **pare e reporte**: a P0 não
  fechou.

  Uma chamada a mais por requisição **só** quando não há membership. Membro aprovado não paga
  nada — a consulta de membership já existia.

- [ ] **Step 3: o cookie de consentimento não é autoridade**

  `middleware.ts:14-15,89` confia num cookie que `consent/page.tsx:24` escreve com
  `document.cookie` no navegador. Qualquer pessoa passa o gate digitando uma linha no console.

  Isso **não** é vazamento hoje, porque `/api/onboarding:60-68` reconfere no servidor com
  `has_accepted_consent`. Mas o comentário no código não diz isso, e a próxima pessoa vai ler o
  gate do middleware como garantia. **Escreva o comentário**: o cookie é atalho de navegação; a
  autoridade é a linha em `consent_acceptances`, conferida no servidor.

  Não troque o cookie por consulta ao banco no middleware — isso põe uma ida ao banco em toda
  requisição de toda pessoa, para proteger uma tela que já é protegida no servidor.

- [ ] **Step 4: testes**

  - pgTAP em `supabase/tests/my-verification-status.sql`: usuário com `pending` recebe
    `pending`; usuário sem linha recebe vazio; **usuário A não consegue ver o estado de B**
    (negativo obrigatório — é uma função `security definer` nova);
    `anon` não tem `execute`.
  - E2E em `tests/e2e/onboarding-status-gate.spec.ts`: sessão em `pending` que abre `/community`
    chega em `/onboarding/status`, e o formulário de CPF **não** aparece.
    Commite sem executar se o banco estiver sem seed — ver `README.md` §"O E2E precisa de um humano".

- [ ] **Step 5: gate e commit**

  `feat(onboarding): route the shell gate by real verification state`.

---

## Task 2: reconciliação de `pending`

A D08 pede duas coisas: produtor real **e** reconciliação server-side. O produtor está pronto.
A reconciliação não existe — quem cai em `pending` porque o Portal estava fora fica em
`pending` para sempre, esperando um operador que não tem nem botão.

Sob entrada em lote (§5.1) isso é o modo de falha do lançamento: o Portal oscila numa tarde e
a vila inteira congela.

- [ ] **Step 1: o job**

  Migration nova com um job de `pg_cron` que, a cada 15 minutos:

  1. **Não roda com o breaker aberto.** Se o breaker do Portal estiver aberto, sai sem fazer
     nada. Reconciliar durante suspensão é como o token some por 8 horas.
  2. Seleciona `verification_outcomes` em `pending` ou `temporary_error` com
     `updated_at < now() - interval '30 minutes'`, ordenado pelo mais antigo, **com teto de
     linhas por execução** — bem abaixo do throttle global da D1.
  3. Chama o endpoint interno de reconciliação por `pg_net`, como o worker do `outbox` já faz
     (`20260814174705_outbox_worker.sql` é o modelo — siga-o).

- [ ] **Step 2: o endpoint interno**

  `apps/web/app/api/internal/verification-reconcile/route.ts`, no molde de
  `api/internal/outbox/route.ts` (mesma autenticação interna, mesmo runtime `nodejs`).

  **Ele reusa `verify`, não `verifyAndProvision`.** A P0 partiu a função em duas exatamente por
  isso: o job responde *"esta pessoa é elegível?"* e para. Ele **não** cria membership, **não**
  cria profile, e **não** precisa saber a localidade de ninguém — a pergunta ainda não foi feita.

  Não adicione `intended_locality_id` a `verification_outcomes`. Seria dado coletado que pode
  nunca ter uso, o que a LGPD trata como finalidade sem propósito, e o
  [ADR da forma da admissão](../../decisions/ADR-20260816-forma-da-admissao.md) recusa
  explicitamente.

  Quem virou `verified` pelo job vai, na próxima visita, para o passo de localidade — o mesmo
  destino da Task 1.

  Segunda diferença, e ela precisa estar explícita no código: a
  reconciliação **não** consome tentativa do usuário. `consume_verification_attempt` é
  anti-enumeração contra o navegador; o job não é o navegador. Passe uma flag e escreva o
  porquê em comentário — sem isso, a reconciliação esgota a cota da pessoa e ela nunca mais
  consegue tentar sozinha.

- [ ] **Step 3: retry em laço continua proibido**

  Teto de tentativas por linha. Depois do teto, o estado vira `rejected` e a pessoa entra na
  fila de decisão manual da Task 5 — **nunca** um laço que reencosta no Portal.

- [ ] **Step 4: avisar quando resolver**

  Reconciliação que resulta em `verified` enfileira e-mail no `outbox` (tipo
  `verification_resolved`). Sem isso a pessoa foi aprovada e não sabe: o ciclo não fecha.

- [ ] **Step 5: testes**

  pgTAP em `supabase/tests/verification-reconcile.sql`: o job existe e está agendado; linha
  `pending` antiga é elegível; linha `pending` de dois minutos atrás **não** é; linha acima do
  teto de tentativas não é reelegível. Unitário sobre o endpoint: verificado enfileira
  `outbox`, ainda-pendente não enfileira nada.

- [ ] **Step 6: gate e commit**

  `feat(onboarding): reconcile pending verifications on pg_cron`.

---

## Task 3: consentimento com o código de conduta, e uma versão só

Dois defeitos, e o segundo é o que faz o primeiro voltar.

**O texto.** `consent/page.tsx:43-63` mostra quatro bullets escritos à mão. O código de conduta
de `docs/legal/CODIGO_DE_CONDUTA.md` — o texto que a D12 exige e que é a **base contratual da
suspensão da onda H** — não aparece em lugar nenhum do produto. Suspender alguém por violar um
documento que ele nunca viu não se sustenta.

**A versão.** O número `1` está escrito em cinco lugares independentes:
`middleware.ts:15`, `consent/page.tsx:10`, `consent/actions.ts:7-8`,
`api/onboarding/route.ts:55`, `lib/onboarding/verifyAndProvision.ts:7`. Publicar uma versão 2
exige acertar cinco arquivos sem errar nenhum, e o erro só aparece como "consent is required"
em produção.

- [ ] **Step 1: uma fonte só**

  `packages/domain/src/consent.ts` exportando `CONSENT_VERSION` e `CODE_OF_CONDUCT_VERSION`.
  Os cinco lugares passam a importar. Nenhum literal sobra.

- [ ] **Step 2: teste de escopo que impede a recaída**

  `tests/scope/consent-version.test.mjs`: nenhum arquivo em `apps/web/` declara constante de
  versão de consentimento própria. O teste é o que torna o Step 1 durável — sem ele, o próximo
  agente escreve o literal de novo em quinze segundos.

- [ ] **Step 3: a tela exibe os dois textos**

  `consent/page.tsx` passa a mostrar, em duas seções roláveis e rotuladas, o conteúdo de
  `CODIGO_DE_CONDUTA.md` e `PRIVACIDADE.md`. Renderize a partir dos arquivos versionados no
  repositório — copiar o texto para dentro do JSX cria uma segunda cópia que diverge no primeiro
  ajuste jurídico.

  Dois aceites separados, não um só: a `record_consent_acceptance` já recebe as duas versões
  (`20260815131000_consent_acceptances.sql:30`). A tela deve refletir isso.

- [ ] **Step 4: acessibilidade da caixa rolável**

  A caixa de `consent/page.tsx:43` é `overflow-y-auto` sem `tabindex` e sem rótulo. Conteúdo
  rolável precisa ser alcançável por teclado. Isto está sob a exceção de acessibilidade do
  `AGENTS.md` — corrija junto, não depois.

- [ ] **Step 5: testes**

  - Unitário: as duas versões vêm de `@bivaque/domain` e batem com o que a tela envia.
  - pgTAP: `has_accepted_consent` devolve falso quando só uma das duas versões foi aceita
    (**negativo obrigatório** — é o caminho que a publicação de uma versão nova cria).
  - E2E `tests/e2e/consent-acceptance.spec.ts`: aceitar grava a linha e libera `/onboarding`;
    cookie forjado sem linha no banco **não** passa por `/api/onboarding`.

- [ ] **Step 6: gate e commit**

  `feat(consent): show the code of conduct and unify the version source`.

---

## Task 4: o convite familiar precisa chegar a alguém

Este é o buraco mais concreto da onda. `family-invite-section-actions.ts:74-83` faz:

```
const token = randomBytes(32)
const tokenDigest = createHash("sha256").update(token).digest("hex")
```

...grava o digest, e **descarta `token`**. O titular clica em "convidar", vê um convite na
lista, e o dependente nunca recebe nada. Não há caminho utilizável. A funcionalidade inteira é
uma affordance morta — o que a regra 4 da §12 proíbe.

- [ ] **Step 1: o link existe, e aparece uma vez**

  A ação passa a devolver o token em claro **uma única vez**, para renderizar o link
  `/onboarding?invite=<token>` na tela do titular, com botão de copiar.

  O digest continua sendo a única coisa persistida. Não grave o token; não o mande para log; não
  o ponha em `revalidatePath` nem em query string de navegação interna.

- [ ] **Step 2: o convite também é enviado**

  Enfileirar no `outbox` (canal `email`, tipo `family_invite`) para o e-mail que o titular
  digitou. O e-mail é o alvo do `invitee_email_digest` — o mesmo que
  `20260815130000_family_invite_email_binding.sql:37-48` confere no aceite. Enviar para lá é
  coerente por construção.

  **O e-mail em claro não vira coluna.** Passe-o como destinatário da linha do `outbox` e nada
  mais; `private.family_invitations` continua guardando só o digest.

- [ ] **Step 3: a lista identifica sem expor**

  `family-invite-section.tsx:85-104` mostra só datas — dois convites do mesmo dia são
  indistinguíveis e o titular revoga o errado. Como só existe o digest, o e-mail não pode ser
  reconstruído; então **a máscara tem que ser gravada no envio**: uma coluna nova
  `invitee_email_hint` com o formato `jo***@gm***.com`, gerada na criação.

  Coluna nova em `private.family_invitations` **na mesma migration** que a policy/função que a
  lê — regra 6 da §12, e é a falha que este repositório já cometeu quatro vezes.

- [ ] **Step 4: testes**

  - pgTAP em `supabase/tests/family-invite-hint.sql`: a dica é gravada; ela **não** permite
    reconstruir o e-mail (asserção sobre o formato); `authenticated` não lê a tabela `private`
    direto (negativo).
  - Unitário sobre a máscara: `joao.silva@gmail.com` → `jo***@gm***.com`; e-mail de duas letras
    antes do `@` não vaza a segunda letra.
  - Unitário sobre a ação: o token devolvido não aparece em nenhuma linha persistida.

- [ ] **Step 5: gate e commit**

  `feat(family-invite): deliver the invite link and identify pending invites`.

---

## Task 5: os quatro becos sem saída do aceite, e o 500 que fala demais

`private.accept_family_invitation` levanta uma exceção só para quatro situações diferentes
(`20260815130000:30-31`) e uma quinta para e-mail divergente (`:46-48`). Em cima disso,
`api/onboarding/route.ts:120-124` devolve **a mensagem crua do banco** no corpo do 500.

Duas consequências, e a segunda é de segurança:

1. Expirado, já usado, revogado e inexistente viram a mesma tela de erro genérica — a pessoa
   não sabe se pede outro convite ou fala com o titular.
2. `"invitation email does not match the authenticated user"` chegando ao cliente **confirma
   que o token é válido** e que pertence a outra pessoa. Isso é enumeração, na única via que
   concede acesso sem CPF.

- [ ] **Step 1: códigos, não frases**

  A função passa a levantar com `errcode` distinto por caso (use `raise exception ... using
  errcode = ...` com códigos da faixa `P0001`+ ou uma coluna de detalhe estruturada). Quatro
  casos: `not_found`, `expired`, `already_used`, `revoked`. O e-mail divergente é o quinto e
  tem tratamento próprio no Step 3.

  Migration nova. **Não edite** `20260815130000` — ela está aplicada.

- [ ] **Step 2: quatro telas humanas**

  A rota mapeia código → status HTTP e mensagem. Nada de eco de `error.message`:

  | Caso | HTTP | O que a pessoa lê |
  |---|---|---|
  | inexistente | 404 | "Este convite não existe. Peça um novo ao titular." |
  | expirado | 410 | "Este convite expirou. Peça um novo ao titular." |
  | já usado | 409 | "Este convite já foi usado." |
  | revogado | 410 | "Este convite foi cancelado pelo titular." |

  Cada uma com o caminho de recomeço, como a tela de falha de callback da onda A já faz
  (`auth/callback-error/page.tsx` é o modelo de tom).

- [ ] **Step 3: e-mail divergente é genérico, de propósito**

  Devolve **exatamente** a mesma resposta de "este convite não existe". Quem encaminhou o link
  não pode distinguir "token errado" de "token certo, pessoa errada". Escreva o porquê em
  comentário, senão alguém "melhora" a mensagem de erro em seis meses.

- [ ] **Step 4: o 500 para de ecoar o banco**

  `api/onboarding/route.ts:120-124` passa a registrar `message` no `log.error` e devolver corpo
  genérico. Vale para **todas** as ações da rota, não só o convite.

- [ ] **Step 5: testes**

  - pgTAP em `supabase/tests/family-invite-sad-paths.sql`: os quatro casos levantam códigos
    distintos; e-mail divergente levanta o de não-encontrado (positivo **e** negativo).
  - Unitário sobre a rota: cada código vira o status certo; nenhum corpo de resposta contém
    substring da mensagem do banco.
  - E2E `tests/e2e/family-invite-denials.spec.ts`: link expirado mostra a tela humana com
    recomeço, e nenhum conteúdo do titular aparece.

- [ ] **Step 6: gate e commit**

  `fix(family-invite): distinct sad paths and no database detail in responses`.

---

## Task 6: o operador decide o documento — e o TTL vira verdade

`list_verification_documents()` existe (`20260815132000:119`) e **nenhuma tela a chama**.
`(admin)/admissions/page.tsx` lê só `list_verification_queue` e não tem um botão. O caminho de
exceção da §4.2 termina num arquivo que ninguém abre.

Pior: a coluna `expires_at` existe, mas **nada apaga o objeto no storage**. A D11 diz "nunca
persistir documento além do TTL" e hoje isso é uma promessa que o código não cumpre.

> **Fronteira com a onda H, decidida em 2026-08-16.** O `BIVAQUE.md` §10 põe "admissões que
> decide" na H. A decisão sobre **documento** entra aqui porque sem ela a Task de upload da D2 é
> capability sem ciclo — regra 3 da §12 — e porque a H é a onda que o §10.2 admite que pode
> escorregar. Se ela escorregar com a decisão dentro, a vila chega inteira num dia (§5.1) sem
> ninguém que possa decidir um caso.
>
> A H estende o console para o resto: suspensão, retorno ao denunciante, denúncia unificada.

**Esta task depende da Task 9**, que cria o console do fundador. Faça a 9 antes — ou a seção de
documentos vira a quarta página solta em `(admin)/`, que é exatamente o problema que a 9 resolve.

- [ ] **Step 1: a seção de documentos, dentro do console**

  A seção de documentos entra no **console do fundador** (Task 9), não como página nova. O gate é
  o mesmo `is_current_user_operator()` que o shell do console já aplica.

- [ ] **Step 2: ver o documento sem publicá-lo**

  URL assinada de curta duração, gerada no servidor com `service_role`, **por requisição**.
  Nunca uma URL persistida, nunca um bucket público — `20260815132000:7` já criou o bucket
  privado, mantenha assim.

  O `storage_object_path` fica fora de `list_verification_documents` de propósito
  (`:116-118` diz isso). Não o adicione ao retorno — busque o caminho numa chamada separada, no
  momento de assinar.

- [ ] **Step 3: aprovar e rejeitar**

  RPC nova `decide_verification_document(p_document_id uuid, p_decision text, p_reason text)`,
  `security definer`, exigindo operador via `is_current_user_operator()`:

  - **aprovar** → `upsert_verification_outcome(verified)` + `locality_memberships` +
    `profiles`, exatamente como `verifyAndProvision.ts:83-106` faz. Reuse a mesma escrita;
    duas rotas de provisionamento divergem em três meses.

    **Depois da P0 essa escrita carrega a localidade escolhida.** Reusar sem passá-la
    reintroduz o hardcode por dentro do caminho de exceção — que é o pior lugar, porque é o
    menos exercitado. O documento enviado tem que estar amarrado à localidade que a pessoa
    escolheu no onboarding.
  - **rejeitar** → estado `rejected` com o motivo gravado em coluna de auditoria.

  Os dois casos gravam autor e horário. Aprovação sem autor é carimbo, não ato (§5.2).

- [ ] **Step 4: a pessoa é avisada**

  Enfileirar no `outbox` nos dois casos. O texto de rejeição **não** repete o motivo interno
  cru — motivo é registro de auditoria, não copy.

- [ ] **Step 5: o expurgo do TTL**

  Job de `pg_cron` que apaga o objeto no storage e marca a linha quando `expires_at < now()`.
  Sete dias é a promessa da política de privacidade (§4.4). Sem este step, é falso.

- [ ] **Step 6: testes**

  - pgTAP em `supabase/tests/verification-document-decision.sql`: operador aprova e a membership
    nasce; **não-operador chamando a RPC é negado** (negativo obrigatório); rejeição grava
    motivo e autor; documento expirado sai da listagem.
  - pgTAP sobre o expurgo: linha vencida é elegível, linha de ontem não é.
  - Unitário: a URL assinada tem expiração curta e o caminho não vaza no HTML da página.

- [ ] **Step 7: gate e commit**

  `feat(admissions): operator decision on verification documents and TTL purge`.

---

## ~~Task 7: a waitlist responde~~ — SUPERADA, não execute

> **Substituída pela Task 7 da [P0 de localidades nacionais](2026-08-16-p0-localidades-nacionais.md).**
>
> Esta task foi escrita em 2026-08-16 de manhã, antes do
> [`ADR-20260816-national-localities`](../../decisions/ADR-20260816-national-localities.md). Ela
> constrói confirmação por e-mail, descadastro e painel de demanda **para a waitlist
> geográfica** — o fluxo que a decisão 4 do ADR elimina: *"a waitlist geográfica deixa de ser o
> caminho para pessoas fora de Manaus"*.
>
> Executá-la é polir um fluxo que a P0 remove. **A P0 decide o destino da tabela
> `public.waitlist`, e essa decisão é do dono** — três saídas estão listadas lá, e nenhuma é de
> agente.
>
> O texto original fica abaixo, riscado, como registro de por que a decisão foi tomada. Não é
> fila de trabalho.

- [ ] ~~**Step 1: confirmação por e-mail**~~

  Enfileirar `outbox` tipo `waitlist_joined`, com o texto que a tela promete: sem promessa de
  posição nem de prazo (`onboarding/status/page.tsx:116-119` já define o tom — não o contradiga).

- [ ] ~~**Step 2: descadastro que funciona sem login**~~

  Quem entra na waitlist não tem conta. O link de descadastro da Task 4 da D1 tem que funcionar
  para essa linha também. Se a D1 amarrou descadastro a usuário autenticado, **pare e reporte** —
  é mudança no contrato do `outbox`, não improviso aqui.

- [ ] ~~**Step 3: o operador vê a demanda**~~

  Contagem por cidade/UF no painel de admissões. É o dado que decide a segunda vila, e hoje ele
  está no banco sem leitor.

  > **A única parte que sobrevive, e num lugar diferente.** Sob o ADR não há mais "segunda
  > vila a escolher": qualquer pessoa elegível entra na própria cidade. Mas a **demanda real por
  > localidade** continua sendo o sinal que orienta para onde Manaus expande a operação — é o
  > benefício que o próprio ADR reivindica. Esse painel passa a ler `locality_memberships` por
  > localidade, não a waitlist. Leve a ideia para a Task 8 da P0, não execute aqui.

- [ ] ~~**Step 4: testes**~~

  pgTAP: entrada na waitlist enfileira exatamente uma linha no `outbox`; entrada duplicada do
  mesmo e-mail não enfileira duas (negativo); a contagem por cidade não expõe e-mail para
  `authenticated`.

- [ ] ~~**Step 5: gate e commit**~~

  `feat(waitlist): confirm by email and surface demand to the operator`.

---

## Task 9: os dois consoles de administração

Task nova, acrescentada em 2026-08-16. Executa a regra 1 do
[`ADR-20260816-shells-e-navegacao`](../../decisions/ADR-20260816-shells-e-navegacao.md):
**papéis são shells diferentes, não abas a mais.**

**Faça esta task antes da Task 6.** Ela cria a estrutura onde a decisão sobre documento mora.

A §1.3 do `BIVAQUE.md` já define os dois papéis — **Operador** ("painel de moderação e
admissões") e **Dono de comunidade** ("governa a própria comunidade: aprova, remove, delega") —
e a fragmentação já começou: `(admin)/` tem três páginas soltas (`admissions`, `reports`,
`guide-queue`) sem console em volta, e a moderação do dono está dentro de
`communities/[id]/page.tsx`, misturada com o feed.

- [ ] **Step 1: o console do fundador**

  Shell sob `(admin)/`, com navegação própria, reunindo o que já existe hoje em páginas soltas.
  Gate por `is_current_user_operator()`, aplicado **no shell**, não repetido em cada página.

  Ele atravessa cinco ondas, e cada uma pendura a sua seção:

  | Seção | Onda | Estado |
  |---|---|---|
  | Admissões e pendências | **D2** | as três páginas existentes entram aqui |
  | Documentos de verificação | **D2**, Task 6 | seção nova |
  | Delegação de administração de comunidade | E | as RPCs existem sem tela |
  | Ciclo de grupo | F | — |
  | **Financeiro** | G | **bloqueado por CNPJ** — a seção não aparece até existir |
  | Denúncias, suspensão, retorno ao denunciante | H | — |

  **Seção só aparece quando o ciclo fecha** (§12 regra 3). Um console com seis abas vazias é pior
  que três páginas soltas.

- [ ] **Step 2: o console do dono**

  Shell próprio para dono e moderador de comunidade: aprovação e moderação **da própria
  comunidade**. Tira a fila de aprovação de dentro de `communities/[id]/page.tsx`, onde ela
  divide tela com o feed.

  A fila em lote com paginação é a **Task 5 da onda E** — aqui só nasce o shell e a fila básica
  que já existe muda de casa.

- [ ] **Step 3: as duas autorizações são caminhos separados, não um `prop`**

  `is_current_user_operator()` é global; a do dono é por comunidade e já vive nas RPCs
  (`approve_community_member`, `add_community_moderator`). **Não compartilhe um componente de
  console parametrizado por escopo** — o modo de falha clássico é um bug de renderização virando
  escalada de privilégio.

  Componentes de apresentação podem ser compartilhados. A **autorização** não.

- [ ] **Step 4: testes — cada console com positivo e negativo**

  §12 regra 7, e aqui ela não é formalidade:

  - operador alcança o console do fundador; **membro comum é negado** (negativo);
  - dono alcança o console da própria comunidade; **dono da comunidade A é negado no console da
    comunidade B** (negativo, e é o teste que prova o Step 3);
  - moderador alcança o console do dono; **membro comum é negado**;
  - operador **não** herda automaticamente papel de dono numa comunidade — confira o que as RPCs
    fazem hoje antes de afirmar; se ele herdar, isso é achado, **reporte**.

- [ ] **Step 5: gate e commit**

  `feat(admin): founder and community-owner consoles as separate shells`.

---

## Task 8: E2E da porta, auditoria visual e reconciliação

Esta task é o fechamento da onda. Não a trate como burocracia — é ela que decide se a linha do
`PRODUCT_STATUS.md` pode sair de "código feito".

- [ ] **Step 1: rodar o lote acumulado de E2E**

  Peça `db:reset` **com seed** ao dono, uma vez só, no fim. Rodam juntos: os dois specs órfãos
  da onda A (`onboarding-denials`, `group-event-detail-denials`), os desta onda, e o que B e C
  tiverem deixado.

  Este é o único momento em que o banco sai do estado de pgTAP. Ver `README.md` §"O E2E precisa
  de um humano".

- [ ] **Step 2: auditoria visual**

  `node scripts/visual/loop.mjs` sobre as telas tocadas: `/consent`, `/onboarding`,
  `/onboarding/status`, `/profile` (seção de convite familiar) e **os dois consoles da Task 9**.

  Sem dev server e sem captura rodando entre `db:reset` e `test:db` — o perfil fantasma
  "Visual Capture" quebra seis asserts e parece regressão real.

- [ ] **Step 3: veredito escrito**

  `docs/agents/VISUAL_AUDIT-2026-08-XX-onda-d2.md`, no formato dos que já estão em
  `docs/agents/`.

- [ ] **Step 4: reconciliar o `PRODUCT_STATUS.md`**

  Com atenção a três coisas:

  - a linha "Convite familiar — aceite" está **vencida** desde 2026-08-15 (evidência `[A]` de
    `20260802000400`, sobrescrita por `20260815130000`). Corrija a evidência e a lacuna.
  - trocar `[A]` por `[V]` só no que você releu linha a linha.
  - uma linha só sai da tabela quando o ciclo fecha. Documento aprovado sem aviso à pessoa não
    fecha ciclo.

- [ ] **Step 5: commit**

  `docs(status): reconcile the admission door after wave D2`.

---

## Definição de pronto

- Gate verde após cada task.
- Ninguém em `pending` vê o formulário de CPF de novo.
- Nenhuma resposta HTTP carrega mensagem do banco.
- Expirado, usado, revogado e inexistente são quatro telas; e-mail divergente é a de
  inexistente, e isso está comentado no código.
- O convite familiar produz um link que uma segunda pessoa consegue usar.
- Documento aprovado provisiona; documento vencido some do storage.
- Nenhum segredo, nenhum CPF e nenhum token em log, em commit ou em corpo de resposta.

## O que esta onda não faz

Não constrói a vila (onda E) nem o ciclo de indicação (onda F). Não faz suspensão de conta nem
denúncia unificada — é a H. Não implementa afiliação declarada: o
[ADR da OM](../../decisions/ADR-20260811-om-declarada.md) está `proposed` e, enquanto estiver,
`AGENTS.md:205` é o contrato.
