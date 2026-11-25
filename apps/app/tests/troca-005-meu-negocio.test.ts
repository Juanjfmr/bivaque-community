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

  it("a Ficha escolhe o caminho pelo tipo da conta", () => {
    expect(meuNegocio).toContain("tipoDaConta")
    expect(meuNegocio).toContain("salvarMinhaFichaDePrestador")
    expect(meuNegocio).toContain('tipoDaConta === "prestador"')
  })

  it("a Área de atendimento só existe para a conta de prestador, com a frase do servidor", () => {
    expect(pedidos).toContain('tipoDaConta === "prestador"')
    expect(pedidos).toContain("ehPrestador ? (")
    expect(pedidos).toContain("mensagemDaAcao(falha)")
    expect(pedidos).not.toContain("Não foi possível salvar a área de atendimento agora")
  })

  it("a fila de pedidos recebidos vem do servidor, com página e cursor", () => {
    expect(pedidos).toContain('lado: "recebidos"')
    expect(pedidos).toContain("pedidos.proximo")
    expect(pedidos).toContain("carregarMais")
    expect(pedidos).toContain("Ver mais pedidos")
    // O vazio só aparece quando o servidor confirma que não há mais nenhum.
    expect(pedidos).toContain("pedidos.pedidos.length === 0 && pedidos.proximo === null")
    // Nada de filtrar o lado no navegador.
    expect(pedidos).not.toContain('filter((pedido) => pedido.lado === "dono")')
  })

  it("o detalhe do pedido abre pela URL, a recarga reabre e fechar tira o id", () => {
    expect(pedidos).toContain('busca["pedido"]')
    expect(pedidos).toContain("pedido: pedido.id")
    expect(pedidos).toContain("abertoPelaUrl")
    // B2 da revisão da correção 1: fechar não deixa `?pedido=` para trás.
    expect(pedidos).toContain('busca["pedido"] === undefined')
    expect(pedidos).toContain('void trocarBusca({ aba: "pedidos" })')
  })

  it("a ficha de quem não tem página é a do Meu negócio, não um palpite da aba", () => {
    // B3 da revisão da correção 1: `temFicha` vem do pai (`ficha !== null`);
    // a aba não inventa estado próprio a partir da leitura de atendimento.
    expect(meuNegocio).toContain("temFicha={carregado ? ficha !== null : null}")
    expect(pedidos).toContain("readonly temFicha: boolean | null")
    expect(pedidos).not.toContain("setTemFicha(")
    expect(pedidos).toContain("temFicha === false")
  })

  it("a conta mostra o e-mail da sessão e o telefone opcional", () => {
    expect(conta).toContain("telefone")
    expect(conta).toContain("Mostrar meu telefone na ficha pública")
    expect(conta).toContain("Salvar conta")
    // O prestador também abre esta aba: a frase não pode chamá-lo de membro.
    expect(conta).not.toContain("conta de membro")
  })
})
