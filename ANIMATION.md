# ANIMATION.md — regra "animation"

Quando o pedido disser **"siga a regra animation"** (ou "regra de animação"), toda animação,
transição ou microinteração da tarefa segue este arquivo. Ele vale para `apps/app` (React SPA) e
para a landing em `apps/web`. Ele não muda tokens sozinho: valores novos entram em
`packages/tokens` no primeiro lote que os usar.

Fonte: vídeo de referência enviado pelo Juan em 19/11/2026 (720×720, 59,94 qps, 16,6 s,
996 quadros), medido com `ffmpeg` quadro a quadro (diferença de luminância entre quadros
consecutivos para achar início, pico e fim de cada movimento, e folhas de contato para ver a
forma). Os tempos abaixo são medidos, arredondados para múltiplos de ~16 ms; não são cópia de
nenhum produto.

## 1. O caráter

- **Rápido no começo, longo no assentamento.** Em todas as cenas o pico de movimento chega em
  3 a 5 quadros (50–80 ms) e o resto do tempo é desaceleração suave. Nunca linear, nunca
  ease-in na entrada.
- **O elemento se transforma, não é trocado.** Botão vira painel, lista vira formulário, item
  vira cartão de detalhe: o contêiner muda de tamanho e forma de modo contínuo, e só o conteúdo
  interno troca.
- **Troca de conteúdo com desfoque.** O conteúdo que sai some com opacidade e um leve blur; o que
  entra chega de blur para nítido. Não há corte seco entre telas.
- **Calmo.** Fundo claro, sombras suaves, deslocamentos curtos (4–12 px). Overshoot só em
  elementos pequenos (ícones, pílula, contador), nunca em painel ou tela inteira.

## 2. Curvas e durações

| Nome (token sugerido) | Duração | Curva | Uso |
| --- | --- | --- | --- |
| `instant` (existente, 120 ms) | 100–120 ms | `--ease-out` | hover, pressionar, troca de cor, foco |
| `base` (existente, 180 ms) | 160–200 ms | `--ease-out` | fade do conteúdo interno, ícone, tooltip |
| `slow` (existente, 240 ms) | 240 ms | `--ease-out` | pílula de abas, destaque que desliza na lista |
| `morph` (novo) | 380–420 ms | `--ease-out` ou mola | contêiner que muda de forma (botão→painel, lista→formulário) |
| `expand` (novo) | 450–500 ms | mola | item que vira detalhe, folha/painel que abre |
| saída de qualquer coisa | 60–70% da entrada | `--ease-out` | fechar é mais rápido que abrir |

- Curva padrão: a do projeto, `--ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out). Ela
  reproduz o perfil medido (pico cedo, cauda longa).
- Mola (quando houver biblioteca de física): `stiffness ≈ 380, damping ≈ 32, mass = 1`, sem
  quique visível em contêineres; em elementos pequenos aceita-se um overshoot de até ~4%.
  Sem biblioteca, use `cubic-bezier(0.34, 1.3, 0.64, 1)` só para elementos pequenos.
- `--ease-in` só existe para algo que sai da tela de vez. Não usar em entrada.

## 3. Padrões observados (com os tempos medidos)

Tempos a partir do início do gesto. "q" = quadro a 60 qps.

1. **Botão que vira painel** (0,00–0,42 s, q1–q25). Clique: escala do botão a 0,97 por ~80 ms.
   O contêiner cresce até o tamanho do painel (`morph`, ~400 ms), mantendo a borda arredondada e
   a sombra. O rótulo do botão sai com blur (q4–q9); a grade do painel entra com blur→nítido e
   opacidade 0→1 a partir de ~100 ms (q6–q15). Os itens não chegam em cascata; chegam juntos.
   Hover nos itens da grade: fundo suave aparece em `instant`.
   → No Bivaque: botão **Criar** da barra inferior abrindo as opções de criação.
2. **Lista que vira formulário e volta** (5,5–6,5 s, q330–q388). O cartão "Enviar" muda de altura
   para o formulário (`morph`) com o título atravessando a troca; os campos entram com blur. O
   fechar (X) devolve à lista com o mesmo morph, mais curto (~300 ms).
   → Escolha de tipo (ex.: tipo de anúncio no Mercado) que abre o formulário no mesmo cartão.
3. **Menu radial** (7,6–8,0 s, q455–q478). Ícones nascem do centro, com escala 0,6→1, opacidade e
   uma leve rotação em espiral; pico em ~70 ms, assenta em ~380 ms; atraso de ~15 ms entre ícones.
   Uso raro no Bivaque: só como referência para cascata de ícones pequenos.
4. **Pílula de abas que desliza** (8,1–8,4 s). O fundo da aba ativa desliza até a nova aba
   (`slow`, 240 ms) e ajusta a largura; o texto só troca de cor. Nada pisca.
   → Abas de Comunidade, Mercado e filtros segmentados.
5. **Item que vira cartão de detalhe** (8,4–9,6 s, q503–q577). A linha da lista cresce até o
   cartão de detalhe (`expand`, ~480 ms), com o ícone e o valor mantendo a posição relativa; o
   resto da lista some com blur e opacidade por baixo. Fechar devolve o cartão à linha exata
   (~320 ms).
   → Abrir um anúncio, uma publicação ou um chamado a partir da lista.
6. **Destaque que acompanha o ponteiro** (11,5–11,9 s, q689–q712). Em listas, o fundo de
   hover/seleção é um único elemento que desliza entre linhas (`slow`) e se levanta com sombra
   leve, em vez de cada linha acender sozinha.
   → Listas de membros, conversas e resultados de busca (somente em ponteiro fino; no toque,
   apenas o estado pressionado).
7. **Números que rolam** (dial em 1,6–2,8 s; simulador em 11,9–13,4 s). Dígitos que mudam rolam
   na vertical com blur de movimento, cada dígito independente; o gráfico (anel) interpola junto.
   → Contadores (ex.: número de respostas, preço ao editar). Nunca em dado que a pessoa está
   lendo parada.
8. **Folhear e trocar de dia** (4,6–5,5 s; 13,5–16,6 s). Ao escolher outro dia, o círculo de
   seleção desliza (`slow`) e a lista abaixo troca com deslocamento vertical curto + blur
   (`base`), na direção do dia escolhido (anterior sobe, seguinte desce).
   → Agenda e seleção de datas.

## 4. Regras obrigatórias

- **`prefers-reduced-motion: reduce`**: morph, expand, rolagem de números, cascata e espiral viram
  troca por opacidade de até 120 ms, sem deslocamento, sem escala e sem blur. Isso é critério de
  aceitação, não opcional.
- Animar só `transform`, `opacity` e `filter` (blur ≤ 6 px). Mudança de tamanho de contêiner é
  feita com técnica de layout por transform (FLIP, View Transitions ou `layout` da biblioteca),
  nunca animando `height`/`width`/`top` direto.
- Uma animação não pode bloquear a ação: o próximo toque funciona durante a transição e a
  interrompe a partir do estado atual (sem pular para o fim e recomeçar).
- Foco segue o conteúdo: quando um botão vira painel, o foco vai para o primeiro item do painel;
  ao fechar, volta ao botão de origem.
- Nada de animação em carregamento repetido de lista, em rolagem, nem em dados que chegam pelo
  servidor depois da tela pronta (aparecem com fade `base`, sem deslocamento).
- Mesma regra nos dois temas. Sombras e blur usam os tokens de sombra do tema; no escuro o blur
  de troca continua igual.
- Valores fora da tabela da seção 2 precisam de motivo escrito no card ou no PR.

## 5. Como aplicar e provar

1. Antes de implementar, liste quais padrões da seção 3 a tela usa e com quais tokens.
2. Use os tokens de `packages/tokens` (`--duration-*`, `--ease-*`). Ao precisar de `morph` ou
   `expand`, adicione os tokens lá no mesmo lote (primitivo + semântico + teste do pacote).
3. Prova: gravação curta (Playwright `video` ou captura sequencial) em 375 px nos dois temas, mais
   uma passada com `reducedMotion: "reduce"`. Guarde em `.visual/<run>/` e cite no card.
4. A revisão às cegas confere este arquivo item a item: caráter (seção 1), tempos (seção 2) e as
   regras obrigatórias (seção 4).
