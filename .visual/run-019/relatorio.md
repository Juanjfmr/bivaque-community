# RUN-019 — conferência antes da troca

Data: 06/11/2026. Branch: chore/lan-troca. Revisão inicial: 86c4851f. Worktree inicialmente limpo.

## Resultado

BLOQUEADO: o baseline confirma as telas antigas, mas a premissa de equivalência completa das jornadas F01–F10 não se confirma. Nenhum redirecionamento foi aplicado e nenhuma tela ou teste foi apagado. A restrição do próprio contrato proíbe redirecionar jornada que ainda não existe no app. Substituir essas telas por suas listas/páginas ancestrais descartaria funções, IDs ou filtros.

## Tabela rota antiga → destino no app

Inventário: 58 páginas em apps/web/app/(shell). Conferência contra apps/app/src/roteador.tsx e o catálogo apps/app/lib/navegacao/rotas.ts: base /app, TELAS_REAIS e montagem de paginas. Candidato indica rota real registrada, não equivalência aceita. Os parâmetros :id correspondem a $id no catálogo. Todas as rotas ficam nesta revisão.

| Rota antiga | Destino ou permanência | Conferência / motivo |
| --- | --- | --- |
| `/cidade/[id]` | Fica | Consulta outra localidade por UUID; o painel do app só recebe nome e não carrega essa localidade. |
| `/communities/[id]/indicar-prestador` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/communities/[id]/invite` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/communities/[id]` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/communities` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/community` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/configuracoes/bloqueados` | `/app/bloqueados` (candidato, não aplicado) | Candidato; precisa provar equivalência da lista e remoção. |
| `/configuracoes/conta` | Fica | Inclui saída de família, ausente no app. |
| `/configuracoes/familia` | Fica | Não há gestão de família no app. |
| `/configuracoes/notificacoes` | Fica | Não há preferências por canal no app. |
| `/configuracoes` | Fica | Leva às preferências de notificações; não há equivalente no app. |
| `/denuncias/[id]` | Fica | Não há acompanhamento de denúncia por ID no app. |
| `/denuncias/nova` | Fica | Não há formulário equivalente endereçável no app. |
| `/denuncias` | Fica | Não há lista/acompanhamento de denúncias; chamados são outro domínio. |
| `/events/[id]/editar` | `/app/evento/:id` (candidato, não aplicado) | Edição existe como ação local; falta entrada endereçável para abrir a edição. |
| `/events/[id]` | `/app/evento/:id` (candidato, não aplicado) | Bloqueado: detalhe antigo tem fan-out ausente na tela nova. |
| `/events/[id]/perguntas` | Fica | Histórico e parâmetro `com` não equivalem ao envio de uma pergunta no detalhe do app. |
| `/events/novo` | Fica | Criação existe em diálogo local, sem destino direto registrado. |
| `/events` | `/app/agenda` (candidato, não aplicado) | Bloqueado: a lista antiga inclui convites individuais; a Agenda nova não os lista. |
| `/explorar/busca` | `/app/busca` (candidato, não aplicado) | Pendência de compatibilidade: Busca lê casca.consulta e não q/search da URL. A jornada existe. |
| `/explorar` | `/app/busca` (candidato, não aplicado) | Candidato; a tela Busca está registrada e tem a grade Explorar. |
| `/explorar/servicos` | `/app/negocios` (candidato, não aplicado) | Pendência de compatibilidade: q/search/bairro/tipo/page da URL não são consumidos. A jornada existe. |
| `/groups/[id]` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/groups` | Fica | Fica até F04 Grupos, conforme proibição expressa. |
| `/guide/[id]/correcao` | Fica | Não há destino direto para correção do verbete por ID. |
| `/guide/[id]` | Fica | O verbete abre em estado local do Guia, sem rota por ID. |
| `/guide` | `/app/guia` (candidato, não aplicado) | Pendência de compatibilidade: filtros q/categoria da URL não são consumidos. A jornada existe. |
| `/guide/sugerir` | Fica | Não há formulário equivalente endereçável no app. |
| `/imoveis/[id]/editar` | Fica | Não há edição de anúncio na tela nova. |
| `/imoveis/[id]` | `/app/anuncio/:id` (candidato, não aplicado) | Candidato para o detalhe; a rota vizinha de edição fica na web. A falta de edição não bloqueia sozinha este detalhe. |
| `/imoveis/alertas` | Fica | Não há gestão de alertas de busca no app. |
| `/imoveis/novo` | Fica | Criação existe em diálogo local, sem destino direto registrado. |
| `/imoveis` | `/app/imoveis` (candidato, não aplicado) | Pendência de compatibilidade: filtros da URL não são consumidos pela lista. A jornada existe. |
| `/indicacoes/[id]` | `/app/pergunta/:id` (candidato, não aplicado) | Candidato; preservar ID e provar todas as ações da indicação. |
| `/indicacoes` | Alias existente mantido | Já usa redirect() de página; só pedir=1 abre a caixa na jornada antiga em /community. Não preserva q. |
| `/inicio` | `/app/inicio` (candidato, não aplicado) | Candidato; conferir entradas para jornadas ainda mantidas na web. |
| `/invite/[token]` | Fica | Fluxo do servidor expressamente fora do escopo. |
| `/localidade` | Fica | Abas e serviços por localidade não têm equivalente completo no app. |
| `/mercado/[id]/editar` | Fica | Não há edição de anúncio na tela nova. |
| `/mercado/[id]` | `/app/anuncio/:id` (candidato, não aplicado) | Candidato para o detalhe; a rota vizinha de edição fica na web. A falta de edição não bloqueia sozinha este detalhe. |
| `/mercado/novo` | Fica | Criação existe em diálogo local, sem destino direto registrado. |
| `/mercado` | `/app/mercado` (candidato, não aplicado) | Pendência de compatibilidade: filtros da URL não são consumidos pela lista. A jornada existe. |
| `/messages/[id]` | `/app/conversa/:id` (candidato, não aplicado) | Candidato; preservar ID, participação e ações de segurança. |
| `/messages` | `/app/conversas` (candidato, não aplicado) | Candidato; conversation=<UUID> deve levar a /app/conversa/<UUID> antes da regra genérica. |
| `/meus-anuncios` | `/app/meus-anuncios` (candidato, não aplicado) | Bloqueado: a lista nova não oferece edição como a antiga. |
| `/negocio/catalogo` | Fica | Não há gestão do catálogo próprio no app. |
| `/negocio` | Fica | Gestão do negócio próprio não equivale à ficha de outro prestador. |
| `/notifications` | Fica | O ícone notifications não tem lista integrada nem rota no app. |
| `/pedidos/[id]` | `/app/pedido/:id` (candidato, não aplicado) | Candidato; confirmar ações por papel antes da troca. |
| `/pedidos/novo` | Fica | Precisa preservar o prestador; o formulário do app é estado local da ficha. |
| `/pedidos` | `/app/pedidos` (candidato, não aplicado) | Candidato; confirmar o acompanhamento completo do pedido. |
| `/prestadores/[id]` | `/app/negocio/:id` (candidato, não aplicado) | Candidato; ambos identificam provider_profiles, mas conferir portfólio/ações. |
| `/profile/[userId]` | Fica | Perfil de outro membro não equivale ao próprio Você. |
| `/profile/editar` | `/app/voce` (candidato, não aplicado) | Edição existe como ação local; falta entrada endereçável para abrir a edição. |
| `/profile/interests` | Fica | Interesses e sugestões de grupos dependem do F04 Grupos. |
| `/profile` | `/app/voce` (candidato, não aplicado) | Bloqueado: Você não tem entradas para família, interesses e próprio negócio existentes no perfil antigo. |
| `/recommendations` | Alias existente mantido | Já usa redirect() de página: focus UUID leva ao detalhe da indicação; aba=request abre a caixa; aba=saved vai a /salvos?aba=indicacao; demais vão a /community. |
| `/salvos` | `/app/salvos` (candidato, não aplicado) | Bloqueado: Salvos novo tem anúncios via dadosDoApp e guia; não lista as indicações salvas da tela antiga. |

## Evidência dos bloqueios

- apps/app/src/roteador.tsx: não registra família, preferências de notificações, acompanhamento de denúncias, perfil de outro membro, gestão do catálogo próprio ou alertas imobiliários.
- apps/app/src/telas/Voce.tsx: edita nome/bio e oferece atalhos, sem família/interesses/negócio próprio. Redirecionar /profile para Você retiraria portas de funções ainda vivas.
- apps/app/src/telas/Salvos.tsx: consulta dadosDoApp.lerCidade para anúncios e lerSalvosDoGuia para referências. Não consulta as indicações salvas que /salvos e recon-032-salvos.spec.ts exercitam.
- apps/app/src/telas/Busca.tsx: o termo vem de casca.consulta, sem consumo de q/search da URL.
- apps/app/src/telas/Guia.tsx: termo, categoria e verbete são estado local; não há rota por ID no catálogo.
- apps/app/src/telas/Anuncio.tsx e MeusAnuncios.tsx: não oferecem a edição exercida pelas rotas antigas de editar anúncio.
- apps/web/app/(shell)/events/[id]/page.tsx mantém as seção de fan-out; apps/app/src/telas/Evento.tsx não as oferece.
- O padrão de 307 do PR #136 foi lido em apps/web/next.config.ts: redirects de configuração com permanent: false, antes do proxy; a regra específica com query vem antes da genérica.
- O proxy deixa /app e seus descendentes passarem sem sessão; a autorização passa ao app e às APIs. O redirect de next.config roda antes do proxy e altera o portão efetivo. O redirect() de página roda depois do proxy, e poderia preservá-lo; este último mecanismo existe nos aliases de indicações, mas não substitui o padrão de next.config exigido no pedido.

## O que entrou

- Esta tabela foi o primeiro artefato, antes de alterações rastreadas.
- Registro de blocked_by no contrato com causa e passo de resolução, sem mudar acceptance ou enfraquecer a prova.
- Nenhuma alteração em configuração, proxy, telas, E2E, quadro, arquivos de ambiente ou segredos.
- Instalação de dependências com npx pnpm@11.18.0 install --frozen-lockfile; sem alterar pins.

## Passo concreto para destravar

Concluir as superfícies ausentes nas jornadas correspondentes e expor entradas que consumam ID, ação e filtros de URL. Depois reexecutar a tabela, aplicar somente os 307 com equivalência comprovada, migrar/retirar E2E junto das telas e provar portões por perfil. Grupos continuam até F04 Grupos. A implementação dessas jornadas exigiria caminhos fora de allowed_paths do RUN-019, portanto não foi inventada neste lote.

## Recorte possível e decisões após a revisão

A revisão identificou nove candidatas sem bloqueio funcional demonstrado na tabela inicial: /configuracoes/bloqueados, /explorar, /indicacoes/[id], /inicio, /messages, /messages/[id], /pedidos, /pedidos/[id] e /prestadores/[id]. Elas não foram implementadas: o objetivo integral segue bloqueado e esta entrega é o diagnóstico, não uma troca parcial aceita.

O caminho mínimo de continuação é implementar essas nove regras em next.config, com permanent: false, IDs preservados e a regra de conversation antes da genérica; testar cada mapeamento e os perfis do proxy; revisar os E2E e o rastreador que exercem essas telas. O reviewer contou 89 ocorrências em 16 arquivos de E2E; essa contagem é dele, não prova de runtime. Depois ampliar o contrato para as telas e a navegação realmente faltantes, incluindo apps/app/src/telas/**, a casca e o menu antigo em apps/web/app/components/** quando necessários.

Decisões do executor:

- A sugestão do reviewer de usar redirect() de página ou redirecionar depois da sessão no proxy preservaria o portão antigo, mas não foi adotada: o dono exigiu explicitamente o padrão de PR #136 em next.config. O custo é continuar devendo as nove regras possíveis.
- A sugestão de exigir E2E local liberado não foi adotada. O dono já autorizou sua execução no CI; a restrição local não bloqueia editar E2E nem é motivo para suspender código por si só. Nesta revisão nenhum E2E foi alterado porque nenhuma tela saiu.
- Pendências de consumo de query e de abertura direta de um painel foram separadas de jornadas ausentes. Não são, sozinhas, prova de que o destino não existe. Ainda precisam de uma decisão de compatibilidade na implementação para não prometer conservação de comportamento que o código não atende.

## Validação, commits e números

Provas executadas contra `3ae2cd69`, com ajuste apenas de texto/UTF-8 deste relatório ainda no diff. O código de produto é o mesmo da revisão inicial `86c4851f`. Nenhuma asserção foi alterada e nenhum teste foi pulado.

| Comando | Resultado | Números |
| --- | --- | --- |
| `node scripts/agents/task-contract.mjs docs/agents/tasks/RUN-019.task.yml` | Válido, BLOQUEADO | 1 contrato R2 |
| `npx pnpm@11.18.0 gate --fast` | PASS | Lint: 1.605 arquivos, 24 avisos e 50 infos, sem erro; tipos dos 7 workspaces e dos E2E verdes. Etapas: 36 s / 72 s / 34 s. |
| `npx pnpm@11.18.0 test:scope` | PASS | 220/220, zero falhas, pulos ou cancelamentos; 7,71 s. |
| `npx pnpm@11.18.0 exec vitest run tests/unit --maxWorkers=1 --no-file-parallelism` | PASS | 224/224 arquivos, 2.423/2.423 testes; 145,64 s. Um worker para conter memória. |
| `git diff --check` | PASS | Sem erros de whitespace. |

Logs locais: `gate-fast.log`, `test-scope.log`, `unit.log`. A instalação congelada adicionou 1.162 pacotes em 11 min 30,8 s e não alterou o lockfile.

Números da troca: 58 páginas inventariadas; 23 destinos candidatos existentes; 7 rotas de grupos preservadas; 1 convite de servidor fora do escopo; 0 redirects adicionados; 0 telas ou testes removidos; 0 arquivos de produto alterados.

Commits:

- `3ae2cd69` — `docs(rotas): confere tabela e registra bloqueios do RUN-019` (contrato validado e tabela inicial).
- `254e0886` — `docs(rotas): registra verificações autorizadas do RUN-019` (resultados das três verificações e texto em UTF-8).
- Commit de fechamento deste relatório: `docs(rotas): registra provas e parecer do RUN-019`; somente documentação, sem mudança nos arquivos verificados.

Não rodaram: E2E, rastreador de links em runtime, servidor, banco, build, gate completo e provas visuais 375/768/1440 nos dois temas, conforme a limitação explícita do dono. O typecheck dos E2E rodou dentro de gate --fast; isso não executa o navegador. Não se declara runtime/CI verde nem o contrato concluído.

Revisão independente realizada por Claude Opus, somente leitura de contrato e fontes: diagnóstico PASS-COM-RESSALVA; objetivo original FAIL por implementação ausente. Log local: revisao.log. A contagem independente confirmou 58 páginas, 23 candidatos, 7 rotas de grupos e 1 convite de servidor. Os seis grupos de correções factuais/de redação apontados foram corrigidos nesta única passagem: aliases, parâmetros, posição do redirect em relação ao proxy, detalhe versus edição e frases do relatório. Não foi pedida outra revisão.

Pedido posterior do dono autoriza o push ao fim, prevalecendo sobre a proibição antiga do contrato. Sem PR ou merge. O quadro fica intacto.
