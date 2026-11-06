import { enviar, FalhaDaApi } from "../api/cliente"

export { lerMeusAnuncios } from "./mercado"

export type DadosDaPergunta = Readonly<{ titulo: string; assunto: string }>
export type DadosDoDesapego = Readonly<{
  chave: string
  titulo: string
  bairro: string
  preco: string
  descricao: string
  categoria: string
  condicao: string
  /** Data URL local; nunca é exibida como mídia de um anúncio já publicado. */
  foto: string
}>

function idGravado(corpo: Record<string, unknown>, campo: string): string {
  const valor = corpo[campo]
  if (
    typeof valor === "object" &&
    valor !== null &&
    "id" in valor &&
    typeof valor.id === "string" &&
    valor.id !== ""
  )
    return valor.id
  throw new FalhaDaApi("indisponivel", 0)
}

export async function publicarPergunta(
  dados: DadosDaPergunta,
  opcoes: { signal?: AbortSignal } = {},
) {
  return idGravado(await enviar("POST", "/api/app/perguntas", dados, opcoes), "pergunta")
}

export async function publicarDesapego(
  dados: DadosDoDesapego,
  opcoes: { signal?: AbortSignal } = {},
) {
  const foto = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dados.foto)
  if (dados.foto !== "" && !foto) throw new FalhaDaApi("invalido", 400)
  return idGravado(
    await enviar(
      "POST",
      "/api/app/mercado",
      {
        ...dados,
        preco: dados.preco.replace(".", ","),
        foto: foto ? { tipo: foto[1], conteudo: foto[2] } : null,
      },
      opcoes,
    ),
    "anuncio",
  )
}
