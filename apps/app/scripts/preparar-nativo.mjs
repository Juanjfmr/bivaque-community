import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"

const destino = new URL("../dist-nativo/", import.meta.url)
await rm(destino, { recursive: true, force: true })
await mkdir(destino, { recursive: true })
await cp(new URL("../dist/", import.meta.url), new URL("app/", destino), { recursive: true })
const pagina = await readFile(new URL("../dist/index.html", import.meta.url), "utf8")
await writeFile(
  new URL("index.html", destino),
  pagina.replace(
    "<head>",
    '<head><script>if(location.pathname==="/")history.replaceState(null,"","/app/")</script>',
  ),
)
