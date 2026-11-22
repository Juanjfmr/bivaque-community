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
  const caminhoDe = (url) => {
    try {
      return new URL(String(url), location.href).pathname
    } catch {
      return ""
    }
  }
  window.addEventListener(
    "error",
    (evento) => {
      const alvo = evento.target
      if (alvo && alvo !== window && (alvo.src || alvo.href)) {
        registrar("recurso-falhou", alvo.tagName, caminhoDe(alvo.src || alvo.href))
        return
      }
      registrar("error", evento.message, evento.filename, evento.lineno)
    },
    true,
  )
  for (const nivel of ["error", "warn"]) {
    const original = console[nivel].bind(console)
    console[nivel] = (...args) => {
      registrar(
        `console-${nivel}`,
        args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(" "),
      )
      original(...args)
    }
  }
  const fetchOriginal = window.fetch.bind(window)
  window.fetch = (entrada, opcoes) => {
    const caminho = caminhoDe(entrada instanceof Request ? entrada.url : entrada)
    if (caminho.startsWith("/api/")) {
      const pilha = (new Error().stack ?? "")
        .split("\n")
        .slice(1, 4)
        .map((quadro) => {
          const local = quadro.replace(/^[^@]*@/, "")
          const posicao = local.match(/(:\d+:\d+)$/)?.[1] ?? ""
          return `${caminhoDe(local.replace(/:\d+:\d+$/, ""))}${posicao}`
        })
        .join(" < ")
      registrar("fetch", caminho, pilha)
    }
    return fetchOriginal(entrada, opcoes)
  }
  function recursos() {
    const nomes = performance
      .getEntriesByType("resource")
      .map((r) => caminhoDe(r.name))
      .filter((nome) => nome && !nome.startsWith("/__diagnostico"))
    for (let i = 0; i < nomes.length; i += 6) registrar("recursos", nomes.slice(i, i + 6).join(" "))
  }
  window.addEventListener("unhandledrejection", (evento) => {
    const erro = evento.reason
    registrar(
      "unhandledrejection",
      erro?.message ?? String(erro),
      erro?.sourceURL ?? "",
      erro?.line ?? "",
    )
  })
  registrar("origem", `${location.protocol} ${location.origin}`)
  for (const metodo of ["pushState", "replaceState"]) {
    const original = history[metodo].bind(history)
    history[metodo] = (estado, titulo, url) => {
      registrar(`history-${metodo}`, url === undefined ? "" : caminhoDe(url))
      return original(estado, titulo, url)
    }
  }
  let mutacoes = 0
  const observar = () => {
    const raiz = document.querySelector("#root")
    if (!raiz) return
    new MutationObserver((lista) => {
      for (const mutacao of lista) {
        if (mutacoes++ >= 8) return
        const nomes = (nos) =>
          [...nos].map((no) => no.nodeName + (no.className ? `.${no.className}` : "")).join(",")
        registrar(
          "mutacao-raiz",
          `+${mutacao.addedNodes.length} ${nomes(mutacao.addedNodes)} -${mutacao.removedNodes.length} ${nomes(mutacao.removedNodes)}`,
        )
      }
    }).observe(raiz, { childList: true })
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observar)
  else observar()
  document.addEventListener("DOMContentLoaded", () =>
    registrar("domcontentloaded", String(Math.round(performance.now()))),
  )
  for (const segundos of [2, 5, 10, 20])
    setTimeout(() => {
      const corpo = [...document.body.children].map((no) => no.nodeName).join(",")
      registrar(`estado-${segundos}s`, `${document.readyState} corpo=${corpo}`)
      if (segundos === 5) recursos()
    }, segundos * 1000)
})()
