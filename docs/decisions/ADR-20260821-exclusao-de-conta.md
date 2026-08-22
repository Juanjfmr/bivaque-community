---
id: ADR-20260821-exclusao-de-conta
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan:
critic_verdict: pending
critic_review: Revisao adversarial inline executada em 2026-08-21 na mesma sessao que escreveu o ADR — o critico NAO foi independente, e isso fica registrado aqui em vez de ser omitido, no mesmo formato do ADR-20260820-suspensao-de-conta. Sete defeitos achados e corrigidos no texto. Tres de desenho, na primeira passada- (1) a decisao 5 nao dizia o que acontece com profiles.visibility, e sem isso os seis asserts de listagem de perfil da suite pgTAP passariam a contar quem saiu; (2) a sucessao de comunidade pressupunha um transfer_community_ownership que nao existe — so groups tem RPC de transferencia; (3) a janela de arrependimento nao dizia o que acontece com convite familiar pendente emitido por quem esta saindo. Dois de enumeracao, conferindo o catalogo do banco- (4) dm_reports, tabela separada de reports com o mesmo cascade de denunciante, ficou fora da lista de retencao; (5) recommendation_saves e event_invites ficaram fora da lista de apagados; e a decisao 4 nao dizia o destino de dm_conversations. Dois de citacao errada- (6) o unique parcial de reports esta em 48-50, nao 46-48; (7) o enum profile_visibility esta em 6-9, nao 16-19. Os defeitos 4 a 7 sao a propria falha de enumeracao que a secao Risks manda evitar, e por isso a decisao 4 agora manda o plano reconstruir a lista do catalogo do banco em vez de copiar do ADR. Veredito de critico independente continua pendente.
---

# Excluir a própria conta: o pedido, os trinta dias, o que morre e o que fica anônimo

## Problem

A política de privacidade promete uma coisa que o produto não sabe fazer.

[`docs/legal/PRIVACIDADE.md:77`](../legal/PRIVACIDADE.md) diz: *"Enquanto você for membro. Se você
sair ou pedir exclusão, apagamos em até **30 dias**."* O `BIVAQUE.md` §4.4 repete o prazo como
uma das três retenções da governança LGPD. Não existe caminho nenhum:
`grep -rni "delete_account\|account_deletion\|excluir.*conta\|encerrar.*conta" supabase/ apps/web/`
volta vazio, não há tela, não há RPC, não há fila de operador. A
`20260819010000_self_delete_policies.sql`, apesar do nome, é a policy de `delete` de
`event_rsvps` da onda F.

**Isso é pré-requisito de publicar a política, não item de backlog.** Publicar um texto que
promete exclusão sem ter o caminho é declarar uma capacidade inexistente ao titular — exatamente
o erro que o §12 regra 3 proíbe dentro do repositório e que aqui teria efeito jurídico.

E o caminho óbvio é uma armadilha. `delete from auth.users` hoje produz três desfechos, todos
errados:

- **Trava com erro.** `posts.community_id`, `events.community_id` e `groups.community_id` são
  `on delete restrict` ([`20260805214709_community_scope.sql:18,26,38`](../../supabase/migrations/20260805214709_community_scope.sql)).
  Como `communities.owner_user_id` é `cascade`, apagar um dono de vila tenta apagar a vila e bate
  no restrict: **o dono de comunidade não consegue exercer o direito**. Se a vila ainda não tem
  conteúdo, ela é destruída em silêncio.
- **Destrói conteúdo de terceiro.** `groups.owner_user_id` leva junto `group_memberships`,
  `user_group_interests` e `recommendation_requests`
  ([`20260815220000_recommendation_reply_cycle.sql:10`](../../supabase/migrations/20260815220000_recommendation_reply_cycle.sql));
  `events.organizer_id` leva os RSVPs e convites de todo mundo; `posts.user_id` leva os
  **comentários dos outros** via `comments.post_id` cascade. Isso contradiz literalmente a frase
  que a própria política usa para justificar a retenção: *"apagar sua metade de uma conversa deixa
  a outra pessoa falando sozinha"*.
- **Apaga prova.** `reports.reporter_user_id` é cascade
  ([`20260802001600_reports.sql:27`](../../supabase/migrations/20260802001600_reports.sql)). Quem
  foi assediado, denunciou e foi embora leva a denúncia junto, e o denunciado fica sem moderação.

A `RISK_MATRIX.md` classifica isto como R3 por quatro motivos somados: trata de dado pessoal,
de exclusão de escopo, de policies de escrita, e de operação destrutiva irreversível.

## Decision

**1. Autosserviço, e o pedido nunca é recusado.** A pessoa pede pela própria tela, sem fila de
operador e sem justificar. Nenhuma condição de governança — ser dona de vila, ter denúncia aberta,
estar suspensa — recusa ou adia o pedido. Condicionar um direito legal a um ato de administração é
frágil sob LGPD e trava justamente quem perdeu o interesse em administrar.

**2. Trinta dias de arrependimento, e a purga é em D+30.** O pedido desativa a conta na hora: some
do diretório, perde escrita, sessões encerradas. A purga real roda em D+30 e até lá a pessoa
cancela entrando de novo. Os 30 dias da política deixam de ser um teto vago e passam a ser o prazo
que o produto cumpre.

> Isto **diverge do WhatsApp**, que é irreversível, e a razão é a identidade. O WhatsApp pode não
> ter arrependimento porque a identidade dele é um número de telefone que ele re-verifica em
> segundos. A nossa é um CPF conferido contra o Portal que **deliberadamente não guardamos** —
> quem apaga por engano aqui não tem re-registro barato, tem uma verificação inteira de novo. O
> custo do erro é maior no Bivaque, então a janela protege mais, não menos.

**3. Anonimização no lugar. Nada, nunca, executa `delete from auth.users`.** A linha permanece e é
esvaziada de tudo que identifica: e-mail vira `deleted-<uuid>@invalid` (domínio reservado por
RFC 2606, já usado nas fixtures), telefone nulo, senha invalidada, `raw_user_meta_data` e
`raw_app_meta_data` zerados, `auth.identities` e `auth.sessions` apagadas, `banned_until` no
infinito.

**Esta é a decisão que resolve a cascata inteira.** Como nada apaga de `auth.users`, os
`on delete cascade` que destruiriam vila, grupo, evento e comentário alheio **nunca disparam**. O
trabalho vira um teste de escopo em vez de vinte e cinco migrations de FK — e é o oposto do modo
de falha da onda T, que injetou guard em três tabelas e esqueceu `events`.

O que resta é um uuid sem nenhum atributo identificante. **O dono determinou em 2026-08-21 que
esse uuid não é dado pessoal**, e é sobre essa determinação que a decisão 3 se apoia.

> **O que essa determinação é e o que ela não é.** Ela é a decisão de produto que destrava a
> implementação, registrada com data e autor no formato que este regime de ADR usa. Ela **não é
> parecer jurídico**, e não dispensa a revisão que a
> [`PRIVACIDADE.md`](../legal/PRIVACIDADE.md) já exige do documento inteiro antes de publicar —
> requisito que existe desde o rascunho de 2026-08-11 e é anterior a este ADR. Se o parecer
> divergir, o caminho de volta é a alternativa B, que está desenhada e assume sem redesenho.

**4. Três destinos, e cada linha do banco está em exatamente um.**

| Destino | O quê |
|---|---|
| **Apagado** | `dm_messages` enviadas por ela, `notifications` recebidas, `post_saves`, `recommendation_saves`, `post_reactions`, `event_rsvps`, `event_invites` recebidos, `user_group_interests`, `notification_preferences`, `dm_blocks` (como bloqueadora e como bloqueada), `private.verification_outcomes`, `verification_documents` e o objeto no storage, avatar, `group_memberships`, `community_memberships` |
| **Anonimizado** | `posts`, `comments`, `recommendation_requests`, `recommendation_replies`, `events`, `arrival_guide_entries` — a linha fica, o autor vira "Membro que saiu" |
| **Retido** | `reports` **e `dm_reports`** abertas pela pessoa (denunciante fica opaco), `moderation_actions` contra ela por 2 anos, `consent_acceptances` (prova da base legal, sem dado pessoal) |

`dm_conversations` **não é apagada**: as mensagens da pessoa somem, mas a conversa continua
existindo para o outro lado, com as mensagens dele intactas e um interlocutor anônimo. Apagar a
conversa inteira apagaria a metade que é do outro — a mesma regra da anonimização, aplicada ao
privado.

> **`dm_reports` é tabela separada de `reports`**
> ([`20260802001500_contextual_dm_abuse_controls.sql:64`](../../supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql)),
> com o mesmo `reporter_user_id ... on delete cascade`. A auto-revisão deste ADR esqueceu dela na
> primeira redação — o que é a própria falha de enumeração que a seção de riscos manda evitar. A
> lista acima é normativa: **o plano a reconstrói consultando o catálogo do banco, não este texto.**

O critério é o da própria política: **o que foi dito na praça fica, porque outros construíram em
cima; o que foi dito no pé do ouvido some.** RSVP e reação não são fala — são sinal de
participação, e apagá-los não deixa ninguém falando sozinho.

**5. Duas linhas sobrevivem por obrigação técnica, e isso é decisão, não descuido.** `profiles` tem
FK composta `(user_id, locality_id) → locality_memberships (user_id, locality_id) on delete cascade`
([`20260802000100_locality_profile_foundation.sql:38`](../../supabase/migrations/20260802000100_locality_profile_foundation.sql)):
apagar a membresia derruba o perfil, e o perfil é o que renderiza "Membro que saiu" nos posts que
ficaram. As duas ficam **esvaziadas**:

- `profiles.display_name` → "Membro que saiu"; avatar removido; **`visibility` → `hidden`**; coluna
  nova `deleted_at` preenchida;
- `locality_memberships.access` → `read_only` — valor que o enum já tem
  ([`20260819021416_locality_transfer.sql:59-62`](../../supabase/migrations/20260819021416_locality_transfer.sql)),
  sem precisar de valor novo. O job `degrade_locality_origins()` não toca a linha, porque ele só
  lê rows com `leaving_at`.

> **`visibility → hidden` não é cosmético.** A suíte pgTAP compara o conjunto exato de perfis
> visíveis em Manaus (`locality-profile-access`, `authz-*-matrix`, `full-regression`). Sem esta
> linha, quem saiu continuaria contando, e seis asserts virariam vermelho com cara de regressão —
> a mesma assinatura da armadilha do perfil fantasma "Visual Capture" descrita no `AGENTS.md`.

**6. Dono de vila: sucessão na tela, operador como zelador na purga.** A tela do pedido mostra o
que a pessoa administra e pede um sucessor entre os moderadores. Se ela não escolher, na purga a
posse cai para o operador como zelador e **a vila continua viva**. Grupo já tem o caminho pronto —
`transfer_group_ownership` ([`20260802001000_groups_moderation.sql:457`](../../supabase/migrations/20260802001000_groups_moderation.sql));
**comunidade não tem**, e a RPC de transferência de posse de comunidade nasce nesta onda.

**7. Suspenso pede exclusão, e a saída vira registro.** É a quarta escrita que a decisão 4 do
[`ADR-20260820-suspensao-de-conta`](ADR-20260820-suspensao-de-conta.md) promete ao suspenso, e este
ADR a entrega. A purga grava uma linha em `moderation_actions` registrando que a conta saiu com
sanção ativa — o operador perde o alvo, não perde a memória.

**8. Denúncia aberta contra quem sai fecha como prejudicada, com o ato registrado.** A conta some,
a sanção contra ela fica sem objeto, e reter DM íntima de quem pediu para sumir só para instruir um
processo que não pode mais punir ninguém é retenção sem finalidade. O que fica é a linha em
`moderation_actions`. O denunciante é avisado de que a conta denunciada foi excluída — sem revelar
qualquer outra coisa, no mesmo padrão do §6 do `PILOT_RUNBOOK.md`.

**9. A promessa dos 30 dias tem uma exceção, e ela é declarada com número.** Backup não é editado
cirurgicamente — editar backup é como se corrompe backup. A regra: o backup expira sozinho no ciclo
dele, **e todo restore reaplica as purgas pendentes antes de a aplicação voltar ao ar**.

O ciclo é de **90 dias** (dono, 2026-08-21). Disso sai a única aritmética que a política precisa
carregar, e ela não é 30:

- a **base viva** é purgada em **D+30**, e é isso que o membro vê acontecer;
- o último backup que ainda contém os dados dele é o tirado imediatamente antes da purga, e ele
  expira 90 dias depois de ter sido tirado — ou seja, **no máximo D+120**.

**Cento e vinte dias é o número honesto, e ele é maior que os 90 do WhatsApp.** A política não pode
dizer "30 dias" e parar aí: ela diz que a base viva é limpa em 30, que cópias de segurança não são
editadas e expiram sozinhas em até 90, e que qualquer restauração reaplica as exclusões pendentes
antes de o serviço voltar. Omitir isso é a diferença entre uma exceção declarada e uma reclamação
procedente na ANPD.

**10. Duas frases da política são corrigidas antes de publicar.**

- A que promete impedir a volta — *"Registro de moderação contra você fica por 2 anos... É o que
  impede alguém removido por perseguição de voltar no dia seguinte com outro cadastro"* — **não é
  entregável**. `cpf_hash` é coluna **proibida** em `verification_outcomes`, com teste que falha se
  aparecer ([`tests/privacy/portal-redaction-and-negative-fixtures.test.ts:558`](../../tests/privacy/portal-redaction-and-negative-fixtures.test.ts)).
  Sem identificador estável, o registro de 2 anos guarda o **ato**, não bloqueia reentrada. A frase
  passa a dizer isso.
- A das exceções de retenção ganha a **terceira** exceção, a do backup: base viva limpa em 30 dias,
  cópias de segurança não editadas e expirando em até 90, restauração reaplicando as exclusões
  pendentes — teto real de **120 dias**, escrito como número e não como "aproximadamente".

**11. O que este ADR exige da onda H.** A `moderation_actions` planejada
([plano da onda H, linha 714](../superpowers/plans/2026-08-20-onda-h-operacao.md)) precisa de dois
reparos antes de subir: `actor_user_id` é `not null` **com** `on delete set null` — combinação que
erra em execução no momento em que o ator for apagado — e `subject_user_id` é `cascade`, que
apagaria o registro de 2 anos que a decisão 8 daquele ADR promete. Com a decisão 3 deste ADR o
cascade nunca dispara, mas **o contrato continua escrito errado**, e contrato errado é o que a
próxima pessoa lê.

**O que não muda:** a D11 continua valendo — CPF em texto aberto, payload do Portal, OM, posto e
endereço seguem fora do banco, e este ADR não abre exceção nenhuma a isso.

## Alternatives considered

**A. Apagar de verdade a linha de `auth.users`, repontando o conteúdo para um usuário fantasma
compartilhado.** Rejeitada por evidência de schema, não por gosto: `event_rsvps` tem PK
`(event_id, user_id)`, `group_memberships` tem PK `(group_id, user_id)`, `post_reactions` tem
unique `(post_id, user_id)`, `reports` tem unique parcial `(reporter_user_id, target_type, target_id)
where status = 'open'`. No dia em que dois membros que saíram tiverem confirmado presença no mesmo
evento, repontar os dois para o mesmo fantasma viola a PK. A opção não sobrevive ao primeiro par.

**B. Fantasma por pessoa, e apaga a linha real.** Cada quem-sai ganha um `auth.users` anônimo
próprio, todo conteúdo sobrevivente é repontado e a linha original é apagada. História LGPD mais
limpa — "a conta foi apagada", sem asterisco. Rejeitada pelo custo de execução: é um `update` em
~25 tabelas dentro de uma transação, e a troca é exatamente onde uma FK esquecida vira perda
silenciosa de dado. O repositório já tem o precedente do modo de falha (onda T e `events`). Fica
registrada como a primeira alternativa a reabrir se a revisão jurídica recusar a decisão 3.

**C. Purga imediata, sem janela de arrependimento** — os 30 dias como teto para processo assíncrono,
não como espera. Mais simples, sem estado intermediário nem job agendado. Rejeitada pela decisão 2:
num produto onde voltar exige verificação nova contra o Portal, um pedido feito com raiva ou por
conta invadida não tem conserto.

**D. Transferência de posse obrigatória antes de poder pedir.** A tela recusaria o pedido enquanto
a pessoa fosse dona de alguma comunidade. Menos código e a escolha do sucessor fica com quem
conhece a vila. Rejeitada pela decisão 1 — condiciona direito legal a ato de governança.

**E. Segunda porta "desativar", separada de "excluir", no padrão Nextdoor.** Rejeitada por YAGNI
com fundamento no schema: `profile_visibility` já tem o valor `hidden`
([`20260802000100:6-9`](../../supabase/migrations/20260802000100_locality_profile_foundation.sql)),
que cobre quase tudo que a desativação entregaria, e a janela de 30 dias **já é** o estado
reversível. Somar um segundo estado reversível ao lado dobra a máquina de estados por um ganho
pequeno.

**F. Guardar digest de CPF (HMAC com pepper) para tornar a promessa da decisão 10 entregável.**
Rejeitada **neste ADR**, não em definitivo: guardar identificador derivado de CPF é R3 próprio, com
ameaça, consentimento e governança próprios. Enfiá-la aqui seria exatamente a falha que o
`AGENTS.md` diz que este repositório repete — decidir escopo de privacidade de carona numa migration
que veio fazer outra coisa. Vai para *reopen condition*.

**G. Não fazer nada e publicar a política assim mesmo.** É o estado atual. Rejeitada porque a
política já está escrita prometendo o prazo, e publicá-la sem o caminho transforma uma lacuna de
produto em declaração falsa ao titular.

## Market or reference baseline

**WhatsApp** — a política de privacidade é explícita sobre o que sobrevive:

> "when you delete your account, it does not affect your information related to the groups you
> created or the information other users have relating to you, such as their copy of the messages
> you sent them"

Na prática apaga info de conta e foto, remove de todos os grupos e apaga o histórico próprio, mas o
que foi enviado permanece onde chegou, e no grupo segue visível atribuído a **"Deleted Account"** —
a mesma lápide que a decisão 4 adota, com outro nome. A exclusão é **irreversível** e o help diz
que nem eles revertem em caso de engano; o estado reversível é outra feature (*deactivation*), com
volta por re-registro do número em até 30 dias. A remoção nos servidores leva **até 90 dias**.

**Nextdoor** — duas portas: *deactivate* (perfil escondido, dado mantido, volta logando) e *delete*
(permanente). Na exclusão o padrão relatado é **post apagado ou anonimizado, comentário permanece
sem o nome**, perfil invisível na hora e remoção completa em **até 30 dias**.

> **Limitação de fonte, registrada em vez de escondida.** As páginas oficiais do Nextdoor não são
> acessíveis do ambiente onde este ADR foi escrito — `nextdoor.com` falha no DNS,
> `help.nextdoor.com` falha na validação de certificado e `nextdoor.co.uk` devolve 403. O que
> sustenta o parágrafo acima é convergência de fontes secundárias, não citação oficial. **Quem
> revisar juridicamente deve conferir a política do Nextdoor na fonte** antes de tratar este
> baseline como firme. O do WhatsApp é primário e pode ser citado como está.

**ANPD/LGPD** — [direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
e o [guia de segurança para agentes de pequeno porte](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte),
que já sustentam o §4.4.

## Proposed divergence from baseline

**Duas, e as duas são deliberadas.**

**1. Temos arrependimento; o WhatsApp não.** Justificada na decisão 2: identidade cara de
re-verificar torna o erro caro de desfazer.

**2. Não teremos a segunda porta do Nextdoor.** Justificada na alternativa E: a janela de 30 dias
já é o estado reversível e `profile_visibility = 'hidden'` cobre o resto.

**3. E uma terceira que só apareceu quando o backup ganhou número, registrada em vez de escondida.**
Na **base viva** ficamos na ponta mais estrita: 30 dias, um terço do WhatsApp, igual ao Nextdoor.
Mas somando a expiração de backup da decisão 9, o teto real é **D+120** — mais longo que os 90 dias
que o WhatsApp declara.

Não dá para vender isso como rigor. É o custo de um ciclo de backup de 90 dias, e as opções são
encurtar o ciclo (que é decisão de resiliência, não de privacidade, e tem preço) ou declarar o
número. Este ADR declara o número. O que não é aceitável é a política dizer 30 e o teto ser 120 sem
que ninguém tenha escrito.

## Evidence and sources

- [`docs/legal/PRIVACIDADE.md`](../legal/PRIVACIDADE.md) — o prazo de 30 dias, as duas exceções de
  retenção já declaradas, e as duas frases que a decisão 10 corrige.
- `docs/BIVAQUE.md` §4.4 (os três prazos da governança LGPD), §12 regra 3.
- [`ADR-20260820-suspensao-de-conta`](ADR-20260820-suspensao-de-conta.md) decisões 4 e 8, e a nota
  de correção que registrou esta lacuna.
- [`20260802000100_locality_profile_foundation.sql:22,32,38-40`](../../supabase/migrations/20260802000100_locality_profile_foundation.sql) — a FK composta que obriga a decisão 5.
- [`20260805214709_community_scope.sql:18,26,38`](../../supabase/migrations/20260805214709_community_scope.sql) — os três `on delete restrict` que travam o dono de vila.
- [`20260802001600_reports.sql:27,48-50`](../../supabase/migrations/20260802001600_reports.sql) — cascade do denunciante e o unique parcial que mata a alternativa A.
- [`20260802001500_contextual_dm_abuse_controls.sql:19,36,53,64`](../../supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql) — `dm_conversations`, `dm_messages`, `dm_blocks` e `dm_reports`, as quatro tabelas que a decisão 4 separa em destinos diferentes.
- [`20260802001200_events_rsvp.sql:30-37`](../../supabase/migrations/20260802001200_events_rsvp.sql),
  [`20260804212011_post_reactions.sql:7-13`](../../supabase/migrations/20260804212011_post_reactions.sql),
  [`20260802001000_groups_moderation.sql:43-49`](../../supabase/migrations/20260802001000_groups_moderation.sql) — as PKs compostas por usuário.
- [`20260819021416_locality_transfer.sql:59-62`](../../supabase/migrations/20260819021416_locality_transfer.sql) — o enum `access` que a decisão 5 reutiliza.
- [`tests/privacy/portal-redaction-and-negative-fixtures.test.ts:558`](../../tests/privacy/portal-redaction-and-negative-fixtures.test.ts) — `cpf_hash` como coluna proibida, que sustenta a decisão 10.
- [plano da onda H, linhas 714-722](../superpowers/plans/2026-08-20-onda-h-operacao.md) — a DDL que a decisão 11 manda corrigir.
- [`20260814074813_enable_pg_cron.sql`](../../supabase/migrations/20260814074813_enable_pg_cron.sql) e `degrade_locality_origins()` — o padrão de job agendado que a purga reutiliza.
- [WhatsApp Privacy Policy](https://www.whatsapp.com/legal/privacy-policy) (primária) ·
  [How to delete your account](https://faq.whatsapp.com/2138577903196467/) ·
  [About account deactivation](https://faq.whatsapp.com/969230211289837).
- Nextdoor: [About your data rights](https://help.nextdoor.com/s/article/About-your-data-rights?language=en_US) e
  [Privacy Policy](https://nextdoor.com/privacy_policy/) — **não acessíveis do ambiente**; ver a
  limitação registrada no baseline.

## Benefits

- **A política de privacidade pode ser publicada.** É o desbloqueio direto, e ele destrava o ADR da
  OM e o lançamento, que o §4.4 diz dependerem dela.
- **A cascata deixa de ser uma bomba armada.** Hoje qualquer caminho futuro que apague um usuário
  destrói vila, grupo, evento e comentário alheio. A decisão 3 desarma isso de uma vez, e o teste de
  escopo mantém desarmado.
- **O membro tem a saída sem depender de ninguém.** Sem fila, sem e-mail para suporte, sem
  justificar — que é o padrão que a ANPD espera e o que o produto promete no "O que você pode exigir".
- **O erro tem conserto.** Trinta dias é tempo de quem viajou, perdeu o e-mail ou clicou com raiva
  voltar atrás.
- **A vila não morre junto com o dono.** A decisão 6 separa o direito da pessoa do destino da
  comunidade.

## Risks

- **Policy de escrita esquecida = conta que sai e continua escrevendo.** É o risco central e tem
  precedente exato aqui (onda T e `events`). Mitigação obrigatória, idêntica à do ADR da suspensão:
  enumerar as policies a partir do `pg_policies` **do banco**, nunca do diff, e teste positivo **e**
  negativo por tabela. Se a onda H já tiver subido, os dois guards são verificados no mesmo passe.
- **A revisão jurídica recusar a decisão 3** — entender que o uuid remanescente ainda é dado
  pessoal. Mitigação: a alternativa B está desenhada e fica pronta para assumir; o custo é de
  execução, não de redesenho.
- **Purga parcial deixa a pessoa meio apagada.** Mitigação: função única, transação única,
  tudo-ou-nada, e o job repete no dia seguinte se falhar. Falha de purga é alerta, não silêncio.
- **A janela de 30 dias é retenção depois do pedido**, e alguém pode ler como descumprimento.
  Mitigação: a tela declara a data exata da purga, e a política passa a descrever a janela em vez
  de só o teto.
- **Conta invadida pede exclusão.** É o risco que a janela existe para cobrir; o aviso do pedido vai
  por e-mail no momento do pedido, e o cancelamento não exige nada além de entrar.
- **Convite familiar pendente emitido por quem está saindo.** Se ninguém aceitar até a purga, o
  convite é revogado junto e quem recebeu o link fica sem entrada. Mitigação: a tela do pedido
  avisa quantos convites pendentes serão revogados; **conta familiar já aceita não é afetada**,
  porque ela é usuário independente depois do aceite.
- **Suporte.** Exclusão gera contato humano, e sempre com quem já decidiu ir embora.

## Reversal cost

**Médio, e assimétrico no tempo.** Antes da primeira purga: baixo — a tabela de pedidos e o guard
saem numa migration reversa e nada foi destruído. Depois da primeira purga: **irreversível para
aquelas pessoas**, por construção, e é isso que a decisão 2 protege com os 30 dias.

O que continua reversível para sempre é a *forma*: migrar da decisão 3 para a alternativa B mais
tarde é um `update` de FKs sobre contas já esvaziadas, não uma recuperação de dado perdido.

## Success metric

Noventa dias depois da onda fechar:

- **100% dos pedidos** purgados dentro de 30 dias — auditável em `account_deletion_requests`, sem
  exceção nem purga manual;
- **zero** caso em que uma conta em janela de exclusão conseguiu escrever em qualquer superfície,
  verificável pela suíte de negação e não por observação;
- **zero** comunidade ou grupo destruído, órfão sem dono, ou evento que perdeu RSVP por causa de uma
  exclusão;
- **zero** ocorrência de `delete from auth.users` em qualquer caminho do produto, garantida por
  teste de escopo e não por revisão de código;
- **100% dos cancelamentos** dentro da janela devolvendo a conta íntegra.

## Reopen condition

- **Se a revisão jurídica recusar a decisão 3**, reabrir na alternativa B — o desenho já está aqui.
- **Se aparecer padrão de suspenso saindo e voltando**, reabrir a alternativa F: aí o digest de CPF
  passa a ter finalidade demonstrada por evidência, que é o que hoje falta para justificá-lo. ADR
  próprio, com ameaça e consentimento próprios.
- **Se o operador virar gargalo como zelador de vilas órfãs**, reabrir a decisão 6 para desenhar
  sucessão automática entre moderadores.
- **Se o volume de cancelamento dentro da janela passar de 30% dos pedidos**, o problema não é a
  janela: é a tela que está fazendo gente pedir sem querer. Reabrir o fluxo de confirmação.
- **Se o produto passar a ter conta de prestador com contrato** (onda G,
  [`ADR-20260820-conta-de-prestador`](ADR-20260820-conta-de-prestador.md)), reabrir a decisão 4: dado
  de cobrança tem retenção fiscal própria, que este ADR não trata.

## Approval

**Pendente.** Este ADR é R3 e exige aprovação humana explícita registrada aqui, com veredito de
crítico independente `PASS`, antes de qualquer migration.

As cinco decisões de produto foram tomadas pelo dono (Juan) na sessão de desenho de 2026-08-21 —
janela de arrependimento de 30 dias, público sobrevive e privado morre, sucessão forçada sem travar
o pedido, aceitar a lacuna da reentrada e corrigir a política, e anonimização no lugar. **Isso não
é a aprovação do ADR**: é o insumo dela. O que falta para aprovar:

1. ~~**Revisão jurídica** confirmando que o uuid esvaziado não é dado pessoal.~~ **Fechado pelo
   dono em 2026-08-21: não é.** Registrado na decisão 3, junto com o que essa determinação é e o
   que ela não é — a revisão jurídica do documento de privacidade inteiro, que a
   [`PRIVACIDADE.md`](../legal/PRIVACIDADE.md) exige desde 2026-08-11, continua valendo e é
   anterior a este ADR. **As bases legais das três retenções da decisão 4 seguem dentro dela.**
2. ~~**O prazo do ciclo de backup** da decisão 9.~~ **Fechado pelo dono em 2026-08-21: 90 dias.**
   Registrado na decisão 9, com a aritmética que dele decorre — teto real de D+120, que a política
   passa a declarar.
3. **Veredito de crítico independente**, que a revisão inline registrada no `critic_review` não
   substitui. **É o único item que resta**, e é o que mantém este ADR em `proposed`.

**A aprovação não destrava a implementação sozinha.** A decisão 11 exige que a DDL da
`moderation_actions` da onda H seja corrigida antes ou junto — e a regra do `AGENTS.md` vale aqui
sem exceção: **a coluna e as policies que a leem entram na mesma migration**, nunca "no futuro".
