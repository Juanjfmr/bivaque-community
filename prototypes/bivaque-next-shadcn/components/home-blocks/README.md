# Home experimental — código de blocos reais

Rota: `/home-blocos/` no export estático (GitHub Pages).

## Código realmente incorporado

| Elemento na Home | Origem | Implementação usada |
|---|---|---|
| Busca global: painel, filtros, resultados e atalhos de teclado | [Blocks.so `command-menu-04`](https://github.com/ephraimduncan/blocks/blob/main/content/components/command-menu/command-menu-04.tsx), MIT | `blocks-global-search-bivaque.tsx` é uma **adaptação do código React original**: conteúdo e idioma Bivaque; imports dos ícones substituídos por Lucide já instalado. Uma cópia original é preservada em `upstream/blocks-global-search.tsx`. |
| Cards do catálogo: `Card`, `CardContent`, imagem, etiquetas, favoritar e preço | [Shadcn Studio `product-list-01`](https://github.com/shadcnstudio/shadcn-studio/blob/main/src/components/shadcn-studio/blocks/product-list-01/product-list-01.tsx) | `studio-product-list-bivaque.tsx` é uma **adaptação**, não cópia original: remove carrinho, usa preço BRL, item clicável, favoritar funcional e cards mais densos. Original não redistribuído por cláusula da licença. |
| Cards de navegação | [Shadcn Studio `card-09`](https://github.com/shadcnstudio/shadcn-studio/blob/main/src/components/shadcn-studio/card/card-09.tsx) e primitivos shadcn/ui já presentes | Adaptação declarada dos primitivos `Card`, `CardHeader`, `CardContent`. O bloco Card Nav comercial específico **não** foi adquirido nem instalado. |
| Atividade nos grupos | [ReUI `timeline`](https://github.com/keenthemes/reui/blob/main/registry-reui/bases/radix/reui/timeline.tsx), MIT | O componente `reui-timeline.tsx` é **código original sem mudanças**, importado e executado na Home; a aplicação fornece os itens e a composição gráfica. O original também foi preservado em `upstream/reui-timeline.tsx`. |

### Licenciamento

Arquivos `LICENSE-BLOCKS-SO.md`, `LICENSE-REUI.md` e `LICENSE-SHADCN-STUDIO.md` acompanham a implementação.
Shadcn Studio usa MIT com cláusulas adicionais de não redistribuição de componentes não modificados e de produtos concorrentes. Nenhum componente da coleção Pro foi incluído.

### Limitações e teste

- Protótipo nacional, mas o conjunto de **fixtures** atuais tem anúncios, prestadores e perguntas fictícios apenas para **Brasília**. A troca de cidade expõe o estado vazio e não inventa ofertas.
- Busca global retorna caminhos de categoria (não fichas individuais) e tem atalhos Ctrl/Cmd+K e /.
- Favoritos e respostas funcionam durante a sessão local e não são salvos em backend.
- O botão Criar testa o formulário sem publicar dados reais.
- A Home existente, a main, o R72 congelado e a produção ficam inalterados.
- A publicação de uma versão estática no Pages é HTML gerado por Next.js/React, com scripts para interação; não é um HTML standalone sem dependências.

## Próximos testes para aceite

Verificar 375, 768 e 1440 px, tema claro/escuro, abrir e fechar busca, filtrar anúncios, favoritar, abrir ficha e voltar, perguntas, e menus inferiores. Executar os comandos `npm run build` e `npm run typecheck` antes de propor integração no app principal.
