// PreToolUse firewall — decisao de bloqueio.
//
// Vive em Node, e nao em bash, por um motivo concreto: a versao anterior extraia
// o comando com `grep -o '"command":"[^"]*"'`, e essa classe de caractere para na
// primeira aspa ESCAPADA do JSON. Um comando como
//     DIR="/tmp/x" && rm -rf / --no-preserve-root
// era lido apenas como `DIR=\` e passava por TODAS as regras. Provado em
// 2026-09-02 com payload de controle: o mesmo `rm -rf` sem aspas antes era
// bloqueado, e com aspas antes era liberado. Parser de verdade elimina a classe
// inteira de bypass, em vez de remendar um padrao por vez.
//
// stdin: JSON {tool_name, tool_input}
// exit 0 = permite | exit 2 = bloqueia (stderr vira o motivo lido pelo modelo)

const readStdin = () =>
  new Promise((resolve, reject) => {
    let raw = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk) => {
      raw += chunk
    })
    process.stdin.on("end", () => resolve(raw))
    process.stdin.on("error", reject)
  })

const block = (reason) => {
  process.stderr.write(`BLOQUEADO: ${reason}\n`)
  process.exit(2)
}

const has = (haystack, needle) => haystack.includes(needle)

// Subcomandos de leitura que podem apontar para producao. `projects api-keys`
// fica DE FORA de proposito: ele imprime a service_role key, e segredo nao deve
// entrar no contexto do agente nem no transcript.
const LINKED_READ_ONLY = ["migration list", "db diff", "inspect db"]

const checkBash = (cmd) => {
  if (has(cmd, "rm -rf") || has(cmd, "rm -fr")) {
    block("rm -rf e proibido — use remocao cirurgica com confirmacao")
  }
  if (has(cmd, "git push") && (has(cmd, "--force") || has(cmd, " -f"))) {
    block("git push forcado e proibido sem aprovacao")
  }
  if (has(cmd, "--linked") && !LINKED_READ_ONLY.some((sub) => has(cmd, sub))) {
    block(`supabase --linked: so leitura e permitida (${LINKED_READ_ONLY.join(", ")})`)
  }
  if (has(cmd, "db:reset") || has(cmd, "db reset")) {
    block("db:reset requer aprovacao explicita — use --yes apenas com confirmacao")
  }
  if (has(cmd, ".env")) {
    block("comando referenciando .env — nao manipule arquivos .env")
  }
}

// `.env.example` e template versionado, nao segredo. A versao anterior tentava
// isenta-lo com [ "$file" = "*.env.example" ], que compara com o glob LITERAL e
// nunca casa com um caminho real — na pratica o template era sempre bloqueado.
const isEnvFile = (file) => /(^|[/\\])\.env(\.|$)/.test(file)
const isEnvExample = (file) => /(^|[/\\])\.env\.example$/.test(file)

const checkFile = (file) => {
  if (isEnvFile(file) && !isEnvExample(file)) {
    block("arquivo .env nao pode ser escrito/alterado")
  }
  if (/\.(key|pem|p12)$/.test(file)) {
    block("arquivo de chave/segredo nao pode ser alterado")
  }
}

const main = async () => {
  const raw = await readStdin()
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    // Falha FECHADA: sem conseguir ler o payload nao da para afirmar que o
    // comando e seguro, e falhar aberto foi exatamente o defeito anterior.
    block("payload do hook ilegivel — bloqueado por seguranca")
    return
  }

  const tool = typeof payload?.tool_name === "string" ? payload.tool_name : ""
  const input = payload?.tool_input ?? {}

  if (tool === "Bash" && typeof input.command === "string") {
    checkBash(input.command)
  }
  if ((tool === "Edit" || tool === "Write") && typeof input.file_path === "string") {
    checkFile(input.file_path)
  }

  process.exit(0)
}

main().catch((error) => {
  block(`falha interna do guard: ${error?.message ?? error}`)
})
