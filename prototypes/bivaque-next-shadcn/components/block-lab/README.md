# Laboratório de blocos reais — Bivaque

Branch: `feat/bivaque-blocos-reais-20261026`.
Rota experimental: `/laboratorio-blocos`.

## Fontes de código efetivamente incorporadas

| Biblioteca | Bloco | Cópia do código original | Fonte upstream |
|---|---|---|---|
| Shadcnblocks | Gallery 6 | `components/block-lab/shadcnblocks-gallery6.tsx` | https://github.com/shadcnblocks/shadcn-ui-blocks/blob/master/src/block/gallery6.tsx |
| Shadcnblocks | Services 4 | `components/block-lab/shadcnblocks-services4.tsx` | https://github.com/shadcnblocks/shadcn-ui-blocks/blob/master/src/block/services4.tsx |
| ReUI | c-card-8 | `components/block-lab/reui-card8.tsx` | https://github.com/keenthemes/reui/blob/main/public/r/styles/base-nova/c-card-8.json |

Os arquivos da coluna “cópia do código original” não foram editados. A página `app/laboratorio-blocos/page.tsx` importa esses componentes e alterna entre seu uso original e variantes/props próprios do Bivaque. Nesse caso, *apenas* a Gallery6 recebe propriedades customizadas; os outros dois usam composições derivadas **separadas** nas abas Bivaque.

Licenças oficiais copiadas para `components/block-lab/LICENSE-SHADCNBLOCKS.md` e `components/block-lab/LICENSE-REUI.md`. A licença de Shadcnblocks neste repositório impõe MIT + Commons Clause; não revender os componentes ou versões portadas como componentes. Sua presença na demo não aprova outros usos.

## O que ainda NÃO está instalado

- `Product List 1` do catálogo atual de Shadcnblocks **não** foi copiado. Sua demo original é https://www.shadcnblocks.com/block/product-list1.
- O componente complexo `Filters` da ReUI **não** foi instalado. A demo original é https://reui.io/components/filters.
- O laboratório **não é** uma atualização das telas Imóveis/Desapegos em produção. Tampouco implementa Supabase, mapas, verificação de usuários ou autorização.

## Critérios de verificação

1. Instalação Next com dependências já declaradas pelo protótipo; nenhum pacote novo necessário para os três blocos importados.
2. A rota pode ser usada para alternar entre `Gallery 6`, `Services 4` e `Card 8`, com modos `Original` e `No Bivaque`.
3. A Gallery6 disponibiliza setas e arraste por Embla Carousel — testar em 375/768/1440 px; os links são caminhos demonstrativos do aplicativo.
4. Verificar ausência de scroll horizontal, sobreposição do carrossel e quebra de assets remotos.
5. O deploy Vercel é separado, prévia (não produção); não afirmar que está publicado antes do estado READY.

`main`, `R72` e a produção permanecem inalterados.
