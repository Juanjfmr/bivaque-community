# Bivaque — auditoria de todas as páginas

Esta pasta executa a auditoria de conformidade página a página do runtime atual do Bivaque e uma avaliação transversal de maturidade Premium.

## Autoridade

A auditoria **não cria um novo design system**. Ela aplica, nesta ordem:

1. `docs/agents/DESIGN_SPEC.md` e `docs/agents/VISUAL_GUIDE.md` — contrato vNext congelado;
2. `docs/agents/design-audit/PHASE6_REVIEW.md` — baseline de conformidade e estados permitidos;
3. `docs/product-map/PAGE_REGISTRY.yaml` — inventário e IDs estáveis das páginas;
4. runtime real: browser, screenshots, testes e fonte, conforme o tipo de afirmação.

O runtime é evidência, não autoridade. Uma implementação existente não passa porque já existe.

## Duas camadas de auditoria

### 1. Page Readiness

Avalia cada uma das 40 páginas individualmente. O objetivo é responder: **esta tela e seus estados estão corretos, utilizáveis e conformes?**

Vereditos: `READY`, `CONDITIONAL`, `NOT_READY`, `NOT_AUDITED`.

### 2. Premium Maturity

Avalia o Bivaque como experiência integrada. O objetivo é responder: **o produto transmite qualidade, confiança, exclusividade, facilidade de uso e valor de participação suficientes para uma percepção Premium?**

Esta camada usa os cinco pilares e pesos definidos para a auditoria:

- Visual e marca — 20%;
- Usabilidade e navegação — 25%;
- Engajamento e comunidade — 20%;
- Personalização e exclusividade — 20%;
- Confiança, acessibilidade e performance — 15%.

A especificação completa fica em `PREMIUM_ASSESSMENT.md` e o estado machine-readable em `PREMIUM_SCORECARD.yaml`.

**A pontuação Premium nunca substitui o veredito de uma página.** Um `BLOCKER` ou `HIGH` material não pode ser compensado por boa estética ou por média alta em outros critérios.

## Universo

40 páginas de UI, identificadas por `PUB-01` a `OWN-04`.

A auditoria é feita por fluxo, mas cada página recebe veredito próprio.

### Onda A — entrada e onboarding

`PUB-*`, `AUTH-*`, `ONB-*`, `INV-*` — 11 páginas.

### Onda B — experiência do membro

`LOC-*`, `EVT-*`, `PRV-*`, `COM-*`, `REC-*`, `GRP-*`, `ME-*`, `MSG-*`, `NOT-*` — 18 páginas.

### Onda C — portais especializados

`PRO-*`, `ADM-*`, `OWN-*` — 11 páginas.

## Dimensões obrigatórias por página

Cada página é confrontada em dez dimensões:

1. **job_and_scope** — propósito, escopo/localidade e tarefa principal ficam claros e verdadeiros;
2. **entry_exit_navigation** — entrada, saída, parent/landed state, deep link e back path coerentes;
3. **state_model** — loading, populated, empty, error, success, unauthorized/forbidden e pending quando aplicáveis;
4. **content_copy** — linguagem, rótulos, microcopy, português, consequência da ação e ausência de erro cru;
5. **accessibility_semantics** — semântica, keyboard, focus, labels, compound controls, target size e non-color cues;
6. **responsive_reflow** — 375, 768 e 1440; reflow adicional em 320 quando a regra objetiva exigir;
7. **visual_hierarchy_consistency** — hierarquia, densidade, escaneabilidade e coerência com o contrato visual;
8. **trust_privacy** — não vazar escopo, papel, dado ou certeza que o usuário não deve inferir;
9. **interaction_feedback_recovery** — pending, disabled, feedback, retry, recuperação e prevenção de dupla ativação;
10. **performance_resilience** — comportamento perceptível sob fetch lento/falha, streaming, erro de backend e imagem ausente.

## Estados de evidência

Use somente:

- `PASS-EVIDENCED` — evidência direta suficiente;
- `FAIL-EVIDENCED` — browser/runtime demonstra violação;
- `FAIL-SOURCE` — fonte determinística demonstra violação; browser não é necessário para a propriedade;
- `PARTIAL` — parte do contrato foi comprovada;
- `NOT_OBSERVED` — ainda não há prova suficiente;
- `EXPERIMENT` — o contrato preserva escolha não resolvida;
- `N/A` — dimensão realmente não se aplica, com justificativa.

`NOT_OBSERVED` nunca equivale a PASS.

## Severidade dos achados

- `BLOCKER` — impede tarefa primária, viola trust/privacy/authz ou requisito objetivo crítico;
- `HIGH` — quebra navegação, estado, acessibilidade ou recuperação material;
- `MEDIUM` — degrada compreensão, consistência ou eficiência sem bloquear o fluxo principal;
- `LOW` — craft/polimento sem impacto material na conclusão da tarefa.

## Veredito da página

- `READY` — nenhum BLOCKER/HIGH aberto e dimensões críticas têm prova suficiente;
- `CONDITIONAL` — utilizável, mas com dívida MEDIUM/LOW ou dimensão não crítica ainda não observada;
- `NOT_READY` — ao menos um BLOCKER/HIGH ou ausência de prova em dimensão crítica;
- `NOT_AUDITED` — auditoria ainda não executada.

Não existe média numérica para Page Readiness: um único blocker não pode ser compensado por nove dimensões bonitas.

## Evidência mínima

Para uma página ser considerada auditada:

- fonte relevante lida;
- rota aberta no browser com persona correta;
- viewport 375, 768 e 1440 capturados ou justificados;
- tarefa principal exercida até feedback/landed state;
- estados alternativos aplicáveis exercidos ou marcados `NOT_OBSERVED`;
- keyboard/focus testado quando houver controle composto, modal, formulário ou navegação relevante;
- achados registrados com Page ID, regra violada, evidência e critério de fechamento;
- critérios `PRM-*` relacionados recebem evidência ou permanecem explicitamente `NOT_ASSESSED`.

Screenshots sozinhos não provam interação, keyboard, focus, autorização ou recoverability.

## Artefatos

- `AUDIT_MATRIX.yaml` — estado e veredito de todas as páginas;
- `FINDINGS.md` — ledger de achados concretos;
- `PREMIUM_ASSESSMENT.md` — método e critérios da avaliação Premium;
- `PREMIUM_SCORECARD.yaml` — 25 critérios Premium, cinco pilares, pesos, evidência e classificação;
- futuros relatórios por onda em `waves/`;
- screenshots/traces ficam como artifacts do Playwright, não como autoridade normativa no repo.

## Regra de correção

Auditar primeiro; corrigir depois. Correções de runtime devem ocorrer em PRs próprios, referenciando Page ID + Finding ID. Isso impede que o auditor mude a tela enquanto ainda está tentando julgar seu estado original.
