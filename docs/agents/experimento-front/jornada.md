# EXP-001 — A jornada

A jornada é a de Indicações, do protótipo, ligada ao banco real. As duas candidatas fazem exatamente estas telas e
ações, com o HTML, o CSS e o comportamento do protótipo. O protótipo é a especificação; quando ele e o banco
discordarem, vale a regra do banco já entregue (por exemplo, a pergunta tem de 8 a 300 caracteres e não exige "dois
termos", COM-002).

Fontes no protótipo (`prototypes/bivaque-html/src/`):
- shell e navegação: `shell/navigation.js` (rotas, `activeTab`, `back`, histórico), `shell/primitives.js`,
  `shell/paged-list.js`, `shell/in-place.js`;
- ações: `app/handlers.js` (`ask`, `submit-ask`, `open-question`, `question-filter`, `my-questions`, `send-answer`,
  `solve-question`, `reopen-question`, `follow-question`, `like-answer`);
- telas: `features/home/views.js` (`renderHome`), `features/community/views.js` (`renderCommunity`),
  `features/community/editor.js` (`openAsk`, `updateSimilar`, `submitAsk`), `features/community/question.js`
  (`renderQuestion`), `features/profile/views.js` (`renderMineQuestions`);
- estilos: `styles/`.

## Telas

1. **Barra de navegação** (baixo no celular, lateral no tablet e no desktop): Início, Comunidade, Conversas, Você,
   com o espaço "Criar", como no protótipo. Conversas e Você entram como telas mínimas, com o mesmo cabeçalho e um
   texto "Em breve", só para a navegação ser real.
2. **Início** (`renderHome`): só a parte que leva à jornada. O cabeçalho com a cidade, a busca (pode não buscar), o
   atalho Indicações e a faixa de perguntas, como no protótipo. O resto do Início fica de fora.
3. **Comunidade, aba Indicações** (`renderCommunity`): o cabeçalho, as abas (Indicações e Grupos; Grupos mostra "Em
   breve"), o resumo de resolvidas, os filtros Para ajudar, Resolvidas e Minhas, e a lista de perguntas paginada.
4. **Perguntar** (`openAsk`, `submitAsk`): o diálogo de pergunta, com título, detalhe, as sugestões de perguntas
   parecidas (`updateSimilar`) e Publicar.
5. **Detalhe da pergunta** (`renderQuestion`): a pergunta, as respostas, responder (`send-answer`), "Útil" na
   resposta, marcar como resolvida e reabrir (para a autora), e Seguir respostas.
6. **Minhas indicações** (`renderMineQuestions`), pela aba Minhas.

## Dados (banco real, nada novo)

| Ação | Como |
|---|---|
| Listar perguntas da cidade, com filtro | `rpc list_indications` (com `p_mine` para Minhas), paginada |
| Publicar pergunta | insert em `recommendation_requests`, pelas regras de acesso |
| Abrir detalhe e respostas | leitura da pergunta e `rpc list_question_replies` |
| Responder | insert em `recommendation_replies` |
| Útil na resposta | a tabela ou RPC que o Next atual usa para isso |
| Resolver e reabrir | `rpc mark_recommendation_resolved`, `mark_recommendation_reply_resolved`, `reopen_recommendation` |
| Seguir respostas | o salvar de pergunta que o Next atual usa (`recommendation_saves`) |

O Next atual faz cada uma dessas chamadas em `apps/web/app/components/indications/` e
`apps/web/app/(shell)/indicacoes/`; as candidatas podem ler esse código para saber os nomes e os parâmetros, mas não
importam componentes React de lá.

## Estados que toda tela tem

Carregando, vazio, erro com "Tentar de novo", e sem acesso (conta sem cidade ou fora da cidade), com os textos do
protótipo quando ele os tiver.
