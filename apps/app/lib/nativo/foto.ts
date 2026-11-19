import { Camera, CameraResultType, CameraSource } from "@capacitor/camera"

export async function fotoDaCamera(): Promise<File> {
  const foto = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt,
  })
  if (!foto.webPath) throw new Error("Foto sem caminho")
  const resposta = await fetch(foto.webPath)
  if (!resposta.ok) throw new Error("Não foi possível ler a foto")
  const dados = await resposta.blob()
  return new File([dados], `foto.${foto.format}`, { type: dados.type })
}
