# Bivaque — auditoria de todas as páginas

Esta pasta executa a auditoria de conformidade página a página do runtime atual do Bivaque.

## Autoridade

A auditoria **não cria um novo design system**. Ela aplica, nesta ordem:

1. `docs/agents/DESIGN_SPEC.md` e `docs/agents/VISUAL_GUIDE.md` — contrato vNext congelado;
2. `docs/agents/design-audit/PHASE6_REVIEW.md` — baseline de conformidade e estados permitidos;
3. `docs/product-map/PAGE_REGISTRY.yaml` — inventário e IDs estáveis das páginas;
4. runtime real: browser, screenshots, testes e fonte, conforme o tipo de afirmação.

O runtime é evidência, não autoridade. Uma implementação existente não passa porque já existe.

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

Não existe média numérica: um único blocker não pode ser compensado por nove dimensões bonitas.

## Evidência mínima

Para uma página ser considerada auditada:

- fonte relevante lida;
- rota aberta no browser com persona correta;
- viewport 375, 768 e 1440 capturados ou justificados;
- tarefa principal exercida até feedback/landed state;
- estados alternativos aplicáveis exercidos ou marcados `NOT_OBSERVED`;
- keyboard/focus testado quando houver controle composto, modal, formulário ou navegação relevante;
- achados registrados com Page ID, regra violada, evidência e critério de fechamento.

Screenshots sozinhos não provam interação, keyboard, focus, autorização ou recoverability.

## Premium Maturity

`PREMIUM_ASSESSMENT.md` é uma camada separada da conformidade de página. Ela avalia 25 critérios nos cinco pilares acordados — Visual e marca, Usabilidade e navegação, Engajamento e comunidade, Personalização e exclusividade, Confiança/acessibilidade/performance — além dos três perception gates:

- `PG-01 Findability`;
- `PG-02 Participation value`;
- `PG-03 Trust and care`.

Uma nota agregada não compensa blocker ou falha crítica.

## Piloto da auditoria — HOME sem vila

A primeira aplicação detalhada do protocolo é a variante de `COM-01` em que o membro está autenticado/localizado, mas ainda não pertence a uma vila aprovada. A decisão de produto D48 é preservada: cidade é referência, não feed municipal.

Artefatos:

- `HOME_NO_VILA_AUDIT.md` — findings de contrato + baseline Premium provisória;
- `HOME_NO_VILA_PREMIUM_BRIEF.md` — objetivo, não objetivos, prioridades e critérios de aceite do redesign;
- `HOME_NO_VILA_WIREFRAME.md` — wireframe textual mobile/tablet/desktop e estados obrigatórios.

Essa auditoria parcial **não** promove o veredito global de `COM-01`; a variante com vila aprovada ainda precisa de browser evidence e auditoria própria.

## Artefatos

- `AUDIT_MATRIX.yaml` — estado e veredito de todas as páginas;
- `FINDINGS.md` — ledger de achados concretos;
- `PREMIUM_ASSESSMENT.md` — scorecard transversal Premium;
- `HOME_NO_VILA_AUDIT.md` — auditoria do primeiro estado da home;
- `HOME_NO_VILA_PREMIUM_BRIEF.md` — brief do redesign Premium da home sem vila;
- `HOME_NO_VILA_WIREFRAME.md` — estrutura proposta e estados;
- futuros relatórios por onda em `waves/`;
- screenshots/traces ficam como artifacts do Playwright, não como autoridade normativa no repo.

## Regra de correção

Auditar primeiro; corrigir depois. Correções de runtime devem ocorrer em PRs próprios, referenciando Page ID + Finding ID. Isso impede que o auditor mude a tela enquanto ainda está tentando julgar seu estado original.
