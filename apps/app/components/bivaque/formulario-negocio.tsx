"use client"

import { useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import dadosBairros from "@/lib/demo/auxiliares.json"
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
  const [busca, setBusca] = useState("")
  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [etapa, setEtapa] = useState(0)
  const [onde, setOnde] = useState("depois")
  const [bairros, setBairros] = useState<string[]>([])
  const [bairro, setBairro] = useState("")
  const [atendimento, setAtendimento] = useState("depois")
  const [dias, setDias] = useState<string[]>([])
  const [abre, setAbre] = useState("")
  const [fecha, setFecha] = useState("")
  const [apresentacao, setApresentacao] = useState("")
  const [beneficio, setBeneficio] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [instagram, setInstagram] = useState("")
  const [site, setSite] = useState("")
  const [fotos, setFotos] = useState<Foto[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const bairrosDaCidade =
    (dadosBairros.BAIRROS as Record<string, (string | number[])[][]>)[cidade] ?? []
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
        if (etapa !== 4) return
        const telefone = whatsapp.replace(/\D/g, "")
        const perfil = instagram.trim().replace(/^@/, "")
        if (
          !categoria ||
          (onde === "bairros" && bairros.length === 0) ||
          (atendimento === "fixo" && (dias.length === 0 || !abre || !fecha || fecha <= abre)) ||
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
              onde,
              bairros: onde === "bairros" ? bairros : [],
              atendimento,
              horario: atendimento === "fixo" ? { dias, abre, fecha } : null,
              servicos: especialidades.join(", "),
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
        Passo {etapa + 1} de 5 · Nenhuma informação será publicada nesta demonstração.
      </p>
      {etapa === 0 && (
        <>
          <h2 className="text-lg font-semibold">O que você oferece?</h2>
          <Campo
            id="negocio-nome"
            rotulo="Nome do negócio"
            valor={nome}
            aoMudar={setNome}
            required
            minLength={3}
            maxLength={100}
          />
          <Campo
            id="negocio-busca-categoria"
            rotulo="Buscar tipo de serviço"
            valor={busca}
            aoMudar={setBusca}
            placeholder="Ex.: elétrica, limpeza ou saúde"
            type="search"
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
              {SERVICE_GROUPS.filter(
                ([grupo, especialidadesDoGrupo]) =>
                  grupo === categoria ||
                  [grupo, ...especialidadesDoGrupo].some((item) =>
                    item.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")),
                  ),
              ).map(([grupo]) => (
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
        </>
      )}
      {etapa === 1 && (
        <>
          <h2 className="text-lg font-semibold">Onde você atende?</h2>
          <fieldset className="grid gap-2">
            <legend className="sr-only">Área de atendimento</legend>
            {(
              [
                ["cidade", "Em toda a cidade"],
                ["bairros", "Em bairros específicos"],
                ["online", "On-line"],
                ["depois", "Informar depois"],
              ] as const
            ).map(([valor, titulo]) => (
              <label
                key={valor}
                className="flex min-h-11 items-center gap-3 rounded-xl border px-3"
              >
                <input
                  type="radio"
                  name="onde"
                  value={valor}
                  checked={onde === valor}
                  onChange={() => setOnde(valor)}
                />
                {titulo}
              </label>
            ))}
          </fieldset>
          {onde === "bairros" && (
            <>
              <Campo
                id="negocio-bairro"
                rotulo="Adicionar bairro"
                valor={bairro}
                aoMudar={setBairro}
                placeholder="Busque ou digite o nome do bairro"
                list="negocio-bairros-sugestoes"
              />
              <datalist id="negocio-bairros-sugestoes">
                {bairrosDaCidade.map(([nomeDoBairro]) =>
                  typeof nomeDoBairro === "string" ? (
                    <option key={nomeDoBairro} value={nomeDoBairro} />
                  ) : null,
                )}
              </datalist>
              <p className="text-xs text-(--on-surface-variant)">
                Sugestões de demonstração; você também pode digitar outro bairro.
              </p>
              <Botao
                type="button"
                tom="texto"
                onClick={() => {
                  const novo = bairro.trim()
                  if (
                    novo &&
                    !bairros.some((item) => item.toLocaleLowerCase() === novo.toLocaleLowerCase())
                  )
                    setBairros((atuais) => [...atuais, novo])
                  setBairro("")
                }}
              >
                Adicionar bairro
              </Botao>
              <div className="flex flex-wrap gap-2">
                {bairros.map((item) => (
                  <Botao
                    key={item}
                    type="button"
                    tom="texto"
                    onClick={() => setBairros((atuais) => atuais.filter((b) => b !== item))}
                  >
                    {" "}
                    {item} · Remover
                  </Botao>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {etapa === 2 && (
        <>
          <h2 className="text-lg font-semibold">Como funciona seu atendimento?</h2>
          <fieldset className="grid gap-2">
            <legend className="sr-only">Forma de atendimento</legend>
            {(
              [
                ["fixo", "Tenho horário fixo"],
                ["combinado", "Atendo com horário combinado"],
                ["depois", "Informar depois"],
              ] as const
            ).map(([valor, titulo]) => (
              <label
                key={valor}
                className="flex min-h-11 items-center gap-3 rounded-xl border px-3"
              >
                <input
                  type="radio"
                  name="atendimento"
                  value={valor}
                  checked={atendimento === valor}
                  onChange={() => setAtendimento(valor)}
                />
                {titulo}
              </label>
            ))}
          </fieldset>
          {atendimento === "fixo" && (
            <>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">Dias de atendimento</legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Segunda-feira",
                    "Terça-feira",
                    "Quarta-feira",
                    "Quinta-feira",
                    "Sexta-feira",
                    "Sábado",
                    "Domingo",
                  ].map((dia) => (
                    <label
                      key={dia}
                      className="flex min-h-11 items-center gap-2 rounded-xl border px-3"
                    >
                      <input
                        type="checkbox"
                        checked={dias.includes(dia)}
                        onChange={(e) => {
                          const marcado = e.target.checked
                          setDias((anteriores) =>
                            marcado ? [...anteriores, dia] : anteriores.filter((d) => d !== dia),
                          )
                        }}
                      />
                      {dia}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <Campo
                  id="negocio-abre"
                  rotulo="Abre às"
                  valor={abre}
                  aoMudar={setAbre}
                  type="time"
                />
                <Campo
                  id="negocio-fecha"
                  rotulo="Fecha às"
                  valor={fecha}
                  aoMudar={setFecha}
                  type="time"
                />
              </div>
            </>
          )}
        </>
      )}
      {etapa === 3 && (
        <>
          <h2 className="text-lg font-semibold">Como podem conhecer seu trabalho?</h2>
          <p className="text-sm text-(--on-surface-variant)">
            Tudo aqui é opcional e pode ser informado depois.
          </p>
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
          <Campo
            id="negocio-site"
            rotulo="Site (opcional)"
            valor={site}
            aoMudar={setSite}
            type="url"
          />
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
        </>
      )}
      {etapa === 4 && (
        <>
          <h2 className="text-lg font-semibold">Confira sua página</h2>
          <div className="grid gap-2 rounded-xl border p-4">
            <strong>{nome}</strong>
            <p>{categoria}</p>
            <p>
              {especialidades.length
                ? especialidades.join(", ")
                : "Todas as especialidades do grupo"}
            </p>
            <p>
              {onde === "cidade"
                ? `Atende em toda a cidade de ${cidade}`
                : onde === "online"
                  ? "Atende on-line"
                  : onde === "bairros"
                    ? `Bairros: ${bairros.join(", ")}`
                    : "Área de atendimento a informar"}
            </p>
            <p>
              {atendimento === "fixo"
                ? `${dias.join(", ")} · ${abre} às ${fecha}`
                : atendimento === "combinado"
                  ? "Atendimento com horário combinado"
                  : "Horário a informar"}
            </p>
            {apresentacao && <p>Apresentação: {apresentacao}</p>}
            {beneficio && <p>Benefício: {beneficio}</p>}
            {whatsapp && <p>WhatsApp: {whatsapp}</p>}
            {instagram && <p>Instagram: {instagram}</p>}
            {site && <p>Site: {site}</p>}
            <p>{fotos.length ? `${fotos.length} foto(s) adicionada(s)` : "Sem fotos"}</p>
            {fotos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {fotos.map((foto, indice) => (
                  <img
                    key={foto.id}
                    src={foto.imagem}
                    alt={`Prévia da foto ${indice + 1}${indice === 0 ? ", capa" : ""}`}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {erro && (
        <p role="alert" className="text-sm text-(--destructive)">
          {erro}
        </p>
      )}
      <p className="text-xs text-(--on-surface-variant)">
        Rascunho local de {cidade}, apenas nesta sessão. Nenhum dado será enviado.
      </p>
      <div className="flex justify-end gap-2">
        <Botao
          type="button"
          tom="texto"
          onClick={() => {
            setErro("")
            if (etapa === 0) aoCancelar()
            else setEtapa(etapa - 1)
          }}
        >
          Voltar
        </Botao>
        {etapa < 4 ? (
          <Botao
            key="continuar"
            type="button"
            disabled={ocupado}
            onClick={() => {
              if (etapa === 0 && (nome.trim().length < 3 || !categoria)) {
                setErro("Informe o nome e escolha o tipo de serviço.")
                return
              }
              if (etapa === 1 && onde === "bairros" && bairros.length === 0) {
                setErro("Adicione ao menos um bairro ou escolha outra opção.")
                return
              }
              if (
                etapa === 2 &&
                atendimento === "fixo" &&
                (dias.length === 0 || !abre || !fecha || fecha <= abre)
              ) {
                setErro("Escolha os dias e informe um horário de fechamento posterior à abertura.")
                return
              }
              if (
                etapa === 3 &&
                ((whatsapp && !/^\d{10,15}$/.test(whatsapp.replace(/\D/g, ""))) ||
                  (instagram &&
                    !/^[a-zA-Z0-9._]{1,30}$/.test(instagram.trim().replace(/^@/, ""))) ||
                  (site && !/^https?:\/\//i.test(site)))
              ) {
                setErro("Confira WhatsApp, Instagram e site.")
                return
              }
              setErro("")
              setEtapa(etapa + 1)
            }}
          >
            Continuar
          </Botao>
        ) : (
          <Botao key="salvar" type="submit" disabled={ocupado}>
            Salvar rascunho
          </Botao>
        )}
      </div>
    </form>
  )
}
