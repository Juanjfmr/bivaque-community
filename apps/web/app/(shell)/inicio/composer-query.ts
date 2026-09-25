// Query da rota /publicacoes/nova aberta pela Home. `origem` devolve a pessoa
// ao Início ao publicar ou cancelar; `comunidade` é o público padrão (a
// comunidade principal da cidade atual); `tipo` é só a dica de anexo.
export function composerQuery(primaryCommunityId: string | null, attachment?: string): string {
  const params = new URLSearchParams({ origem: "/inicio" })
  if (primaryCommunityId) params.set("comunidade", primaryCommunityId)
  if (attachment) params.set("tipo", attachment)
  return params.toString()
}
