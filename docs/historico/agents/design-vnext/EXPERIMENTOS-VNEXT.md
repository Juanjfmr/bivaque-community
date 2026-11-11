# Design vNext — plano de experimentos e critérios de prova

> **Estado:** F02 A/B **implementado em prévia DEV, sem promoção de UI**, com Playwright automatizado (seis viewports e dois temas); F04, F06 e demais experimentos seguem propostos. Não são aprovação de layouts ou PRs de produção.  
> **Regra de execução:** respeitar `LANCAMENTO.md` e o card ativo; usar `.claude/skills/visual-system-experiment/SKILL.md` / `experiment-protocol` e a biblioteca `apps/app/src/pecas/`. Não alterar R72, `apps/app` em produção, backend ou decisões soberanas nesta fase.

## Execução materializada: laboratório F02

- Fonte React: `apps/app/src/previa-vnext/PreviaVNext.tsx` e `modelo.ts`; CSS de **composição**, sem redefinir as peças, em `previa-vnext.css`.
- Rotas locais `/app/previa/vnext?v=a`, `?v=b`, `?v=comparar` **somente com Vite dev**. O roteador e o bundle de produção não registram a prévia.
- **A:** exploração editorial centrada em uma pergunta concreta, outras perguntas em linhas, descoberta horizontal de serviços e imóveis, eventos em lista; busca e filtro numa zona secundária.
- **B:** busca objetiva, filtros por assunto e resultados compactos em lista; no desktop, filtros laterais.
- Mesmos oito itens **explicitamente simulados**, mesmo termo/filtros, mesmas ações de abrir detalhe, mesmos estados vazio, escasso, erro e carregamento. Nenhum anúncio, rating, pessoa ou preço falso é apresentado como real.
- Testes de dados e isolamento: `apps/app/tests/previa-vnext.test.ts`; testes de interação e screenshots: `apps/app/tests/lab/vnext.spec.ts`; suíte isolada: `apps/app/playwright.vnext.config.ts`; workflow `.github/workflows/design-vnext-visual.yml`. O fluxo de produção não usa essa configuração.
- A primeira rodada de 24 capturas do GitHub Actions (`Bivaque Design vNext Visual Lab`, [execução 42932599652](https://github.com/Juanjfmr/bivaque-community/actions/runs/42932599652)) passou nas provas automatizadas. **Revisão visual real** dessas capturas mostrou que ambas ainda começavam por cabeçalho + busca + chips: A foi, por isso, refeita editorialmente. A segunda rodada e o parecer final devem ser confrontados com a mesma rubrica antes de escolher uma variante.
- **Atualização 10/11:** foram adicionados testes Playwright para paridade de conteúdo escasso entre A/B e visualização simultânea de ambas as alternativas. O novo commit deve ser verificado na execução do workflow; **não registrar PASS antes da conclusão**.
- **Pendentes:** comparação com capturas baseline do app real e Nextdoor; parecer cego independente; evidência de qualidade sem regressão; decisão para eventualmente promover; testes operacionais do Bivaque/CI completo. Não vender o sucesso do Playwright como aprovação de UI.

## Pré-requisitos e baseline

Antes de qualquer pixel:
1. congelar commit, tela, dados de demonstração honestamente identificados, ações, estados e tema; não “corrigir” a referência para favorecer um candidato;
2. conferir estado REAL da tela executada (não presumir que as lacunas registradas em 26/10 continuem);
3. ler `AGENTS.md`, `apps/app/AGENTS.md`, ADRs e padrão vigente, além das referências maduras do fluxo no Mobbin;
4. em telas com composição aprovada, formular a alternativa como **hipótese**, não substituição autorizada;
5. rodar experimentos em prévia de desenvolvimento/worktree separada, sem alterar rotas de produção nem fixtures reais;
6. não dirigir navegador manualmente fora do `scripts/visual/loop.mjs` quando concorrer com pgTAP/banco — seguir protocolo já vigente.

## Candidatos

| Experimento | Baseline | Candidato A | Candidato B | Decisão que o teste informa |
|---|---|---|---|---|
| EXP-F02-INICIO | Home atual e R72 como comparação contextual | exploração em trilhos horizontais + contexto da cidade | entrada por busca e assuntos pertinentes, com seções compactas | qual mostra descoberta útil sem transformar Home em launcher |
| EXP-F02-BUSCA | Busca atual | resultados por tipos com filtros leves | categorias exploratórias + sugestões contextuais | qual ajuda tanto quem já sabe o que procura como quem acaba de chegar |
| EXP-F04-COMUNIDADE | Comunidade atual | mural de perguntas em linhas | hub de participação com grupos/atividades | qual prioriza perguntar, responder e retornar a um assunto |
| EXP-F06-MERCADO | Mercado/imóveis atual | lista densa de anúncios com atributos | lista + mapa quando dado permitido existir | qual melhora comparação sem expor geolocalização indevida |

**Lembrete:** os conceitos acima NÃO representam aprovação da mudança de Home, navegação, dados ou política de grupos. Quando houver uma condição aprovada que conflite com o candidato, mantê-la ou registrar a necessidade de nova decisão.

## Aspectos que precisam ser idênticos entre A e B

- Mesmas tarefas, dados, textos-chave, ações e resultados de interação.
- Mesma marca e conjunto de peças; nenhum candidato usa outra paleta ou fonte.
- Mesmas permissões, escopo de cidade, rotas e números de elementos reais.
- Mesmos estados: populated, zero resultados, poucos resultados, loading, error e denial.
- Mesmos tamanhos/técnica de captura, dispositivo emulado, preferências e tema.

Não premiar um candidato por inventar imóveis, depoimentos ou fotos. Não comparar um estado carregado com outro vazio.

## Instrumento de revisão — sem nota estética autodeclarada

**Eliminatórias (bloqueiam comparação):**
- perda de uma ação aprovada ou desrespeito a escopo/privacidade;
- inacessibilidade por teclado, foco, toque ou contraste;
- gesto sem alternativa por toque/teclado, movimento obrigatório em reduced-motion;
- componente visual diferente do `src/pecas/` sem justificativa de extensão;
- rota/retorno, scroll, filtro ou estado assíncrono quebrados.

**Comparativas:**
- tarefa: até o objetivo há quantos passos e decisões?
- praticidade: há scroll desnecessário, clique oculto ou fricção?
- interface: quanto da informação correta cabe na primeira dobra sem encolher alvo?
- clareza: texto, status, escopo e próximo passo são explícitos?
- craft: repetição de cards, fotografia falsa, contraste, alinhamento e tipografia?
- desempenho: há regressão de bundle, rolagem ou resposta?
- constância: é reconhecível como Bivaque e não parece o mesmo template da outra tela?

Relatar **melhor/igual/pior/não verificado** com evidência concreta por critério. Se a evidência não foi capturada, não considerar aprovado.

## Viewports, fixtures e cobertura

- **Experimentação:** 320, 360, 375, 430, 768, 1440; claro e escuro nos casos representativos.
- **Gate mínimo de entrega:** pelo menos 375, 768 e 1440 em dois temas, conforme regras do repositório. As seis larguras de exploração não substituem os gates existentes.
- **Fixtures:** conteúdo zero/um/20+, título longo, avatar sem foto, imagem ruim ou sem imagem, dados incompletos, conteúdo atualizado/removido entre ações; nunca usar dado pessoal real.
- **Interação:** scroll, snap, swipe, filtros e reset, abrir/voltar, foco restaurado, teclado Android, estado de loading, falha de rede e erro de permissão.
- **Performance:** aplicar o orçamento de `docs/LANCAMENTO.md`, sem inferir números não medidos.

## Onde Impeccable, Taste e 21st.dev entram

**Impeccable:** `critique` antes de alterar; `audit` para accesibilidade/temas/responsividade; `shape/layout` para duas arquiteturas; `adapt` para seis viewports; `polish/harden` só depois de resolver a tarefa. Registrar versão e saída real do detector, nunca escrever “passou” sem executá-lo.

**Taste Skill:** para a landing e páginas públicas, direcionar conceito, hierarquia editorial, fotografia autêntica e inspeção em navegador. Não exigir hero com foto ou grande espaçamento em listagem operacional; usar apenas princípios que correspondam ao tipo de tela.

**21st.dev:** comparar metadata e preview de Embla carousel, filtros, comentários e calendários; só recuperar/importar o código **depois** de selecionar candidato e confirmar que a biblioteca atual não resolve. Não instalar tema, não carregar código do catálogo em produção por conveniência. [Shortlist](PESQUISA-21ST-VNEXT.md).

## Pacotes e sequência futura

1. **EXP-0: baseline real** — capturas e cobertura das rotas atuais; confirmar as lacunas ainda existentes.
2. **EXP-1: teste F02** — implementação e testes/capturas automatizados no laboratório DEV realizados; faltam baseline do app real, juiz cego e decisão de promoção.
3. **EXP-2: F04** — sequência ler/perguntar/responder/voltar; duas alternativas.
4. **EXP-3: F06** — lista e mapa apenas com informações permitidas; duas alternativas.
5. **EXP-4: componentes** — escolher exclusivamente peças que superem baseline em experiência e a11y.
6. **Promoção** — só com aprovação/revisão apropriada, card existente, CI e gate completo. A R72 permanece congelada.

**Critério para não promover:** diferença puramente cosmética, perda de função/identidade, evidência insuficiente, testes incompletos ou piora na comparação.
