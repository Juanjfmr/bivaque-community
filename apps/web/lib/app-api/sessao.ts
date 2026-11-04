import { resolverCredencial } from "./contrato"

/**
 * Resolve a sessão de uma requisição do app (SPA ADR §5, item 1).
 *
 * A regra que este módulo existe para garantir é a que mais erra na prática:
 * **token inválido não cai para o cookie**. Por isso a decisão de credencial
 * vem antes de qualquer ida ao Supabase, e cada caminho consulta exatamente uma
 * fonte. As dependências de runtime entram por parâmetro para o teste poder
 * provar que o caminho do token nunca lê cookie — sem gesto de leitura dupla e
 * sem "funcionou por acaso".
 *
 * Devolve dados de sessão, não clientes: cada rota decide se precisa do cliente
 * do usuário (`sessao-do-next.ts`) ou só do id.
 */

export type UsuarioDaSessao = Readonly<{ id: string; email: string | null }>

export type Sessao =
  | {
      readonly estado: "autenticada"
      readonly via: "cookie" | "bearer"
      readonly usuario: UsuarioDaSessao
    }
  | {
      readonly estado: "recusada"
      readonly motivo: "sem-credencial" | "conflito" | "token-invalido" | "sessao-invalida"
    }

export type DependenciasDeSessao = Readonly<{
  /** Existe cookie de sessão do Supabase no request? */
  temCookie: () => boolean
  /** Valida o cookie da web e devolve a pessoa, ou `null` se a sessão venceu. */
  lerUsuarioDoCookie: () => Promise<UsuarioDaSessao | null>
  /** Valida o token do app de loja e devolve a pessoa, ou `null`. */
  lerUsuarioDoToken: (token: string) => Promise<UsuarioDaSessao | null>
}>

export async function resolverSessao(
  autorizacao: string | null | undefined,
  deps: DependenciasDeSessao,
): Promise<Sessao> {
  const credencial = resolverCredencial({ autorizacao, temCookie: deps.temCookie() })

  if ("erro" in credencial) {
    return { estado: "recusada", motivo: credencial.erro }
  }

  if (credencial.via === "bearer") {
    const usuario = await deps.lerUsuarioDoToken(credencial.token)
    return usuario === null
      ? { estado: "recusada", motivo: "token-invalido" }
      : { estado: "autenticada", via: "bearer", usuario }
  }

  const usuario = await deps.lerUsuarioDoCookie()
  return usuario === null
    ? { estado: "recusada", motivo: "sessao-invalida" }
    : { estado: "autenticada", via: "cookie", usuario }
}
