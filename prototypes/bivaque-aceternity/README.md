# Bivaque · Protótipo Aceternity UI

Experimento isolado de interface mobile-first do Bivaque, consultando a coleção pública **Aceternity UI de Manu Arora no 21st.dev**.

## Executar

\`\`\`bash
cd prototypes/bivaque-aceternity
npm install
npm run dev
\`\`\`

Abra o endereço informado pelo Vite. Para compilar: \`npm run build\`.

## Componentes reais da coleção

| Arquivo de origem 21st.dev | Onde é utilizado |
|---|---|
| Floating Dock | Navegação flutuante responsiva |
| Bento Grid | Acessos rápidos da página inicial |
| Glowing Effect | Contornos interativos de cartões |
| Background Gradient | Card editorial de comunidade |
| Placeholders And Vanish Input | Busca animada |
| Animated Modal | Publicação demonstrativa |

Todos os seis componentes em \`src/components/ui\` foram recuperados do catálogo 21st.dev. A aparência cromática de Background Gradient e Glowing Effect foi adaptada para cores oficiais da marca. Bento Grid foi adaptado apenas para retirar dependência de um Button externo; campos e botões de conteúdo usam HTML nativo. **Nenhuma outra biblioteca de componentes de interface** foi usada. Motion, Tailwind e bibliotecas auxiliares são dependências técnicas dos componentes Aceternity.

## Identidade e escopo

Tokens oficiais do repositório: Grafite \`#253033\`, Papel \`#F2F0EB\`, Brasa \`#B84A3A\`. Logotipo SVG original em \`public/logo.svg\`. Tipografia Noto Serif/Noto Sans.

Áreas demonstradas: Início, Comunidade (Publicações, Grupos, Eventos, Perguntas), Mercado (Desapegos, Imóveis, Negócios), Você. Pesquisa, navegação, salvos, participação e publicação fictícia são simuladas no estado da página, sem autenticação, persistência, backend ou divulgação pública de dados.

Os textos, itens e pessoas são demonstrativos. As fotos são referenciadas da pasta pública do próprio projeto Bivaque. A branch é independente; main e produção não foram alteradas.

Fonte: https://21st.dev/@manuarora700/library/aceternity-ui
