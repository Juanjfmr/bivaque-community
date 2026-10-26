# Bivaque — porte R72 para shadcn/UI, rodada P2

**Branch exclusiva:** `feat/port-r72-shadcn-p0-20261025`.
**Baseline autoritativa imutável:** `prototypes/bivaque-html/docs/VISUAL_BASELINE_R72.md`, SHA-256 `7e7657c3652ce6daff450d8dfe5d9ce8d8eda8d6189bcd3f2317a2f25fb61d2d`.
**Não alterar:** `main`, o HTML congelado R72, workflows de produção ou o ambiente publicado.

## Entregas desta rodada

| Módulo | Implementado na prévia | Limite honesto |
|---|---|---|
| Grupos abertos | Participar/sair, ver feed, criar publicação local, comentar, curtir e denunciar conteúdo específico | LocalStorage, dados fictícios, sem sincronização entre usuários ou controles institucionais |
| Grupos restritos | Solicitação simulada e cancelamento, com status pendente persistido no navegador e sem exibir posts antes de ingresso | Não existe aprovação de moderador nem concessão de acesso; o estado nunca é tratado como autorização real |
| Governança | Ocultação da publicação denunciada no feed do grupo, do anúncio nas buscas/home/salvos/listagens e de grupos denunciados | Painel é laboratório aberto; não é moderação de backend, sem RBAC, trilha auditável ou SLA |
| Ficha de imóveis/desapegos | Foto ilustrativa ampliável, share nativo ou cópia do link e detalhes mais transparentes da localização | Apenas **uma** foto de fixture por item; não se inventam imagens adicionais nem endereço |
| Região/bairro | Pesquisa pública do bairro e cidade no OpenStreetMap, explicitamente aproximada | Não é mapa embutido de imóveis, não calcula raio de OM, trajeto, ETA, proximidade ou coordenadas |
| Filtros | Listas de tipos de item e OMs limitadas aos dados exemplificativos da cidade escolhida | Sem catálogo nacional real nem informações geográficas validadas |

## Testes e controles

- `.github/workflows/bivaque-r72-shadcn-check.yml`: `npm ci`, contraste, exportação Next/TypeScript, testes de regressão P0/P1/P2 e presença de assets/rotas.
- `.github/workflows/bivaque-r72-browser-smoke.yml`: Chromium para 375, 768, 1440 px, claro e escuro, screenshots e jornadas de criar/editar/pausar/analisar/moderar, agora também grupo aberto/restrito, publicação e comentário, denúncia por post, ampliação de foto e ação regional.
- O teste de navegador não executa autenticação, pagamentos, geocodificação externa, auditoria de acessibilidade completa ou comparação automática de pixels contra o HTML R72.
- As fotos do protótipo são fictícias e podem solicitar imagens de hosts externos. Não afirmar privacidade de rede absoluta.

## Débitos antes de chamar a portabilidade de completa

1. **R72 detalhado**: matriz por componente/rota/jornada com comparação visual dos estados claro/escuro e dos três tamanhos de tela.
2. **Imóveis**: editor de anúncios com múltiplas fotografias reais enviadas pelo usuário, armazenamento seguro, disponibilidade/edição, importação, filtros efetivos, mapas com coordenadas homologadas e seletor de organização militar/destino.
3. **Grupos**: autorização e aprovação reais, moderação de comentários, exclusão/edição com permissões e notificações de respostas.
4. **Comunidade/negócios**: detalhamento dos módulos comerciais e de propostas em relação ao R72, sem obrigar fluxos de mensagem privada como requisito arquitetural.
5. **Infraestrutura**: Supabase Auth, Row-Level Security, Edge Functions, antispam, sanitização e telemetria, necessários para migrar de protótipo local para produto real.
6. **QA de release**: navegação por teclado, leitor de tela/axe, toque em dispositivo, imagem/contraste, foco e auditoria de botões mortos sem autoaprová-los pelo CI.

**Veredito:** progresso parcial mensurável, não paridade visual/funcional integral. Nenhum merge ou release está autorizado por este documento.
