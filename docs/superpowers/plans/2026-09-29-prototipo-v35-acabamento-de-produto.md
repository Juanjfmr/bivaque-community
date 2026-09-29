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
  1. O menu não depende de gesto: o botão ⋯ está sempre visível e na ordem de Tab, e clique direito, tecla de
     menu e toque longo abrem exatamente a mesma lista (P42, P43, P45). Ações secundárias como Ocultar, Arquivar e
     Denunciar vivem só no menu, de propósito; uma versão anterior desta regra prometia um equivalente fora do menu
     para cada item, o que era falso e nunca foi medido.
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
- [x] Tokens: cor (marca, neutros, semânticas), escala tipográfica, espaçamento, raio, sombra, movimento.
- [x] Sprite SVG único; troca de todos os glifos Unicode usados como ícone.
- [x] Componentes com estados: hover, foco, pressionado, desabilitado, vazio, erro.
- [x] Imagens com esqueleto até carregar e fallback quando falham.
- [x] Hierarquia da Início e dos catálogos revista para 390 px (hero menor, chips que não agem deixam de parecer botões).

**Prova:** `P29` (alvos), `P30` (contraste), nova sonda: nenhum glifo de ícone no DOM; nenhum texto < 12 px.

### Task 2 — Navegação moderna
- [x] Barra inferior com cinco abas; "Contribuir" vai para a barra superior e o botão flutuante sai. (Decisão: uma ação central custaria uma das cinco abas de pilares; Comunidade e Conversas ficam.)
- [x] Paleta de comandos (Ctrl/⌘+K, "/"), com ir para, criar, seus itens e buscar; combobox acessível.
- [x] Atalhos de teclado (`g` + letra, `?`) que ignoram campos de texto.
- [x] Transição de tela e de folha; reduzida com `prefers-reduced-motion`.
- [x] Trilha e "Voltar" nas telas de segundo nível.
- [x] Folha inferior no celular (alça, arrasto para fechar, toque no fundo); janela centralizada no desktop.

**Prova:** sondas de teclado da paleta e dos atalhos; foco devolvido; `Esc`; movimento reduzido.

### Task 3 — Menus de contexto
- [x] Componente único (`role="menu"`), botão "⋯" visível, clique direito, tecla de menu e toque longo.
- [x] Teclado completo (setas, Home/End, letra, Esc, Tab), foco devolvido; folha de ações no celular.
- [x] Itens por tipo (prestador, anúncio, imóvel, desapego, evento, benefício, referência, necessidade,
      conversa, pergunta, notificação); Ocultar, Denunciar, Arquivar com estado real.
- [x] Anúncio sem "por que apareceu".

**Prova:** sondas de menu (teclado, clique direito e toque longo com a mesma lista do botão, botão ⋯ visível e na
ordem de Tab nos 15 tipos, anúncio sem "por que apareceu", item some ao ocultar); mutantes para botão escondido
e clique direito sem efeito.

### Task 4 — Feedback e formulários
- [x] Aviso com "Desfazer" (salvar, ocultar, arquivar, silenciar, encerrar, dispensar, presença) que realmente desfaz.
- [x] Validação inline (`aria-invalid`, `aria-describedby`, foco no primeiro erro); rótulos reais no painel do prestador.
- [x] Itens ocultos visíveis e reversíveis em Você; denúncia registra só o motivo (sem texto livre); emblemas e barra de progresso animados.

**Prova:** sonda de desfazer (estado volta); sonda de validação; zero campos sem rótulo (`P29`).

### Task 5 — Copy
- [x] Passe por tela, em português direto, sem vocabulário interno (41 trocas). Um commit isolado, para o dono poder reverter só a copy. O termo "necessidade" foi mantido de propósito: é o objeto do produto; trocar por "assunto" ou "pedido" é mecânico e fica para decisão do dono.
- [x] Lista antes → depois no corpo do PR. `P32` ganha as frases proibidas novas ("lado certo", "orgânic", "Meu contexto", "Foco escolhido", "só mencionou", "Objeto" e outras).

**Prova:** `P32` estendida; sondas de texto atualizadas sem enfraquecer a asserção.

### Task 6 — Verificação e relatório
- [x] `verify.mjs` verde (93 verificações: 69 herdadas + 24 novas), saída colada em **Evidência de execução**.
- [x] `mutate.mjs`: 9 mutantes herdados + 9 novos, 18 detectados.
- [x] `npx pnpm@11.18.0 gate`: lint, typecheck, test e secrets verdes. O Biome exclui só o HTML. (`build` não rodou localmente: falta `apps/web/.env.local`; a confirmação é a CI do PR.)
- [x] Notas de "o que continua sem prova" reescritas no README.

## Como rodar

```sh
node docs/design/prototype-v35/verify.mjs
node docs/design/prototype-v35/mutate.mjs
```

## Evidência de execução

Arquivos testados (SHA-256, primeiros 16 caracteres): `Bivaque_v35.html` `86a458244c019286`, `verify.mjs` `cd6fea88ebce6893`, `mutate.mjs` `53a5f06429c8e806`.
Data: 29/09/2026. Chromium do Playwright. A evidência é amarrada ao conteúdo dos arquivos, e não a um commit,
porque um commit não pode conter o próprio hash. Confira com `sha256sum`.

**Quem verificou:** o próprio implementador. Não é revisão independente nem verificação de runtime independente
(seção 14 do processo de construção). As camadas independentes que existem são a CI do PR, o revisor automático do
PR e a revisão do dono. O revisor automático já apontou dois achados neste PR (abaixo), ambos tratados.

`node docs/design/prototype-v35/verify.mjs`, saída 0 (títulos cortados em 118 caracteres):

```
PASS P01@1440     anúncio nunca aparece na zona orgânica do Resolver (5 buscas + 4 extras, 3 focos)
PASS P01@390      anúncio nunca aparece na zona orgânica do Resolver (5 buscas + 4 extras, 3 focos)
PASS P02@1440     catálogos: anúncio só na faixa rotulada; selo e evidência iguais; sem estrelas
PASS P02@390      catálogos: anúncio só na faixa rotulada; selo e evidência iguais; sem estrelas
PASS P03@1440     ficha do prestador: resultado, recência e vínculo (contratou × mencionou); zero e poucos relatos
PASS P03@390      ficha do prestador: resultado, recência e vínculo (contratou × mencionou); zero e poucos relatos
PASS P03b@1440    selo 'Recomendado' só com maioria de contratações bem-sucedidas; quem só ouviu falar não conta como…
PASS P03b@390     selo 'Recomendado' só com maioria de contratações bem-sucedidas; quem só ouviu falar não conta como…
PASS P04@1440     benefício: condição, validade, resgate persistente e estado vencido
PASS P04@390      benefício: condição, validade, resgate persistente e estado vencido
PASS P05@1440     painel do prestador: pedido recebido → proposta chega a quem pediu, com a mesma ficha pública
PASS P05@390      painel do prestador: pedido recebido → proposta chega a quem pediu, com a mesma ficha pública
PASS P06@1440     as 5 buscas do roteiro criam 0 necessidades; 'Acompanhar' cria exatamente 1
PASS P06@390      as 5 buscas do roteiro criam 0 necessidades; 'Acompanhar' cria exatamente 1
PASS P07@1440     orçamento pelo catálogo não toca na necessidade de mudança; conversa ancora na escolhida
PASS P07@390      orçamento pelo catálogo não toca na necessidade de mudança; conversa ancora na escolhida
PASS P08@1440     3 propostas comparáveis; escolher cria 'contratei' e conversa; deu certo? aparece depois de 3 dias
PASS P08@390      3 propostas comparáveis; escolher cria 'contratei' e conversa; deu certo? aparece depois de 3 dias
PASS P09@1440     Contribuir: infere direção e tipo, você corrige, vê prévia e o anúncio publicado aparece (4 tipos)
PASS P09@390      Contribuir: infere direção e tipo, você corrige, vê prévia e o anúncio publicado aparece (4 tipos)
PASS P10@1440     alternar o foco muda Home e Resolver; cidade citada vence o foco
PASS P10@390      alternar o foco muda Home e Resolver; cidade citada vence o foco
PASS P11@1440     casos âncora devolvem resultados heterogêneos (mudança, ar-condicionado, saúde em Brasília)
PASS P11@390      casos âncora devolvem resultados heterogêneos (mudança, ar-condicionado, saúde em Brasília)
PASS P12@1440     esclarecimento muda o resultado; vazio útil; sem estrelas de 'humor'
PASS P12@390      esclarecimento muda o resultado; vazio útil; sem estrelas de 'humor'
PASS P13@1440     Home muda com a fase e com a transferência; várias transferências; cidade sem base = cold start
PASS P13@390      Home muda com a fase e com a transferência; várias transferências; cidade sem base = cold start
PASS P14@1440     editar transferência: destino e data mudam a fase; origem = destino é recusado
PASS P14@390      editar transferência: destino e data mudam a fase; origem = destino é recusado
PASS P15@1440     nenhuma data exata de terceiros em tela; Desapegos invertido por lado
PASS P15@390      nenhuma data exata de terceiros em tela; Desapegos invertido por lado
PASS P16@1440     perguntar exige entrar (com consentimento), editar, ver prévia e confirmar; nada por efeito colater…
PASS P16@390      perguntar exige entrar (com consentimento), editar, ver prévia e confirmar; nada por efeito colater…
PASS P17@1440     regra de ingresso aplicada (transição elegível × pedido) e leitura bloqueada a quem não é membro
PASS P17@390      regra de ingresso aplicada (transição elegível × pedido) e leitura bloqueada a quem não é membro
PASS P18@1440     fechar necessidade com nome de criança não deixa o nome em nenhuma tela pública; prestador não vem …
PASS P18@390      fechar necessidade com nome de criança não deixa o nome em nenhuma tela pública; prestador não vem …
PASS P19@1440     pergunta parecida oferece a existente antes de publicar (dedupe)
PASS P19@390      pergunta parecida oferece a existente antes de publicar (dedupe)
PASS P20@1440     consentimento só pelos temas aceitos; 'pedir ajuda' deixa rastro ligado à necessidade e aceite cheg…
PASS P20@390      consentimento só pelos temas aceitos; 'pedir ajuda' deixa rastro ligado à necessidade e aceite cheg…
PASS P21@1440     referência com curador nomeado; evidência compartilhada aciona revisão; resposta que ajudou conta
PASS P21@390      referência com curador nomeado; evidência compartilhada aciona revisão; resposta que ajudou conta
PASS P22@1440     salvos, presença, resposta e mensagem persistem depois de recarregar
PASS P22@390      salvos, presença, resposta e mensagem persistem depois de recarregar
PASS P23@1440     notificações só existem com o estado que as gera; 'Amanhã' só com presença; badge = não lidas
PASS P23@390      notificações só existem com o estado que as gera; 'Amanhã' só com presença; badge = não lidas
PASS P24@1440     avanço de tempo gera novidade causal: desapego na janela, resposta à sua pergunta, proposta ao seu …
PASS P24@390      avanço de tempo gera novidade causal: desapego na janela, resposta à sua pergunta, proposta ao seu …
PASS P35@1440     Editar preserva todos os campos e o publicado é exatamente a prévia (imóvel, serviço, evento, desap…
PASS P35@390      Editar preserva todos os campos e o publicado é exatamente a prévia (imóvel, serviço, evento, desap…
PASS P25@1440     texto com apóstrofo ou HTML não quebra nem executa
PASS P25@390      texto com apóstrofo ou HTML não quebra nem executa
PASS P26@1440     gaveta é diálogo: foco entra e fica, Esc fecha e devolve o foco, Voltar fecha antes de sair da pági…
PASS P26@390      gaveta é diálogo: foco entra e fica, Esc fecha e devolve o foco, Voltar fecha antes de sair da pági…
PASS P27@1440+390 todo controle com data-act produz efeito, nas páginas e nas gavetas (1440 e 390)
PASS P34@1440     nenhuma fonte, script ou folha de estilo de terceiro é pedida; Public Sans auto-hospedada carrega
PASS P34@390      nenhuma fonte, script ou folha de estilo de terceiro é pedida; Public Sans auto-hospedada carrega
PASS P28@1440     campos com rótulo, botões com nome, imagens com alt, um item ativo por navegação
PASS P28@390      campos com rótulo, botões com nome, imagens com alt, um item ativo por navegação
PASS P29@1440+390 alvos de toque ≥ 44px nos controles (1440 e 390)
PASS P30@1440     contraste de texto ≥ 4,5:1 (fora de imagens)
PASS P30@390      contraste de texto ≥ 4,5:1 (fora de imagens)
PASS P31@1440+390 390px: sem rolagem horizontal, Contribuir na barra superior e sem botão flutuante, entradas para to…
PASS P32@1440     sem texto de bastidor; 'por que apareceu' no máximo uma vez por card e nunca em anúncio
PASS P32@390      sem texto de bastidor; 'por que apareceu' no máximo uma vez por card e nunca em anúncio
PASS P33@1440     estados: zero, um e muitos; vencido; sem resposta; resolvido; interessado; salvo
PASS P33@390      estados: zero, um e muitos; vencido; sem resposta; resolvido; interessado; salvo
PASS P36@1440     ícones são SVG do sprite (nenhum glifo Unicode como ícone), todo <use> resolve, nenhum texto < 12 p…
PASS P36@390      ícones são SVG do sprite (nenhum glifo Unicode como ícone), todo <use> resolve, nenhum texto < 12 p…
PASS P37@1440     paleta de comandos: abre, filtra, setas movem a seleção, Enter navega e foca a tela, Esc e Ctrl+K f…
PASS P37@390      paleta de comandos: abre, filtra, setas movem a seleção, Enter navega e foca a tela, Esc e Ctrl+K f…
PASS P38@1440     atalhos: g + letra navega, / abre a paleta, ? abre o quadro; nada dispara dentro de campo de texto …
PASS P38@390      atalhos: g + letra navega, / abre a paleta, ? abre o quadro; nada dispara dentro de campo de texto …
PASS P39@1440     trilha nas telas de segundo nível volta ao pai; título e anúncio acompanham a página
PASS P39@390      trilha nas telas de segundo nível volta ao pai; título e anúncio acompanham a página
PASS P40@1440     janela: clique no fundo fecha, selecionar texto e soltar fora não fecha, rolagem do fundo trava; no…
PASS P40@390      janela: clique no fundo fecha, selecionar texto e soltar fora não fecha, rolagem do fundo trava; no…
PASS P41@1440     com preferência normal a troca de tela e a janela animam; com movimento reduzido nenhuma passa de 1…
PASS P41@390      com preferência normal a troca de tela e a janela animam; com movimento reduzido nenhuma passa de 1…
PASS P42@1440     botão ⋯: abre com foco no 1º item, setas/Home/End/letra movem, Esc devolve o foco ao botão, Tab fec…
PASS P42@390      botão ⋯: abre com foco no 1º item, setas/Home/End/letra movem, Esc devolve o foco ao botão, Tab fec…
PASS P43@1440     varredura: cada item de cada menu (15 tipos) faz efeito; botão ⋯ visível e na ordem de Tab; clique …
PASS P43@390      varredura: cada item de cada menu (15 tipos) faz efeito; botão ⋯ visível e na ordem de Tab; clique …
PASS P44@1440     ocultar, denunciar, arquivar, silenciar e dispensar mudam o estado de verdade, têm 'Desfazer' e fic…
PASS P44@390      ocultar, denunciar, arquivar, silenciar e dispensar mudam o estado de verdade, têm 'Desfazer' e fic…
PASS P45@1440     portas alternativas: clique direito e tecla de menu abrem o mesmo menu; toque longo abre a folha se…
PASS P45@390      portas alternativas: clique direito e tecla de menu abrem o mesmo menu; toque longo abre a folha se…
PASS P46@1440     validação inline: erro junto do campo (aria-invalid + aria-describedby), foco no primeiro, nada é e…
PASS P46@390      validação inline: erro junto do campo (aria-invalid + aria-describedby), foco no primeiro, nada é e…
PASS P47@1440     ligar conversa a uma necessidade: sem nenhuma necessidade ativa o formulário abre com uma opção mar…
PASS P47@390      ligar conversa a uma necessidade: sem nenhuma necessidade ativa o formulário abre com uma opção mar…

93/93 verificações passaram (48 sondas; a maioria roda em 1440 e em 390 px)
```

`node docs/design/prototype-v35/mutate.mjs`, saída 0 (18 quebras, 18 detectadas):

```
DETECTADA      M1 anúncio entra no orgânico → FAIL P01@1440     anúncio nunca aparece na zona orgânica do Resolver (5…
DETECTADA      M2 busca cria necessidade → FAIL P06@1440     as 5 buscas do roteiro criam 0 necessidades; 'Acompanhar…
DETECTADA      M3 orçamento ancora na mudança → FAIL P07@1440     orçamento pelo catálogo não toca na necessidade de …
DETECTADA      M4 evidência guarda texto livre → FAIL P18@1440     fechar necessidade com nome de criança não deixa o…
DETECTADA      M5 entra na comunidade sem confirmar → FAIL P16@1440     perguntar exige entrar (com consentimento), e…
DETECTADA      M6 gaveta sem role=dialog → FAIL P26@1440     gaveta é diálogo: foco entra e fica, Esc fecha e devolve…
DETECTADA      M8 o tempo passa e o pedido não recebe proposta → FAIL P24@1440     avanço de tempo gera novidade caus…
DETECTADA      M9 Editar descarta o que a pessoa preencheu → FAIL P35@1440     Editar preserva todos os campos e o pu…
DETECTADA      M10 atalho dispara dentro de campo de texto → FAIL P38@1440     atalhos: g + letra navega, / abre a pa…
DETECTADA      M11 selecionar texto e soltar fora fecha a janela → FAIL P40@1440     janela: clique no fundo fecha, s…
DETECTADA      M12 anúncio ganha 'por que apareceu' no menu → FAIL P43@1440     varredura: cada item de cada menu (15…
DETECTADA      M13 ocultar não oculta → FAIL P44@1440     ocultar, denunciar, arquivar, silenciar e dispensar mudam o…
DETECTADA      M14 Desfazer do salvamento não desfaz → FAIL P44@1440     ocultar, denunciar, arquivar, silenciar e di…
DETECTADA      M15 validação inline desligada → FAIL P46@1440     validação inline: erro junto do campo (aria-invalid…
DETECTADA      M16 botão ⋯ escondido → FAIL P43@1440     varredura: cada item de cada menu (15 tipos) faz efeito; bot…
DETECTADA      M17 clique direito não abre o menu → FAIL P43@1440     varredura: cada item de cada menu (15 tipos) fa…
DETECTADA      M18 ligar conversa sem necessidade estoura → FAIL P47@1440     ligar conversa a uma necessidade: sem n…
DETECTADA      M7 data exata de terceiros → FAIL P15@1440     nenhuma data exata de terceiros em tela; Desapegos inve…
todas as mutações detectadas
exit 0
```

`npx pnpm@11.18.0 gate`: lint, typecheck, test (117 de scope, 0 falhas) e secrets verdes. O passo `build` **não
rodou localmente** (falta `apps/web/.env.local`, que exige a pilha Supabase); a confirmação é a CI do PR.

## Achados durante a execução (corrigidos)

Dos testes:

- Com movimento reduzido, a transição global de 0,01 ms atrasava o posicionamento e o foco do menu de contexto
  (o foco não entrava no 1º item). Agora `prefers-reduced-motion` desliga animação e transição por completo.
- Um evento de rolagem que já estava a caminho fechava o menu recém-aberto.
- A paleta perdia as primeiras letras digitadas logo após Ctrl+K (o foco entrava 10 ms depois).
- Ao fechar uma janela, o foco podia ficar num elemento escondido por um quadro, e o atalho seguinte era ignorado.
- Uma animação com `scale` na janela fazia os controles medirem 43 px na sonda de alvo de toque.
- O mutante M16 (botão ⋯ escondido) nasceu ineficaz: a declaração nova perdia para uma posterior da mesma regra.
  Só o teste do próprio mutante mostrou isso; foi corrigido e detectado nos dois tamanhos de tela.

Do revisor automático do PR:

- **"Ligar a uma necessidade" estourava com zero necessidades ativas** (nenhuma opção marcada, `TypeError` no
  envio). Existia desde o v34. Reproduzido antes com a P47 (vermelha nos dois tamanhos), corrigido (opção "nova"
  marcada quando não há outra, e o envio não depende mais de haver uma marcada) e a P47 ficou verde; mutante M18.
- **A regra 1 do plano era declarada e não medida, e por leitura era falsa** (em Conversas, "Silenciar" e
  "Arquivar" só existem no menu). A regra foi reescrita para o que é verdade e passa a ser medido: botão ⋯
  visível e na ordem de Tab nos 15 tipos, e clique direito com a mesma lista do botão (P43); mutantes M16 e M17.

## O que continua sem prova

Ver o README: só Chromium; sem aparelhos reais nem leitor de tela; polimento não é validação; teste com pessoas é
do dono; fronteiras R3 seguem pedindo ADR.
