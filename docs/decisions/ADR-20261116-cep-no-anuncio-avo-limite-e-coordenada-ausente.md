# ADR-20261116 — CEP no anúncio: avô, limite e coordenada ausente

- Status: Aceito por delegação — aguarda ratificação do dono (16/11/2026, lote RUN-175/LOC-IMPL L1)
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
2. **Limite por pessoa antes de abrir a torneira**: um limitador deslizante por usuário (mesma família do limitador de entrada, SEC-007) sobre chamadas reais à BrasilAPI/Google (cache hit não conta), com 429 honesto e mensagem própria. Fecha o card LOC-LIMITE-GEOCODIFICACAO.
3. **CEP sem coordenada não bloqueia anúncio**: sucesso parcial — a cidade/bairro derivados do CEP valem, coordenada fica nula, `localizacao_publica` é FORÇADA a aproximada e o texto mostra bairro · cidade. Fecha o card LOC-CEP-SEM-COORDENADA. Google-reserva continua opcional (sem chave = só BrasilAPI; o código já trata).
4. **Mapa NÃO entra**: a escolha exato/aproximado é satisfeita em texto (endereço publicado quando exato; bairro/raio arredondado quando aproximado). Infra de mapa (aprovar o ADR-20261016 + biblioteca + privacidade de tile) vira card pós-lançamento nomeado. O item do checklist do LOC-IMPL é resolvido por esta decisão registrada, não por silêncio.

## Consequências

- Migration única (`listings`: cep, latitude, longitude, localizacao_publica com CHECK; relaxo do bairro-obrigatório do desapego conforme ADR §2) + grants por coluna no molde do perfil — coordenada crua nunca legível por terceiro.
- O arredondamento (piso ~300 m) acontece no servidor, antes de gravar, quando aproximada.
- L2 (pedido + "perto de mim") herda a infraestrutura e vem em contrato separado.
