import { readFileSync, writeFileSync } from "node:fs"
import { renderBoardSummary, validateBoard } from "./board-lib.mjs"

// A largura do formatador do biome (biome.json: lineWidth 100).
const larguraDaColuna = 100

// Campos de lista aceitos pela nota e cartões seguem o esquema do board.json.
const camposDeLista = new Set(["notes", "proof", "tests", "links", "blockers", "dependencies"])

export class ErroDePatch extends Error {}

// Formato determinístico que `biome check` aceita sem alteração: objeto sempre
// expandido (o biome preserva expansão), lista em uma linha quando cabe na
// largura da coluna. Ver tests/scope/board-apply.test.mjs.
function emUmaLinha(valor) {
  if (Array.isArray(valor)) {
    if (valor.length === 0) return "[]"
    const itens = valor.map(emUmaLinha)
    return itens.some((item) => item === undefined) ? undefined : `[${itens.join(", ")}]`
  }
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor)
  return Object.keys(valor).length === 0 ? "{}" : undefined
}

function formatar(valor, indentacao, coluna, virgula) {
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor)
  const linha = emUmaLinha(valor)
  // A vírgula separadora conta na largura da linha, como no biome.
  if (linha !== undefined && coluna + linha.length + virgula <= larguraDaColuna) return linha
  const recuo = " ".repeat(indentacao)
  if (Array.isArray(valor)) {
    const itens = valor.map(
      (item, indice) =>
        `${recuo}  ${formatar(item, indentacao + 2, indentacao + 2, indice < valor.length - 1 ? 1 : 0)}`,
    )
    return `[\n${itens.join(",\n")}\n${recuo}]`
  }
  const entradas = Object.entries(valor).map(([chave, item], indice, todas) => {
    const prefixo = `${recuo}  ${JSON.stringify(chave)}: `
    const ultima = indice === todas.length - 1
    return `${prefixo}${formatar(item, indentacao + 2, prefixo.length, ultima ? 0 : 1)}`
  })
  return `{\n${entradas.join(",\n")}\n${recuo}}`
}

export function formatarQuadro(quadro) {
  return `${formatar(quadro, 0, 0, 0)}\n`
}

function exigirCartao(quadro, id) {
  if (typeof id !== "string" || !id.trim()) throw new ErroDePatch("id é obrigatório")
  const cartao = quadro.cards.find((item) => item.id === id)
  if (!cartao) throw new ErroDePatch(`cartão inexistente: ${id}`)
  return cartao
}

function aplicarOperacao(quadro, operacao, relatorio) {
  if (!operacao || typeof operacao !== "object")
    throw new ErroDePatch("operação deve ser um objeto")
  switch (operacao.op) {
    case "create": {
      const cartao = operacao.card
      if (!cartao || typeof cartao !== "object" || Array.isArray(cartao)) {
        throw new ErroDePatch("card é obrigatório e deve ser um objeto")
      }
      const existente = quadro.cards.find((item) => item.id === cartao.id)
      // Idempotência por id: reaplicar o mesmo patch não duplica o cartão; um
      // cartão diferente com o mesmo id é erro.
      if (existente) {
        if (JSON.stringify(existente) === JSON.stringify(cartao)) {
          relatorio.inalterados.push(cartao.id)
          return
        }
        throw new ErroDePatch(`já existe um cartão com o id ${cartao.id}`)
      }
      quadro.cards.push(cartao)
      relatorio.criados.push(cartao.id)
      return
    }
    case "update": {
      const cartao = exigirCartao(quadro, operacao.id)
      const campos = operacao.set
      if (!campos || typeof campos !== "object" || Array.isArray(campos)) {
        throw new ErroDePatch("set é obrigatório e deve ser um objeto")
      }
      const conhecidos = new Set(quadro.cards.flatMap((item) => Object.keys(item)))
      for (const [campo, valor] of Object.entries(campos)) {
        if (campo === "id") throw new ErroDePatch("id não pode ser alterado")
        if (!conhecidos.has(campo)) throw new ErroDePatch(`campo desconhecido no cartão: ${campo}`)
        cartao[campo] = valor
      }
      relatorio.alterados.push(cartao.id)
      return
    }
    case "move": {
      const cartao = exigirCartao(quadro, operacao.id)
      if (typeof operacao.status !== "string") throw new ErroDePatch("status é obrigatório")
      const anterior = cartao.status
      for (const campo of ["status", "completedAt", "updatedAt"]) {
        if (operacao[campo] !== undefined) cartao[campo] = operacao[campo]
      }
      if (anterior === operacao.status) relatorio.inalterados.push(cartao.id)
      else relatorio.movidos.push(`${cartao.id}: ${anterior} -> ${operacao.status}`)
      return
    }
    case "note": {
      const cartao = exigirCartao(quadro, operacao.id)
      const campo = operacao.field ?? "notes"
      if (!camposDeLista.has(campo)) {
        throw new ErroDePatch(`field aceita ${[...camposDeLista].join(", ")}; recebido: ${campo}`)
      }
      if (typeof operacao.text !== "string" || !operacao.text.trim()) {
        throw new ErroDePatch("text é obrigatório")
      }
      const lista = cartao[campo] ?? []
      if (!Array.isArray(lista)) throw new ErroDePatch(`${campo} não é uma lista`)
      // Idempotência por conteúdo: reaplicar o mesmo patch não repete a nota.
      if (lista.includes(operacao.text)) {
        relatorio.inalterados.push(cartao.id)
        return
      }
      cartao[campo] = [...lista, operacao.text]
      relatorio.notas.push(`${cartao.id}/${campo}`)
      return
    }
    case "checklist": {
      const cartao = exigirCartao(quadro, operacao.id)
      const itens = Array.isArray(cartao.checklist) ? cartao.checklist : []
      const indice = itens.indexOf(operacao.item)
      if (indice === -1) throw new ErroDePatch(`item de checklist não encontrado: ${operacao.item}`)
      const marcado = operacao.checked ?? true
      const concluidos = Array.isArray(cartao.completedChecklist)
        ? [...cartao.completedChecklist]
        : []
      while (concluidos.length <= indice) concluidos.push(false)
      if (concluidos[indice] === marcado) {
        relatorio.inalterados.push(cartao.id)
        return
      }
      concluidos[indice] = marcado
      cartao.completedChecklist = concluidos
      relatorio.checklist.push(`${cartao.id}: ${operacao.item}`)
      return
    }
    default:
      throw new ErroDePatch(`op desconhecido: ${String(operacao.op)}`)
  }
}

export function aplicarPatch(quadro, patch) {
  const operacoes = Array.isArray(patch) ? patch : patch?.operations
  if (!Array.isArray(operacoes) || operacoes.length === 0) {
    throw new ErroDePatch("o patch precisa de operations: uma lista não vazia")
  }
  const resultado = structuredClone(quadro)
  const relatorio = {
    criados: [],
    alterados: [],
    movidos: [],
    notas: [],
    checklist: [],
    inalterados: [],
  }
  operacoes.forEach((operacao, indice) => {
    const id = operacao?.id ?? operacao?.card?.id
    const rotulo = `${indice + 1} (${operacao?.op ?? "sem op"}${id ? ` ${id}` : ""})`
    try {
      aplicarOperacao(resultado, operacao, relatorio)
    } catch (erro) {
      throw new ErroDePatch(`operação ${rotulo}: ${erro.message}`)
    }
  })
  // As mesmas regras do --check, agora sobre o resultado.
  const erros = validateBoard(resultado)
  if (erros.length > 0) {
    throw new ErroDePatch(
      `o quadro resultante é inválido:\n${erros.map((e) => `- ${e}`).join("\n")}`,
    )
  }
  return { quadro: resultado, relatorio }
}

// Nada é escrito antes de todas as operações passarem e o resultado validar:
// em qualquer erro o board.json no disco fica byte a byte igual ao de antes.
export function aplicarPatchNoQuadro({ boardPath, summaryPath, patchPath, dryRun = false }) {
  const original = readFileSync(boardPath, "utf8")
  const patch = JSON.parse(readFileSync(patchPath, "utf8"))
  const { quadro, relatorio } = aplicarPatch(JSON.parse(original), patch)
  const conteudo = formatarQuadro(quadro)
  const mudou = conteudo !== original
  if (dryRun) return { relatorio, escreveu: false, mudou }
  if (mudou) writeFileSync(boardPath, conteudo, "utf8")
  // O resumo sempre sai daqui: um BOARD.md atrasado se cura na primeira execução.
  writeFileSync(summaryPath, renderBoardSummary(quadro), "utf8")
  return { relatorio, escreveu: mudou, mudou }
}

export function relatarAplicacao({ relatorio, mudou, escreveu }) {
  const linhas = []
  const grupo = (rotulo, itens) => {
    if (itens.length > 0) linhas.push(`${rotulo}: ${itens.length} — ${itens.join("; ")}`)
  }
  grupo("cartões criados", relatorio.criados)
  grupo("cartões alterados", relatorio.alterados)
  grupo("cartões movidos", relatorio.movidos)
  grupo("notas", relatorio.notas)
  grupo("checklist", relatorio.checklist)
  grupo("sem mudança", relatorio.inalterados)
  if (!mudou) linhas.push("O quadro não muda.")
  if (!escreveu) linhas.push("dry-run: nada foi escrito.")
  return `${linhas.join("\n")}\n`
}
