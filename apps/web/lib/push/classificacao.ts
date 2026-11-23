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
    status === 404 ||
    status === 410 ||
    /UNREGISTERED|BadDeviceToken|Unregistered|SENDER_ID_MISMATCH/.test(motivo) ||
    (tipo === "android" && /INVALID_ARGUMENT/.test(motivo) && /token/i.test(motivo))
      ? "destino"
      : status === 401 || status === 403
        ? "credencial"
        : "temporaria"
  if (categoria === "credencial") log.error("push credential refused", { type: tipo, status })
  return new FalhaNativa(tipo, status, categoria)
}
