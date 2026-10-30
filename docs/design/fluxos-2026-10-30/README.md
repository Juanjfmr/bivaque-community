# Bivaque — referências individuais organizadas por flow

## Decisões do dono — 30/10/2026

- **Uma imagem por tela e por estado.** Cada arquivo mostra somente uma interface, inteira e legível. Sequência de imagens dentro do flow, como organização do Mobbin. Pranchas compostas não orientam reconstrução e não serão recortadas para simular telas completas.
- **Manter a direção artística**, com liberdade para melhorar hierarquia, composição, espaçamento e clareza do que já foi decidido. Não criar módulos, funcionalidades ou regras a partir da geração.
- **Brandbook oficial obrigatório:** [identidade e precedência](../../brand/README.md), [diretrizes](../../brand/GUIDELINES.md), [ajustes aprovados em 20/10](../../brand/maquete-2026-10-20/maquete-brandbook.html). Grafite `#253033`, Papel `#F2F0EB`, Brasa `#B84A3A`; Noto Serif nos títulos e Noto Sans na interface. Glifo e lettering oficiais em `apps/web/public/brand/`; nunca recompor a assinatura com fonte ou ilustração inventada. A autorização de tema claro/escuro de 20/10 prevalece sobre menções antigas a light-only.
- **Propósito:** rede de apoio à vida cotidiana, chegada, convivência e mudança de cidade para militares, veteranos, pensionistas e famílias. Moradia, serviços, escolas, indicações, desapegos e conhecimento útil preservado. O vínculo define o público e o acesso, não uma estética de quartel, camping ou trilhas.
- **Navegação vigente da prévia:** Início / Comunidade / Criar / Mercado / Você. A geração não altera a navegação. Fluxos são agrupamentos de tarefas existentes, não novos módulos nem novos destinos principais.

## Prioridade exclusiva — correção do dono em 30/10/2026

**Fechar F01 (login, cadastro e onboarding) antes de iniciar F02 ou qualquer outra jornada.** A Home gerada foi rejeitada e não é referência de construção. F02–F10 permanecem apenas como mapa futuro, suspensos para produção. O fim de F01 é a chegada/boas-vindas; desenhar a Home não faz parte desse fechamento.

A [cobertura de F01](F01-COBERTURA.md) deriva dos estados e etapas realmente existentes. Fechar todas as telas e estados previstos, revisar marca, conteúdo, blocos e sequência, e apresentar o flow completo para aprovação visual. Se houver lacuna, F01 continua aberto. Os dois rascunhos individuais atuais não são aprovação do flow.

## Mapa de flows

| Flow | Sequência do escopo existente | Fonte de escopo |
|---|---|---|
| F01 · Entrada e onboarding | Login → cadastro → confirmação/retomada → vínculo → cidade/momento → sugestões de grupos → negócio opcional → boas-vindas; recuperação e convite familiar | Jornada de entrada da branch `codex/ui-foundation-21st-20261026` e correções do dono |
| F02 · Início e busca | Início → busca → resultados → conteúdo → retorno | Prévia atual e necessidades de chegada/convivência |
| F03 · Criar conteúdo | Escolher tipo existente → preencher → contexto → revisar → publicar → retorno; rascunho/erro quando previstos | Pergunta, publicação, evento e anúncio já previstos; não criar novos tipos |
| F04 · Comunidade e grupos | Comunidade → perguntas/publicações/grupos → detalhe → participação/pedido → resposta/acompanhamento | Prévia `apps/prototipo` e matriz de acesso; imagem não concede permissões |
| F05 · Eventos | Lista → detalhe → presença/cancelamento → pedido de informações; criação/edição | Evento e pedido de informações já decididos |
| F06 · Mercado e moradia | Desapegos/imóveis → filtros → detalhe → interesse; criar/revisar/gerenciar anúncio | Mercado existente, sem checkout |
| F07 · Negócios e serviços | Categorias → ficha/portfólio → pedido → acompanhamento; ficha própria | Negócios e onboarding já solicitados pelo dono |
| F08 · Guia | Busca/categorias → leitura → salvar → sugestão de atualização | Guia previsto na autoridade de produto |
| F09 · Conversas e notificações | Caixa → conversa contextual → resposta → notificação → conteúdo de origem | Comunicação existente; não inventar presença/leitura |
| F10 · Você, família e conta | Perfil → edição → convite familiar → preferências/gestão existentes | Conta e família já previstas; não inventar dados de filiação ou controles |

## Referências individuais

**F01 desktop aprovado pelo dono (30/10/2026); celular em produção:** 28 telas em `individuais/F01/`, geradas pelo Codex a partir das capturas da prévia publicada (`apps/app`, `66f8c13e`), com a [direção comum](F01-DIRECAO.md), o logo oficial, fotos da própria prévia e a prévia do bloco do 21st de cada tela. A captura de origem de cada uma está em `individuais/F01/previa-atual/` e aparece ao lado na [galeria](index.html); a [visão geral](F01-visao-geral.jpg) mostra a sequência inteira. Os rascunhos soltos `individuais/F01-01-login-desktop.png` e `F01-07-grupos-desktop.png` foram substituídos por essa sequência. A Home rejeitada continua fora da construção.

Cada imagem será acompanhada aqui de: objetivo da tela, origem do escopo, bloco candidato do 21st, estado/largura e desvios visuais encontrados. Referências e instruções para agentes ficam fora da interface retratada. As imagens são aproximações gráficas dos padrões; não são capturas dos componentes instalados.

## Referências do 21st.dev para os agentes

Pesquisa realizada em 30/10/2026. **Candidato** significa consultado; não significa instalado, aprovado ou reproduzido literalmente na imagem. Código e dependências foram recuperados somente para os quatro marcados “código consultado”. Não registrar chave de API. Antes de instalar: verificar licença, compatibilidade com a base escolhida, versões fixas e acessibilidade; a árvore retornou dependências `latest` e não comprova licença. `apps/web` tem contrato de biblioteca distinto: não importar componentes shadcn/Radix para lá sem resolver a autoridade técnica aplicável.

| Candidato | Uso | Situação |
|---|---|---|
| [Onboarding Wizard Form](https://21st.dev/@cnippet-dev/components/v-form-8) | F01: etapas, validação e confirmação | Código consultado; plano/pagamento do exemplo não integra o Bivaque. |
| [Multi-Step Setup Wizard](https://21st.dev/@olewandowski1/components/onboarding-3) | F01/F07: progressão por etapas | Apenas metadados; analisar código/licença antes de adotar. |
| [Post Card](https://21st.dev/@shadcnui-blocks/components/card-06) | F02/F04: cartão de publicação | Código consultado; a prévia atual registra adaptação, não instalação idêntica. |
| [Activity Feed](https://21st.dev/@felipemenezes098/components/comment-thread-3) | F04/F09: respostas e atividade | Apenas metadados. |
| [Event RSVP Card](https://21st.dev/@cnippet-dev/components/v-card-19) | F05: cartão de evento | Código consultado; adaptação existente na prévia. |
| [Product Listing Card](https://21st.dev/@shadcnstore/components/product-card-1) | F06: grade de anúncios | Código consultado; ajustar para anúncios locais sem checkout. |
| [Ecommerce Category Page](https://21st.dev/@mohammadshehadeh/components/ecommerce-04) | F06: pesquisa e filtros | Apenas metadados; remover pressupostos de loja e avaliação. |
| [Services List](https://21st.dev/@balick/components/services-01) | F07: lista de serviços | Apenas metadados; preço inicial não é obrigatório. |
| [Searchable Question Index](https://21st.dev/@ibrandify/components/searchable-question-index) | F08: busca e categorias | Apenas metadados. |
| [Chat Bubble Thread](https://21st.dev/@bundui/components/bubble6) | F09: mensagens | Apenas metadados; não inferir leitura ou presença. |
| [Account Settings Fieldset](https://21st.dev/@cnippet-dev/components/v-fieldset-7) | F10: edição de perfil | Apenas metadados. |
| [Team Invite Sheet](https://21st.dev/@cnippet-dev/components/v-sheet-7) | F10: convite | Apenas metadados; adaptar para conta familiar independente, sem papéis de equipe. |


## Ordem de execução

1. Fechar F01 e obter aprovação visual do flow completo antes de produzir qualquer outro flow. Completar as telas individuais usando os comportamentos já decididos, revisar conteúdo, marca e consistência antes da implementação.
2. Integrar as jornadas de entrada e Comunidade das duas branches sobre esse conjunto de referências, preservando dados e histórico. Não fazer merge/push/deploy para main.
3. Construir e verificar o protótipo com dados locais. A integração do backend será discutida depois, conforme o pedido do dono.

## Histórico e provas

O [histórico das pranchas](HISTORICO-PRANCHAS.md) preserva o material anterior, retirado da galeria de construção. A correção de formato não é uma aprovação visual. O último gate desta árvore passou lint, tipos, build do app, testes e secrets, mas pulou build web por ausência de ambiente; não há gate completo nem novo E2E nesta revisão documental/visual.
