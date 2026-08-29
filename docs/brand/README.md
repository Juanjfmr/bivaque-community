# Identidade oficial Bivaque

Esta pasta é a fonte operacional da identidade aprovada em 29 de agosto de 2026.

- Símbolo oficial: **Glifo Bivaque**.
- Dispositivo gráfico secundário: **Pátio**. Nunca substitui o símbolo.
- Palavra BIVAQUE: lettering convertido em paths, sem dependência de fonte.
- Paleta primária: Grafite `#253033`, Papel `#F2F0EB`, Brasa `#B84A3A`.
- Tipografia: Noto Serif para display e Noto Sans para interface.

## Estado no produto

Os arquivos e dados da marca estão prontos para uso, mas a migração visual do runtime não faz
parte desta entrega. O card `FRONTEND-VISUAL-AAA` continua `frozen`; portanto:

- os tokens ativos de `packages/tokens/src/index.ts` e `apps/web/app/globals.css` não mudam;
- o produto continua light-only, conforme D31;
- nenhuma tela, navegação, composição ou manifest é alterado por esta fundação;
- a paleta escura do brandbook é referência de compatibilidade, não autorização para dark mode.

## Fontes para agentes

| Necessidade | Fonte canônica |
|---|---|
| Valores estruturados | `packages/tokens/src/official-brand.ts` |
| Logos e ícones web | `apps/web/public/brand/` |
| Renderização em React | `apps/web/app/components/bivaque/brand-mark.tsx` |
| Regras completas para humanos e agentes | `docs/brand/GUIDELINES.md` |
| Tokens portáveis | `docs/brand/reference/brand-tokens.json` e `.css` |
| Mestre vetorial | `docs/brand/reference/bivaque-master-artwork.svg` |
| Auditoria nas telas | `docs/brand/SCREEN_AUDIT.md` |

## Contrato de uso

1. Use `BrandMark`; não componha `Tent` + texto, emoji, fonte do sistema ou SVG improvisado.
2. Em fundos claros, prefira a versão colorida ou grafite. Em fundos escuros, use a branca.
3. Brasa é sinal e ênfase; não é fundo longo de leitura.
4. Abaixo de 120 px, use o horizontal compacto. Abaixo de 72 px, use o símbolo.
5. Em 16 ou 24 px, use os SVGs otimizados em `brand/icons/`.
6. Preserve transparência, proporções e área livre de `X`, onde `X = 22%` da largura do símbolo.
7. Não use Pátio como logo, favicon ou avatar principal.

## Ativação futura

Quando `FRONTEND-VISUAL-AAA` for liberado, a migração deve ser uma entrega visual própria:

1. atualizar `DESIGN_SPEC.md` e `VISUAL_GUIDE.md` pela decisão aprovada;
2. mapear a paleta para tokens semânticos e espelhar em `globals.css`;
3. substituir somente os wordmarks provisórios pelo componente canônico;
4. atualizar manifest, favicons e ícones PWA a partir de `public/brand/icons/`;
5. validar 375, 768 e 1440 px, alto contraste e redução 16/24/32/48 px;
6. rodar o loop visual, registrar o veredito e só então ativar no runtime.

Não copie cores do PDF manualmente. Leia os valores estruturados e preserve a distinção entre
identidade aprovada e tema ativo.
