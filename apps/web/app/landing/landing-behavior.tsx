"use client"

// PORT-001 (R73): a ilha de comportamento da landing, transposta de
// landingMount() em prototypes/bivaque-html/src/features/entry/landing.js
// (R71 e R72). O texto e a marcação ficam no componente de servidor; aqui só
// ficam os observadores, a folha do menu, a barra fixa, o foco e a navegação.
//
// Diferença obrigatória em relação ao protótipo: a página do Next rola no
// documento (o protótipo rola em #main), então os observadores usam a viewport
// e a rolagem é lida de window.scrollY.
import { useEffect } from "react"

const ANCHORS = ["inicio", "exemplo", "recursos", "mudanca", "participar", "perguntas", "fim"]

export function LandingBehavior() {
  useEffect(() => {
    const landing = document.getElementById("landing")
    const top = document.getElementById("ld-top")
    const main = document.getElementById("ld-main")
    const bar = document.getElementById("ld-bar")
    const sheet = document.getElementById("ld-sheet")
    const heroCta = document.getElementById("ld-hero-cta")
    const heroMedia = landing?.querySelector<HTMLElement>(".ld-hero-media") ?? null
    const end = document.getElementById("fim")
    const thread = document.getElementById("ld-thread")
    const menuButton = landing?.querySelector<HTMLElement>("[data-ld-menu]") ?? null
    const pill = landing?.querySelector<HTMLElement>(".ld-pill") ?? null
    const footer = landing?.querySelector<HTMLElement>(".ld-footer") ?? null
    const skip = landing?.querySelector<HTMLElement>(".ld-skip") ?? null

    if (!landing || !top || !main || !bar || !sheet || !heroCta || !heroMedia || !end || !thread) {
      return
    }
    if (!menuButton) return

    const navLinks = Array.from(landing.querySelectorAll<HTMLAnchorElement>(".ld-nav a"))
    const sheetLinks = Array.from(landing.querySelectorAll<HTMLAnchorElement>(".ld-sheet nav a"))
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const mobile = window.matchMedia("(max-width:860px)")
    const observers: IntersectionObserver[] = []
    let heroGone = false
    let endIn = false
    let open = false
    let lastY = window.scrollY

    const watch = (
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ): IntersectionObserver => {
      const observer = new IntersectionObserver(callback, options)
      observers.push(observer)
      return observer
    }

    // Com a folha aberta, o resto da landing sai do alcance do teclado e da
    // tecnologia assistiva (inert). A barra fica na lista e é sincronizada
    // depois, porque ela tem estado próprio.
    const outside = [skip, top, main, footer, bar].filter(
      (node): node is HTMLElement => node !== null,
    )

    const sheetFocusables = () =>
      Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href],button,md-filled-button,[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.getClientRects().length > 0 && !node.hasAttribute("disabled"))

    const sync = () => {
      top.classList.toggle("ld-show-cta", heroGone)
      const barShown = heroGone && !endIn
      bar.classList.toggle("ld-show", barShown)
      // Com a folha aberta a barra continua isolada, mesmo que um observador a
      // mostre por baixo.
      const reachable = barShown && !open
      bar.inert = !reachable
      if (reachable) bar.removeAttribute("aria-hidden")
      else bar.setAttribute("aria-hidden", "true")
    }

    // O topo fica transparente sobre a foto e ganha o fundo da superfície
    // depois dela.
    watch(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        top.classList.toggle("ld-solid", !entry.isIntersecting)
      },
      { rootMargin: "-64px 0px 0px 0px" },
    ).observe(heroMedia)

    // O CTA do topo pode nascer abaixo da dobra (celular): o estado dele vem da
    // geometria a cada rolagem, não de uma transição do observador.
    const trackHero = () => {
      const gone = heroCta.getBoundingClientRect().bottom <= 1
      if (gone !== heroGone) {
        heroGone = gone
        sync()
      }
    }

    watch((entries) => {
      const entry = entries[0]
      if (!entry) return
      endIn = entry.isIntersecting
      sync()
    }).observe(end)

    const setActive = (id: string) => {
      let current: HTMLAnchorElement | null = null
      for (const link of navLinks) {
        if (link.getAttribute("href") === `#${id}`) {
          link.setAttribute("aria-current", "true")
          current = link
        } else link.removeAttribute("aria-current")
      }
      for (const link of sheetLinks) {
        if (link.getAttribute("href") === `#${id}`) link.setAttribute("aria-current", "true")
        else link.removeAttribute("aria-current")
      }
      if (!current || !pill) {
        if (pill) pill.style.opacity = "0"
        return
      }
      // A navegação do topo está escondida no celular.
      if (!current.offsetWidth) return
      pill.style.width = `${current.offsetWidth}px`
      pill.style.transform = `translateX(${current.offsetLeft}px)`
      pill.style.opacity = "1"
    }

    const spy = watch(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: "-45% 0px -50% 0px" },
    )
    for (const id of ANCHORS) {
      const section = document.getElementById(id)
      if (section) spy.observe(section)
    }

    const setMenu = (state: boolean, restore = true) => {
      open = state
      sheet.classList.toggle("ld-open", state)
      menuButton.setAttribute("aria-expanded", String(state))
      document.body.classList.toggle("ld-locked", state)
      // Fechada, a folha também sai da tecnologia assistiva: no fechamento ela
      // ainda desliza por 280 ms, e nesse intervalo nada dela é alcançável.
      sheet.inert = !state
      // O elemento focado era o botão que abriu a folha, e ele fica inerte. O
      // navegador devolve o foco ao body quando o que está focado entra numa
      // subárvore inerte, e isso pode chegar depois do foco da folha: soltar o
      // foco antes é o que mantém o teclado dentro dela.
      if (state && document.activeElement instanceof HTMLElement) document.activeElement.blur()
      for (const node of outside) node.inert = state
      // Fechar a folha devolve a barra ao próprio estado (inerte se escondida).
      sync()
      if (state) {
        const close = sheet.querySelector<HTMLElement>("[data-ld-close]")
        close?.focus({ preventScroll: true })
      } else if (restore) menuButton.focus({ preventScroll: true })
    }

    const goTo = (id: string) => {
      const target = document.getElementById(id)
      if (!target) return
      target.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" })
      if (id === "ld-main") target.focus({ preventScroll: true })
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest<HTMLElement>("[data-landing-anchor]")
      if (anchor) {
        event.preventDefault()
        if (open) setMenu(false)
        const id = anchor.dataset["landingAnchor"]
        if (id) goTo(id)
        return
      }
      if (target.closest("[data-ld-menu]")) {
        event.preventDefault()
        setMenu(true)
        return
      }
      if (target.closest("[data-ld-close]")) {
        event.preventDefault()
        setMenu(false)
        return
      }
      // Os CTAs do Material não passam por aqui: com `href`, o próprio `<a>`
      // do shadow root navega sem depender desta ilha.
    }

    // Tab e Shift+Tab dão a volta dentro da folha: o último item volta ao
    // primeiro, e vice-versa.
    const onKey = (event: KeyboardEvent) => {
      if (!open) return
      if (event.key === "Escape") {
        event.preventDefault()
        setMenu(false)
        return
      }
      if (event.key !== "Tab") return
      const items = sheetFocusables()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (!(active instanceof Node) || !sheet.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus({ preventScroll: true })
        return
      }
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    const onScroll = () => {
      const y = window.scrollY
      trackHero()
      if (!mobile.matches) top.classList.remove("ld-hide")
      else if (y > lastY + 6 && y > 200) top.classList.add("ld-hide")
      else if (y < lastY - 6 || y < 60) top.classList.remove("ld-hide")
      lastY = y
    }

    landing.addEventListener("click", onClick)
    document.addEventListener("keydown", onKey)
    window.addEventListener("scroll", onScroll, { passive: true })

    // A conversa se monta ao entrar na tela; com movimento reduzido ela já
    // nasce montada.
    if (!reduce) {
      thread.classList.add("ld-reveal")
      watch(
        (entries, observer) => {
          const entry = entries[0]
          if (entry?.isIntersecting) {
            thread.classList.add("ld-in")
            observer.disconnect()
          }
        },
        { threshold: 0.25 },
      ).observe(thread)
    }

    sheet.inert = true
    sync()
    trackHero()

    return () => {
      for (const observer of observers) observer.disconnect()
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("keydown", onKey)
      landing.removeEventListener("click", onClick)
      document.body.classList.remove("ld-locked")
      for (const node of outside) node.inert = false
      sheet.inert = false
    }
  }, [])

  return null
}
