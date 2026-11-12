# Ensaio de publicação — levar a `main` ao bivaque.app

Preparado em 12/11/2026 sobre a `main` `79eedadb`. Publicar é ato do dono
([LANCAMENTO.md](../LANCAMENTO.md), "Atos que só o dono pode fazer"); este roteiro diz o que
conferir antes, a ordem dos passos e o que fica sem funcionar.

## Onde está a produção hoje

- O bivaque.app serve o deploy de **01/11/2026** (`3194fcf1`), **1.032 commits atrás da `main`**.
  Por isso `/inicio` ainda mostra a tela antiga: na `main` ele já redireciona para `/app/inicio`.
- Desde a fase 0 o merge na `main` não publica (`vercel.json`: `deploymentEnabled.main: false`).
  A publicação passa pela branch `producao`, que **ainda não existe** no GitHub.
- O banco de produção recebeu migrações pela última vez em 01/11 (workflow *Deploy migrations*,
  `3194fcf1`). Faltam **38 migrações**.

## O que precisa estar certo antes

### 1. Migrações (bloqueante, corrigido no repositório antes do ensaio)

- Nenhuma das 38 apaga tabela, apaga coluna ou muda tipo; os `delete` estão dentro de funções
  (exclusão de conta, limpeza do limitador) e não rodam na hora da migração.
- **6 delas têm data anterior à última já aplicada** (`20261024090000`), porque entraram depois com
  a linha do app: `20261023100000` a `20261023120000`. O `supabase db push` do workflow recusa
  migração fora de ordem sem `--include-all`; do jeito que está, o push para `producao` **falha no
  job de migrações**.
- Correção prevista: ensaio local da ordem real — banco com as migrações de `3194fcf1`, depois as 38
  na ordem em que `db push --include-all` aplicaria — e, passando, o workflow ganha
  `--include-all`. Resultado do ensaio local: *pendente* (o banco local está ocupado pelo RUN-138).

### 2. Variáveis de ambiente na Vercel (Production)

Conferir no painel da Vercel, ambiente Production. Nomes apenas; os valores são do dono.

| Variável | Sem ela | Situação |
|---|---|---|
| `BIVAQUE_APP_ORIGINS` = `https://bivaque.app` (e `https://www.bivaque.app` se existir) | **toda escrita do app novo é recusada (403)**: a allowlist de origem só tem os endereços locais | nova desde 01/11 |
| `BIVAQUE_LIMITER_PEPPER` (segredo longo e aleatório, só do servidor) | **entrada por código responde 503** em produção | nova desde 01/11 |
| `GOOGLE_MAPS_API_KEY` | a geocodificação do CEP fica só na BrasilAPI (reserva desligada) | nova, opcional |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` | o servidor não sobe | já existiam |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | avisos por e-mail não saem (o outbox acumula) | já existiam; depende de BLOCK-RESEND |
| `PORTAL_DADOS_API_KEY` | verificação pelo CPF cai na revisão manual | já existia |
| `OUTBOX_WORKER_SECRET`, `RECONCILE_WORKER_SECRET`, `ACCOUNT_DELETION_WORKER_SECRET` | os workers recusam a chamada | já existiam |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN` | limite de taxa e monitoramento degradados | já existiam |

`BIVAQUE_AUTH_BYPASS`, `RLS_PROBE_EMAIL` e `RLS_PROBE_PASSWORD` são de teste e **não** devem existir
em Production.

### 3. Supabase de produção (painel do Supabase)

- **Backup antes de tudo:** confirmar um backup recente (ou PITR) do projeto de produção. As
  migrações não têm volta automática.
- **Auth → URL Configuration:** `Site URL` = `https://bivaque.app` e redirecionamentos permitidos
  incluindo `https://bivaque.app/app/**` (o login do app novo volta para `/app`).
- **Auth → E-mail:** a entrada é por código no e-mail. Sem SMTP próprio (Resend, BLOCK-RESEND), o
  e-mail padrão do Supabase tem limite baixo por hora — serve para o ensaio, não para abertura.
- **Google/Apple:** sem os provedores configurados em produção, só a entrada por código funciona.

## Ordem dos passos (dono)

1. Fazer o backup do banco de produção.
2. Na Vercel, conferir as variáveis da seção 2 (no mínimo `BIVAQUE_APP_ORIGINS` e
   `BIVAQUE_LIMITER_PEPPER`).
3. Criar a branch `producao` apontando para o commit da `main` que passou no ensaio local:
   `git push origin <commit>:refs/heads/producao`. O push dispara *Deploy migrations*: gate completo e
   depois `supabase db push` no projeto de produção.
4. Esperar o workflow ficar verde. Se o job de migrações falhar, **não** seguir: a produção continua
   no código de 01/11 e o erro volta para o agente.
5. Na Vercel, trocar a **Production Branch** de `main` para `producao` e promover o deploy de
   `producao`. Fazer o passo 5 depois do 4 evita código novo rodando contra o banco antigo.
6. Teste no celular (marco do dono): entrar por código, abrir `/inicio` (deve cair em `/app/inicio`),
   publicar uma pergunta, abrir Mercado e Conversas.

Entre os passos 4 e 5 o código de 01/11 roda sobre o banco já migrado. As migrações são aditivas,
mas funções foram substituídas; fazer o ensaio num horário de pouco uso.

## O que fica sem funcionar no ensaio

- Push no celular (LAN-PUSH ainda não feito; chaves FCM/APNs são do dono).
- E-mail transacional em volume (BLOCK-RESEND).
- Entrada por Google e Apple, se os provedores não estiverem configurados em produção.
- As jornadas ainda abertas no quadro (F02, F03, F06, F07, F08, F09, F10) aparecem como estão na
  `main`: ligadas ao banco, com as correções da revisão às cegas ainda em andamento.

## Volta

- Código: na Vercel, *Instant Rollback* para o deploy de 01/11.
- Banco: só pelo backup do passo 1. Por isso o backup vem antes de tudo.
