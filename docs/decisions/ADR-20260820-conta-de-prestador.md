---
id: ADR-20260820-conta-de-prestador
status: accepted
risk: R3
owner: Juan
approved_at: 2026-08-20
expires_at:
linked_plan: docs/superpowers/plans/2026-08-20-onda-g-vitrine.md
critic_verdict: PASS
critic_review: Revisao adversarial executada em 2026-08-20 na mesma sessao que escreveu o ADR — o critico NAO foi independente, e isso fica registrado aqui em vez de ser omitido. A revisao achou e corrigiu seis defeitos de implementabilidade antes da aprovacao (helper inalcancavel por policy, leitura de display_name negada pela RLS, sync_paid_reach contradizendo a tolerancia de 7 dias, recurso sem tabela, revogacao de ficha sem task, e uma citacao de migration errada sobre exclusao de conta). Nenhum defeito atingiu as decisoes em si. Veredito PASS.
---

# A conta do prestador civil: como entra, o que vê, e o que nunca vê

## Problem

A vitrine é o comportamento que a comunidade já demonstra hoje — o grupo de classificados da
vila vende peixe, marmita, conserto de ar-condicionado e serviço de despachante — e a D20
colocou a vitrine dentro do piloto. Vitrine exige oferta, oferta exige prestador, e prestador
exige **conta**.

Isso cria um tipo de conta que este produto não tem: **um civil, dentro de uma rede fechada de
militares federais identificáveis, onde a fronteira de acesso é a razão de o produto existir**.
A D37 já decidiu o mecanismo — usuário do Auth com papel, sem membership — e não decidiu nada
do devido processo em volta dele: quem indica, o que o prestador enxerga do membro, o que
acontece com a ficha quando quem indicou sai, e sob qual base o civil é titular de dados.

**Sem essa decisão a onda G não pode começar**, porque cada uma das quatro perguntas muda
policy de RLS, e a `RISK_MATRIX.md` classifica exatamente isso como R3.

Três fatos do código de hoje que tornam a pergunta concreta:

1. `apps/web/middleware.ts:135-153` manda **qualquer** autenticado sem `locality_memberships`
   para `/onboarding`, o funil de CPF do membro. Uma conta de prestador feita hoje ficaria
   presa lá, sem saída.
2. `supabase/migrations/20260802001600_reports.sql:126-136` exige `locality_memberships` para
   inserir denúncia. Um prestador, por construção, não pode denunciar nada.
3. `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:26,229` permite abrir
   conversa apenas a quem tem o UUID menor do par — a máquina de DM que a D36 manda reaproveitar
   está quebrada para metade dos pares, e a metade é sorteio.

## Decision

**1. Entrada por indicação, atada ao e-mail.** O prestador não se cadastra sozinho e não é
criado pelo operador. Um **membro com `community_memberships.status = 'approved'`** o indica
para **aquela** comunidade; o convite carrega digest do token e digest do e-mail-alvo; o aceite
confere o e-mail. Cota de **cinco convites de prestador ativos por membro**, a mesma ordem de
grandeza do convite familiar (§5.4).

Isso executa o §4.1 sem invenção: *"é bom prestador" é atestado pela comunidade que o indicou*.

**2. A ficha pertence à comunidade que atestou, não à pessoa que indicou.** Se o membro que
indicou sai da vila, é transferido ou é suspenso, **a ficha continua**. Revogar é ato do **dono
da comunidade**, registrado com autor e motivo. O contrário — ficha que morre junto com quem
indicou — faria a vitrine desabar em dezembro, que é exatamente quando metade da vila muda.

**3. O que o prestador vê, exaustivamente:** a própria ficha, o próprio catálogo, o próprio
portfólio, o próprio alcance, e as conversas que **um membro** abriu com ele. Dentro da
conversa, vê o `display_name` do membro e mais nada — não o e-mail, não a vila, não a
afiliação, não a localidade.

Fora disso: nenhum post, nenhum perfil, nenhum grupo, nenhum evento, nenhuma comunidade,
nenhuma lista de membros e nenhuma lista de outros prestadores.

> E o nome ele vê **por um RPC estreito**, não pela tabela:
> `profiles_select_visible_in_locality` (`20260817031237:102-109`) exige localidade
> compartilhada, e o prestador não tem nenhuma. Sem o RPC a caixa de pedidos mostraria "sem
> nome" para todo mundo — o que é a fronteira funcionando, não um defeito a corrigir
> afrouxando a policy.

**4. O prestador nunca inicia conversa.** Só o membro abre. O prestador responde dentro de
conversa existente. Uma conta civil abrindo conversa com militar identificável é contato não
solicitado, e é a porta que a rede fecha na entrada — abri-la pelo lado de dentro anularia a
verificação.

**5. O prestador pode denunciar mensagem — e só mensagem.** A policy de insert de `reports`
ganha `or (private.is_provider_account((select auth.uid())) and target_type = 'message')`. Um
civil assediado dentro do produto precisa de canal; dar a ele os outros alvos seria dar leitura
de conteúdo que ele não tem.

> O helper é o de `private`, não o de `public`. Policy é avaliada como `authenticated`, e o
> `public.is_provider_account` é concedido só a `service_role` — a versão `public` existe para
> o gate do shell, que roda com `service_role`, e a de `private` para as policies. Mesmo par
> que `private.is_locality_member` já usa. Sem essa distinção, a policy falha por privilégio.

**6. Telefone é opcional e opt-in.** `contact_phone` pode ficar em branco e a ficha funciona
sem ele. Quando preenchido, é publicado para quem alcança a ficha, com aviso explícito no
momento do cadastro de que aquilo será visível para centenas de pessoas.

**7. O prestador é titular de dados.** `docs/legal/PRIVACIDADE.md` ganha a seção dele —
finalidade, base legal, prazo, e o direito de eliminação — **antes da primeira ficha real**.

**O que não muda:** o prestador continua sem `locality_memberships` e sem
`community_memberships` (D37, e é o que faz toda policy de conteúdo falhar fechado por
construção); a proibição de intermediar transação continua (D26); a proibição de persistir
CPF, endereço e organização militar continua (D11 e `AGENTS.md:205`).

## Alternatives considered

**A. Auto-cadastro aberto, com moderação a posteriori** — o modelo do Nextdoor Business Page.
Rejeitada: transfere para a fila de moderação o trabalho que a indicação faz de graça, e num
piloto de um fundador solo a fila é a primeira coisa a estourar. Pior: destrói a propriedade
que o produto vende, que é *cada fato atestado por quem consegue atestá-lo*. Ninguém no Bivaque
consegue atestar um prestador que se auto-cadastrou.

**B. Prestador é um membro com papel extra** — reaproveitar `profiles` e dar uma flag. Rejeitada,
e é a alternativa mais tentadora porque economiza uma tabela. Ela quebra a garantia central:
toda policy de conteúdo deste schema pergunta por membership, e um prestador com membership
passaria a ler feed, perfil e grupo por **omissão**, não por decisão. A D37 já registra isso —
*"sem membership nenhuma policy de conteúdo casa: falha fechado por construção"*.

**C. Sem conta: a ficha é um registro que o membro mantém** — o prestador nunca entra no
produto, e quem indicou edita a ficha dele. Rejeitada por duas razões: transfere a manutenção
de catálogo e preço para quem não tem interesse nela (a ficha apodrece em semanas), e a D45 e a
D37 já preveem dashboard próprio com caixa de pedidos, que não existe sem conta.

**D. Conta criada pelo operador, sob demanda** — sem convite, sem cota. Rejeitada: coloca o
fundador no caminho crítico de cada prestador, e a §5.1 já avisa que a vila entra de uma vez.

## Market or reference baseline

- **Nextdoor**: [ficha de negócio gratuita](https://business.nextdoor.com/en-us/getting-started/business-page)
  com upgrade pago, auto-cadastro, e indicação positiva por construção. O §2 do `BIVAQUE.md`
  manda copiar a ficha gratuita e a indicação positiva.
- **GetNinjas e OLX**: taxonomia de categorias fechada, ficha com catálogo, contato revelado ao
  interessado. Base das doze categorias do §7.2.1.
- **WhatsApp Business**: catálogo com item, foto, descrição e preço — o formato que a §7.2.1
  regra 3 adota, e a prova de que produto e serviço cabem na mesma taxonomia.
- **The Military App** (Reino Unido):
  [cobra das organizações, não dos membros](https://www.militaryapp.org/policies/app-terms-and-conditions)
  — a mesma linha da D27.

## Proposed divergence from baseline

**Duas, deliberadas.**

1. **O auto-cadastro do Nextdoor não é copiado.** Lá a rede é aberta por endereço; aqui a rede
   é fechada por credencial conferida pelo Estado, e um cadastro aberto de civil dentro dela
   apagaria a diferença que o produto vende. A indicação por membro aprovado é a divergência.
2. **O prestador não navega a rede.** Em Nextdoor e GetNinjas o prestador é um usuário como
   qualquer outro, que lê o feed. Aqui ele vê a própria ficha e as conversas que recebeu.

## Evidence and sources

- `docs/BIVAQUE.md` §1.3 (a linha do prestador na tabela de papéis), §4.1, §6.2, §7.2.1, §12.
- Decisões D17, D20, D26, D36, D37, D43, D44, D45 na tabela do §9.
- `docs/PRODUCT_STATUS.md` §7 — as cinco linhas da vitrine, todas "não existe" — e §8, a linha
  "Conversa membro ↔ prestador" com os três defeitos da máquina de DM.
- `apps/web/middleware.ts:135-153` — o funil que prende a conta sem membership.
- `apps/web/app/components/bivaque/bottom-nav.tsx:33-34` — o comentário que registra, no
  código, que vitrine e busca caem no container "cidade".
- `supabase/migrations/20260802000200_private_trust_family_foundation.sql:38-58` — o padrão de
  convite atado ao e-mail que este ADR reaproveita.
- `supabase/migrations/20260806111744_is_current_user_operator.sql` — o padrão de gate de papel
  por RPC que `is_provider_account` copia.
- `supabase/migrations/20260802001600_reports.sql:126-136` — a policy que hoje impede o
  prestador de denunciar.

## Benefits

- **A oferta existe sem o fundador no caminho.** A vila indica, a vila cresce a vitrine.
- **A fronteira é estrutural, não vigiada.** Sem membership, o prestador não lê conteúdo porque
  nenhuma policy o alcança — não porque alguém lembrou de negar.
- **Dezembro tem o que oferecer a quem chega.** Transportadora, despachante, escola e
  ar-condicionado são a metade da demanda do §10, e nenhuma delas é conversa de feed.
- **A ficha grátis na própria vila** (D28) é o que faz o dono da comunidade mandar o link
  (§5.3): a vitrine melhora a vida dele antes de melhorar a de qualquer outro.

## Risks

- **Privacidade do membro.** O prestador vê `display_name` de quem o procura. Mitigação: é o
  mesmo nome que qualquer membro da vila já vê, a conversa é sempre iniciada pelo membro, e o
  bloqueio bidirecional da onda G Task 6 encerra o canal.
- **Privacidade do prestador.** Telefone publicado para centenas de pessoas. Mitigação: opt-in,
  em branco por padrão, com aviso no cadastro.
- **Enumeração pela vitrine.** Uma ficha que aparece em N vilas revela a quais vilas ela
  atende. Aceito: a ficha é oferta comercial, o prestador escolhe onde aparecer, e não há dado
  de militar nela.
- **Convite vazado.** Mitigado pelo digest do e-mail-alvo — link encaminhado não provisiona
  quem abrir. É a mesma propriedade que a D16 exige do convite familiar.
- **Vitrine vazia no dia um.** A §3.4 avisa: categoria demais com prestador de menos faz tudo
  parecer vazio ao mesmo tempo. Mitigação: filtro de categoria só aparece quando há ficha.
- **Conta civil abandonada.** Ficha sem dono ativo envelhece e engana. Mitigação: revogação
  pelo dono da comunidade, e a medição abaixo.
- **Suporte.** Um público novo, que não passou pelo onboarding do membro e não conhece o
  produto. Aceito, e é parte do custo da onda.

## Reversal cost

**Médio, e cai rápido com o tempo.** Antes de existir prestador real: apagar quatro tabelas e
uma migration reversa. Depois: cada ficha é conteúdo de um terceiro que investiu tempo, e
remover a vitrine é comunicação com pessoas que não são membros, fora do canal de retorno do
produto. A janela barata de reversão fecha na primeira vila que abrir com vitrine.

O que **não** é reversível barato em nenhum momento: o e-mail de um civil que entrou no banco.
Por isso o digest, e por isso a seção na política de privacidade antes da primeira ficha.

## Success metric

Noventa dias após a primeira vila abrir com vitrine:

- **≥ 15 fichas ativas** na vila piloto (o mesmo número que a §7.2.1 usa como gatilho de divisão
  de categoria — abaixo disso a vitrine não tem densidade para existir);
- **≥ 30% das fichas** com ao menos uma conversa iniciada por membro (ficha que ninguém procura
  é diretório, não vitrine);
- **zero** incidente de acesso em que um prestador leu conteúdo de membro.

## Reopen condition

- Se a indicação por membro produzir menos de 15 fichas em 90 dias, reabrir a alternativa A
  (auto-cadastro com aprovação do dono da comunidade) — o gargalo terá sido a porta, não a
  demanda.
- Se aparecer um caso real de assédio de prestador a membro, reabrir a decisão 4 para fechar
  também a resposta, não só a iniciação.
- Se o ADR da OM (`ADR-20260811-om-declarada`) for aprovado, reabrir a decisão 3: afiliação
  declarada visível ao prestador é uma pergunta nova, e a resposta padrão continua sendo não.

## Approval

**Aprovado.** Autorizacao explicita do dono (Juan) em 2026-08-20, na sessao de planejamento das ondas G e H: *"Revise as adr, se não tiver nada que impeça o desenvolvimento, pode autorizar"*. A revisao esta registrada em `critic_review` — inclusive a ressalva de que o critico foi o proprio autor do ADR.

Mesmo formato do `ADR-20260816-shells-e-navegacao`, que registra veredito por autorizacao explicita do dono em sessao.

A onda G esta destravada da Task 1 a Task 6. O bloco G2 continua parado pelo CNPJ e pelo [ADR do alcance pago](ADR-20260820-alcance-pago.md).

Se durante a execucao alguma das sete decisoes se mostrar errada, a correcao entra aqui e o plano acompanha — nao o contrario.
