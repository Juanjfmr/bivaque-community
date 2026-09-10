# Leitura das pranchas web restantes — 09/09/2026

Este documento existe porque a entrega anterior escreveu "segue a composição da prancha X"
em contratos **sem abrir a imagem**. O resultado está registrado no
[handoff de 09/09](HANDOFF-2026-09-09-fidelidade-pranchas.md): o artigo do Guia virou um
diretório porque o contrato foi escrito lendo o esquema da tabela em vez do desenho.

Cada seção abaixo foi escrita **olhando o PNG**. É o inventário contra o qual a tela entregue
é comparada — a auditoria de `scripts/visual/loop.mjs` mede alvo de toque, contraste,
transbordo e hierarquia, e **não** mede fidelidade. Fidelidade se mede aqui.

## Como usar

1. O contrato do lote cita a seção desta página **e** o PNG. Os dois, sempre.
2. Antes de implementar: abrir o PNG. Se o executor não consegue ver imagem, ele usa esta
   leitura — e diz no relatório que usou a leitura, não a imagem.
3. Ao fechar o lote: capturar a rota nos três viewports e percorrer a lista de **Composição**
   item a item. Cada item ausente é uma divergência que precisa de correção ou justificativa.
4. Divergência da prancha só é aceita quando (a) uma autoridade posterior a supera — os casos
   estão nomeados em **Conflitos** — ou (b) é polimento melhor que a referência. Regra do dono,
   textual: *"Se precisa defender um polimento, ele já está errado."*
5. Falta de coluna no banco **não** autoriza omitir elemento da prancha. Regra do dono:
   *"Omitir é honesto; implementar exigia migration — não é honesto, devemos construir o
   backend junto das telas."* A migration entra no mesmo lote.

## Elementos comuns a todas as telas de membro

Lidos nas pranchas 13, 15, 17, 19, 21, 25, 45, 56, 60, 61, 62, 63, 64, 65 e 67 — é o mesmo
shell em todas.

**Barra lateral**, de cima para baixo:

- wordmark `BIVAQUE` em verde escuro, caixa alta;
- navegação primária: Início, Explorar, Comunidades, Perfil — ícone + rótulo, item ativo com
  fundo verde-claro e cantos arredondados;
- separador;
- seção secundária: Salvos (ícone de marcador), Notificações (ícone de sino, com ponto verde
  quando há não lida);
- **"Minhas comunidades"** com miniatura em imagem, nome e cidade de cada comunidade
  (pranchas 13, 15, 17, 19, 21) — ausente nas pranchas de fluxo curto (25, 45, 60, 61, 62);
- rodapé fixo: avatar + nome da pessoa + chevron, e abaixo Configurações com engrenagem.

**Cabeçalho**, da esquerda para a direita:

- **campo de busca "Buscar no Bivaque"**, largo, com ícone de lupa — é o elemento mais
  proeminente do cabeçalho em **todas** as pranchas de membro;
- seletor de cidade com ícone de pino: `Brasília, DF ⌄`;
- sino de notificações;
- avatar + chevron.

Não existe em nenhuma prancha: botão "Publicar" no cabeçalho, ícone de lâmpada, navegação
primária acesa em rota secundária.

---

## 36-web-auth-entrada — `/login` e `/signup`

**Etapa:** W01. **Painéis:** entrar (esquerda), criar conta (direita).

### Composição

Layout de duas colunas dentro de uma janela de navegador. À esquerda, **imagem fotográfica
sangrando até as bordas** (pessoas sentadas num gramado, parque arborizado) com o wordmark
`BIVAQUE` em branco sobreposto no alto. À direita, painel branco com o formulário centrado
verticalmente, alinhado à esquerda:

**Entrar** — título em duas linhas "Que bom ter você / de volta."; rótulo `E-mail`; campo com
`ana@exemplo.invalid`; botão primário verde-escuro de largura total; separador horizontal com
a palavra `ou` centrada; botão secundário de largura total com o logotipo do Google e
"Continuar com Google"; rodapé com dois links nas extremidades: `Criar conta` à esquerda e
`Preciso de ajuda` à direita.

**Criar conta** — título "Vamos começar."; `Nome completo` com `Ana Ribeiro`; `E-mail`;
**checkbox verde marcado** com "Li e aceito os Termos de uso e o Código de convivência" (os
dois com link); link `Política de Privacidade` numa linha própria abaixo; botão primário
"Criar conta"; link centrado "Já tenho conta".

### Conflitos com autoridade posterior — resolvem contra a prancha

1. **A prancha não tem campo de senha, e o botão diz "Receber código".**
   [`ADR-20260907-login-com-senha`](../decisions/ADR-20260907-login-com-senha.md) está
   `approved` e a §4.1 R02 da especificação é explícita: e-mail e senha, com mostrar/ocultar.
   A `reviewNote` do manifesto ("manter o fluxo de autenticação por e-mail") é anterior ao ADR
   e **não** o supera — a ordem de autoridade da §1 da especificação põe ADR acima do manifesto.
   **Implementar:** `E-mail`, `Senha` com mostrar/ocultar, botão primário **"Entrar"**,
   `Esqueci minha senha`, Google, `Criar conta`.
2. **Cadastro precisa de senha também** (R03), no mesmo lugar visual do campo que a prancha
   não desenhou.
3. `Nome completo` → a `reviewNote` diz que nome de apresentação não exige nome civil completo.
   Rótulo: **`Nome de apresentação`**.

### Preservar da prancha

A composição: imagem sangrada à esquerda com wordmark sobreposto, formulário à direita,
hierarquia dos títulos, o separador `ou`, o botão do Google secundário, os links de rodapé,
o aceite explícito com links legais no cadastro.

### Backend

Nenhum novo. Auth existente, aceite versionado existente (`consent_acceptances`).

---

## 37-web-auth-confirmacao — `/auth/confirmar-email` e recuperação

**Etapa:** W01. **Painéis:** confirmação pendente; código expirado.

### Composição

Fundo cinza-claro. Coluna estreita à esquerda com o wordmark `BIVAQUE` em verde e, abaixo,
"Conecte-se com / sua comunidade." Ao centro, **cartão branco** com borda sutil e canto
arredondado, conteúdo centrado:

- círculo verde-claro com ícone de envelope;
- título `Confira seu e-mail`;
- duas linhas: "Enviamos um código de verificação para" e o endereço em negrito;
- **seis caixas de dígito** (a primeira com cursor) — ver Conflitos;
- link `Alterar e-mail`;
- botão primário de largura total `Confirmar`, **desabilitado** enquanto o código está incompleto;
- rodapé "Reenviar em 00:28" — contador regressivo.

**Código expirado** — mesmo cartão, com alerta laranja de largura total ("Este código expirou.")
no lugar das caixas, botão primário `Enviar novo código` e link `Preciso de ajuda`.

### Conflitos com autoridade posterior — resolvem contra a prancha

**As seis caixas de dígito não existem no produto.** R04 da especificação: *"Esta tela não
recebe código fictício: login continua por senha."* O mecanismo é link de confirmação por
e-mail, tratado no callback.

**Implementar, no lugar das caixas:** a confirmação de que o e-mail foi enviado, com o
endereço, e a orientação de abrir o link. Preservar tudo o mais do cartão: envelope, título,
`Alterar e-mail`, **reenvio com contador regressivo e limite do servidor**, e o estado
expirado com o mesmo alerta laranja e `Enviar novo código`.

Não expor o endereço em query string nem em log.

### Backend

Nenhum novo. O reenvio precisa do limite real do servidor — o contador não pode ser só visual.

---

## 38-web-auth-admissao — `/onboarding` e `/onboarding/status`

**Etapa:** W01. **Painéis:** verificar acesso; identidade em análise.

### Composição

Duas colunas. À esquerda, wordmark e **cartão "Seu progresso"** com três passos verticais:
`E-mail` (círculo verde com ✓, "Concluído"), `Seu acesso` (círculo verde com "2",
"Em andamento"), `Cidade` (círculo cinza com "3", "Próximo passo").

À direita, conteúdo:

- H1 `Verificar meu acesso`; linha de apoio "Vamos conferir seu acesso à comunidade.";
- subtítulo `Como você deseja verificar seu acesso?`;
- **quatro rádios**: "Sou militar das Forças Armadas" (marcado), "Sou veterano",
  "Sou pensionista", "Recebi um convite familiar";
- rótulo `Digite seu CPF` com campo vazio;
- texto de apoio "A verificação por CPF é praticamente instantânea.";
- botão primário `Verificar acesso`, **desabilitado com campo vazio**;
- rodapé "Se não conseguirmos confirmar, você poderá enviar sua identidade."

**Identidade em análise** — mesmo cartão de progresso; H1 "Estamos analisando sua identidade";
duas linhas de apoio; cartão com ícone de pessoa e "Identidade em análise"; botão primário
`Atualizar situação`; botão secundário `Sair`.

### Correções obrigatórias

`reviewNote`: o CPF é o caminho rápido, a espera exibida é a da identidade, e **estado só
avança depois de confirmação real** — nada de progresso animado sem resposta do servidor.

Nunca persistir CPF cru, payload do Portal, OM inferida, posto ou endereço.

### Backend

Existe: `/api/onboarding`, `/api/onboarding/status`, `private.verification_outcomes`.
Confirmar que `Atualizar situação` lê estado real e que `pending` não é apresentado como recusa.

---

## 69-web-identidade-recuperacao — `/onboarding/documento`

**Etapa:** W01. **Painéis:** enviar identidade; arquivo ilegível.

### Composição

Coluna esquerda com wordmark e **stepper vertical com linha ligando os três pontos**
(E-mail ✓ Concluído / Seu acesso ● Em andamento / Cidade ○ Próximo passo) — variação do
cartão da prancha 38, mesmo conteúdo.

**Enviar identidade** — H1; "Não conseguimos confirmar pelo CPF. / Envie sua identidade para
continuar."; parágrafo sobre o reconhecimento por IA poder demorar; **área de upload com borda**
contendo ícone de documento, rótulo "Identidade militar digital" e botão secundário
`Escolher arquivo`; linha com ícone (i): "Envie o documento completo em um único arquivo.";
botão primário `Enviar para análise` **desabilitado sem arquivo**; link `Voltar à verificação`.

**Precisamos de outro arquivo** — H1; alerta laranja "Não foi possível ler o documento enviado.";
cartão com miniatura de documento, "Identidade militar digital", **"Arquivo não legível" em
laranja** e botão `Substituir arquivo`; linha (i) "Selecione novamente o arquivo completo.";
botão primário `Reenviar para análise` desabilitado; link `Voltar`; rodapé "Após o reenvio,
acompanhe a análise por aqui."

### Correções obrigatórias

`reviewNote`, e é decisão de produto registrada: **um único arquivo completo**. Não pedir
frente e verso, não pedir fotografia do documento digital, não dividir em anexos. Na falha de
leitura, **substituir o arquivo inteiro**. Formatos e limites vêm do contrato técnico.
Manter contraste legível no botão desabilitado.

### Backend

Bucket privado `verification-documents` e `private.verification_documents` existem. Falta
comprovar: submissão versionada, invalidação do resultado do arquivo anterior no reenvio,
limpeza de órfão em upload interrompido, e o job de reconhecimento —
**`BLOCK-LEGAL-AI` mantém a parte de IA aberta**; armazenamento, versionamento e situação são
implementáveis agora.

---

## 39-web-onboarding-contexto — `/onboarding/locality` e `/onboarding/perfil`

**Etapa:** W01/W02. **Painéis:** escolher cidade; personalização.

### Composição

Coluna esquerda: wordmark e **stepper vertical de três passos com linha**: `1 Cidade`,
`2 Perfil`, `3 Concluir`.

**Cidade** — H1 "Qual cidade você quer explorar?"; apoio "Encontre comunidades, eventos e
serviços na sua região."; campo de busca com lupa `Buscar cidade`; **lista de cartões
selecionáveis**, cada um com ícone de prédio, nome da cidade em negrito e UF abaixo; o
selecionado tem fundo verde-claro, borda verde e rádio preenchido à direita; botão primário
`Continuar` alinhado à direita.

**Perfil** — H1 "Deixe com a sua cara."; duas linhas de apoio, a segunda "Você decide o que
compartilhar. Pode alterar depois."; **duas colunas de formulário**:

- esquerda: `Foto (opcional)` com avatar circular e botão secundário `Adicionar foto`;
  `Nome` preenchido; `Interesses (opcional)` como **chips com ícone** (Mudança, Educação,
  Cultura, Esportes) e apoio "Selecione um ou mais temas que te interessam.";
- direita: `Força Armada (opcional)` em select `Selecionar`, e abaixo a linha
  **`Exibir no perfil` com switch DESLIGADO**; `OM (opcional)` em campo de texto com
  placeholder "Organização Militar", e abaixo outra linha `Exibir no perfil` **desligada**;

rodapé: botão primário `Concluir` e link `Pular por enquanto` ao lado.

### Correções obrigatórias

`reviewNote`: Força Armada e OM são **autodeclarados, opcionais e separados da verificação**,
com controles individuais desligados na origem. Selecionar cidade **não** concede participação
privada. `Concluir` não exige adesão a comunidade.

### Backend

`profile_affiliations` (campo/valor/`is_visible`) já sustenta Força e OM —
[`ADR-20260908`](../decisions/ADR-20260908-perfil-campos-opcionais.md) aprovado.
`profiles` **não tem `bio`**; a bio aparece na prancha 51 e entra pelo
[ADR de bio](../decisions/ADR-20260909-perfil-bio.md). Interesses têm `user_group_interests`.
Foto usa o bucket `avatars`.

---

## 61-web-explorar-servicos — `/explorar` e busca de serviços

**Etapa:** W02/W06. **Painéis:** Explorar; resultados de serviços.

### Composição

**Explorar** — H1 com a cidade em verde: "Explorar **Brasília, DF**"; apoio "Encontre guias,
serviços, comércios, moradia e eventos na sua cidade."; subtítulo `Do que você precisa?`;
**cinco cartões em linha**, cada um com ícone circular verde, título (Guia, Mercado, Serviços,
Moradia, Eventos), duas linhas de descrição e **seta →** no rodapé do cartão; seção
`Conteúdos em destaque` com link `Ver mais` e três cartões com imagem, **etiqueta de tipo**
(GUIA DA CIDADE, BAIRROS, EVENTOS), título de duas linhas, resumo e rodapé
"Bivaque Editorial · 24 de abr"; à direita, coluna `Profissionais em destaque` com link
`Ver todos` e fichas com foto, nome, ocupação, bairro e linha de atendimento.

**Resultados de serviços** — seta de voltar + H1 `Resultados para "eletricista"`; **linha de
filtros**: select `Bairro` ("Todos os bairros"), select `Tipo de serviço` ("Todos os tipos"),
botão secundário `Limpar filtros` à direita; contagem "2 resultados encontrados"; **cartões
horizontais** com foto larga à esquerda e, à direita, nome em destaque, ocupação, linha de
localização com pino, descrição em duas linhas e botão secundário `Ver ficha` alinhado à direita.

### Conflitos

A barra de endereço da prancha mostra `bivaque.com/explorar/servicos?search=eletricista`. A
rota real é `/explorar/servicos` (já existe) e o parâmetro canônico é **`q`** (§3.2 da
especificação); aceitar `search` como alias na borda. Cromo do navegador na imagem não é
contrato de URL.

### Backend

`provider_profiles`, `provider_reach`, `provider_catalog_items` existem. A **busca do
cabeçalho não tem rota** — entra neste lote como `/explorar/busca`.

---

## 62-web-prestador-pedido — `/prestadores/[id]` e `/pedidos/novo`

**Etapa:** W06. **Painéis:** ficha do prestador; descrever necessidade.

### Composição

**Ficha** — link `‹ Voltar à exploração`; duas colunas: à esquerda **foto retangular grande**;
à direita nome em H1, ocupação, linha com pino e cidade, parágrafo de descrição, subtítulo
`Serviços` com separador e **lista com ícone circular + rótulo** por serviço; abaixo, dois
botões lado a lado: primário `Pedir serviço` com ícone de balão e secundário
`Entrar em contato` com ícone de envelope.

**Novo pedido** — link `‹ Voltar ao perfil`; H1 "Do que você precisa?"; apoio "Conte para
**André Elétrica** o que você precisa. Ele receberá seu pedido e poderá responder."; formulário:
`Destinatário` **somente leitura** com o nome; `Descrição do que você precisa` em textarea com
**contador 34/500**; `Prazo ou horário desejado (opcional)` em select com ícone de calendário
("A combinar"); `Fotos (opcional)` em área tracejada com ícone de câmera, "Adicionar fotos" e
"JPG, PNG até 10MB cada"; botão primário de largura total `Enviar pedido` com ícone de avião.

À direita, **cartão "Resumo do pedido"** espelhando os campos: Destinatário, Descrição, Prazo
ou horário, Fotos ("Nenhuma foto adicionada").

### Correções obrigatórias

`reviewNote`: destinatário é somente leitura; limites de upload e canais de contato vêm dos
contratos reais, não do desenho. "Prazo desejado" é **quando**, nunca contato pessoal.
Não compartilhar telefone automaticamente.

### Backend

**Novo.** Pedido estruturado com destinatário fixo e conversa contextual — ver
[ADR de pedidos](../decisions/ADR-20260909-pedidos-e-conversa-contextual.md).

---

## 17-web-pedido-servico — `/pedidos` e `/pedidos/[id]`

**Etapa:** W06.

### Composição

Trilha `Mercado / Serviços / Meu pedido`; H1 com o título do pedido; **chip de situação
"Em aberto"** logo abaixo do título; botão primário `Encerrar pedido` alinhado à direita na
altura do título; linha de metadados com ícones: pino + bairro, calendário + "Nesta semana",
relógio + "Enviado em 6 set."

**Três colunas:**

1. **Respostas** — cabeçalho com o rótulo e a contagem "2 respostas"; itens com avatar do
   negócio, nome, horário, duas linhas de prévia; o selecionado com fundo cinza-claro; **ponto
   verde** no item não lido.
2. **Conversa** — cabeçalho com avatar, nome do negócio e chip "Pedido de manutenção"; balões
   alternados com avatar, nome ("Carlos Ribeiro (você)"), data e hora, corpo em até três linhas;
   composição no rodapé com campo "Escreva uma mensagem" e botão `Enviar`; duas linhas de aviso
   abaixo: "Mantenha a conversa no contexto do pedido." e "Evite enviar contatos pessoais ou
   solicitar pagamentos antecipados."
3. **Rail direito** — cartão `Sobre o serviço solicitado` com quatro linhas de ícone + valor
   (bairro, quando, categoria, descrição) e botão secundário de largura total `Editar pedido`;
   cartão `Público deste pedido` com ícone (i) no título, linha "Prestadores de assistência
   técnica em Brasília" e **faixa verde-clara** com escudo: "Valores e pagamento são combinados
   entre vocês." + "O Bivaque não participa da negociação nem realiza pagamentos."

### Backend

**Novo**, mesmo ADR do 62. `dm_conversations`/`dm_messages` são a base de mensagem; o **estado
do pedido não pode ser derivado de uma conversa solta** (§4.6 da especificação).

---

## 23-web-meu-negocio — `/prestador` e subrotas

**Etapa:** W06.

### Composição

**Shell diferente do de membro.** Barra lateral com wordmark; rótulo de seção `MEU NEGÓCIO`;
**cartão do negócio** com ícone, nome ("Clima Certo"), categoria ("Assistência técnica") e
chevron; navegação: `Pedidos` (ativo), `Minha ficha`, `Catálogo`, `Área de atendimento`,
`Conta`; separador; `Salvos`; `Notificações` com ponto verde; rodapé com avatar + nome +
chevron e `Configurações`.

Cabeçalho: campo de busca **"Buscar nos pedidos"** (não "Buscar no Bivaque"), sino, avatar +
chevron. **Sem seletor de cidade.**

Conteúdo: H1 "Pedidos para você"; apoio "Organize as conversas e mantenha sua ficha atualizada.";
**abas com contagem**: `Novos (2)` (ativa, sublinhado verde), `Em conversa (1)`, `Encerrados`;
**tabela** com colunas Cliente (avatar + nome), Serviço solicitado (duas linhas), Região,
**Quando**, Recebido ("há 20min") e botão primário `Responder` por linha.

Abaixo, **cartão do pedido selecionado**: avatar grande, nome, "Asa Norte · Brasília, DF",
"Nesta semana", "Recebido há 20min" à direita; título do pedido; corpo em duas linhas; **chip
de categoria com ícone**; botão primário `Ver conversa`.

Rail direito: **imagem de capa do negócio**; cartão com ícone, nome, categoria, linha
"Atende Brasília" e botão secundário de largura total `Ver minha ficha`; cartão
`Complete sua ficha` com apoio, **faixa de pendência** (ícone de relógio, "Falta informar seus
horários", botão `Editar ficha`) e checklist com ✓ verde: Descrição do negócio, Serviços
cadastrados, Regiões de atendimento, Fotos do negócio — todos "Informado" — e
`Formas de contato` com relógio e "Adicione telefone e WhatsApp".

### Correções obrigatórias

`reviewNote`, e são três: a coluna desenhada como **"Contato" chama-se "Quando"** (contém
"Nesta semana" e "A combinar"); a pessoa conectada no painel é **a responsável pelo negócio**,
não o cliente; **exibir telefone continua opcional** e não pode ser condição de ficha completa —
a completude é calculada sobre campos reais.

### Backend

Ficha e catálogo existem. Faltam: fila de pedidos por situação, transição transacional na
primeira resposta, `/prestador/atendimento` e `/prestador/conta`.

---

## 13-web-mercado — `/mercado`

**Etapa:** W07.

### Composição

Trilha `Explorar / Mercado`; H1 "O que você precisa pode estar por perto"; apoio "Produtos e
serviços de quem faz parte da sua região."; à direita, botão secundário `Meus anúncios` e
botão primário `+ Anunciar`; **abas Guia | Mercado** (Mercado ativa, sublinhado verde).

**Coluna de filtros à esquerda**, em cartão: título `Filtros`; `Categoria` com checkboxes
(Casa e móveis, Eletrônicos, Esporte, Infantil); `Estado` com Novo e Usado; `Região` em select;
`Preço (R$)` com dois campos `De` e `Até`; link `Limpar filtros`.

**Área de resultados:** segmentado `Produtos | Serviços`; linha com "Produtos em Brasília" e
seletor de ordenação `Mais recentes ⌄` à direita; **grade de três colunas** de cartões com
imagem, **botão de salvar (marcador) no canto superior direito da imagem**, título, preço em
verde e destaque, linha de rodapé com pino + bairro à esquerda e tempo relativo à direita.

Rodapé da lista: linha centrada com ícone "Procurando um profissional? **Ver serviços ›**".

### Correções obrigatórias

`reviewNote`: **desmarcar o filtro "Casa e móveis"** na referência — a grade mostra categorias
variadas e o filtro marcado contradiz o resultado. Filtro limpo não permanece selecionado sobre
resultados incompatíveis.

### Backend

**Novo.** Não existe tabela de anúncio. Ver
[ADR de anúncios](../decisions/ADR-20260909-anuncios-mercado-e-moradia.md).

---

## 63-web-mercado-anuncio — `/mercado/[id]` e `/mercado/novo`

**Etapa:** W07.

### Composição

**Detalhe** — link `← Voltar para resultados`; trilha `Explorar › Casa e móveis › Mesas`; duas
colunas: à esquerda **imagem grande** e abaixo **fita de três miniaturas**; à direita título em
H1, **preço grande em verde** (`R$650`), linha de condição ("Usado em bom estado"), linha com
pino e cidade, separador, subtítulo `Descrição` com duas linhas de texto, separador, bloco do
anunciante com avatar, nome, "Membro da comunidade" e o nome da comunidade; botão primário
largo `Tenho interesse` e, ao lado, **botão quadrado de salvar** com ícone de marcador.

**Novo anúncio** — link `← Voltar`; H1 `Novo anúncio`; duas colunas:

- esquerda: `Título do anúncio`; `Categoria` (select) e `Preço (R$)` lado a lado; `Condição`
  (select); `Descrição` (textarea de duas linhas); **`Público permitido`** com um chip
  removível da comunidade e apoio "Seu anúncio será visível apenas para membros desta
  comunidade.";
- direita: `Fotos do anúncio` com apoio "Adicione fotos reais do item."; **grade 3×2** de
  espaços — os preenchidos com miniatura e botão ✕ no canto, os vazios tracejados com ícone de
  câmera e "Adicionar foto"; apoio "Você pode adicionar até 6 fotos.";

rodapé alinhado à direita: botão secundário `Salvar rascunho` e primário `Publicar anúncio`.

### Conflitos

A barra de endereço mostra `/explorar/anuncios/10543` e `/anuncios/novo`. As rotas do catálogo
(§4.7 R48–R50) são `/mercado/[id]` e `/mercado/novo`, e a especificação é autoridade acima do
manifesto para contrato de rota. Manter o desenho, usar as rotas do catálogo.

A prancha 56 desenha a mesma tela com `Enviar mensagem` no lugar de `Tenho interesse` e uma
tabela `Detalhes` (Condição, Material, Descrição). **A 63 é a canônica** para o CTA — R49 diz
"Tenho interesse". A tabela `Detalhes` da 56 é acréscimo aceitável quando houver campo real.

### Backend

**Novo**, e o público por comunidade é parte do contrato de escrita, não enfeite.

---

## 21-web-meus-anuncios e 64-web-mercado-edicao — `/meus-anuncios` e edição

**Etapa:** W07.

### Composição — prancha 21 (canônica para a lista)

Trilha `Explorar › Mercado`; H1 `Meus anúncios`; botão primário `+ Anunciar` à direita;
**abas com contagem**: `Ativos (2)`, `Reservados (1)`, `Encerrados (3)`; campo de busca
"Buscar nos meus anúncios"; **tabela** com colunas Item (miniatura + título + "Anúncio publicado
em 12 de set."), Preço, Público (nome da comunidade), Retirada ("Até 20 out", "A combinar") e
Ações — botão `Editar` e botão `⋯` que abre menu com **`Marcar como reservado`,
`Marcar como vendido`, `Pausar anúncio`**.

Rail direito: cartão `Prévia do anúncio selecionado` com imagem, **chip verde `Ativo`**, título,
preço, linha de bairro e cidade, descrição, e três linhas de ícone + valor (Público,
Disponível até, Retirada) e botão secundário `Ver anúncio`.

Rodapé: faixa com (i) "Encerre o anúncio quando o item não estiver mais disponível."

### Composição — prancha 64

**Editar anúncio** — trilha `Meus anúncios › Editar anúncio`; **alerta vermelho** "Não foi
possível salvar. Suas alterações continuam aqui."; duas colunas: à esquerda `Foto do anúncio`
com imagem e botão secundário `Alterar foto`; à direita `Título`, `Preço` com prefixo `R$`,
`Descrição` (três linhas) e **`Comunidade (não é possível alterar)`** em campo desabilitado;
rodapé com `Cancelar` e primário `Salvar alterações`.

**Pausar** — a lista em variação mais simples (Anúncio, Preço, Status com chip `Ativo`,
Publicado em, Ações com `Mais ⌄`) e paginação "1–1 de 1"; sobre ela, **diálogo** com ícone de
pausa em círculo, "Pausar este anúncio?", "Ele deixará de aparecer nas buscas enquanto estiver
pausado." e botões `Pausar anúncio` (primário) e `Cancelar`.

### Conflito entre as duas pranchas

São duas variações da mesma lista. **A 21 é a canônica** — tem as três abas de situação, a
prévia e as ações completas. Da 64 vêm o **diálogo de pausa**, o alerta de falha ao salvar que
preserva o texto, e o campo de comunidade travado na edição.

### Backend

Situações do anúncio: `rascunho → ativo ↔ pausado`, mais `reservado`, `vendido` e `encerrado`.
As duas últimas vêm da prancha 21 e **não** estavam na §6 da especificação — entram no ADR.

---

## 65-web-imoveis-alertas — `/imoveis` e `/imoveis/alertas`

**Etapa:** W07.

### Composição

**Explorar moradia** — H1; apoio "Encontre apartamentos para alugar em Brasília, DF";
**linha de filtros em pílulas**: chip de local com pino e ✕ ("Águas Claras"), select `Aluguel`,
select `Até R$2500`, select `2 quartos`, botão `Filtros` com ícone; linha com "128 resultados"
à esquerda e, à direita, `Salvar busca` (ícone de marcador) e `Criar alerta` (ícone de sino);
**grade de três colunas** com imagem, **ícone de coração no canto superior direito**, preço
"R$ 2.300 **/ mês**", linha "Condomínio: R$ 520 / mês", linha de bairro e cidade, e rodapé com
três especificações com ícone: quartos, vaga, m².

**Meus alertas** — H1; apoio "Acompanhe e gerencie seus alertas de busca"; **cartão de alerta**
com ícone de sino em círculo, título ("Apartamentos em Águas Claras"), linha de critérios
separada por pontos ("Aluguel · Até R$2500 · 2 quartos"), linha "Ativo · Criado em 20/05/2024",
**switch verde ligado** à direita, e ações `Editar` (ícone de lápis) e `Excluir` (ícone de
lixeira, em vermelho).

**Painel lateral `Editar alerta`** com ✕ no topo; selects `Cidade`, `Bairro`, `Valor máximo`,
`Quartos`; botão primário de largura total `Salvar alterações` e link `Cancelar`.

### Correções obrigatórias

`reviewNote`: **rotular "Aluguel máximo"** quando o filtro não inclui condomínio — valor total
e aluguel são coisas diferentes e a tela não pode confundi-los. Valores e contagens da imagem
são ilustrativos.

**Polimento decidido:** o coração de salvar contradiz o marcador usado em Mercado, Guia e
Salvos. Usar o **marcador**, um único vocabulário de salvar no produto.

### Backend

**Novo**: anúncio de moradia com custos separados, e assinatura de alerta com job de entrega,
deduplicação por alerta/anúncio e respeito às preferências. Sem job e retorno reais, o alerta
não está concluído.

---

## 19-web-imoveis — `/imoveis/[id]`

**Etapa:** W07.

### Composição

Trilha `Mercado / Imóveis / Apartamento de 2 quartos`; H1 "Apartamento de 2 quartos em Águas
Claras"; linha "Brasília, DF"; à direita, botões secundários `Salvar` (marcador) e
`Compartilhar`.

**Galeria**: imagem grande à esquerda e duas menores empilhadas à direita, a inferior com o
botão sobreposto `Ver 6 fotos`.

Abaixo, **faixa de três especificações** em cartão: 62 m² "Área privativa", 2 quartos "1 suíte",
1 vaga "Garagem" — cada uma com ícone.

Seções: `Sobre o imóvel` com dois parágrafos; `Disponível a partir de` com ícone de calendário
e "Outubro"; `Comodidades do condomínio` com quatro itens com ícone (Piscina, Academia, Salão
de festas, Portaria 24h).

Faixa clicável no rodapé: ícone de sino, "Criar alerta para imóveis parecidos" e
"Receba notificações quando novos imóveis atenderem ao que você busca", com chevron.

**Rail direito**: cartão de custos com **preço grande** "R$ 2.200/mês" e três linhas
rótulo/valor: Aluguel R$ 2.200, Condomínio (aprox.) R$ 350, IPTU (aprox.) "Consultar anunciante";
bloco `Anunciante` com avatar e nome; botão primário de largura total `Tenho interesse`.

### Correções obrigatórias — a prancha tem invenções que precisam sair

`reviewNote`, e cada item é uma promessa que o produto não cumpre:

- **remover "Responde em até 2h"** — prazo de resposta inventado;
- **remover "Membro desde 2023"** — tempo de associação;
- **remover "Seu contato será compartilhado apenas se você demonstrar interesse"** — promessa de
  compartilhamento automático de contato;
- **remover a faixa "Para sua segurança, toda conversa e combinação de visita acontecem dentro
  do Bivaque"** — promessa de comunicação obrigatoriamente interna;
- **remover o cartão "Lembre-se"** inteiro — avisos redundantes;
- manter `Tenho interesse` e o resumo de custos;
- **não somar custo desconhecido como zero**: "Consultar anunciante" é um estado, não R$ 0,00.

As fotos da referência são variações ilustrativas, não uma coleção coerente do mesmo imóvel.

---

## 67-web-evento-informacoes — `/events/[id]/perguntas`

**Etapa:** W04. **Painéis:** falha de envio com texto preservado; pergunta enviada e respondida.

### Composição

Trilha `Eventos / Café entre vizinhos`.

**Pedir mais informações** — H1; **cartão do evento** com duas linhas de ícone: calendário +
"12 set · 9h · Jardim das Acácias", e pessoa + "Organizado por **Mariana Santos**" (o nome é
link); **alerta laranja** "Não foi possível enviar. Seu texto foi mantido."; rótulo
`Sua pergunta` com textarea **contendo o texto preservado**; botões `Tentar novamente`
(primário) e `Voltar ao evento` (secundário).

**Sua pergunta** — mesmo cartão de evento; **balão verde-claro** do autor com iniciais,
nome, horário e corpo; abaixo, linha `✓ Enviada`; **balão cinza** da organizadora com iniciais,
nome, horário e corpo; campo `Responder sobre este evento` com botão `Enviar`
**desabilitado enquanto vazio**; botão secundário de largura total `Voltar ao evento`.

**Rail direito** nos dois painéis: imagem do evento; avatar circular; texto "Sua pergunta será
enviada à organizadora deste evento."

### Correções obrigatórias

`reviewNote`: **usar o wordmark canônico** — esta prancha desenhou um símbolo de árvore que não
existe no produto. E **garantir contraste do botão desabilitado**.

Da especificação (R34): não exigir RSVP para perguntar, não prometer prazo de resposta,
destinatário derivado do evento, terceiro não lê a conversa.

### Backend

**Novo**: pergunta vinculada ao evento, com participantes derivados do evento. Reaproveita o
contrato de conversa contextual do ADR de pedidos.

---

## 25-web-guia-referencia — `/guide/[id]` e `/guide/[id]/correcao`

**Etapa:** W05. **Estado atual: a tela entregue diverge da prancha** — o handoff de 09/09
registra que o contrato foi escrito lendo o esquema da tabela.

### Composição

Trilha `Explorar / Guia / Mudança`; **H1 editorial em duas linhas**; **subtítulo** ("Um roteiro
para preparar a saída e a chegada"); linha de metadados "Revisado em 6 set 2026 · Curadoria
Bivaque" com, à direita, botão secundário `Salvar` com ícone de marcador; **imagem de capa
larga**; e então o **corpo do artigo em seções**, cada uma com título de seção e um parágrafo
de texto corrido: "Antes de contratar", "Prepare a retirada", "Ao chegar" — e, pela lista de
índice, também "Documentos e cadastros", "Checklist rápido" e "Dúvidas frequentes".

**Rail direito**, três cartões:

1. **`Neste guia`** — índice das seções, com o item ativo em fundo verde-claro;
2. **`Origem desta referência`** — miniatura da comunidade, "Conversa de Jardim das Acácias",
   linha "Você participa desta comunidade" e botão secundário `Ver conversa`;
3. **`Algo mudou?`** — apoio "Conte para a comunidade se alguma informação não estiver mais
   correta ou se você tiver uma sugestão para melhorar este guia." e botão primário de largura
   total `Sugerir atualização`.

### O que a tela entregue não tem

Corpo em seções, subtítulo, imagem, índice "Neste guia" e a ligação de origem — `source_reply_id`
existe em `arrival_guide_entries` **e a tela não usa**.

### Backend

`arrival_guide_entries` guarda apenas nome, descrição, telefone e site. Falta artigo estruturado.
Ver [ADR do Guia](../decisions/ADR-20260909-guia-artigo-estruturado.md).

---

## 45-web-publicacao e 60-web-estados — composição de pergunta

**Etapa:** W03. Entram aqui porque a comparação prancha a prancha **nunca foi feita** (handoff
de 09/09: quatro pranchas pendentes — 45, 15, 56 e 60).

### Composição — prancha 45

**Nova pergunta** — seta de voltar + H1; linha do autor com avatar e nome; **`Quem pode ver?`**
com dois rádios, cada um em duas linhas: "Toda a cidade · Brasília, DF" / "Membros do Bivaque
nesta cidade" (marcado), e "Jardim das Acácias" / "Membros desta comunidade"; `Qual é a sua
pergunta?` em campo de uma linha; `Conte mais sobre sua dúvida (opcional)` em textarea;
`Adicionar foto (opcional)` em área tracejada com ícone, "Clique para adicionar uma foto" e
"PNG, JPG até 10MB"; botão primário `Publicar` alinhado à direita; **linha de rodapé em verde**
"Visível para membros do Bivaque em Brasília."

**Rail direito `Como sua publicação será vista`** — prévia viva: cartão do público com ícone e
duas linhas, autor com avatar e "Agora mesmo", título e corpo da pergunta, e a mesma linha de
visibilidade em verde no rodapé.

**Editar publicação** — H1; **alerta laranja** "Não foi possível salvar. Seu texto continua
aqui."; `Para qual comunidade você está perguntando?` em **campo travado com ícone de cadeado**
mostrando a comunidade, com apoio "Você não pode alterar a comunidade desta publicação."; os
mesmos campos; botão `Salvar alterações`; e o **diálogo `Sair sem salvar?`** com "Se sair agora,
as alterações feitas não serão salvas.", botão primário **`Continuar editando`** e botão de
perigo **`Descartar alterações`** — nessa ordem, a ação segura primeiro.

### Composição — prancha 60

Mesma composição, em outro estado, e traz três coisas que a 45 não desenha:

- **seletor de público como pílula no alto à direita** (`Toda a cidade · Brasília, DF ⌄`) —
  variação; a 45 é a canônica, com os rádios;
- **contadores de caractere**: `64/120` no título e `200/1000` no corpo;
- **faixa "Sem conexão"** amarela com "Tente publicar quando a conexão voltar." e botão
  `Tentar novamente` desabilitado, e botão **`Salvar rascunho`** no rodapé.

O segundo painel da 60 é o **acesso indisponível**: ícone de cadeado em círculo verde-claro,
"Você ainda não tem acesso a esta comunidade.", duas linhas de apoio, botão primário
`Conhecer comunidade` e secundário `Voltar`. Distinto do erro de conexão — a distinção precisa
estar visível para quem está na tela.

### Backend

`recommendation_requests` / `recommendation_replies` já sustentam pergunta, resolução e
resposta. Rascunho local não pode guardar CPF, senha, token ou documento.

---

## 15-web-conversa — `/publicacoes/[id]`

**Etapa:** W03. Comparação pendente.

### Composição

Trilha `Comunidades / Jardim das Acácias / Conversa`; H1 com o título da pergunta; linha do
autor com avatar, nome, "há 2 h · Jardim das Acácias" e, à direita, **chip
`✓ Resolvida pela autora`** e menu `⋯`; **linha de escopo** com ícone: "Esta conversa é para
membros de Jardim das Acácias."; corpo em dois parágrafos.

Seção de respostas: "6 respostas" à esquerda e ordenação `Mais recentes ⌄` à direita.
Cada resposta é um cartão com avatar, nome, tempo, corpo, e rodapé com **`👍 12 curtidas`** à
esquerda e `Responder` à direita; a resposta destacada tem **barra verde à esquerda** e chip
`Ajudou a resolver`; **resposta aninhada** com fundo cinza-claro, recuada, com os mesmos
elementos.

Composição no rodapé: avatar + campo de texto; abaixo, linha com ícone "Esta resposta será
visível apenas para membros de Jardim das Acácias." e botão primário `Responder`.

**Rail direito**: cartão da comunidade com imagem, nome, "Brasília, DF · 1.285 membros",
descrição e link `Ver informações da comunidade ›`; cartão `Guardar para depois` com marcador e
apoio; cartão `Vai mudar de cidade?` com apoio, imagem e link `Ver guia de chegada ›`.

### Backend — conferido coluna a coluna em 09/09/2026

Dos três ornamentos da prancha, **só um tem dado por trás**:

- **`✓ Resolvida pela autora` tem backing.** `recommendation_requests` traz `is_resolved`,
  `resolved_at` e `resolved_by` — e `resolved_by` referencia `auth.users`, ou seja, guarda
  **quem** resolveu, não qual resposta resolveu.
- **`Ajudou a resolver` não tem backing.** Não existe coluna nem tabela marcando qual resposta
  ajudou. `recommendation_reply_promotions` **não é isso**: ela liga `reply_id` a
  `guide_entry_id`, que é a promoção de uma resposta para o Guia — o mecanismo por trás do
  cartão "Origem desta referência" da prancha 25, outra coisa.
- **`👍 12 curtidas` não tem backing.** `post_reactions` é `(post_id, user_id)`, do feed de
  `posts`. A conversa da prancha 15 é `recommendation_requests`/`recommendation_replies`, e
  resposta de recomendação não tem reação nenhuma. As colunas de `recommendation_replies` são
  `id, request_id, author_id, body, created_at, is_deleted` — mais nada.

Uma revisão anterior desta página afirmava que os três tinham suporte no banco. Não tinham; a
afirmação veio de reconhecer nomes de tabela, que é o erro que esta página existe para evitar.

**Consequência:** exibir curtidas e "Ajudou a resolver" exige duas estruturas novas e uma
decisão de produto — está na lista do fim desta página.

---

## 56-web-confianca — denúncia e bloqueios

**Etapa:** W03/W08. Comparação pendente.

### Composição

**Denunciar publicação** — **diálogo** sobre a tela de origem, com ✕ no canto: título;
pergunta "Por que você está denunciando esta publicação?"; **lista fechada de rádios**: Spam,
Conteúdo inadequado, Informação enganosa, Outro; `Explique (opcional)` em textarea com
**contador 41/300**; botões `Cancelar` (secundário) e `Enviar denúncia` (primário).

**Confiança e privacidade** — H1; **abas** `Minhas denúncias` (ativa) e `Pessoas bloqueadas`;
apoio "Acompanhe o andamento das denúncias que você enviou."; **cartão de denúncia** com
miniatura do alvo, título, linha de metadados, **chip âmbar `Em análise`** e chevron de
expandir; expandido, mostra `Motivo da denúncia` e `Sua explicação` em bloco verde-claro.

Abaixo, seção `Pessoas bloqueadas` com apoio "Gerencie as pessoas que você bloqueou." e linhas
com avatar, nome, "Bloqueado em 10/04/2025" e botão secundário `Desbloquear`.

### Consequência para a operação

A denúncia tem **motivo de lista fechada**. O handoff registra que `/reports` do operador usa
**texto livre** — divergência da prancha 58 e incoerente com esta. O mesmo vocabulário fechado
vale nas duas pontas.

### Backend

`reports` e `dm_blocks` existem. O retorno ao denunciante contém **só informação permitida** —
resultado interno não aparece para o alvo, identidade do denunciante não vaza.

---

## 43-web-comunidade-grupos — `/communities/[id]`

**Etapa:** W03. Lida aqui porque o contrato RECON-009 contradiz a prancha num ponto e a decisão
é do dono.

### Composição

**Comunidade de membro** — faixa de imagem larga no topo; **miniatura quadrada sobreposta** à
esquerda, sobre a borda inferior da faixa; nome em H1 e cidade abaixo; botão secundário `Sair`
alinhado à direita; abas `Conversas`, `Grupos` (ativa) e `Sobre`; seção `Grupos da comunidade`
com cartões de imagem, nome e "128 membros"; e o rail **`Sobre a comunidade`** com três linhas
de ícone e valor: `Membros 382`, `Criada em 15 de março de 2023`, `Local Brasília, DF`.

**Pedido pendente** — mesma faixa, miniatura, nome e cidade, **sem `Sair`, sem abas e sem
grupos**; no lugar do conteúdo, cartão centrado com ícone de avião de papel, `Pedido enviado`,
"Acompanhe a resposta por aqui." e botão secundário `Cancelar pedido`. **E o rail
`Sobre a comunidade` continua ali, com as mesmas três linhas** — inclusive `Membros 382`.

### A contradição, verificada na imagem

O contrato RECON-009 diz, textualmente, `no pedido pendente NAO aparece contagem de membros nem
data inventada` e proíbe `mostrar contagem de membros ou lista de participantes a quem nao e
membro aprovado`. A prancha mostra as duas coisas nesse exato estado. O implementador seguiu o
contrato — o loader nem carrega a contagem.

As duas leituras são defensáveis e a escolha é de produto, não de agente. Está na lista do fim
desta página.

---

## 51-web-perfil — `/profile` e `/profile/[userId]`

**Etapa:** W02. Lida aqui porque a apresentação curta e o rail de atalhos dependem dela.

### Composição

**Meu perfil** — cartão de topo com **avatar grande**, nome em H1, linha com pino e cidade, e a
**apresentação curta em três linhas**. À direita, rail com três atalhos, cada um em linha com
ícone, título e subtítulo e chevron: `Meus anúncios / Gerencie seus anúncios`,
`Meu negócio / Gerencie sua loja`, `Configurações / Gerencie sua conta`.

Abaixo, painel `Editar perfil`: `Nome`; **`Bio`** em textarea com **contador `146/300`** no canto
inferior direito; `Força Armada (opcional)` em select `Selecione`, com **`Exibir no perfil`** e o
interruptor rotulado `Desativado` ao lado; `OM (opcional)` com placeholder "Digite sua OM" e o
mesmo par de controle; botões `Salvar alterações` (primário) e `Cancelar`.

**Perfil de outra pessoa** — mesmo cartão de topo, sem apresentação editável, com menu `⋯` no
canto que abre `Denunciar perfil` e **`Bloquear usuário` em vermelho**; cartão
`Atividade recente` com autor, tempo, título da pergunta, corpo e localização; cartão
`Comunidade em comum` com miniatura, nome e chevron.

### Consequências

- O limite da apresentação curta é **300**, e é o número que o
  [ADR de bio](../decisions/ADR-20260909-perfil-bio.md) fixa no banco.
- O rail de atalhos leva a `/meus-anuncios` e `/prestador`, que só existem depois de RECON-024 e
  RECON-026 — até lá, a entrada aparece somente para quem tem a capacidade real.
- O perfil próprio **não** tem seção "Sua atividade": "Atividade recente" é do perfil alheio.

---

## 57-web-operacao-admissoes e 58-web-operacao-moderacao — o shell da operação

**Etapa:** W01 e W03. Lidas aqui porque o handoff registra regressões nas duas e o contrato de
reconciliação precisa de referência própria, não da leitura de outra sessão.

### Composição comum

**O cabeçalho do produto está presente nas duas pranchas** — campo "Buscar no Bivaque", seletor
de cidade, sino, e avatar com iniciais + nome + chevron. A barra lateral tem o wordmark, o
rótulo de seção `OPERAÇÃO` e navegação **vertical**: `Admissões`, `Denúncias`, `Comunidades`.

A saída fica no rodapé da barra lateral e **é diferente em cada prancha**: a 57 tem
`← Voltar ao Bivaque`; a 58 tem `Sair da operação` com ícone de saída. As duas precisam existir,
e o rodapé precisa ser o mesmo nas duas telas.

### 57 — fila e análise de admissão

Fila: H1 `Fila de admissões`, apoio, abas `Pendentes` e `Concluídas`, busca por nome ou e-mail
com botão de filtro, tabela `Nome | E-mail | Data da solicitação | Situação | Ações` com chip
âmbar e botão `Abrir`, rodapé "Mostrando 2 de 2 solicitações" e paginação.

Análise: `← Voltar para a fila`, H1 com o nome, número da solicitação, e-mail; cartão
`Resumo da verificação` com três linhas de estado (documento recebido, reconhecimento por IA,
revisão necessária); cartão `Próximo passo`; `Ações` com `Solicitar informação` (primário) e
`Concluir análise` (secundário); `Registro da análise` com `Observações (opcional)`; e o rail
`Linha do tempo` com os eventos datados.

### 58 — fila e decisão de denúncia

Fila: H1 `Fila de denúncias`, abas `Em análise` e `Concluídas` **com contagem em badge**;
filtros `Tipo`, `Motivo` e `Comunidade` mais `Limpar filtros`; tabela
`Conteúdo | Tipo | Motivo da denúncia | Status | Recebido em` com ordenação pela última coluna.
**Não existe chip vermelho de atraso** — o handoff registra um "+48h" na tela entregue que a
prancha não tem.

Decisão: `← Voltar para a fila`, H1 com o título do conteúdo, linha de metadados; cartão
`Conteúdo denunciado` com autor, data, comunidade e corpo; `Motivo da denúncia`; **faixa com
cadeado**: "A identidade de quem denunciou este conteúdo está protegida. Não é exibida ao autor
da publicação."; `Ações` como **dois cartões de rádio** — `Manter conteúdo` e `Ocultar conteúdo`,
cada um com a consequência escrita; `Justificativa da decisão` **obrigatória**; botão
`Confirmar decisão`; e o rail `Linha do tempo`.

### Conflitos

1. **A prancha 58 deixa "Manter conteúdo" pré-selecionado.** A §4.9 O04 é explícita: nenhum
   veredito pré-selecionado. **A especificação vence** — os dois cartões nascem sem escolha.
2. **Os dois lados da denúncia usam vocabulários diferentes.** A prancha 56, do membro, lista
   Spam, Conteúdo inadequado, Informação enganosa e Outro. A prancha 58, da operação, mostra
   Spam, Propaganda, Atividade suspeita e Informação incorreta. **É uma lista só**, e a
   reconciliação das duas entra no lote que tocar a operação — o operador pode ter filtros
   adicionais, não um vocabulário paralelo.
3. **O wordmark diverge entre pranchas.** A 51 desenha símbolo + `BIVAQUE`; a 61, a 13, a 15, a
   17 e a 21 desenham só `BIVAQUE`; a 67 inventa um símbolo de árvore que a `reviewNote` manda
   remover. **Nenhuma prancha web traz o descritivo "COMUNIDADES DO BRASIL".** Usar o wordmark
   canônico do sistema de design, o mesmo em todas as telas, e não inventar descritivo.

---

## Decisões do dono — tomadas em 09/09/2026

Não há decisão de produto pendente para as pranchas web. As duas que faltavam foram tomadas e
já estão nos contratos.

1. **O que quem tem pedido pendente enxerga da comunidade — a prancha 43 vence.** No estado de
   pedido enviado, o rail `Sobre a comunidade` aparece com `Membros`, `Criada em` e `Local`,
   todos de consulta real. A regra que o RECON-009 trazia — proibir a contagem para quem não é
   membro aprovado — foi escrita sem conferir a prancha e apertava mais do que a privacidade
   exige; ela foi revisada. **O que continua fechado é o roster:** lista de participantes,
   avatares e perfis. Implementação no RECON-033.
2. **Da prancha 15, só o marcador da resposta que resolveu entra.** Nenhuma das duas mecânicas
   tem lastro no banco hoje. O marcador entra pelo RECON-035, governado pelo
   [ADR da resposta que resolveu](../decisions/ADR-20260909-resposta-que-resolveu.md): uma
   coluna anulável ao lado de `resolved_by` e `resolved_at`, escrita só pela autora da pergunta.
   **As curtidas ficam fora**, e a divergência com a prancha fica declarada no relatório do
   RECON-033 — a mecânica traz perguntas próprias (quem reage, contagem pública, desfazer,
   notificação, moderação) que não estão decididas.

**Os sete ADRs técnicos de 09/09 foram aprovados** pelo dono nesse mesmo dia — mídia de membro,
anúncios, pedidos e conversa contextual, artigo do Guia, canais de notificação, bio do perfil e
a resposta que resolveu. Estão listados em [`RECON-WEB-EXECUCAO.md`](RECON-WEB-EXECUCAO.md), e
nenhum lote espera decisão técnica. Aprovação não é revisão: o diff que implementa cada decisão
continua exigindo revisor independente.
