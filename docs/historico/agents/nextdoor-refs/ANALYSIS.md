# Referências Nextdoor — Análise de UI

Screenshots de referência do app Nextdoor (via Mobbin) para o design do Bivaque.
`events1.webp` e `feed1.webp` foram analisadas anteriormente (detalhe de evento completo;
feed: layout, cards, tipografia, cores). As 7 abaixo foram analisadas com visão em 2026-08.

---

## events2.webp — Lista de Eventos

**Tipo:** Lista de eventos da comunidade.

**Layout:**
- Top bar com botão voltar, título central "Events" e ícone de criar/editar à direita.
- Barra de busca "Search events" (pill, fundo claro, lupa à esquerda).
- Chip de filtro "Your events" abaixo da busca.
- Lista vertical de cards de evento.

**Componentes:**
- **Event card:** header com ilustração line-art (casa, árvores, pessoas, bola, sorvete) sobre fundo cinza claro; abaixo: linha de data/hora ("Thursday, Jul 24 • 12:00 AM") em cinza, título do evento em bold truncado com reticências, endereço com ícone de pin em azul, linha de participação ("0 interested · 1 going") em cinza, e CTA largo "Interested?" (pill, azul-marinho sólido, texto branco).
- Segundo card com foto real (evento externo) — mesma estrutura.

**Cores:** fundo da tela branco/cinza muito claro; ilustração sobre `#F1F3F4`-ish; CTA azul-marinho (`#1E2A4A`-ish); texto secundário cinza; link de endereço azul.

**Tipografia:** título do evento bold ~16-17px; metadados regular ~13px cinza; botão medium ~15px branco.

**Espaçamento:** padding lateral ~16px; raio dos cards ~12-16px; CTA com margem interna 16px; gap entre cards ~16px.

---

## feed2.webp — Grupos + Posts (seções do feed)

**Tipo:** Feed com seção "Groups" no topo e "Posts" abaixo.

**Layout:**
- Top bar: voltar à esquerda; ícones de adicionar amigo e configurações à direita.
- Seção "Groups" (título bold à esquerda, "See all" à direita) com card branco contendo linhas de grupos.
- Seção "Posts" (título bold, "See activity" à direita) com cards de post empilhados.

**Componentes:**
- **Linha de grupo:** avatar/thumbnail circular à esquerda, nome do grupo em medium, contagem de membros em cinza abaixo ("223 members").
- **Post card:** header com avatar circular com inicial ("A"), nome do autor bold, meta "Lower Allston · 1h · 🌐" em cinza; corpo de texto ("The pasta is great!"); embed/link card de negócio com thumbnail circular, nome "Carlo's Cucina Italiana" + badge verde de avaliação (⭐ 72) e endereço em cinza; footer com ícones de ação: coração, comentário (círculos com outline) à esquerda; compartilhar e "..." à direita; linha "Post insights | View" com divisor superior.
- **Post com poll:** pergunta + opção selecionada "Morning" com fundo lavanda/azul claro e percentual à direita "60% (3)".

**Cores:** fundo da tela `#EEF0F3`-ish; cards brancos; ícones de ação outline escuros; opção de poll ativa com fundo `#E4E6F5`-ish; badge de rating verde.

**Tipografia:** nome do autor semibold ~15px; corpo ~15-16px regular; meta ~13px cinza; títulos de seção bold ~17-18px.

**Espaçamento:** cards com raio ~12px; padding interno 16px; gap entre cards ~12-16px; seções separadas por ~24px.

---

## feed3.webp — Feed com poll, evento e bottom nav

**Tipo:** Home feed (scroll) com navegação inferior.

**Layout:**
- Top bar: logo circular verde à esquerda, seletor de bairro "Lower Alliston ⌄", sino de notificações, ícone de chat e avatar à direita.
- Feed vertical de cards brancos sobre fundo cinza claro.
- Bottom nav flutuante em pill branco: Home (ativo, preenchido), Search, For Sale, Faves + FAB verde circular "Post" à direita, tudo dentro de uma barra arredondada flutuante.

**Componentes:**
- **Post com poll:** pergunta "What is the best time to water the lawn?" + 3 opções em retângulos outline empilhados (Morning / Afternoon / Night); footer de ações (coração, comentário, compartilhar, "...") e linha "Post insights | View".
- **Post com event card:** texto "Garage sale this weekend!" + card interno com bloco de data quadrado ("24 Jul"), título "Garage sale!", horário/endereço truncado ("12:00PM · 210-220…") e thumbnail da imagem à direita.
- **Bottom nav pill:** barra branca arredondada flutuando acima da borda inferior, com 4 itens + FAB verde.

**Cores:** FAB verde (`#00A850`-ish) com texto branco; item ativo da nav em azul-marinho/preto; fundo da tela cinza claro; cards brancos.

**Tipografia:** corpo ~15-16px; opções de poll ~15px regular em cards outline; labels da nav ~11px.

**Espaçamento:** gap entre cards ~16px; bottom nav com margem lateral ~16px e raio total (pill).

---

## groups1.webp — Descoberta de Grupos

**Tipo:** Busca/listagem de grupos próximos.

**Layout:**
- Top bar: voltar, título "Groups" central, ícone de criar à direita.
- Barra de busca "Search groups".
- Título de seção "Groups near you" bold.
- Lista vertical de cards de grupo (um por linha, sem card container externo — linhas sobre fundo branco).

**Componentes:**
- **Linha de grupo:** thumbnail quadrada arredondada à esquerda (ilustração ou foto), nome do grupo em semibold (até 2 linhas), contagem de membros em cinza abaixo, botão "Join" pill azul-marinho sólido alinhado à direita.

**Cores:** botão Join azul-marinho (`#1E2A4A`-ish) texto branco; fundo branco; thumbnails coloridas variadas.

**Tipografia:** nome do grupo semibold ~15-16px; membros ~13px cinza; botão ~14px medium.

**Espaçamento:** linhas com padding vertical ~12px; divisores sutis entre linhas; padding lateral 16px.

---

## recs1.webp — Onboarding de Recomendações

**Tipo:** Tela de onboarding "recomendações para começar".

**Layout:**
- Barra de progresso fina no topo (onboarding step).
- Título grande "Here are recommendations for you to get started." (2 linhas, bold).
- Seção "Get involved with your community": carrossel horizontal de cards de grupo.
- Seção "Stay up to date with local stories": carrossel horizontal de cards de veículos locais.
- CTA "Continue" largo verde na base (acima da home indicator).

**Componentes:**
- **Card de grupo (carrossel):** imagem circular no topo (ilustração/foto), nome do grupo centralizado (2 linhas, truncado), contagem de membros em cinza, botão "Join" pill outline cinza (ou "Joined" quando ativo).
- **Card de veículo:** logo quadrado (BOS, WCVB), nome, contagem de followers, botão "Follow" outline.
- **CTA base:** pill verde sólido, largura quase total, texto branco.

**Cores:** fundo branco; CTA verde (`#00A850`-ish); botões secundários outline com fundo cinza claro; texto cinza para contagens.

**Tipografia:** título bold ~22-24px; nomes ~14-15px medium; contagens ~13px cinza.

**Espaçamento:** cards do carrossel ~140-160px de largura, gap ~12px, padding lateral 16px; CTA com margem 16px.

---

## recs2.webp — "More local Faves" (tela clara sobre gradiente)

**Tipo:** Feature "Faves" (recomendações resumidas por IA) — tela de descoberta.

**Layout:**
- Fundo com foto/gradiente azul (céu + telhado) ocupando a tela.
- Título grande branco "More local Faves 🤍".
- Barra de pergunta pill branca "Who is good for home repairs?" com botão circular verde (seta) à direita.
- Card branco central "✨ Faves [Beta]" com ícone de editar no canto.

**Componentes:**
- **Faves card:** texto-resumo com links em negrito sublinhado (nomes de negócios); abaixo, carrossel horizontal: card de negócio (logo circular, nome, endereço, botão de save com contagem "37") e card de depoimento (avatar + nome "Olivia M", texto com nome do negócio em bold, reações "26 💬 5").
- Linha "Summarized from 92 neighbors. See sources." com avatares empilhados.
- Footer do card: like/dislike, compartilhar, botão escuro "Post to feed"; divisor; "Would you like to know more? ✨"; campo "Ask follow up" com botão verde circular.

**Cores:** gradiente azul de céu; card branco; botão "Post to feed" azul-marinho/preto; acentos verdes; links sublinhados.

**Tipografia:** título ~28-32px branco; corpo do resumo ~14-15px; nomes de negócio bold inline.

**Espaçamento:** card com raio ~16-20px, padding 16px; carrossel interno gap 12px.

---

## recs2 (dark) — Faves em modo escuro

**Tipo:** Hub "Faves" (dark mode) com coleções curadas por IA.

**Layout:**
- Fundo preto/quase preto; header "✨ Faves [Beta]" centralizado com ícone de editar à direita.
- Texto introdutório ("Discover local favorites… summarized by AI…").
- "Check out these Faves:" + lista vertical de cards de imagem full-width.
- Pergunta "What local Faves are you looking for? ✨".
- Seção "Ask your neighbors" com botão verde circular (seta) e nota "Summarized by AI from neighbor posts".
- Bottom nav pill escura: Home, Search, For Sale, Faves (ativo com coração branco).

**Componentes:**
- **Collection card:** imagem full-width com título branco por cima ("Must see local art galleries") e tag de categoria abaixo ("Hidden gems", "Things to do", "Local pros") em cinza claro; raio ~12-16px.
- **Bottom nav pill** escura flutuante, mesmos 4 itens da tela clara.

**Cores:** fundo `#0B0B0C`-ish; texto branco/cinza claro; FAB/botão de envio verde; imagens escuras com overlay.

**Tipografia:** título sobre imagem bold ~18-20px branco; tags ~12-13px; corpo ~14-15px cinza claro.

**Espaçamento:** gap entre collection cards ~12-16px; padding lateral 16px.

---

## Consolidado para o Bivaque

| Elemento | Padrão observado |
| :--- | :--- |
| Fundo da tela | cinza muito claro (claro) / `#0B0B0C` (dark) |
| Cards | brancos, raio 12-16px, padding 16px, sombra sutil ou separação por fundo |
| CTA primário | pill sólido: verde (`#00A850`-ish) p/ criação/continuar; azul-marinho (`#1E2A4A`-ish) p/ "Join"/"Interested?" |
| CTA secundário | pill outline / fundo cinza claro |
| Bottom nav | barra pill flutuante (clara ou escura), 4 itens + FAB verde "Post" |
| Top bar | seletor de localidade com chevron + sino + chat + avatar |
| Posts | avatar+nome+meta cinza; corpo; embed de negócio/evento/poll; footer coração/comentar/compartilhar + "..." |
| Polls | opções em retângulos outline; opção ativa com fundo lavanda e % à direita |
| Eventos | bloco de data quadrado + título + horário + thumbnail |
| Grupos | thumbnail + nome + membros + "Join" pill à direita |
| Tipografia | sans (system/Inter); títulos bold 17-24px; corpo 15-16px; meta 13px cinza |
| IA/Faves | resumos com "Summarized from N neighbors", links bold sublinhados, follow-up "Ask…" com botão verde |
