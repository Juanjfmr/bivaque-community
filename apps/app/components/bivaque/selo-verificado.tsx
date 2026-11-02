import type { NomeDeIcone } from "@/lib/icones"
import { Botao } from "./botao"
import { Icone } from "./icone"

/**
 * O selo verificado e a sua explicação (inventário §7, `shell/verified-info.js`:
 * `verifiedBadgeHtml` e `openVerifiedInfo`).
 *
 * O conteúdo é estável e tem valor de produto: o que o selo significa, linha a
 * linha. No protótipo ele era uma string no handler; aqui é componente.
 */

export function SeloVerificado({
  rotulo = "Perfil verificado",
  aoAbrir,
}: {
  rotulo?: string
  aoAbrir?: () => void
}) {
  return (
    <button
      type="button"
      data-acao="verificado-info"
      aria-haspopup="dialog"
      onClick={aoAbrir}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-(--surface-high) px-3 text-[13px] font-medium text-(--on-surface-variant)"
    >
      <Icone nome="verified_user" className="size-4 text-(--primary)" />
      {rotulo}
      <Icone nome="info" className="size-4" />
    </button>
  )
}

const LINHAS: ReadonlyArray<{
  readonly icone: NomeDeIcone
  readonly titulo: string
  readonly texto: string
}> = [
  {
    icone: "verified_user",
    titulo: "Vínculo com as Forças conferido",
    texto: "A conferência é feita no Portal da Transparência, com o seu consentimento.",
  },
  {
    icone: "person",
    titulo: "O resto é declarado pela pessoa",
    texto: "Cidade, interesses e preferências são o que a própria pessoa contou.",
  },
  {
    icone: "sell",
    titulo: "O anúncio é de quem anuncia",
    texto: "Quem publica responde pelo que publica.",
  },
  {
    icone: "shield_person",
    titulo: "Combine com cuidado",
    texto: "Encontros e pagamentos acontecem fora do Bivaque, por sua conta.",
  },
]

export function ExplicacaoDoSelo() {
  return (
    <div className="grid gap-3">
      {LINHAS.map((linha) => (
        <p key={linha.titulo} data-linha-do-selo="sim" className="flex items-start gap-3">
          <Icone nome={linha.icone} className="mt-0.5 size-5 shrink-0 text-(--primary)" />
          <span>
            <b className="block text-[15px]">{linha.titulo}</b>
            <span className="text-[13px] text-(--on-surface-variant)">{linha.texto}</span>
          </span>
        </p>
      ))}
      <p data-linha-do-selo="rodape" className="text-[13px] text-(--on-surface-variant)">
        Neste protótipo, a verificação é simulada.
      </p>
    </div>
  )
}

/** O conteúdo pronto para uma sobreposição, com o "Entendi" do protótipo. */
export function ConteudoDoSelo({ aoFechar }: { aoFechar: () => void }) {
  return (
    <div className="grid gap-4">
      <ExplicacaoDoSelo />
      <div className="flex justify-end">
        <Botao onClick={aoFechar}>Entendi</Botao>
      </div>
    </div>
  )
}
