# RUN-019 — LAN-TROCA, fase 1

Data: 06/11/2026. Branch: `chore/lan-troca`. Base conferida: `f64c1cab`. Worktree inicialmente limpo.

## Resultado aplicado

Decisão explícita do coordenador: executar o recorte agora. Foram adicionadas 13 regras temporárias (307) para 12 rotas antigas, em `apps/web/next.config.ts`, no padrão do PR #136. Todos os destinos foram conferidos em `apps/app/src/roteador.tsx` (TELAS_REAIS, montagem de paginas e base `/app`) e no catálogo `apps/app/lib/navegacao/rotas.ts`. Família entrou em Você pelo PR #147.

A regra `/messages?conversation=<uuid>` vem antes da caixa genérica e leva ao detalhe. O UUID preserva seu valor; query adicional segue pelo mecanismo do Next, inclusive a query conversation original. Valor vazio ou inválido segue para a caixa. Os IDs dos outros detalhes são preservados. As expressões de detalhes excluem os segmentos estáticos `novo` e `alertas`; as regras não capturam `/editar` nem subárvores. Todas as outras rotas continuam na web, com seus aliases e portões existentes.

Os 307 rodam antes do proxy. `/app` já é público por pasta no proxy: autenticação, autorização e recusas são do app e de suas APIs. Sem sessão, Conversas e Conversa mostram o estado de sessão vencida, sem conteúdo protegido. `proxy.ts`, roteador, APIs, telas de produto, ambiente e segredos não foram alterados.

O diagnóstico anterior era uma conferência integral; esta autorização o substitui para o recorte abaixo. **Fase 1 aplicada não significa LAN-TROCA integral concluído**, nem prova de runtime. A tabela mantém o inventário de 58 páginas: 12 rotas trocadas e 46 mantidas nesta fase.

## Tabela atual — rota antiga → destino ou permanência

| Rota antiga | Destino ou permanência | Conferência / motivo |
| --- | --- | --- |
| `/cidade/[id]` | Fica | Consulta outra localidade por UUID; o painel do app só recebe nome e não carrega essa localidade. |
| `/communities/[id]/indicar-prestador` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/communities/[id]/invite` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/communities/[id]` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/communities` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/community` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/configuracoes/bloqueados` | `/app/bloqueados` | Aplicado: 307; destino registrado no app. |
| `/configuracoes/conta` | Fica | Inclui saída de família, ausente no app. |
| `/configuracoes/familia` | `/app/voce` | Aplicado: 307; destino registrado no app. |
| `/configuracoes/notificacoes` | Fica | Não há preferências por canal no app. |
| `/configuracoes` | Fica | Leva às preferências de notificações; não há equivalente no app. |
| `/denuncias/[id]` | Fica | Não há acompanhamento de denúncia por ID no app. |
| `/denuncias/nova` | Fica | Não há formulário equivalente endereçável no app. |
| `/denuncias` | Fica | Não há lista/acompanhamento de denúncias; chamados são outro domínio. |
| `/events/[id]/editar` | `/app/evento/:id` (fica nesta fase) | Edição existe como ação local; falta entrada endereçável para abrir a edição. |
| `/events/[id]` | `/app/evento/:id` (fica nesta fase) | Bloqueado: detalhe antigo tem fan-out ausente na tela nova. |
| `/events/[id]/perguntas` | Fica | Histórico e parâmetro `com` não equivalem ao envio de uma pergunta no detalhe do app. |
| `/events/novo` | Fica | Criação existe em diálogo local, sem destino direto registrado. |
| `/events` | `/app/agenda` (fica nesta fase) | Bloqueado: a lista antiga inclui convites individuais; a Agenda nova não os lista. |
| `/explorar/busca` | `/app/busca` (fica nesta fase) | Pendência de compatibilidade: Busca lê casca.consulta e não q/search da URL. A jornada existe. |
| `/explorar` | `/app/busca` | Aplicado: 307; destino registrado no app. |
| `/explorar/servicos` | `/app/negocios` (fica nesta fase) | Pendência de compatibilidade: q/search/bairro/tipo/page da URL não são consumidos. A jornada existe. |
| `/groups/[id]` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/groups` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/guide/[id]/correcao` | Fica | Não há destino direto para correção do verbete por ID. |
| `/guide/[id]` | Fica | O verbete abre em estado local do Guia, sem rota por ID. |
| `/guide` | `/app/guia` (fica nesta fase) | Pendência de compatibilidade: filtros q/categoria da URL não são consumidos. A jornada existe. |
| `/guide/sugerir` | Fica | Não há formulário equivalente endereçável no app. |
| `/imoveis/[id]/editar` | Fica | Não há edição de anúncio na tela nova. |
| `/imoveis/[id]` | `/app/anuncio/:id` | Aplicado: 307; destino registrado no app. |
| `/imoveis/alertas` | Fica | Não há gestão de alertas de busca no app. |
| `/imoveis/novo` | Fica | Criação existe em diálogo local, sem destino direto registrado. |
| `/imoveis` | `/app/imoveis` (fica nesta fase) | Pendência de compatibilidade: filtros da URL não são consumidos pela lista. A jornada existe. |
| `/indicacoes/[id]` | `/app/pergunta/:id` | Aplicado: 307; destino registrado no app. |
| `/indicacoes` | Alias existente mantido | Já usa redirect() de página; só pedir=1 abre a caixa na jornada antiga em /community. Não preserva q. |
| `/inicio` | `/app/inicio` | Aplicado: 307; destino registrado no app. |
| `/invite/[token]` | Fica | Fluxo do servidor expressamente fora do escopo. |
| `/localidade` | Fica | Abas e serviços por localidade não têm equivalente completo no app. |
| `/mercado/[id]/editar` | Fica | Não há edição de anúncio na tela nova. |
| `/mercado/[id]` | `/app/anuncio/:id` | Aplicado: 307; destino registrado no app. |
| `/mercado/novo` | Fica | Criação existe em diálogo local, sem destino direto registrado. |
| `/mercado` | `/app/mercado` (fica nesta fase) | Pendência de compatibilidade: filtros da URL não são consumidos pela lista. A jornada existe. |
| `/messages/[id]` | `/app/conversa/:id` | Aplicado: 307; destino registrado no app. |
| `/messages` | `/app/conversas` | Aplicado: 307; destino registrado no app; conversation UUID tem prioridade e abre o detalhe. |
| `/meus-anuncios` | `/app/meus-anuncios` (fica nesta fase) | Bloqueado: a lista nova não oferece edição como a antiga. |
| `/negocio/catalogo` | Fica | Não há gestão do catálogo próprio no app. |
| `/negocio` | Fica | Gestão do negócio próprio não equivale à ficha de outro prestador. |
| `/notifications` | Fica | O ícone notifications não tem lista integrada nem rota no app. |
| `/pedidos/[id]` | `/app/pedido/:id` | Aplicado: 307; destino registrado no app. |
| `/pedidos/novo` | Fica | Precisa preservar o prestador; o formulário do app é estado local da ficha. |
| `/pedidos` | `/app/pedidos` | Aplicado: 307; destino registrado no app. |
| `/prestadores/[id]` | `/app/negocio/:id` | Aplicado: 307; destino registrado no app. |
| `/profile/[userId]` | Fica | Perfil de outro membro não equivale ao próprio Você. |
| `/profile/editar` | `/app/voce` (fica nesta fase) | Edição existe como ação local; falta entrada endereçável para abrir a edição. |
| `/profile/interests` | Fica | Interesses e sugestões de grupos dependem do F04 Grupos. |
| `/profile` | Fica | Família já está em Você (PR #147); interesses, negócio próprio e demais portas do perfil continuam fora deste recorte. |
| `/recommendations` | Alias existente mantido | Já usa redirect() de página: focus UUID leva ao detalhe da indicação; aba=request abre a caixa; aba=saved vai a /salvos?aba=indicacao; demais vão a /community. |
| `/salvos` | `/app/salvos` (fica nesta fase) | Bloqueado: Salvos novo tem anúncios via dadosDoApp e guia; não lista as indicações salvas da tela antiga. |

## Testes e rastreador ajustados

- Novo teste unitário executa as regras reais usando `getPathMatch`, `matchHas`, `prepareDestination` e `getRedirectStatus`, as mesmas funções do servidor Next instalado. O helper experimental instalado descarta as capturas de `has`; por isso não consegue interpolar `conversation`. Não foi alterado pacote instalado nem criada implementação de roteamento no produto.
- Cobertura de cada 307, preservação de ID/query codificada, precedência da conversa, query inválida, destino registrado, ausência de ciclo e todas as páginas que ficam na web, incluindo criação, alertas e edição. Casos de permanência também cobrem query e barra final. Os unitários do proxy cobrem os 11 destinos distintos como entradas de `/app`, sem voltar ao portão antigo.
- E2E de F02, F07, F09 e F10 passam por portas antigas e afirmam o destino do app; conversa por URL mantém envio, recarga e negativa de participante. Recusas sem sessão esperam o estado real do app. Ficha do prestador, imóvel, indicação e convite familiar passam a esperar os destinos novos.
- O shell antigo continua sendo testado por `/profile`; compositor e foco seguem por `/community`. Nenhuma dessas jornadas foi retirada.
- Casos mortos retirados, sem novo skip/fixme: tipografia exclusiva da Home antiga (2 casos), fluxo web completo de pedir/responder serviço (1; as jornadas reais F07/F09 permanecem), layout sem feed da Home (1), editar pelo detalhe do imóvel antigo (1), resolver no detalhe da indicação antigo (1), bloquear pelo detalhe da conversa antiga (1), navegação Perfil na caixa antiga (1) e recusas anônimas duplicadas da caixa antiga (2). Salvos continua com prova de lista, abertura no app, remoção e recarga; a fixture do salvamento usa a identidade sintética sob RLS, pois o detalhe novo não tem o toggle antigo.
- O rastreador continua visitando links antigos. Eles agora são classificados como `redirect`, em vez de exigir uma porta de tela web que saiu. As páginas que ficam continuam sujeitas à exigência de porta; `/profile` é entrada adicional para percorrê-las. A unidade prova que redirect segue visitável e que criação continua exigindo porta.

## Continuação registrada no cartão

O `blocked_by` do RUN-019 foi substituído por `phase_1_note` e `remaining_gaps`. O mesmo fechamento do cartão LAN-TROCA foi estendido, mantendo `status: next`; não foi criada fila paralela. Pendências: grupos, seguir/salvar/resolver pergunta e denúncias (F04); convites individuais/fan-out, histórico e criar/editar evento (F05); criar/editar anúncios, Meus anúncios, alertas e filtros (F06); negócio próprio/catálogo, criação endereçável e acompanhamento da resposta do pedido (F07); avisos, preferências e iniciar bloqueio na conversa (F09); indicações em Salvos, perfil alheio, interesses e portas restantes da conta (F10); consumo de q/search/filtros e Guia/cidade/localidade por ID (F02/F08).

Os arquivos antigos de produto permanecem nesta fase. Não houve limpeza de código que possa sustentar Server Actions ou outras rotas ainda vivas. A remoção futura exige conferir importadores. O requisito de revisão independente do contrato continua documentado para o fechamento integral; nesta fase não foi pedido parecer a outro modelo, conforme ordem explícita do coordenador.

## Provas da fase 1

Provas do diff de código que resultou em `21e333fb` e `1b7c82e3`, a partir de `f64c1cab`. A suíte unitária verificou a configuração, seus testes e o modelo do rastreador finais. Após ela, apenas os E2E receberam os últimos ajustes de seletor e preservação das asserções de Salvos; o `gate --fast` foi repetido sobre esses ajustes e passou. A documentação e o cartão foram atualizados depois, sem alterar o código verificado.

| Verificação | Resultado |
| --- | --- |
| `npx pnpm@11.18.0 gate --fast` | PASS: lint (1.612 arquivos; 24 avisos e 50 infos, zero erros), tipos dos workspaces e tipos dos E2E; última rodada 9 s / 10 s / 6 s. |
| `npx pnpm@11.18.0 test:scope` | PASS: 222/222, sem falha, skip ou cancelamento. |
| `npx pnpm@11.18.0 exec vitest run tests/unit --maxWorkers=1 --no-file-parallelism` | PASS: 226/226 arquivos e 2.525/2.525 testes; 68,61 s. |
| `node scripts/agents/task-contract.mjs docs/agents/tasks/RUN-019.task.yml` | Contrato R2 válido, sem blocked_by. |
| `git diff --check` | PASS. |

O teste novo foi executado antes da implementação e confirmou a ausência dos redirecionamentos. Depois passou com as regras reais. A primeira rodada de `gate --fast` encontrou a formatação do JSON do quadro; corrigida com o formatador existente, sem mudança de pins. Não se atribuiu essa falha ao baseline.

Logs locais: `fase1-gate-fast.log`, `fase1-scope.log`, `fase1-unit.log` e `redirects.log`, nesta pasta ignorada. A tabela e este relatório são versionados; logs e scripts auxiliares não entram no commit.

Commits por parte:

- `21e333fb` — `fix(rotas): aplica 307 da primeira fase do LAN-TROCA`.
- `1b7c82e3` — `test(rotas): migra expectativas e rastreador para a fase 1`.
- Fechamento documental: `docs(rotas): registra entrega e lacunas da fase 1` (contrato, quadro e relatório).

O push autorizado tem como destino `origin chore/lan-troca`. Não há PR, merge ou publicação neste lote.

Não executados, por instrução explícita: E2E, servidor, banco, build, gate completo e capturas 375/768/1440 nos dois temas. Nenhuma revisão foi solicitada a outro modelo ou ao Claude. O typecheck dos E2E não executa navegador. O CI e o rastreador de links em runtime ainda precisam provar a revisão entregue; não se declara o lançamento nem o LAN-TROCA integral concluído.
