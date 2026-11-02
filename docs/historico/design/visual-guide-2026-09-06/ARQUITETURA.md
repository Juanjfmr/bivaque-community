# Arquitetura recomendada para construir o Bivaque

Recomendação de 6 de setembro de 2026, baseada nos manifests atuais do repositório e nas documentações oficiais. Não é uma alteração de dependências nem uma declaração de prontidão.

## Decisão recomendada

**Next.js + TypeScript no web; React Native + Expo no Android/iOS; Supabase como backend compartilhado.**

Na `main` usada como base desta publicação, `apps/web/package.json` existe, mas `apps/mobile` ainda não existe. A recomendação inicial também examinou uma branch local com trabalho mobile ainda não incorporado à `main`. Para começar a partir da `main`, criar a base React Native/Expo é uma tarefa explícita da Etapa 1, incluindo sua integração ao workspace e a atualização deliberada do teste que hoje proíbe essa raiz. Se o trabalho mobile for incorporado antes, inspecione e reaproveite sua implementação comprovada.

| Camada | Recomendação | Aplicação |
|---|---|---|
| Web | Next.js App Router + React + TypeScript | Páginas responsivas, leitura do Guia, Mercado, comunidade e painéis |
| UI web | HeroUI v3, Tailwind e wrappers Bivaque existentes | Personalizar componentes com a direção aprovada, preservando comportamento e acessibilidade |
| Mobile | React Native + Expo + Expo Router | Android/iOS com navegação, teclado, câmera e gestos próprios de cada plataforma |
| UI mobile | Componentes React Native com tokens Bivaque | Mesma identidade; anatomia e comportamento adaptados ao dispositivo |
| Backend | Supabase Postgres, Auth, Storage e Realtime onde necessário | Dados, sessões, imagens e atualização de conversas/notificações |
| Dados no cliente | Avaliar TanStack Query para fluxos interativos, sobretudo mobile | Cache em memória, paginação, atualização e recuperação de falhas; limpar por sessão e escopo |
| Organização | Monorepo pnpm já existente | Compartilhar contratos, domínio e tokens |
| Entrega mobile | EAS Build e distribuição de testes | Builds instaláveis para validação e publicação |
| Qualidade | Vitest, Playwright, testes de autorização no banco e teste mobile real | Verificar o ciclo do usuário, incluindo negação e falhas |
| Observabilidade | Aproveitar Sentry e a instrumentação existente | Erros com remoção de dados pessoais |

Não é necessário instalar todas as bibliotecas sugeridas de uma vez. Conferir compatibilidade com a versão do Expo/React Native e atualizar dependências de forma controlada.

## Compartilhamento de código

O compartilhamento deve ocorrer onde as regras são iguais:

- **Domínio:** estados de anúncio, pedido, resposta, evento e referência.
- **Contratos e validação:** dados enviados e recebidos, mensagens de erro e limites.
- **Tokens:** cores, tipografia, espaçamento, raios e semântica visual.
- **Integração:** clientes de API e políticas de cache, quando puderem ser reutilizados sem acoplar a interface.

As telas web e mobile usam implementações próprias. A ficha do prestador pode ser uma coluna no celular e um painel lateral no desktop; isso não muda o significado do serviço.

A interface não decide autorização. As verificações precisam existir no backend e nas políticas do banco. Cache local não constitui permissão de acesso.

## Backend comum

As duas interfaces usam o mesmo modelo de dados e os mesmos controles de acesso.

- Leituras e escritas simples podem usar o cliente Supabase autenticado, sob RLS e grants adequados.
- Operações privilegiadas, integrações externas e processamento que precisa de segredo passam por endpoints de servidor.
- Regras atômicas de várias escritas pertencem a operações transacionais compartilhadas.
- O mobile deve ter contratos HTTP/RPC explícitos. Server Actions podem servir a interface web, mas não devem ser o contrato exclusivo usado pelo aplicativo nativo.
- Conversas e notificações recebem atualização em tempo real apenas onde isso melhora a experiência; listas e artigos usam paginação/cache apropriados.
- Imagens precisam de tamanhos derivados, placeholders e controle de acesso; upload incompleto deve ser recuperável.

Começaria com um backend modular organizado no projeto existente. Separar serviços independentes só quando houver uma necessidade concreta de escala ou operação.

## Transformação das imagens em produto

### 1. Consolidar a identidade em componentes

Definir cores e contrastes reais, fontes disponíveis, espaçamentos, raios, estados de foco e componentes básicos. As telas geradas servem de referência; textos e controles inconsistentes estão anotados no README.

Uma base pequena é suficiente para iniciar: Button, Input, TextArea, Select, Tabs, Avatar, Card, EmptyState, FeedbackAlert, Dialog/Sheet, Header e Navigation.

### 2. Entregar um fluxo completo

Primeiro: **entrar → encontrar a comunidade → perguntar → responder → receber retorno → resolver**.

Esse fluxo prova sessão, autorização, publicação, leitura, atualização e feedback. Depois, aplicar os componentes e a mesma disciplina aos demais módulos.

### 3. Trabalhar mobile e web por fluxo

A cada fluxo, construir e validar as duas apresentações antes de proliferar telas. No mobile, conferir teclado, safe areas, botão voltar, rolagem e retomada. No web, conferir foco, teclado, responsividade e densidade de informação.

### 4. Medir o que a imagem não mostra

Testar carregamento, erros, acesso negado, textos grandes, imagem ausente e conexão interrompida. Nenhuma imagem estática demonstra desempenho ou acessibilidade.

## Hospedagem e operação

Aproveitar a hospedagem web atual quando ela satisfizer requisitos operacionais. Vercel é uma opção natural para o Next.js existente; Supabase gerenciado reúne os componentes do backend. EAS gera os binários mobile e auxilia a distribuição, sem substituir as exigências das lojas.

Evitar estimar custo mensal ou capacidade de usuários sem dados de tráfego, armazenamento, downloads de imagens e uso de realtime.

## Fontes oficiais consultadas

- [Next.js: Server e Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [HeroUI v3](https://heroui.com/en/docs/react/getting-started)
- [Arquitetura do Supabase](https://supabase.com/docs/guides/getting-started/architecture)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [TanStack Query no React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [EAS Build](https://docs.expo.dev/build/introduction/)
