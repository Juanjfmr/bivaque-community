export function retornoValido(valor: string | null): string | null {
  if (!valor?.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return null
  const url = new URL(valor, "https://bivaque.example.invalid")
  if (url.origin !== "https://bivaque.example.invalid") return null
  if (!url.pathname.startsWith("/app/") && url.pathname !== "/gerir-comunidades") return null
  return `${url.pathname}${url.search}${url.hash}`
}
