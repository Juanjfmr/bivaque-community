"use client"

import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  convidarFamiliar,
  type FamiliaDoTitular,
  lerFamilia,
  revogarConvite,
} from "@/lib/dados/voce"

function quando(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/** A frase que o servidor preparou vence a padrão da tela (ADR-20261105 §3.1). */
function frase(falha: unknown, padrao: string): string {
  return falha instanceof FalhaDaApi && falha.mensagem !== null ? falha.mensagem : padrao
}

/**
 * Família na área Você (F10 / RUN-018): convites pendentes do titular, enviar e
 * revogar. Lê e grava por `/api/app/voce/familia`, nunca pela demonstração. O
 * código do convite chega por e-mail — a rota não devolve token nem código, só
 * o rótulo mascarado que fica na lista.
 */
export function Familia() {
  const [familia, setFamilia] = useState<FamiliaDoTitular | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [email, setEmail] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [revogando, setRevogando] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setFamilia(null)
    setErro(false)
    void lerFamilia({ signal: controle.signal })
      .then((lida) => {
        if (!controle.signal.aborted) setFamilia(lida)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [rodada])

  const convidar = () => {
    const alvo = email.trim()
    if (alvo === "" || enviando) return
    setEnviando(true)
    setMensagem(null)
    setAviso(null)
    void convidarFamiliar(alvo)
      .then((convite) => {
        // O resultado é o convite GRAVADO no banco, devolvido pelo servidor.
        setFamilia((atual) =>
          atual === null ? atual : { ...atual, pendentes: [...atual.pendentes, convite] },
        )
        setEmail("")
        setAviso(`Convite enviado para ${convite.emailMascarado ?? "o familiar"}.`)
      })
      .catch((falha: unknown) =>
        setMensagem(frase(falha, "Não foi possível enviar o convite. Tente de novo.")),
      )
      .finally(() => setEnviando(false))
  }

  const revogar = (id: string) => {
    if (revogando !== null) return
    setRevogando(id)
    setMensagem(null)
    setAviso(null)
    void revogarConvite(id)
      .then(() => {
        setFamilia((atual) =>
          atual === null
            ? atual
            : { ...atual, pendentes: atual.pendentes.filter((convite) => convite.id !== id) },
        )
        setAviso("Convite revogado. O código dele não entra mais.")
      })
      .catch((falha: unknown) =>
        setMensagem(frase(falha, "Não foi possível revogar o convite. Tente de novo.")),
      )
      .finally(() => setRevogando(null))
  }

  if (erro) {
    return (
      <EstadoDeErro
        texto="Não foi possível carregar os convites de família."
        aoTentar={() => setRodada((atual) => atual + 1)}
      />
    )
  }

  if (familia === null) return <EsqueletoDeLista linhas={2} />

  return (
    <div className="grid gap-3">
      {mensagem === null ? null : (
        <p role="alert" className="text-sm text-(--destructive)">
          {mensagem}
        </p>
      )}
      {aviso === null ? null : (
        <p role="status" className="text-sm text-(--on-surface-variant)">
          {aviso}
        </p>
      )}

      {familia.podeConvidar ? (
        <form
          className="grid gap-2"
          onSubmit={(evento) => {
            evento.preventDefault()
            convidar()
          }}
        >
          <Campo
            id="familia-email"
            rotulo="E-mail do familiar"
            type="email"
            autoComplete="email"
            valor={email}
            aoMudar={setEmail}
            nota="O familiar recebe o código por e-mail e entra por ele. O convite vale 7 dias e a conta dele fica independente da sua."
          />
          <Botao
            type="submit"
            disabled={enviando || email.trim() === ""}
            className="justify-self-start"
          >
            {enviando ? "Enviando…" : "Enviar convite"}
          </Botao>
        </form>
      ) : (
        <p className="text-sm text-(--on-surface-variant)">
          Só titulares verificados podem convidar a família.
        </p>
      )}

      <div className="grid gap-2">
        <h3 className="text-sm font-medium">
          Convites pendentes ({familia.pendentes.length} de 5)
        </h3>
        {familia.pendentes.length === 0 ? (
          <p className="text-sm text-(--on-surface-variant)">
            Nenhum convite pendente. Quem você convidar aparece aqui até entrar.
          </p>
        ) : (
          <Lista>
            {familia.pendentes.map((convite) => (
              <LinhaDeLista
                key={convite.id}
                icone="family_restroom"
                titulo={convite.emailMascarado ?? "Convite familiar"}
                subtitulo={`Aguardando aceitação · enviado em ${quando(
                  convite.criadoEm,
                )}, expira em ${quando(convite.expiraEm)}`}
                fim={
                  <span className="text-sm font-semibold text-(--primary)">
                    {revogando === convite.id ? "Revogando…" : "Revogar"}
                  </span>
                }
                disabled={revogando !== null}
                onClick={() => revogar(convite.id)}
              />
            ))}
          </Lista>
        )}
      </div>
    </div>
  )
}
