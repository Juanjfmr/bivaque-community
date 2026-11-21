import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"

function origem(chave) {
  try {
    const url = new URL(process.env[chave])
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error()
    return url.origin
  } catch {
    throw new Error(`Configure ${chave} com uma URL absoluta para o build nativo`)
  }
}

const api = origem("VITE_API_BASE")
const storage = origem("VITE_SUPABASE_URL")
const politica = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' ${api} ${storage}; img-src 'self' data: blob: ${api} ${storage}; object-src 'none'; base-uri 'none'; frame-src 'none'`
const destino = new URL("../dist-nativo/", import.meta.url)
await rm(destino, { recursive: true, force: true })
await mkdir(destino, { recursive: true })
await cp(new URL("../dist/", import.meta.url), new URL("app/", destino), { recursive: true })
const pagina = await readFile(new URL("../dist/index.html", import.meta.url), "utf8")
const meta = `<meta http-equiv="Content-Security-Policy" content="${politica}">`
await writeFile(new URL("app/index.html", destino), pagina.replace("<head>", `<head>${meta}`))
await writeFile(new URL("raiz.js", destino), 'if(location.pathname==="/")history.replaceState(null,"","/app/")\n')
await writeFile(new URL("index.html", destino), pagina.replace("<head>", `<head>${meta}<script src="/raiz.js"></script>`))
