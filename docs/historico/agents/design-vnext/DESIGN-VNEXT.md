# Design vNext — contrato de composição e revisão antisslop

> **Estado:** normas de composição e avaliação **incorporadas a `PADRAO-DE-TELA.md` em 10/11/2026**, neste PR de rascunho. Há agora protótipos A/B **F02 isolados em DEV**, com testes de navegação e captura de screenshots; nenhuma variante foi aprovada para produção. Não substitui ADRs aceitos, `LANCAMENTO.md`, telas aprovadas ou a biblioteca vigente.  
> **Escopo:** criação/revisão de tela no `apps/app`; `apps/web` mantém seus próprios contratos.  
> **Evidências:** [matriz de regras](MATRIZ-DESIGN-VNEXT.md), [gramáticas por jornada](GRAMATICAS-VNEXT.md), [21st.dev](PESQUISA-21ST-VNEXT.md) e [plano de experimentos](EXPERIMENTOS-VNEXT.md).

## 1. Autoridade — não importar o passado

Ordem de leitura: `AGENTS.md` → `docs/LANCAMENTO.md` → quadro e ADRs aceitos → `apps/app/AGENTS.md` → [identidade vigente das peças](IDENTIDADE-DAS-PECAS.md) → [padrão de tela](PADRAO-DE-TELA.md) → método [régua Nextdoor](HANDOFF.md) → este contrato de **composição e comparação**. Em conflito, prevalece a fonte de maior autoridade ou a decisão posterior explícita do proprietário. Este arquivo não reinterpreta identidade, domínio ou escopo.

- O documento `Juanjfmr/Bivaque/docs/design/DESIGN.md` de **06/07/2026** era um roteador de outra geração; seus links para Aço, `MissionPanelPattern`, Barlow Condensed/Inter, HeroUI e receitas antigas não são instrução para o `apps/app`.
- A direção *Casa comum* de setembro e o brandbook/paleta de outubro foram sucedidos **para as peças do app** pela [ADR-20261102-paleta-fria](../../decisions/ADR-20261102-paleta-fria.md). Manter Noto Sans, Noto Serif nos contextos autorizados, Material Symbols, tokens frios, ação ardósia e Brasa para *começar a criar*. A landing pública pode ter estágio de migração diferente — verificar sua autoridade própria.
- `docs/historico/` é evidência e contexto, não uma fonte de comandos.
- A [R72 congelada](../../../prototypes/bivaque-html/docs/VISUAL_BASELINE_R72.md) é baseline de comparação; não deve ser alterada. Mudanças aprovadas posteriores (por exemplo, barra de navegação e identidade) prevalecem sobre a cópia literal de pixels antigos.
- Nenhum componente da 21st.dev, Impeccable ou Taste Skill altera sozinho navegação, tipografia, semântica, elegibilidade, marca ou permissões.

## 2. O que é invariável e o que pode variar

| **Invariável (MUST)** | **Livre para explorar (EXPERIMENT)** |
|---|---|
| `src/pecas/` como biblioteca única, tokens/temas e componentes com comportamento acessível | arquitetura de conteúdo, proporções, ritmo de blocos, uso de lista/grade/trilho/mapa |
| rotas, ações, regras de domínio, visibilidade e navegação aprovadas | posição relativa de informações, agrupamentos, formato de descoberta e continuidade |
| texto e dado verdadeiro, marca correta, 44 px de toque, foco, leitor de tela, movimento reduzido | densidade adaptativa, quantidade de itens visíveis e uso de espaço horizontal |
| estados de loading, preenchido, vazio real, erro e permissão distintos | transições úteis, gestos com alternativa acessível, mudança de superfície ao longo da jornada |
| R72 intacta; não inventar dados reais ou fotos de pessoas | composições isoladas em laboratório, sem modificar telas de produção |

**Regra-mãe:** consistência de identidade não exige identidade de composição. O mesmo botão, tipografia e semântica podem conviver com uma listagem, um mapa, uma agenda, uma conversa ou uma superfície editorial.

## 3. Não usar receitas antigas como moldes obrigatórios

Reprovar o padrão automático `header → subtítulo → busca → chips → cards repetidos → CTA` quando ele não expressa a tarefa. Não é uma proibição dessas peças isoladamente.

Perguntar **antes** de desenhar:
1. Qual decisão o usuário precisa tomar nesta tela? Qual conteúdo permite tomá-la?
2. É uma tarefa de **exploração** (oferecer opções), **busca objetiva** (reduzir incerteza), **participação** (ler/responder), **transação não financeira** (publicar/pedir contato), **agenda** (tempo/disponibilidade), **leitura** (sequência editorial) ou **operação** (comparar/editar registros)?
3. Qual o menor conjunto de dados que permite agir? O que pode ser revelado depois?
4. O primeiro viewport entrega utilidade real ou só *embalagem* (saudação, título, subtítulo, card vazio, atalhos genéricos)?
5. Em tela grande, o espaço adicional melhora o contexto simultâneo ou só cria cartão maior?
6. Como fica com poucos dados, textos longos, fotos ruins, sessão lenta e erro de permissão?

## 4. Antipadrões verificáveis

| Sinal | Como detectar | Ação esperada |
|---|---|---|
| **Cardificação** | objetos de natureza distinta rendidos como cartões idênticos, cartões dentro de cartões, listas que seriam mais legíveis com divisória | provar agrupamento funcional; testar uma versão sem card |
| **Composição-clone** | 3+ telas de tarefas diferentes com a mesma sequência de blocos sem justificativa de jornada | comparação com uma composição estruturalmente distinta |
| **Primeira dobra fraca** | header/subtítulos/ornamentos consomem espaço antes da ação e do conteúdo pertinente | registrar screenshot e informação/ações visíveis em 320 e 375 |
| **AI content slop** | fotos de IA se passando por pessoas, avatares artificiais, números fictícios, rating fictício, copy vazia, icon tile decorativo | substituir por dados demo claramente marcados ou estado verdadeiro |
| **Pseudopremium** | sombras/blur/gradientes/serifas usados para mascarar hierarquia ruim | remover ornamento e validar sem ele |
| **Gestos inacessíveis** | swipe/arraste sem alternativa por toque/teclado, scroll trap, indicadores ocultos | fornecer ação equivalente e feedback do estado |
| **Desktop esticado** | coluna de celular solta, cards expandidos sem conteúdo, espaço lateral inútil | criar contexto simultâneo ou largura de leitura intencional |
| **Screenshots teatralizados** | só estado feliz, textos perfeitos, todas as imagens disponíveis | repetir prova com fixture difícil e estados adversos |

## 5. Procedimento de criação ou revisão

1. **Enquadrar**: tela, jornada, persona, tarefa, dados disponíveis, permissões e restrições atuais.
2. **Referenciar**: comparar fluxo real do Nextdoor/Mobbin e, quando relevante, outro produto maduro. Registrar URL, problema resolvido e padrões explicitamente rejeitados.
3. **Explorar**: em mudança composicional relevante, produzir **duas alternativas estruturais** no mesmo conteúdo e condições (não mera troca de cor ou radius). Usar o protocolo `.claude/skills/visual-system-experiment/SKILL.md`, preservando independência dos candidatos.
4. **Escolher**: medir funcionalidade, praticidade, interface, clareza e barreiras eliminatórias; revisor independente avalia capturas sem receber justificativa do autor.
5. **Compor com peças**: reutilizar `src/pecas/`, componentes shadcn existentes, nenhuma redefinição visual local. Peça nova exige galeria, teste e revisão.
6. **Provar**: screenshots reais em 375/768/1440 nos dois temas para entrega; ampliar 320/360/430 nos experimentos. Testar toque, teclado, screen reader, reduced-motion, dados reais locais/simulados corretamente sinalizados, vazio/erro/carregamento/negação.
7. **Registrar**: decisão no card existente; não criar segundo backlog ou aprovar visual por checklist preenchido. Não confundir build PASS com aprovação de craft.

**Skills:** Impeccable auxilia `critique`, `audit`, `shape`, `layout`, `adapt`, `polish` e detector determinístico de slop; Taste Skill auxilia *art direction* e verificação de **landing** no navegador — não deve importar automaticamente a estrutura de hero/seções para o app; 21st.dev serve a busca de candidato, não identidade nem autorização para copiar. Se skill não estiver instalada nesta execução, reportar e aplicar apenas suas diretrizes verificáveis, sem alegar que executou scripts.

## 6. Rubrica de aceite sem nota estética inventada

**Eliminatórias:** domínio/permissões, privacidade, a11y (inclusive foco/alvo/contraste), funções, estados verdadeiros, identidade vigente e regressões.

**Comparação relativa por jornada:** em relação à implementação atual e à referência:
- **Tarefa:** o usuário conclui o que precisa sem função perdida?
- **Praticidade:** menos passos/campos ou menor esforço, sem esconder consequências?
- **Densidade útil:** informação relevante antes da dobra, sem reduzir legibilidade?
- **Clareza:** escopo, resultado da ação e próximo passo são evidentes?
- **Identidade:** pertence ao Bivaque por sua linguagem e dados, não pelo logotipo colado?
- **Variedade justificada:** forma decorre do trabalho, não da conveniência de um template?

Cada dimensão recebe **melhor / igual / pior / não verificado**, apontando a captura e o caminho testado. `Não verificado` **não é PASS**. Não usar pontuação numérica fabricada nem benchmark visual sem ver o app rodando.

## 7. Governança desta proposta

**Aplicado neste PR:** `PADRAO-DE-TELA.md` foi alterado **em suas regras normativas**, deixando F01 como referência de qualidade sem copiar sua composição em todos os módulos, substituindo desktop de duas colunas como regra global, tornando a ação inferior contextual e fortalecendo prova de primeira dobra e comparação. Preserva explicitamente a composição do F01 já aprovada. `IDENTIDADE-DAS-PECAS.md` transferiu orientações de distribuição de cartões/listas/grupos para o padrão de tela e corrigiu a referência desatualizada ao fundo Papel. As fontes continuam subordinadas a `AGENTS.md`, `LANCAMENTO.md` e ADRs; **nenhuma tela real de produção foi alterada**. As variantes F02 vivem exclusivamente em `apps/app/src/previa-vnext/`, atrás de `import.meta.env.DEV`, sem tocar no roteador.

As hipóteses de arquitetura em `GRAMATICAS-VNEXT.md` e `EXPERIMENTOS-VNEXT.md` **não se tornaram decisão visual de produto**. A promoção de uma composição para tela existente exige experimento, revisor independente, prova de runtime e aprovação conforme o processo vigente. A R72 segue congelada.
