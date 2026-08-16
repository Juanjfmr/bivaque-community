---
id: ADR-20260816-national-localities
status: proposed
risk: R2
owner: Juan
approved_at: 2026-08-16
expires_at:
linked_plan: GitHub issue P0 — national locality onboarding
critic_verdict: pending
critic_review:
---

# Bivaque nacional no cadastro; Manaus como piloto operacional

## Problem

O código de lançamento transformou uma decisão de rollout em regra de produto. Embora Manaus seja o piloto operacional, o onboarding e superfícies do app usam `PILOT_LOCALITY_ID` como se a elegibilidade e o acesso ao Bivaque fossem restritos a Manaus.

Isso conflita com o domínio já existente, que modela `localities` como entidade genérica, e cria uma barreira artificial para militares elegíveis de outras cidades. Também impede observar demanda orgânica nacional e faz a expansão depender de abertura manual cidade a cidade.

Evidência atual:

- `apps/web/lib/locality.ts` define `PILOT_LOCALITY_ID` como fonte de verdade do piloto.
- `apps/web/lib/onboarding/verifyAndProvision.ts` provisiona membro e perfil sempre em `PILOT_LOCALITY_ID` após verificação de CPF e também no aceite de convite familiar.
- `apps/web/app/(preauth)/onboarding/page.tsx` apresenta "Não sou de Manaus — entrar na lista de espera" e envia `PILOT_LOCALITY_ID`.
- `docs/PRODUCT_STATUS.md` já registra que a waitlist para outras localidades grava Manaus e que o feed municipal usa `PILOT_LOCALITY_ID`.
- `supabase/migrations/20260802000100_locality_profile_foundation.sql` já possui a entidade genérica `localities`.

## Decision

**O Bivaque é nacional desde o cadastro. Manaus é piloto operacional, não escopo de produto.**

1. Qualquer pessoa elegível poderá concluir o onboarding selecionando qualquer município do Brasil suportado pelo catálogo canônico de localidades.
2. A localidade selecionada pelo usuário passa a ser dado explícito do fluxo de onboarding e deve ser usada no provisionamento de `locality_memberships` e `profiles`.
3. O acesso ao produto não pode depender de a localidade estar ou não em rollout prioritário.
4. A waitlist geográfica deixa de ser o caminho para pessoas fora de Manaus. Localidade com baixa densidade continua acessível e recebe um estado vazio apropriado, com mecanismos de convite/crescimento quando disponíveis.
5. Convite familiar deve provisionar o dependente na localidade correta derivada do vínculo/convite, nunca em uma constante global de piloto.
6. Feeds, eventos, vitrine e demais superfícies com escopo geográfico devem derivar a localidade do estado real do membro, nunca de `PILOT_LOCALITY_ID`.
7. Manaus permanece como prioridade de aquisição, incorporação de comunidades, curadoria, prestadores, eventos, suporte e medição. Essa prioridade pertence ao rollout/operacional, não ao gate de admissão.
8. Não introduzir `pilot=true` ou lógica equivalente espalhada pelo domínio para controlar acesso. Se for necessário registrar prioridade operacional em software, ela deve ser separada da elegibilidade e da membership.
9. O catálogo de municípios deve usar identificação canônica estável; preferencialmente código IBGE, evitando localidades criadas por texto livre e duplicações por grafia.
10. Esta correção é P0 e deve preceder novas ondas funcionais que ampliem dependência de `PILOT_LOCALITY_ID`.

### Não decidido neste ADR

- Multi-localidade simultânea por usuário.
- Troca de localidade e histórico de mudanças.
- SaaS/multi-tenant por organização.
- White-label, subdomínios ou planos pagos.
- Estratégia comercial de expansão para cada cidade.

Esses temas não devem ser introduzidos nesta correção apenas por proximidade conceitual.

## Alternatives considered

### A. Manter Manaus fechada e abrir cidades manualmente

Rejeitada. Mantém simples o lançamento, mas confunde piloto com boundary de produto, impede aquisição orgânica nacional e exige uma nova abertura operacional para cada localidade.

### B. Permitir cadastro nacional, mas manter usuários fora de Manaus em waitlist

Rejeitada. Coleta intenção, mas não cria rede, não mede uso real e mantém o principal erro conceitual: rollout controla acesso.

### C. Cadastro nacional com acesso imediato; Manaus recebe operação prioritária

**Escolhida.** Mantém o recorte operacional do piloto sem codificá-lo como restrição do domínio. Permite medir densidade espontânea por cidade e usar demanda real para orientar a próxima expansão ativa.

### D. Aproveitar a correção para implantar multi-tenant/SaaS completo

Rejeitada para esta onda. Aumenta drasticamente o escopo e repete o problema que motivou o fork menor. A correção necessária é desacoplar localidade de piloto, não reconstruir a plataforma.

## Market or reference baseline

Produtos de rede que operam por geografia normalmente tratam localidade como atributo/escopo do usuário e rollout como decisão operacional separada. O próprio domínio atual do Bivaque já aponta nessa direção ao possuir `localities` genéricas e membership por localidade.

## Proposed divergence from baseline

Nenhuma divergência relevante. A decisão remove uma restrição artificial introduzida pelo código de lançamento e alinha a implementação ao modelo geográfico genérico já existente.

## Evidence and sources

- Decisão humana registrada na conversa de 2026-08-16: "Embora Manaus seja o piloto, isso não deveria ser hardcoded. Deveria ser possível se cadastrar em qualquer localidade do Brasil. O diferencial é a atenção que Manaus vai receber pra incorporar os usuários"; aprovação subsequente: "Concordo, registre pois isso deve ser a próxima correção antes de mais nada".
- `apps/web/lib/locality.ts`
- `apps/web/lib/onboarding/verifyAndProvision.ts`
- `apps/web/app/(preauth)/onboarding/page.tsx`
- `apps/web/app/api/onboarding/route.ts`
- `docs/PRODUCT_STATUS.md`
- `supabase/migrations/20260802000100_locality_profile_foundation.sql`
- `supabase/migrations/20260802000600_onboarding_consent_waitlist.sql`

## Benefits

- Corrige a semântica do produto antes que novas ondas ampliem o acoplamento.
- Permite aquisição orgânica em todo o Brasil desde o primeiro lançamento.
- Faz a demanda real por localidade virar sinal para priorização de expansão.
- Preserva Manaus como beachhead operacional sem tornar Manaus uma fronteira arquitetural.
- Reduz custo futuro de migração de onboarding, feed, eventos, vitrine e métricas.
- Mantém o fork pequeno: resolve o erro sem introduzir tenancy/SaaS prematuramente.

## Risks

- Localidades com poucos membros podem parecer vazias e reduzir ativação/retorno.
- Um catálogo mal normalizado pode criar localidades duplicadas e fragmentar densidade.
- Fluxos existentes podem continuar usando `PILOT_LOCALITY_ID` de forma indireta se a correção não fizer inventário completo.
- Convites familiares podem atribuir localidade errada se a derivação do titular não for definida/testada.
- Métricas agregadas podem mascarar a diferença entre disponibilidade nacional e operação ativa em Manaus.

Mitigações: catálogo canônico; busca global por `PILOT_LOCALITY_ID`; testes de onboarding em pelo menos duas localidades; estados vazios explícitos; métricas segmentadas por localidade; regra clara de herança de localidade em convite familiar.

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
7. Manaus continua identificada apenas como prioridade operacional no runbook/métricas, sem conceder ou negar acesso por esse fato.

## Reopen condition

Reabrir se dados reais mostrarem que abrir localidades de baixa densidade causa dano mensurável de retenção/confiança maior do que o benefício de aquisição orgânica, ou se houver restrição jurídica/operacional que exija limitar admissões por localidade.

## Approval

Aprovação humana explícita por Juan em **2026-08-16** na conversa que originou este ADR: "Concordo, registre pois isso deve ser a próxima correção antes de mais nada".

Pela `RISK_MATRIX.md`, onboarding é R2. A aprovação humana está registrada, mas a implementação permanece bloqueada até `critic_verdict: PASS` conforme a governança do repositório.
