import { log } from "../logger"

export class FalhaNativa extends Error {
  constructor(
    readonly tipo: "android" | "ios",
    readonly status: number,
    readonly categoria: "destino" | "temporaria" | "credencial",
  ) {
    super(`push ${tipo} ${status}`)
    this.name = "FalhaNativa"
  }
}

export function classificar(tipo: "android" | "ios", status: number, motivo = ""): FalhaNativa {
  const categoria =
    status === 401 || status === 403
      ? "credencial"
      : status === 404 || status === 410 || /UNREGISTERED|BadDeviceToken|Unregistered/.test(motivo)
        ? "destino"
        : "temporaria"
  if (categoria === "credencial") log.error("push credential refused", { type: tipo, status })
  return new FalhaNativa(tipo, status, categoria)
}
