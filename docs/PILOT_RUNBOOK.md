# Bivaque Community — Pilot Runbook

Versao alvo: piloto fechado de Manaus, com admissao por verificacao (cadastro aberto + verificacao de elegibilidade via Portal).

Este documento descreve os procedimentos operacionais, de privacidade e de
incidente para o operador humano que conduz o piloto fechado do Bivaque
Community. Nao substitui julgamento profissional nem constitui declaracao de
conformidade legal.

Todos os comandos citados sao executaveis na raiz deste repositorio com
`npx pnpm@11.18.0 <script>`. Os lugares de console listados referem-se ao
dashboard do Supabase (`https://supabase.com/dashboard`) e ao console de
execucao Next.js em producao.

---

## 1. Pre-requisitos do operador

- Acesso ao dashboard do Supabase do projeto de producao (projeto separado de
  dev e teste).
- Acesso ao servidor onde a aplicacao Next.js esta implantada.
- Acesso de leitura a este repositorio. O `.env` de producao so e acessado
  em excecao de incidente — o check diario do Portal usa o probe
  `/api/admin/portal-health`, nao a chave local.
- Pelo menos duas contas de teste com perfis em Manaus (uma verificada como
  `active_federal_military`, uma como `rejected`).
- Ambiente local com Node >= 22, Docker rodando (para a stack local do
  Supabase) e `npx pnpm@11.18.0` funcional.

**Variaveis de ambiente do operador (nunca commitadas):**

| Variavel | Uso | Exposicao |
|---|---|---|
| `SUPABASE_URL` | URL do projeto Supabase de producao | Servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de service role (privilegios elevados) | Servidor — nunca cliente |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase exposta ao navegador | Cliente |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anonima exposta ao navegador | Cliente |
| `PORTAL_DADOS_API_KEY` | Chave da API do Portal da Transparencia | Servidor — nunca cliente |
| `RLS_PROBE_EMAIL` | E-mail da conta de teste do probe de RLS (usuário comum) | Servidor |
| `RLS_PROBE_PASSWORD` | Senha da conta de teste do probe de RLS | Servidor — nunca cliente |

O arquivo `.env` e gitignorado. O arquivo `.env.example` contem apenas
placeholders (`<...>`) e e seguro commit. A chave do Portal vive no header
HTTP `chave-api-dados` enviado pelo servidor Next.js — nunca aparece no
trafego do navegador.

---

## 2. Portal token stewardship (chave-api-dados)

A chave da API do Portal da Transparencia (`PORTAL_DADOS_API_KEY`) e o segredo
operacional mais sensivel do piloto. Compromete-la expoe todos os CPFs
verificados ao operador de uma chave valida do Portal.

### Checklist diario de stewardship

- [ ] Confirmar que `PORTAL_DADOS_API_KEY` esta presente no `.env` de producao
      e que o valor nao aparece em nenhum log, commit ou ticket.
- [ ] Verificar no dashboard do Supabase se a service role key nao foi exposta
      (Logs → Edge Functions / API logs — buscar por `chave-api-dados` ou
      `service_role` em payloads de resposta).
- [ ] Executar localmente: `npx pnpm@11.18.0 test:secrets` — confirmar que o
      scanner nao encontra secrets nos tracked files.

### Rodizio de chave

Se houver suspeita de comprometimento:

1. Solicitar nova chave no portal `https://api.portaldatransparencia.gov.br`.
2. Atualizar `PORTAL_DADOS_API_KEY` no `.env` de producao.
3. Reiniciar o servidor Next.js para recarregar a variavel.
4. Revogar a chave antiga no portal.
5. Registrar data, motivo e novo identificador da chave (nunca o valor).

### Verificacao apos atualizacao

```sh
# Teste local com a nova chave (nao commitar o .env de producao)
SUPABASE_URL="<url>" \
SUPABASE_SERVICE_ROLE_KEY="<key>" \
PORTAL_DADOS_API_KEY="<nova-chave>" \
npx pnpm@11.18.0 test:unit -- tests/unit/portal/
```

---

## 3. Admissao — cadastro aberto com verificacao

O cadastro e aberto: qualquer pessoa cria conta (magic link ou Google OAuth) e
segue para a verificacao de elegibilidade. O acesso so se completa apos a
verificacao no Portal da Transparencia. O operador nao emite convites: monitora
a fila de verificacao e age quando ela falha ou estagna.

### Checklist de monitoramento da admissao

- [ ] Confirmar que o novo usuario entrou pelo fluxo de onboarding (magic link
      ou Google OAuth) e criou conta.
- [ ] Verificar que o email do usuario nao esta associado a uma conta
      existente (Supabase Dashboard → Authentication → Users → buscar email).
- [ ] Confirmar que o usuario pertence ao publico elegivel: militar federal
      ativo, veterano (`reformado`) ou pensionista militar federal, com vinculo
      ao municipio de Manaus.
- [ ] Monitorar a verificacao pendente: quando o Portal nao responde ou a
      verificacao estagna, o operador diagnostica (secao 4) e reemite a
      verificacao se a causa for `TIMEOUT` ou `INVALID_KEY`.
- [ ] Registrar: data da admissao, email (hash), localidade (manaus-am).

### Comando de verificacao de admissao pendente

```sh
# Listar usuarios criados nos ultimos 7 dias (console SQL do Supabase):
select id, email, created_at, raw_app_meta_data
from auth.users
where created_at > now() - interval '7 days'
order by created_at desc;
```

### Nao fazer

- Nao aprovar manualmente quem nao passou pela verificacao do Portal.
- Nao pular a etapa de verificacao do Portal.
- Nao criar contas em lote sem rastreabilidade individual.

---

## 4. Verification failure response

Quando a verificacao do Portal da Transparencia falha, o usuario recebe uma
mensagem generica de rejeicao. O operador precisa diagnosticar a causa.

### Diagnosticos possiveis

| Codigo de erro | Causa | Acao do operador |
|---|---|---|
| `INVALID_KEY` | `PORTAL_DADOS_API_KEY` ausente ou invalida | Verificar `.env` de producao; seguir secao 2 (rodizio de chave) |
| `TIMEOUT` | Portal nao respondeu em 10s | Verificar status do Portal em `https://api.portaldatransparencia.gov.br`; reemitir verificacao |
| `RATE_LIMITED` (429) | Limite de requisicoes do Portal atingido | Esperar janela de rate limit; nao reemitir em loop |
| `HTTP_ERROR` | Erro HTTP inesperado do Portal | Verificar logs do servidor Next.js; inspecionar codigo HTTP |
| `SCHEMA_DRIFT` | Resposta do Portal mudou de formato | Abrir investigacao; nao alterar o classificador sem testes |
| Rejeicao por elegibilidade | CPF nao pertence ao publico-alvo | Resposta esperada — o usuario nao e elegivel |

### Checklist de resposta a falha de verificacao

- [ ] Confirmar nos logs do servidor qual codigo de erro foi emitido.
- [ ] Se `INVALID_KEY` ou `TIMEOUT`: corrigir a causa raiz.
- [ ] Se rejeicao por elegibilidade: nenhuma acao — resposta correta.
- [ ] Registrar: CPF (hash), codigo de erro, timestamp, acao tomada.
- [ ] NUNCA informar ao usuario o motivo exato da rejeicao (dado sensivel de
      elegibilidade).

---

## 5. Family-invite revocation

Contas familiares vinculadas (`family_account_links` no schema `private`)
podem precisar de revogacao. A revogacao remove o vinculo, mas nao exclui a
conta Auth do familiar.

### Checklist de revogacao

- [ ] Confirmar a identidade do titular e do familiar vinculado.
- [ ] No console SQL do Supabase (schema `private`):
      ```sql
      -- Identificar o vinculo
      select * from private.family_account_links
      where primary_user_id = '<uuid-do-titular>';
      ```
- [ ] Revogar o vinculo:
      ```sql
      delete from private.family_account_links
      where primary_user_id = '<uuid-do-titular>'
        and linked_user_id = '<uuid-do-familiar>';
      ```
- [ ] Confirmar que o familiar perdeu acesso aos recursos exclusivos (grupos,
      eventos privados) verificando via RLS helper:
      ```sql
      select private.is_locality_member('<uuid-do-familiar>', 'manaus-am');
      -- Deve retornar false se o familiar nao tiver perfil proprio em Manaus
      ```
- [ ] Registrar: data, UUIDs envolvidos, motivo da revogacao.

### Nao fazer

- Nao excluir a conta Auth do familiar — ele continua como usuario
  independente.
- Nao revogar sem confirmacao do titular.
- Nao expor dados de vinculo familiar em logs publicos.

---

## 6. Report resolution

Denuncias de conteudo (comunidade, DM, eventos) chegam via **notificacao in-app** (`report_resolved` na Onda 11 do plano de observabilidade, em `docs/superpowers/plans/2026-08-06-observabilidade-do-produto.md`) — o denunciante **nao** espera um e-mail externo, o sistema responde dentro da plataforma. O operador revisa e age pelo painel.

### Checklist de resolucao de denuncia

- [ ] Abrir o painel `/admin/reports` autenticado como operador (gate duplo: auth + `is_current_user_operator`).
- [ ] A fila lista abertas com idade em destaque; item com mais de 48h sem resolucao exige triagem imediata (ver §4).
- [ ] Clicar no item abre os detalhes; classificar: conteudo proibido (discurso de odio, assedio, exposicao de dados privados) ou falsa denuncia.
- [ ] **Ocultar** (acao `hide`): marca `is_deleted = true` no alvo (post, comentario ou grupo) via `service_role`. A UI some para todos. O sistema registra `operator_note` automatico.
- [ ] **Resolver** (acao `resolve`): marca `status = 'resolved'` com `operator_note`, `resolved_by` (operador) e `resolved_at`. O sistema emite notificacao `report_resolved` para o denunciante **sem revelar a acao tomada** — o runbook §6 antigo exigia isso, agora a plataforma cumpre.
- [ ] **Diagnostico SQL** (quando o painel nao bastar): preservado como passo de inspecao, NAO como primeiro passo. A coluna do autor e `user_id` (nao `author_id`), e `is_deleted` indica se o conteudo ja foi ocultado por moderacao:

      ```sql
      select id, user_id, group_id, locality_id, content, is_deleted, created_at
      from public.posts
      where id = '<post-id>';
      ```
- [ ] Se exposicao de dados privados (CPF, endereco, patente, organizacao militar): ocultar **imediatamente** via painel e escalar para revisao de incidente (secao 9).

### Como alguem vira operador

A tabela `public.operators` controla o acesso ao painel `(admin)/`. Nao ha UI para isso; a autorizacao e por SQL direto:

```sql
insert into public.operators (auth_user_id, granted_by)
values ('<uuid-do-novo-operador>', '<uuid-de-quem-autoriza>')
on conflict (auth_user_id) do nothing;
```

**Quem autoriza:** decisao do dono do produto. O runbook nao define; documente a politica interna (ex.: "apenas o admin principal concede; revogar com `delete from public.operators where auth_user_id = '<uuid>'`"). O acesso do painel e verificado pelo RPC `public.is_current_user_operator` (`apps/web/app/api/admin/route.ts` e migrations `20260806040949_operator_authorization.sql`, `20260806095803_fix_operator_repromotion.sql`, `20260806100231_restrict_operator_roster.sql`, `20260806111744_is_current_user_operator.sql`).

### Escalacao

---

## 7. Backup and rollback

### Backup

O banco de producao e hospedado no Supabase. Backups sao gerenciados pelo
Supabase (Dashboard → Database → Backups). Para backup manual:

1. Supabase Dashboard → Database → Backups → Create backup.
2. Anotar timestamp do backup.
3. Verificar que o backup esta acessivel (Download).

Nao ha backup via CLI para o projeto hospedado de producao — apenas para a
stack local de desenvolvimento.

### Rollback de emergencia

**Rollback de banco (Supabase hospedado):**
1. Supabase Dashboard → Database → Backups → selecionar backup → Restore.
2. Confirmar que o restore foi concluido.
3. Executar health checks (secao 8).

**Rollback da aplicacao (Next.js):**
1. Reverter para o deploy anterior no servidor de producao.
2. Verificar que as variaveis de ambiente nao mudaram.
3. Executar smoke test: `npx pnpm@11.18.0 test:e2e` contra o ambiente de
   producao (com SUPABASE_URL e credenciais de teste).

**Rollback local (desenvolvimento):**
```sh
# Destrutivo — apenas local, nunca --linked
npx pnpm@11.18.0 db:reset
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 db:lint
```

---

## 8. Waitlist communication (outras localidades)

A waitlist e candidatura a **outras localidades** (MAP §5.1), nao uma fila
para Manaus. Candidatos de localidades futuras registram o email no fluxo de
onboarding. O operador coordena a comunicacao com esses candidatos.

### Checklist de comunicacao

- [ ] Antes de cada comunicacao, revisar a posicao de cada candidato na fila.
- [ ] Enviar comunicacao apenas para o endereco registrado na lista de espera.
- [ ] Atualizar o status do candidato na lista de espera apos envio.
- [ ] Se o candidato nao responder em 7 dias, enviar um lembrete unico.
- [ ] Se nao houver resposta apos 14 dias, mover para lista de inativos.
- [ ] Nunca compartilhar a lista de espera ou os dados de contato dos
      candidatos com terceiros.

---

## 9. Daily health checks

Executar uma vez por dia durante o piloto.

### Checklist diario

- [ ] **CI/CD**: Verificar que o ultimo pipeline esta verde (lint, typecheck,
      test, test:db, test:e2e).
- [ ] **Supabase status**: Dashboard → verificar que o projeto esta `Active`
      e sem alertas.
- [ ] **Auth health**: Dashboard → Authentication → Users — verificar que ha
      novos usuarios validos (nem zero nem pico anormal).
- [ ] **Verificacao Portal**: Verificar logs para erros `INVALID_KEY`,
      `TIMEOUT`, `RATE_LIMITED`. Se houver mais de 5 erros em 24h, investigar.
- [ ] **Conexao com Portal**: Acessar `/api/admin/portal-health` autenticado
      como operador e confirmar `status: "ok"` (ou o codigo do §4 para
      diagnosticar). A chave nunca sai do servidor.
- [ ] **RLS e privacidade**: Acessar `/api/admin/rls-health` autenticado como operador e confirmar `status: "ok"` (ou `degraded` → investigar qual check falhou; `not_configured` → configurar `RLS_PROBE_EMAIL`/`RLS_PROBE_PASSWORD` no env). O probe roda 7 asserções de RLS com um usuário comum (nunca `service_role`) contra o banco de producao: `self_profile`, `private_verification`, `private_family`, `operators_insert`, `is_deleted_update`, `foreign_notifications`, `admissions_queue`. `test:privacy` e `test:secrets` sao suites de codigo, cobertas pelo CI a cada PR — **nao verificam producao**.
- [ ] **Verificacoes pendentes**: Verificar se ha admisssoes estagnadas ha mais
      de 48h sem verificacao concluida. Se houver, diagnosticar (secao 4) e agir.
- [ ] **Denuncias abertas**: Verificar se ha denuncias nao resolvidas. Zero
      denuncias abertas ha mais de 24h e a meta.
- [ ] **Custo do Supabase**: Dashboard → Billing — verificar se o consumo esta
      dentro do plano.
- [ ] **Registrar**: Data, operador, itens com anomalia, acoes tomadas.

### Comandos para health check rapido

```sh
# Executar toda a suite de qualidade local
npx pnpm@11.18.0 lint
npx pnpm@11.18.0 typecheck
npx pnpm@11.18.0 test
npx pnpm@11.18.0 test:secrets
```

---

## 10. Rollback tabletop test decision points

Este exercicio de mesa deve ser executado ANTES do inicio do piloto e repetido
a cada mudanca significativa de infraestrutura. Nao envolve acoes reais no
banco de producao — e uma discussao guiada por checklist.

### Cenario A: Chave do Portal comprometida

- [ ] **Decisao 1**: Quem detecta? (alerta de log? denuncia externa?)
- [ ] **Decisao 2**: Quem tem autoridade para revogar a chave?
- [ ] **Decisao 3**: A aplicacao continua funcionando sem verificacao de novos
      usuarios? Ou pausa novas admisssoes?
- [ ] **Decisao 4**: Quanto tempo entre deteccao e revogacao? Quem executa o
      rodizio?
- [ ] **Decisao 5**: Como os usuarios afetados sao comunicados?
- [ ] **Decisao 6**: O que precisa ser registrado para auditoria posterior?

### Cenario B: Dados privados expostos em post publico

- [ ] **Decisao 1**: Quem detecta? (denuncia de usuario? scan automatizado?)
- [ ] **Decisao 2**: A remocao e imediata ou requer aprovacao?
- [ ] **Decisao 3**: O post e removido (soft delete) ou permanentemente
      excluido?
- [ ] **Decisao 4**: O autor e notificado? Como?
- [ ] **Decisao 5**: Ha obrigacao de notificar o titular dos dados expostos?
- [ ] **Decisao 6**: O incidente escala para revisao formal (secao 12)?

### Cenario C: Supabase producao indisponivel

- [ ] **Decisao 1**: O status page do Supabase confirma outage? Ou e problema
      local?
- [ ] **Decisao 2**: Ha um plano de contingencia (fallback para projeto de
      contingencia)?
- [ ] **Decisao 3**: Por quanto tempo o piloto pode operar offline antes de
      pausar novas admisssoes?
- [ ] **Decisao 4**: Quem comunica aos testadores?
- [ ] **Decisao 5**: Quando restaurar, quais health checks validam a
      integridade?

### Cenario D: Usuario verificado tenta convidar familiar nao elegivel

- [ ] **Decisao 1**: O sistema bloqueia automaticamente (nao elegivel)?
- [ ] **Decisao 2**: O operador revisa manualmente ou a rejeicao automatica e
      suficiente?
- [ ] **Decisao 3**: O titular recebe qual mensagem?
- [ ] **Decisao 4**: Ha processo de apelacao?

### Registro do tabletop

Para cada cenario, preencher:

- Data do exercicio:
- Participantes:
- Decisoes registradas (por numero):
- Itens que precisam de acao antes do piloto:
- Itens que dependem de ferramenta ainda nao implementada:

---

## 11. Post-incident review

Aplicavel apos qualquer incidente que envolva: exposicao de dados privados,
comprometimento de chave, outage superior a 1 hora, ou denuncia grave.

### Checklist de revisao pos-incidente

- [ ] **Cronologia**: Registrar linha do tempo com horarios (fuso de Manaus,
      America/Manaus, UTC-4).
- [ ] **Escopo**: Determinar usuarios, tabelas e periodo afetados.
- [ ] **Causa raiz**: Documentar o que permitiu o incidente (erro humano, falha
      de sistema, ataque externo).
- [ ] **Contencao**: Listar cada acao de contencao tomada e seu efeito.
- [ ] **Correcao**: Descrever a correcao aplicada e como foi validada.
- [ ] **RLS e credenciais**: Confirmar que RLS esta ativa em todas as tabelas
      e que nenhuma credencial permanece comprometida.
      ```sql
      -- Verificar RLS ativa em tabelas public
      select tablename, rowsecurity
      from pg_tables
      where schemaname = 'public'
      order by tablename;
      ```
- [ ] **Comunicacao**: Listar quem foi comunicado, quando e como.
- [ ] **Prevencao**: Registrar o que muda no processo, codigo ou ferramental
      para evitar recorrencia.
- [ ] **Arquivamento**: Salvar esta revisao em local acessivel ao time (nao no
      repositorio publico).

---

## 12. Comandos de referencia rapida

```sh
# Qualidade de codigo
npx pnpm@11.18.0 lint             # Biome check
npx pnpm@11.18.0 typecheck        # tsc --noEmit
npx pnpm@11.18.0 test             # unit + privacy + scope
npx pnpm@11.18.0 test:unit        # vitest tests/unit
npx pnpm@11.18.0 test:privacy     # vitest tests/privacy
npx pnpm@11.18.0 test:scope       # node --test tests/scope/
npx pnpm@11.18.0 test:secrets     # secrets scanner
npx pnpm@11.18.0 test:e2e         # playwright

# Banco de dados (local, Docker necessario)
npx pnpm@11.18.0 exec supabase start       # Iniciar stack local
npx pnpm@11.18.0 exec supabase stop        # Parar stack local
npx pnpm@11.18.0 db:reset                  # Destrutivo — apenas local
npx pnpm@11.18.0 test:db                   # pgTAP tests
npx pnpm@11.18.0 db:lint                   # Supabase DB lint
npx pnpm@11.18.0 generate:types            # Gerar tipos TypeScript

# Migrations
npx pnpm@11.18.0 exec supabase migration new <nome>

# Build e deploy
npx pnpm@11.18.0 build            # Next.js build (apps/web)
```

---

## Avisos finais

- Este runbook nao contem segredos, tokens, chaves reais ou amostras de CPF.
- Nao publique capturas de tela do console do Supabase com dados reais.
- Nao copie dados sensiveis para issues publicas ou chats de suporte.
- Em caso de duvida operacional, escale antes de agir em producao.
- O `db:reset` e destrutivo e **nunca** deve ser executado com `--linked`.
