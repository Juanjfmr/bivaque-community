export function retornoValido(valor: string | null): string | null {
  if (!valor?.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return null
  const url = new URL(valor, "https://bivaque.example.invalid")
  if (url.origin !== "https://bivaque.example.invalid") return null
  if (
    !url.pathname.startsWith("/app/") &&
    !/^\/groups\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url.pathname)
  )
    return null
  return `${url.pathname}${url.search}${url.hash}`
}
