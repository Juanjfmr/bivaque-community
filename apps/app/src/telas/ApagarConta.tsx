"use client"

import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Campo } from "@/components/bivaque/campos"
import { Secao } from "@/components/bivaque/secao"
import { lerPerfil, type PedidoDeExclusao, pedirExclusao } from "@/lib/dados/voce"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * Apagar a conta (onda 8, F10): o que sai, o que fica e a confirmação digitada
 * (APAGAR). O pedido agora é o de verdade — `request_account_deletion()` pela
 * rota do app —, e o prazo que aparece é o que o banco devolveu, nunca um
 * número inventado aqui.
 *
 * RUN-184: o aviso é o mesmo da tela antiga da web (`(shell)/configuracoes/
 * conta`), que saiu com a troca: o que sai agora, o que sai no prazo, o que
 * permanece e por quê (a tabela jurídica aprovada) e por onde pedir ajuda. Os
 * "15 dias" da janela são o texto aprovado, e não um cálculo da tela; a data
 * concreta continua vindo do banco, depois do pedido.
 */

const PALAVRA = "APAGAR"

function dataPorExtenso(iso: string | null): string | null {
  if (iso === null) return null
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function ApagarConta() {
  const navegacao = useNavegacao()
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

  const prazo = dataPorExtenso(pedido?.pedido.prazoEm ?? null)

  return (
    <section data-tela="apagar-conta" className="grid gap-2">
      <CabecaDePagina
        titulo="Apagar a conta"
        subtitulo="A exclusão é permanente e não pode ser desfeita."
      />

      <Secao titulo="O que acontece">
        <p className="text-sm font-medium">Ao confirmar, agora:</p>
        <ul className="grid list-disc gap-1 pl-5 text-sm text-(--on-surface-variant)">
          <li>sua sessão é encerrada e você não consegue mais entrar nesta conta;</li>
          <li>seu perfil deixa de aparecer para outras pessoas;</li>
          <li>o que você publicou continua visível, atribuído ao seu nome de exibição.</li>
        </ul>

        <p className="mt-3 text-sm font-medium">
          {prazo === null
            ? "Em até 15 dias, contados do pedido:"
            : `Até ${prazo}, contados do pedido:`}
        </p>
        <ul className="grid list-disc gap-1 pl-5 text-sm text-(--on-surface-variant)">
          <li>apagamos a conta, as credenciais, o perfil e suas fotos de perfil;</li>
          <li>apagamos suas preferências e seus vínculos de participação;</li>
          <li>os convites familiares pendentes são encerrados; a outra conta fica intacta.</li>
        </ul>
      </Secao>

      <Secao titulo="O que permanece, e por quê">
        <ul className="grid list-disc gap-1 pl-5 text-sm text-(--on-surface-variant)">
          <li>
            registros de moderação (denúncias e decisões), com seus dados anonimizados — sustentam a
            segurança de outras pessoas;
          </li>
          <li>logs de acesso, guardados por 6 meses por obrigação legal (MCI, art. 15).</li>
        </ul>
      </Secao>

      <Secao titulo="Como pedir ajuda">
        <p className="text-sm text-(--on-surface-variant)">
          Para exercer seus direitos depois disso, fale com a gente pela Ajuda. A resposta sai em
          até 15 dias.
        </p>
        <Botao tom="texto" icone="support" onClick={() => void navegacao.irPara("ajuda")}>
          Abrir a Ajuda
        </Botao>
      </Secao>

      <Secao titulo="Confirme">
        <Campo
          id="apagar-confirmacao"
          rotulo={`Escreva ${PALAVRA} para confirmar`}
          valor={confirmacao}
          aoMudar={setConfirmacao}
          disabled={pendente || enviando}
        />
        <div className="flex flex-wrap items-center justify-end gap-3">
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
          <Botao
            tom="perigo"
            icone="delete"
            disabled={!podeEnviar || enviando || pendente}
            onClick={apagar}
          >
            {enviando ? "Registrando…" : "Apagar minha conta"}
          </Botao>
        </div>
      </Secao>
    </section>
  )
}
