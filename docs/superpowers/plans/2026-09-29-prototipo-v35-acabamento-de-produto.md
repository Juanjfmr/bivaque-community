# Protótipo v35 — acabamento próximo de produto (visual, navegação, menus de contexto, copy) Implementation Plan

> **Status:** candidato de referência visual, empilhado sobre o v34 (PR #87). **Não** substitui a autoridade
> de `docs/design/visual-guide-2026-09-06/` nem altera `AGENTS.md`/`CLAUDE.md`. O dono autorizou, para este
> protótipo, liberdade para evoluir o visual e a navegação. Quem travar o v35 como autoridade precisa
> registrar que isso troca a navegação de 06/09 (Início / Explorar / Comunidades / Perfil).
>
> **Origem:** pedido do dono, depois da revisão do v34: "atenção maior aos detalhes e à parte visual, próximo
> de produto final em UI/UX, copy ajustada, bastante interatividade e navegação moderna, com menus de
> contexto se for interessante". A proposta foi apresentada e autorizada antes de qualquer mudança
> (cinco blocos; visual e navegação livres; PR novo).
>
> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Bivaque_v35.html`, o mesmo comportamento provado do v34 com acabamento de produto: sistema visual
coerente, navegação moderna, menus de contexto acessíveis e uma passada de copy, com sondas no navegador
(desktop 1440 e mobile 390) para cada interação nova. As 69 verificações do v34 continuam passando; toda
mudança nelas é de seletor ou de texto e está justificada no PR.

**Architecture:** arquivo único, como o v34. `DB` estático e fictício; `state` persistido (`bivaque-v35`).
Delegação de cliques por `data-act`, sem JavaScript em atributo. Componentes novos (sprite de ícones,
menu de contexto, paleta de comandos, folha de ações) são funções pequenas que devolvem HTML e são
acionadas pelo mesmo despachante. Estado novo (`hidden`, `archived`, `reports`) entra em `seedState()`
e no `save()`.

**Tech Stack:** HTML/CSS/JS sem dependências. Public Sans auto-hospedada (`apps/web/app/fonts`), sem fonte,
script nem folha de estilo de terceiro. Ícones em SVG inline (sprite `<symbol>`), nenhum glifo Unicode como
ícone. Fotos de demonstração do Unsplash (terceiro, só imagem, declarado). Verificação: `@playwright/test`.

## Global Constraints

- **É referência visual, não runtime.** Nada aqui toca `apps/`, `packages/`, `supabase/`.
- **Dados 100% fictícios.** Nenhum CPF, posto, OM ou endereço.
- **Invariantes do v34 preservadas (cada uma tem sonda que já existe):** anúncio fora do orgânico e sem
  "por que apareceu"; nada publica nem ingressa sem passo explícito; evidência pública sem texto livre;
  data exata de terceiros nunca em tela; busca não cria necessidade.
- **Novas regras deste plano:**
  1. Menu de contexto nunca é o único caminho: todo item do menu tem equivalente visível ou no detalhe.
  2. Anúncio pago oferece "Ocultar" e "Denunciar"; nunca "por que apareceu".
  3. Todo gesto (clique direito, toque longo, atalho) tem equivalente por teclado e por toque simples.
  4. Nenhum movimento essencial: com `prefers-reduced-motion`, nada anima e tudo continua utilizável.
  5. Texto ≥ 12 px, alvos ≥ 44 px, contraste ≥ 4,5:1, foco visível em tudo que age.
  6. Sem latência artificial: estados de carregamento cobrem imagens e revelação, não atraso simulado
     (atraso falso esconderia o comportamento real e tornaria as sondas instáveis).
- **Polimento não é validação.** Um protótipo mais bonito não prova escala, recorrência nem
  diferenciação. O README e o PR repetem o que segue sem prova.
- **Fora de escopo:** modo escuro; teste de usabilidade com pessoas (só o dono pode fazer); simulação de
  rede lenta; qualquer mudança em `apps/`.
- **Verificação:** do próprio implementador, não independente (seção 14 do processo de construção). O revisor
  automático do PR e a revisão do dono são as camadas independentes.
- **Commits:** convencionais, um por tarefa, para o dono poder reverter a copy sem perder o resto.

## Tarefas

### Task 0 — Base
- [x] Copiar o v34 para `docs/design/prototype-v35/`, renomear caminhos e chave de estado.
- [x] Baseline: `verify.mjs` no v35 idêntico ao v34 → 69/69.

### Task 1 — Sistema visual
- [ ] Tokens: cor (marca, neutros, semânticas), escala tipográfica, espaçamento, raio, sombra, movimento.
- [ ] Sprite SVG único; troca de todos os glifos Unicode usados como ícone.
- [ ] Componentes com estados: hover, foco, pressionado, desabilitado, vazio, erro.
- [ ] Imagens com esqueleto até carregar e fallback quando falham.
- [ ] Hierarquia da Início e dos catálogos revista para 390 px (hero menor, chips que não agem deixam de parecer botões).

**Prova:** `P29` (alvos), `P30` (contraste), nova sonda: nenhum glifo de ícone no DOM; nenhum texto < 12 px.

### Task 2 — Navegação moderna
- [ ] Barra inferior com ação central "Contribuir"; o botão flutuante sai.
- [ ] Paleta de comandos (Ctrl/⌘+K, "/"), com ir para, criar, seus itens e buscar; combobox acessível.
- [ ] Atalhos de teclado (`g` + letra, `?`) que ignoram campos de texto.
- [ ] Transição de tela e de folha; reduzida com `prefers-reduced-motion`.
- [ ] Trilha e "Voltar" nas telas de segundo nível.
- [ ] Folha inferior no celular (alça, arrasto para fechar, toque no fundo); janela centralizada no desktop.

**Prova:** sondas de teclado da paleta e dos atalhos; foco devolvido; `Esc`; movimento reduzido.

### Task 3 — Menus de contexto
- [ ] Componente único (`role="menu"`), botão "⋯" visível, clique direito, tecla de menu e toque longo.
- [ ] Teclado completo (setas, Home/End, Esc, Tab), foco devolvido; folha de ações no celular.
- [ ] Itens por tipo (prestador, anúncio, imóvel, desapego, evento, benefício, referência, necessidade,
      conversa, pergunta, notificação); Ocultar, Denunciar, Arquivar com estado real.
- [ ] Anúncio sem "por que apareceu".

**Prova:** sondas de menu (teclado, clique direito, anúncio sem "por que apareceu", item some ao ocultar).

### Task 4 — Feedback e formulários
- [ ] Aviso com "Desfazer" (salvar, ocultar, arquivar, encerrar) que realmente desfaz.
- [ ] Validação inline (`aria-invalid`, `aria-describedby`, foco no primeiro erro); rótulos reais no painel do prestador.
- [ ] Itens ocultos e denúncias visíveis em Você; emblemas e barra de progresso animados.

**Prova:** sonda de desfazer (estado volta); sonda de validação; zero campos sem rótulo (`P29`).

### Task 5 — Copy
- [ ] Passe completo, por tela, em português direto, sem vocabulário interno. Um commit isolado.
- [ ] Lista antes → depois no corpo do PR. `P32` ganha as frases proibidas novas.

**Prova:** `P32` estendida; sondas de texto atualizadas sem enfraquecer a asserção.

### Task 6 — Verificação e relatório
- [ ] `verify.mjs` verde (69 verificações herdadas + as novas), saída colada em **Evidência de execução**.
- [ ] `mutate.mjs`: 9 mutantes herdados + os novos, todos detectados.
- [ ] `npx pnpm@11.18.0 gate`: lint, typecheck, test e secrets verdes. O Biome exclui só o HTML.
- [ ] Notas de "o que continua sem prova" reescritas no README.

## Como rodar

```sh
node docs/design/prototype-v35/verify.mjs
node docs/design/prototype-v35/mutate.mjs
```

## Evidência de execução

*(preenchida na Task 6)*
