# Onda G — Vitrine

> **DRAFT de plano de execução**, escrito em 2026-08-19 contra `main@ce918f1`.
>
> Este arquivo ainda não é autorizador de execução. G toca marketplace, dados pessoais, RLS e monetização; pela `RISK_MATRIX.md`, é **R3**. Antes da Task 1 deve existir ADR aprovado, `critic_verdict: PASS` e aprovação humana cobrindo a fronteira de prestador e o modelo de amplificação/billing.
>
> Marque `- [x]` somente durante a execução real e faça **um commit por task**.

## 0. Precedência

Antes desta onda:

```text
S0 → T → D2 → E → F
```

Além disso, **H0 (Tasks 1–4 do plano H) precisa estar concluída antes da Task 7**, que abre conversa privada membro↔prestador.

A razão não é estética: hoje `dm_reports` não chega ao painel do operador e não existe suspensão de pessoa. Não abra um canal privado comercial sem o sad path de segurança.

## 1. O que G entrega

G tem duas subfases deliberadas.

### G1 — Vitrine Core

- prestador entra por indicação de membro;
- Auth account sem `locality_membership`;
- acesso apenas ao shell/dashboard próprio;
- ficha com identidade, categoria, catálogo e portfólio;
- ficha grátis na comunidade que o indicou;
- busca por categoria/container + `pg_trgm` no nome;
- contato membro↔prestador via contexto `provider`;
- métrica first-party de contatos recebidos.

### G2 — Amplificação

- entitlement de alcance além da comunidade de origem;
- Asaas com checkout hospedado;
- webhook idempotente;
- cancelamento/expiração;
- indicação visível de alcance pago;
- **dinheiro nunca altera ranking**.

G1 não espera CNPJ. G2 espera.

## 2. Decisões que este plano não pode inventar

O ADR R3 precisa fixar, antes da Task 1:

1. convite de prestador single-use e vinculado ao e-mail-alvo;
2. comunidade que indicou = unidade grátis de origem;
3. entitlement pago pode apontar para `community` e/ou `locality`;
4. preço/tier não vive hardcoded em RLS;
5. cobrança é da plataforma, nunca do serviço contratado entre membro e prestador;
6. provider pode ler/editar **somente** sua superfície e suas conversas `provider`;
7. provider não ganha `locality_membership`, não lê feed, grupo, evento de membro ou perfil alheio.

Se o ADR decidir diferente, **o ADR vence este plano** e este arquivo precisa ser reconciliado antes da execução.

## 3. Contexto obrigatório

Leia antes de começar:

- `docs/BIVAQUE.md` §1.3, §6.2, §6.4, §7 inteiro; D17, D20, D26–D29, D36, D37, D41, D44, D45;
- `docs/PRODUCT_STATUS.md` §7, §8 e §11;
- `docs/audit/GAP_ANALYSIS.md` C01–C06;
- `docs/audit/DEPENDENCY_MAP.md` §§7–9;
- `AGENTS.md` inteiro, especialmente Supabase/RLS e regra de scope+policy na mesma migration;
- plano H, Tasks 1–4, antes da Task 7.

---

# G1 — Vitrine Core

## Task 1: a conta de prestador nasce fail-closed

O prestador é um usuário do Supabase Auth, **não é membro** e não recebe membership de localidade/comunidade como atalho.

- [ ] **Step 1: modelo de conta**

  Migration nova para uma entidade de papel explícita, por exemplo `public.provider_accounts`, com no mínimo:

  - `user_id` PK/FK para `auth.users`;
  - `invited_by_user_id`;
  - `home_community_id`;
  - `status` (`pending`, `active`, `suspended` ou o conjunto aprovado no ADR);
  - timestamps.

  Não coloque `provider` em `profiles` se isso fizer a conta parecer membro. `profiles` é identidade de membro no desenho atual; misturar os dois cria policy ambígua.

- [ ] **Step 2: convite de prestador**

  Criar convite single-use, com token persistido apenas como digest e, se aprovado no ADR, binding ao e-mail-alvo. Carrega obrigatoriamente:

  - quem indicou;
  - `community_id` de origem;
  - destinatário;
  - expiração/status.

  Só membro verificado e com membership ativa naquela comunidade pode indicar.

- [ ] **Step 3: aceite**

  O destinatário autentica no Auth e aceita. A transação cria `provider_accounts` **sem** criar qualquer linha em `locality_memberships`, `community_memberships` ou `group_memberships`.

- [ ] **Step 4: RLS nasce junto**

  Na mesma migration:

  - provider lê a própria `provider_account`;
  - provider não lê contas de outros;
  - membro não enumera provider accounts internos;
  - service/operator só acessa pelo helper autorizado.

- [ ] **Step 5: testes**

  pgTAP:

  - membro da comunidade cria convite;
  - membro de outra comunidade não cria convite para aquela origem;
  - token usado/expirado não provisiona;
  - conta provider nasce sem membership;
  - provider não consegue `select` de `profiles`, posts, grupos ou memberships por ganhar o novo papel.

- [ ] **Step 6: gate e commit**

  `feat(provider): fail-closed provider account by member referral`.

---

## Task 2: identidade da ficha e categoria canônica

D45 fixa a ficha em **identidade + catálogo + portfólio**. Esta task constrói o primeiro bloco.

- [ ] **Step 1: categorias próprias da vitrine**

  Não reutilize `recommendation_category`: aquele domínio contém `outros`, proibido em §7.2.1.

  Crie catálogo estável de categorias com slug/id e label. Começa com as categorias do canon; mudança futura é decisão, não texto livre do provider.

- [ ] **Step 2: `provider_profiles`**

  Campos mínimos:

  - `provider_user_id` unique/FK;
  - nome comercial/display;
  - descrição curta;
  - categoria primária;
  - `publication_status` (`draft`/`published`);
  - timestamps.

  Evite endereço residencial. Não copie OM, patente, CPF ou dado militar para a ficha.

- [ ] **Step 3: assets privados**

  Logo/avatar/portfólio em bucket privado. Leitura por URL assinada emitida no servidor após verificar que:

  - provider é dono do asset; ou
  - membro autenticado pode ver a ficha naquele container.

  Bucket público transforma foto de uma comunidade fechada em URL pública fora do produto; não use.

- [ ] **Step 4: draft não é público**

  Membro não vê `draft`. Provider vê/edita a própria ficha. Operator vê para moderação conforme helper.

- [ ] **Step 5: testes**

  - provider A não edita provider B;
  - membro não vê draft;
  - membro autorizado vê published;
  - não-membro/anon não enumera ficha;
  - categoria fora do catálogo falha.

- [ ] **Step 6: gate e commit**

  `feat(provider): provider identity and canonical marketplace categories`.

---

## Task 3: catálogo e portfólio

- [ ] **Step 1: catálogo**

  `provider_catalog_items` pertencem a uma ficha. Formato único para produto e serviço.

  Mínimo:

  - nome;
  - descrição curta;
  - preço opcional/forma aprovada pelo ADR (`price_cents` + qualifier, ou equivalente tipado);
  - ativo/inativo;
  - posição manual dentro da própria ficha.

  Não existe checkout do serviço. O preço é informativo.

- [ ] **Step 2: portfólio**

  `provider_portfolio_items` com asset privado, legenda opcional, posição e ativo/inativo.

- [ ] **Step 3: limites do piloto**

  Defina limites razoáveis em contrato/config — quantidade de itens e fotos — para impedir abuso de storage. Não crie “plano pago = mais ranking”. Ferramenta/catálogo maior pode ser produto futuro, mas não entra sem decisão de pricing.

- [ ] **Step 4: UI de edição**

  Dashboard provider permite criar/editar/reordenar/desativar itens e portfólio. Feedback explícito de sucesso/erro; nenhuma affordance aponta para feed/comunidades.

- [ ] **Step 5: testes**

  - owner CRUD passa;
  - provider alheio é negado;
  - membro só lê item ativo de ficha published alcançável;
  - asset alheio não assina URL.

- [ ] **Step 6: visual + commit**

  Rodar o loop visual nas telas novas.

  `feat(provider): catalog and portfolio on the provider card`.

---

## Task 4: alcance grátis e busca

A regra de monetização começa pelo grátis: ficha completa na comunidade de origem, sem pagar.

- [ ] **Step 1: função de visibilidade**

  Criar helper/RPC que responde se uma ficha é alcançável pelo membro no **container atual**.

  Antes de G2, o único alcance é `home_community_id`.

  Durante transferência, localidade municipal pode mudar/duplicar conforme T, mas isso **não concede comunidade**. A ficha grátis continua presa à comunidade de origem.

- [ ] **Step 2: índice de nome**

  `pg_trgm` no nome da ficha, conforme D44. Categoria é filtro exato.

- [ ] **Step 3: busca**

  A busca recebe:

  - container/community atual;
  - categoria opcional;
  - termo de nome opcional.

  Não existe busca de pessoas. O resultado é ficha comercial, não diretório humano.

- [ ] **Step 4: ordenação**

  Dinheiro não participa. Antes de existir reputação robusta, use regra determinística neutra definida no código/SQL e documentada. Não invente “score premium”.

- [ ] **Step 5: testes de fronteira**

  - membro da comunidade origem encontra provider;
  - membro de outra comunidade não encontra sem entitlement;
  - anon não encontra;
  - provider draft não aparece;
  - busca por nome trigram e categoria exata retornam somente conjunto alcançável.

- [ ] **Step 6: E2E + commit**

  E2E com duas comunidades e, se seed permitir, duas localidades.

  `feat(marketplace): scoped provider search without paid ranking`.

---

## Task 5: shell e dashboard do prestador

O provider não deve cair no shell de membro e descobrir, por 403 sucessivos, o que não pode acessar. O shell já nasce separado.

- [ ] **Step 1: roteamento por papel**

  Depois do Auth:

  - membro → shell de membro;
  - provider ativo → `/provider` (ou shell aprovado);
  - provider pending → status próprio;
  - operador continua no console existente.

  Nunca inferir provider por ausência de membership; o papel precisa ser explícito.

- [ ] **Step 2: dashboard**

  Primeira versão mostra somente fluxos que existem:

  - estado da ficha;
  - editar identidade;
  - catálogo;
  - portfólio;
  - caixa de conversas quando Task 7 fechar;
  - métrica first-party quando Task 8 fechar.

  Não renderize cards “em breve” como se fossem capability.

- [ ] **Step 3: navegação negativa**

  Provider não tem affordance para `/community`, `/groups`, `/events`, `/guide`, perfis de membros ou busca de pessoas.

- [ ] **Step 4: E2E**

  Provider autenticado abre dashboard e recebe negação indistinguível/redirect adequado ao tentar uma rota exclusiva de membro. Membro não abre dashboard provider alheio.

- [ ] **Step 5: visual + commit**

  `feat(provider): dedicated provider shell and dashboard`.

---

## Task 6: corrigir a máquina de DM antes de reutilizá-la

**Esta task ainda não abre provider DM.** Ela torna o motor reutilizável.

- [ ] **Step 1: bloqueio bilateral**

  Corrigir helper/policy: se existe block entre A e B em qualquer direção, **nenhum dos dois envia**.

  O teste atual que diz `blocker can still send` precisa virar negativo.

- [ ] **Step 2: criação deixa de confiar no cliente**

  Não faça o browser ordenar UUID e inserir `dm_conversations` como mecanismo de autorização.

  Criar RPC/Server Action específica para abertura de conversa contextual. Para provider, a API recebe o provider/ficha e deriva participantes/contexto no servidor.

- [ ] **Step 3: contexto declarado é validado**

  Um `context_type` não é prova. O helper precisa conferir que o `context_id` realmente concede aquele contexto àquele par.

- [ ] **Step 4: member↔member continua adiado**

  Remover/desabilitar `Nova conversa` genérica que hoje lista membros de grupos. Não apague histórico; apenas não abra criação nova fora dos contextos permitidos pelo canon.

- [ ] **Step 5: testes**

  - block em qualquer direção nega send dos dois;
  - UUID invertido não é preocupação do cliente;
  - context spoofing é negado;
  - member↔member não ganha novo entrypoint.

- [ ] **Step 6: gate e commit**

  `fix(dm): make blocking symmetric and context creation server-owned`.

---

## Task 7: conversa membro ↔ prestador

> **HARD STOP:** H0 precisa estar verde antes desta task.

- [ ] **Step 1: contexto `provider`**

  Adicionar o contexto na máquina DM. `context_id` aponta para a ficha/entidade aprovada pelo ADR.

  `can_dm_between`/substituto precisa provar:

  - um lado é membro legítimo do container que vê a ficha;
  - o outro lado é provider owner daquela ficha;
  - a ficha está published e alcançável;
  - não existe block;
  - nenhum dos dois está suspenso para escrita.

- [ ] **Step 2: entrypoint único**

  Botão `Conversar` vive na ficha. Não existe diretório de pessoas.

- [ ] **Step 3: inbox provider**

  Provider lê apenas conversas `provider` em que é participante. Não herda regras de member membership.

- [ ] **Step 4: report**

  `Denunciar` da mensagem usa o modelo unificado da H0. Nada grava mais numa fila que o operador não vê.

- [ ] **Step 5: testes**

  - member alcançável inicia;
  - member fora do alcance não inicia por UUID direto;
  - provider não inicia conversa com member arbitrário;
  - provider não lê outra conversa;
  - block/suspensão fecham send;
  - report aparece na fila unificada.

- [ ] **Step 6: E2E + visual + commit**

  `feat(provider): member-to-provider conversations with operational reporting`.

---

## Task 8: métrica first-party do dashboard

Não use PostHog como fonte de verdade do que será mostrado ao prestador.

- [ ] **Step 1: métrica inicial**

  Contatos recebidos = contagem de conversas `context_type = provider` criadas para aquela ficha no período.

  É derivável do banco, auditável e não requer tracking adicional.

- [ ] **Step 2: período**

  7/30 dias ou a janela aprovada no ADR/UI. Não invente projeção, lead qualificado ou conversão sem dado que prove isso.

- [ ] **Step 3: RLS/RPC**

  Provider consulta somente a própria métrica; operator pode observar agregados necessários.

- [ ] **Step 4: testes**

  provider A não lê métrica de B; conversa member↔member histórica não conta; conversa duplicada não infla se a constraint impedir duplicata.

- [ ] **Step 5: commit**

  `feat(provider): first-party contact metric on provider dashboard`.

---

# G2 — Amplificação

## Task 9: entitlement de alcance separado de billing

- [ ] **Step 1: modelo**

  Criar `provider_reach_entitlements` (nome a confirmar) com:

  - provider/ficha;
  - `scope_type` (`community`/`locality` se aprovado);
  - `scope_id` validado;
  - origem (`billing`, `operator`, etc. se o ADR permitir);
  - vigência início/fim;
  - status.

- [ ] **Step 2: busca lê entitlement**

  O conjunto elegível passa a ser:

  ```text
  home_community
  OR active entitlement for current community/locality
  ```

  Ranking continua idêntico.

- [ ] **Step 3: sinalização**

  Se o membro vê a ficha apenas porque houve alcance pago, a UI declara isso de forma curta e inequívoca. Não chamar de “recomendado”.

- [ ] **Step 4: testes**

  ativar entitlement expande visibilidade; expirar remove expansão; home community continua vendo; ordem não muda ao pagar.

- [ ] **Step 5: commit**

  `feat(marketplace): paid reach as visibility entitlement, never ranking`.

---

## Task 10: Asaas — checkout hospedado e webhook idempotente

> **HARD STOP humano:** CNPJ + credenciais + pricing aprovado.

- [ ] **Step 1: adapter**

  Isolar Asaas em módulo próprio. Browser nunca recebe secret. Cartão nunca toca o Bivaque.

- [ ] **Step 2: checkout**

  Provider escolhe o produto de alcance aprovado e recebe checkout hospedado.

- [ ] **Step 3: webhook**

  Endpoint valida autenticidade conforme contrato atual do Asaas e persiste `event_id`/idempotency key antes de aplicar efeito.

  Eventos repetidos não criam entitlement duplicado.

- [ ] **Step 4: state machine**

  Mapear somente estados necessários para ativar, cancelar, expirar e falhar. Não espalhar strings do Asaas pelo domínio.

- [ ] **Step 5: nenhum pagamento do serviço**

  Não existe order/payment entre member e provider. O billing é exclusivamente do produto Bivaque.

- [ ] **Step 6: testes**

  - webhook válido ativa;
  - replay é no-op;
  - assinatura/evento inválido não altera estado;
  - cancelamento/expiração remove alcance extra;
  - ficha grátis permanece;
  - provider não consegue ligar flag direto pelo cliente.

- [ ] **Step 7: commit**

  `feat(billing): Asaas-hosted paid reach with idempotent entitlements`.

---

## Task 11: fechamento da onda G

- [ ] rodar gate completo;
- [ ] `db:reset --no-seed` + pgTAP + db lint;
- [ ] `db:reset` com seed + E2E serial e CI paralelo;
- [ ] auditoria visual de todas as telas provider/vitrine tocadas em 375/768/1440;
- [ ] threat review específico de enumeração de provider/member e signed assets;
- [ ] reconciliar `docs/PRODUCT_STATUS.md` §7, §8 e §11;
- [ ] registrar o que G1 fechou e, se G2 estiver bloqueada por CNPJ, escrever **bloqueada externamente**, nunca `DONE`;
- [ ] atualizar o índice de planos somente depois de critic PASS/human approval deste plano.

### Critério de aceite final de G1

Um membro de uma comunidade encontra uma ficha publicada originada ali, abre identidade/catalog/portfólio, inicia conversa; o provider recebe e responde no próprio shell; qualquer mensagem é reportável e operável; provider não ganha acesso a conteúdo de membro.

### Critério de aceite final de G2

O provider compra amplificação da plataforma, o entitlement expande **onde a ficha aparece**, não **onde ela rankeia**, e cancelamento remove apenas a expansão paga.