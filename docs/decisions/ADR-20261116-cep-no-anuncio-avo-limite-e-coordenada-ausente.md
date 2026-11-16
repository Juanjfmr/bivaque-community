# ADR-20261116 — CEP no anúncio: avô, limite e coordenada ausente

- Status: Aceito por delegação — aguarda ratificação do dono (16/11/2026, lote RUN-175/LOC-IMPL L1)
- Emenda: 16/11/2026, SEC-013 (auditoria R3 do lote 2a) — F1, F2, F3, F4 e F5. Ver a emenda no fim do documento.
- Decide sobre: ADR-20261022-localizacao-padrao-de-mercado (aceito pelo dono 22/10) — complementa três lacunas de implementação que ele não respondeu; nenhuma muda as regras §§1-3 que o dono já aceitou
- Revisão independente e parecer de segurança registrados no card no fechamento

## Contexto

O ADR de 22/10 mandou: imóvel com CEP obrigatório, cidade/bairro derivados, coordenada geocodificada, anunciante escolhe local exato ou aproximado (300-500 m); desapego com CEP opcional e bairro; pedido opcional (usado por L2, fora daqui). A infra de geocodificação e o cache já existem desde o perfil (RUN-029). Três pontos ficaram sem resposta e travam a execução:

1. Anúncios IMÓVEL já publicados não têm CEP — "obrigatório" não diz o que acontece com eles.
2. Abrir CEP para toda a base multiplica cache-miss no BrasilAPI sem nenhum limitador (card LOC-LIMITE-GEOCODIFICACAO, achado do auditor do #183).
3. CEP conhecido pela BrasilAPI mas SEM coordenada hoje vira 422 (card LOC-CEP-SEM-COORDENADA) — travaria o anúncio interiorano exatamente quando o CEP passa a obrigatório.

E um quarto, de escopo: o card LOC-IMPL fala em "mapa", mas o LANCAMENTO não usa a palavra e o ADR de infraestrutura de mapa (20261016) está PROPOSED, sem biblioteca no repo.

## Decisão

1. **Avô sem backfill forjado**: imóveis ativos já publicados sem CEP continuam válidos e funcionam; o CEP passa a ser exigido na PRIMEIRA EDIÇÃO de cada um (POST novo sempre exige). Nada de coordenada inventada em lote — o ADR-20261022 diz "nunca inventar coordenada"; registrar a coluna `cep null` como "não geocodificado" e seguir o texto atual (bairro · cidade).
2. **Limite por pessoa antes de abrir a torneira**: um limitador deslizante por usuário (mesma família do limitador de entrada, SEC-007) sobre chamadas reais à BrasilAPI/Google (cache hit não conta), com 429 honesto e mensagem própria. **Fecha parcialmente** o card LOC-LIMITE-GEOCODIFICACAO: o anúncio, o pedido e, desde a emenda SEC-013 de 16/11, o PUT do perfil passam pelo limitador; contador no banco, TTL do cache e teto global seguem abertos no card.
3. **CEP sem coordenada não bloqueia anúncio**: sucesso parcial — a cidade/bairro derivados do CEP valem, coordenada fica nula, `localizacao_publica` é FORÇADA a aproximada e o texto mostra bairro · cidade. Fecha o card LOC-CEP-SEM-COORDENADA. Google-reserva continua opcional (sem chave = só BrasilAPI; o código já trata).
4. **Mapa NÃO entra**: a escolha exato/aproximado é satisfeita em texto (endereço publicado quando exato; bairro/raio arredondado quando aproximado). Infra de mapa (aprovar o ADR-20261016 + biblioteca + privacidade de tile) vira card pós-lançamento nomeado. O item do checklist do LOC-IMPL é resolvido por esta decisão registrada, não por silêncio.

## Consequências

- Migration única (`listings`: cep, latitude, longitude, localizacao_publica com CHECK; relaxo do bairro-obrigatório do desapego conforme ADR §2) + grants por coluna no molde do perfil — coordenada crua nunca legível por terceiro.
- O arredondamento (piso ~300 m) acontece no servidor, antes de gravar, quando aproximada.
- L2 (pedido + "perto de mim") herda a infraestrutura e vem em contrato separado.

## Emenda de 16/11/2026 — SEC-013 (auditoria R3 do lote 2a)

A auditoria independente do `security-auditor` de 16/11 sobre a main `2bb231d8`
(`.work/orq/relatorios/auditoria-r3-lote2a.md`) achou quatro buracos na
implementação desta decisão. O coordenador decidiu, por delegação, na mesma data:

1. **F1 (HIGH) — nenhum RPC do pedido devolve a localização de outra pessoa.**
   `close_service_request`, `update_service_request` e `cancel_service_request`
   são `security definer` e devolviam `to_jsonb` da linha inteira; dentro do
   definer o grant por coluna não vale, então o prestador lia o CEP e a
   coordenada exata da solicitante por chamada direta ao RPC. As três passam a
   devolver a lista explícita de `private.service_request_payload` — a mesma
   lista que o grant por coluna publica, sem `cep`, `latitude` e `longitude`.
   Semântica, grants e `security definer` inalterados. Migration
   `20261116220115`; pgTAP negativo dos dois lados e positivo do que as rotas
   consomem.
2. **F2 (HIGH) — o PUT do perfil consome a cota de geocodificação.** Cadastrar
   CEP no perfil ia direto ao provedor. Agora um CEP fora do cache consome a
   mesma janela por pessoa do anúncio e do pedido, e a rota responde 429 com
   `retry-after`, no formato das outras rotas que usam o limitador; cache hit
   não consome. **Aceito para o lançamento:** limitador por processo e cache sem
   TTL ficam como estão — contador no banco, TTL e teto global seguem no cartão
   `LOC-LIMITE-GEOCODIFICACAO`. O §2 acima, que dizia fechar o card, está
   corrigido por esta emenda.
3. **F4 (MEDIUM) — a localização do pedido vem do cache do CEP, nunca do
   chamador.** `create_service_request` mantém `p_latitude`, `p_longitude` e
   `p_region` na assinatura de oito argumentos por compatibilidade com a rota
   viva e os **ignora**: coordenada e bairro são derivados de
   `public.cep_geocodes` pelo CEP, e uma chamada forjada grava o que o cache
   diz, não o que ela mandou. Sem CEP, ou com CEP fora do cache, o pedido fica
   sem coordenada e sem bairro — o prestador nunca vê um bairro que a
   solicitante digitou. Bairro com cara de CEP vira ausência de bairro, não
   erro de criação.
4. **F3 (MEDIUM) — trilateração do pedido: residual aceito no lançamento.** O
   prestador muda a própria origem e recombina distâncias; com três origens o
   ponto do pedido volta a ~100 m, que é a ordem da precisão do próprio CEP.
   **O arredondamento da distância à centena NÃO é mitigação disso** — ele
   limita a precisão de UMA consulta, não a interseção de várias origens. A
   mitigação (teto de consultas de distância por participante, origem congelada
   no primeiro cálculo ou distância mais grossa) fica para cartão
   pós-lançamento: o dado é do próprio titular, o atacante precisa ser prestador
   verificado com pedido real e o baseline de mercado entrega o endereço exato.
5. **F5 e F7 (LOW).** O mesmo payload explícito cobre o solicitante lendo de
   volta o próprio CEP e a própria coordenada (F5), e o drift "fecha o
   LOC-LIMITE" está corrigido no §2 e na linha da `RATIFICACAO.md` (F7).
