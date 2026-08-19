# Bivaque Community — mapa do estado atual

> Auditoria factual em 2026-08-19. Baseline: `main` em `ce918f12c1493b8dc6c95202f559856581c9832d`.
>
> Este documento descreve o que existe hoje. Não substitui `docs/BIVAQUE.md` (alvo) nem `docs/PRODUCT_STATUS.md` (registro operacional). Quando há conflito, código/teste/commit recente prevalece para estado implementado; decisão de produto continua vindo do canon.

## 1. Regra de leitura

Classificação usada aqui:

- `DONE` — ciclo principal entregue e evidência recente suficiente.
- `PARTIAL` — existe capacidade útil, mas falta parte do ciclo, sad path, gate ou integração externa.
- `BROKEN` — existe superfície/capacidade, mas há falha conhecida que impede tratá-la como pronta.
- `SPEC-ONLY` — decidido/documentado, sem implementação relevante.
- `NOT STARTED` — alvo conhecido, sem implementação.
- `OBSOLETE` — código/schema sem papel no produto atual e com remoção devida.

`docs/PRODUCT_STATUS.md` foi reconciliado por último em 2026-08-15. A P0 de localidades nacionais foi implementada e reconciliada depois disso; portanto várias linhas daquele documento estão corretas em estrutura, mas a data de reconciliação global está stale.

## 2. Estado do repositório e dos gates

| Área | Estado | Leitura |
|---|---|---|
| P0 localidades nacionais | `DONE` | runtime sem `PILOT_LOCALITY_ID` nas fronteiras cobertas, onboarding nacional, segunda localidade em seed/E2E e auditoria visual P0 fechada no commit `ce918f1` |
| Gate rápido (lint/typecheck/unit/scope/secrets) | `PARTIAL` | evidências recentes verdes, mas o pipeline completo não está saudável em `main` |
| Types drift | `BROKEN` | `supabase/database.generated.ts` contém BOM; PR #24 remove os 3 bytes e comprova que o passo então avança |
| pgTAP completo no CI | `BROKEN` | depois do BOM, `family-invite-locality.sql` aborta antes dos asserts por UUID de fixture incorreto e ainda declara `plan(6)` para cinco asserts; visto no PR #24 |
| Review automático Claude/DeepSeek | `PARTIAL` | reviews recentes terminaram sem achados, mas o check falha ao ultrapassar `--max-turns 40`; é falha do harness, não de produto |
| Visual P0 | `DONE` | cinco telas P0 em três viewports, high severity = 0 na execução registrada em `ce918f1` |
| Staging | `NOT STARTED` por decisão | não haverá staging; migrations vão a produção após gate. O risco é explicitamente aceito por D42 |

**Conclusão operacional:** antes de entregar o repositório a um executor autônomo de longa duração, o baseline precisa voltar a ter um gate completo confiável. Um agente trabalhando sobre CI estruturalmente vermelho perde a capacidade de distinguir regressão própria de dívida preexistente.

## 3. Entrada, identidade e confiança

| Capability | Estado | Evidência/leitura |
|---|---|---|
| Login magic link + Google | `DONE` para a UI | fluxo existe; callback real via mailpit/Google ainda não tem E2E real |
| Callback e sanitização de `next` | `PARTIAL` | código e fluxo injetado testados; callback real externo continua fora do E2E |
| Verificação CPF/Portal | `PARTIAL` | validação, anti-enumeração, timeout→`pending`, throttle e breaker existem; Portal real não é chamado em teste e decisão manual continua aberta |
| Upload documental | `PARTIAL` | bucket privado, TTL de 7 dias, metadata e fila existem; decisão do operador e expurgo ainda não fecham o ciclo |
| Admissão em duas fases | `PARTIAL` | P0 separou elegibilidade de escolha de localidade; D2 ainda precisa consolidar gate/status e ciclos de erro |
| Localidade nacional | `DONE` | catálogo canônico, escolha server-side e membership por localidade foram incorporados na P0 |
| Transferência origem↔destino | `NOT STARTED` | Onda T tem plano, mas nenhum commit de T aparece depois do fechamento P0 |
| Consentimento versionado | `PARTIAL` | persistência existe; publicação depende de código de conduta assinado e política de privacidade revisada |
| Convite familiar | `PARTIAL` | binding ao e-mail foi corrigido em 15/08; entrega do link, sad paths e ciclo completo ainda dependem de D2 |
| Waitlist geográfica | `OBSOLETE` | UI removida pela P0; schema/RPC antigos permanecem e devem sair antes de T conforme `PRODUCT_STATUS.md` |

## 4. Comunidade, grupos, eventos e indicações

| Capability | Estado | Leitura |
|---|---|---|
| Comunidades/vilas | `PARTIAL` | descoberta, pedido de entrada, aprovação básica e feed existem; E ainda precisa fechar home da vila, navegação, fila em lote, convite e perfil alheio |
| Feed por localidade | `PARTIAL` | P0 removeu hardcode de Manaus; D48 ainda exige que cidade deixe de ser sala e vire alcance/referência |
| Estado vazio por densidade | `DONE` | helper + unit + E2E recente; visual P0 fechada |
| Gestão de grupo | `PARTIAL` | leitura e parte das ações existem; ciclo de administrador incompleto |
| Server Actions de grupo/evento | `BROKEN/RISK` | o plano F registra seis ações usando `service_role` para autenticação e manda medir antes de corrigir; até isso ser resolvido não são base confiável |
| RSVP | `PARTIAL` | `interested`/`going`; falta `not_going`, aviso ao organizador e ciclo completo |
| Convite de evento | `PARTIAL` | schema/RLS/aceite existem; organizador não tem fan-out de envio |
| Encontro recorrente | `NOT STARTED` | tese mensal do produto ainda sem modelo/superfície |
| Pedir indicação | `PARTIAL` | publicação, listagem, resposta e parte do controle do autor existem; F fecha aviso, detalhe, escopo e salvos |
| Explorar indicações | `PARTIAL` | cards existem, mas navegação/detalhe e ciclo de resolução ainda não fecham o valor |

## 5. Vitrine e prestadores

| Capability | Estado | Leitura |
|---|---|---|
| Conta de prestador | `NOT STARTED` | D37 decide Auth + papel sem membership |
| Admissão/indicação de prestador | `SPEC-ONLY` | canon diz indicação por membro verificado; fluxo concreto ainda não existe |
| Ficha de prestador | `NOT STARTED` | alvo D45: identidade + catálogo + portfólio |
| Dashboard de prestador | `NOT STARTED` | anúncio/ficha, métrica e caixa de pedidos decididos |
| Busca de prestador | `NOT STARTED` | D44: categoria exata + `pg_trgm` no nome |
| Alcance pago | `NOT STARTED/BLOCKED` | D41/D27/D28; exige CNPJ e desenho de entitlement/billing antes de Asaas |

Não existe hoje uma fronteira de autorização de prestador que possa ser “aproveitada”. Ela precisa nascer junto com a primeira tabela/role de prestador; criar o papel antes das policies repetiria o padrão de vazamento que o repo já proíbe.

## 6. Mensagens

A máquina de DM existe e é útil como infraestrutura, mas **não deve ser tratada como feature pronta**.

- A UI atual ainda permite `Nova conversa` entre membros encontrados por grupo compartilhado, embora DM entre membros esteja adiada no canon.
- O contexto `provider` não existe na UI nem na autorização.
- A criação de conversa é feita por insert do cliente e ordenação de UUID no browser.
- O teste atual prova uma semântica errada de bloqueio: o bloqueado não envia, mas **o bloqueador continua podendo enviar**. Para um bloqueio real a relação precisa ficar fechada nos dois sentidos.
- `dm_reports` é uma fila separada que o painel de operação não lê.

Classificação: `PARTIAL + UNSAFE FOR G`. A onda G não deve abrir conversa membro↔prestador antes de corrigir contexto, criação, bloqueio e moderação da DM.

## 7. Moderação e operação

| Capability | Estado | Leitura |
|---|---|---|
| Denúncia de post/comentário/grupo | `PARTIAL` | `reports` + fila do operador existem |
| Denúncia de DM | `BROKEN OPERATIONALLY` | grava em `dm_reports`, mas nenhum painel a consome |
| Denúncia de indicação/prestador/evento | `NOT STARTED` | modelo unificado ainda não cobre os alvos que F/G introduzem |
| Motivo da denúncia | `PARTIAL/RISK` | texto livre é persistido; pode carregar PII |
| Ocultação de conteúdo | `PARTIAL` | post/comentário/grupo; outros tipos sem ação |
| Suspensão de pessoa | `NOT STARTED` | D38 decide flag + helper RLS em toda policy de escrita na mesma migration |
| Retorno ao denunciante | `NOT STARTED` | não existe ciclo de feedback |
| Admissões | `PARTIAL` | painel observa fila e SLA, mas não decide |
| RLS health | `PARTIAL` | probe existe; H precisa expandi-lo para as novas policies |

## 8. Infraestrutura e terceiros

| Capability | Estado | Leitura |
|---|---|---|
| `outbox` + `pg_cron` + `pg_net` | `PARTIAL` | caminho local implementado; produção ainda depende de deploy/configuração |
| Resend | `BLOCKED EXTERNALLY` | conta/domínio/DKIM/SPF não são resolvíveis pelo agente |
| WhatsApp | `BLOCKED EXTERNALLY` | número dedicado e veículo/CNPJ pendentes; canal deve degradar para e-mail |
| Upstash | `PARTIAL` | Portal + CPF ligados; cota de convite/leitura de perfil ainda faltam |
| Sentry | `PARTIAL` | SDK/scrub prontos; DSN de produção é externo |
| PostHog | `NOT STARTED` | exige base legal e allowlist de eventos sem conteúdo/PII |
| Asaas | `NOT STARTED/BLOCKED` | CNPJ e pricing/entitlement precisam estar fechados antes do webhook |
| Deploy migrations | `PARTIAL` | workflow existe; secrets de produção ainda precisam ser configurados |

## 9. Documentação e governança

- `docs/BIVAQUE.md` é o canon de produto e já incorpora P0/nacionalidade.
- `docs/PRODUCT_STATUS.md` continua sendo o melhor inventário de gaps, mas precisa nova reconciliação após P0/T/D2.
- `docs/superpowers/plans/README.md` registra a ordem P0 → T → D2 → E → F e afirma que G/H ainda não têm plano executável.
- PR #18 propõe `SPEC.md`, mas está aberto; **não é baseline de `main` e não deve ser tratado como contrato até merge**.
- PR #23 propõe novo instrumento de auditoria multiagente, também ainda fora do baseline.

## 10. Baseline que um executor deve receber

Não iniciar T ou qualquer onda longa até estes quatro pontos estarem verdadeiros:

1. `main` sem o BOM de `database.generated.ts`.
2. `family-invite-locality.sql` executando o número correto de asserts com fixtures válidas.
3. gate completo reproduzível com banco sem seed → pgTAP → banco com seed → E2E.
4. `PRODUCT_STATUS.md` reconciliado com o fechamento efetivo da P0.

Depois disso, o próximo trabalho de produto é T, não G/H.