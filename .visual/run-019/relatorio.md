# RUN-019 ? confer?ncia antes da troca

Data: 06/11/2026. Branch: chore/lan-troca. Revis?o inicial: 86c4851f. Worktree inicialmente limpo.

## Resultado

BLOQUEADO: o baseline confirma as telas antigas, mas a premissa de equival?ncia completa das jornadas F01?F10 n?o se confirma. Nenhum redirecionamento foi aplicado e nenhuma tela ou teste foi apagado. A restri??o do pr?prio contrato pro?be redirecionar jornada que ainda n?o existe no app. Substituir essas telas por suas listas/p?ginas ancestrais descartaria fun??es, IDs ou filtros.

## Tabela rota antiga ? destino no app

Invent?rio: 58 p?ginas em apps/web/app/(shell). Confer?ncia contra apps/app/src/roteador.tsx e o cat?logo apps/app/lib/navegacao/rotas.ts: base /app, TELAS_REAIS e montagem de paginas. Candidato indica rota real registrada, n?o equival?ncia aceita. Os par?metros :id correspondem a $id no cat?logo. Todas as rotas ficam nesta revis?o.

| Rota antiga | Destino ou perman?ncia | Confer?ncia / motivo |
| --- | --- | --- |
| `/cidade/[id]` | Fica | Consulta outra localidade por UUID; o painel do app s? recebe nome e n?o carrega essa localidade. |
| `/communities/[id]/indicar-prestador` | Fica | Fica at? F04 Grupos, conforme proibi??o expressa. |
| `/communities/[id]/invite` | Fica | Fica at? F04 Grupos, conforme proibi??o expressa. |
| `/communities/[id]` | Fica | Fica at? F04 Grupos, conforme proibi??o expressa. |
| `/communities` | Fica | Fica at? F04 Grupos, conforme proibi??o expressa. |
| `/community` | Fica | Fica at? F04 Grupos, conforme proibi??o expressa. |
| `/configuracoes/bloqueados` | `/app/bloqueados` (candidato, n?o aplicado) | Candidato; precisa provar equival?ncia da lista e remo??o. |
| `/configuracoes/conta` | Fica | Inclui sa?da de fam?lia, ausente no app. |
| `/configuracoes/familia` | Fica | N?o h? gest?o de fam?lia no app. |
| `/configuracoes/notificacoes` | Fica | N?o h? prefer?ncias por canal no app. |
| `/configuracoes` | Fica | Leva ?s prefer?ncias de notifica??es; n?o h? equivalente no app. |
| `/denuncias/[id]` | Fica | N?o h? acompanhamento de den?ncia por ID no app. |
| `/denuncias/nova` | Fica | N?o h? formul?rio equivalente endere??vel no app. |
| `/denuncias` | Fica | N?o h? lista/acompanhamento de den?ncias; chamados s?o outro dom?nio. |
| `/events/[id]/editar` | `/app/evento/:id` (candidato, n?o aplicado) | Edi??o existe como a??o local; falta entrada endere??vel para abrir a edi??o. |
| `/events/[id]` | `/app/evento/:id` (candidato, n?o aplicado) | Bloqueado: detalhe antigo tem convites individuais e fan-out ausentes na tela nova. |
| `/events/[id]/perguntas` | Fica | Hist?rico e filtro com n?o equivalem ao envio de uma pergunta no detalhe do app. |
| `/events/novo` | Fica | Cria??o existe em di?logo local, sem destino direto registrado. |
| `/events` | `/app/agenda` (candidato, n?o aplicado) | Candidato; cria??o fica em di?logo local da Agenda. |
| `/explorar/busca` | `/app/busca` (candidato, n?o aplicado) | Bloqueado: Busca l? casca.consulta e n?o q/search da URL. |
| `/explorar` | `/app/busca` (candidato, n?o aplicado) | Candidato; a tela Busca est? registrada e tem a grade Explorar. |
| `/explorar/servicos` | `/app/negocios` (candidato, n?o aplicado) | Bloqueado: os filtros q/search/bairro/tipo/page da URL n?o s?o consumidos. |
| `/groups/[id]` | Fica | Fica at? F04 Grupos, conforme proibi??o expressa. |
| `/groups` | Fica | Fica at? F04 Grupos, conforme proibi??o expressa. |
| `/guide/[id]/correcao` | Fica | N?o h? destino direto para corre??o do verbete por ID. |
| `/guide/[id]` | Fica | O verbete abre em estado local do Guia, sem rota por ID. |
| `/guide` | `/app/guia` (candidato, n?o aplicado) | Bloqueado: filtros q/categoria da URL n?o s?o consumidos. |
| `/guide/sugerir` | Fica | N?o h? formul?rio equivalente endere??vel no app. |
| `/imoveis/[id]/editar` | Fica | N?o h? edi??o de an?ncio na tela nova. |
| `/imoveis/[id]` | `/app/anuncio/:id` (candidato, n?o aplicado) | Bloqueado: edi??o da publica??o antiga n?o existe em Anuncio nem MeusAnuncios. |
| `/imoveis/alertas` | Fica | N?o h? gest?o de alertas de busca no app. |
| `/imoveis/novo` | Fica | Cria??o existe em di?logo local, sem destino direto registrado. |
| `/imoveis` | `/app/imoveis` (candidato, n?o aplicado) | Bloqueado: filtros da URL n?o s?o consumidos pela lista. |
| `/indicacoes/[id]` | `/app/pergunta/:id` (candidato, n?o aplicado) | Candidato; preservar ID e provar todas as a??es da indica??o. |
| `/indicacoes` | Fica | Alias preserva pedir/q que levam ? jornada mantida em /community. |
| `/inicio` | `/app/inicio` (candidato, n?o aplicado) | Candidato; conferir entradas para jornadas ainda mantidas na web. |
| `/invite/[token]` | Fica | Fluxo do servidor expressamente fora do escopo. |
| `/localidade` | Fica | Abas e servi?os por localidade n?o t?m equivalente completo no app. |
| `/mercado/[id]/editar` | Fica | N?o h? edi??o de an?ncio na tela nova. |
| `/mercado/[id]` | `/app/anuncio/:id` (candidato, n?o aplicado) | Bloqueado: edi??o da publica??o antiga n?o existe em Anuncio nem MeusAnuncios. |
| `/mercado/novo` | Fica | Cria??o existe em di?logo local, sem destino direto registrado. |
| `/mercado` | `/app/mercado` (candidato, n?o aplicado) | Bloqueado: filtros da URL n?o s?o consumidos pela lista. |
| `/messages/[id]` | `/app/conversa/:id` (candidato, n?o aplicado) | Candidato; preservar ID, participa??o e a??es de seguran?a. |
| `/messages` | `/app/conversas` (candidato, n?o aplicado) | Candidato; conversation=<UUID> deve levar a /app/conversa/<UUID> antes da regra gen?rica. |
| `/meus-anuncios` | `/app/meus-anuncios` (candidato, n?o aplicado) | Bloqueado: a lista nova n?o oferece edi??o como a antiga. |
| `/negocio/catalogo` | Fica | N?o h? gest?o do cat?logo pr?prio no app. |
| `/negocio` | Fica | Gest?o do neg?cio pr?prio n?o equivale ? ficha de outro prestador. |
| `/notifications` | Fica | O ?cone notifications n?o tem lista integrada nem rota no app. |
| `/pedidos/[id]` | `/app/pedido/:id` (candidato, n?o aplicado) | Candidato; confirmar a??es por papel antes da troca. |
| `/pedidos/novo` | Fica | Precisa preservar o prestador; o formul?rio do app ? estado local da ficha. |
| `/pedidos` | `/app/pedidos` (candidato, n?o aplicado) | Candidato; confirmar o acompanhamento completo do pedido. |
| `/prestadores/[id]` | `/app/negocio/:id` (candidato, n?o aplicado) | Candidato; ambos identificam provider_profiles, mas conferir portf?lio/a??es. |
| `/profile/[userId]` | Fica | Perfil de outro membro n?o equivale ao pr?prio Voc?. |
| `/profile/editar` | `/app/voce` (candidato, n?o aplicado) | Edi??o existe como a??o local; falta entrada endere??vel para abrir a edi??o. |
| `/profile/interests` | Fica | Interesses e sugest?es de grupos dependem do F04 Grupos. |
| `/profile` | `/app/voce` (candidato, n?o aplicado) | Bloqueado: Voc? n?o tem entradas para fam?lia, interesses e pr?prio neg?cio existentes no perfil antigo. |
| `/recommendations` | Fica | Alias preserva filtros que levam ? jornada mantida em /community. |
| `/salvos` | `/app/salvos` (candidato, n?o aplicado) | Bloqueado: Salvos novo tem an?ncios via dadosDoApp e guia; n?o lista as indica??es salvas da tela antiga. |

## Evid?ncia dos bloqueios

- apps/app/src/roteador.tsx: n?o registra fam?lia, prefer?ncias de notifica??es, acompanhamento de den?ncias, perfil de outro membro, gest?o do cat?logo pr?prio ou alertas imobili?rios.
- apps/app/src/telas/Voce.tsx: edita nome/bio e oferece atalhos, sem fam?lia/interesses/neg?cio pr?prio. Redirecionar /profile para Voc? retiraria portas de fun??es ainda vivas.
- apps/app/src/telas/Salvos.tsx: consulta dadosDoApp.lerCidade para an?ncios e lerSalvosDoGuia para refer?ncias. N?o consulta as indica??es salvas que /salvos e recon-032-salvos.spec.ts exercitam.
- apps/app/src/telas/Busca.tsx: o termo vem de casca.consulta, sem consumo de q/search da URL.
- apps/app/src/telas/Guia.tsx: termo, categoria e verbete s?o estado local; n?o h? rota por ID no cat?logo.
- apps/app/src/telas/Anuncio.tsx e MeusAnuncios.tsx: n?o oferecem a edi??o exercida pelas rotas antigas de editar an?ncio.
- apps/web/app/(shell)/events/[id]/page.tsx mant?m as se??es de convites individuais/fan-out; apps/app/src/telas/Evento.tsx n?o as oferece.
- O padr?o de 307 do PR #136 foi lido em apps/web/next.config.ts: redirects de configura??o com permanent: false, antes do proxy; a regra espec?fica com query vem antes da gen?rica.
- O proxy deixa /app e seus descendentes passarem sem sess?o; a autoriza??o passa ao app e ?s APIs. Por isso redirecionar primeiro altera o port?o efetivo, e exige provar o destino integrado antes de retirar a tela antiga.

## O que entrou

- Esta tabela foi o primeiro artefato, antes de altera??es rastreadas.
- Registro de blocked_by no contrato com causa e passo de resolu??o, sem mudar acceptance ou enfraquecer a prova.
- Nenhuma altera??o em configura??o, proxy, telas, E2E, quadro, arquivos de ambiente ou segredos.
- Instala??o de depend?ncias com npx pnpm@11.18.0 install --frozen-lockfile; sem alterar pins.

## Passo concreto para destravar

Concluir as superf?cies ausentes nas jornadas correspondentes e expor entradas que consumam ID, a??o e filtros de URL. Depois reexecutar a tabela, aplicar somente os 307 com equival?ncia comprovada, migrar/retirar E2E junto das telas e provar port?es por perfil. Grupos continuam at? F04 Grupos. A implementa??o dessas jornadas exigiria caminhos fora de allowed_paths do RUN-019, portanto n?o foi inventada neste lote.

## Valida??o, commits e n?meros

Em andamento. S? gate --fast, test:scope e Vitest de tests/unit ser?o executados. Sem E2E, servidor, banco, build ou gate completo; runtime fica para CI e n?o est? declarado verde.

Pedido posterior do dono autoriza o push ao fim, prevalecendo sobre a proibi??o antiga do contrato. Sem PR ou merge. O quadro fica intacto.
