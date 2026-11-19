export function origensDaCsp(): string {
  return [process.env["NEXT_PUBLIC_SUPABASE_URL"], process.env["NEXT_PUBLIC_SENTRY_DSN"]]
    .flatMap((valor) => {
      if (!valor) return []
      try {
        const url = new URL(valor)
        return url.protocol === "https:" || url.protocol === "http:" ? [url.origin] : []
      } catch {
        return []
      }
    })
    .filter((origem, indice, origens) => origens.indexOf(origem) === indice)
    .join(" ")
}
