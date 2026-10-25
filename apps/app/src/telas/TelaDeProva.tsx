import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { subAbaDoMercado } from "@/lib/navegacao/abas"
import { descritorDaAcao } from "@/lib/navegacao/entrada"
import { useEntradaDaTela, useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA, criarCargaPendente } from "@/lib/navegacao/restauracao"
import { SUBABAS_DO_MERCADO, validarParametros } from "@/lib/navegacao/rotas"
import { usePortaDeCargas } from "@/src/contexto/cargas"
import { FILTRO_SEGURAR_CARGA, modoDeProvaAtivo } from "@/src/modo-de-prova"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"
import { tituloDaTela } from "@/src/titulos"

const ROTULOS_DAS_SUBABAS: Record<(typeof SUBABAS_DO_MERCADO)[number], string> = {
  desapegos: "Desapegos",
  imoveis: "Imóveis",
  negocios: "Negócios",
}

const ITENS_DE_PROVA = Array.from({ length: 40 }, (_, indice) => `item-${indice + 1}`)

/** Parâmetro com Unicode, espaço e separador: prova que o endereço codifica. */
const PERGUNTA_DIFICIL = "mudança de cidade/2026 ?!"

/**
 * Tela vazia de prova.
 *
 * Onda 1b entrega navegação, não jornada: cada rota desenha o título real e, em
 * modo de prova, os controles que deixam a bateria medir a navegação (filtros,
 * rolagem, foco, sobreposição e carga pendente). Fora do modo de prova, a tela
 * fica vazia — nada de conteúdo fictício no uso normal.
 */
export function TelaDeProva({ nome }: { nome: string }) {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const entrada = useEntradaDaTela()
  const navegacao = useNavegacao()
  const porta = usePortaDeCargas()
  const prova = modoDeProvaAtivo()

  // A decisão de segurar a lista vale para a montagem: marcar o controle não
  // encolhe a tela que já está na frente da pessoa.
  const [segurar] = useState(() => prova && entrada.filtros[FILTRO_SEGURAR_CARGA] === "1")
  const pendente = useMemo(() => (segurar ? criarCargaPendente() : null), [segurar])
  const carga = pendente ?? CARGA_CONCLUIDA
  const [liberacoesNaMontagem] = useState(porta.liberacoes)
  const liberada = !segurar || porta.liberacoes !== liberacoesNaMontagem

  useEffect(() => {
    // A carga desta tela entra depois do commit — não no corpo do render — e
    // sai com ela. `desativar` só limpa a marca se ela ainda for desta carga:
    // a tela que sai não apaga a carga da tela que entrou depois.
    porta.ativar(carga)
    return () => porta.desativar(carga)
  }, [carga, porta])
  useEffect(() => {
    if (pendente) porta.registrar(pendente)
  }, [pendente, porta])
  useEffect(() => {
    // A liberação só segue depois de os elementos estarem montados — é por isso
    // que a confirmação vive num efeito, e não no corpo do componente.
    if (pendente && liberada) pendente.confirmar()
  }, [pendente, liberada])

  useRolagemEFoco(carga)

  const validacao = validarParametros(nome, parametros)
  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  const subAba = subAbaDoMercado(nome)

  return (
    <section data-tela={nome}>
      <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1}>
        {tituloDaTela(nome)}
      </h1>

      {subAba === null ? null : (
        <nav data-subabas="mercado" aria-label="Seções do Mercado">
          {SUBABAS_DO_MERCADO.map((aba) => (
            <button
              key={aba}
              type="button"
              data-subaba={aba}
              aria-current={subAba === aba ? "page" : false}
              onClick={() => void navegacao.irPara(aba)}
            >
              {ROTULOS_DAS_SUBABAS[aba]}
            </button>
          ))}
        </nav>
      )}

      {prova ? (
        <div data-prova="controles-da-tela">
          <button
            type="button"
            data-acao="segurar-proxima-carga"
            data-valor="prova"
            aria-pressed={entrada.filtros[FILTRO_SEGURAR_CARGA] === "1"}
            onClick={() => void navegacao.atualizar({ filtros: { [FILTRO_SEGURAR_CARGA]: "1" } })}
          >
            Carregar a lista só na próxima abertura
          </button>
          <button
            type="button"
            data-acao="abrir-dialogo"
            data-valor="prova"
            onClick={() => void navegacao.abrir("dialogo")}
          >
            Abrir diálogo
          </button>
          <button
            type="button"
            data-acao="abrir-folha"
            data-valor="prova"
            onClick={() => void navegacao.abrir("folha")}
          >
            Abrir folha
          </button>
          <button
            type="button"
            data-acao="abrir-pergunta"
            data-valor="pergunta-dificil"
            onClick={() =>
              void navegacao.irPara("pergunta", { parametros: { id: PERGUNTA_DIFICIL } })
            }
          >
            Abrir indicação
          </button>
          <button
            type="button"
            data-acao="abrir-sem-alvo"
            data-valor="prova"
            onClick={() =>
              void navegacao.irPara("pergunta", {
                parametros: { id: "q-sem-alvo" },
                foco: descritorDaAcao("abrir-item", "nao-existe"),
              })
            }
          >
            Abrir indicação perdendo o alvo
          </button>
          <button
            type="button"
            data-acao="abrir-salvos"
            data-valor="prova"
            onClick={() => void navegacao.irPara("salvos")}
          >
            Salvos
          </button>
          <button
            type="button"
            data-acao="abrir-meus-anuncios"
            data-valor="prova"
            onClick={() => void navegacao.irPara("meus-anuncios")}
          >
            Meus anúncios
          </button>
          <button
            type="button"
            data-acao="abrir-busca"
            data-valor="prova"
            onClick={() => void navegacao.irPara("busca")}
          >
            Buscar
          </button>
          <button
            type="button"
            data-acao="abrir-aviso"
            data-valor="prova"
            onClick={() => void navegacao.irPara("evento", { parametros: { id: "e-aviso" } })}
          >
            Aviso de encontro
          </button>
          <button
            type="button"
            data-acao="abrir-anuncio"
            data-valor="prova"
            onClick={() => void navegacao.irPara("anuncio", { parametros: { id: "a-de-prova" } })}
          >
            Abrir anúncio
          </button>
          <button
            type="button"
            data-acao="abrir-negocio"
            data-valor="prova"
            onClick={() => void navegacao.irPara("negocio", { parametros: { id: "n-de-prova" } })}
          >
            Abrir negócio
          </button>
          <label>
            Ordenação
            <select
              data-filtro="ordenacao"
              value={entrada.filtros["ordenacao"] ?? "recente"}
              onChange={(evento) =>
                void navegacao.atualizar({ filtros: { ordenacao: evento.target.value } })
              }
            >
              <option value="recente">Mais recentes</option>
              <option value="preco-baixo">Menor preço</option>
              <option value="preco-alto">Maior preço</option>
            </select>
          </label>
        </div>
      ) : null}

      {prova && liberada ? (
        <ul data-lista="prova">
          {ITENS_DE_PROVA.map((item) => (
            <li key={item}>
              <button
                type="button"
                data-acao="abrir-item"
                data-valor={item}
                onClick={() => void navegacao.irPara("pergunta", { parametros: { id: item } })}
              >
                {`Abrir ${item}`}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
