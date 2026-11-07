type Registro = Record<string, unknown>
function registro(valor: unknown): Registro {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor))
    throw new Error("invalid city digest")
  return valor as Registro
}
function texto(valor: unknown): string {
  if (typeof valor !== "string" || valor.length === 0) throw new Error("invalid city digest")
  return valor.replace(/[\r\n]/g, " ")
}
function textoDeMembro(valor: unknown): string {
  return texto(valor).replaceAll("://", "[:]//").replace(/www\./gi, "www[.]").replaceAll("@", "[@]")
}
function itens(valor: unknown): Registro[] {
  if (!Array.isArray(valor)) throw new Error("invalid city digest")
  return valor.map(registro)
}
function link(origem: string, rota: string, id: unknown): string {
  const valor = texto(id)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor))
    throw new Error("invalid city digest id")
  return `${origem}/app/${rota}/${valor}`
}
export function montarEmailDoResumo(payload: Registro, origem: string) {
  const content = registro(payload["content"])
  const token = payload["unsubscribe_token"]
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token))
    throw new Error("invalid city digest token")
  const perguntas = itens(content["questions"])
  const encontros = itens(content["events"])
  const respostas = itens(content["replies"])
  const cidade = texto(content["city"])
  if (perguntas.length + encontros.length + respostas.length === 0)
    throw new Error("empty city digest")
  return {
    subject: `Resumo de ${cidade} no Bivaque`,
    text: [
      `Novidades de ${cidade}:`,
      ...(perguntas.length
        ? [
            "",
            "Perguntas novas",
            ...perguntas.map(
              (p) => `• ${textoDeMembro(p["title"])} — ${link(origem, "pergunta", p["id"])}`,
            ),
          ]
        : []),
      ...(encontros.length
        ? [
            "",
            "Encontros dos próximos sete dias",
            ...encontros.map((e) => {
              const data = new Date(texto(e["starts_at"]))
              if (!Number.isFinite(data.getTime())) throw new Error("invalid city digest date")
              return (
                "• " +
                textoDeMembro(e["title"]) +
                " (" +
                data.toLocaleDateString("pt-BR", { timeZone: "UTC" }) +
                " UTC) — " +
                link(origem, "evento", e["id"])
              )
            }),
          ]
        : []),
      ...(respostas.length
        ? [
            "",
            "Respostas às suas perguntas",
            ...respostas.map(
              (r) =>
                "• " +
                textoDeMembro(r["author"]) +
                " respondeu: " +
                textoDeMembro(r["title"]) +
                " — " +
                link(origem, "pergunta", r["id"]),
            ),
          ]
        : []),
      "",
      `Até 20 itens por seção. Veja todas as novidades no app: ${origem}/app/comunidade`,
      "",
      "Você escolheu receber este resumo. Para parar em um toque (este link vale até o próximo resumo):",
      `${origem}/api/app/resumo/descadastro?token=${token}`,
    ].join("\n"),
  }
}
