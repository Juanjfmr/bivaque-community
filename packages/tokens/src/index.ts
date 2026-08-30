// Bivaque design tokens — DESIGN_SPEC.md §1 é a fonte de verdade.
// Todo valor aqui é espelhado como custom property em apps/web/app/globals.css;
// mantenha os dois em sincronia. Componentes leem tokens (var(--…) ou
// brandTokens), nunca cor crua.
//
// Paleta: a IDENTIDADE OFICIAL, aprovada em 2026-08-29 e versionada em
// packages/tokens/src/official-brand.ts — Grafite #253033, Papel #F2F0EB,
// Brasa #B84A3A, com Noto Serif no display e Noto Sans na interface.
//
// Isto substitui dois conjuntos anteriores, nesta ordem:
//
//   1. "Navy Professional" (#F8FAFC / #020617 / #1E3A8A) — a tríade padrão do
//      Tailwind, que é o que todo starter de SaaS entrega e o motivo de o
//      produto autenticado ler como genérico. Nunca foi escolhido: DS-036
//      (EXP-004) o chamava de "one candidate, not baseline truth".
//   2. "Papel & Mata" (papel quente + verde-mata + Literata/Inter) — a direção
//      editorial que o funil já shipava e que o owner selecionou ao fechar o
//      EXP-004. Estava certa na FORMA e errada na COR: a marca oficial entrou
//      no main um dia depois, com outra paleta e outra tipografia.
//
// A estrutura editorial daquela entrega permanece — lista com fio, elevação
// rasa, raio quase-reto, primitivas .eyebrow/.paper/.ruled. O que muda são os
// valores, agora ancorados na marca em vez de derivados do funil.
//
// Derivados marcados abaixo com "derivado": a marca não define superfície
// elevada clara nem texto secundário, porque o brandbook cobre a identidade,
// não o sistema de UI. Cada derivado é declarado, não inventado em silêncio.
//
// Contraste: todo par texto/fundo em uso é >= 4.5:1 e todo sólido com texto
// >= 4.5:1, medido numericamente (DS-029 / WCAG 2.2 AA).
export const brandTokens = {
  productName: "Bivaque",
  color: {
    background: "#F2F0EB", // Papel — oficial
    foreground: "#253033", // Grafite — oficial (11.90:1 no papel)
    surface: "#FBFAF7", // derivado: papel elevado; a marca não define superfície clara
    accent: "#B84A3A", // Brasa — oficial. Ação decisiva, foco, item ativo
    accentForeground: "#FBFAF7",
    // Cards acima do fundo da página.
    surfaceRaised: "#FBFAF7", // derivado
    // Áreas rebaixadas (campo do compositor, estados vazios).
    surfaceSunken: "#E8E5DE", // derivado
    // Preenchimentos neutros sutis (iniciais de avatar, chips, hover).
    surfaceSubtle: "color-mix(in oklch, #253033 7%, transparent)",
    // Fio de cabelo; substitui as bordas color-mix inline.
    border: "color-mix(in oklch, #253033 12%, transparent)",
    // Texto secundário; derivado. 5.48:1 no papel, 5.98:1 na superfície.
    muted: "#556366",
    // Tinta de 12% do acento para chip selecionado e nav ativa.
    accentSoft: "color-mix(in oklch, #B84A3A 12%, transparent)",
    // Brasa escurecida. Brasa cheia dá 4.52:1 no papel — passa raspando, e
    // falha no sunken (4.09). Link e texto de acento usam esta; preenchimento
    // sólido usa a brasa aprovada.
    accentStrong: "#9E3B2C",
    danger: "#8F2E23", // derivado: mais fundo que brasa, para não se confundir com ela
    dangerSoft: "color-mix(in oklch, #8F2E23 14%, transparent)",
    warning: "#7A5312", // derivado (6.00:1)
    success: "#2F6A4F", // derivado (5.60:1)
    // Superfície flutuante (semântica HeroUI v3: modal, popover, menu).
    overlay: "#FBFAF7",
    // Scrim do modal. DESIGN_SPEC §1 chama esse papel de "--overlay", mas o
    // HeroUI v3 reserva --overlay para a superfície flutuante.
    backdrop: "color-mix(in oklch, #171E20 55%, transparent)",
    // Neutros oficiais secundários.
    charcoal: "#171E20", // superfície invertida / masthead
    // Mist é DECORATIVO. 2.75:1 no papel — nunca carrega texto. Quem carrega
    // texto secundário é `muted`.
    mist: "#78979B",
  },
  // Elevation is deliberately shallow. The previous set leaned on 16-40px ambient
  // shadows, which is what made every list read as cards floating over grey. Here a
  // card is distinguished by its paper surface against the warmer page, plus a
  // hairline; shadow is reserved for things that genuinely float (menus, modals).
  elevation: {
    0: "none",
    1: "0 1px 0 color-mix(in oklch, #17211D 6%, transparent)",
    2: "0 1px 2px color-mix(in oklch, #17211D 8%, transparent), 0 2px 6px color-mix(in oklch, #17211D 6%, transparent)",
    3: "0 4px 8px color-mix(in oklch, #17211D 10%, transparent), 0 16px 40px color-mix(in oklch, #17211D 16%, transparent)",
  },
  // 4px scale.
  space: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    6: "1.5rem",
    8: "2rem",
    12: "3rem",
  },
  // Editorial radii: near-square for content surfaces, pill kept only for controls
  // that are genuinely pill-shaped (chips, avatars). Content no longer uses 12-16px
  // rounding, which reads as app-store card furniture rather than a page.
  radius: {
    sm: "0.25rem",
    base: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
  // Nothing below 12px; body line-height 1.5+, headings 1.15 (see globals.css).
  text: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.375rem",
    "2xl": "1.75rem",
    "3xl": "2.25rem",
  },
  // Typography families. The serif carries the identity and is used for headings,
  // the wordmark and pull quotes; the sans is the UI workhorse. Both are self-hosted
  // through next/font — no runtime fetch to a third party, which also keeps the
  // funnel free of an external request tied to a visitor (LGPD).
  font: {
    serif: "var(--font-serif)", // Noto Serif — display oficial
    sans: "var(--font-sans)", // Noto Sans — interface oficial
  },
  motion: {
    duration: {
      instant: "100ms",
      fast: "160ms",
      base: "240ms",
      slow: "320ms",
    },
    ease: {
      out: "cubic-bezier(0.16, 1, 0.3, 1)",
      in: "cubic-bezier(0.7, 0, 0.84, 0)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },
  // Ações de segundo nível, que não devem competir com a brasa. Grafite é o
  // neutro dominante da marca e serve exatamente a esse papel.
  secondaryAccent: "#253033",
} as const

export { officialBrandIdentity } from "./official-brand"
