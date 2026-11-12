import { describe, expect, it } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  NAO_FOI_POSSIVEL,
  NAO_PERMITE_PUBLICAR,
  recusaAoPublicar,
  SESSAO_VENCIDA,
  semConfirmacao,
} from "@/src/grupos/publicacao"

// DS-021 (F03, critério 1): cada recusa de publicação tem a sua frase em
// português, com próximo passo, e nenhuma delas é o corpo do erro. O status e
// o código vêm do cliente único; o texto cru do banco nunca chega aqui.

const pelaRota = (status: number, erro?: string, mensagem?: string) =>
  new FalhaDaApi("recusado", status, erro, mensagem)

describe("recusa da publicação em frase", () => {
  it.each([
    ["sem participação aprovada", pelaRota(403, "nao-membro"), NAO_PERMITE_PUBLICAR],
    ["policy do banco (42501/P0001)", pelaRota(403, "recusado", "42501"), NAO_PERMITE_PUBLICAR],
    ["sessão vencida", pelaRota(401), SESSAO_VENCIDA],
    ["credencial ausente", new FalhaDaApi("sem-sessao", 401, "sem-credencial"), SESSAO_VENCIDA],
    [
      "cabeçalho de escrita ausente",
      pelaRota(403, "cabecalho-ausente"),
      "A publicação não saiu por uma conferência de segurança do app. Recarregue a página, entre de novo e envie outra vez.",
    ],
    [
      "gravação recusada por já existir",
      pelaRota(409, "ja-publicado"),
      "Esta publicação já foi enviada. Confira a lista do grupo antes de publicar o mesmo texto de novo.",
    ],
    [
      "gravação indisponível fica recuperável",
      pelaRota(503, "escrita-indisponivel"),
      NAO_FOI_POSSIVEL,
    ],
    [
      "origem recusada na escrita",
      pelaRota(403, "origem-recusada"),
      "A publicação não saiu por uma conferência de segurança do app. Recarregue a página, entre de novo e envie outra vez.",
    ],
    [
      "texto ou foto fora do contrato",
      pelaRota(400, "dados-invalidos"),
      "A publicação não foi aceita: confira o texto e as fotos e tente enviar de novo.",
    ],
    [
      "corpo sem JSON",
      pelaRota(400, "corpo-invalido"),
      "A publicação não foi aceita: confira o texto e as fotos e tente enviar de novo.",
    ],
    [
      "400 sem código",
      pelaRota(400),
      "A publicação não foi aceita: confira o texto e as fotos e tente enviar de novo.",
    ],
    [
      "grupo sumiu",
      pelaRota(404, "grupo-nao-encontrado"),
      "Este grupo não está mais disponível para publicar. Volte à lista de grupos e escolha outro.",
    ],
    [
      "duplicada",
      pelaRota(409),
      "Esta publicação já foi enviada. Confira a lista do grupo antes de publicar o mesmo texto de novo.",
    ],
    [
      "muitas seguidas",
      pelaRota(429),
      "Muitas publicações seguidas. Espere um pouco e envie de novo.",
    ],
  ] as const)("%s tem frase própria", (_caso, falha, frase) => {
    expect(recusaAoPublicar(falha).frase).toBe(frase)
  })

  it("o corpo do erro nunca aparece na frase", () => {
    const cru = 'insert or update on table "posts" violates check constraint "posts_content_check"'
    const dono = 'new row violates row-level security policy for table "posts"'
    for (const falha of [
      pelaRota(400, "dados-invalidos", cru),
      pelaRota(403, "recusado", dono),
      pelaRota(503, undefined, cru),
      new FalhaDaApi("rede", 0),
    ]) {
      const { frase } = recusaAoPublicar(falha)
      expect(frase).not.toContain(cru)
      expect(frase).not.toContain(dono)
      expect(frase).not.toMatch(/posts|policy|42501|P0001|https?:/)
    }
  })

  it("rede, 503 e status desconhecido são recuperáveis: a pessoa tenta de novo", () => {
    expect(recusaAoPublicar(new FalhaDaApi("rede", 0)).tipo).toBe("recuperavel")
    expect(recusaAoPublicar(pelaRota(503, "escrita-indisponivel")).tipo).toBe("recuperavel")
    expect(recusaAoPublicar(pelaRota(500)).tipo).toBe("recuperavel")
    expect(recusaAoPublicar(new Error("boom")).tipo).toBe("recuperavel")
  })

  it("recusas que não adiantam repetir mandam outra ação primeiro", () => {
    expect(recusaAoPublicar(pelaRota(403, "nao-membro"))).toMatchObject({ tentavel: false })
    expect(recusaAoPublicar(pelaRota(401))).toMatchObject({ tentavel: false })
    expect(recusaAoPublicar(pelaRota(409))).toMatchObject({ tentavel: false })
  })

  it("recusas que a pessoa corrige no compositor continuam tentáveis", () => {
    expect(recusaAoPublicar(pelaRota(400, "dados-invalidos"))).toMatchObject({
      tipo: "recusa",
      tentavel: true,
    })
  })
})

describe("publicação enviada e não confirmada na lista", () => {
  it("na ordenação por recentes aponta a página seguinte antes de publicar de novo", () => {
    const { tipo, frase } = semConfirmacao({ primeiros: true })
    expect(tipo).toBe("sem-confirmacao")
    expect(frase).toContain("página seguinte")
  })

  it("em outra ordenação diz para voltar a Recentes", () => {
    const { frase } = semConfirmacao({ primeiros: false })
    expect(frase).toContain("Recentes")
  })
})
