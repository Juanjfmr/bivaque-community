# Inventário de estados — Bivaque Community

**Data da inspeção:** 09/11/2026. **Referência:** `main`, revisão `9e21be5674`.
**Status:** auditoria estática inicial das jornadas F01–F10 e dos contratos de navegação, API e domínio.
Este inventário não substitui o rastreamento de todas as chamadas nem comprova os caminhos de
runtime. Evidências de teste são necessárias antes de classificar um fluxo como concluído.

## Critério de modelagem

- **Máquina explícita** quando as transições têm guardas, confirmação, efeitos assíncronos, permissões
  ou estados terminais. Modelar eventos e estados como uniões discriminadas e funções puras.
- **Estado simples** para campos de formulário, filtros de apresentação e toggles independentes.
- **Estado remoto** pertence à API e ao banco/RLS; o cliente não altera o status por suposição.
- **Estado de leitura** diferencia carregando, vazio legítimo, acesso negado, sessão vencida,
  erro recuperável e conteúdo. Uma falha não pode virar lista vazia.
- Não introduzir XState ou outro orquestrador enquanto a combinação de tipos, funções puras,
  TanStack Router/Query e testes existentes resolver o problema.

## Catálogo auditado

| Área | Estados e eventos relevantes | Guarda / efeito / fonte de verdade | Situação | Próximo passo |
| --- | --- | --- | --- | --- |
| Navegação e histórico | entrada, rota, filtros, sobreposição, voltar, restaurar foco/rolagem | TanStack Router; `lib/navegacao/entrada.ts`, `transicoes.ts` e `react.tsx` | Já explícita, com risco concorrente | **P0**: reproduzir e resolver `APP-SOBREPOSICAO-ENTRADA-CORRIDA` |
| Carregamento e restauração | pendente, confirmado, cancelado, liberado sem tela | `lib/navegacao/restauracao.ts`, `src/contexto/cargas.tsx`; AbortSignal | Já explícita | **P1**: validar respostas tardias e foco após navegação |
| Autenticação e sessão | credencial ausente, cookie, bearer, conflito, token inválido, autenticada/recusada | `apps/web/lib/app-api/{contrato,sessao}.ts`; sessão real no servidor | Já explícita; área de segurança | Manter contratos negativos; não alterar sem testes de RLS |
| Entrada F01 e retomada | porta, código, aceite, CPF, verificação, documento, cidade, interesses, início | `src/previa-f01/fluxo.ts`, `src/entrada/estado.ts`; draft versionado no servidor | Já explícita | **P1**: testar falhas e retomada real entre dispositivos |
| Verificação documental | sem documento, em análise, substituição, aprovado | `apps/web/lib/onboarding/document-status.ts`; decisão administrativa | Parcialmente explícita | **P1**: provar efeitos de aprovação/rejeição e expiração |
| Entrada via e-mail e OAuth | envio, limite, e-mail inválido, código inválido, autenticado, indisponível | `src/entrada/servidor.ts` e APIs `entry/*` | União tipada, vários sistemas envolvidos | **P1**: matriz de retries, bloqueios e retomada |
| F02 busca e início | digitação, filtro, paginação, carregamento, vazio, falha, resultado | `src/telas/Busca.tsx`; API de busca | Estado de consulta | **P2**: validar mudança de busca durante fetch |
| F03 criação | rascunho, edição, validação, envio, publicado, erro | `src/criar/*` e `lib/rascunhos-criacao.ts`; API para publicação | Parcialmente implícita | **P1**: impedir duplicação e perda de rascunho |
| F04 entrada em grupo | fora, pedido pendente, membro, admin; solicitar, cancelar, entrar, sair | `src/grupos/Participacao.tsx`; API e RLS | Estado remoto explícito; interação local implícita | **P1**: dupla submissão, guarda por papel, testes negativos |
| F04 publicações | redigir, enviar, comentar, salvar, ocultar, denunciar, fixar | `src/grupos/{Escrever,AcoesDaPublicacao}.tsx` | Interações distribuídas | **P1**: mapear operações simultâneas e rollback |
| F05 eventos | criação/edição, presença, cancelamento, perguntas | `src/eventos/*`, `apps/web/lib/events/event-form.ts`; RLS | Formulários tipados; async local | **P1**: distinguir confirmação e falha sem perder texto |
| F06 ciclo do anúncio | draft, active, paused, reserved, sold, closed; publish, pause, reactivate, reserve, sell, close | `apps/web/lib/listings/lifecycle.ts` espelha RPC; banco é autoridade | **Máquina explícita** | Conservar invariantes e cobertura RPC |
| F06 diálogo gerenciar anúncio | livre, confirmando pause/close, executando edição/transição | `src/mercado/estado-de-gestao.ts` + `gerenciar.tsx` | **Corrigido na branch desta auditoria** | Rodar gate + prova de UI e regressão |
| F06 listagem e paginação | primeira leitura, mais páginas, troca de filtro/cidade, erro de página | `src/telas/MeusAnuncios.tsx` e `src/telas/Mercado.tsx` | Parcialmente implícita | **P1**: não anexar página antiga após trocar filtro/cidade |
| F07 solicitação de serviço | open, in_conversation, closed, cancelled; enviar, responder, cancelar, encerrar | `apps/web/lib/service-requests/{status,tracking}.ts` + `src/negocios/formulario.ts` | Status explícito; interação local simples | **P2**: verificar transições no banco e duplicidade |
| F08 guia | buscar, salvar, sugerir correção, enviar, erro | `src/guia/Verbete.tsx`; API guia | Estado de interface | **P2**: testar erro recuperável e atualização de cache |
| F09 conversas | carregar, enviar, paginar, erro, sessão vencida, negado, ausente | `src/telas/Conversa.tsx`; API conversa | Estados independentes | **P1**: proteger envios rápidos e página tardia |
| F09 preferências de avisos | carregando, editado, salvando, gravado, erro; tipos e canais | `src/avisos/PreferenciasDeAvisos.tsx` | **Implícita** | **P1**: impedir sobrescrever edição feita durante salvamento |
| F09 entrega por outbox | pending, sent, failed, skipped; tentativa, retry, desistência | `packages/domain/src/outbox.ts`; worker servidor | **Máquina explícita** | **P1**: testar idempotência e falha do provedor |
| F10 família | enviar convite, pendente, revogar, aceitar, erro | `src/voce/Familia.tsx`; API, RLS | Parcialmente implícita | **P1**: não concorrer convite e revogação |
| F10 exclusão de conta | confirmação, enviando, pendente, falha, conclusão | `src/telas/ApagarConta.tsx`; backend de exclusão | Parcialmente implícita, sensível | **P0**: proteger confirmação e impedir ações contraditórias; prova negativa |
| Operação interna | revisão documental, denúncia, suspensão, avisos | `apps/web/app/(admin)/`; decisões no servidor | Workflow sensível; inventário incompleto | **P0**: auditar autorização e transições com RLS e trilha de auditoria |

### Problemas concretos encontrados no código

1. **Operações concorrentes na gestão de anúncios:** `salvando`, `mudando`, `confirmarPausar` e
   `confirmarEncerrar` eram independentes. A nova máquina impede salvar/alterar situação ao mesmo
   tempo e exige confirmação correspondente, sem antecipar o status do banco.
2. **Respostas tardias de paginação:** `MeusAnuncios.tsx` e `Grupo.tsx` mantêm um
   `AbortController` de paginação por montagem; a mudança de cidade, grupo ou ordenação não o
   cancela necessariamente. Uma página iniciada com filtro antigo pode entrar no conjunto novo.
   **Candidato a reprodução E2E**, não considerado corrigido.
3. **Preferências alteradas enquanto salvam:** `PreferenciasDeAvisos.tsx` só desabilita o seletor
   de resumo; os demais checkboxes continuam editáveis. Ao chegar a resposta, a substituição por
   `gravadas` pode apagar escolhas feitas durante o envio. **Candidato a correção isolada.**
4. **Sobreposição na primeira renderização:** risco já registrado como
   `APP-SOBREPOSICAO-ENTRADA-CORRIDA` no quadro canônico. Não duplicar o card.
5. **Diferentes camadas de estados:** resultado da API, permissão RLS e estado transitório da tela
   não devem ser fundidos numa única máquina global.

## Contrato de estados para agentes (AX)

Para cada mudança posterior, declarar no mesmo PR:

1. **Fonte canônica:** cliente, API, RPC ou RLS; nunca duplicar a autoridade de negócios.
2. **Estado + evento + guarda + efeito + retorno:** documentados em tipos e testes.
3. **Estados proibidos:** demonstrados por testes de transição negativa, concorrência e retry.
4. **Observabilidade sem dados pessoais:** mensagens técnicas sanitizadas; erros legíveis ao membro.
5. **Prova:** unidade, tipagem, build, API/RLS negativa e E2E no fluxo tocado.
6. **Compatibilidade:** não alterar contratos de API, rotas, formato de persistência, sem ADR e
   testes de migração; preservar comportamento atual fora do bug tratado.

### Lote desta branch

- `apps/app/src/mercado/estado-de-gestao.ts`: máquina pura com estados discriminados.
- `apps/app/src/mercado/gerenciar.tsx`: liga a máquina à interface, sem dependência nova.
- `apps/app/tests/mercado-gestao.test.ts`: sete testes de transição e concorrência.

**Verificação exigida antes de mesclar:** `npx pnpm@11.18.0 gate`, testes da app,
`typecheck`, `build`, E2E do gerenciamento do anúncio em 375/768/1440 nos dois temas,
e casos positivos/negativos da RPC de mudança de status. Não considerar concluída sem
resultado observado: inspecionar CI do PR e registrar limitações.
