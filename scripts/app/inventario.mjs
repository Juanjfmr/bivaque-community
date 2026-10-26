import { createHash } from "node:crypto"

// IDs vêm da referência, independentemente do arquivo que declara a cobertura.
// As descrições narrativas continuam sujeitas à revisão humana do inventário.
export function linhasDoInventario(texto) {
  const linhas = texto.split(/\r?\n/)
  const itens = []
  const repeticoes = new Map()
  let secao = 0
  let contexto = ""
  let tabela = false
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    const capitulo = /^## (\d+)\./.exec(linha)
    if (capitulo) secao = Number(capitulo[1])
    if (/^#{2,6} /.test(linha)) contexto = linha
    if (!linha.startsWith("|")) {
      tabela = false
      continue
    }
    if (/^\|[\s:|-]+\|$/.test(linhas[i + 1] ?? "")) {
      tabela = true
      continue
    }
    if (!tabela || /^\|[\s:|-]+\|$/.test(linha) || secao < 1 || secao > 9) continue
    const rotulo = linha.split(/(?<!\\)\|/)[1].trim()
    const hash = createHash("sha256")
      .update(`${secao}\n${contexto}\n${rotulo}`)
      .digest("hex")
      .slice(0, 16)
    const repeticao = (repeticoes.get(hash) ?? 0) + 1
    repeticoes.set(hash, repeticao)
    itens.push({ id: `inv:${secao}:${hash}:${repeticao}`, secao, contexto, rotulo, linha: i + 1 })
  }
  return itens
}
