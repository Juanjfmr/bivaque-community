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

**Lacunas observadas na main 37702a86:** o job gate não inicializa a stack nem escreve o env;
o `scripts/gate.mjs` dessa revisão permite pular o build sem `.env.local`. Portanto, job verde
não prova build executado. O gate desta branch local já exige build: não confundir as duas versões.
Não há dry-run, exclusão de execuções simultâneas ou guarda explícita de branch no disparo manual.
O workflow também não exige por código o resultado completo de pgTAP/E2E do mesmo SHA.
São pendências de implementação da pipeline, não passos já entregues. Registrar no Kanban e
corrigir/revisar o workflow antes de declarar a publicação protegida. Este lote documental não
executa deploy nem altera secrets, permissões ou a pipeline.

Operação, backup, resposta a falhas e rollback: [PILOT_RUNBOOK.md](../docs/PILOT_RUNBOOK.md).

## Dados e privacidade

A Data API não expõe o schema `private`; anon/authenticated não recebem privilégios de tabela nele.
Preserve RLS forçada, grants mínimos e apenas helpers explicitamente autorizados. Contas familiares
continuam Auth users independentes; convite não transfere propriedade de dados.

CPF bruto, payload do Portal, OM inferida, patente e selo público de verificação não são persistidos.
O [ADR de localização](../docs/decisions/ADR-20261022-localizacao-padrao-de-mercado.md) substitui a
proibição geral de CEP/coordenadas: origem do perfil somente para cálculo, fora de leitura por outros
membros; imóvel com mapa exato/aproximado e endereço por escolha do anunciante. BrasilAPI e Google
de reserva são os fornecedores aprovados, com chamada no servidor e cache. OM declarada para cálculo
próprio é autorizada; exposição da afiliação a terceiros continua pendente (BLOCK-AFFILIATION).
Documentos ficam somente no fluxo privado de verificação; PDF válido é preservado byte a byte.
Aplicam-se descarte, exclusão e provas positivas/negativas; nenhuma dessas autorizações permite
exposição pública ou retenção indefinida. As provas de DATA-001/DATA-002 da main não significam
que este checkout antigo já contém suas migrations.
Portal é server-only, com fixtures nos testes, sem CPF real ou chamadas live.
