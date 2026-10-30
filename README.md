# Bivaque × Aceternity UI — Teste de estresse V2

Protótipo independente e navegável do Bivaque feito para testar **amplitude visual e interações da biblioteca Aceternity UI** no produto real e em um laboratório.

## Onde testar

Execute \`npm install && npm run dev\` nesta pasta. O projeto usa Vite + React 19, Tailwind e Framer Motion. O build roda com \`npm run build\`.

## Telas

- **Início:** hero editorial, busca animada, atalhos em bento, indicações rolantes e oportunidades.
- **Comunidade:** feed demonstrativo, publicação em modal, grupos interativos, eventos e perguntas.
- **Mercado:** filtros, favoritos, cartões, grade expansível, 3D Card e hover direcional.
- **Chegada:** conexões ilustrativas no World Map, etapas em Tracing Beam e Timeline.
- **Você:** favoritos e grupos armazenados somente na sessão.
- **Laboratório:** efeitos intensos sob demanda, inventário de componentes, modo reduzido e amostra 320/375/430px.

## Proveniência

**29 componentes originais Aceternity UI** obtidos diretamente de \`21st.dev/@manuarora700/library/aceternity-ui\` e instalados no diretório \`src/components/ui\`. Alguns foram adaptados para Vite (troca de \`next/image\` por \`img\`, \`next/link\` por \`a\`, uso de tokens Bivaque e pequenas correções TypeScript). Estes ajustes não introduzem outra biblioteca de componentes. Elementos básicos (formulários, contêineres, botões nativos e acessibilidade) são HTML/React.

A fonte da identidade é \`docs/brand/GUIDELINES.md\`, os tokens de \`docs/brand/reference/brand-tokens.json\`, e a assinatura original do Bivaque é preservada sem redesenho. O piloto continua **light-only**.

As imagens de imóveis e produtos e todo o catálogo são **ilustrativos e fictícios**; não demonstram disponibilidade real. Favoritos usam sessionStorage, demais interações são locais. Não há backend, autenticação nem acesso a dados de membros.

A V1 segue isolada na branch \`feat/prototype-aceternity-only-20261030\`. Esta V2 reside em \`feat/bivaque-aceternity-stress-20261030\`; a branch \`main\` não foi modificada.

### Medição sugerida

Compare 320, 375, 430, 768 e 1440 px. Avalie navegação e alvos de toque, redução de movimento, contraste, carregamento sob demanda do Lab e impacto no peso JS. O laboratório foi isolado por \`React.lazy\` para não carregar seus componentes de efeito na experiência principal.
