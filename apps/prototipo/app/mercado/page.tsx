import Link from "next/link"
export default function MercadoPage() {
  return (
    <main className="mx-auto max-w-xl p-7">
      <h1>Mercado</h1>
      <p>
        O catálogo de negócios e produtos pertence ao módulo Mercado do aplicativo principal. Esta
        versão demonstra a jornada Comunidade.
      </p>
      <Link className="underline" href="/comunidade">
        Voltar para Comunidade
      </Link>
    </main>
  )
}
