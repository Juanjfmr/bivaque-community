// SEC-006 (reparo 2026-10-19, tentativa 2) — classificação de erro de RPC.
//
// SQLSTATE tem cinco caracteres (`23505`, `42501`, `P0002`). Esses erros são a
// própria instrução recusada: não houve commit, então a compensação do objeto
// novo é segura. Códigos `PGRST...` (PostgREST/HTTP) e erros sem código podem
// representar resposta perdida depois do commit; tratá-los como rollback
// apagava uma foto que o banco já referenciava.

export interface RpcErrorLike {
  message: string
  code?: string
}

export function isDefiniteSqlRejection(error: RpcErrorLike | null): boolean {
  if (error === null) return false
  const code = error.code
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)
}
