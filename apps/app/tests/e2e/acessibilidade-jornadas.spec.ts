import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { simularProgresso } from "./apoio"
import { simularGrupos } from "./grupos-ajuda"
import { ID_PERGUNTA, simularPerguntas } from "./perguntas-ajuda"
import { simularVoce } from "./voce-ajuda"

const telas = [
  {
    nome: "Comunidade",
    caminho: "/app/comunidade",
    conteudo: "pediatra",
    preparar: simularPerguntas,
  },
  {
    nome: "Pergunta",
    caminho: `/app/pergunta/${ID_PERGUNTA}`,
    conteudo: "pediatra",
    preparar: simularPerguntas,
  },
  {
    nome: "Grupo",
    caminho: "/app/grupo/g-pets",
    conteudo: "Pets de Manaus",
    preparar: simularGrupos,
  },
  {
    nome: "Publicação",
    caminho: "/app/publicacao/p-pets",
    conteudo: "Pets",
    preparar: simularGrupos,
  },
  { nome: "Você", caminho: "/app/voce", conteudo: "Ana Verificada", preparar: simularVoce },
  {
    nome: "Bloqueados",
    caminho: "/app/bloqueados",
    conteudo: "Desbloquear",
    preparar: simularVoce,
  },
  {
    nome: "Ocultados",
    caminho: "/app/ocultados",
    conteudo: "Mostrar de novo",
    preparar: simularVoce,
  },
  { nome: "Perfil", caminho: "/app/perfil/u-paulo", conteudo: "Paulo", preparar: simularVoce },
  {
    nome: "Apagar conta",
    caminho: "/app/apagar-conta",
    conteudo: "permanente e não pode ser desfeita",
    preparar: simularVoce,
  },
] as const

for (const tela of telas) {
  test(`axe: ${tela.nome}`, async ({ page }) => {
    await simularProgresso(page)
    await tela.preparar(page)
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto(tela.caminho)
    await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
    await expect(page.getByText(tela.conteudo, { exact: false }).first()).toBeVisible()
    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    expect(
      resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([])
  })
}
