// apps/mobile/src/auth/useAuthDeepLink.ts
// Troca o `code` do retorno de autenticação por sessão.
//
// Por que isto vive numa ROTA e não num listener da raiz: o expo-router mapeia
// a URL do deep link para a árvore de rotas. Um listener solto na raiz até
// recebe a URL e faz a troca — provado no emulador em 2026-09-06, com
// `last_sign_in_at` preenchido no banco — mas o router, em paralelo, procura
// uma rota chamada `auth-callback`, não encontra, e a pessoa termina o login
// olhando para "Unmatched Route" com a sessão criada atrás da tela. É a mesma
// armadilha do commit b3474fb. O caminho do retorno precisa ser uma rota de
// verdade.
//
// Os parâmetros vêm do router. O fallback para `getInitialURL` existe porque
// erro do GoTrue pode chegar no fragmento (#error=...), que não vira parâmetro
// de rota — sem ele, um link expirado viraria uma tela parada sem explicação.
import * as Linking from "expo-linking"
import { useEffect, useRef, useState } from "react"
import { supabase } from "./client"
import { describeAuthError, readAuthDeepLink } from "./deep-link"

export type AuthCallbackState =
  | { status: "exchanging" }
  | { status: "signed-in" }
  | { status: "error"; message: string }

type RouteParams = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) return value[0] ?? null
  return typeof value === "string" && value.length > 0 ? value : null
}

export function useAuthCallback(params: RouteParams): AuthCallbackState {
  const [state, setState] = useState<AuthCallbackState>({ status: "exchanging" })
  // O GoTrue invalida o code no primeiro uso. Uma segunda troca com o mesmo
  // valor devolveria erro e apagaria da tela a sessão recém-criada.
  const consumed = useRef(false)

  useEffect(() => {
    if (consumed.current) return
    let active = true

    const run = async () => {
      let code = first(params["code"])
      let errorCode = first(params["error_code"]) ?? first(params["error"])

      if (!code && !errorCode) {
        const link = readAuthDeepLink(await Linking.getInitialURL())
        if (link?.kind === "code") code = link.code
        if (link?.kind === "error") errorCode = link.code ?? "desconhecido"
      }

      if (errorCode) {
        if (active) setState({ status: "error", message: describeAuthError(errorCode) })
        return
      }

      if (!code) {
        if (active) setState({ status: "error", message: describeAuthError(null) })
        return
      }

      consumed.current = true
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!active) return

      // A mensagem crua do GoTrue não vai para a tela: distingue causas que a
      // pessoa não pode agir e, em parte dos casos, fala sobre a conta.
      setState(
        error ? { status: "error", message: describeAuthError(null) } : { status: "signed-in" },
      )
    }

    void run()
    return () => {
      active = false
    }
  }, [params])

  return state
}
