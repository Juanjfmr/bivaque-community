// Onde o botão de criação do shell NÃO aparece. Ele vive em toda rota do membro,
// menos onde atrapalharia o que a pessoa está fazendo:
//
// - conversas, cujo campo de mensagem ocupa o rodapé que o botão flutuante usaria;
// - formulários de criação e edição, que já têm a própria ação principal;
// - configurações, onde não há o que criar.
// - a consulta a outra cidade (/cidade/…): lá só se lê, e o botão publicaria na
//   SUA cidade, o que na tela de outra só confunde.

const CONVERSATION_PREFIXES = ["/messages/", "/pedidos/"] as const

const FORM_SEGMENTS = new Set([
  "novo",
  "nova",
  "editar",
  "sugerir",
  "correcao",
  "perguntas",
  "invite",
  "indicar-prestador",
])

export function showsCreateAction(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/"
  if (path === "/configuracoes" || path.startsWith("/configuracoes/")) return false
  if (path.startsWith("/cidade/")) return false
  // A caixa de conversas (/messages) e a lista de pedidos (/pedidos) mantêm o
  // botão; só a conversa aberta, com o campo de mensagem, o dispensa.
  for (const prefix of CONVERSATION_PREFIXES) {
    if (path.startsWith(prefix) && path.length > prefix.length) {
      const rest = path.slice(prefix.length)
      if (rest !== "novo") return false
    }
  }
  const last = path.split("/").pop() ?? ""
  return !FORM_SEGMENTS.has(last)
}
