---
id: ADR-20260816-national-localities
status: proposed
risk: R3
owner: Juan
approved_at: 2026-08-16
expires_at:
linked_plan: docs/superpowers/plans/2026-08-16-p0-localidades-nacionais.md — GitHub issue #20
critic_verdict: pending
critic_review:
---

# Bivaque nacional no cadastro; Manaus como piloto operacional

> **Emendado em 2026-08-16, depois da sessão de decisões que produziu o plano da P0.** Quatro
> mudanças, e três delas invalidam texto que está abaixo:
>
> 1. **`risk: R2` → `R3`.** A `RISK_MATRIX.md:40` é explícita: *"Any plan touching RLS, private
>    data, **identity verification**, Supabase policies, secrets, or destructive database
>    operations is R3."* Esta P0 reescreve `verifyAndProvision`, que é o caminho de verificação
>    de identidade, e a remoção da waitlist é operação destrutiva. A aprovação humana já constava,
>    então a exigência prática não muda — o que muda é a régua que o próximo agente lê.
> 2. **Multi-localidade simultânea por usuário deixou de estar fora de escopo.** Ver
>    [`ADR-20260816-transferencia-e-pertencimento`](ADR-20260816-transferencia-e-pertencimento.md),
>    que reabre essa linha a partir do caso do militar transferido. As men­ções abaixo em
>    "Guardrail de terminologia", "Não decidido neste ADR" e nos Riscos ficam **superadas**.
> 3. **A forma da admissão foi decidida**, e ela muda como a localidade é coletada: em duas
>    fases, elegibilidade primeiro. Ver
>    [`ADR-20260816-forma-da-admissao`](ADR-20260816-forma-da-admissao.md).
> 4. **O ponto que este ADR deixou aberto sobre o convite familiar está fechado:** o dependente
>    é provisionado na localidade **corrente** do titular no momento do **aceite** — não a do
>    envio, e não a de saída, se ele tiver um vínculo de transferência ativo. Motivo: se o
>    titular foi transferido entre convidar e aceitar, o dependente tem que cair onde a família
>    está, não sozinho numa cidade de onde todos saíram.

## Problem

O código de lançamento transformou uma decisão de rollout em regra de produto. Embora Manaus seja o piloto operacional, o onboarding e superfícies do app usam `PILOT_LOCALITY_ID` como se a elegibilidade e o acesso ao Bivaque fossem restritos a Manaus.

Isso conflita com o domínio já existente, que modela `localities` como entidade genérica e, portanto, já prevê uma plataforma capaz de operar múltiplas localidades. O erro está no runtime e no fluxo de lançamento, não no conceito de produto: a implementação efetiva foi acoplada a Manaus.

Essa restrição artificial impede militares elegíveis de outras cidades de entrar, bloqueia a observação de demanda orgânica nacional e faz a expansão depender de abertura manual cidade a cidade.

Evidência atual:

- `apps/web/lib/locality.ts` define `PILOT_LOCALITY_ID` como fonte de verdade do piloto.
- `apps/web/lib/onboarding/verifyAndProvision.ts` provisiona membro e perfil sempre em `PILOT_LOCALITY_ID` após verificação de CPF e também no aceite de convite familiar.
- `apps/web/app/(preauth)/onboarding/page.tsx` apresenta "Não sou de Manaus — entrar na lista de espera" e envia `PILOT_LOCALITY_ID`.
- `docs/PRODUCT_STATUS.md` já registra que a waitlist para outras localidades grava Manaus e que o feed municipal usa `PILOT_LOCALITY_ID`.
- `supabase/migrations/20260802000100_locality_profile_foundation.sql` já possui a entidade genérica `localities`.

## Decision

**O Bivaque é nacional desde o cadastro. Manaus é piloto operacional, não escopo de produto.**

1. O Bivaque deve operar como rede nacional multi-localidade. Qualquer pessoa elegível poderá concluir o onboarding selecionando qualquer município do Brasil suportado pelo catálogo canônico de localidades.
2. A localidade selecionada pelo usuário passa a ser dado explícito do fluxo de onboarding e deve ser usada no provisionamento de `locality_memberships` e `profiles`.
3. O acesso ao produto não pode depender de a localidade estar ou não em rollout prioritário.
4. A waitlist geográfica deixa de ser o caminho para pessoas fora de Manaus. Localidade com baixa densidade continua acessível e recebe um estado vazio apropriado, com mecanismos de convite/crescimento quando disponíveis.
5. Convite familiar deve provisionar o dependente na localidade correta derivada do vínculo/convite, nunca em uma constante global de piloto.
6. Feeds, eventos, vitrine e demais superfícies com escopo geográfico devem derivar a localidade do estado real do membro, nunca de `PILOT_LOCALITY_ID`.
7. Manaus permanece como prioridade de aquisição, incorporação de comunidades, curadoria, prestadores, eventos, suporte e medição. Essa prioridade pertence ao rollout/operacional, não ao gate de admissão.
8. Não introduzir `pilot=true` ou lógica equivalente espalhada pelo domínio para controlar acesso. Se for necessário registrar prioridade operacional em software, ela deve ser separada da elegibilidade e da membership.
9. O catálogo de municípios deve usar identificação canônica estável; preferencialmente código IBGE, evitando localidades criadas por texto livre e duplicações por grafia.
10. Esta correção é P0 e deve preceder novas ondas funcionais que ampliem dependência de `PILOT_LOCALITY_ID`.

### Guardrail de terminologia

Para evitar nova regressão conceitual:

- **Multi-localidade da plataforma:** capacidade de o Bivaque possuir e operar múltiplas localidades simultaneamente. Isso **já faz parte do modelo do produto** e não é feature futura.
- **Localidade atual do usuário:** ~~no schema atual, `locality_memberships.user_id` é chave primária, portanto cada usuário possui uma localidade corrente.~~ **Superado em 2026-08-16:** a chave primária passa a ser `(user_id, locality_id)`, e o usuário tem uma localidade **corrente** mais, no máximo, um vínculo de saída com prazo. Isso continua não significando que a plataforma seja mono-localidade.
- **Multi-localidade simultânea por usuário:** ~~permitir que o mesmo usuário pertença a mais de uma localidade ao mesmo tempo. Isso é uma decisão distinta e não faz parte desta P0.~~ **Superado em 2026-08-16:** é decisão distinta, sim — e foi tomada em [`ADR-20260816-transferencia-e-pertencimento`](ADR-20260816-transferencia-e-pertencimento.md). A P0 leva a **base**: a mudança das duas chaves primárias, que é a única parte irreversível depois de existir dado real. O prazo, o lembrete, a degradação e o seletor de localidade são onda própria, logo depois.
- **Multi-tenancy/organizações:** é uma dimensão arquitetural separada de geografia. O Bivaque original já foi concebido multi-tenant; esta P0 não deve ser descrita como introdução ou remoção de multi-tenancy.

### Precedência sobre o canon ainda não reconciliado

Até `docs/BIVAQUE.md` ser reconciliado nesta P0, **este ADR prevalece sobre qualquer trecho geográfico conflitante daquele documento**. Em particular, ficam superadas imediatamente as formulações que tratam:

- §1.2: o público como restrito a "pensionistas de Manaus";
- §5.2: "Manaus" como concessão geográfica fixa após verificação, em vez da localidade real selecionada;
- §8: "escopo nacional" como fora do produto e "outras cidades" como adiadas;
- D02: Manaus como fronteira do piloto a ser reaberta somente quando uma segunda cidade entrar em planejamento;
- D14: Manaus como localidade concedida por verificação;
- D31: qualquer cláusula que coloque escopo nacional fora ou outras cidades adiadas.

As partes não geográficas dessas decisões permanecem válidas. A reconciliação de `BIVAQUE.md` é critério de aceite da Issue #20 e deve ocorrer **antes do merge da implementação**, para restaurar uma única fonte de verdade.

### Não decidido neste ADR

- ~~Permitir múltiplas localidades simultâneas para o mesmo usuário.~~ **Decidido em
  2026-08-16**, em ADR próprio — ver a emenda no topo.
- ~~Troca de localidade e histórico de mudanças.~~ A **troca** foi decidida junto com a
  transferência; o **histórico** de mudanças como superfície de produto continua não decidido.
- Alterações na arquitetura de tenancy/organizações já concebida para o Bivaque, ou reexpansão dessa camada no fork `bivaque-community`.
- White-label, subdomínios ou planos pagos.
- Estratégia comercial de expansão para cada cidade.

Esses temas não devem ser introduzidos nesta correção apenas por proximidade conceitual. **Não interpretar esta lista como se multi-localidade da plataforma ou multi-tenancy fossem conceitos novos ou incompatíveis com o Bivaque.**

## Alternatives considered

### A. Manter Manaus fechada e abrir cidades manualmente

Rejeitada. Mantém simples o lançamento, mas confunde piloto com boundary de produto, impede aquisição orgânica nacional e exige uma nova abertura operacional para cada localidade.

### B. Permitir cadastro nacional, mas manter usuários fora de Manaus em waitlist

Rejeitada. Coleta intenção, mas não cria rede, não mede uso real e mantém o principal erro conceitual: rollout controla acesso.

### C. Cadastro nacional com acesso imediato; Manaus recebe operação prioritária

**Escolhida.** Torna efetiva a capacidade multi-localidade já prevista no domínio, mantém o recorte operacional do piloto sem codificá-lo como restrição e permite usar demanda real para orientar a próxima expansão ativa.

### D. Aproveitar a correção para reexpandir no fork toda a camada multi-tenant/SaaS do produto-mãe

Rejeitada para esta P0. A arquitetura multi-tenant do Bivaque original é uma decisão distinta. Reintroduzir agora toda essa superfície ampliaria drasticamente o escopo e repetiria o problema que motivou o fork menor. A correção necessária aqui é remover o acoplamento geográfico de runtime a Manaus.

## Market or reference baseline

Produtos de rede que operam por geografia normalmente tratam localidade como atributo/escopo do usuário e rollout como decisão operacional separada. O próprio domínio atual do Bivaque já aponta nessa direção ao possuir `localities` genéricas e membership por localidade.

## Proposed divergence from baseline

Nenhuma divergência relevante. A decisão remove uma restrição artificial introduzida pelo código de lançamento e alinha a implementação ao modelo geográfico nacional/multi-localidade já existente.

## Evidence and sources

- Decisão humana registrada na conversa de 2026-08-16: "Embora Manaus seja o piloto, isso não deveria ser hardcoded. Deveria ser possível se cadastrar em qualquer localidade do Brasil. O diferencial é a atenção que Manaus vai receber pra incorporar os usuários"; aprovação subsequente: "Concordo, registre pois isso deve ser a próxima correção antes de mais nada".
- Correção conceitual subsequente na mesma conversa: o Bivaque já é concebido para múltiplas localidades e o produto-mãe já é multi-tenant; não tratar essas propriedades como features futuras introduzidas por esta P0.
- `docs/BIVAQUE.md`
- `apps/web/lib/locality.ts`
- `apps/web/lib/onboarding/verifyAndProvision.ts`
- `apps/web/app/(preauth)/onboarding/page.tsx`
- `apps/web/app/api/onboarding/route.ts`
- `docs/PRODUCT_STATUS.md`
- `supabase/migrations/20260802000100_locality_profile_foundation.sql`
- `supabase/migrations/20260802000600_onboarding_consent_waitlist.sql`

## Benefits

- Corrige a semântica do produto antes que novas ondas ampliem o acoplamento.
- Torna efetiva a arquitetura nacional/multi-localidade já prevista no domínio.
- Permite aquisição orgânica em todo o Brasil desde o primeiro lançamento.
- Faz a demanda real por localidade virar sinal para priorização de expansão.
- Preserva Manaus como beachhead operacional sem tornar Manaus uma fronteira arquitetural.
- Reduz custo futuro de migração de onboarding, feed, eventos, vitrine e métricas.
- Mantém a P0 focada: resolve o erro geográfico sem reexpandir, nesta correção, toda a camada de tenancy/SaaS do produto-mãe.

## Risks

- Localidades com poucos membros podem parecer vazias e reduzir ativação/retorno.
- Um catálogo mal normalizado pode criar localidades duplicadas e fragmentar densidade.
- Fluxos existentes podem continuar usando `PILOT_LOCALITY_ID` de forma indireta se a correção não fizer inventário completo.
- Convites familiares podem atribuir localidade errada se a derivação do titular não for definida/testada.
- Métricas agregadas podem mascarar a diferença entre disponibilidade nacional e operação ativa em Manaus.
- Terminologia ambígua pode fazer agentes futuros confundirem "uma localidade por usuário" com "plataforma mono-localidade" ou confundirem localidade com tenant.

Mitigações: catálogo canônico; busca global por `PILOT_LOCALITY_ID`; testes de onboarding em pelo menos duas localidades; estados vazios explícitos; métricas segmentadas por localidade; regra clara de herança de localidade em convite familiar; guardrail terminológico deste ADR.

## Reversal cost

Baixo a moderado antes de escala: reintroduzir um gate geográfico exigiria regra de admissão e comunicação aos usuários. Depois de usuários reais fora de Manaus, o custo passa a ser alto porque bloquear localidades já ativas quebraria expectativa e acesso. Por isso a fronteira nacional deve ser tratada como decisão estrutural.

## Success metric

A decisão é considerada implementada quando:

1. um usuário elegível consegue concluir onboarding escolhendo Manaus;
2. outro usuário elegível consegue concluir o mesmo fluxo escolhendo uma segunda localidade brasileira sem waitlist;
3. ambos são provisionados em `locality_memberships` e `profiles` com suas localidades corretas;
4. o shell/feed resolve a localidade do membro em runtime, sem constante global de Manaus;
5. o fluxo familiar não usa `PILOT_LOCALITY_ID`;
6. busca no runtime não encontra uso de `PILOT_LOCALITY_ID` para autorização, provisionamento ou escopo de conteúdo;
7. Manaus continua identificada apenas como prioridade operacional no runbook/métricas, sem conceder ou negar acesso por esse fato;
8. documentação canônica não descreve multi-localidade da plataforma como feature futura nem confunde localidade com tenant.

## Reopen condition

Reabrir se dados reais mostrarem que abrir localidades de baixa densidade causa dano mensurável de retenção/confiança maior do que o benefício de aquisição orgânica, ou se houver restrição jurídica/operacional que exija limitar admissões por localidade.

## Approval

Aprovação humana explícita por Juan em **2026-08-16** na conversa que originou este ADR: "Concordo, registre pois isso deve ser a próxima correção antes de mais nada".

Pela `RISK_MATRIX.md`, onboarding é R2. A aprovação humana está registrada, mas a implementação permanece bloqueada até `critic_verdict: PASS` conforme a governança do repositório.
