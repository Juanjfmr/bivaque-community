---
id: ADR-20260901-design-system
status: accepted
risk: R2
owner: Juan
approved_at: 2026-09-01
expires_at:
linked_plan:
critic_verdict: PASS
critic_review: Três pareceres independentes concluídos em 2026-09-02; todos PASS após remediação verificável.
---

# Um sistema de design canônico, caloroso e operacional para o Bivaque

## Problem

O Bivaque tinha dois documentos de design com autoridade concorrente. O contrato vNext
preservava corretamente confiança, acessibilidade e verdade de estado, mas mantinha a
linguagem visual como experimento. O guia visual, por sua vez, fixava valores, wireframes e
navegação que o contrato tratava como não normativos. O runtime já diverge de alguns deles.

O resultado é pior que falta de documentação: uma tela pode obedecer ao guia e, ao mesmo
tempo, contrariar o contrato. Tokens duplicados entre TypeScript e CSS agravam o drift. A
primeira impressão de uma comunidade de acesso controlado não pode depender de convenções
locais não verificáveis.

## Decision

O Bivaque passa a ter **um único sistema canônico** em
[`docs/agents/DESIGN_SYSTEM.md`](../agents/DESIGN_SYSTEM.md). `DESIGN_SPEC.md` e
`VISUAL_GUIDE.md` tornam-se redirecionamentos de compatibilidade, não fontes secundárias.

Escolhemos a direção **Casa comum**: calor humano com disciplina editorial. Ela combina a
legibilidade e a confiança da direção Civic Editorial com a escaneabilidade e a resiliência
de estados da direção Community Modern do experimento EXP-004. Não reproduz a estética do
Airbnb, nem usa linguagem tática ou institucional: a referência de qualidade significa
coerência, hospitalidade, clareza e cuidado em cada detalhe.

O sistema fecha quatro decisões:

1. **Marca:** prática, acolhedora, confiável e local; nunca cerimonial, militarizada,
   infantilizada ou aspiracional de luxo.
2. **Foundations:** paleta quente-neutra com terracota acessível para ação, azul-petróleo
   para contexto e estados semânticos; tipografia humana e altamente legível; espaço e
   movimento intencionais.
3. **Arquitetura:** primitive → semantic → component tokens. Componentes só consomem tokens
   semânticos ou de componente; valores brutos vivem nas primitives.
4. **Governança:** o documento define padrões; testes, auditoria visual, contraste e prova
   de runtime demonstram aderência. A existência de CSS legado nunca vale como prova.

O código atual entra em **transição explícita**. A decisão estabelece o contrato e a fonte
de tokens sem alegar que toda tela já recebeu a nova composição, fontes ou assets. Cada onda
que tocar uma superfície aplica a rubrica do sistema e registra a evidência visual.

## Alternatives considered

### A. Manter `DESIGN_SPEC.md` e `VISUAL_GUIDE.md`

Rejeitada. Mantém a contradição de autoridade, a repetição e a chance de uma regra deletada
voltar por conveniência.

### B. Reescrever somente tokens e deixar as receitas por rota

Rejeitada. Resolve nomes de cor, mas não resolve identidade, conteúdo, estados, componentes,
acessibilidade ou governança. É uma paleta, não um design system.

### C. Civic Editorial puro

Considerada. É a direção mais distinta e confiável no EXP-004, mas a densidade de descoberta
e o custo de três famílias tipográficas não são uma boa troca para o MVP.

### D. Community Modern puro

Considerada. É a melhor base operacional e de estados do EXP-004, mas seus sinais de produto
genérico e de crescimento são insuficientemente distintos para uma comunidade de confiança.

### E. Casa comum — escolhida

Mantém a estrutura escaneável e resiliente de Community Modern, com contenção editorial,
paleta própria e uma política forte contra cartões empilhados, métricas de vaidade e
ornamentos de prestígio.

## Market or reference baseline

Produtos de hospitalidade e comunidade de alto nível parecem simples porque os fundamentos,
componentes, conteúdo e estados são consistentes — não porque repetem um único estilo visual.
O experimento interno EXP-004 já demonstrou que o Bivaque precisa equilibrar confiança,
distintividade, escaneabilidade, estados e custo de implementação; a direção escolhida usa
essa evidência em vez de copiar uma interface concorrente.

## Evidence and sources

- Pedido explícito do dono nesta conversa em 2026-09-01.
- `docs/BIVAQUE.md` §1.2, §3, §4, §6 e §12 — comunidade local, escopo, confiança e limites.
- `docs/agents/design-audit/ADJUDICATION.md` — manifesto de reescrita e survivors vNext.
- `docs/agents/design-audit/experiments/EXP-004-2026-08-21-172457/comparison.md` — três
  direções coerentes e seus trade-offs.
- `docs/agents/design-audit/CONFLICT_MATRIX.md` — conflito entre as duas autoridades antigas.

## Benefits

- Uma decisão tem uma casa e uma única regra substitui a cópia duplicada.
- O sistema dá à equipe critérios concretos para construir, revisar e auditar telas.
- A marca passa a ser reconhecível sem sugerir status militar, autoridade oficial ou luxo.
- A arquitetura de token suporta evolução e tema futuro sem espalhar valores crus.

## Risks

- Uma direção visual adotada sem teste com membros reais pode errar o registro de acolhimento.
  Mitigação: experimentos de composição e reabertura por métrica.
- A adoção parcial pode criar duas aparências temporariamente. Mitigação: token aliases,
  auditoria por superfície e status de transição explícito.
- Um documento grande pode virar enciclopédia ignorada. Mitigação: sumário, ordem de
  autoridade, component contracts e testes de escopo para as regras estruturais.

## Reversal cost

Baixo para conteúdo e aliases de token antes do lançamento; médio após a adoção porque muda
reconhecimento, assets e expectativas do membro. Os invariantes de confiança, acessibilidade e
escopo não são reversíveis por esta ADR: pertencem ao produto, não à estética.

## Success metric

1. Toda nova tela e cada tela refeita cita componentes e tokens do sistema, sem valor visual
   cru salvo exceção documentada.
2. Auditoria de 375/768/1440 não encontra overflow, contraste inadequado, estado ambíguo ou
   navegação conceitualmente inconsistente nas superfícies tocadas.
3. Em teste moderado com cinco membros e dois operadores, 80% ou mais identifica escopo,
   ação primária e próximo passo de recuperação sem ajuda.
4. Nenhum componente novo chega sem estados, acessibilidade e critérios de uso documentados.

## Reopen condition

Reabrir se o teste com membros demonstrar que a direção parece oficial/militarizada, impessoal
ou pouco legível; se a taxa de erro em ação de escopo superar 10%; ou se duas ondas consecutivas
precisarem de exceções de token para o mesmo componente.

## Approval

Aprovação humana explícita do dono, Juan, em 2026-09-01: “Quero um ótimo design system,
padrão Airbnb … o design system deve estar completo.” A autorização é para escolher e
consolidar uma direção de design R2, mantendo os limites de produto existentes. Esta ADR só
fecha após três críticas independentes com veredito `PASS`.

## Adversarial review and refinement

Três críticos independentes revisaram a primeira versão sem editar o trabalho. O primeiro
parecer de cada um foi `FAIL`; os achados foram corrigidos, submetidos de novo e todos chegaram
a `PASS`.

| Crítico | Foco | Objeção inicial material | Remediação verificável | Final |
|---|---|---|---|---|
| Noether | marca e produto | “Mensagens” podia sugerir DM membro↔membro; adoção de superfícies legadas era vaga | §7.1 limita mensagens a membro↔prestador e §12.1.1 inventaria cada legado sem prometer aderência | PASS |
| Zeno | arquitetura | tokens repetidos, CSS/RN não tinham paridade e aliases carregavam valores fora da fonte | `tokens.json` é fonte única; CSS é gerado e checado; `nativeTokens` deriva primitives/semantics; testes bloqueiam drift e cores novas fora da allowlist | PASS |
| Anscombe | acessibilidade e confiança | denúncia expunha erro de banco; campo de conversa não tinha contrato acessível nem prova de foco/erro | mensagens seguras, label/ajuda/erro associados, foco de disclosure preservado e E2E intercepta diagnóstico interno | PASS |

Os pareceres também revelaram trabalho legado fora da fundação: landing, entrada e onboarding
permanecem explicitamente inventariados até suas próprias ondas terem prova visual e de runtime.
Isso não reabre esta decisão; impede que sua adoção parcial seja confundida com migração concluída.
