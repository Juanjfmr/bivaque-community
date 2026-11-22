import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import {
  aceitarConviteDePrestador,
  type ConviteDePrestador,
  lerConviteDePrestador,
} from "@/lib/dados/prestador-convite"
import { useNavegacao } from "@/lib/navegacao/react"
import { FalhaDaLeitura } from "@/src/negocios/FalhaDaLeitura"
import { Nota } from "@/src/pecas/pecas"

/**
 * O convite de prestador como estado da ENTRADA (TROCA-005): o link chega em
 * `/app/entrar?prestador=<token>` e não existe tela nova. O token não é
 * adivinhado nem o convite enumerado: token inválido e desconhecido caem na
 * mesma frase. Aceitar usa a sessão; sem sessão, "Entrar com e-mail" leva à
 * entrada com o aceite como retorno (`?redirect=`), e o código por e-mail
 * devolve a pessoa a este estado — sem passar pelo funil de membro.
 */

const TEXTO_DO_ESTADO: Readonly<Record<Exclude<ConviteDePrestador["estado"], "pendente">, string>> =
  {
    aceito: "Este convite já foi aceito. Entre com a conta de prestador para continuar.",
    revogado: "Este convite foi revogado pela comunidade que indicou você.",
    expirado: "Este convite expirou. Peça um novo à comunidade que indicou você.",
  }

export function AceiteDeConviteDePrestador({
  token,
  aoEntrar,
}: {
  readonly token: string
  readonly aoEntrar: () => void
}) {
  const navegacao = useNavegacao()
  const [convite, setConvite] = useState<ConviteDePrestador | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [aceitando, setAceitando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [aceito, setAceito] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de tentar de novo
  useEffect(() => {
    const controle = new AbortController()
    setErro(null)
    void lerConviteDePrestador(token, { signal: controle.signal })
      .then((lido) => {
        if (!controle.signal.aborted) setConvite(lido)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErro(falha)
      })
    return () => controle.abort()
  }, [token, rodada])

  async function aceitar() {
    if (aceitando) return
    setAceitando(true)
    setMensagem(null)
    try {
      await aceitarConviteDePrestador(token)
      setAceito(true)
    } catch (falha: unknown) {
      const motivo =
        falha !== null && typeof falha === "object" && "motivoDoServidor" in falha
          ? (falha as { motivoDoServidor: unknown }).motivoDoServidor
          : null
      const doServidor =
        falha !== null && typeof falha === "object" && "mensagem" in falha
          ? (falha as { mensagem: unknown }).mensagem
          : null
      const mensagemDoServidor = typeof doServidor === "string" ? doServidor : null
      setMensagem(
        motivo === "convite-usado"
          ? "Este convite já foi usado. Entre na conta de prestador para continuar."
          : motivo === "convite-expirado"
            ? "Este convite expirou. Peça um novo à comunidade que indicou você."
            : motivo === "outro-email"
              ? "O convite não corresponde ao e-mail da sua conta."
              : motivo === "conta-recusada"
                ? (mensagemDoServidor ??
                  "Esta conta é de membro e não pode aceitar convite de prestador.")
                : "Não foi possível aceitar o convite agora. Tente novamente.",
      )
    } finally {
      setAceitando(false)
    }
  }

  return (
    <main className="pc f01 mx-auto grid min-h-dvh w-full max-w-xl content-center gap-4 px-4 py-10">
      <section data-tela="convite-de-prestador" className="grid gap-3">
        <header className="grid gap-1">
          <p className="text-[13px] font-medium text-(--primary)">Convite de prestador</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ofereça seus serviços no Bivaque
          </h1>
        </header>

        {erro !== null ? (
          <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
        ) : convite === null ? (
          <EsqueletoDeLista linhas={2} />
        ) : aceito ? (
          <div className="grid gap-3">
            <p role="status" className="text-sm">
              Convite aceito. Sua conta de prestador está pronta.
            </p>
            <Botao onClick={() => void navegacao.irPara("meu-negocio")}>Abrir Meu negócio</Botao>
          </div>
        ) : convite.estado !== "pendente" ? (
          <div className="grid gap-3">
            <p className="text-sm">{TEXTO_DO_ESTADO[convite.estado]}</p>
            <Botao tom="contornado" onClick={() => void navegacao.irPara("inicio")}>
              Ir para o Bivaque
            </Botao>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm">
              {convite.comunidade} indicou você para atender a comunidade. Sua conta será civil e
              separada dos membros: ela não dá acesso a feed, perfis, grupos, eventos ou listas.
            </p>
            {convite.emailDaSessao === null ? (
              <Nota>
                Entre com o e-mail que recebeu o convite e abra este link de novo para aceitar.
              </Nota>
            ) : (
              <p className="text-[13px] text-(--on-surface-variant)">
                Você está com a conta {convite.emailDaSessao}.
              </p>
            )}
            {mensagem === null ? null : (
              <p role="alert" className="text-sm text-(--destructive)">
                {mensagem}
              </p>
            )}
            {convite.emailDaSessao === null ? (
              <Botao onClick={aoEntrar}>Entrar com e-mail</Botao>
            ) : (
              <Botao disabled={aceitando} onClick={() => void aceitar()}>
                {aceitando ? "Aceitando…" : "Aceitar convite"}
              </Botao>
            )}
          </div>
        )}

        <div className="flex justify-start">
          <Botao tom="texto" onClick={() => void navegacao.irPara("inicio")}>
            Voltar ao Bivaque
          </Botao>
        </div>
      </section>
    </main>
  )
}
