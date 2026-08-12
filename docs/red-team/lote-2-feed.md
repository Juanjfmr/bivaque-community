# Lote 2 — Home/Feed + Publicação (RT-10 e RT-11)

Auditoria de produto realizada em 2026-08-10 contra os contratos C6/C7, sem
repetir F1–F14. A régua usada foi Promessa × Comportamento, nas dimensões em
que houve falha. Inferências estão marcadas explicitamente.

---

## RT-10 — Community Feed

### F30 · As quatro escritas centrais omitem o autor obrigatório

- **Promessa:** publicar, comentar, curtir e salvar são ações funcionais do
  feed; o MAP marca postar/curtir/comentar como Corrigida.
- **Comportamento:** os quatro inserts enviam `post_id`/conteúdo, mas não
  `user_id`. A coluna é `NOT NULL`, não tem default nem trigger de
  preenchimento e a própria policy exige `user_id = auth.uid()`. Os casts de
  TypeScript apenas ocultam o campo obrigatório; em runtime, criar post,
  comentar, reagir e salvar falham no banco. Publicar e comentar mostram erro;
  reagir e salvar apenas desfazem o estado otimista, sem explicar a falha.
- **Evidência:** `apps/web/app/components/bivaque/feed-post.tsx:196-205,211-237,582-605`;
  `apps/web/app/(shell)/community/page.tsx:118-133`;
  `supabase/database.generated.ts:21-28,615-620,643-647,678-691`;
  `supabase/migrations/20260802000900_community_feed.sql:19-32,166-189`;
  `supabase/migrations/20260804212011_post_reactions.sql:7-12,48-61`;
  `supabase/migrations/20260805153451_post_saves.sql:7-12,42-55`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.
- **Dimensões que falham:** Happy path, Sad paths, Coerência, Valor.

### F31 · “Publicar” não informa nem permite escolher a audiência

- **Promessa:** o usuário cria uma publicação dentro de um produto com três
  escopos reais — cidade, comunidade e grupo — e deve saber quem poderá vê-la.
- **Comportamento:** a página injeta sempre `PILOT_LOCALITY_ID`; o modal grava
  somente `locality_id` e não apresenta seletor, resumo ou confirmação de
  audiência. `community_id` e `group_id` ficam nulos, portanto a publicação é
  municipal. O cabeçalho mostra “Manaus, AM” e a contagem total de membros,
  mas essa audiência não é reiterada no ato de publicar.
  **[inferência]** Um usuário vindo do modelo mental de grupo/comunidade pode
  achar que fala com um subconjunto e divulgar para toda a base municipal.
- **Evidência:** `apps/web/app/(shell)/community/page.tsx:223-232,339-348`;
  `apps/web/app/components/bivaque/feed-post.tsx:508-530,582-601,630-745`;
  `docs/red-team/camada-0-contratos.md:94-109`.
- **Severidade:** P0.
- **Veredicto:** MODIFY.
- **Balde:** B — decisão do dono sobre seletor, confirmação e copy de audiência.
- **Dimensões que falham:** Modelo mental, Permissões, Privacidade, Sad paths.

### F32 · “Comunidade” mistura cidade, entidade Comunidade e grupos visíveis

- **Promessa:** a rota e o vazio chamam o espaço de “comunidade”, enquanto o
  contrato define Comunidade como uma subdivisão própria entre localidade e
  grupo.
- **Comportamento:** o feed aberto é o de Manaus. A RPC exclui todo post com
  `community_id`, inclui posts municipais e também posts de grupos públicos ou
  grupos dos quais o usuário participa. Não há seletor/chip para a entidade
  Comunidade, pendência já assumida no MAP. Assim, a mesma palavra nomeia a
  navegação, a cidade e uma entidade inacessível pela UI. No estado vazio, a
  copy “Seja o primeiro a compartilhar algo com a sua comunidade” reforça a
  ambiguidade e oferece diretamente o CTA “Publicar”, sem esclarecer que o
  incentivo vale para toda Manaus.
- **Evidência:** `apps/web/app/(shell)/community/page.tsx:55-58,223-240,277-287`;
  `supabase/migrations/20260805215020_community_feeds.sql:34-82`;
  `docs/journeys/MAP.md:102-116`.
- **Severidade:** P1.
- **Veredicto:** SPLIT.
- **Balde:** B — decisão do dono sobre arquitetura de navegação e nomenclatura.
- **Dimensões que falham:** Necessidade, Modelo mental, Coerência, Valor.

### F33 · “Relevantes” significa apenas “mais comentados”

- **Promessa:** a tab “Relevantes” sugere um ranking de relevância do conteúdo
  para o membro.
- **Comportamento:** para qualquer ordem diferente de `recent`, a RPC ordena
  exclusivamente por `comment_count DESC` e usa data como desempate. Reações,
  relação com autor/grupo, recência ponderada e interesse do usuário não entram
  no cálculo. O rótulo não explica a regra e incentiva volume de comentários
  como proxy único, facilmente manipulável.
- **Evidência:** `apps/web/app/(shell)/community/page.tsx:242-263`;
  `supabase/migrations/20260805215020_community_feeds.sql:62-82`.
- **Severidade:** P2.
- **Veredicto:** MODIFY.
- **Balde:** B — decisão do dono entre renomear para “Mais comentados” ou definir
  um ranking de relevância.
- **Dimensões que falham:** Modelo mental, Coerência, Abuso.

### F34 · Salvar não tem destino descobrível

- **Promessa:** o bookmark e o item “Salvar” criam uma coleção pessoal que o
  usuário poderá consultar depois.
- **Comportamento:** mesmo desconsiderando a falha de escrita de F30, a única
  leitura de `post_saves` serve para marcar ícones dentro do próprio feed.
  Não existe CTA, filtro ou rota para listar posts salvos. O contrato own-row
  protege corretamente a coleção, mas a UI não entrega o valor posterior.
- **Evidência:** `apps/web/app/components/bivaque/feed-post.tsx:119-128,297-316`;
  `apps/web/app/(shell)/community/page.tsx:141-160`;
  `supabase/migrations/20260805153451_post_saves.sql:33-64`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — decisão do dono sobre destino, filtro ou remoção da feature.
- **Dimensões que falham:** Necessidade, Happy path, Valor.

### F35 · “Ocultar publicação” dura só até recarregar a página

- **Promessa:** ocultar comunica uma preferência persistente do usuário sobre
  o conteúdo que não quer mais ver.
- **Comportamento:** a ação apenas adiciona o ID a um `Set` em memória e filtra
  a lista renderizada. Não grava preferência, não usa `is_deleted` e o post
  reaparece em reload ou nova sessão. A moderação por operador registrada no
  MAP é outra operação e não fecha este ocultar pessoal.
- **Evidência:** `apps/web/app/components/bivaque/feed-post.tsx:92-101,119-125`;
  `apps/web/app/(shell)/community/page.tsx:28,100-102,299-323`;
  `docs/journeys/MAP.md:241-246`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — a ação deve persistir ou deixar de prometer ocultação.
- **Dimensões que falham:** Coerência, Happy path, Valor.

### F36 · Deep link inexistente ou inacessível falha em silêncio

- **Promessa:** links compartilhados e notificações levam ao post específico.
- **Comportamento:** `?post=` procura somente no array retornado pelo feed; se o
  post foi removido, pertence a Comunidade, está em grupo privado inacessível
  ou o ID é inválido, o efeito apenas retorna. Não há estado “indisponível” nem
  orientação. O silêncio evita revelar a existência de conteúdo privado, mas
  também torna link quebrado indistinguível de link ignorado.
- **Evidência:** `apps/web/app/components/bivaque/feed-post.tsx:71-90,240-249`;
  `apps/web/app/(shell)/community/page.tsx:191-215`;
  `supabase/migrations/20260805215020_community_feeds.sql:75-82`.
- **Severidade:** P2.
- **Veredicto:** MODIFY.
- **Balde:** B — a mensagem genérica precisa preservar a não enumeração de
  conteúdo privado.
- **Dimensões que falham:** Sad paths, Modelo mental.

### F37 · O feed não tem página, cursor nem limite

- **Promessa:** “Você está em dia” sugere uma lista carregada e concluída de
  forma controlada.
- **Comportamento:** a RPC não recebe cursor e não aplica `LIMIT`; retorna todos
  os posts acessíveis, com contagens laterais de comentários e reações. O
  cliente substitui o array inteiro e renderiza todos os cards. `atEnd` é
  inicializado e resetado, mas nunca recebe `true`; o marcador aparece por
  `!atEnd`, não por uma conclusão de paginação. **[inferência]** custo de rede,
  banco e render cresce com todo o histórico da localidade. Portanto, hoje não
  existe “post fora da primeira página”: existe uma única carga sem limite.
- **Evidência:** `supabase/migrations/20260805215020_community_feeds.sql:9-28,56-82`;
  `apps/web/app/(shell)/community/page.tsx:27,39-73,290-331`.
- **Severidade:** P2.
- **Veredicto:** MODIFY.
- **Balde:** A — paginação/cursor é correção operacional inequívoca para um feed.
- **Dimensões que falham:** Operação, Happy path.

### F38 · “Foto” pede um caminho interno e nunca mostra a imagem

- **Promessa:** os botões “Foto” criam uma publicação com foto.
- **Comportamento:** não há upload nem seletor de arquivo. O modal pede ao
  membro “Caminho da foto (event-photos/...)”, persiste essa string e o card
  renderiza apenas um placeholder textual `Foto: {photo_path}`. É affordance
  fraud para um usuário comum e ainda expõe nomenclatura interna de storage.
- **Evidência:** `apps/web/app/components/bivaque/feed-composer.tsx:58-67`;
  `apps/web/app/components/bivaque/feed-post.tsx:338-358,567-570,588-591,653-661`.
- **Severidade:** P1.
- **Veredicto:** REMOVE.
- **Balde:** A — remover a affordance até existir upload e renderização reais.
- **Dimensões que falham:** Modelo mental, Happy path, Coerência, Valor.

### F39 · “Enquete” publica opções sem permitir votar

- **Promessa:** “Nova enquete” e o tipo “Enquete” oferecem uma enquete
  interativa.
- **Comportamento:** a criação persiste somente um array `poll_options`. O card
  desenha cada opção em `<div>` sem botão, handler, estado de voto, contagem ou
  resultado; não existe modelo de votos no contrato do post. A feature é uma
  lista numerada com nome de enquete.
- **Evidência:** `apps/web/app/components/bivaque/feed-composer.tsx:77-85`;
  `apps/web/app/components/bivaque/feed-post.tsx:380-395,575-577,683-722`;
  `supabase/migrations/20260802000900_community_feed.sql:10-15,19-48`.
- **Severidade:** P1.
- **Veredicto:** REMOVE.
- **Balde:** A — remover a affordance até o ciclo voto/resultado existir.
- **Dimensões que falham:** Necessidade, Happy path, Coerência, Valor.

### F40 · Publicação não pode ser denunciada pelo card

- **Promessa:** o MAP marca “denunciar” como Corrigida e o backend aceita
  `target_type = post` para alimentar o painel do operador.
- **Comportamento:** `FeedPost` importa `ReportButton`, mas o usa apenas em
  comentários. O menu da publicação contém somente ocultar, salvar e
  compartilhar; não existe ação para denunciar o post que contém o abuso.
- **Evidência:** `apps/web/app/components/bivaque/feed-post.tsx:17-20,43-55,119-129`;
  `apps/web/app/components/bivaque/report-button.tsx:9-15,23-51`;
  `supabase/migrations/20260802001600_reports.sql:11-16,58-94`;
  `docs/journeys/MAP.md:241-243`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — o destino e o componente já existem; falta expor a ação no post.
- **Dimensões que falham:** Abuso, Operação, Coerência.

### F41 · O autor não consegue corrigir nem retirar o próprio post

- **Promessa:** quem publica mantém controle mínimo sobre o próprio conteúdo,
  especialmente após erro de texto ou audiência.
- **Comportamento:** o banco concede update/delete apenas ao autor, mas o card
  não identifica o autor atual e seu menu não oferece editar ou excluir. O
  único “Ocultar” é local e temporário (F35), portanto não retira o conteúdo
  para os demais membros.
- **Evidência:** `supabase/migrations/20260802000900_community_feed.sql:92-94,176-189`;
  `apps/web/app/components/bivaque/feed-post.tsx:119-129,135-159,297-317`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — decisão do dono sobre edição, exclusão e trilha de moderação.
- **Dimensões que falham:** Privacidade, Sad paths, Permissões, Valor.

### F42 · Todo autor recebe um selo público de “Membro verificado”

- **Promessa:** o contrato global proíbe badge público de verificação e o
  próprio filtro de conteúdo bloqueia “verificado publicamente”/“selo de
  verificação”.
- **Comportamento:** cada card renderiza `BadgeCheck` ao lado do nome, sem
  consultar estado individual, com `aria-label="Membro verificado"`. Além de
  contradizer a fronteira de privacidade, o selo afirma um dado que a linha do
  feed nem retorna: `feed_posts` traz perfil e membership implícita, não o
  resultado privado de verificação.
- **Evidência:** `apps/web/app/components/bivaque/feed-post.tsx:280-289,559-565`;
  `supabase/migrations/20260805215020_community_feeds.sql:13-28,56-60`;
  `docs/red-team/camada-0-contratos.md:169-175`.
- **Severidade:** P0.
- **Veredicto:** REMOVE.
- **Balde:** A — remoção exigida pelo contrato de privacidade vigente.
- **Dimensões que falham:** Privacidade, Coerência, Permissões.

### F43 · Salvar e ocultar viram botões mortos no feed de grupo

- **Promessa:** o mesmo card `FeedPost` mantém suas ações em qualquer feed em
  que aparece.
- **Comportamento:** os controles são renderizados sempre, mas executam
  callbacks opcionais com `?.`. A página municipal passa ambos; a página do
  grupo instancia o card sem `onHide` e sem `onBookmarkToggle`. Nesse contexto,
  o ícone de bookmark e os itens “Ocultar publicação”/“Salvar” recebem clique e
  não fazem nada — affordance fraud direta.
- **Evidência:** `apps/web/app/components/bivaque/feed-post.tsx:58-70,92-102,119-125,297-316`;
  `apps/web/app/(shell)/community/page.tsx:317-323`;
  `apps/web/app/(shell)/groups/[id]/page.tsx:239-250`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — ocultar os controles sem callback ou fornecer as ações reais.
- **Dimensões que falham:** Coerência, Happy path, Valor.

### F44 · “Grupos ativos” não mede atividade

- **Promessa:** o rail lateral apresenta três “Grupos ativos”, sugerindo uma
  seleção útil pelo nível de atividade.
- **Comportamento:** a consulta pega os três primeiros grupos retornados pelo
  banco, sem `order`, métrica temporal ou atividade de posts. Depois calcula
  apenas o total de membros. O nome do bloco atribui um ranking que não existe;
  além disso, as linhas são `div`/`span` sem navegação para o grupo.
- **Evidência:** `apps/web/app/components/bivaque/feed-right-rail.tsx:52-81,124-147`.
- **Severidade:** P2.
- **Veredicto:** MODIFY.
- **Balde:** B — o dono precisa definir se “ativo” significa membros, posts,
  recência ou se o bloco deve ser apenas descoberta de grupos.
- **Dimensões que falham:** Modelo mental, Coerência, Valor.

---

## Placar do lote

| Balde | Findings | Ação |
|---|---|---|
| A — correção inequívoca | F30, F35, F37, F38, F39, F40, F42, F43 (8) | Corrigir affordance/contrato sem decisão de produto |
| B — decisão do dono | F31, F32, F33, F34, F36, F41, F44 (7) | Deliberar audiência, arquitetura, ranking e ciclo de vida |

**Severidade:** 2 P0 (F31, F42) · 9 P1 (F30, F32, F34, F35, F38, F39,
F40, F41, F43) · 4 P2 (F33, F36, F37, F44).
