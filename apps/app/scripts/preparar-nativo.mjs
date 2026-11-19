import { cp, mkdir, rm, writeFile } from "node:fs/promises"

const destino = new URL("../dist-nativo/", import.meta.url)
await rm(destino, { recursive: true, force: true })
await mkdir(destino, { recursive: true })
await cp(new URL("../dist/", import.meta.url), new URL("app/", destino), { recursive: true })
await writeFile(
  new URL("index.html", destino),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/app/">',
)
