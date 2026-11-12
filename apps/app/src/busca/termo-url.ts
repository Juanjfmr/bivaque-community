/**
 * O termo da busca na URL (LAN-TROCA): o link antigo `/explorar/busca?q=<termo>`
 * chega ao app como `/app/busca?q=<termo>` e a tela abre já com o termo no campo
 * e a lista filtrada. Lógica pura, sem roteador: é aqui que a leitura do
 * endereço é provada por teste.
 *
 * O que um link pode trazer é tratado com o mesmo critério do servidor
 * (`termoBuscavel` em `apps/web/lib/search/params.ts`): o termo aparado precisa
 * ter 2+ caracteres, ao menos uma letra ou número, nenhum caractere de controle
 * e caber no limite que a rota aceita. Fora disso a busca abre no estado vazio
 * honesto — nunca numa requisição que a rota recusaria.
 */

/** O mesmo teto da rota `/api/app/busca`: acima dele a resposta é recusa. */
export const LIMITE_DO_TERMO = 100

/** Parâmetro canônico do endereço (`q`); `search` é a grafia antiga, só lida. */
const CHAVE_DO_TERMO = "q"
const CHAVE_ANTIGA = "search"

const CABE_NO_TERMO = /[\p{L}\p{N}]/u

function semControle(termo: string): boolean {
  return [...termo].every((letra) => {
    const codigo = letra.charCodeAt(0)
    return codigo >= 32 && codigo !== 127
  })
}

/** O termo que a tela usa, quando o valor cabe na busca; senão `null`. */
export function termoAceito(valor: string): string | null {
  const termo = valor.trim()
  if (termo.length < 2 || termo.length > LIMITE_DO_TERMO) return null
  return CABE_NO_TERMO.test(termo) && semControle(termo) ? termo : null
}

function daUrl(busca: Record<string, unknown>): string | null {
  const q = busca[CHAVE_DO_TERMO]
  if (typeof q === "string") return q
  const antigo = busca[CHAVE_ANTIGA]
  return typeof antigo === "string" ? antigo : null
}

/**
 * O termo semeado pelo endereço. Vazio, só espaços, com um caractere, sem
 * letra nem número, com caractere de controle ou acima do limite vira `""`: a
 * tela abre no estado vazio, como um `/app/busca` sem link.
 */
export function termoDaUrl(busca: Record<string, unknown>): string {
  const bruto = daUrl(busca)
  return bruto === null ? "" : (termoAceito(bruto) ?? "")
}
