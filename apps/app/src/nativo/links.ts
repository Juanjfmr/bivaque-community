import { App } from "@capacitor/app"
import { rotaDoLink } from "@/lib/nativo/link"
import { CHAVE_DA_ENTRADA, entradaPadrao } from "@/lib/navegacao/entrada"
import { roteador } from "@/src/roteador"

export async function ouvirLinksNativos() {
  const abrir = ({ url }: { url: string }) => {
    const rota = rotaDoLink(url, import.meta.env["VITE_API_BASE"])
    if (rota !== null) {
      void roteador.navigate({
        href: `/app${rota}`,
        state: { [CHAVE_DA_ENTRADA]: entradaPadrao() },
      })
    }
  }
  await App.addListener("appUrlOpen", abrir)
  const inicial = await App.getLaunchUrl()
  if (inicial) abrir(inicial)
}
