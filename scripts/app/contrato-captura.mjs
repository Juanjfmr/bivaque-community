import assert from "node:assert/strict"

export function matrizDeCaptura(rotas) {
  return rotas.flatMap((rota) =>
    [375, 1440].flatMap((largura) =>
      ["light", "dark"].map((tema) => ({
        id: `${rota}-${largura}-${tema}`,
        rota,
        largura,
        altura: largura === 375 ? 812 : 900,
        tema,
      })),
    ),
  )
}

export function htmlDoPar({ esquerda, direita, largura }) {
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Comparação Bivaque</title>
<style>body{margin:0;background:#e6e4df;font:14px system-ui;display:flex;gap:16px}figure{margin:0;width:${largura}px}figcaption{height:36px;display:flex;align-items:center;padding:0 10px;box-sizing:border-box;background:#203a31;color:white}img{display:block;width:100%}</style>
<figure><figcaption>Protótipo HTML — esquerda</figcaption><img src="${esquerda}" alt="Protótipo HTML"></figure>
<figure><figcaption>App novo — direita</figcaption><img src="${direita}" alt="App novo"></figure></html>`
}

export function validarDestino(atual, esperado) {
  assert.equal(atual.caminho, esperado.caminho, "Destino de captura incorreto")
  assert.equal(atual.titulo, esperado.titulo, "Título de captura incorreto")
  assert.equal(atual.pronto, true, "Página ainda não terminou o boot")
  if (esperado.tela !== undefined)
    assert.equal(atual.tela, esperado.tela, "Conteúdo de outra tela na captura")
}

export function validarResultadoE2e(texto, esperados) {
  assert.doesNotMatch(
    texto,
    /^\s*\d+ (?:failed|flaky|interrupted)\b/m,
    "E2E tem falhas ou instabilidade",
  )
  const passou = /^\s*(\d+) passed\b/m.exec(texto)
  assert(passou, "Falta sumário do Playwright")
  assert.equal(Number(passou[1]), esperados, "Bateria incompleta")
}

export function validarCobertura(itens, esperados, existe) {
  const erros = []
  const ids = new Set()
  for (const item of itens) {
    if (ids.has(item.id)) erros.push(`ID duplicado: ${item.id}`)
    ids.add(item.id)
    if (!esperados.includes(item.id)) erros.push(`ID sem origem: ${item.id}`)
    if (item.estado === "implementado") {
      for (const campo of ["arquivos", "testes", "provas"]) {
        if (!item[campo]?.length) erros.push(`${item.id}: falta ${campo}`)
        for (const arquivo of item[campo] ?? []) {
          if (typeof arquivo !== "string" || arquivo.trim() === "" || !existe(arquivo))
            erros.push(`${item.id}: ${campo} inexistente: ${arquivo}`)
        }
      }
    } else if (!["pendente", "dispensado"].includes(item.estado) || !item.motivo) {
      erros.push(`${item.id}: estado ou justificativa inválidos`)
    }
  }
  for (const id of esperados) if (!ids.has(id)) erros.push(`Item do inventário sem registro: ${id}`)
  return erros
}
