"use client"

import { useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Campo } from "@/components/bivaque/campos"
import { Secao } from "@/components/bivaque/secao"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * Apagar a conta (onda 8): o que sai, o que fica e a confirmação digitada
 * (APAGAR, como no protótipo). A exclusão de verdade é feita com o backend e
 * exige confirmação do dono; aqui a tela só registra o pedido na sessão.
 */

const PALAVRA = "APAGAR"

export function ApagarConta() {
  const [confirmacao, setConfirmacao] = useState("")
  const [pedido, setPedido] = useState(false)
  useRolagemEFoco(CARGA_CONCLUIDA)

  const podeEnviar = confirmacao.trim().toUpperCase() === PALAVRA

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
        />
        <div className="flex items-center justify-end gap-3">
          {pedido ? (
            <p role="status" className="text-sm text-(--primary)">
              Pedido registrado nesta sessão. Na demonstração nada é apagado.
            </p>
          ) : null}
          <Botao tom="perigo" icone="delete" disabled={!podeEnviar} onClick={() => setPedido(true)}>
            Apagar minha conta
          </Botao>
        </div>
      </Secao>
    </section>
  )
}
