# Bivaque · Experimento Bento

## Origem verificada

O arquivo `reference/Bivaque_Material_Web.R72.aprovado.html` foi remontado com os blobs do commit `2e2868de98f1` na ordem do manifesto `prototypes/bivaque-html/src/manifest.json`, conforme o procedimento `scripts/bivaque-html/round13-baseline.mjs`.

SHA-256 verificado: `7e7657c3652ce6daff450d8dfe5d9ce8d8eda8d6189bcd3f2317a2f25fb61d2d`.

Tamanho: 3.459.709 bytes. Esta é a R72 aprovada em 22/10/2026. Não confundir com o arquivo `prototypes/bivaque-html/reference/Bivaque_Material_Web.original.html` (baseline histórica anterior, hash `29a402c4...`).

## Integração isolada

- Aplicativo React: `apps/prototipo` (Next.js, React, TypeScript, Tailwind 4, shadcn/ui).
- Local de UI: `apps/prototipo/components/ui`, alias `@/components/ui`; estilos globais em `apps/prototipo/app/globals.css`.
- Componente experimental: `apps/prototipo/components/ui/web3-bento.tsx`.
- Exemplo de uso: `apps/prototipo/app/experimentos/bento/demo.tsx`.
- Rota: `/experimentos/bento`. A Home `/inicio` não muda.
- Sem dependências novas. `lucide-react`, shadcn e React já estão presentes.
- O nome `web3-bento.tsx` foi mantido como o prompt exigiu, mas é uma adaptação para a comunidade Bivaque, não reprodução literal dos módulos financeiros.
- O HTML R72 é preservado para comparação; o React não injeta a referência no DOM.
- Conteúdo ilustrativo sem integração Supabase. Imagem de moradia do Unsplash, não anúncio.

## Verificações locais

Na raiz do monorepo:

```sh
npx pnpm@11.18.0 install --frozen-lockfile
npx pnpm@11.18.0 --filter @bivaque/prototipo typecheck
npx pnpm@11.18.0 --filter @bivaque/prototipo build
npx pnpm@11.18.0 --filter @bivaque/prototipo dev
```

Abrir `http://localhost:3100/experimentos/bento`. Validar 320, 360, 375, 430, 768 e 1440 px; modos claro/escuro; teclado; busca+filtros; estado vazio; alternância dos cards; salvar; redução de movimento e links. Build, QA visual e publicação ainda não foram executados nesta entrega.

Sem merge, deploy ou mudanças na R72 ou na Home atual.