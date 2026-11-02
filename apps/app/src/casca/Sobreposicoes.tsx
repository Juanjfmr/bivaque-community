import { ConteudoDoSelo } from "@/components/bivaque/selo-verificado"
import { Sobreposicao } from "@/components/bivaque/sobreposicao"
import { useEntradaDaTela, useNavegacao } from "@/lib/navegacao/react"
import { MenuCriar } from "@/src/casca/MenuCriar"
import { PainelDeCidade } from "@/src/casca/PainelDeCidade"

/**
 * Quem desenha a sobreposição aberta sobre a entrada.
 *
 * Cada id tem **um** dono, e o dono é que o abre pelo mecanismo único da 1b:
 *
 * | id | dono |
 * |---|---|
 * | `dialogo`, `folha` | esta casca, com a `Sobreposicao` do §7 |
 * | `cidade` | esta casca, com o `PainelDeCidade` |
 * | `selo` | esta casca, com a explicação do selo |
 * | `menu-criar` | `MenuCriar`, que traz o próprio diálogo |
 * | `menu-de-linha` | `MenuDaLinha`, na linha que o abriu |
 * | `confirmacao` | `Confirmacao` |
 *
 * Por isso a casca não desenha nada para `menu-criar`, `menu-de-linha` e
 * `confirmacao`: desenhar duas vezes o mesmo id abriria dois overlays para uma
 * entrada só. O conteúdo do diálogo e da folha genéricos ainda é provisório —
 * cada tela das ondas 2 a 8 traz o seu.
 */
export function Sobreposicoes() {
  const entrada = useEntradaDaTela()
  const navegacao = useNavegacao()
  const aberta = entrada.sobreposicao

  if (aberta === null) return null

  const aoFechar = () => navegacao.fecharSobreposicao()

  if (aberta === "menu-criar") return <MenuCriar aoFechar={aoFechar} />
  if (aberta === "menu-de-linha" || aberta === "confirmacao" || aberta === "paleta") return null

  if (aberta === "cidade") {
    return (
      <Sobreposicao
        id="cidade"
        titulo="Trocar de cidade"
        descricao="Mude a cidade que você está vendo. Sua cidade continua a mesma."
        aoFechar={aoFechar}
      >
        <PainelDeCidade aoFechar={aoFechar} />
      </Sobreposicao>
    )
  }

  if (aberta === "selo") {
    return (
      <Sobreposicao
        id="selo"
        titulo="O que o selo “verificado” significa"
        formato="gaveta"
        aoFechar={aoFechar}
      >
        <ConteudoDoSelo aoFechar={aoFechar} />
      </Sobreposicao>
    )
  }

  // Os diálogos de jornada são renderizados pela própria tela.
  if (aberta !== "dialogo" && aberta !== "folha") return null
  const rotulo = aberta === "folha" ? "Folha" : "Diálogo"
  return (
    <Sobreposicao
      id={aberta}
      titulo={rotulo}
      descricao="Área da sobreposição em prova. Cada tela traz o seu conteúdo."
      aoFechar={aoFechar}
    >
      <p className="text-sm text-(--on-surface-variant)">
        Esta caixa é a mesma para o diálogo, a folha e a gaveta do protótipo.
      </p>
    </Sobreposicao>
  )
}
