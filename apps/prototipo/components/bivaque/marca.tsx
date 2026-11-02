// O símbolo do Bivaque, do protótipo (`shell/template.html`): o "B" com o
// degrau em Brasa. As cores vêm dos tokens do tema.
export function Marca({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
      <path
        fill="var(--on-surface)"
        fillRule="evenodd"
        d="M23 5H54C73 5 84 15 84 31C84 42 78 49 67 53C81 57 89 67 89 80C89 91 79 95 63 95H23L14 86V59H36V44H14V14L23 5ZM36 20V40H54C63 40 68 36 68 30C68 24 63 20 54 20H36ZM36 61V80H63C71 80 76 77 76 71C76 65 71 61 63 61H36Z"
      />
      <path fill="var(--brasa)" d="M36 44H48V59H36V44Z" />
    </svg>
  )
}
