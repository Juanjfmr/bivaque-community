# Handoff — Régua Nextdoor e reconstrução das jornadas (01/11/2026)

Documento para a próxima sessão, local, no computador do dono. Ele explica o que foi feito na sessão
de nuvem de 01/11/2026, como **todas** as jornadas do Bivaque devem ser avaliadas daqui em diante, o
nível de crítica esperado, como sugerir, e por onde começar (F01). O anexo
[AVALIACAO-79-FLOWS.md](AVALIACAO-79-FLOWS.md) traz a avaliação flow por flow.

Nada aqui é decisão de produto aprovada. As propostas esperam a resposta do dono, item por item, no
artefato da régua. Decisões que mexem em autenticação, dados pessoais, RLS ou cobrança continuam
exigindo ADR (R3) antes de chegar ao banco.

---

## 1. Onde trabalhar

- **Base de código: branch `codex/app`**, não o main. O `apps/app` (React de página única, Vite,
  TanStack Router/Query, shadcn/ui) é o app logado, pelo
  `docs/decisions/ADR-20261024-front-react-spa.md` (aceito em 25/10). O `AGENTS.md` do main ainda
  descreve o porte com Material Web e proíbe shadcn; ele está desatualizado em relação à `codex/app`
  e só muda quando o dono integrar essa linha. **Leia o `AGENTS.md` da `codex/app`.**
- Trabalhe numa **worktree isolada** da `codex/app`. Merge, push para main e deploy são do dono.
- Este handoff está na branch `ccr-1118f580-uu222h` (que parte do main). Para usar na worktree:
  `git show origin/ccr-1118f580-uu222h:docs/agents/regua-nextdoor/HANDOFF.md`.
- Ferramentas que não funcionaram na nuvem e devem funcionar no computador: Docker/Supabase local,
  MCP do Supabase, codebase-memory, context7, 21st.dev, links do mobbin.com.

### Fontes de autoridade que a sessão de nuvem encontrou na `codex/app`

- `AGENTS.md` (nova navegação: Início · Comunidade · [Criar] · Mercado · Você; Conversas no topo).
- `docs/decisions/ADR-20261024-front-react-spa.md` — app, visual, navegação.
- `docs/decisions/ADR-20261024-redesenho-da-comunidade.md` — domínio de grupos, publicações,
  comentários, "Útil", ocultar. **Não prevê foto em publicação nem resposta encadeada.**
- `docs/agents/prototipo-shadcn/STATUS.md` — estado das entregas (ENT-001 a ENT-005 no F01).
- `docs/agents/prototipo-shadcn/21ST-TRIAGEM-2026-10-26.md` — componentes do 21st.dev triados.
- `docs/design/fluxos-2026-10-30/` — mapa F01–F10, direção de arte do F01, 28 referências do F01
  (desktop aprovado em 30/10; celular aguardando aceite), candidatos do 21st por flow.
- Brandbook: `docs/brand/` (Grafite `#253033`, Papel `#F2F0EB`, Brasa `#B84A3A`, Noto Serif/Sans).

---

## 2. O que a sessão de nuvem produziu

- **Artefato da régua (fonte viva):** https://claude.ai/artifact/MRGjLpXK2Pyf7L2sJkkort — os 79
  flows do Nextdoor no Mobbin, em 15 grupos, com avaliação, proposta e campos para o dono **aceitar
  ou rebater** cada item. As respostas ficam no banco do artefato, coleção `respostas`, documento
  `f-<8 primeiros caracteres do id do flow no Mobbin>`, com `decisao` (`aceito` | `rebatido`),
  `argumento`, `escolha` (nos itens "Decisão sua": `implementar` | `nao` | `depois`) e `avaliacao`.
  Leia com a ferramenta de dados do artefato antes de agir sobre qualquer item.
- **Anexo:** [AVALIACAO-79-FLOWS.md](AVALIACAO-79-FLOWS.md), gerado dos mesmos dados (versão 2).
- **Placar (versão 2):** 14 no nível · 29 abaixo da régua · 36 ausentes.
- A avaliação usou o **protótipo HTML R72** como lado Bivaque. Quando o flow já existir no
  `apps/app`, reavalie contra o `apps/app` (o F01 já está à frente do protótipo).

---

## 3. Como avaliar qualquer jornada (método)

### 3.1 A régua

1. **O Nextdoor é a régua**, não o Bivaque. O que o Nextdoor tem e o Bivaque não tem é **ausente**.
2. **Ter o recurso não basta.** Um flow só fica **no nível** se o Bivaque for **igual ou melhor** nas
   quatro dimensões. Perdeu em uma → **abaixo da régua**, mesmo que o recurso exista.
3. **Recurso parecido não é o mesmo recurso.** Ex.: Negócios locais (diretório por número de
   indicações) não é Neighborhood Faves (ranking anual votado, com selo) → ausente.
4. Ser ausente ou abaixo **não obriga a implementar**. O veredito descreve a lacuna; a proposta é
   separada e pode ser "Não implementar", com justificativa.

### 3.2 As quatro dimensões (cada uma: Melhor · Igual · Pior)

| Dimensão | Pergunta | Exemplos do que conta |
|---|---|---|
| Funcionalidade | Faz tudo o que o Nextdoor faz neste flow? | foto na publicação, responder comentário, "Tenho interesse", horário estruturado |
| Praticidade | Quantos passos, toques e campos até o objetivo? Há atrito? | barra de comentar fixa vs. caixa no fim da página; mensagem pronta enviada do anúncio vs. abrir conversa |
| Interface | Hierarquia, densidade, consistência, área do polegar | 4 anúncios por tela vs. 1; botão principal sempre no mesmo lugar |
| Clareza | A pessoa entende onde está, o que acontece e por quê? | estados de espera, erro com saída, textos que dizem o resultado |

### 3.3 Evidência obrigatória

- **Nextdoor:** as telas do flow no Mobbin (busca pelo nome do flow; ver 3.5).
- **Bivaque:** captura real da tela em 375 e 1440 px (claro e escuro quando o tema importar),
  **interagindo** (abrir, publicar, responder), não só a tela parada. Conferir no código o que a
  captura não mostra.
- Quando um item for avaliado só pelo código, **escreva isso no item**.
- Registre o veredito com: o que existe no Bivaque, onde o Nextdoor ganha, onde o Bivaque ganha,
  as quatro notas e a proposta.

### 3.4 Agrupamento

Os 79 flows estão em 15 grupos: Entrada e conta, Início e feed, Publicar e interagir, Busca,
Recomendações e negócios, Desapegos, Encontros, Grupos, Conversas e pessoas, Avisos, Alertas e
clima, Perfil/conta/privacidade, Lado do negócio, Anúncios pagos, Moderação pessoal. Correspondência
com o mapa F01–F10: F01 ⇐ Entrada e conta; F02 ⇐ Início, Busca; F03 ⇐ Publicar; F04 ⇐ Grupos,
Publicar; F05 ⇐ Encontros; F06 ⇐ Desapegos; F07 ⇐ Recomendações e negócios, Lado do negócio;
F08 ⇐ (guia, sem par direto no Nextdoor); F09 ⇐ Conversas, Avisos; F10 ⇐ Perfil.

### 3.5 Armadilhas do Mobbin já conhecidas

- A busca `search_flows` devolve os flows **em ordem de id**, não na ordem do app. "Primeiro flow"
  não significa nada; escolha pelo **nome**.
- Depois dos 79 flows do Nextdoor atual (iOS), a listagem mostra uma **versão antiga** do app (outro
  visual, aba "Discover"). Ficou fora.
- Paginação: `limit` diferente entre páginas pula itens (página 1 com limit 5 e página 2 com limit 10
  perde os itens 6–10). Use sempre o mesmo `limit`.
- O uso de IA do Mobbin está alto no mês (aviso da própria ferramenta); prefira `search_flows` e
  buscas específicas.

---

## 4. Nível de crítica

**Mão pesada.** O objetivo declarado pelo dono é construir algo decente, não validar o que existe.

- Aponte o que está fraco mesmo quando o recurso existe. Grupos é o exemplo citado pelo dono: existe
  e está abaixo da régua.
- Critique **interação e produto** antes de visual: passos, momento de valor, estados de espera,
  saída de erro, densidade, previsibilidade do botão principal.
- Ordene os achados do mais grave para o menor e diga o porquê de cada um.
- Corrija a si mesmo quando a régua for frouxa: a versão 1 tinha 27 "presentes"; com a régua de
  qualidade ficaram 14.

### Antipadrões já encontrados (procure em todas as jornadas)

- Fluxo opcional dentro de fluxo obrigatório (Negócio dentro do onboarding, com barra de progresso
  dupla).
- Formulário que pede tudo de uma vez, com botão desabilitado sem explicar o porquê.
- Dado pedido duas vezes (nome completo no cadastro e "como quer ser chamado" na cidade).
- Sucesso vazio ("Vínculo confirmado" só com check e "Continuar"), sem mostrar o valor.
- Botão principal que muda de lugar no celular.
- Ícone que parece ação mas não faz nada (câmera no campo de escrever do grupo).
- Caixa de comentar no fim da página; sem resposta a comentário; sem foto.
- Um item por tela onde a tarefa é comparar (lista de desapegos).
- Foto alegre e slogan em telas de erro ou encerramento (conta apagada, convite indisponível).
- Opções de aviso desmarcadas por padrão onde o aviso é o próximo passo natural.
- Configurações misturadas numa única folha.

### Defeitos concretos vistos no protótipo HTML (verificar se persistem no `apps/app`)

- Detalhe da indicação a 375 px: o nome do autor da resposta quebra e o chip "Ajudou a resolver"
  sobrepõe "Membro da comunidade".
- Contorno escuro no título da tela ao abrir a rota (foco programático sem `:focus-visible`), visto em
  Comunidade e Negócios locais.
- Conversas: a primeira linha aparece já deslizada com "Apagar" ao abrir.
- Chips de categoria longos cortados ("Climatização e eletrodomésticos").

---

## 5. Como sugerir

Para cada item abaixo da régua ou ausente:

1. **Proposta em uma de três formas:** Implementar · Não implementar · Decisão do dono.
2. **Justificativa curta**, ligada ao produto: verificação obrigatória, lançamento sem cobrança,
   privacidade (BLOCK-AFFILIATION, LGPD), público militar e famílias em transferência.
3. **Solução de engenharia, não só de tela**, quando couber (máquina de estados, processamento
   assíncrono, dado agregado com mínimo de exibição, flag).
4. **Como medir** se funcionou (evento de funil, tempo até concluir, taxa de conclusão).
5. Diga **onde o Bivaque já ganha**, para não perder isso na reconstrução (filtro da Agenda por
   momento, sugestões de grupo por momento, aviso de segurança nas conversas, rascunho, retirada
   em data de transferência, denúncia com acompanhamento).
6. Respeite os limites: não invente regra de acesso; escopo novo de dados/RLS entra no board como
   `blocked` ou `repo` até haver ADR; nada de cobrança no lançamento.
7. Entregue no artefato (ou num novo, no mesmo formato) para o dono aceitar ou rebater item por item.

### Propostas consolidadas da versão 2 (aguardando o dono)

- **Implementar:** Favoritos da cidade (voto de membro verificado, ranking anual por categoria,
  selo); "Acontecendo na cidade" no Início; página e preferências de avisos; baixar meus dados;
  trocar senha; privacidade por campo; "Meus encontros" + "Tenho interesse"; capa e término no
  encontro; perguntas no encontro; boas-vindas no grupo; foto na publicação, responder e "Útil" em
  comentário, barra de comentar fixa; doação e filtro Grátis; grade nos desapegos; mensagem pronta
  enviada do anúncio; "mais deste vendedor"/"perto de você"/queda de preço; filtros e "Em alta" na
  busca; ficha do negócio com "Aberto agora", distância e parecidos; horário por dia; checklist da
  página do negócio; fechar discussão; ocultar publicação; bio; configurações em seções; busca na
  ajuda; filtro e foto nas conversas.
- **Decisão do dono:** convite de vizinho/colega; IA nas indicações (D49/LGPD); perfil público de
  membro (BLOCK-AFFILIATION); foto de perfil; momento do 2FA; alertas de fontes oficiais; separar
  avisos por origem; enquete fora de grupo.
- **Não implementar:** anúncios pagos (7 flows), notícias, vídeo, clima, reações variadas, lista de
  quem reagiu, compartilhar por endereço, mensagem direta sem contexto, seguir pessoas, publicações
  de negócio, caixa de avisos do negócio, silenciar fonte.

Foto em publicação e resposta encadeada mudam o ADR da Comunidade: precisam de decisão registrada.

---

## 6. Como construir (abordagem recomendada ao dono)

O dono pediu soluções melhores que o processo atual. Recomendação:

1. **Uma fonte de verdade: o app rodando.** Desenhar no código com os componentes do sistema;
   aprovar clicando numa prévia no celular. Mobbin é o quadro de referência. Imagem gerada deixa de
   ser especificação para flows que já existem no `apps/app`.
2. **Sistema de design pequeno e fechado** (~15 componentes: botão, campo, folha, barra de ação fixa,
   etapas, cartão, linha de lista, chip, avatar, estado vazio, aviso, …) com galeria, teste visual de
   regressão por componente e tela, axe e um teste ponta a ponta do caminho principal por flow.
3. **Onboarding como máquina de estados** com progresso salvo no servidor: cada etapa com contrato
   (pode pular, validação, conclusão); ordem em configuração tipada. Retomar, abrir pelo link e
   trocar de aparelho funcionam; tirar ou reordenar etapa vira configuração.
4. **Verificação assíncrona:** consulta do CPF no servidor, em segundo plano, com idempotência e
   cache; a pessoa segue preenchendo; só a entrada na comunidade espera o resultado; queda do Portal
   leva ao caminho do documento sem travar.
5. **Autenticação:** entrada única que reconhece a conta pelo e-mail; Google, Apple e código por
   e-mail (sem senha); aceite registrado com versão e data; login nativo e links profundos pensados
   para o app de loja (Capacitor). Passkeys depois. **Exige ADR (R3).**
6. **Medir:** eventos de funil por etapa sem dado pessoal; flags para variantes; teste com 5 pessoas
   do público pela prévia, a cada flow.
7. **Processo enxuto:** ADR só para o que é difícil desfazer; flow por PR com prévia e checagens
   automáticas; integrar a linha do `apps/app` ao main cedo, atrás de flag (decisão do dono).

---

## 7. Primeira entrega: F01 (entrada e onboarding)

### 7.1 Sequência do Nextdoor (Mobbin: Onboarding `68adea93-572d-468c-b5ce-ec9663370485`, Logging in `51617ea5-3575-4676-86bd-e3a8caa7ae52`)

1. Entrada única: Apple, Google, e-mail, Facebook; termos numa linha; "Tem um código de convite?".
2. Uma tela para entrar **ou** criar conta (o app identifica a conta).
3. Nome → endereço (com aviso de privacidade) → "Verificando suas informações…".
4. **"Você foi verificado! Veja um pouco do seu bairro"**: mapa, vizinhos, publicações recentes,
   itens à venda, lugares.
5. Temas de interesse → grupos e fontes, com "Entrar" no cartão.
6. **"Uma última coisa"**: quatro regras de convivência, "Entendi".
7. Ativar avisos (com prévia de como chegam) / "Agora não".
8. Início com **"Primeiros passos · 1 de 7"** persistente.
O cadastro de negócio é um fluxo separado, fora do onboarding pessoal.

### 7.2 Crítica do F01 atual (mais grave primeiro)

1. Negócio dentro do onboarding (etapa 5 de 5 + 7 telas, progresso duplo).
2. Sem momento de valor depois da verificação.
3. Login e cadastro separados; cadastro pede tudo de uma vez; botão desabilitado até o aceite.
4. Nome pedido duas vezes.
5. Sem Apple — a App Store exige opção equivalente quando há login com Google (diretriz 4.8).
6. Regras de convivência reduzidas a link num checkbox.
7. Sem estado de espera na consulta do CPF.
8. Interesses fora do onboarding; sugestões de grupo sem explicação.
9. Avisos não pedidos no onboarding.
10. Boas-vindas encerra sem primeiros passos.
11. Botão principal muda de lugar no celular.
12. Foto de festa e slogan em telas de erro e encerramento.
13. "Avise-me" desmarcado na análise.

### 7.3 F01 proposto (caminho principal por e-mail)

Entrada (Google, Apple, e-mail; convite) → e-mail → senha ou código → nome → CPF → consultando
(assíncrono) → cidade e momento → **prévia da cidade** (números agregados, exibidos só acima de um
mínimo, ex. "mais de 10") → interesses e grupos na mesma tela → **o combinado** (pode absorver o aceite
do Google, mantendo `/consent` do PR #104) → avisos → boas-vindas → Início com **primeiros passos**.
Barra de ação fixa no rodapé em todas as etapas no celular. Negócio fora, atrás de flag.

### 7.4 Decisões pendentes do dono (perguntar antes de construir o que depende delas)

- Tirar o Negócio do onboarding (a ENT-005 acabou de entregá-lo dentro).
- Login por código no e-mail, sem senha (R3).
- Apple agora ou só na ida para a loja.
- "O combinado" absorver o aceite do Google.
- Pedir o nome antes do CPF muda a ordem do ADR de entrada (precisa de emenda); a prévia da cidade
  depois da cidade não muda.

### 7.5 Ordem de trabalho sugerida

1. Ler as respostas do dono no artefato da régua (itens de Entrada e conta).
2. Rascunho do **ADR de autenticação** (código por e-mail, Apple, aceite versionado) para aprovação.
3. **Prévia clicável** do F01 novo no `apps/app` com dados simulados: máquina de estados, etapas,
   barra fixa, prévia da cidade, o combinado, avisos, primeiros passos. Dono testa no celular
   (`vite --host` na mesma rede).
4. Teste com 5 pessoas do público; ajustes.
5. Ligação com o banco: progresso no servidor, verificação assíncrona, eventos de funil, dados
   agregados da cidade. Provas de banco, negativos de acesso, gate completo, capturas 375/768/1440.
6. Repetir o método nas próximas jornadas, na ordem que o dono escolher (ele indicou Grupos como o
   ponto mais fraco conhecido).

---

## 8. Notas de ambiente

- **21st.dev:** o antigo Magic MCP virou "21st MCP", hospedado; instalação por
  `npx @21st-dev/cli@latest init --client claude`; chaves antigas foram zeradas; busca e cópia com
  chave grátis, geração exige acesso de IA na conta (fontes de terceiros, não confirmado na
  documentação oficial). A chave é segredo: variável de ambiente, nunca no repositório nem no chat.
- O catálogo do 21st é React + Tailwind + shadcn, compatível com o `apps/app`. Antes de instalar um
  bloco: licença, versões fixas, acessibilidade (ver a triagem de 26/10).
- Capturas do protótipo HTML feitas nesta sessão ficaram no container temporário e não foram
  versionadas; refaça no `apps/app`.
