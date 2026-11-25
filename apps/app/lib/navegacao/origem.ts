/** A reescrita do roteador precisa de uma origem HTTP no iOS. */
export function origemDoRoteador(localizacao: Pick<Location, "protocol">): string | undefined {
  return localizacao.protocol === "capacitor:" ? "http://localhost" : undefined
}
