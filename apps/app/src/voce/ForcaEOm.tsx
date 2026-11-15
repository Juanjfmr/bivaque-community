"use client"

import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo, Selecao } from "@/components/bivaque/campos"
import { Secao } from "@/components/bivaque/secao"
import { FalhaDaApi } from "@/lib/api/cliente"
import { type AfiliacaoDaPessoa, lerAfilicao, salvarAfilicao } from "@/lib/dados/voce"
import {
  forcaDoValor,
  LIMITE_DA_OM,
  OPCOES_DE_FORCA,
  SEM_FORCA,
  valorDaForca,
} from "@/lib/voce/afiliacao"

const PRIVADO = "Opcional e privado — outras pessoas não veem."

/**
 * Força Armada e OM (F10 / RUN-170, ADR-20261116): autodeclaração opcional.
 *
 * A decisão do lote é que este campo entra PRIVADO por construção: não há
 * toggle "Exibir", a rota grava `is_visible = false` e nenhuma outra pessoa vê
 * o que está aqui. Por isso a frase é a mesma nos dois campos, e nenhuma
 * promessa de visibilidade aparece na tela.
 *
 * Limpar o campo apaga a linha (é o apagar de verdade da D3): escolher "Nenhuma"
 * na Força Armada e deixar a OM em branco é o caminho de remover o que foi
 * declarado. O estado é sempre o que o servidor devolveu — nada de otimismo com
 * dado pessoal.
 */
export function ForcaEOm() {
  const [carregando, setCarregando] = useState(true)
  const [falha, setFalha] = useState(false)
  const [forca, setForca] = useState(SEM_FORCA)
  const [om, setOm] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [rodada, setRodada] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o "Tentar de novo"
  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    setFalha(false)
    lerAfilicao()
      .then((lida: AfiliacaoDaPessoa) => {
        if (cancelado) return
        setForca(forcaDoValor(lida.armedForce))
        setOm(lida.om ?? "")
        setCarregando(false)
      })
      .catch(() => {
        if (cancelado) return
        setFalha(true)
        setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [rodada])

  const gravar = () => {
    if (salvando) return
    setSalvando(true)
    setMensagem(null)
    setSalvo(false)
    void (async () => {
      try {
        const gravada = await salvarAfilicao({
          armedForce: valorDaForca(forca),
          om: om.trim() === "" ? null : om.trim(),
        })
        setForca(forcaDoValor(gravada.armedForce))
        setOm(gravada.om ?? "")
        setSalvo(true)
      } catch (erro: unknown) {
        setMensagem(
          erro instanceof FalhaDaApi && erro.mensagem !== null
            ? erro.mensagem
            : "Não foi possível salvar agora. Tente de novo.",
        )
      } finally {
        setSalvando(false)
      }
    })()
  }

  return (
    <Secao titulo="Força Armada e OM">
      {carregando ? (
        <p className="text-sm text-(--on-surface-variant)">Carregando…</p>
      ) : falha ? (
        <div className="flex items-center justify-between gap-2">
          <p role="alert" className="text-sm text-(--destructive)">
            Não foi possível carregar os seus dados agora.
          </p>
          <Botao tom="texto" type="button" onClick={() => setRodada((n) => n + 1)}>
            Tentar de novo
          </Botao>
        </div>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(evento) => {
            evento.preventDefault()
            gravar()
          }}
        >
          <p className="text-sm text-(--on-surface-variant)">{PRIVADO}.</p>
          <Selecao
            id="afiliacao-forca"
            rotulo="Força Armada"
            valor={forca}
            aoMudar={setForca}
            opcoes={OPCOES_DE_FORCA}
          />
          <Campo
            id="afiliacao-om"
            rotulo="Organização Militar (OM)"
            valor={om}
            aoMudar={setOm}
            maxLength={LIMITE_DA_OM}
            autoComplete="off"
            nota={`${PRIVADO}. Deixar em branco apaga a OM.`}
          />
          {mensagem === null ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {mensagem}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            {salvo ? (
              <p role="status" className="text-sm text-(--on-surface-variant)">
                Salvo.
              </p>
            ) : null}
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Gravando…" : "Gravar Força e OM"}
            </Botao>
          </div>
        </form>
      )}
    </Secao>
  )
}
