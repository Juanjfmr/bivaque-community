# Produção passo a passo — do projeto Supabase ao primeiro cadastro

Roteiro do dono para abrir o piloto fechado. A ordem importa. Cada passo diz onde fazer e como saber que deu
certo. Nenhum valor secreto vai para o repositório: segredos ficam no painel de cada serviço.

Projeto Supabase existente: **bivaque-community**, ref `pjgvnfiscwwfhezbqwxi` (é o que o CLI local está ligado).

> Antes de tudo: confirme se esse projeto é o de **produção** e não guarda dado de teste que não deva ir para o
> piloto. Se ele foi usado para desenvolvimento, crie um projeto novo só para produção e use a ref dele no lugar
> desta em todo o roteiro.

---

## 1. GitHub — deixar o deploy de migrations pronto

O workflow `.github/workflows/deploy-migrations.yml` aplica as migrations no banco de produção quando a branch
`producao` recebe push (ou por disparo manual). Ele roda o gate antes.

1. GitHub → Settings → Environments → **production** (crie se não existir). Adicione os segredos:
   - `SUPABASE_PROJECT_ID` = `pjgvnfiscwwfhezbqwxi`
   - `SUPABASE_ACCESS_TOKEN` = token pessoal em supabase.com/dashboard/account/tokens
   - `SUPABASE_DB_PASSWORD` = senha do banco (Supabase → Project Settings → Database)
2. Crie a branch `producao` a partir da `main` (GitHub → Branches → New branch, origem `main`).
3. **Pronto quando:** a aba Actions mostra "Deploy migrations" verde, e em Supabase → Database → Migrations a
   última migration é a mais recente de `supabase/migrations`.

## 2. Supabase — autenticação e e-mail

Supabase → Authentication:

1. **URL Configuration:** Site URL = `https://SEU-DOMINIO`; Redirect URLs inclui `https://SEU-DOMINIO/auth/callback`
   e `https://SEU-DOMINIO/app/entrar`.
2. **Providers → Email:** ligado, com código por e-mail (OTP). Senha não é usada (ADR-20261101).
3. **SMTP Settings:** SMTP próprio pelo Resend (host `smtp.resend.com`, usuário `resend`, senha = chave do Resend,
   remetente no domínio já verificado). Sem isso o e-mail sai pelo SMTP de teste do Supabase, com teto baixo.
4. **Rate Limits:** e-mails enviados e cadastros/entradas **acima de 600 por hora** (o app tem um disjuntor global
   de 500/h; o limite do Supabase precisa ficar acima dele).
5. Google e Apple: opcionais para o piloto (o código por e-mail basta). Quando quiser, configure em Providers.

**Pronto quando:** um e-mail de teste em Authentication → Users → "Send magic link" chega pela caixa do Resend.

## 3. Supabase — segredos dos workers (Vault)

O banco chama o app por `pg_cron` + `pg_net` para enviar e-mails da fila, reconciliar verificações e concluir
exclusões de conta. Ele lê o endereço e o segredo de cada worker no Vault. Supabase → Project Settings → Vault
→ New secret, com estes nomes exatos:

| Nome no Vault | Valor |
|---|---|
| `outbox-worker-endpoint` | `https://SEU-DOMINIO` |
| `resumo-worker-endpoint` | `https://SEU-DOMINIO` (RUN-026; chama `/api/internal/resumo`) |
| `outbox-worker-secret` | o mesmo valor de `OUTBOX_WORKER_SECRET` na Vercel |
| `verification-reconcile-endpoint` | `https://SEU-DOMINIO` |
| `verification-reconcile-secret` | o mesmo valor de `RECONCILE_WORKER_SECRET` na Vercel |
| `account-deletion-endpoint` | `https://SEU-DOMINIO` |
| `account-deletion-secret` | o mesmo valor de `ACCOUNT_DELETION_WORKER_SECRET` na Vercel |

Gere cada segredo com 32 bytes aleatórios (por exemplo `openssl rand -hex 32`), um diferente por worker.

O job `bivaque-resumo-cidade` roda a cada dez minutos e usa `resumo-worker-endpoint` e o segredo já existente `outbox-worker-secret` (`OUTBOX_WORKER_SECRET`). Sem os dois valores, não chama o worker. Não há segredo novo. Ele avalia até 100 membros por chamada, diário por dia UTC ou semanal por semana UTC (segunda-feira), desligado por padrão. O envio continua exclusivamente no outbox e sob o teto existente de 5.000 por lote. Cada seção mostra até 20 itens e aponta para a lista completa no app. O link de descadastro funciona sem login, com token aleatório de 32 bytes; o banco guarda só o hash fora do outbox. Vale por até 30 dias, até o próximo resumo ou uso. Desligar também cancela os resumos pendentes. Preferência, disponibilidade da conta e visibilidade do conteúdo são revalidadas antes de enviar.

**Pronto quando:** depois do deploy (passo 4), um convite ou código de entrada sai do outbox em até um minuto.

## 4. Vercel — publicar o app

1. Projeto **bivaque-community-web** → Settings → Git → **Connect** ao repositório `Juanjfmr/bivaque-community`
   (a ligação anterior está salva em `.visual/vercel-git-link-backup-2026-11-05.json`: root `apps/web`).
2. Settings → Git → **Production Branch** = `producao`.
3. Settings → Environment Variables (ambiente Production):

| Variável | De onde vem |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `SUPABASE_URL` | igual ao Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role (só servidor) |
| `NEXT_PUBLIC_SITE_URL` | `https://SEU-DOMINIO` |
| `BIVAQUE_APP_ORIGINS` | `https://SEU-DOMINIO` (origens que podem chamar as rotas do app; separe por vírgula) |
| `BIVAQUE_LIMITER_PEPPER` | 32 bytes aleatórios (limitador de entrada e convites; obrigatório em produção) |
| `PORTAL_DADOS_API_KEY` | chave da API do Portal da Transparência (verificação por CPF) |
| `RESEND_API_KEY` | Resend → API Keys |
| `RESEND_FROM_EMAIL` | remetente no domínio verificado, ex. `Bivaque <avisos@SEU-DOMINIO>` |
| `WEB_PUSH_PUBLIC_KEY` | par de chaves VAPID do Web Push (chave pública; é a única que vai ao navegador) |
| `WEB_PUSH_PRIVATE_KEY` | par de chaves VAPID do Web Push (chave privada; só servidor, nunca no repositório ou no bundle) |
| `WEB_PUSH_CONTACT` | contato exigido pelo padrão VAPID, ex. `mailto:avisos@SEU-DOMINIO` (não é segredo) |
| `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` | Upstash → banco Redis (limites de envio) |
| `OUTBOX_WORKER_SECRET` | o mesmo do Vault `outbox-worker-secret` |
| `RECONCILE_WORKER_SECRET` | o mesmo do Vault `verification-reconcile-secret` |
| `ACCOUNT_DELETION_WORKER_SECRET` | o mesmo do Vault `account-deletion-secret` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | e-mail de suporte que aparece na Ajuda |
| `SENTRY_DSN` | opcional (erros em produção) |
| `RLS_PROBE_EMAIL` e `RLS_PROBE_PASSWORD` | opcional (conta de teste do probe de RLS do operador) |
| `BIVAQUE_AUTH_BYPASS` | **não definir em produção**: só vale em `development`. Em `test`, `production` ou `NODE_ENV` ausente, o proxy responde 503 com log e não libera a rota (ADR-20261110-superficie-publica-do-proxy) |

O push no aparelho (RUN-137) usa o par de chaves VAPID. Gere uma vez com
`npx web-push@4.0.0 generate-vapid-keys` e guarde os três valores nas variáveis acima. Sem
`WEB_PUSH_PUBLIC_KEY`/`WEB_PUSH_PRIVATE_KEY`, o envio fica desligado — sem erro e sem retentativa — e o
app não oferece o interruptor de push. A chave privada nunca aparece em log, no repositório ou no bundle
do cliente; a rota do app devolve só a pública.

**Nunca** defina `BIVAQUE_AUTH_BYPASS` em produção: fora de `development` o proxy
responde 503 com log, em vez de liberar a rota.

4. Settings → Domains: aponte o domínio.
5. Faça o push na `producao` (ou Redeploy). **Pronto quando:** `https://SEU-DOMINIO/api/health` responde
   `{"status":"ok"}` e a landing abre.

## 5. Textos legais

Termos de uso e política de privacidade revisados pelo advogado (cartão BLOCK-LEGAL-ENTRY). O aceite da entrada
mostra a versão vigente; sem o texto aprovado, o piloto não deve receber pessoas de fora.

## 6. Primeiro cadastro (teste de fumaça)

Com tudo acima pronto, avise o coordenador: ele roda o teste de fumaça de ponta a ponta contra o domínio —
`/api/health`, entrada por código no e-mail, verificação por CPF (ou envio de documento), escolha da cidade e
chegada ao Início — e reporta o resultado. Depois disso, convide os primeiros membros.

---

Referências: `docs/PILOT_RUNBOOK.md` (operação do piloto e incidentes), `docs/LANCAMENTO.md` (atos do dono),
`docs/decisions/ADR-20261101-entrada-unica-por-codigo.md` (limites de entrada).
