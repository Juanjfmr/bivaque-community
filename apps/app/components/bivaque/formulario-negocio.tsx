"use client"

import { useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { SERVICE_GROUPS } from "@/lib/servicos-negocio"

type Foto = { id: string; nome: string; imagem: string }

export function FormularioNegocio({
  cidade,
  aoCancelar,
  aoConcluir,
}: {
  readonly cidade: string
  readonly aoCancelar: () => void
  readonly aoConcluir: () => void
}) {
  const [nome, setNome] = useState("")
  const [categoria, setCategoria] = useState("")
  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [horario, setHorario] = useState("")
  const [bairros, setBairros] = useState("")
  const [servicos, setServicos] = useState("")
  const [apresentacao, setApresentacao] = useState("")
  const [beneficio, setBeneficio] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [instagram, setInstagram] = useState("")
  const [site, setSite] = useState("")
  const [fotos, setFotos] = useState<Foto[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const opcoes = SERVICE_GROUPS.find(([grupo]) => grupo === categoria)?.[1] ?? []

  async function adicionarFotos(arquivos: FileList | null) {
    if (!arquivos?.length) return
    const lista = Array.from(arquivos)
    if (
      fotos.length + lista.length > 6 ||
      lista.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(f.type) ||
          f.size > 12 * 1024 * 1024,
      )
    ) {
      setErro("Escolha até 6 fotos JPG, PNG, WebP ou AVIF de até 12 MB cada.")
      return
    }
    setOcupado(true)
    setErro("")
    try {
      const novas: Foto[] = []
      for (const arquivo of lista) {
        const bitmap = await createImageBitmap(arquivo)
        const escala = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(bitmap.width * escala)
        canvas.height = Math.round(bitmap.height * escala)
        const contexto = canvas.getContext("2d")
        if (!contexto) {
          bitmap.close()
          throw new Error("Imagem indisponível")
        }
        contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        bitmap.close()
        novas.push({
          id: crypto.randomUUID(),
          nome: arquivo.name,
          imagem: canvas.toDataURL("image/jpeg", 0.78),
        })
      }
      setFotos((anteriores) => [...anteriores, ...novas])
    } catch {
      setErro("Não foi possível preparar as fotos. Tente novamente com outras imagens.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        const telefone = whatsapp.replace(/\D/g, "")
        const perfil = instagram.trim().replace(/^@/, "")
        if (
          !categoria ||
          !bairros.trim() ||
          !servicos.trim() ||
          (telefone && !/^\d{10,15}$/.test(telefone)) ||
          (perfil && !/^[a-zA-Z0-9._]{1,30}$/.test(perfil)) ||
          (site && !/^https?:\/\//i.test(site))
        ) {
          setErro(
            "Confira os bairros, serviços e contatos. O site deve começar com http:// ou https://.",
          )
          return
        }
        try {
          sessionStorage.setItem(
            "bivaque:onboarding-negocio",
            JSON.stringify({
              cidade,
              nome: nome.trim(),
              categoria,
              especialidades,
              horario: horario.trim(),
              bairros: bairros.trim(),
              servicos: servicos.trim(),
              apresentacao: apresentacao.trim(),
              beneficio: beneficio.trim(),
              whatsapp: telefone,
              instagram: perfil,
              site: site.trim(),
              fotos,
            }),
          )
          setErro("")
          aoConcluir()
        } catch {
          setErro(
            "Não foi possível salvar o rascunho nesta sessão. Tente usar menos fotos; seus dados continuam no formulário.",
          )
        }
      }}
    >
      <p className="text-sm text-(--on-surface-variant)">
        Prepare a apresentação do seu negócio. Nada será publicado nesta demonstração.
      </p>
      <Campo
        id="negocio-nome"
        rotulo="Nome do negócio"
        valor={nome}
        aoMudar={setNome}
        required
        minLength={3}
        maxLength={100}
      />
      <div className="grid gap-1.5">
        <label htmlFor="negocio-categoria" className="text-sm font-medium">
          Tipo de serviço
        </label>
        <select
          id="negocio-categoria"
          required
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value)
            setEspecialidades([])
          }}
          className="min-h-11 rounded-xl border bg-transparent px-3"
        >
          <option value="">Escolher tipo de serviço</option>
          {SERVICE_GROUPS.map(([grupo]) => (
            <option key={grupo} value={grupo}>
              {grupo}
            </option>
          ))}
        </select>
      </div>
      {opcoes.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Especialidades (opcional)</legend>
          <p className="text-xs text-(--on-surface-variant)">
            Sem selecionar, você atende todo o grupo.
          </p>
          <div className="flex flex-wrap gap-2">
            {opcoes.map((opcao) => (
              <label
                key={opcao}
                className="flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={especialidades.includes(opcao)}
                  onChange={(e) =>
                    setEspecialidades((anteriores) =>
                      e.target.checked
                        ? [...anteriores, opcao]
                        : anteriores.filter((item) => item !== opcao),
                    )
                  }
                />
                {opcao}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Campo
        id="negocio-horario"
        rotulo="Horário ou agendamento"
        valor={horario}
        aoMudar={setHorario}
        required
        maxLength={100}
      />
      <Campo
        id="negocio-bairros"
        rotulo="Bairros em que atende"
        valor={bairros}
        aoMudar={setBairros}
        required
        nota="Separe os bairros por vírgula."
      />
      <Campo
        id="negocio-servicos"
        rotulo="Serviços oferecidos"
        valor={servicos}
        aoMudar={setServicos}
        area
        nota="Informe os serviços que oferece."
      />
      <Campo
        id="negocio-apresentacao"
        rotulo="Apresentação (opcional)"
        valor={apresentacao}
        aoMudar={setApresentacao}
        area
      />
      <Campo
        id="negocio-beneficio"
        rotulo="Benefício para a comunidade (opcional)"
        valor={beneficio}
        aoMudar={setBeneficio}
        maxLength={120}
      />
      <Campo
        id="negocio-whatsapp"
        rotulo="WhatsApp (opcional)"
        valor={whatsapp}
        aoMudar={setWhatsapp}
        type="tel"
        nota="DDD e número."
      />
      <Campo
        id="negocio-instagram"
        rotulo="Instagram (opcional)"
        valor={instagram}
        aoMudar={setInstagram}
        nota="Nome do perfil, sem @."
      />
      <Campo id="negocio-site" rotulo="Site (opcional)" valor={site} aoMudar={setSite} type="url" />
      <div className="grid gap-2">
        <label htmlFor="negocio-fotos" className="text-sm font-medium">
          Fotos do negócio (até 6)
        </label>
        <p className="text-xs text-(--on-surface-variant)">
          A primeira foto será a capa. JPG, PNG, WebP ou AVIF; até 12 MB por imagem.
        </p>
        <input
          id="negocio-fotos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={ocupado}
          onChange={(e) => {
            void adicionarFotos(e.target.files)
            e.target.value = ""
          }}
        />
        {ocupado && <p role="status">Preparando fotos…</p>}
        <div className="flex flex-wrap gap-2">
          {fotos.map((foto, i) => (
            <div key={foto.id} className="grid gap-1">
              <img
                src={foto.imagem}
                alt={`Foto ${i + 1}${i === 0 ? ", capa" : ""}`}
                className="h-24 w-24 rounded-xl object-cover"
              />
              <span className="text-xs">{i === 0 ? "Capa" : foto.nome}</span>
              <Botao
                type="button"
                tom="texto"
                onClick={() =>
                  setFotos((anteriores) => anteriores.filter((_, indice) => indice !== i))
                }
              >
                Remover foto {i + 1}
              </Botao>
              {i > 0 && (
                <Botao
                  type="button"
                  tom="texto"
                  onClick={() =>
                    setFotos((anteriores) =>
                      [anteriores[i], ...anteriores.filter((_, indice) => indice !== i)].filter(
                        (item): item is Foto => item !== undefined,
                      ),
                    )
                  }
                >
                  Tornar capa
                </Botao>
              )}
            </div>
          ))}
        </div>
      </div>
      {erro && (
        <p role="alert" className="text-sm text-(--destructive)">
          {erro}
        </p>
      )}
      <p className="text-xs text-(--on-surface-variant)">
        Rascunho local de {cidade}, apenas nesta sessão. Nenhum dado será enviado.
      </p>
      <div className="flex justify-end gap-2">
        <Botao type="button" tom="texto" onClick={aoCancelar}>
          Voltar
        </Botao>
        <Botao type="submit" disabled={ocupado}>
          Salvar rascunho
        </Botao>
      </div>
    </form>
  )
}
