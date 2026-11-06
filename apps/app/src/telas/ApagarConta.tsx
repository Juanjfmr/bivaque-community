"use client"

import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Campo } from "@/components/bivaque/campos"
import { Secao } from "@/components/bivaque/secao"
import { lerPerfil, type PedidoDeExclusao, pedirExclusao } from "@/lib/dados/voce"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * Apagar a conta (onda 8, F10): o que sai, o que fica e a confirmação digitada
 * (APAGAR). O pedido agora é o de verdade — `request_account_deletion()` pela
 * rota do app —, e o prazo que aparece é o que o banco devolveu, nunca um
 * número inventado aqui.
 */

const PALAVRA = "APAGAR"

function dataCurta(iso: string | null): string | null {
  if (iso === null) return null
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function ApagarConta() {
  const [confirmacao, setConfirmacao] = useState("")
  const [pendente, setPendente] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [pedido, setPedido] = useState<PedidoDeExclusao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  useRolagemEFoco(CARGA_CONCLUIDA)

  // O estado do próprio pedido vem da conta: quem já pediu não vê a ação de
  // novo, mesmo que a resposta do pedido tenha se perdido no caminho.
  useEffect(() => {
    const controle = new AbortController()
    void lerPerfil({ signal: controle.signal })
      .then((conta) => {
        if (!controle.signal.aborted) setPendente(conta.conta.exclusaoPendente)
      })
      .catch(() => {
        // Sem a leitura, a tela não afirma nada sobre o estado: a ação de
        // pedir continua disponível e o servidor é quem decide.
      })
    return () => controle.abort()
  }, [])

  const podeEnviar = confirmacao.trim().toUpperCase() === PALAVRA

  const apagar = () => {
    if (!podeEnviar || enviando) return
    setEnviando(true)
    setErro(null)
    void pedirExclusao()
      .then((resultado) => {
        setPedido(resultado)
        setPendente(true)
      })
      .catch(() => {
        setErro("Não foi possível registrar o pedido agora. Tente novamente em instantes.")
      })
      .finally(() => setEnviando(false))
  }

  const prazo = dataCurta(pedido?.pedido.prazoEm ?? null)

  return (
    <section data-tela="apagar-conta" className="grid gap-2">
      <CabecaDePagina
        titulo="Apagar a conta"
        subtitulo="Isto remove seus dados do Bivaque. Não pode ser desfeito."
      />

      <Secao titulo="O que acontece">
        <ul className="grid list-disc gap-1 pl-5 text-sm text-(--on-surface-variant)">
          <li>Seu perfil, anúncios e conversas saem do ar.</li>
          <li>Pedidos abertos são encerrados e propostas são retiradas.</li>
          <li>Denúncias e registros de segurança ficam pelo prazo legal.</li>
        </ul>
      </Secao>

      <Secao titulo="Confirme">
        <Campo
          id="apagar-confirmacao"
          rotulo={`Escreva ${PALAVRA} para confirmar`}
          valor={confirmacao}
          aoMudar={setConfirmacao}
          disabled={pendente || enviando}
        />
        <div className="flex items-center justify-end gap-3">
          {erro === null ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {erro}
            </p>
          )}
          {pendente ? (
            <p role="status" className="text-sm text-(--primary)">
              {prazo === null
                ? "Pedido registrado. Sua conta fica indisponível até a remoção."
                : `Pedido registrado. Sua conta será removida até ${prazo}.`}
            </p>
          ) : null}
          <Botao tom="perigo" icone="delete" disabled={!podeEnviar || enviando} onClick={apagar}>
            {enviando ? "Registrando…" : "Apagar minha conta"}
          </Botao>
        </div>
      </Secao>
    </section>
  )
}
