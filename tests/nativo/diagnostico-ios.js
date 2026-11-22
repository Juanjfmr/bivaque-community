;(() => {
  function registrar(tipo, mensagem = "", arquivo = "", linha = "") {
    const caminho = String(arquivo).split("?")[0]
    const raiz = document.querySelector("#root")
    fetch("http://localhost:3999/__diagnostico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        mensagem: String(mensagem),
        arquivo: caminho,
        linha,
        rota: location.pathname,
        raiz: raiz?.hasChildNodes() ? "com filhos" : "vazia",
      }),
    }).catch(() => {})
  }
  window.addEventListener("error", (evento) =>
    registrar("error", evento.message, evento.filename, evento.lineno),
  )
  window.addEventListener("unhandledrejection", (evento) => {
    const erro = evento.reason
    registrar(
      "unhandledrejection",
      erro?.message ?? String(erro),
      erro?.sourceURL ?? "",
      erro?.line ?? "",
    )
  })
  for (const segundos of [2, 5, 10, 20])
    setTimeout(() => registrar(`estado-${segundos}s`), segundos * 1000)
})()
