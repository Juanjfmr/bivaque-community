# Incorporação gradual dos tokens oficiais do Bivaque no shadcn/ui

## Fontes canônicas

- `docs/brand/reference/brand-tokens.json` e `brand-tokens.css`: valores primitivos.
- `docs/decisions/ADR-20261020-identidade-visual-e-tema-escuro.md`: contrato aprovado para os temas.
- `docs/brand/GUIDELINES.md`: regras do glifo, assinaturas e tipografia.
- Ativos SVG oficiais: `apps/web/public/brand/`; esta demonstração serve as cópias em `public/brand/`.
- Noto Sans e Noto Serif são arquivos locais em `public/fonts/` carregados pelo `next/font/local`.

## Semântica Bivaque → shadcn

| Papel | Tema claro | Tema escuro |
|---|---|---|
| Fundo `--background` | Papel `#F2F0EB` | Carvão `#171E20` |
| Texto `--foreground` | Grafite `#253033` | `#ECEAE4` |
| Superfície `--card` | Branco `#FFFFFF` (derivado) | Elevado `#20292B` |
| Botão convencional `--primary` | Grafite | `#ECEAE4` |
| Ação de criação `--bivaque-create` | Brasa `#B84A3A` | Brasa Clara `#E07A5A` |
| Links de cidade `--bivaque-city` | `#9E3B2C` | Brasa Clara |
| Texto secundário | `#55625F` | `#A9B8BA` |
| Bordas e campos | `#D8D4CC` | `#33403F` |
| Sidebar | Grafite | Elevado |
| Foco `--ring` | Névoa `#78979B` | Névoa |
| Raio de cartão `--radius-lg` | 12 px | 12 px |
| Tipografia de UI | Noto Sans | Noto Sans |
| Display e títulos editoriais | Noto Serif | Noto Serif |

Valores derivados de UI (branco, linha, destaque, muted) seguem a maquete aprovada; **não são novas cores da marca**.

### Restrições implementadas

1. O `Button` da biblioteca não foi editado: ações rotineiras continuam Grafite; a classe utilitária baseada em `--bivaque-create` colore exclusivamente Criar, Anunciar, Perguntar e o envio de uma nova publicação.
2. Os arquivos shadcn gerados continuam intactos. Apenas `app/globals.css`, `app/layout.tsx` e a composição `components/library-app.tsx` receberam mudanças.
3. Tema padrão **Automática**, com seleção Clara/Escura via `next-themes`, salvo sob `bivaque-shadcn-theme`.
4. O logo SVG oficial não é reconstruído em texto; o símbolo branco alternativo atende à sidebar recolhida.
5. Não há alterações de regras de negócio, dados fictícios, layout de módulos ou URLs nesta rodada. A home mantém seu overlay fotográfico com cores de token.

### Limites

A aprovação visual em 375, 768 e 1440 px e dos contrastes de cada controle requer capturas e navegação reais; build e inspeção de HTML/CSS são verificações diferentes. A branch experimental não substitui a especificação visual R72 nem altera a `main`.
