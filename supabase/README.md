# Supabase — desenvolvimento e publicação

Migrations em `supabase/migrations/` são a fonte do schema. Regras técnicas completas:
[AGENTS.md](AGENTS.md); autorização de produto e limites compartilhados: [AGENTS raiz](../AGENTS.md).
Esta documentação não provisiona, vincula ou publica um projeto.

## Ambientes e prova local

Desenvolvimento usa `config.toml` e Docker; ambientes hospedados de teste, desenvolvimento e
produção são projetos distintos. Confirme projeto/portas antes de operações destrutivas.
Worktrees isolam arquivos, não o banco. Nunca resete stack compartilhada ou remota para testar.
Não versione credenciais, referências de projeto geradas ou `.temp`.

Use o CLI instalado/pinado pelo repositório:

```sh
npx pnpm@11.18.0 exec supabase migration new <name>
npx pnpm@11.18.0 exec supabase start
# Somente na stack local isolada e sem processos escrevendo:
npx pnpm@11.18.0 exec supabase db reset --local --no-seed
npx pnpm@11.18.0 test:db
npx pnpm@11.18.0 db:lint
npx pnpm@11.18.0 generate:types
# Depois, estado de runtime/E2E separado:
npx pnpm@11.18.0 exec supabase db reset --local
```

Configure a aplicação para essa stack antes de build/E2E. Tipos gerados contêm somente `public`.
Fixtures pgTAP são sintéticas/transacionais; `seed.sql` contém personas locais descartáveis.
Não execute captura/dev server que escreve entre reset sem seed e pgTAP. Não edite migration aplicada;
a única exceção já autorizada está no [ADR de replay](../docs/decisions/ADR-20261022-replay-fixture-migration.md).

## Deploy: implementação atual e contrato de publicação

O workflow existente é [deploy-migrations.yml](../.github/workflows/deploy-migrations.yml):
- dispara em push para `main` ou `workflow_dispatch`;
- executa um job `gate` com `pnpm gate`;
- o job `migrate` depende dele, usa o environment `production`, recebe credenciais por secrets,
  vincula o projeto e executa `supabase db push` no CI.

Esse workflow publica **migrations**, não comprova deploy da aplicação web. Nomear um environment
`production` não comprova que aprovação/proteção esteja configurada no GitHub.
Não execute link/push produtivo localmente para contornar a pipeline.

Antes de publicar, exigir a revisão exata com regressão/CI e processo G6, autorização aplicável,
projeto de destino confirmado, backup/reversão previstos e revisão do conjunto pendente por dry-run.
Mudanças incompatíveis precisam de sequência compatível entre banco e aplicação; rollback do app
não reverte o banco. A documentação não substitui esses controles por uma promessa de automação.

**Lacunas observadas no workflow em 22/10/2026:** o job gate não inicializa a stack nem escreve o env
antes do build; não há dry-run, exclusão de execuções simultâneas ou guarda explícita de branch no
disparo manual. Ele também não exige por código o resultado completo de pgTAP/E2E do mesmo SHA.
São pendências de implementação da pipeline, não passos já entregues. Registrar no Kanban e
corrigir/revisar o workflow antes de declarar a publicação protegida. Este lote documental não
executa deploy nem altera secrets, permissões ou a pipeline.

Operação, backup, resposta a falhas e rollback: [PILOT_RUNBOOK.md](../docs/PILOT_RUNBOOK.md).

## Dados e privacidade

A Data API não expõe o schema `private`; anon/authenticated não recebem privilégios de tabela nele.
Preserve RLS forçada, grants mínimos e apenas helpers explicitamente autorizados. Contas familiares
continuam Auth users independentes; convite não transfere propriedade de dados.

CPF bruto, payload do Portal, OM inferida, patente, endereço residencial e selo público de verificação
não são persistidos. Force/OM autodeclaradas opcionais e fallback de identidade seguem as
[correções do dono](../docs/design/visual-guide-2026-09-06/DECISOES-2026-09-07.md) e decisões técnicas
aplicáveis: leitura por campo, processamento privado e descarte. Não restaurar proibições antigas
que contradigam a autorização atual; ela não aprova fornecedor ou retenção indefinida.
Portal é server-only, com fixtures nos testes, sem CPF real ou chamadas live.
