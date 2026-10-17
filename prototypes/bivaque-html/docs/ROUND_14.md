# Bivaque — Rodada 14: paleta de busca e comandos (Ctrl+K / ⌘K)

Data: 15/10/2026. Contrato: `docs/agents/tasks/HTML-014.task.yml` (R2). Base: `c9b8c4fb`.
Pedido do usuário: executar a ordem sugerida de componentes inspirados no 21st.dev, com a
paleta em primeiro. Referências: Command Menu with Global Search e Command Palette, do
21st.dev.

**Veredito: PASS**, com a diferença visual conhecida descrita em Prova.

## O que é

No desktop (a partir de 1024 px), **Ctrl+K** ou **⌘K** abre a paleta de qualquer tela; a
tecla **"/"** também abre, fora de campos de texto. A busca da Início do desktop mostra a
dica "Ctrl K" (ou "⌘ K" no Mac). No celular e no tablet, a busca continua sendo a tela
Buscar.

- **Sem digitar:** ações de criar, páginas ("Ir para") e buscas recentes.
- **Digitando:** resultados agrupados em Negócios (com o número de indicações), Anúncios
  (preço e bairro), Perguntas, Grupos, Ações e Páginas, com o termo destacado. A última
  opção, "Buscar “…” em tudo", abre a tela Buscar e guarda a busca nas recentes.
- **Teclado:** ↑ ↓ navegam, Enter abre e Esc fecha e devolve o foco. Um segundo Ctrl+K também
  fecha.
- **Cidade consultada:** as ações de criar não aparecem.
- Não abre por cima de diálogo, confirmação ou painel Criar.

## Revisão independente

Nenhum CRITICAL ou HIGH.

- **MEDIUM corrigido:** com emoji ou texto já decomposto antes do termo, o destaque saía
  deslocado ("🛏️ Berço" destacava " Berç"). Agora o destaque é calculado por caractere real.
- **MEDIUM corrigido:** o foco podia sair da paleta (Shift+Tab chegava ao botão Criar) e aí o
  Esc deixava de funcionar. Agora tudo atrás da paleta fica inerte, inclusive o botão Criar
  e as ações de detalhe. Tab mantém o foco no campo, e um clique fora do campo não tira o
  foco dele. O atalho C não abre o Criar por baixo da paleta.
- **MEDIUM corrigido:** o Voltar do navegador e o recálculo da barra de navegação ignoravam a
  paleta. Agora o Voltar fecha a paleta, e a barra continua inerte enquanto ela está aberta.
- **LOW corrigidos:**
  - termo de uma letra ou "de" mostra o estado inicial, e não resultados sem filtro;
  - tecla repetida e Ctrl+Shift+K não acionam;
  - Enter de composição de acentos no Safari não executa a opção;
  - o campo tem nome acessível e a quantidade de resultados é anunciada.
- **Lacunas de prova fechadas:** ⌘K e fechar com segundo Ctrl+K, bloqueio com diálogo aberto,
  foco preso na paleta, Voltar do navegador, emoji no destaque, busca com HTML, estreitar a
  janela, ação de criar presente na própria cidade e o teste do "/" que passava sem testar.

## Prova

As conferências rodaram no candidato `fea1feae…` (Rodadas 14 e 15 juntas):

| Prova | Resultado |
| --- | --- |
| Rodada 14 (11 verificações; 375, 768, 1024 e 1440, claro e escuro) | PASS, 55/55 |
| Rodada 15 (5 verificações; 375, 768, 1024 e 1440, claro e escuro) | PASS, 30/30 |
| Rodada 13 (375, 1024 e 1440) | PASS, 48/48 |
| Rodadas 02 e 01 | PASS (72/72 na 02) |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |

A dica "Ctrl K" na busca e a fonte corrigida do "C" no painel Criar mudam a Início e o
Criar do desktop, que estão congelados como base visual. Até o novo congelamento, que
depende da aprovação das telas pelo usuário e acontece no fechamento do lote, a prova
visual estrita acusa essa diferença conhecida. A bateria completa também roda no
fechamento do lote.
