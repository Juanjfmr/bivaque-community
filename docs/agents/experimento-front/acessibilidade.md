# EXP-001 — Contrato de acessibilidade

Os nomes textuais marcados como **regra do protótipo** são os textos/`aria-label` existentes. **Decisão do contrato** marca a semântica ou nome que o HTML atual não fornece de forma estável, mas que as duas candidatas devem expor igual para os testes. Papéis seguem a árvore de acessibilidade pretendida, inclusive para elementos Material Web.

| Elemento | Papel | Nome acessível exato | Estado | Onde aparece / fonte |
|---|---|---|---|---|
| Navegação principal | `navigation` | `Navegação principal` | Região persistente | `shell/navigation.js`, linha 40 renderiza `#nav`; nome da região é **decisão do contrato**. |
| Início | `button` | `Início` | `aria-current="page"` quando `activeTab() === "inicio"` | Navegação principal; `shell/navigation.js`, linhas 33–34 e 40. |
| Comunidade | `button` | `Comunidade` | `aria-current="page"` quando `activeTab() === "comunidade"` | Navegação principal; detalhe e Minhas também mantêm essa aba ativa; mesma fonte. |
| Conversas | `button` | `Conversas` | `aria-current="page"` quando `activeTab() === "conversas"` | Navegação principal; conversa individual também mantém a aba ativa; mesma fonte. |
| Você | `button` | `Você` | `aria-current="page"` quando `activeTab() === "voce"` | Navegação principal; rotas de perfil também mantêm a aba ativa; mesma fonte. |
| Cabeçalho Início | `heading` | `O que você precisa em <cidade>` (ou `Conheça <cidade>` no modo somente leitura) | nível 1 | `features/home/views.js`, linha 17; cidade é o nome renderizado no título. |
| Atalho Indicações | `button` | `Indicações` | Leva a `#comunidade` | Início, entre os atalhos (Negócios, Desapegos, Imóveis, Indicações); `app/handlers.js`, linha 50. Nas candidatas, os outros atalhos podem existir sem destino. |
| Cabeçalho Comunidade | `heading` | `Comunidade` | nível 1 | `features/community/views.js`, linha 1. |
| Cabeçalho Minhas | `heading` | `Minhas perguntas e indicações` | nível 1 | `features/profile/views.js`, linha 13. |
| Cabeçalho detalhe | `heading` | Título textual da pergunta aberta | nível 1 | `features/community/question.js`, linha 4. |
| Aba Indicações | `tab` | `Indicações` | `aria-selected="true"` quando selecionada | Aba de Comunidade. Protótipo usa atributo `active`; papel/estado ARIA explícito é **decisão do contrato**; `features/community/views.js`, linha 1. |
| Aba Grupos | `tab` | `Grupos` | `aria-selected="true"` quando selecionada | Aba de Comunidade; mesma decisão sobre estado ARIA; `features/community/views.js`, linha 1. |
| Filtro Para ajudar | `button` | `Para ajudar` | `aria-pressed="true"` quando selecionado | Comunidade, filtros; o wrapper de filtro deve expor seleção como pressed (**decisão do contrato**); `features/community/views.js`, linha 4. |
| Filtro Resolvidas | `button` | `Resolvidas` | `aria-pressed="true"` quando selecionado | Comunidade, filtros; decisão de estado ARIA; `features/community/views.js`, linha 4. |
| Filtro Minhas | `button` | `Minhas` | `aria-pressed="true"` quando selecionado | Comunidade, filtros; decisão de estado ARIA; `features/community/views.js`, linha 4. |
| Lista de perguntas | `list` | `Perguntas` | Contém os itens visíveis da página atual | Comunidade e Minhas. O protótipo usa `div.list` e paginação, então o papel/nome são **decisão do contrato**; `features/community/views.js`, linhas 5–8; `features/profile/views.js`, linha 13. |
| Pergunta pelo título | `listitem` contendo `button` | Nome acessível exatamente igual ao título da pergunta | Ativação abre o detalhe; foco restaurado ao voltar | Cada linha da lista. O botão atual agrega autor, cidade e status no nome; aplicar `aria-label` igual ao título é **decisão do contrato** para localização estável. Autor, categoria e status continuam lidos por `aria-describedby`, para não se perderem no leitor de tela; `shell/primitives.js`, função `questionRow` (linha 24). |
| Perguntar | `button` | `Perguntar` | Disponível na Comunidade e Minhas; somente para conta que pode publicar | `features/community/views.js`, linha 1; `features/profile/views.js`, linha 13. |
| Diálogo de pergunta | `dialog` | `Pedir indicação` | Modal aberto; foco contido e devolvido ao botão Perguntar ao fechar (**decisão do contrato** para retorno explícito de foco) | `features/community/editor.js`, linha 1; nome passado a `showDialog`. |
| Campo da pergunta | `textbox` | `Sua pergunta` | Texto obrigatório, mínimo de 8 e máximo de 300 caracteres no protótipo | Dentro do diálogo; `features/community/editor.js`, linha 1. As duas candidatas obedecem à validação de produto indicada em `jornada.md`. |
| Publicar pergunta | `button` | `Publicar pergunta` | Dentro do diálogo | `features/community/editor.js`, linha 1. |
| Pergunta no detalhe | `article` | Título da pergunta como `heading` nível 1 | Texto escapado; contém status de resolução/respostas | `features/community/question.js`, linha 4. |
| Lista de respostas | `list` | `Respostas` | Pode conter zero ou mais respostas | O protótipo usa `section-title` e `div.stack`; papel/nome/listitems explícitos são **decisão do contrato**; `features/community/question.js`, linhas 4–6. |
| Cada resposta | `listitem` | Conteúdo da resposta, com autoria lida na mesma unidade | Resposta marcada como resolvida mantém o texto visual `Ajudou a resolver` | `features/community/question.js`, linha 6; papel de item é decisão do contrato. |
| Campo de resposta | `textbox` | `Sua resposta` | Disponível quando a pergunta não está resolvida e há permissão de escrita | `features/community/question.js`, linha 7. |
| Enviar resposta | `button` | `Enviar indicação` | Disponível junto ao campo de resposta | `features/community/question.js`, linha 7. |
| Útil | `button` | `Útil` | `aria-pressed="true"` quando a pessoa já marcou; contagem, se houver, é descrição, não altera o nome | A resposta de outra pessoa; botão atual inclui contagem no rótulo visual. Nome normalizado e estado pressed são **decisão do contrato**; `features/community/question.js`, linha 6. |
| Resolver resposta | `button` | `Ajudou a resolver` | Ação para autora da pergunta quando resposta ainda não resolvida | Rótulo atual do botão; `features/community/question.js`, linha 6. |
| Reabrir pergunta | `button` | `Reabrir pergunta` | Ação para autora quando resposta está resolvida | Rótulo atual; `features/community/question.js`, linha 6. |
| Seguir respostas | `button` | `Seguir respostas` | `aria-pressed="true"` quando está seguindo; ao ativar, nome muda para `Parar de seguir respostas` | Cabeçalho do detalhe; estado pressed explícito é **decisão do contrato**; `features/community/question.js`, linha 4. |
| Carregando perguntas | `status` | `Carregando perguntas` | `aria-live="polite"`, `aria-busy="true"` na lista | **Decisão do contrato**: protótipo local não tem carregamento assíncrono da lista da jornada. Usar estado curto e estável, sem conteúdo anterior. |
| Vazio de Para ajudar | `heading` | `Ninguém esperando resposta` | nível 3; texto auxiliar explica que é possível buscar ou iniciar pergunta | Comunidade, filtro Para ajudar vazio; `features/community/views.js`, linha 8. |
| Vazio de lista geral | `heading` | `Nenhuma pergunta por aqui` | nível 3 | Comunidade em outro filtro vazio; `features/community/views.js`, linha 8. |
| Vazio de Minhas | `heading` | `Seu histórico começa aqui` | nível 3 | Minhas sem perguntas; `features/profile/views.js`, linha 13. |
| Vazio de respostas | `heading` | `A comunidade ainda não respondeu` | nível 3 | Detalhe sem respostas; `features/community/question.js`, linha 5. |
| Erro de lista | `alert` | Contém o texto `Não foi possível carregar as perguntas.` e o botão `Tentar de novo` | Botão `Tentar de novo` inicia nova tentativa e mantém filtro/posição | **Decisão do contrato**: o protótipo da jornada não implementa erro recuperável de rede; texto e botão iguais nas duas candidatas. |
| Erro ao publicar | `alert` | Contém o texto `Não foi possível publicar. Sua pergunta continua aqui.` | O diálogo continua aberto, com o texto digitado | **Decisão do contrato**, para o eliminatório do rascunho. |
| Conta sem cidade | — | — | `/app` manda para a entrada (algum caminho sob `/onboarding`), como o Next atual faz para conta sem cidade (`apps/web/app/(shell)/layout.tsx`, `apps/web/proxy.ts`) | **Decisão do contrato**. O teste confere o destino e que nenhuma pergunta da carga aparece. |
| Conta de outra cidade | — | — | Vê a Comunidade da própria cidade; as perguntas da carga não aparecem na lista nem por link direto (`#pergunta/<id>` mostra `Indicação indisponível`) | **Decisão do contrato**, pelas regras de acesso do banco. |
| Sem acesso ao detalhe | `heading` | `Indicação indisponível` | nível 1; não anuncia título, autor ou respostas sem permissão | **Decisão do contrato**: usar a saída sem conteúdo de `unavailable()` do protótipo (`features/community/question.js`, linha 3), com nome seguro comum. |

