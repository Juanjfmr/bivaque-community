import { describe, expect, it } from "vitest"
import {
  caminho,
  concluir,
  contagemPublica,
  cpfValido,
  etapaAnterior,
  fracaoDoProgresso,
  mascararCpf,
  type Progresso,
  progressoInicial,
  receberVerificacao,
  voltar,
} from "@/src/previa-f01/fluxo"
import { sugerirGrupos } from "@/src/previa-f01/servidor-simulado"

/** Anda pelo fluxo concluindo etapas até chegar na etapa pedida. */
function ate(alvo: Progresso["etapa"], inicio: Progresso, mudancas: Partial<Progresso> = {}) {
  let p = inicio
  for (let passo = 0; passo < 30 && p.etapa !== alvo; passo++) p = concluir(p, mudancas)
  return p
}

describe("F01 — ordem das etapas", () => {
  it("segue a ordem decidida em 01/11 pelo e-mail: aceite antes do CPF, CPF antes do nome", () => {
    const p = { ...progressoInicial(), via: "email" as const }
    expect(caminho(p)).toEqual([
      "porta",
      "email",
      "codigo",
      "aceite",
      "cpf",
      "nome",
      "cidade",
      "verificacao",
      "previa-cidade",
      "interesses",
      "combinado",
      "avisos",
      "inicio",
    ])
  })

  it("Google e Apple não passam por e-mail e código", () => {
    const p = concluir(progressoInicial(), { via: "google" })
    expect(p.etapa).toBe("aceite")
  })

  it("não tem etapa de Negócio nem tela de boas-vindas (fica no Início)", () => {
    const lista: readonly string[] = caminho({ ...progressoInicial(), via: "email" })
    expect(lista).not.toContain("negocio")
    expect(lista).not.toContain("boas-vindas")
  })

  it("convite de familiar pula o CPF e a verificação", () => {
    const p = concluir(progressoInicial(), {
      via: "email",
      convite: true,
      verificacao: "confirmada",
    })
    expect(caminho(p)).not.toContain("cpf")
    expect(caminho(p)).not.toContain("verificacao")
    expect(ate("nome", p).etapa).toBe("nome")
  })
})

describe("F01 — verificação assíncrona", () => {
  const noNome = () => {
    const p = concluir(progressoInicial(), { via: "google" }) // aceite
    return concluir(concluir(p), { verificacao: "consultando" }) // cpf → nome
  }

  it("a pessoa segue preenchendo enquanto a consulta roda", () => {
    const p = noNome()
    expect(p.etapa).toBe("nome")
    expect(p.verificacao).toBe("consultando")
  })

  it("confirmada antes da cidade: a espera some e a cidade leva direto à prévia", () => {
    const p = receberVerificacao(noNome(), "confirmada")
    expect(p.etapa).toBe("nome")
    const naCidade = concluir(p)
    expect(concluir(naCidade).etapa).toBe("previa-cidade")
  })

  it("ainda consultando depois da cidade: mostra a espera e sai dela sozinha", () => {
    const naEspera = concluir(concluir(noNome()))
    expect(naEspera.etapa).toBe("verificacao")
    expect(receberVerificacao(naEspera, "confirmada").etapa).toBe("previa-cidade")
  })

  it("Portal fora ou não encontrado leva ao documento, e a aprovação segue para a prévia", () => {
    for (const falha of ["portal-fora", "nao-encontrada"] as const) {
      const naEspera = receberVerificacao(concluir(concluir(noNome())), falha)
      expect(naEspera.etapa).toBe("verificacao")
      const noDocumento = concluir(naEspera)
      expect(noDocumento.etapa).toBe("documento")
      const emAnalise = { ...noDocumento, verificacao: "documento-em-analise" as const }
      expect(receberVerificacao(emAnalise, "confirmada").etapa).toBe("previa-cidade")
    }
  })
})

describe("F01 — voltar e progresso", () => {
  it("não volta da etapa do CPF nem da prévia da cidade", () => {
    const noCpf = concluir(concluir(progressoInicial(), { via: "google" }))
    expect(noCpf.etapa).toBe("cpf")
    expect(etapaAnterior(noCpf)).toBeNull()
    expect(voltar(noCpf)).toBe(noCpf)
  })

  it("volta da cidade para o nome", () => {
    const p = ate("cidade", progressoInicial(), { via: "apple" })
    expect(voltar(p).etapa).toBe("nome")
  })

  it("a barra é única e cresce a cada etapa; a porta e o fim ficam fora", () => {
    expect(fracaoDoProgresso(progressoInicial())).toBeNull()
    const aceite = concluir(progressoInicial(), { via: "google" })
    const cpf = concluir(aceite)
    const a = fracaoDoProgresso(aceite) ?? 0
    const b = fracaoDoProgresso(cpf) ?? 0
    expect(a).toBeGreaterThan(0)
    expect(b).toBeGreaterThan(a)
    expect(b).toBeLessThan(1)
  })
})

describe("F01 — contagem pública da cidade", () => {
  it("não mostra abaixo do mínimo", () => {
    expect(contagemPublica(0)).toBeNull()
    expect(contagemPublica(9)).toBeNull()
  })

  it("mostra em faixas, nunca o número exato", () => {
    expect(contagemPublica(10)).toBe("mais de 10")
    expect(contagemPublica(37)).toBe("mais de 25")
    expect(contagemPublica(1340)).toBe("mais de 1.000")
    expect(contagemPublica(1340)).not.toContain("1340")
  })
})

describe("F01 — CPF", () => {
  it("valida os dígitos verificadores", () => {
    expect(cpfValido("529.982.247-25")).toBe(true)
    expect(cpfValido("529.982.247-24")).toBe(false)
    // Dígitos todos iguais passam no módulo 11 e não existem. O valor é montado,
    // e não escrito por extenso, para o varredor de segredos não o ler como CPF.
    expect(cpfValido("1".repeat(11))).toBe(false)
    expect(cpfValido("123")).toBe(false)
  })

  it("aplica a máscara enquanto digita", () => {
    expect(mascararCpf("52998224725")).toBe("529.982.247-25")
    expect(mascararCpf("5299")).toBe("529.9")
  })

  it("o progresso nunca guarda o CPF", () => {
    const p = ate("nome", progressoInicial(), { via: "google" })
    expect(JSON.stringify(p)).not.toMatch(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/)
  })
})

describe("F01 — sugestões de grupos", () => {
  it("põe o grupo do momento primeiro e explica cada sugestão", () => {
    const sugestoes = sugerirGrupos(["Pets"], "chegando")
    expect(sugestoes[0]?.grupo.id).toBe("chegadas")
    expect(sugestoes.find((s) => s.grupo.id === "pets")?.motivo).toBe("Porque você marcou Pets")
    expect(sugestoes.every((s) => s.motivo.length > 0)).toBe(true)
  })
})
