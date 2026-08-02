import { brandTokens } from "@bivaque/tokens"

export default function CommunityPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{brandTokens.productName}</h1>
      <p className="max-w-md text-center text-sm text-muted">
        Sua comunidade de Manaus est&aacute; sendo preparada. Em breve voc&ecirc; poder&aacute;
        acompanhar novidades, grupos e eventos locais.
      </p>
    </div>
  )
}
