# HOME sem vínculo de vila — auditoria de conformidade e maturidade Premium

## Escopo

Página: `COM-01` — `/community`.

Variante auditada: membro autenticado, verificado e com localidade atual, **sem vínculo aprovado com uma vila/comunidade**.

### Clarificação de produto

**Pertencer a uma vila é opcional.** Um membro pode permanecer sem vínculo de vila por tempo indeterminado e continuar sendo um membro completo do Bivaque. Ausência de vila não é estado incompleto, pendência de onboarding, falha de ativação nem etapa obrigatória da jornada.

Consequências para a auditoria:

1. a experiência sem vila precisa ser sustentável e valiosa por si própria;
2. a UI não deve usar linguagem de déficit como “ainda não entrou”, “complete sua experiência” ou equivalente;
3. descoberta/entrada em vila pode existir como possibilidade, nunca como CTA obrigatório ou métrica de sucesso universal;
4. Premium Maturity não pode penalizar o usuário por não pertencer a uma vila;
5. participação pode acontecer por outros caminhos permitidos pelo produto, como eventos, grupos, referências, recomendações e demais superfícies autorizadas.

Nesta variante, `CommunityPage` não renderiza feed. O runtime usa `CityReference`, que apresenta a referência da cidade. Isso preserva D48: o nível municipal é referência, não uma timeline.

Esta auditoria **não** cobre ainda a variante de `COM-01` em que o membro pertence a uma vila aprovada e recebe o feed da vila. Por isso o veredito global de `COM-01` no `AUDIT_MATRIX.yaml` não deve ser promovido apenas por este documento.

## Evidência de fonte

- `apps/web/app/(shell)/community/page.tsx`: seleciona `CityReference` quando `hasResolved && !primaryCommunityId && !error`.
- `apps/web/app/components/bivaque/city-reference.tsx`: renderiza eventos da cidade, guia de chegada, vitrine e possibilidade de entrar numa vila.
- `apps/web/app/components/bivaque/app-shell.tsx`: renderiza shell, CTA `Publicar`, Indicações, Notificações e perfil.
- `apps/web/app/components/bivaque/bottom-nav.tsx`: seleciona `community` por pathname `/community`.
- `tests/e2e/vila-home.spec.ts`: estabelece como comportamento esperado que o membro sem comunidade aprovada veja a referência da cidade em `/community`.
- `docs/BIVAQUE.md §6.2–6.3`: cidade não é feed; quando há vila, o feed pertence à vila.
- Clarificação de produto de 2026-08-29: vínculo de vila não é obrigatório para o membro.

## Veredito desta variante

**Page Readiness: `NOT_READY` para promoção isolada**, porque há findings `HIGH` de navegação/estado/recovery nesta variante.

Isso não significa que o estado “sem vila” seja inadequado. Significa apenas que **a implementação atual dessa experiência válida** ainda possui violações de contrato.

## Findings de contrato

### PA-001 — Conteúdo de Cidade sob parent ativo Comunidade

- Page IDs: `COM-01`.
- Dimensão: `entry_exit_navigation`.
- Severidade: `HIGH`.
- Evidência: `FAIL-SOURCE`.
- Regras: `DS-009`; Visual Guide §0 “Navegação — containers derivados do modelo”.
- Evidência concreta: quando não há `primaryCommunityId`, `/community` renderiza `CityReference`; porém `BottomNav` resolve `/community` para o item `community`, mantendo “Comunidade” selecionado. O contrato visual define eventos da cidade, guia e vitrine dentro de `Cidade`, enquanto `Minha comunidade` representa o contexto de vila.
- Impacto: o usuário vê conteúdo municipal sob um parent conceitual que comunica comunidade/vila. Como não pertencer a uma vila é um estado válido e potencialmente permanente, isso não pode ser tratado como exceção temporária de onboarding; a inconsistência afeta o modelo mental recorrente do usuário.
- Critério de fechamento: escolher e provar uma estratégia de landed/selected state coerente para membros com e sem vila, sem criar feed municipal e sem transformar vínculo de vila em requisito. Redirecionar para `Cidade` é uma hipótese possível, não uma obrigação; qualquer solução precisa permanecer compatível com `EXP-001`.

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

- Page IDs: `COM-01` variante sem vínculo de vila.
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

A nota abaixo é **source-based e parcial**. Ela não promove o produto a Premium e deve ser revalidada em browser nos viewports e estados obrigatórios. A pontuação **não penaliza ausência de vínculo de vila**.

| Pilar | Peso | Pontos ponderados | Leitura |
|---|---:|---:|---|
| Visual e marca | 20 | 13 | sistema limpo e coerente, mas pouca assinatura de marca e hierarquia excessivamente utilitária |
| Usabilidade e navegação | 25 | 18 | destinos e módulos são claros, mas PA-001/002/003 impedem classificação forte |
| Engajamento e comunidade | 20 | 11 | eventos e outras rotas permitem participação sem vila, porém a home comunica pouco o valor recorrente dessas possibilidades |
| Personalização e exclusividade | 20 | 7 | localidade personaliza o dataset, mas a ordem/conteúdo pouco responde a interesses, intenção ou uso recente |
| Confiança, acessibilidade e performance | 15 | 13 | estados e semântica têm boa base, mas recovery incompleto impede gate Premium |
| **Total** | **100** | **62/100** | **FUNCTIONAL** |

### Perception gates

- `PG-01 Findability`: `PARTIAL` — os módulos são encontráveis, mas parent state e recovery quebram previsibilidade em situações relevantes.
- `PG-02 Participation value`: `PARTIAL` — há caminhos válidos de uso e participação sem vila, especialmente eventos e demais superfícies do produto, mas a home ainda comunica pouco por que voltar e quais oportunidades são relevantes agora.
- `PG-03 Trust and care`: `PARTIAL` — a linguagem é sóbria e o produto preserva escopo, porém recovery incompleto e baixa assinatura de cuidado reduzem a percepção.

## Premium gaps — não confundir com defeitos normativos

Os itens abaixo são oportunidades contra `PREMIUM_ASSESSMENT.md`. Não são automaticamente violações do `DESIGN_SPEC.md`.

### PGAP-01 — Falta uma prioridade pessoal explícita (`PRM-002`, `PRM-015`)

A tela apresenta eventos, guia, vitrine e vila com pesos relativamente semelhantes. Ela pouco ajuda a decidir **o que é mais útil agora** com base em dados reais disponíveis. A correção não é transformar vila em próximo passo obrigatório.

### PGAP-02 — Valor de participação pouco demonstrado (`PRM-007`, `PRM-012`)

A home mostra eventos e possibilidade de entrar numa vila, mas comunica pouco as diferentes formas legítimas de participação. Um membro pode permanecer sem vila e ainda assim precisa perceber valor recorrente. A correção **não** é criar feed municipal nem pressionar adesão a vila.

### PGAP-03 — Personalização rasa (`PRM-002`, `PRM-015`)

A localidade personaliza o dataset, mas eventos, guia e vitrine não são priorizados por contexto do membro, interesses ou uso recente. Personalização futura deve ser transparente e não depender de busca de pessoas, que o produto proíbe.

### PGAP-04 — Confiança existe no modelo, mas aparece pouco na superfície (`PRM-019`, `PRM-025`)

A home não precisa de selos de prestígio; ainda assim, pode comunicar com sobriedade que o ambiente tem acesso controlado, regras e moderação, sem expor patente, OM, endereço ou uma classe de verificação mais forte do que existe.

## Decisão de auditoria

O redesign deve preservar:

1. **vínculo de vila é opcional e ausência de vila é estado de primeira classe**;
2. cidade como referência, não timeline;
3. feed apenas no contexto de vila/comunidade quando esse vínculo existir;
4. quatro containers de navegação existentes enquanto `EXP-001` não for resolvido;
5. ausência de busca de pessoas;
6. trust cues sem patente, OM, endereço ou “prestígio de verificação”;
7. descoberta de vila como oportunidade opcional, nunca requisito de ativação.

O brief e o wireframe associados ficam em:

- `HOME_NO_VILA_PREMIUM_BRIEF.md`;
- `HOME_NO_VILA_WIREFRAME.md`.
