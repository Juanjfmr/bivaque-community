import { describe, expect, it } from "vitest"
import {
  attachmentPublishBlocker,
  derivePostType,
  normalizeAttachment,
  type PostAttachment,
} from "../../../apps/web/lib/composer/post-attachment"

// Lógica PURA extraída do compositor (feed-post-create.tsx): o objeto que
// deriva o `post_type` do anexo real e monta as colunas extras, mais a trava do
// anexo ligado-e-vazio. Aqui ela é exercitada direto, sem navegador — é o único
// ponto desta frente em que a regra em si é medida em vez de afirmada por
// leitura de fonte.
//
// O caso que importa é o ÚLTIMO do commit 17cd7d0: anexo LIGADO e campo VAZIO.
// Quem liga "Foto", escolhe o arquivo e publica ENQUANTO o envio acontece — ou
// quem abre o seletor e não escolhe nada — viajaria como pergunta de TEXTO, com
// o `post_type` coerente e a pessoa perdendo, sem aviso, uma ação que tomou.
// Não aparece em tela vermelha nenhuma: é defeito de silêncio.

interface ComposerCase {
  name: string
  attachment: PostAttachment
  photoPath: string
  linkUrl: string
}

// Os quatro casos do compositor. A tabela é a ENTRADA das propriedades abaixo:
// um caso novo entra automaticamente em todas as invariantes, em vez de virar
// mais um `it` copiado.
const CASES: ComposerCase[] = [
  { name: "sem anexo", attachment: null, photoPath: "", linkUrl: "" },
  {
    name: "foto com caminho",
    attachment: "photo",
    photoPath: "post-photos/abc/foto.jpg",
    linkUrl: "",
  },
  {
    name: "link com url",
    attachment: "link",
    photoPath: "",
    linkUrl: "https://example.invalid/noticia",
  },
  { name: "foto ligada e vazia", attachment: "photo", photoPath: "", linkUrl: "" },
  { name: "link ligado e vazio", attachment: "link", photoPath: "", linkUrl: "" },
]

/** A linha que o insert gravaria: exatamente as colunas que as quatro CHECKs de
 *  `public.posts` olham. `poll_options` entra sempre nulo porque nenhum caminho
 *  o produz — não há editor de enquete no produto. */
function wouldInsert(c: ComposerCase) {
  const derived = derivePostType(c.attachment, c.photoPath, c.linkUrl)
  return {
    post_type: derived.postType,
    photo_path: derived.extras.photo_path ?? null,
    link_url: derived.extras.link_url ?? null,
    poll_options: null,
  }
}

function blockerOf(c: ComposerCase): string | null {
  return attachmentPublishBlocker(c.attachment, c.photoPath, c.linkUrl)
}

// A trava roda ANTES do insert, então só os casos sem trava chegam ao banco.
const PUBLISHABLE = CASES.filter((c) => blockerOf(c) === null)
const BLOCKED = CASES.filter((c) => blockerOf(c) !== null)

describe("derivePostType", () => {
  it("sem anexo publica pergunta de texto, sem coluna extra", () => {
    const derived = derivePostType(null, "", "")
    expect(derived.postType).toBe("text")
    expect(derived.extras).toEqual({})
  })

  it("foto com caminho publica photo e grava só photo_path", () => {
    const derived = derivePostType("photo", "post-photos/abc/foto.jpg", "")
    expect(derived.postType).toBe("photo")
    expect(derived.extras.photo_path).toBe("post-photos/abc/foto.jpg")
    expect(derived.extras.link_url).toBeUndefined()
  })

  it("link com url publica link e grava só link_url", () => {
    const derived = derivePostType("link", "", "https://example.invalid/noticia")
    expect(derived.postType).toBe("link")
    expect(derived.extras.link_url).toBe("https://example.invalid/noticia")
    expect(derived.extras.photo_path).toBeUndefined()
  })

  it("o caminho e a url publicados são os valores já sem espaço nas pontas", () => {
    // O `.trim()` é o mesmo do compositor original e é o que a CHECK vê: um
    // caminho só de espaços não pode virar `photo_path` não-nulo.
    expect(derivePostType("photo", "  foto.jpg  ", "").extras.photo_path).toBe("foto.jpg")
    expect(derivePostType("link", "", "  https://example.invalid  ").extras.link_url).toBe(
      "https://example.invalid",
    )
  })

  it("anexo ligado e vazio deriva text — e é por isso que a trava existe", () => {
    // A derivação sozinha é COERENTE e mesmo assim perde a ação da pessoa: ela
    // ligou "Foto", não anexou, e a publicação sairia como pergunta de texto,
    // sem aviso. Quem impede isso não é o `derivePostType`; é a trava abaixo,
    // que roda antes do insert.
    for (const attachment of ["photo", "link"] as const) {
      const derived = derivePostType(attachment, "", "")
      expect(derived.postType, attachment).toBe("text")
      expect(derived.extras, attachment).toEqual({})
    }
  })

  it("espaço em branco conta como vazio, não como anexo", () => {
    expect(derivePostType("photo", "   ", "").postType).toBe("text")
    expect(derivePostType("link", "", "\n\t ").postType).toBe("text")
  })
})

describe("normalizeAttachment", () => {
  it("aceita só os dois anexos reais como dica de entrada", () => {
    expect(normalizeAttachment("photo")).toBe("photo")
    expect(normalizeAttachment("link")).toBe("link")
  })

  it("qualquer outra dica — inclusive a de formato que saiu do produto — é nenhum anexo", () => {
    // `initialAttachment` é dica da tela de entrada, nunca escolha de formato.
    // "text" e "poll" chegaram a ser valores do seletor que morreu: os dois
    // entram aqui como "nenhum anexo", e nenhum deles cria estado.
    for (const hint of ["text", "poll", "", undefined, "PHOTO", " foto "]) {
      expect(normalizeAttachment(hint), String(hint)).toBeNull()
    }
  })
})

describe("attachmentPublishBlocker: o anexo ligado e vazio não publica", () => {
  it("foto ligada e vazia para com a frase que diz o que fazer", () => {
    expect(blockerOf({ name: "", attachment: "photo", photoPath: "", linkUrl: "" })).toBe(
      "Anexe a foto ou desligue o anexo de foto para publicar.",
    )
  })

  it("link ligado e vazio para com a frase que diz o que fazer", () => {
    expect(blockerOf({ name: "", attachment: "link", photoPath: "", linkUrl: "" })).toBe(
      "Informe o endereço do link ou desligue o anexo de link para publicar.",
    )
  })

  it("a frase nomeia o anexo da vez — a de foto não serve para o link", () => {
    const foto = blockerOf({ name: "", attachment: "photo", photoPath: "", linkUrl: "" })
    const link = blockerOf({ name: "", attachment: "link", photoPath: "", linkUrl: "" })
    expect(foto).not.toBe(link)
    expect(foto).toContain("foto")
    expect(link).toContain("link")
  })

  it("anexo desligado publica", () => {
    // Desligar é a outra metade do caminho: a pessoa foi avisada do que fazer e
    // escolheu não anexar. Nenhum dos dois campos vazios trava esse caso.
    expect(blockerOf({ name: "", attachment: null, photoPath: "", linkUrl: "" })).toBeNull()
  })

  it("anexo ligado e preenchido publica", () => {
    expect(
      blockerOf({ name: "", attachment: "photo", photoPath: "foto.jpg", linkUrl: "" }),
    ).toBeNull()
    expect(
      blockerOf({ name: "", attachment: "link", photoPath: "", linkUrl: "https://x.invalid" }),
    ).toBeNull()
  })

  it("o campo do OUTRO anexo não destrava a vez — só o anexo escolhido conta", () => {
    // O compositor limpa o outro campo ao trocar de anexo, mas a trava não pode
    // depender disso: com "Foto" ligado, uma URL preenchida não é uma foto.
    expect(
      blockerOf({ name: "", attachment: "photo", photoPath: "", linkUrl: "https://x.invalid" }),
    ).not.toBeNull()
    expect(
      blockerOf({ name: "", attachment: "link", photoPath: "foto.jpg", linkUrl: "" }),
    ).not.toBeNull()
  })

  it("espaço em branco não é anexo escolhido", () => {
    expect(
      blockerOf({ name: "", attachment: "photo", photoPath: "  ", linkUrl: "" }),
    ).not.toBeNull()
    expect(blockerOf({ name: "", attachment: "link", photoPath: "", linkUrl: " " })).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// A propriedade de coerência que os quatro CHECKs de `public.posts` exigem
// (supabase/migrations/20260802000900_community_feed.sql:33-47), afirmada sobre
// TODOS os casos que publicam — não copiada caso a caso.
//
// O DDL escreve as quatro como IMPLICAÇÃO. A recíproca de cada uma é mais
// forte que a CHECK e é exatamente o que a fonte única acrescenta: como o tipo
// e a coluna saem do mesmo objeto, não existe caminho que produza
// `post_type='photo'` sem `photo_path`. As duas metades ficam afirmadas para
// que uma futura separação da derivação (o defeito que este módulo existe para
// impedir) quebre aqui.
// ─────────────────────────────────────────────────────────────────────────────
describe("coerência entre post_type e as colunas extras (as quatro CHECKs)", () => {
  it("os casos publicáveis cobrem os três tipos — a propriedade não passa por vacuidade", () => {
    const tipos = new Set(PUBLISHABLE.map((c) => wouldInsert(c).post_type))
    expect(tipos).toEqual(new Set(["text", "photo", "link"]))
    expect(PUBLISHABLE.length).toBeGreaterThanOrEqual(3)
    expect(BLOCKED.length).toBeGreaterThanOrEqual(2)
  })

  it("post_photo_requires_photo_type: photo_path não-nulo ⟺ post_type='photo'", () => {
    for (const c of PUBLISHABLE) {
      const row = wouldInsert(c)
      expect(row.photo_path === null || row.post_type === "photo", c.name).toBe(true)
      expect(row.post_type !== "photo" || row.photo_path !== null, c.name).toBe(true)
    }
  })

  it("post_link_requires_link_type: link_url não-nulo ⟺ post_type='link'", () => {
    for (const c of PUBLISHABLE) {
      const row = wouldInsert(c)
      expect(row.link_url === null || row.post_type === "link", c.name).toBe(true)
      expect(row.post_type !== "link" || row.link_url !== null, c.name).toBe(true)
    }
  })

  it("post_link_type_requires_url: post_type='link' exige link_url", () => {
    for (const c of PUBLISHABLE) {
      const row = wouldInsert(c)
      expect(row.post_type !== "link" || row.link_url !== null, c.name).toBe(true)
    }
  })

  it("post_poll_requires_poll_type: poll_options é SEMPRE nulo", () => {
    for (const c of CASES) {
      expect(wouldInsert(c).poll_options, c.name).toBeNull()
    }
  })

  it("nenhum caso publicável carrega as duas colunas de anexo ao mesmo tempo", () => {
    // `photo_path` e `link_url` não coexistem: são dois anexos, e o compositor
    // só representa um. Um caso com os dois violaria a intenção das CHECKs sem
    // violar nenhuma delas isoladamente.
    for (const c of PUBLISHABLE) {
      const row = wouldInsert(c)
      expect(row.photo_path !== null && row.link_url !== null, c.name).toBe(false)
    }
  })

  it("o anexo escolhido e o anexo publicado são o mesmo em todo caso publicável", () => {
    // A propriedade do commit 17cd7d0, e a que quebra se alguém reabrir o
    // buraco: com a trava removida, "foto ligada e vazia" passaria a publicar
    // como `text` e esta linha ficaria vermelha.
    for (const c of PUBLISHABLE) {
      expect(c.attachment === null || wouldInsert(c).post_type === c.attachment, c.name).toBe(true)
    }
  })

  it("o estado ligado-e-vazio nunca é publicável", () => {
    for (const attachment of ["photo", "link"] as const) {
      const vazio = { name: attachment, attachment, photoPath: "", linkUrl: "" }
      expect(blockerOf(vazio), attachment).not.toBeNull()
      expect(PUBLISHABLE.includes(vazio), attachment).toBe(false)
    }
  })
})
