# Bivaque Next.js + shadcn/ui — primeira entrega experimental

Origem de produto: protótipo HTML R72 congelado em 22/10/2026, no mesmo repositório (VISUAL_BASELINE_R72.md). Referências de comportamento: src/features/home, src/shell/navigation, ADRs de 20 e 22/10. Contém Next App Router, Tailwind 4, React 19 e componentes locais shadcn/ui sobre Radix.

## Rodar
- Node 22 ou superior
- Entre neste diretório
- npm install
- npm run dev
- Abra http://localhost:3100

A navegação, busca, filtros, favoritos, marcação do guia, cadastro demonstrativo e tema estão acessíveis sem backend. Dados simulados ficam neste protótipo; nenhuma autenticação ou verificação militar real está implementada.

**Escopo e limites:** esta é a fundação interativa para validar a troca da biblioteca visual. Não é uma reprodução pixel a pixel nem um porte funcional completo das 33 rotas da R72. Não altera a aplicação Next atual, o backend, a main ou as decisões aceitas. A migração definitiva exige mapa dos 33 fluxos, comparação de screenshots em 375/768/1440 nos dois temas, teclado/acessibilidade e testes com Supabase. Em especial, a mudança de Material Web para shadcn/ui precisará de revisão do ADR-20261022-porte-visual-material-web.

Fontes Noto e assinaturas oficiais foram reaproveitadas como objetos Git do repositório, sem CDN.
