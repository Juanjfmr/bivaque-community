import { describe, expect, it } from "vitest"
import {
  DISPLAY_NAME_MAX_LENGTH,
  isLocalityCodeFormat,
  validateProvisionInput,
} from "web/lib/onboarding/provision-validation"

// P0 Task 5 (Step 5) e PORT-005: unitário sobre a rota do passo
// pós-elegibilidade, agora com o momento da entrada (chegando, moro aqui,
// saindo), as datas e o destino. "Hoje" é injetado: só a regra de passado
// depende do relógio.

const TODAY = new Date("2026-10-22T12:00:00Z")
const PAST = "2026-10-20"
const FUTURE = "2026-11-04"
const LATER = "2026-11-20"

const MANAUS = "1302603"
const BRASILIA = "5300108"

describe("validateProvisionInput (P0 Task 5)", () => {
  it("aceita cidade, nome e momento válidos", () => {
    const result = validateProvisionInput(
      { displayName: "Ana Verificada", ibgeCode: MANAUS, moment: "resident" },
      TODAY,
    )
    expect(result.ok).toBe(true)
    expect(result.ibgeCode).toBe(MANAUS)
    expect(result.displayName).toBe("Ana Verificada")
    expect(result.moment).toBe("resident")
    expect(result.arrivalDate).toBeNull()
    expect(result.departureDate).toBeNull()
  })

  it("rejeita localidade ausente", () => {
    const result = validateProvisionInput({ displayName: "Ana" }, TODAY)
    expect(result).toEqual({ ok: false, error: "locality is required" })
  })

  it("rejeita código de localidade com formato errado", () => {
    expect(isLocalityCodeFormat("12345")).toBe(false)
    const result = validateProvisionInput(
      { displayName: "Ana", ibgeCode: "12345", moment: "resident" },
      TODAY,
    )
    expect(result).toEqual({ ok: false, error: "locality is required" })
  })

  it("aceita código bem formado antes de conferir a existência", () => {
    // Formato certo mas ausente do catálogo é 400 na ROTA (checagem de
    // existência contra a tabela); a validação pura só separa o formato.
    expect(isLocalityCodeFormat("9999999")).toBe(true)
    const result = validateProvisionInput(
      { displayName: "Ana", ibgeCode: "9999999", moment: "resident" },
      TODAY,
    )
    expect(result.ok).toBe(true)
  })

  it("rejeita nome ausente, curto ou maior que o campo", () => {
    expect(validateProvisionInput({ ibgeCode: MANAUS, moment: "resident" }, TODAY)).toEqual({
      ok: false,
      error: "display_name is required",
    })
    expect(
      validateProvisionInput({ displayName: " A ", ibgeCode: MANAUS, moment: "resident" }, TODAY),
    ).toEqual({ ok: false, error: "display_name is required" })
    expect(
      validateProvisionInput(
        {
          displayName: "a".repeat(DISPLAY_NAME_MAX_LENGTH + 1),
          ibgeCode: MANAUS,
          moment: "resident",
        },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "display_name is too long" })
  })

  it("limpa o nome como o protótipo: espaços das pontas e internos", () => {
    const result = validateProvisionInput(
      { displayName: "  Ana   Maria ", ibgeCode: MANAUS, moment: "resident" },
      TODAY,
    )
    expect(result.displayName).toBe("Ana Maria")
  })
})

describe("momento: chegando", () => {
  it("exige a data de chegada e a devolve", () => {
    expect(
      validateProvisionInput({ displayName: "Ana", ibgeCode: MANAUS, moment: "arriving" }, TODAY),
    ).toEqual({ ok: false, error: "arrival_date is required" })

    const result = validateProvisionInput(
      { arrivalDate: FUTURE, displayName: "Ana", ibgeCode: MANAUS, moment: "arriving" },
      TODAY,
    )
    expect(result.ok).toBe(true)
    expect(result.arrivalDate).toBe(FUTURE)
    expect(result.departureDate).toBeNull()
  })

  it("aceita a data de hoje: o campo do protótipo nasce com min = hoje", () => {
    const result = validateProvisionInput(
      { arrivalDate: "2026-10-22", displayName: "Ana", ibgeCode: MANAUS, moment: "arriving" },
      TODAY,
    )
    expect(result.ok).toBe(true)
  })

  it("o 'hoje' da tela é aceito mesmo quando o dia UTC já virou (22h em Manaus)", () => {
    // 22/10 22h em Manaus (UTC-4) é 23/10 02:00Z. A tela usa o dia LOCAL e
    // oferece 22/10; o servidor compara com o dia UTC (23) e recusava a data que
    // a própria tela tinha oferecido. A folga de um dia fecha os dois lados.
    const lateInManaus = new Date("2026-10-23T02:00:00Z")

    const today = validateProvisionInput(
      { arrivalDate: "2026-10-22", displayName: "Ana", ibgeCode: MANAUS, moment: "arriving" },
      lateInManaus,
    )
    expect(today.ok).toBe(true)
    expect(today.arrivalDate).toBe("2026-10-22")

    const departure = validateProvisionInput(
      {
        departureDate: "2026-10-22",
        destinationIbgeCode: BRASILIA,
        displayName: "Ana",
        ibgeCode: MANAUS,
        moment: "leaving",
      },
      lateInManaus,
    )
    expect(departure.ok).toBe(true)

    // Antes de ontem, para o dia UTC, continua sendo passado — a folga é de um
    // dia, não de um fuso escolhido a esmo.
    expect(
      validateProvisionInput(
        { arrivalDate: "2026-10-21", displayName: "Ana", ibgeCode: MANAUS, moment: "arriving" },
        lateInManaus,
      ),
    ).toEqual({ ok: false, error: "date is in the past" })
  })

  it("recusa data no passado e data impossível", () => {
    expect(
      validateProvisionInput(
        { arrivalDate: PAST, displayName: "Ana", ibgeCode: MANAUS, moment: "arriving" },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "date is in the past" })
    expect(
      validateProvisionInput(
        { arrivalDate: "2026-02-31", displayName: "Ana", ibgeCode: MANAUS, moment: "arriving" },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "date is invalid" })
    expect(
      validateProvisionInput(
        { arrivalDate: "04/11/2026", displayName: "Ana", ibgeCode: MANAUS, moment: "arriving" },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "date is invalid" })
  })

  it("não aceita data de saída nem destino", () => {
    expect(
      validateProvisionInput(
        {
          arrivalDate: FUTURE,
          departureDate: LATER,
          displayName: "Ana",
          ibgeCode: MANAUS,
          moment: "arriving",
        },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "departure_date is not allowed" })
    expect(
      validateProvisionInput(
        {
          arrivalDate: FUTURE,
          destinationIbgeCode: BRASILIA,
          displayName: "Ana",
          ibgeCode: MANAUS,
          moment: "arriving",
        },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "destination is not allowed" })
  })
})

describe("momento: moro aqui", () => {
  it("não aceita data nem destino", () => {
    expect(
      validateProvisionInput(
        { arrivalDate: FUTURE, displayName: "Ana", ibgeCode: MANAUS, moment: "resident" },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "arrival_date is not allowed" })
    expect(
      validateProvisionInput(
        { departureDate: LATER, displayName: "Ana", ibgeCode: MANAUS, moment: "resident" },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "departure_date is not allowed" })
    expect(
      validateProvisionInput(
        { destinationIbgeCode: BRASILIA, displayName: "Ana", ibgeCode: MANAUS, moment: "resident" },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "destination is not allowed" })
  })
})

describe("momento: saindo", () => {
  it("aceita data de saída e destino de outra cidade", () => {
    const result = validateProvisionInput(
      {
        departureDate: LATER,
        destinationIbgeCode: BRASILIA,
        displayName: "Ana",
        ibgeCode: MANAUS,
        moment: "leaving",
      },
      TODAY,
    )
    expect(result.ok).toBe(true)
    expect(result.moment).toBe("leaving")
    expect(result.arrivalDate).toBeNull()
    expect(result.departureDate).toBe(LATER)
    expect(result.destinationIbgeCode).toBe(BRASILIA)
  })

  it("exige a data de saída", () => {
    expect(
      validateProvisionInput(
        { destinationIbgeCode: BRASILIA, displayName: "Ana", ibgeCode: MANAUS, moment: "leaving" },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "departure_date is required" })
  })

  it("recusa data no passado", () => {
    expect(
      validateProvisionInput(
        {
          departureDate: PAST,
          destinationIbgeCode: BRASILIA,
          displayName: "Ana",
          ibgeCode: MANAUS,
          moment: "leaving",
        },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "date is in the past" })
  })

  it("exige destino do catálogo e diferente da cidade atual", () => {
    expect(
      validateProvisionInput(
        { departureDate: LATER, displayName: "Ana", ibgeCode: MANAUS, moment: "leaving" },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "destination is required" })
    expect(
      validateProvisionInput(
        {
          departureDate: LATER,
          destinationIbgeCode: "123",
          displayName: "Ana",
          ibgeCode: MANAUS,
          moment: "leaving",
        },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "destination is required" })
    expect(
      validateProvisionInput(
        {
          departureDate: LATER,
          destinationIbgeCode: MANAUS,
          displayName: "Ana",
          ibgeCode: MANAUS,
          moment: "leaving",
        },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "destination must differ from the current city" })
  })

  it("não aceita data de chegada", () => {
    expect(
      validateProvisionInput(
        {
          arrivalDate: FUTURE,
          departureDate: LATER,
          destinationIbgeCode: BRASILIA,
          displayName: "Ana",
          ibgeCode: MANAUS,
          moment: "leaving",
        },
        TODAY,
      ),
    ).toEqual({ ok: false, error: "arrival_date is not allowed" })
  })
})

describe("momento obrigatório", () => {
  it("exige um dos três momentos", () => {
    expect(validateProvisionInput({ displayName: "Ana", ibgeCode: MANAUS }, TODAY)).toEqual({
      ok: false,
      error: "moment is required",
    })
    expect(
      validateProvisionInput({ displayName: "Ana", ibgeCode: MANAUS, moment: "chegando" }, TODAY),
    ).toEqual({ ok: false, error: "moment is required" })
  })
})
