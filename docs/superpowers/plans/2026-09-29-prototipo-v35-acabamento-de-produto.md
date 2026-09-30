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
  5. Texto ≥ 12 px, alvos ≥ 44 px e contraste ≥ 4,5:1 são medidos (P36, P29 e P30; mutantes M40, M38 e M39). Foco
     visível vem do `:focus-visible` global e **não é medido por nenhuma sonda**.
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
- [x] `verify.mjs` verde nos dois modos de movimento (107 verificações: 69 herdadas + 24 do polimento + 14 dos filtros), saída colada em **Evidência de execução**.
- [x] `mutate.mjs`: 9 mutantes herdados (M1 a M9) + 37 novos (M10 a M46), 46 detectados por asserção (falha por exceção ou erro de JavaScript da página não conta). Cada uma das 19 sondas novas (P36 a P54) tem ao menos um mutante.
- [x] `npx pnpm@11.18.0 gate`: lint, typecheck, test e secrets verdes. O Biome exclui só o HTML. (`build` não rodou localmente: falta `apps/web/.env.local`; a confirmação é a CI do PR.)
- [x] Notas de "o que continua sem prova" reescritas no README.

### Task 7 — Filtros de verdade nos seis catálogos

> **Origem:** o dono apontou, depois de testar o v35, que os catálogos só tinham uma linha de chips: faltavam
> quartos, localização, tamanho, vaga e condomínio nos imóveis, tipo de serviço nos serviços e o mesmo nos
> desapegos. Proposta apresentada e autorizada: escopo **todos os catálogos**; painel lateral no computador e folha
> no celular; campos de imóvel no **padrão de mercado** (a definição dos campos ficou com a implementação); tudo
> no #88.

- [x] Motor único e declarativo: grupos (múltipla escolha, mínimo, faixa, teto, bandeira, "todas as marcadas",
      única), contagem por opção calculada com os outros filtros aplicados, etiquetas dos filtros ativos com ✕,
      "Limpar tudo", ordenar e contagem de resultados numa região viva.
- [x] Painel lateral fixo no computador; no celular, botão "Filtros (n)" que abre uma folha com "Ver N resultados".
- [x] Imóveis: tipo, quartos, banheiros, vagas, área, aluguel, condomínio (teto e incluso), bairro, mobiliado,
      aceita pet, comodidades (todas as marcadas), garantia aceita (qualquer uma), disponível quando eu chegar.
- [x] Serviços: tipo em dois níveis (categoria e especialidade), região atendida, recomendado pela comunidade,
      mínimo de contratações, "a partir de" (teto), atende sábado. Ordem padrão continua sendo a evidência; ordenar
      por preço é escolha da pessoa e nunca compra posição.
- [x] Desapegos: categoria e subcategoria, preço, condição, janela de retirada, bairro.
- [x] Eventos: categoria, quando, período do dia, gratuito, bom para crianças, comunidade.
- [x] Benefícios: categoria, como resgatar, validade, ainda não resgatados.
- [x] Referências: assunto, situação da revisão, comunidade, mínimo de relatos, salvas.
- [x] Dados fictícios ampliados o bastante para as combinações darem resultado.
- [x] **O anúncio obedece aos mesmos filtros**; filtrar ou ordenar nunca reordena nem esconde o rótulo da faixa paga.
- [x] Os formulários de anunciar (imóvel, desapego, serviço, evento) pedem os campos novos; o que a pessoa publica
      aparece nos filtros.
- [x] Sem resultado: a tela diz qual filtro remover e quantos resultados voltam.

**Prova:** P48 a P54, guiadas pelos dados (o conjunto esperado sai de um cálculo sobre `DB`, escrito na sonda de
forma independente do motor, e não de números fixos): imóveis (P48), serviços (P49), desapegos (P50), eventos,
benefícios e referências (P51), sem resultado, ✕ e Limpar tudo (P52), publicar e depois filtrar (P53), painel no
computador e folha no celular (P54). A contagem de cada opção é comparada com o resultado real ao escolhê-la, o
anúncio é conferido contra o filtro e contra a faixa própria, e ordenar por preço não move o anúncio. P35 passou a
conferir os campos novos dos formulários. Mutantes M27 a M37 e M41 a M46: anúncio que fura o filtro, "Limpar tudo" que não
limpa, ordenação de preço invertida, contagem de opção errada, mínimo que vira igual, especialidade que não zera ao
trocar o tipo, comodidades do anúncio publicado perdidas, sem-resultado sem sugestão, "Ver N" que não acompanha,
bairros que viram "todos ao mesmo tempo" e comodidades que viram "qualquer uma", faixa etária que aparece sem o
assunto escola, fim de semana sem o limite de 14 dias, "vencem em breve" que inclui quem ainda tem prazo, "só as
que salvei" que ignora o que foi salvo "disponível quando eu chegar" que aceita qualquer data e sugestão de vários valores que tira só um deles.

## Como rodar

```sh
node docs/design/prototype-v35/verify.mjs
node docs/design/prototype-v35/mutate.mjs
```

## Evidência de execução

Arquivos testados (SHA-256, primeiros 16 caracteres): `Bivaque_v35.html` `8abeb267c0a76dd9`, `verify.mjs` `e8d8bfbe7ce76057`, `mutate.mjs` `f727401ed8f4475a`.
Data: 29/09/2026. Chromium do Playwright. A evidência é amarrada ao conteúdo dos arquivos, e não a um commit,
porque um commit não pode conter o próprio hash. Confira com `sha256sum`.

**Quem verificou:** o próprio implementador. Não é revisão independente nem verificação de runtime independente
(seção 14 do processo de construção). As camadas independentes que existem são a CI do PR, o revisor automático do
PR e a revisão do dono. O revisor automático já apontou achados neste PR, em duas rodadas (abaixo), todos tratados.

`node docs/design/prototype-v35/verify.mjs` (movimento reduzido, o padrão), saída 0 (títulos cortados em 118 caracteres):

```
PASS P01@1440     anúncio nunca aparece na zona orgânica do Resolver (5 buscas + 4 extras, 3 focos)
PASS P01@390      anúncio nunca aparece na zona orgânica do Resolver (5 buscas + 4 extras, 3 focos)
PASS P02@1440     catálogos: anúncio só na faixa rotulada; selo e evidência iguais; sem estrelas
PASS P02@390      catálogos: anúncio só na faixa rotulada; selo e evidência iguais; sem estrelas
PASS P03@1440     ficha do prestador: resultado, recência e vínculo (contratou × mencionou); zero e poucos relatos
PASS P03@390      ficha do prestador: resultado, recência e vínculo (contratou × mencionou); zero e poucos relatos
PASS P03b@1440    selo 'Recomendado' só com maioria de contratações bem-sucedidas; quem só ouviu falar não conta como 
PASS P03b@390     selo 'Recomendado' só com maioria de contratações bem-sucedidas; quem só ouviu falar não conta como 
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
PASS P16@1440     perguntar exige entrar (com consentimento), editar, ver prévia e confirmar; nada por efeito colatera
PASS P16@390      perguntar exige entrar (com consentimento), editar, ver prévia e confirmar; nada por efeito colatera
PASS P17@1440     regra de ingresso aplicada (transição elegível × pedido) e leitura bloqueada a quem não é membro
PASS P17@390      regra de ingresso aplicada (transição elegível × pedido) e leitura bloqueada a quem não é membro
PASS P18@1440     fechar necessidade com nome de criança não deixa o nome em nenhuma tela pública; prestador não vem p
PASS P18@390      fechar necessidade com nome de criança não deixa o nome em nenhuma tela pública; prestador não vem p
PASS P19@1440     pergunta parecida oferece a existente antes de publicar (dedupe)
PASS P19@390      pergunta parecida oferece a existente antes de publicar (dedupe)
PASS P20@1440     consentimento só pelos temas aceitos; 'pedir ajuda' deixa rastro ligado à necessidade e aceite chega
PASS P20@390      consentimento só pelos temas aceitos; 'pedir ajuda' deixa rastro ligado à necessidade e aceite chega
PASS P21@1440     referência com curador nomeado; evidência compartilhada aciona revisão; resposta que ajudou conta
PASS P21@390      referência com curador nomeado; evidência compartilhada aciona revisão; resposta que ajudou conta
PASS P22@1440     salvos, presença, resposta e mensagem persistem depois de recarregar
PASS P22@390      salvos, presença, resposta e mensagem persistem depois de recarregar
PASS P23@1440     notificações só existem com o estado que as gera; 'Amanhã' só com presença; badge = não lidas
PASS P23@390      notificações só existem com o estado que as gera; 'Amanhã' só com presença; badge = não lidas
PASS P24@1440     avanço de tempo gera novidade causal: desapego na janela, resposta à sua pergunta, proposta ao seu p
PASS P24@390      avanço de tempo gera novidade causal: desapego na janela, resposta à sua pergunta, proposta ao seu p
PASS P35@1440     Editar preserva todos os campos e o publicado é exatamente a prévia (imóvel, serviço, evento, desape
PASS P35@390      Editar preserva todos os campos e o publicado é exatamente a prévia (imóvel, serviço, evento, desape
PASS P25@1440     texto com apóstrofo ou HTML não quebra nem executa
PASS P25@390      texto com apóstrofo ou HTML não quebra nem executa
PASS P26@1440     gaveta é diálogo: foco entra e fica, Esc fecha e devolve o foco, Voltar fecha antes de sair da págin
PASS P26@390      gaveta é diálogo: foco entra e fica, Esc fecha e devolve o foco, Voltar fecha antes de sair da págin
PASS P27@1440+390 todo controle com data-act produz efeito, nas páginas e nas gavetas (1440 e 390)
PASS P34@1440     nenhuma fonte, script ou folha de estilo de terceiro é pedida; Public Sans auto-hospedada carrega
PASS P34@390      nenhuma fonte, script ou folha de estilo de terceiro é pedida; Public Sans auto-hospedada carrega
PASS P28@1440     campos com rótulo, botões com nome, imagens com alt, um item ativo por navegação
PASS P28@390      campos com rótulo, botões com nome, imagens com alt, um item ativo por navegação
PASS P29@1440+390 alvos de toque ≥ 44px nos controles (1440 e 390)
PASS P30@1440     contraste de texto ≥ 4,5:1 (fora de imagens)
PASS P30@390      contraste de texto ≥ 4,5:1 (fora de imagens)
PASS P31@1440+390 390px: sem rolagem horizontal, Contribuir na barra superior e sem botão flutuante, entradas para tod
PASS P32@1440     sem texto de bastidor; 'por que apareceu' no máximo uma vez por card e nunca em anúncio
PASS P32@390      sem texto de bastidor; 'por que apareceu' no máximo uma vez por card e nunca em anúncio
PASS P33@1440     estados: zero, um e muitos; vencido; sem resposta; resolvido; interessado; salvo
PASS P33@390      estados: zero, um e muitos; vencido; sem resposta; resolvido; interessado; salvo
PASS P36@1440     ícones são SVG do sprite (nenhum símbolo Unicode em texto além de → de rota, $, + e as setas de tecl
PASS P36@390      ícones são SVG do sprite (nenhum símbolo Unicode em texto além de → de rota, $, + e as setas de tecl
PASS P37@1440     paleta de comandos: abre, filtra, setas movem a seleção, Enter navega e foca a tela, Esc e Ctrl+K fe
PASS P37@390      paleta de comandos: abre, filtra, setas movem a seleção, Enter navega e foca a tela, Esc e Ctrl+K fe
PASS P38@1440     atalhos: g + letra navega, / abre a paleta, ? abre o quadro; nada dispara dentro de campo de texto n
PASS P38@390      atalhos: g + letra navega, / abre a paleta, ? abre o quadro; nada dispara dentro de campo de texto n
PASS P39@1440     trilha nas telas de segundo nível volta ao pai; título e anúncio acompanham a página
PASS P39@390      trilha nas telas de segundo nível volta ao pai; título e anúncio acompanham a página
PASS P40@1440     janela: clique no fundo fecha, selecionar texto e soltar fora não fecha, rolagem do fundo trava; no 
PASS P40@390      janela: clique no fundo fecha, selecionar texto e soltar fora não fecha, rolagem do fundo trava; no 
PASS P41@1440     com preferência normal a troca de tela e a janela animam; com movimento reduzido nenhuma passa de 1 
PASS P41@390      com preferência normal a troca de tela e a janela animam; com movimento reduzido nenhuma passa de 1 
PASS P42@1440     botão ⋯: abre com foco no 1º item, setas/Home/End/letra movem, Esc devolve o foco ao botão, Tab fech
PASS P42@390      botão ⋯: abre com foco no 1º item, setas/Home/End/letra movem, Esc devolve o foco ao botão, Tab fech
PASS P43@1440     varredura: cada item de cada menu (15 tipos de terceiros e 4 de anúncio próprio) faz efeito; botão ⋯
PASS P43@390      varredura: cada item de cada menu (15 tipos de terceiros e 4 de anúncio próprio) faz efeito; botão ⋯
PASS P44@1440     ocultar, denunciar, arquivar, silenciar e dispensar mudam o estado de verdade, têm 'Desfazer' e fica
PASS P44@390      ocultar, denunciar, arquivar, silenciar e dispensar mudam o estado de verdade, têm 'Desfazer' e fica
PASS P45@1440     portas alternativas: clique direito e tecla de menu abrem o mesmo menu; toque longo abre a folha sem
PASS P45@390      portas alternativas: clique direito e tecla de menu abrem o mesmo menu; toque longo abre a folha sem
PASS P46@1440     validação inline: erro junto do campo (aria-invalid + aria-describedby), foco no primeiro, nada é en
PASS P46@390      validação inline: erro junto do campo (aria-invalid + aria-describedby), foco no primeiro, nada é en
PASS P47@1440     ligar conversa a uma necessidade: sem nenhuma necessidade ativa o formulário abre com uma opção marc
PASS P47@390      ligar conversa a uma necessidade: sem nenhuma necessidade ativa o formulário abre com uma opção marc
PASS P48@1440     imóveis: cada combinação mostra exatamente o conjunto calculado sobre os dados; a contagem de cada o
PASS P48@390      imóveis: cada combinação mostra exatamente o conjunto calculado sobre os dados; a contagem de cada o
PASS P49@1440     serviços: tipo em dois níveis (trocar a categoria limpa a especialidade), região, recomendado, contr
PASS P49@390      serviços: tipo em dois níveis (trocar a categoria limpa a especialidade), região, recomendado, contr
PASS P50@1440     desapegos: categoria e tipo de item, preço, condição, retirada e bairro batem com os dados; ordenar 
PASS P50@390      desapegos: categoria e tipo de item, preço, condição, retirada e bairro batem com os dados; ordenar 
PASS P51@1440     eventos, benefícios e referências: categoria, quando, período, gratuito, crianças, como resgatar, va
PASS P51@390      eventos, benefícios e referências: categoria, quando, período, gratuito, crianças, como resgatar, va
PASS P52@1440     sem resultado: diz qual filtro tirar e quantos voltam (o número é o que aparece ao tirar); Limpar tu
PASS P52@390      sem resultado: diz qual filtro tirar e quantos voltam (o número é o que aparece ao tirar); Limpar tu
PASS P53@1440     o que a pessoa anuncia aparece nos filtros (imóvel, desapego, evento) e o serviço só depois de aprov
PASS P53@390      o que a pessoa anuncia aparece nos filtros (imóvel, desapego, evento) e o serviço só depois de aprov
PASS P54@1440     computador: painel fixo e sem botão Filtros; celular: sem painel, botão Filtros (n) abre folha com f
PASS P54@390      computador: painel fixo e sem botão Filtros; celular: sem painel, botão Filtros (n) abre folha com f

107/107 verificações passaram (55 sondas; a maioria roda em 1440 e em 390 px)
```

`MOTION=normal node docs/design/prototype-v35/verify.mjs` (animação e transição ligadas), saída 0: as mesmas
107 linhas `PASS`, nenhuma `FAIL`, e a mesma linha final `107/107 verific`.

`node docs/design/prototype-v35/mutate.mjs`, saída 0 (46 quebras, 46 detectadas por asserção, cada sonda-alvo com corrida de controle limpa):

```
DETECTADA      M1 anúncio entra no orgânico → FAIL P01@1440     anúncio nunca aparece na zona orgânica do Resolver (5 
DETECTADA      M2 busca cria necessidade → FAIL P06@1440     as 5 buscas do roteiro criam 0 necessidades; 'Acompanhar'
DETECTADA      M3 orçamento ancora na mudança → FAIL P07@1440     orçamento pelo catálogo não toca na necessidade de m
DETECTADA      M4 evidência guarda texto livre → FAIL P18@1440     fechar necessidade com nome de criança não deixa o 
DETECTADA      M5 entra na comunidade sem confirmar → FAIL P16@1440     perguntar exige entrar (com consentimento), ed
DETECTADA      M6 gaveta sem role=dialog → FAIL P26@1440     gaveta é diálogo: foco entra e fica, Esc fecha e devolve 
DETECTADA      M8 o tempo passa e o pedido não recebe proposta → FAIL P24@1440     avanço de tempo gera novidade causa
DETECTADA      M9 Editar descarta o que a pessoa preencheu → FAIL P35@1440     Editar preserva todos os campos e o pub
DETECTADA      M10 atalho dispara dentro de campo de texto → FAIL P38@1440     atalhos: g + letra navega, / abre a pal
DETECTADA      M11 selecionar texto e soltar fora fecha a janela → FAIL P40@1440     janela: clique no fundo fecha, se
DETECTADA      M12 anúncio ganha 'por que apareceu' no menu → FAIL P43@1440     varredura: cada item de cada menu (15 
DETECTADA      M13 ocultar não oculta → FAIL P44@1440     ocultar, denunciar, arquivar, silenciar e dispensar mudam o 
DETECTADA      M14 Desfazer do salvamento não desfaz → FAIL P44@1440     ocultar, denunciar, arquivar, silenciar e dis
DETECTADA      M15 validação inline desligada → FAIL P46@1440     validação inline: erro junto do campo (aria-invalid 
DETECTADA      M16 botão ⋯ escondido → FAIL P43@1440     varredura: cada item de cada menu (15 tipos de terceiros e 4 
DETECTADA      M17 clique direito não abre o menu → FAIL P43@1440     varredura: cada item de cada menu (15 tipos de t
DETECTADA      M18 ligar conversa sem necessidade estoura → FAIL P47@1440     ligar conversa a uma necessidade: sem ne
DETECTADA      M19 símbolo Unicode volta como ícone → FAIL P36@1440     ícones são SVG do sprite (nenhum símbolo Unico
DETECTADA      M20 texto cru na tela (template dentro de aspas simples) → FAIL P36@1440     ícones são SVG do sprite (
DETECTADA      M21 Enter na paleta não navega → FAIL P37@1440     paleta de comandos: abre, filtra, setas movem a sele
DETECTADA      M22 título da página não acompanha a tela → FAIL P39@1440     trilha nas telas de segundo nível volta a
DETECTADA      M23 movimento reduzido ignorado → FAIL P41@1440     com preferência normal a troca de tela e a janela a
DETECTADA      M24 Esc não devolve o foco ao botão ⋯ → FAIL P42@1440     botão ⋯: abre com foco no 1º item, setas/Home
DETECTADA      M25 toque longo também abre o cartão → FAIL P45@1440     portas alternativas: clique direito e tecla de
DETECTADA      M26 anúncio próprio oferece o menu de terceiros → FAIL P43@1440     varredura: cada item de cada menu (
DETECTADA      M27 anúncio fura o filtro → FAIL P48@1440     imóveis: cada combinação mostra exatamente o conjunto cal
DETECTADA      M28 Limpar tudo não limpa os filtros → FAIL P48@1440     imóveis: cada combinação mostra exatamente o c
DETECTADA      M29 ordenar por menor preço sai invertido → FAIL P49@1440     serviços: tipo em dois níveis (trocar a c
DETECTADA      M30 contagem da opção não bate com o resultado → FAIL P48@1440     imóveis: cada combinação mostra exat
DETECTADA      M31 mínimo de quartos vira quantidade exata → FAIL P48@1440     imóveis: cada combinação mostra exatame
DETECTADA      M32 trocar o tipo de serviço não limpa a especialidade → FAIL P49@1440     serviços: tipo em dois nívei
DETECTADA      M33 comodidades do anúncio publicado se perdem → FAIL P53@1440     o que a pessoa anuncia aparece nos f
DETECTADA      M34 sem resultado não sugere o que tirar → FAIL P52@1440     sem resultado: diz qual filtro tirar e qua
DETECTADA      M35 folha do celular não atualiza 'Ver N' → FAIL P54@390      computador: painel fixo e sem botão Filtr
DETECTADA      M36 bairros escolhidos viram 'todos ao mesmo tempo' → FAIL P50@1440     desapegos: categoria e tipo de 
DETECTADA      M37 comodidades 'todas as marcadas' viram 'qualquer uma' → FAIL P48@1440     imóveis: cada combinação m
DETECTADA      M38 alvo de toque menor que 44 px → FAIL P29@1440+390 alvos de toque ≥ 44px nos controles (1440 e 390) 
DETECTADA      M39 texto sem contraste suficiente → FAIL P30@1440     contraste de texto ≥ 4,5:1 (fora de imagens)  → 
DETECTADA      M40 texto menor que 12 px → FAIL P36@1440     ícones são SVG do sprite (nenhum símbolo Unicode em texto
DETECTADA      M41 faixa etária aparece sem escolher o assunto escola → FAIL P51@1440     eventos, benefícios e referê
DETECTADA      M42 fim de semana ignora o limite de 14 dias → FAIL P51@1440     eventos, benefícios e referências: cat
DETECTADA      M43 vencem em breve passa a incluir os que ainda têm prazo → FAIL P51@1440     eventos, benefícios e re
DETECTADA      M44 'Só as que salvei' ignora o que foi salvo → FAIL P51@1440     eventos, benefícios e referências: ca
DETECTADA      M45 'disponível quando eu chegar' aceita qualquer data → FAIL P48@1440     imóveis: cada combinação mos
DETECTADA      M46 sugestão de vários valores tira só um valor, mas promete o grupo inteiro → FAIL P52@1440     sem re
DETECTADA      M7 data exata de terceiros → FAIL P15@1440     nenhuma data exata de terceiros em tela; Desapegos inver
todas as mutações detectadas
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
- **A suíte rodava só com movimento reduzido**, o que podia esconder defeitos que só existem com movimento ligado
  (foi assim que o atraso do menu passou). Agora `MOTION=normal` roda a mesma suíte com animação e transição, as
  duas passam, e o README diz qual modo é o padrão e por quê.
- **O README dizia que três sondas herdadas mudaram; eram oito** (P03, P03b, P07, P13, P27, P29, P31, P32). A
  lista exata está no README.
- **A P36 não pegava o `❯`** (categoria Unicode "Pe", fora da lista de símbolos). A regex passou a cobrir os
  colchetes ornamentais, o mutante M19 reintroduz o glifo e é detectado.

Da revisão do PR, segunda rodada:

- **A contagem de mutantes do v34 estava certa em 9, e não 8** (o `grep` do revisor ignorava o M6, escrito numa linha
  só que começa com `[`). Conferir: `grep -o '"M[0-9]* ' docs/design/prototype-v34/mutate.mjs | sort -u` lista M1 a M9.
  A parte que procede era a cobertura: das 12 sondas novas só 6 tinham mutante. Agora as 19 sondas novas têm, e as regras 4 e 5 também (M23, M38, M39, M40).
- **`mutate.mjs` aceitava qualquer FAIL da sonda-alvo, inclusive o de página quebrada.** Passou a exigir falha de
  asserção. Isso revelou que M9, M15, M28, M31 e M33 eram "detectados" só porque a sonda estourava tempo ou a página
  dava erro: P35 e P46 e as sondas de filtro foram reescritas para falhar por asserção, e há `guard()` para que um
  passo travado depois do primeiro erro entre no relatório.
- **Os menus de anúncio próprio nunca eram abertos por sonda** (lista diferente: "Encerrar anúncio", sem Ocultar
  nem Denunciar). P43 ganhou 4 casos (imóvel, desapego, evento e pergunta próprios) e o mutante M26.

Achados por mim ao revisar o próprio diff:

- **"A que mais ajudou" aparecia como `${ic("check")}` cru na tela de pergunta resolvida** (aspas simples no lugar de
  crase, herança da troca do glifo por ícone). Nenhuma sonda enxergava. P36 agora varre texto cru (`${`, `[object`,
  `undefined`, `NaN`) inclusive nessa tela; mutante M20.
- **Ao trocar o tipo de serviço, a opção ficava desabilitada por causa da especialidade já marcada** (o grupo pai
  era contado com o filho aplicado). A contagem de um grupo agora ignora os grupos que dependem dele.
- **P05 achava o cartão do prestador por um trecho de texto** ("Manutenção") que as especialidades novas também
  contêm; passou a achar pelo título.

Da revisão do PR, terceira rodada:

- **O título da P51 prometia mais do que o corpo media** (revisão, comunidade e salvas em Referências; comunidade em
  Eventos; "ainda não resgatei" em Benefícios; banheiros, área, bairro, condomínio incluso e "disponível quando eu
  chegar" em Imóveis não eram acionados por nenhuma sonda). P48 e P51 passaram a acionar todos, e a situação da
  revisão é conferida contra o selo que cada cartão mostra, sem depender da regra do motor.
- **A P51 não tinha mutante** (18 das 19 sondas novas, e não 19, como o texto dizia). M41 a M44 cobrem a P51 e M45 cobre
  o "disponível quando eu chegar" da P48.
- **`mutate.mjs` não fazia corrida de controle.** Agora cada sonda-alvo roda uma vez sem mutação e, se já falha, o
  mutante sai como INCONCLUSIVO e o script reprova.
- **A âncora de datas das sondas de filtro duplicava a do HTML** (`BASE_TODAY` × `BASE_DAY`). O HTML passou a expor
  `today()` em `window.__bv` e a sonda lê de lá.
- **"Só as que salvei" ficava desabilitada depois de salvar por fora do painel** (a contagem só se refazia ao
  renderizar). Achado ao estender a P51 no computador (na folha do celular passava): salvar por coração ou menu agora
  atualiza o painel, e recarrega a lista quando o filtro está ativo.
- README: reposta a ressalva do autoteste (`?selftest=1` não conta como evidência), a nota de que nada disso roda no
  CI do PR e a de que os tokens do protótipo não estão em `packages/tokens`.

Da revisão do PR, quarta rodada:

- **A sugestão do "sem resultado" prometia a contagem do grupo inteiro, mas o clique tirava só um valor** (Bairro
  "Águas Claras" + "Noroeste": o botão dizia "Tirar Bairro: Águas Claras (N imóveis)" e o clique deixava "Noroeste"
  ligado, então a tela podia seguir vazia). A sugestão agora tira o grupo inteiro e o texto junta os valores ("Bairro:
  Águas Claras, Noroeste"). A P52 ganhou o cenário com dois bairros e uma faixa de área que esvazia a lista; mutante M46.
- **O mutante era medido numa página diferente da do controle.** `mutate.mjs` gravava a cópia mutada numa pasta
  temporária, onde a Public Sans (caminho relativo `../../../apps/web/app/fonts`) não carrega. Conferido: no arquivo
  copiado para `/tmp`, P29, P30 e P36 seguem verdes (os mutantes M38 a M40 não dependiam da fonte) e só a P34, que
  mede o carregamento da fonte, cai. Mesmo assim a cópia passou a ficar ao lado do original (`.mut.html`, ignorada
  pelo git e apagada ao fim), para controle e mutante serem a mesma página.
- **Um `.mut.html` esquecido por uma execução interrompida derrubaria o `pnpm lint`** (o Biome não lê o `.gitignore`).
  Reproduzido com um arquivo de teste (lint saía 1). Agora `biome.json` exclui `.mut.html`, e o `mutate.mjs` apaga a
  cópia ao sair, ao receber SIGINT ou SIGTERM (depois que a sonda em andamento termina, porque `spawnSync` bloqueia o
  laço de eventos) e ao começar, se sobrou uma de uma execução que morreu.
- **O classificador de falha de asserção cortava em qualquer `→`, e os títulos de P05 e P36 têm uma seta própria**:
  numa exceção da P36 o corte caía dentro do título, o resto não começava com "exceção:" e a página quebrada passava
  por asserção. O corte agora é no separador exato do detalhe (`"  → "`, dois espaços), conferido com cinco linhas de
  exemplo (exceção e asserção, com e sem seta no título). Os 46 seguem detectados: os mutantes da P36 falham por asserção.
- **`FLOCAL` era código morto** (declarado e nunca lido) e o comentário de `catPage` prometia um reset só dos grupos
  locais, quando trocar de lado zera todos os filtros (é o que a P54 mede). Removido, e o comentário passou a dizer o
  que o código faz.

## O que continua sem prova

Ver o README: só Chromium; sem aparelhos reais nem leitor de tela; polimento não é validação; teste com pessoas é
do dono; fronteiras R3 seguem pedindo ADR.
