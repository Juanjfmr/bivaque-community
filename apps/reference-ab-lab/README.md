# Bivaque · Experimento A/B com componente real da 21st.dev

## Status
- Branch isolada: `experiment/ab-21st-real-reference-20261111`
- Aplicativo Next.js separado: `apps/reference-ab-lab`
- Rotas: `/a` e `/b`. Nenhuma alteração na Home existente.
- Não importa o `DESIGN.md`, paleta, fonte ou layout do Bivaque atual.
- Fonte base preservada sem modificação em `apps/prototipo/components/experiments/ab-21st/21st-carousel-cards.source.txt`.
- Componente adaptado e efetivamente importado pelas **duas** telas: `apps/reference-ab-lab/components/ui/carousel-cards.tsx`.

## Prova de integração
O arquivo `carousel-cards.tsx` foi obtido por `21st.dev`, componente **Carousel Cards**, catálogo demo **19168**, `@kokonutd` (código MIT de @dorianbaffier). O componente preserva o JSX e classes da galeria, controles de rolagem, imagens, ícones, ações e modelos de dados. Adaptações documentadas:
1. Remoção apenas dos objetos de demonstração de Paris e celebridades.
2. Exportação de `ExperienceItem` e injeção de `sections`/ `onSelect`.
3. Favoritos interativos e acessíveis; clique em anúncio chama `onSelect`.
4. `unoptimized` em `next/image` para URLs externas demonstrativas.
5. Ajustes de tipos, links e prevenção da navegação vazia.
6. Atributo `data-component-source` para confirmar o componente montado no DOM.

A versão A prioriza descoberta no estilo Airbnb. A B prioriza conversas locais no estilo Nextdoor. Ambas usam o mesmo catálogo e as mesmas referências; a diferença de **ordem de prioridades visuais** confunde a comparação sobre o efeito puro das skills, portanto este é um comparativo exploratório.

### Referências
- Airbnb: https://mobbin.com/screens/581cc189-78a7-4a6b-b49e-92aac35dda60
- Nextdoor: https://mobbin.com/screens/fb867549-2067-4fe9-a744-809e9be9fce7
- Meetup: https://mobbin.com/screens/ea458b63-9d70-4f56-9031-7a8db8697efe
- 21st.dev: https://21st.dev/@kokonutd/components/carousel-cards

## Rodar localmente
Na raiz do monorepo:
```bash
pnpm install --no-frozen-lockfile
pnpm --filter @bivaque/reference-ab-lab typecheck
pnpm --filter @bivaque/reference-ab-lab build
pnpm --filter @bivaque/reference-ab-lab dev
```
Abrir `http://localhost:3200/a` e `http://localhost:3200/b`.

## Experimento
- A: composta diretamente a partir de referências visuais e da biblioteca, sem executar Impeccable durante sua implementação.
- B: mesma biblioteca e conteúdo, usando as orientações textuais `impeccable` (modo Operate e craft-floor).
- Não houve isolamento entre instâncias independentes do modelo. O launcher automático da skill não foi executado. Isso limita causalidade.
- Imagens, avaliações, nomes, preços e eventos são demonstrativos, não anúncios reais.
- Estados implementados: pesquisa, categorias/tabs, vazio, favoritos, publicações locais simuladas, seleção de anúncios e avisos.
