# Design vNext — matriz de 44 críticas e tratamento

> Data: 10/11/2026. **Inventário documental, não auditoria visual do runtime.**  
> Legenda: **L** legado (`Juanjfmr/Bivaque`, julho); **V** vigente no `bivaque-community`; **H** hipótese de UX a provar.  
> Vereditos: KEEP, AMEND, DELETE, MOVE, EXPERIMENT, CONFLICT. `DELETE` = retirar **autoridade da regra**, não retirar funcionalidade.

## Evidências-base

- **LEG-01**: `Juanjfmr/Bivaque/docs/design/DESIGN.md` (06/07): roteador para receitas, tokens antigos, checklist anti-IA subjetivo.
- **LEG-02**: `Juanjfmr/Bivaque/docs/design/app-experience-visual-guide.md`: `Home` com card primário e até quatro secundários; mobile 1 coluna; sem carrossel autenticado.
- **NOW-01**: `AGENTS.md`, `apps/app/AGENTS.md`, `docs/LANCAMENTO.md`: autoridade vigente, React SPA, biblioteca única, prova visual e revisão cega.
- **NOW-02**: `docs/agents/regua-nextdoor/IDENTIDADE-DAS-PECAS.md`, `PADRAO-DE-TELA.md`, ADR 20261102: paleta fria, Noto, peças, listas com divisórias, critérios editoriais.
- **NOW-03**: `docs/agents/regua-nextdoor/HANDOFF.md`, `AVALIACAO-79-FLOWS.md`: 79 jornadas Nextdoor e quatro eixos de comparação; propostas não equivalem a decisões aprovadas.
- **NOW-04**: `.claude/skills/visual-system-experiment/SKILL.md`: variações isoladas, contratos congelados, gate, captura e revisão cega.
- **BASE-01**: `prototypes/bivaque-html/docs/VISUAL_BASELINE_R72.md`: R72 congelada; não é autorização para reverter decisões posteriores.
- **HIST-01**: `docs/historico/agents/design-audit/ADJUDICATION.md`: limpeza adversarial de regras antigas (485 itens; nem todo item validado merece ser norma).
- **CODE-01**: `apps/app/src/pecas/pecas.tsx` e `pecas.css`: botões, linhas, cartões, avatares, ilustrações e campos com contratos.
- **EVID-01**: `docs/historico/agents/prototipo-shadcn/COMPARACAO-R72-MOBILE-20261026.md`: lacunas do porte em 26/10; **não** inferir que persistem em 10/11.

## Matriz completa

| # | Crítica | Origem | Tratamento | Ação proposta e prova |
|---|---|---|---|---|
| 01 | Tokens/tipografia antigos como instrução | L | DELETE | Marcar Aço, Barlow/Inter e dourado como legado; consumir ADR 20261102 e `pecas.css` |
| 02 | Autoridades de épocas distintas | L/V | CONFLICT | Fixar precedência em DESIGN-VNEXT; verificar ADR posterior antes de instruir agente |
| 03 | Home prescrita como card primário + 4 | L | DELETE | Liberar composição; preservar decisões de Home e comparar alternativas |
| 04 | Consistência confundida com uniformidade | H | AMEND | Preservar peças/semântica, variar arquitetura por tarefa |
| 05 | Anti-IA julgado por perguntas vagas | L | AMEND | Usar evidência observável e rubrica comparativa, não autodeclaração |
| 06 | Checklist sem prova de fidelidade | L/V | AMEND | Capturas pareadas, estados, interação, dados densos e revisão cega |
| 07 | Card como contêiner universal | L/V | EXPERIMENT | Medir card vs. linha/lista, exceto feed onde card é vigente |
| 08 | Mobile 1 coluna imposto | L | DELETE | Não impor gramática única; manter mobile legível |
| 09 | Carrossel autenticado proibido | L | DELETE | Explorar trilhos gestuais com alternativa por teclado |
| 10 | Header repetitivo título/subtítulo/meta | H | EXPERIMENT | Comparar headers contextuais por tarefa, evitando enchimento |
| 11 | Hierarquia card primário/secundário | L | DELETE | Selecionar composição pela decisão do usuário |
| 12 | Números arbitrários de cards/acentos | L | DELETE | Não importar limites antigos; seguir identidade vigente e provas |
| 13 | Densidade pouco orientada | H | AMEND | Documentar volume útil, truncamento, colapso e leitura por caso |
| 14 | Espaçamento fixo desperdiça primeira dobra | H | EXPERIMENT | Comparar 320/375 e contar informações/ações úteis |
| 15 | Tipografia como única fonte de hierarquia | H | AMEND | Diferenciar ritmo editorial, metadados e relação texto-imagem |
| 16 | Anatomias prescritas antes da exploração | L | DELETE | Fixar conteúdo/estado, não JSX/ordem imutável |
| 17 | Módulos com mesma composição | H | EXPERIMENT | Gramáticas F01–F10 com mesmo DS, estruturas próprias |
| 18 | Institucionalidade fria como identidade | L | DELETE | Adotar confiança e acolhimento da identidade vigente, sem militarizar UI |
| 19 | Dourado antigo reaparecendo | L | DELETE | Manter Brasa somente para iniciar criação, conforme 02/11 |
| 20 | Dupla fonte de tokens documentada | L | CONFLICT | Não importar valores; confirmar CSS/runtime vigentes |
| 21 | Antiornamento interpretado como anticaracterística | H | AMEND | Identidade por acabamento/arte contextual, sem enfeite gratuito |
| 22 | Fotografia sem direção suficiente | V/H | AMEND | Respeitar política vigente: foto só de membro; ilustrações oficiais em contextos fixados |
| 23 | Correspondência de token = marca | H | AMEND | Exigir foto, tipografia, ações e comportamento integrados |
| 24 | Placeholders em cold start | H | EXPERIMENT | Vazio funcional e descoberta útil sem inventar conteúdo |
| 25 | Fixtures e avatares irreais | H | AMEND | Dados de demonstração identificados, textos difíceis, consistência de imagem |
| 26 | Benchmark pelo nome do app | L/V | AMEND | Citar fluxo/tela real, comportamento, trade-off e rejeições |
| 27 | Componentes externos descaracterizados | H | EXPERIMENT | Preservar ganho de UX ao tokenizar; rejeitar quando perder o propósito |
| 28 | Gesture-first insuficiente | H | EXPERIMENT | Priorizar swipe/snap/back com acessibilidade equivalente |
| 29 | Mobile-first reduzido a breakpoints | H | AMEND | Modelar fluxo e ergonomia de toque; comparar dispositivos |
| 30 | Falta contrato de primeira dobra | H | AMEND | Registro por captura do conteúdo e CTA que aparecem antes do scroll |
| 31 | Busca exploratória = busca exata | H | EXPERIMENT | Comparar sugestões, categorias, resultados, filtros, recuperação |
| 32 | Transição entre módulos sem continuidade | V/H | KEEP | Reforçar histórico/scroll/foco já mandatórios no apps/app |
| 33 | Descoberta geográfica pouco especificada | H | EXPERIMENT | Lista/mapa apenas se dado real e função relevante |
| 34 | Cold start tratado como bug visual | H | EXPERIMENT | Sem preencher artificialmente; contexto e ação de contribuição |
| 35 | Sem fixture difícil | H | AMEND | Textos longos, zero/um resultado, baixa qualidade de imagem, rede lenta |
| 36 | Diferenciação por persona insuficiente | H | EXPERIMENT | Reordenar prioridades sem inventar segregação, papel ou informação militar |
| 37 | Documentos demais por tela | L/V | AMEND | Contexto curto e links vivos; não duplicar regras |
| 38 | Conformidade antes de exploração | H | AMEND | Dois candidatos isolados quando a decisão for composicional |
| 39 | Sem comparação cega central | L/V | KEEP | Já existe `visual-system-experiment`; conectar ao fluxo, não recriar |
| 40 | Checklist textual como evidência | L/V | AMEND | Inspeção de execução e screenshots; nenhum PASS autodeclarado |
| 41 | Categorias de aprovação abstratas | L/V | AMEND | Rubrica com evidência de tarefa, praticidade, interface e clareza |
| 42 | Aprovação subjetiva sem instrumento | H | AMEND | Veredito do dono mantido, acompanhado de comparação reprodutível |
| 43 | Norma misturada com hipótese | L/V | AMEND | MUST / SHOULD / EXPERIMENT; DECISION segue ADR, não skill |
| 44 | Dívida visual só registrada | L/V | AMEND | Vincular ao card, prova de encerramento e prazo; não criar outro backlog |

## Situação real da execução neste PR

**Os vereditos da tabela não são prova de implementação.** Abaixo está a situação das regras, após alterações nos arquivos ativos `PADRAO-DE-TELA.md`, `IDENTIDADE-DAS-PECAS.md` e `apps/app/AGENTS.md`:

| Situação | IDs da matriz | O que efetivamente aconteceu |
|---|---|---|
| **APLICADO às normas vigentes (documental)** | 02, 04, 05, 06, 13, 15, 21, 23, 25, 26, 29, 30, 35, 37, 38, 40, 41, 42, 43 | O padrão ativo passou a escolher composição pela tarefa, não copiar F01; mudou limite rígido de subtítulo, regra global de 2 colunas e rodapé, adicionou primeira dobra, comparação de conteúdo equivalente, estados adversos e avaliação com prova. Há critérios detalhados em DESIGN-VNEXT. **Não houve alteração de telas nem teste de runtime.** |
| **MOVIDO de documento** | 07 (parcial), 22 (conservado), 37 (parcial) | A definição de feed/listas/grupo sem capa passou da seção de identidade para o padrão de tela. As regras sobre avatar, fonte, cor e peças ficam na identidade; rótulo/código não são repetidos no padrão. |
| **LEGADO NEUTRALIZADO por precedência, não apagado** | 01, 03, 08, 09, 11, 12, 16, 18, 19 | Regras do antigo repositório, como Aço, Home com 4 cards, proibição de carrossel e mobile em um único molde, não são importadas para as instruções atuais. **Arquivos históricos continuam existindo; nenhum arquivo do outro repositório foi excluído.** |
| **CONFLITO TRATADO documentalmente** | 20 | O novo texto deixa claro que o fundo Papel de outubro não é fonte de tokens ativos; valor atual vem da ADR 02/11 e de `pecas.css`. **Não houve auditoria de todo o CSS em runtime.** |
| **KEEP — já vigente** | 32, 39 | Preservados histórico/scroll/foco e experimento com julgamento independente; não havia regra a substituir. |
| **F02 LAB IMPLEMENTADO, NÃO APROVADO** | 07, 10, 14, 17, 24, 28, 31, 34 (parcial) | O laboratório **A/B F02** implementa exploração editorial, resultados, filtros, rail e fixtures escassas/vazias/erro, com capturas reais em 6 larguras e dois temas. Não significa que regra visual tenha sido alterada nas telas de produto, nem prova melhora sobre baseline real. |
| **EXPERIMENTOS AINDA PENDENTES** | 27, 33, 36 e aplicações restantes de 07, 10, 14, 17, 24, 28, 31, 34 | Outros módulos, integração externa e julgamento sobre a experiência real ainda não passaram por experimento e aprovação. |
| **PENDÊNCIA DE EXECUÇÃO/QUADRO** | 44 | Foi criado critério de rastreabilidade no processo de revisão, mas nenhuma nova tarefa do board foi criada ou concluída; o fechamento pertence ao fluxo existente. |

**Resultado honesto:** as regras documentais de composição foram alteradas e **código React novo foi criado apenas em laboratório DEV de F02**, sem modificar telas de produto. A biblioteca de peças, a paleta, a R72 e os documentos históricos permanecem intactos. A aplicação **visual** continua pendente. Um PR em rascunho não equivale a decisão mesclada em `main`.

## Separar diagnóstico de decisão

**Documental confirmado:** 01–03, 05–06 (quanto ao modelo de revisão), 08–09, 11–12, 16, 18–20, 37, 39 (já tratado).  
**Risco plausível que requer renderização/uso real:** 04, 07, 10, 13–15, 17, 21–36, 38, 40–44.  
**Não afirmar como defeito atual:** resultados do porte em 26/10, orientações obsoletas de julho, screenshots de protótipo e placeholders que já tenham sido corrigidos.

## Decisões de contenção

1. Não alterar o outro repositório `Juanjfmr/Bivaque` para mascarar conflito; explicar seu papel histórico nas instruções atuais.
2. Não modificar a biblioteca `src/pecas`, a identidade e a R72 neste lote.
3. Não aprovar layout alternativo apenas com a matriz: testar em ambiente isolado, depois seguir governança do repositório.
4. A ordem de migração funcional continua a de `LANCAMENTO.md`; documento de design não pode criar trabalho paralelo fora do escopo.
