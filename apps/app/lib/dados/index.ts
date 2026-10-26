import auxiliares from "../demo/auxiliares.json"
import { CENARIOS, LOCALIDADES } from "../demo/cenarios"
import { IMAGENS } from "../demo/imagens"
import type { DadosDaCidade, DadosDoApp } from "./contrato"

export type { DadosDaCidade, DadosDoApp } from "./contrato"

/** Porta local, sem rede/escrita. A conexão real substitui esta implementação. */
export function criarDadosDemo(cenario: "live" | "seed" = "live"): DadosDoApp {
  const fonte = CENARIOS[cenario]
  return {
    async lerCidade(cidade, opcoes = {}) {
      opcoes.signal?.throwIfAborted()
      const localidade = LOCALIDADES.find((item) => item.city_name === cidade)
      if (!localidade) throw new RangeError("Cidade sem amostra de demonstração")
      const dados: DadosDaCidade =
        localidade.id === fonte.localidade.id
          ? fonte
          : {
              localidade,
              grupos: [],
              publicacoes: [],
              comentarios: [],
              perguntas: [],
              respostas: [],
              anuncios: [],
              eventos: [],
              negocios: [],
              conversas: [],
              mensagens: [],
              avisos: [],
            }
      const copia = structuredClone(dados)
      opcoes.signal?.throwIfAborted()
      return copia
    },
    resumoDaCasca() {
      return {
        cidade: fonte.localidade.city_name,
        cidadeDeCasa: fonte.localidade.city_name,
        avisos: fonte.avisos.filter((aviso) => aviso.read_at === null).length,
        conversas: fonte.conversas.filter(
          ({ apresentacao }) =>
            apresentacao !== null &&
            typeof apresentacao === "object" &&
            !Array.isArray(apresentacao) &&
            apresentacao["unread"] === true,
        ).length,
        nomeDaPessoa: "Rafael Souza",
      }
    },
    imagem(referencia) {
      if (referencia.startsWith("data:image/")) return referencia
      return IMAGENS[referencia] ?? ""
    },
    auxiliares() {
      return structuredClone(auxiliares)
    },
  }
}

export const dadosDoApp = criarDadosDemo()
