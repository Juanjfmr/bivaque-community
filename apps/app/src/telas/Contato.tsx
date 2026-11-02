"use client"

import { useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Campo } from "@/components/bivaque/campos"
import { Secao } from "@/components/bivaque/secao"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * Fale com a gente (onda 8). O envio real é do backend; aqui o texto fica só
 * nesta sessão e a tela confirma o que aconteceria.
 */
export function Contato() {
  const [assunto, setAssunto] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [enviado, setEnviado] = useState(false)
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="contato" className="grid gap-2">
      <CabecaDePagina
        titulo="Fale com a gente"
        subtitulo="Respondemos por e-mail em até 2 dias úteis."
      />

      <Secao titulo="Sua mensagem">
        <Campo
          id="contato-assunto"
          rotulo="Assunto"
          valor={assunto}
          aoMudar={setAssunto}
          nota="Um resumo curto do que aconteceu."
        />
        <Campo
          id="contato-mensagem"
          rotulo="Mensagem"
          valor={mensagem}
          aoMudar={setMensagem}
          area
          nota="Demonstração: a mensagem não sai deste aparelho."
        />
        <div className="flex items-center justify-end gap-3">
          {enviado ? (
            <p role="status" className="text-sm text-(--primary)">
              Recebemos. Respondemos em até 2 dias úteis.
            </p>
          ) : null}
          <Botao
            icone="send"
            disabled={assunto.trim() === "" || mensagem.trim() === ""}
            onClick={() => setEnviado(true)}
          >
            Enviar
          </Botao>
        </div>
      </Secao>
    </section>
  )
}
