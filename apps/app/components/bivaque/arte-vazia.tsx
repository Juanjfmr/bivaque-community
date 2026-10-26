/**
 * A ilustração do estado vazio (inventário §7, `shell/primitives.js`:
 * `EMPTY_ART`): o desenho sem imagem nova, "peso zero". Serve o estado vazio e
 * a variante de conteúdo bloqueado.
 */
export function ArteVazia({ className = "size-33" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 132 112"
      aria-hidden="true"
      focusable="false"
      className={className}
      data-arte="vazia"
    >
      <path
        fill="var(--secondary-container)"
        d="M66 6c22 0 44 10 52 30s4 44-12 58-42 20-64 12S8 80 10 56 26 14 46 8c7-2 13-2 20-2z"
      />
      <circle
        cx="66"
        cy="56"
        r="47"
        fill="none"
        stroke="var(--outline-variant)"
        strokeWidth="1.5"
        strokeDasharray="3 6"
      />
    </svg>
  )
}
