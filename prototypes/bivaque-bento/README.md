Bivaque · Bento experimental

Base: HTML R72 original do commit 2e2868de, copiado como blob Git byte-idêntico para reference/Bivaque_Material_Web.original.html. SHA-256 esperado da referência: 29a402c4e717ab2826c2e2aa0c3da6bac7f7b2b390090ed22c5ff1f2cbb385a4.

O projeto React existente apps/prototipo já tem TypeScript, Tailwind 4, shadcn/ui e lucide-react. A pasta apps/prototipo/components/ui é resolvida por @/components/ui. O tema usa os tokens em apps/prototipo/app/globals.css.

A rota /experimentos/bento é uma adaptação das composições do Web3Bento para Bivaque: hero, busca, pilha de cartões, filtros, conteúdo, confiança e ações rápidas. O arquivo pedido web3-bento.tsx é mantido como ponto de importação, mas remove o domínio cripto; não é uma cópia literal do componente Web3 original. O HTML copiado é um documento de referência, não é injetado no React.

Conteúdo demonstrativo; sem consultas ao Supabase ou alteração dos fluxos do produto, homepage e produção. Imagem de casa do Unsplash é ilustrativa.

Na raiz do repositório:
  npx pnpm@11.18.0 install --frozen-lockfile
  npx pnpm@11.18.0 --filter @bivaque/prototipo typecheck
  npx pnpm@11.18.0 --filter @bivaque/prototipo build
  npx pnpm@11.18.0 --filter @bivaque/prototipo dev
Abrir http://localhost:3100/experimentos/bento

Testar 320/360/375/430/768/1440 px, claro/escuro, busca combinada, filtros, vazio, alternância de cartões, salvar, teclado, redução de movimento e links. Não afirmar build concluído sem executar.
