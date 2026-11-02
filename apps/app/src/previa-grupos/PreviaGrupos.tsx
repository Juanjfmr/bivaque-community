import { useCallback, useEffect, useReducer, useState } from "react"
import { Aviso, useAviso } from "@/src/pecas/pecas"
import { ESTADO_INICIAL, reduzir } from "./estado"
import { Escrever, PublicacaoTela } from "./tela-publicacao"
import { GrupoTela, Lista, type Navegar } from "./telas-grupos"
import "./previa-grupos.css"

type Tela = Parameters<Navegar>[0]

/**
 * Prévia clicável de Grupos (régua Nextdoor, 01/11/2026), com dados simulados.
 * Só existe no servidor de desenvolvimento (`main.tsx`); nada aqui fala com o
 * banco. A navegação usa o histórico do navegador, para o voltar do celular
 * funcionar como no app. O aviso fica fora das telas: ele sobrevive à troca de
 * tela (publicar e voltar ao grupo).
 */
export function PreviaGrupos() {
  const [estado, despachar] = useReducer(reduzir, ESTADO_INICIAL)
  const { aviso, mostrar, limpar } = useAviso()
  const [tela, setTela] = useState<Tela>(() => {
    const salva = window.history.state as { tela?: Tela } | null
    return salva?.tela ?? { nome: "lista" }
  })

  // Só na montagem: o estado inicial do histórico é a tela de entrada.
  // biome-ignore lint/correctness/useExhaustiveDependencies: registro único.
  useEffect(() => {
    window.history.replaceState({ tela }, "")
    const aoVoltar = (evento: PopStateEvent) => {
      const anterior = (evento.state as { tela?: Tela } | null)?.tela
      setTela(anterior ?? { nome: "lista" })
    }
    window.addEventListener("popstate", aoVoltar)
    return () => window.removeEventListener("popstate", aoVoltar)
  }, [])

  const navegar = useCallback<Navegar>((destino) => {
    window.history.pushState({ tela: destino }, "")
    setTela(destino)
  }, [])

  const voltar = useCallback(() => window.history.back(), [])
  const props = { estado, despachar, navegar, voltar, avisar: mostrar }

  const chave = JSON.stringify(tela)
  return (
    <div className="pc pg">
      <div key={chave} className="pc-entra">
        {tela.nome === "lista" ? <Lista {...props} /> : null}
        {tela.nome === "grupo" ? <GrupoTela {...props} id={tela.id} /> : null}
        {tela.nome === "publicacao" ? <PublicacaoTela {...props} id={tela.id} /> : null}
        {tela.nome === "escrever" ? (
          <Escrever {...props} grupo={tela.grupo} textoInicial={tela.texto ?? ""} />
        ) : null}
      </div>
      <Aviso aviso={aviso} aoSumir={limpar} />
    </div>
  )
}
