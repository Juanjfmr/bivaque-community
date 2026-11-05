/**
 * Opções do cookie de sessão do Supabase, num lugar só.
 *
 * O callback do OAuth (`app/auth/callback/route.ts`) e o proxy gravam o cookie
 * com estas mesmas opções: 400 dias, caminho `/`, SameSite Lax e `Secure` em
 * produção. As rotas `/api/app` precisam gravar o MESMO cookie (na verificação
 * do código e na renovação da sessão) — com opções diferentes, o navegador
 * guardaria duas cópias do `sb-…-auth-token`, e a antiga venceria a nova.
 *
 * É função, não constante: `NODE_ENV` é lido na hora da gravação, para o teste
 * provar o `Secure` sem recarregar o módulo.
 */

export type OpcoesDoCookieDaSessao = {
  maxAge: number
  path: string
  sameSite: "lax"
  secure: boolean
}

export function opcoesDoCookieDaSessao(): OpcoesDoCookieDaSessao {
  return {
    maxAge: 60 * 60 * 24 * 400,
    path: "/",
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
  }
}
