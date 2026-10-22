// PORT-001 (R73): o símbolo oficial, copiado de mark() em
// prototypes/bivaque-html/src/utilities/format.js — o mesmo desenho de
// apps/web/public/brand/bivaque-symbol.svg. As cores vêm dos tokens
// (--bv-symbol-body e --bv-symbol-threshold), e sobre a foto e no rodapé os
// dois caminhos ficam brancos por CSS, como no protótipo.
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 100 100" aria-hidden="true">
      <path
        className="bv-symbol-body"
        fillRule="evenodd"
        d="M23 5H54C73 5 84 15 84 31C84 42 78 49 67 53C81 57 89 67 89 80C89 91 79 95 63 95H23L14 86V59H36V44H14V14L23 5ZM36 20V40H54C63 40 68 36 68 30C68 24 63 20 54 20H36ZM36 61V80H63C71 80 76 77 76 71C76 65 71 61 63 61H36Z"
      />
      <path className="bv-symbol-threshold" d="M36 44H48V59H36V44Z" />
    </svg>
  )
}
