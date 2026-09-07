import { AuthRouteBoundary } from "../src/ui/auth-route-boundary"

export default function SignupRoute() {
  return (
    <AuthRouteBoundary
      eyebrow="Primeiro acesso"
      title="Criar conta"
      description="Esta rota está preparada para receber o envio e a confirmação por e-mail na próxima tarefa delimitada de Auth."
    />
  )
}
