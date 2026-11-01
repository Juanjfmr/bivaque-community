"use client"

import { Fragment, useRef, useState } from "react"
import { Campo } from "@/components/bivaque/campos"
import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import dadosBairros from "@/lib/demo/auxiliares.json"
import { SERVICE_GROUPS } from "@/lib/servicos-negocio"

type Foto = { id: string; nome: string; imagem: string }

// Formulário de negócio em cinco passos (ENT-005, refeito no ENT-007) sobre o
// bloco Onboarding Wizard Form, de cnippet-dev no 21st.dev
// (https://21st.dev/@cnippet-dev/components/v-form-8): o indicador de passos
// numerados com linha entre eles, os cartões de rádio com título e descrição,
// as ações Voltar/Continuar lado a lado e a confirmação em linhas divididas.
// Os rádios são o Radio Group de originui
// (https://21st.dev/@originui/components/radio-group) e as caixas, o Card Style
// Checkbox de cnippet-dev (https://21st.dev/@cnippet-dev/components/v-checkbox-4).
// Trocas: o estado em React no lugar de FormData/react-hook-form, o ícone do app
// no lugar do lucide-react, e os cinco passos e textos do Bivaque no lugar do
// exemplo de conta e plano.

const SUBTITULOS = [
  "O que você oferece?",
  "Onde você atende?",
  "Como funciona seu atendimento?",
  "Como podem conhecer seu trabalho?",
  "Confira sua página",
] as const

const PASSOS = ["Serviço", "Área", "Horário", "Contato", "Revisão"] as const

const AREAS = [
  ["cidade", "Em toda a cidade", "Você vai a qualquer bairro."],
  ["bairros", "Em bairros específicos", "Escolha os bairros onde atende."],
  ["online", "On-line", "Atendimento a distância."],
  ["depois", "Informar depois", "Você completa quando quiser."],
] as const

const FORMAS = [
  ["fixo", "Tenho horário fixo", "Dias e horário de abertura definidos."],
  ["combinado", "Atendo com horário combinado", "Você combina o horário com cada cliente."],
  ["depois", "Informar depois", "Você completa quando quiser."],
] as const

/** Cartão de linha inteira do bloco: o rótulo envolve o rádio, título e descrição. */
const CARTAO =
  "entrada-etapa-cartao flex cursor-pointer items-start gap-3 rounded-lg border border-(--border) bg-(--card) p-3 transition-colors hover:bg-(--accent)/50 has-[[data-state=checked]]:border-(--primary)/40 has-[[data-state=checked]]:bg-(--accent)/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--ring)"

/** Caixa compacta do Card Style Checkbox, para especialidades e dias. */
const CAIXA =
  "entrada-etapa-chip flex cursor-pointer items-center gap-2 rounded-lg border border-(--border) bg-(--card) px-3 py-2 text-sm transition-colors hover:bg-(--accent)/50 has-[[data-state=checked]]:border-(--primary)/48 has-[[data-state=checked]]:bg-(--accent)/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--ring)"

const DIAS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
] as const

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
  const subtitulo = useRef<HTMLHeadingElement>(null)
  const campoDeFotos = useRef<HTMLInputElement>(null)
  const bairrosDaCidade =
    (dadosBairros.BAIRROS as Record<string, (string | number[])[][]>)[cidade] ?? []
  const opcoes = SERVICE_GROUPS.find(([grupo]) => grupo === categoria)?.[1] ?? []

  // Ao trocar de etapa o foco vai para o subtítulo da nova etapa; na abertura
  // quem recebe é o título da tela.
  const trocarEtapa = (destino: number) => {
    setErro("")
    setEtapa(destino)
    requestAnimationFrame(() => subtitulo.current?.focus())
  }

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
      className="entrada-etapa-formulario"
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
      {/* Indicador do bloco: círculo numerado (check quando feito), rótulo e a
          linha até o próximo. Quem anuncia o passo é o texto oculto. */}
      <div className="entrada-etapa-progresso">
        <p className="sr-only" aria-live="polite">{`Passo ${etapa + 1} de 5`}</p>
        <ol className="flex items-center gap-2" aria-hidden="true">
          {PASSOS.map((rotulo, indice) => (
            <li
              key={rotulo}
              data-estado={indice < etapa ? "feito" : indice === etapa ? "atual" : "futuro"}
              className="flex items-center gap-2 last:flex-none [&:not(:last-child)]:flex-1"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    indice < etapa
                      ? "bg-(--primary) text-(--primary-foreground)"
                      : indice === etapa
                        ? "border-2 border-(--primary) text-(--primary)"
                        : "border border-(--border) text-(--muted-foreground)"
                  }`}
                >
                  {indice < etapa ? <Icone nome="check" className="checkbox-marca" /> : indice + 1}
                </span>
                <span
                  className={`entrada-etapa-progresso-rotulo text-xs font-medium ${
                    indice === etapa ? "text-(--foreground)" : "text-(--muted-foreground)"
                  }`}
                >
                  {rotulo}
                </span>
              </span>
              {indice < PASSOS.length - 1 && (
                <span
                  className={`h-px min-w-3 flex-1 ${indice < etapa ? "bg-(--primary)" : "bg-(--border)"}`}
                />
              )}
            </li>
          ))}
        </ol>
      </div>

      <h2 ref={subtitulo} tabIndex={-1} className="entrada-etapa-subtitulo">
        {SUBTITULOS[etapa]}
      </h2>

      {etapa === 0 && (
        <>
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
              className="entrada-etapa-selecao"
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
              <p className="entrada-etapa-nota">Sem selecionar, você atende todo o grupo.</p>
              <div className="entrada-etapa-chips">
                {opcoes.map((opcao, indice) => (
                  <label key={opcao} htmlFor={`negocio-especialidade-${indice}`} className={CAIXA}>
                    <Checkbox
                      id={`negocio-especialidade-${indice}`}
                      checked={especialidades.includes(opcao)}
                      onCheckedChange={(marcado) =>
                        setEspecialidades((anteriores) =>
                          marcado === true
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
        <RadioGroup
          className="entrada-etapa-cartoes"
          aria-label="Área de atendimento"
          value={onde}
          onValueChange={setOnde}
        >
          {AREAS.map(([valor, titulo, descricao]) => (
            <Fragment key={valor}>
              <label htmlFor={`negocio-area-${valor}`} className={CARTAO}>
                <RadioGroupItem
                  id={`negocio-area-${valor}`}
                  value={valor}
                  aria-labelledby={`negocio-area-${valor}-titulo`}
                  aria-describedby={`negocio-area-${valor}-descricao`}
                  className="mt-0.5"
                />
                <span className="flex flex-col gap-0.5">
                  <span id={`negocio-area-${valor}-titulo`} className="text-sm font-medium">
                    {titulo}
                  </span>
                  <span
                    id={`negocio-area-${valor}-descricao`}
                    className="text-xs text-(--muted-foreground)"
                  >
                    {descricao}
                  </span>
                </span>
              </label>
              {valor === "bairros" && onde === "bairros" && (
                <div className="entrada-etapa-cartao-campos">
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
                  <p className="entrada-etapa-nota">
                    Sugestões de demonstração; você também pode digitar outro bairro.
                  </p>
                  <div className="entrada-etapa-chips">
                    {bairros.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="entrada-etapa-chip entrada-etapa-chip-cheio"
                        aria-label={`Remover ${item}`}
                        onClick={() =>
                          setBairros((atuais) => atuais.filter((atual) => atual !== item))
                        }
                      >
                        {item}
                        <Icone nome="close" />
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="entrada-etapa-adicionar"
                    onClick={() => {
                      const novo = bairro.trim()
                      if (
                        novo &&
                        !bairros.some(
                          (item) => item.toLocaleLowerCase() === novo.toLocaleLowerCase(),
                        )
                      )
                        setBairros((atuais) => [...atuais, novo])
                      setBairro("")
                    }}
                  >
                    Adicionar bairro
                  </Button>
                </div>
              )}
            </Fragment>
          ))}
        </RadioGroup>
      )}

      {etapa === 2 && (
        <RadioGroup
          className="entrada-etapa-cartoes"
          aria-label="Forma de atendimento"
          value={atendimento}
          onValueChange={setAtendimento}
        >
          {FORMAS.map(([valor, titulo, descricao]) => (
            <Fragment key={valor}>
              <label htmlFor={`negocio-forma-${valor}`} className={CARTAO}>
                <RadioGroupItem
                  id={`negocio-forma-${valor}`}
                  value={valor}
                  aria-labelledby={`negocio-forma-${valor}-titulo`}
                  aria-describedby={`negocio-forma-${valor}-descricao`}
                  className="mt-0.5"
                />
                <span className="flex flex-col gap-0.5">
                  <span id={`negocio-forma-${valor}-titulo`} className="text-sm font-medium">
                    {titulo}
                  </span>
                  <span
                    id={`negocio-forma-${valor}-descricao`}
                    className="text-xs text-(--muted-foreground)"
                  >
                    {descricao}
                  </span>
                </span>
              </label>
              {valor === "fixo" && atendimento === "fixo" && (
                <div className="entrada-etapa-cartao-campos">
                  <fieldset className="grid gap-2">
                    <legend className="mb-2 text-sm font-medium">Dias de atendimento</legend>
                    <div className="entrada-etapa-dias">
                      {DIAS.map((dia, indice) => (
                        <label key={dia} htmlFor={`negocio-dia-${indice}`} className={CAIXA}>
                          <Checkbox
                            id={`negocio-dia-${indice}`}
                            checked={dias.includes(dia)}
                            onCheckedChange={(marcado) =>
                              setDias((anteriores) =>
                                marcado === true
                                  ? [...anteriores, dia]
                                  : anteriores.filter((d) => d !== dia),
                              )
                            }
                          />
                          {dia}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="entrada-etapa-horarios">
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
                </div>
              )}
            </Fragment>
          ))}
        </RadioGroup>
      )}

      {etapa === 3 && (
        <>
          <p className="entrada-etapa-nota">Tudo aqui é opcional e pode ser informado depois.</p>
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
            <p className="entrada-etapa-nota">
              A primeira foto será a capa. JPG, PNG, WebP ou AVIF; até 12 MB por imagem.
            </p>
            <input
              ref={campoDeFotos}
              id="negocio-fotos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              disabled={ocupado}
              className="sr-only"
              onChange={(e) => {
                void adicionarFotos(e.target.files)
                e.target.value = ""
              }}
            />
            {ocupado && <p role="status">Preparando fotos…</p>}
            <div className="entrada-etapa-fotos">
              {fotos.map((foto, i) => (
                <div key={foto.id} className="entrada-etapa-foto">
                  <span className="entrada-etapa-foto-quadro">
                    <img
                      src={foto.imagem}
                      alt={`Foto ${i + 1}${i === 0 ? ", capa" : ""}`}
                      className="entrada-etapa-foto-imagem"
                    />
                    {i === 0 && <span className="entrada-etapa-foto-capa">Capa</span>}
                  </span>
                  <span className="entrada-etapa-foto-acoes">
                    {i > 0 && (
                      <button
                        type="button"
                        className="entrada-etapa-link"
                        aria-label={`Tornar capa a foto ${i + 1}`}
                        onClick={() =>
                          setFotos((anteriores) =>
                            [
                              anteriores[i],
                              ...anteriores.filter((_, indice) => indice !== i),
                            ].filter((item): item is Foto => item !== undefined),
                          )
                        }
                      >
                        Tornar capa
                      </button>
                    )}
                    <button
                      type="button"
                      className="entrada-etapa-link"
                      aria-label={`Remover foto ${i + 1}`}
                      onClick={() =>
                        setFotos((anteriores) => anteriores.filter((_, indice) => indice !== i))
                      }
                    >
                      Remover
                    </button>
                  </span>
                </div>
              ))}
              {fotos.length < 6 && (
                <button
                  type="button"
                  className="entrada-etapa-foto-adicionar"
                  aria-label="Adicionar foto"
                  disabled={ocupado}
                  onClick={() => campoDeFotos.current?.click()}
                >
                  <Icone nome="add" />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {etapa === 4 && (
        <div className="entrada-etapa-revisao">
          {fotos[0] && (
            <img
              src={fotos[0].imagem}
              alt="Prévia da foto 1, capa"
              className="entrada-etapa-revisao-capa"
            />
          )}
          <ul className="entrada-etapa-revisao-linhas divide-y divide-(--border)">
            {(
              [
                ["Nome", nome, 0],
                ["Tipo de serviço", categoria, 0],
                [
                  "Especialidades",
                  especialidades.length
                    ? especialidades.join(", ")
                    : "Todas as especialidades do grupo",
                  0,
                ],
                [
                  "Área",
                  onde === "cidade"
                    ? `Atende em toda a cidade de ${cidade}`
                    : onde === "online"
                      ? "Atende on-line"
                      : onde === "bairros"
                        ? `Bairros: ${bairros.join(", ")}`
                        : "Área de atendimento a informar",
                  1,
                ],
                [
                  "Horário",
                  atendimento === "fixo"
                    ? `${dias.join(", ")} · ${abre} às ${fecha}`
                    : atendimento === "combinado"
                      ? "Atendimento com horário combinado"
                      : "Horário a informar",
                  2,
                ],
                ...(apresentacao ? [["Apresentação", apresentacao, 3] as const] : []),
                ...(beneficio ? [["Benefício", beneficio, 3] as const] : []),
                ...(whatsapp || instagram || site
                  ? [
                      [
                        "Contatos",
                        [`WhatsApp: ${whatsapp}`, `Instagram: ${instagram}`, `Site: ${site}`]
                          .filter((contato) => !contato.endsWith(": "))
                          .join(" · "),
                        3,
                      ] as const,
                    ]
                  : []),
                ["Fotos", fotos.length ? `${fotos.length} foto(s) adicionada(s)` : "Sem fotos", 3],
              ] as const
            ).map(([rotulo, valor, destino]) => (
              <li key={rotulo}>
                <span className="entrada-etapa-revisao-rotulo text-(--muted-foreground)">
                  {rotulo}
                </span>
                <span className="font-medium">{valor}</span>
                <button
                  type="button"
                  className="entrada-etapa-link"
                  aria-label={`Editar ${rotulo.toLocaleLowerCase("pt-BR")}`}
                  onClick={() => trocarEtapa(destino)}
                >
                  Editar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {erro && (
        <p role="alert" className="entrada-etapa-erro">
          {erro}
        </p>
      )}

      <div className="entrada-etapa-acoes">
        <Button
          type="button"
          variant="outline"
          className="entrada-etapa-acao"
          onClick={() => {
            setErro("")
            if (etapa === 0) aoCancelar()
            else trocarEtapa(etapa - 1)
          }}
        >
          Voltar
        </Button>
        {etapa < 4 ? (
          <Button
            key="continuar"
            type="button"
            className="entrada-etapa-acao"
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
              trocarEtapa(etapa + 1)
            }}
          >
            Continuar
          </Button>
        ) : (
          <Button key="salvar" type="submit" className="entrada-etapa-acao" disabled={ocupado}>
            Salvar rascunho
          </Button>
        )}
      </div>
    </form>
  )
}
