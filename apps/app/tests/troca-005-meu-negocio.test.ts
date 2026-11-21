import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// TROCA-005 — contrato de fonte de Meu negócio em abas. As telas são JSX com
// ganchos de rede; o que se prova aqui é a decisão de desenho: abas na URL (não
// telas novas), a Folha única para o pedido e a falha honesta por aba.

const raiz = join(import.meta.dirname, "..")
const ler = (caminho: string) => readFileSync(join(raiz, caminho), "utf8")

const meuNegocio = ler(join("src", "meu-negocio", "MeuNegocio.tsx"))
const pedidos = ler(join("src", "meu-negocio", "PedidosRecebidos.tsx"))
const conta = ler(join("src", "meu-negocio", "ContaDoNegocio.tsx"))

describe("TROCA-005 — Meu negócio em abas", () => {
  it("tem as quatro abas e lê a aba da URL", () => {
    expect(meuNegocio).toContain('{ id: "ficha", rotulo: "Ficha" }')
    expect(meuNegocio).toContain('{ id: "catalogo", rotulo: "Catálogo" }')
    expect(meuNegocio).toContain('{ id: "pedidos", rotulo: "Pedidos" }')
    expect(meuNegocio).toContain('{ id: "conta", rotulo: "Conta" }')
    expect(meuNegocio).toContain('busca["aba"]')
    expect(meuNegocio).toContain("useTrocarBusca")
    expect(meuNegocio).toContain("useCargaDaLista")
  })

  it("cada aba com leitura mostra erro honesto, não vazio", () => {
    expect(meuNegocio).toContain("FalhaDaLeitura")
    expect(pedidos).toContain("FalhaDaLeitura")
    expect(conta).toContain("FalhaDaLeitura")
  })

  it("o pedido abre na Folha e o prestador responde com a conversa do pedido", () => {
    expect(pedidos).toContain("<Folha")
    expect(pedidos).toContain('sobreposicao="pedido-do-negocio"')
    expect(pedidos).toContain("Enviar resposta")
    expect(pedidos).toContain("lerConversaDoPedido")
    expect(pedidos).toContain("responderAoPedido")
    expect(pedidos).toContain("Encerrar pedido")
  })

  it("a área de atendimento lê e grava o alcance", () => {
    expect(pedidos).toContain("lerAtendimento")
    expect(pedidos).toContain("salvarAtendimento")
  })

  it("a conta mostra o e-mail da sessão e o telefone opcional", () => {
    expect(conta).toContain("telefone")
    expect(conta).toContain("Mostrar meu telefone na ficha pública")
    expect(conta).toContain("Salvar conta")
  })
})
