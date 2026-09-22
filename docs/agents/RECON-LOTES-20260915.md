# Fatiamento da integração por RECON — 15/09/2026

> Registro histórico do plano de 15/09. Em 22/09, a `main` já contém os lotes
> promovidos pela campanha `test/teste-em-massa` e trabalhos posteriores. Os PRs
> #71, #74 e #75 ainda estão abertos; suas bases, conflitos e provas devem ser
> verificados no GitHub atual antes de qualquer promoção. Este documento não é
> mais a fonte operacional do estado de integração.

## Decisão e base

O dono pediu que a integração fosse promovida por lotes RECON, em vez de uma
única PR de integração. A sequência abaixo registra a decisão naquele momento.

- Base de cada lote: a `origin/main` no momento de abrir a PR, mais somente as
  PRs predecessoras já aprovadas e merjadas.
- Linha monolítica preservada para consulta: `test/teste-em-massa` (`cd001a6`),
  156 commits à frente da `origin/main` e 2 commits atrás. Ela **não** é uma
  candidata de merge.
- O rebase de teste confirmou que a promoção monolítica conflita repetidamente
  em `tools/backend-kanban/public/board.json` e no `BOARD.md` gerado. Não houve
  resolução persistida; o rebase foi abortado.
- PR #65 continua fora da base até receber revisão aprovada e responder ao
  apontamento de cobertura de rotas. Nenhum lote assume que ela foi merjada.

Cada PR deve conter somente o seu contrato, o estado canônico do card afetado,
`BOARD.md` regenerado e a prova pedida no contrato. Não copiar o histórico de
um branch `fix/recon-*`: vários deles já acumulam RECONs anteriores.

## Ordem dos lotes

| Ordem | Lote / PR | Dependências de merge | Situação de partida |
| --- | --- | --- | --- |
| 1 | RECON-018 — entrada | nenhuma | candidato isolado; 1 commit, sem migration |
| 1 | RECON-021 — busca global | nenhuma | candidato isolado; 1 commit, sem migration |
| 1 | RECON-033 — fidelidade de publicação/operação | nenhuma | requer reconciliação manual antes de abrir PR; o commit `4222035` conflita com a main atual |
| 2 | RECON-019 — admissão | nenhuma; revisão R3 obrigatória | 1 migration; o bloqueio legal alcança somente reconhecimento automático por IA |
| 2 | RECON-020 — perfil | nenhuma; revisão R3 obrigatória | 1 migration; conferir autorização/visibilidade de afiliação antes de PR |
| 2 | RECON-029 — pergunta em evento | nenhuma | 2 migrations, domínio de evento isolado |
| 2 | RECON-030 — artigo do Guia | nenhuma | 1 migration, base para itens salvos do Guia |
| 2 | RECON-031 — configurações | nenhuma | 1 migration, domínio de preferências isolado |
| 2 | RECON-034 — imagens de comunidade | nenhuma | 1 migration; predecessor visual de RECON-038 |
| 2 | RECON-035 — resposta que resolveu | nenhuma | 1 migration; prova de banco ainda necessária |
| 3 | RECON-022 — ficha e criação de pedido | nenhuma | fundação do domínio `service_requests` |
| 4 | RECON-023 — acompanhamento de pedido | RECON-022 | usa a tabela/conversa criadas no RECON-022 |
| 5 | RECON-024 + RECON-044 — painel do prestador | RECON-022 e RECON-023 | reconstruir sobre o schema canônico, por migration aditiva; o commit original do 024 não é mesclável sozinho |
| 6 | RECON-025 + RECON-027 + RECON-039 — fundação única de anúncios | nenhuma | exceção obrigatória: os RECONs 025 e 027 criam `listings` incompatíveis; 039 já escolheu o schema canônico e precisa entrar no mesmo lote de fundação |
| 7 | RECON-026 — meus anúncios | fundação de anúncios | adaptar ao `listings` canônico; não reutilizar a migration duplicada do branch de origem |
| 7 | RECON-028 — alertas de moradia | fundação de anúncios | depende de `listing_alerts` e do ciclo de vida canônico |
| 8 | RECON-032 — salvos | RECON-030 e fundação de anúncios | as abas Guia/Mercado/Imóveis só são reais com essas origens |
| 9 | RECON-038 — shell/Início | RECON-034, RECON-032 e fundação de anúncios | extrair apenas as mudanças próprias; não reutilizar seu branch acumulado |
| 10 | RECON-040, 042–052 e 055 | seus respectivos lotes base | são reconciliações posteriores acumuladas; cada uma será reextraída em PR própria após diff contra a base já merjada |

## Exceções que não podem ser divididas artificialmente

### Pedidos a prestador

`RECON-024` criou uma segunda definição de `service_requests`, com timestamp
anterior à fundação do `RECON-022`. Mesclá-lo como PR independente faz banco
limpo falhar e perde `provider_user_id` e `idempotency_key`. O lote de operação
do prestador deve, portanto, ser refeito como `RECON-024 + RECON-044`: a
migration `20260912063553_reconcile_service_requests.sql` acrescenta os campos
de operação sobre a tabela do RECON-022, sem editar migration aplicada.

### Mercado e Moradia

`RECON-025` e `RECON-027` também definiram `listings` de maneiras
incompatíveis. O `RECON-039` registrou a decisão já autorizada: usar o schema
de Moradia como canônico e transportar os requisitos de Mercado para a borda de
escrita. Logo, esses três números compõem uma única fundação R3; separá-los em
PRs que criam schemas concorrentes seria só deslocar o conflito para a main.

## Método de extração por lote

1. Criar o branch do lote a partir da base declarada, não da linha monolítica.
2. Comparar o commit de origem apenas nos `allowed_paths` do contrato; trazer
   código e testes do RECON, sem o `board.json` histórico acumulado.
3. Para lotes com banco, aplicar migrations em stack local limpo, executar
   `test:db` sem seed e regenerar tipos públicos quando o schema mudar.
4. Rodar os gates, a prova visual e a jornada E2E exigidos pelo contrato.
5. Fazer revisão independente e registrar no card somente evidência da revisão
   atual. Um gate anterior na linha monolítica não serve como prova do lote.
6. Só então atualizar o card e regenerar `BOARD.md`; a próxima PR usa a main
   que recebeu a predecessora.

## Primeiro lote de execução

O primeiro candidato é `RECON-018` (entrada): não possui migration, tem um só
commit de origem (`2cbdccc`) e não depende de outro RECON. A extração deve ser
feita em branch novo sobre a `origin/main`, com a mudança de quadro removida do
commit histórico e recriada somente com prova atual.

`RECON-021` e `RECON-033` ficam paralelos em prioridade, mas cada um abre uma
PR própria e passa pelo mesmo ciclo de revisão e runtime. Os lotes R3 de
admissão, perfil, pedidos e anúncios não avançam para merge apenas por terem
interface pronta: exigem a prova de banco e a revisão independente previstas
nos contratos.

## Descoberta durante a extração

Em 16/09, aplicar o commit de origem do `RECON-033` (`4222035`) sobre a main
atual abriu conflitos reais em `apps/web/app/(admin)/layout.tsx`, no detalhe de
comunidade, no seletor de público da publicação, em `scripts/visual/capture.mjs`
e no quadro canônico. Portanto ele deixa de ser candidato de cherry-pick puro:
o próximo executor deve comparar o comportamento dos dois lados, reconstruir a
composição no branch novo e provar as telas de operação. Não foi escolhido
automaticamente nenhum lado do conflito e o worktree de tentativa ficou limpo.
