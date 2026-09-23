import { redirect } from "next/navigation"
import { legacyCommunityTarget } from "./legacy-target"

// RUN-004 / O06 — `/community` é rota de compatibilidade, não tela.
//
// Antes desta mudança a rota renderizava o feed legado (client) e usava `?post=`
// só para rolar e destacar um card. O contrato O06 manda encaminhar: sem `post`
// ao início, com `post` ao detalhe estável, que resolve autorização,
// inexistente/sem acesso e retomada por conta própria. Nada é renderizado aqui,
// então nenhum parâmetro — ausente, malformado ou de terceiro — pode produzir
// feed alheio ou vazar conteúdo.
export default async function LegacyCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string | string[] }>
}) {
  const params = await searchParams
  redirect(legacyCommunityTarget(params.post).path)
}
