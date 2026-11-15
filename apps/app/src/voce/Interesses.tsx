"use client"

import { useEffect, useState } from "react"

import { useAvisos } from "@/components/bivaque/avisos"
import { Botao } from "@/components/bivaque/botao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { Sobreposicao } from "@/components/bivaque/sobreposicao"
import { Checkbox } from "@/components/ui/checkbox"
import { FalhaDaApi } from "@/lib/api/cliente"
import { type InteressesDaPessoa, lerInteresses, salvarInteresses } from "@/lib/dados/voce"

function mensagem(falha: unknown): string {
  if (falha instanceof FalhaDaApi) {
    if (falha.motivoDoServidor === "grupo-de-outra-cidade")
      return "Um dos grupos não é da sua cidade. Feche e abra de novo para ver a lista atual."
    if (falha.mensagem !== null) return falha.mensagem
  }
  return "Não foi possível salvar seus interesses. Tente de novo."
}

/**
 * A folha de interesses da área Você (F10 / RUN-160).
 *
 * Interesse é par usuário↔grupo: a lista são os grupos da cidade da sessão, e o
 * Salvar grava o conjunto inteiro pelo RPC canônico. Quem já participa do grupo
 * aparece desabilitado — o interesse é para descobrir grupo, não para repetir o
 * que já é da pessoa. Sem "Sugeridos": isso está deferido pelo ADR-20261023.
 */
export function Interesses({ aoFechar }: { readonly aoFechar: () => void }) {
  const { avisar } = useAvisos()
  const [dados, setDados] = useState<InteressesDaPessoa | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [marcados, setMarcados] = useState<ReadonlySet<string>>(new Set())
  const [salvando, setSalvando] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(false)
    void lerInteresses({ signal: controle.signal }).then(
      (lidos) => {
        if (controle.signal.aborted) return
        setDados(lidos)
        setMarcados(new Set(lidos.interesses))
      },
      () => {
        if (!controle.signal.aborted) setErro(true)
      },
    )
    return () => controle.abort()
  }, [rodada])

  function alternar(id: string, marcado: boolean): void {
    setMarcados((atual) => {
      const proximo = new Set(atual)
      if (marcado) proximo.add(id)
      else proximo.delete(id)
      return proximo
    })
  }

  function gravar(grupos: readonly string[], aviso: string): void {
    if (salvando) return
    setSalvando(true)
    void salvarInteresses(grupos)
      .then((gravados) => {
        // O que fica na tela é o que o servidor gravou, não o rascunho local.
        setMarcados(new Set(gravados))
        setDados((atual) => (atual === null ? atual : { ...atual, interesses: gravados }))
        avisar({ texto: aviso, tipo: "sucesso" })
      })
      .catch((falha: unknown) => avisar({ texto: mensagem(falha), tipo: "erro" }))
      .finally(() => setSalvando(false))
  }

  return (
    <Sobreposicao
      id="interesses"
      titulo="Interesses"
      descricao="Usamos seus interesses só para sugerir grupos da sua cidade."
      aoFechar={aoFechar}
    >
      {erro ? (
        <EstadoDeErro
          texto="Não foi possível carregar seus interesses."
          aoTentar={() => setRodada((atual) => atual + 1)}
        />
      ) : dados === null ? (
        <EsqueletoDeLista linhas={3} />
      ) : dados.grupos.length === 0 ? (
        <p className="text-sm text-(--on-surface-variant)">
          Ainda não há grupos na sua cidade para marcar. Quando houver, eles aparecem aqui.
        </p>
      ) : (
        <div data-interesses="sim" aria-busy={salvando} className="grid gap-3">
          <ul className="grid gap-2">
            {dados.grupos.map((grupo) => (
              <li
                key={grupo.id}
                data-interesse={grupo.id}
                className="flex min-h-11 items-start gap-3 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
              >
                <Checkbox
                  checked={marcados.has(grupo.id)}
                  disabled={grupo.jaMembro || salvando}
                  onCheckedChange={(valor) => alternar(grupo.id, valor === true)}
                  aria-label={`Marcar ${grupo.nome} como interesse`}
                  className="mt-1"
                />
                <span className="grid min-w-0 gap-0.5">
                  <b className="text-[15px] font-semibold">{grupo.nome}</b>
                  {grupo.jaMembro ? (
                    <small className="text-[13px] text-(--on-surface-variant)">
                      Você já participa deste grupo.
                    </small>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex justify-end gap-2">
            {marcados.size === 0 ? null : (
              <Botao
                tom="texto"
                disabled={salvando}
                onClick={() => gravar([], "Interesses removidos.")}
              >
                Limpar
              </Botao>
            )}
            <Botao
              disabled={salvando}
              onClick={() => gravar([...marcados], "Interesses atualizados.")}
            >
              {salvando ? "Salvando…" : "Salvar"}
            </Botao>
          </div>
        </div>
      )}
    </Sobreposicao>
  )
}
