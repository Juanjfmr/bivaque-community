import { notFound } from "next/navigation"
import { IndicationDetail } from "../../../components/indications/indication-detail"

// Um pedido de indicação e a conversa dele. O endereço é o mesmo de onde quer
// que se chegue: notificação, salvos, denúncia, Guia, busca ou Comunidade.
// Identificador que não é UUID nem chega ao banco.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function IndicacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  return <IndicationDetail requestId={id} />
}
