import { TelaPergunta } from "@/components/bivaque/tela-pergunta"

export default async function PerguntaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TelaPergunta id={id} />
}
