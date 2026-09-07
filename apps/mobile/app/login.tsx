import { AuthRouteBoundary } from "../src/ui/auth-route-boundary"

export default function LoginRoute() {
  return (
    <AuthRouteBoundary
      eyebrow="Acesso existente"
      title="Entrar no Bivaque"
      description="Esta rota está preparada para receber o envio e a confirmação por e-mail na próxima tarefa delimitada de Auth."
    />
  )
}
