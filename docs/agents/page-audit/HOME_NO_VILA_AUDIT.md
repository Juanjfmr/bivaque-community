# HOME sem vila — auditoria de conformidade e maturidade Premium

## Escopo

Página: `COM-01` — `/community`.

Variante auditada: membro autenticado, verificado e com localidade atual, mas **sem comunidade/vila aprovada**.

Nesta variante, `CommunityPage` não renderiza feed. O runtime usa `CityReference`, que apresenta a referência da cidade. Isso preserva a decisão de produto D48: o nível municipal é referência, não uma timeline.

Esta auditoria **não** cobre ainda a variante de `COM-01` em que o membro já pertence a uma vila aprovada e recebe o feed da vila. Por isso o veredito global de `COM-01` no `AUDIT_MATRIX.yaml` não deve ser promovido apenas por este documento.

## Evidência de fonte

- `apps/web/app/(shell)/community/page.tsx`: seleciona `CityReference` quando `hasResolved && !primaryCommunityId && !error`.
- `apps/web/app/components/bivaque/city-reference.tsx`: renderiza eventos da cidade, guia de chegada, vitrine e caminho para entrar numa vila.
- `apps/web/app/components/bivaque/app-shell.tsx`: renderiza shell, CTA `Publicar`, Indicações, Notificações e perfil.
- `apps/web/app/components/bivaque/bottom-nav.tsx`: seleciona `community` por pathname `/community`.
- `tests/e2e/vila-home.spec.ts`: estabelece como comportamento esperado que o membro sem comunidade aprovada veja a referência da cidade em `/community`.
- `docs/BIVAQUE.md §6.2–6.3`: cidade não é feed; a home de quem tem vila é o feed da vila.

## Veredito desta variante

**Page Readiness: `NOT_READY` para promoção isolada**, porque há findings `HIGH` de navegação/estado/recovery na variante sem vila.

Isso não altera ainda o veredito global de `COM-01`, porque a variante com vila aprovada ainda precisa ser auditada.

## Findings de contrato

### PA-001 — Conteúdo de Cidade sob parent ativo Comunidade

- Page IDs: `COM-01`.
- Dimensão: `entry_exit_navigation`.
- Severidade: `HIGH`.
- Evidência: `FAIL-SOURCE`.
- Regras: `DS-009`; Visual Guide §0 “Navegação — containers derivados do modelo”.
- Evidência concreta: quando não há `primaryCommunityId`, `/community` renderiza `CityReference`; porém `BottomNav` resolve `/community` para o item `community`, mantendo “Comunidade” selecionado. O contrato visual define conteúdo municipal (eventos da cidade, guia, vitrine) dentro de `Cidade`, enquanto `Minha comunidade` representa a home/feed da vila.
- Impacto: o usuário vê conteúdo municipal sob um parent conceitual que comunica comunidade/vila. Isso enfraquece previsibilidade, back path mental e findability, e torna a home um caso especial que o shell não explica.
- Critério de fechamento: escolher e provar uma solução coerente sem criar feed municipal: por exemplo, redirecionar o estado sem vila para `/localidade`, ou ajustar explicitamente a estratégia de landed/selected state de modo que a referência municipal pertença a `Cidade`. Qualquer alteração estrutural em containers continua sujeita ao `EXP-001`; não criar uma quinta aba “Home” por conveniência.

### PA-002 — Erros de módulos da cidade não oferecem recuperação

- Page IDs: `COM-01`, `LOC-01`.
- Dimensão: `interaction_feedback_recovery` / `state_model`.
- Severidade: `HIGH`.
- Evidência: `FAIL-SOURCE`.
- Regras: `DS-014`, `DS-027`; Visual Guide §0 “Estados”.
- Evidência concreta: falha ao carregar eventos ou prestadores em `CityReference` resulta em um `<p>` com mensagem de erro; não há `ErrorState`, botão de retry ou outro caminho de recuperação. As funções `load()` e `loadProviders()` já existem, portanto há recovery action disponível no componente, mas ela não é exposta ao usuário.
- Impacto: uma falha transitória transforma um bloco central da home em beco sem saída e força reload/navegação externa para tentar novamente.
- Critério de fechamento: erro de eventos e vitrine deve preservar o bloco, apresentar copy estável e oferecer retry que chama a respectiva operação sem perder contexto seguro.

### PA-003 — Zero resultado na busca de prestador remove a própria busca

- Page IDs: `COM-01`, `LOC-01`.
- Dimensão: `state_model` / `interaction_feedback_recovery`.
- Severidade: `HIGH`.
- Evidência: `FAIL-SOURCE`.
- Regra: `DS-019`.
- Evidência concreta: o ramo externo de `CityReference` usa `providers.length === 0` para renderizar o empty state sem formulário. Como a mesma variável recebe o resultado filtrado, uma busca que retorna zero faz o componente sair do ramo que contém input, categoria e submit. O ramo interno “Nenhum prestador encontrado com esses filtros” fica estruturalmente inalcançável quando `providers.length === 0`.
- Impacto: o usuário perde query, filtro e ação de correção exatamente no estado em que precisa alterá-los; a descoberta deixa de ser recuperável.
- Critério de fechamento: separar “catálogo inicial realmente vazio” de “no-results da busca”; manter query e filtros visíveis no segundo caso, exibir mensagem contextual e permitir limpar/ajustar filtros.

### PA-004 — Duas ações primárias `Publicar` competem no mesmo topo

- Page IDs: `COM-01` variante sem vila.
- Dimensão: `visual_hierarchy_consistency`.
- Severidade: `MEDIUM`.
- Evidência: `FAIL-SOURCE` (craft).
- Regras: Visual Guide §0 “CTAs e ações”; Visual Guide §9.1 “Hierarquia”.
- Evidência concreta: `AppShell` sempre oferece `Publicar` no header e `CommunityPage` passa `onPublish` para `CityReference`, que renderiza outro `Publicar` no header da página. Em mobile os dois aparecem antes do primeiro módulo de conteúdo.
- Impacto: duplicação reduz a clareza da ação primária, aumenta ruído e enfraquece a percepção de produto deliberadamente composto.
- Critério de fechamento: manter uma única entrada primária para publicação por viewport, ou diferenciar semanticamente as ações caso representem consequências/audiências distintas.

### PA-005 — Header mobile não exibe a marca prevista pela rubrica visual

- Page IDs: páginas `member_shell`, visível em `COM-01`.
- Dimensão: `visual_hierarchy_consistency`.
- Severidade: `MEDIUM`.
- Evidência: `FAIL-SOURCE`.
- Regra: Visual Guide §0 “Navegação — containers derivados do modelo”, item “Header: brand à esquerda”.
- Evidência concreta: o lado esquerdo do header atual contém o pill/contexto de localidade. Em 375px o texto da localidade está `hidden sm:inline`, restando essencialmente o ícone de pin; não há wordmark/brand no header autenticado.
- Impacto: a principal superfície recorrente perde reconhecimento de marca e o topo fica visualmente utilitário, o que pesa diretamente em `PRM-001` e na percepção Premium.
- Critério de fechamento: ou implementar a presença de marca prevista pela rubrica sem comprometer `DS-010`, ou reabrir/alterar formalmente a rubrica visual com evidência comparativa; não tratar a implementação corrente como nova autoridade por inércia.

## Premium Maturity — baseline provisória desta variante

A nota abaixo é **source-based e parcial**. Ela não promove o produto a Premium e deve ser revalidada em browser nos viewports e estados obrigatórios.

| Pilar | Peso | Pontos ponderados | Leitura |
|---|---:|---:|---|
| Visual e marca | 20 | 13 | sistema limpo e coerente, mas pouca assinatura de marca e hierarquia excessivamente utilitária |
| Usabilidade e navegação | 25 | 18 | destinos e módulos são claros, mas PA-001/002/003 impedem classificação forte |
| Engajamento e comunidade | 20 | 9 | há eventos e caminho para vila, porém pouca prova imediata de participação/pertencimento |
| Personalização e exclusividade | 20 | 6 | localidade é contextual, mas a ordem/conteúdo pouco responde ao estado individual além de “sem vila” |
| Confiança, acessibilidade e performance | 15 | 13 | estados e semântica têm boa base, mas recovery incompleto impede gate Premium |
| **Total** | **100** | **59/100** | **FUNCTIONAL** |

### Perception gates

- `PG-01 Findability`: `PARTIAL` — os quatro módulos são encontráveis, mas parent state e recovery quebram previsibilidade em situações relevantes.
- `PG-02 Participation value`: `FAIL-SOURCE/PARTIAL` — a home explica recursos, mas não evidencia com força o próximo passo de pertencimento nem por que voltar regularmente.
- `PG-03 Trust and care`: `PARTIAL` — a linguagem é sóbria e o produto preserva escopo, porém recovery incompleto e baixa assinatura de cuidado reduzem a percepção.

## Premium gaps — não confundir com defeitos normativos

Os itens abaixo são oportunidades contra `PREMIUM_ASSESSMENT.md`. Não são automaticamente violações do `DESIGN_SPEC.md`.

### PGAP-01 — Falta uma prioridade pessoal explícita (`PRM-002`, `PRM-015`)

O estado “sem vila” é conhecido, mas a tela apresenta quatro blocos quase equivalentes. A informação mais relevante para este usuário — ainda não pertencer a uma vila — não organiza a hierarquia da home.

### PGAP-02 — Valor de participação pouco demonstrado (`PRM-007`, `PRM-011`)

A tela oferece “Entrar numa vila”, mas não mostra por que aquela vila é relevante, quais são as opções disponíveis ou qual benefício comunitário concreto surge ao entrar. A correção **não** é criar feed municipal.

### PGAP-03 — Personalização rasa (`PRM-002`, `PRM-015`)

A localidade personaliza o dataset, mas eventos, guia e vitrine não são priorizados por contexto do membro, interesses ou estágio da jornada. Personalização futura deve ser transparente e não depender de busca de pessoas, que o produto proíbe.

### PGAP-04 — Confiança existe no modelo, mas aparece pouco na superfície (`PRM-019`, `PRM-025`)

A home não precisa de selos de prestígio; ainda assim, pode comunicar com sobriedade que o ambiente tem acesso controlado, regras e moderação, sem expor patente, OM, endereço ou uma classe de verificação mais forte do que existe.

## Decisão de auditoria

O redesign deve preservar:

1. cidade como referência, não timeline;
2. feed apenas no contexto da vila/comunidade aprovada;
3. quatro containers de navegação existentes enquanto `EXP-001` não for resolvido;
4. ausência de busca de pessoas;
5. trust cues sem patente, OM, endereço ou “prestígio de verificação”.

O brief e o wireframe associados ficam em:

- `HOME_NO_VILA_PREMIUM_BRIEF.md`;
- `HOME_NO_VILA_WIREFRAME.md`.
