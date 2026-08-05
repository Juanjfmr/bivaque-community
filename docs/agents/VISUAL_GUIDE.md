# VISUAL_GUIDE — Bivaque Community

> Guia visual por tela, derivado de `DESIGN_SPEC.md` (texto), `nextdoor-refs/ANALYSIS.md`
> (referências) e do julgamento visual real das capturas de `.visual/`. É a especificação
> ANTES da implementação (itens 5-12 do backlog) e o rubrica da auditoria visual pós-implementação.
> Em caso de conflito com `AGENTS.md`, o contrato do repo vence.

---

## 0. Linguagem visual (regras globais)

### Superfícies e ritmo
- Fundo da tela: `var(--background)` (`#F8FAFC` slate-50) — página inteira.
- Cards: `var(--surface)` / `var(--surface-raised)` brancos sobre o fundo slate-50. Inset areas (composer, empty states): `var(--surface-sunken)`.
- Raio: 12px (`rounded-xl`) para cards de conteúdo; 16px (`rounded-2xl`) para empty states e modais; pill (`rounded-full`) para CTAs e bottom-nav items.
- Padding interno do card: 16px (`p-4`). Padding lateral da página: 16px (`px-4`).
- **Gap entre cards: 12-16px (`gap-3`/`space-y-3`).** Nunca >24px entre cards de lista — o feed deve ler como LISTA coesa, não objetos flutuando (finding #7 do julgamento visual).
- Separação entre seções: 24px (`mt-6`).
- Divisores: `var(--border)` hairline.

### Paleta (Navy Professional)
- **Accent primário** (`--accent`): `#1E3A8A` (blue-900) — CTAs principais (Publicar, Criar evento, Criar grupo, Verificar elegibilidade), links, focus ring, item ativo da nav. Texto sobre accent: `--accent-foreground` `#FFFFFF`.
- **Accent secundário** (`brandTokens.secondaryAccent`): `#3B82F6` (blue-500) — CTAs secundárias ("Entrar", "Interested?", links de navegação mais leves).
- **Accent-soft** (`--accent-soft`): 12% blue-900 — fundo do item ativo na sidebar/bottom nav (`bg-[var(--accent-soft)]`).
- **Foreground** (`--foreground`): `#020617` (slate-950) — texto principal.
- **Muted** (`--muted`): `#475569` (slate-600) — meta, timestamps, subtexto.
- **Danger** (`--danger`): `#DC2626` — report/destrutivo.
- **Success / Warning / Danger-soft**: ver tokens.
- Contraste: tudo deve atingir ≥4.5:1 (texto normal) ou ≥3:1 (≥24px/≥18.66px bold).

### Tipografia
- Sans-serif system stack (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`) — declarado no body em globals.css. Sem fetch externo de fonte.
- h1 de seção: `var(--text-xl)` (20px) semibold, tracking-tight. h2: `var(--text-lg)` (18px). Corpo: `var(--text-base)` (16px). Meta/secundário: `var(--text-sm)` (14px) `var(--muted)`.
- Nada abaixo de `var(--text-xs)` (12px). line-height body 1.5+, headings 1.2 com letter-spacing -0.011em.
- **Um h1 por tela; o h1 é o TÍTULO DA SEÇÃO** ("Minha comunidade", "Grupos", "Eventos"…), nunca "Bivaque" dentro de rotas autenticadas (finding #4).

### Copy e acentos
- **Acentos corretos em toda copy nova e nos headers refeitos** ("Notificações", "Indicações", "Você está em dia"). Unificar no polish de cada tela tocada.

### CTAs e ações
- Primário: pill sólido `var(--accent)` (blue-900) texto branco — criar/publicar/verificar.
- Secundário: pill `brandTokens.secondaryAccent` (blue-500) ou `var(--surface-subtle)`.
- Destrutivo/report: dentro de overflow menu (⋯), nunca inline em card (finding #6).
- Toda ação ≥44px (`min-h-11 min-w-11`).

### Navegação
- **Desktop ≥1024px**: sidebar esquerda 224px (`w-56`), itens: Minha comunidade, Grupos, Eventos, **Indicações**, Perfil (5 itens — Indicações ganha entrada no desktop para descobribilidade; finding de descobribilidade). Item ativo: `var(--accent-soft)` bg + ícone preenchido + texto `var(--accent)`. Bottom nav oculto.
- **Mobile/tablet <1024px**: bottom nav fixa com 4 itens (Minha comunidade, Grupos, Eventos, Perfil — spec). Indicações via ícone no header. Item ativo: ícone preenchido + label `var(--accent)`. Sidebar oculta.
- **Pré-auth (/login, /consent, /onboarding): SEM bottom nav e SEM sidebar** (finding #3). AppShell condicional por sessão, ou rotas pré-auth fora do shell.
- Header: brand à esquerda (não centralizado), à direita: ícone Indicações + avatar do usuário (dropdown com Perfil/Sair) — "real header actions" (finding #9).

### Estados (todas as telas de lista)
- Loading: 3 skeletons de card (`FeedCardSkeleton` ou variante).
- Empty: `EmptyState` com ícone + título + descrição + CTA quando aplicável. Nunca caixa tracejada vazia sem CTA.
- Error: `ErrorState` com retry; **nunca** vazar string crua do Supabase/Postgres.
- End-of-feed: divisor + "Você está em dia" centralizado muted.

---

## 1. `/community` (item 5) — wireframes

### Mobile 375 / Tablet 768
```
┌──────────────────────────────┐
│ Bivaque            ✦  (avatar)│  header sticky
├──────────────────────────────┤
│ Manaus, AM · N membros       │  locality header sticky top-12
│ [avatar] No que você está…   │  composer entry (abre modal)
│          📷 Foto  🔗 Link  📊 │  shortcuts
│ Recentes | Relevantes        │  sort segmented
├──────────────────────────────┤
│ ┌ card post ───────────────┐ │
│ │ av Nome · Manaus · 2h  ⋯ │ │
│ │ corpo (clamp 4 + Ver mais)│ │
│ │ [media/link/poll]        │ │
│ │ ♥ 3   💬 2   ⤴ Compartilhar│ │
│ │ ─ 2 comentários preview ─│ │
│ │ [responder inline]       │ │
│ └──────────────────────────┘ │
│ ┌ card post ┐  (gap 12-16)   │
│ └──────────────────────────┘ │
│ ──── Você está em dia ────    │
├──────────────────────────────┤
│ 🏠    👥    📅    👤          │  bottom nav
└──────────────────────────────┘
```

### Desktop 1440
```
┌───────────────────────────────────┬───────────────┐
│ sidebar│ locality + composer + sort│  RIGHT RAIL   │
│ (w-56) │  feed (max-w-2xl)         │  w-72, lg:block│
│        │                           │ ┌ Próximos    │
│ Minha  │  cards…                   │ │ eventos (3) │
│ Grupos │                           │ ├ Grupos      │
│ Eventos│                           │ │ ativos (3)  │
│ Indica-│                           │ ├ Boas        │
│ ções   │                           │ │ práticas    │
│ Perfil │                           │ └─────────────┘
└────────┴───────────────────────────┴───────────────┘
```
- Right rail preenche o vazio à direita (finding HIGH #1). Cards do rail: título seção 13px semibold muted + itens compactos (título 14px + meta 13px).

---

## 2. `/groups` (item 8)

- Tabs "Meus grupos / Descobrir" (segmented). Busca pill no topo ("Buscar grupos").
- Lista de linhas (não cards soltos): thumbnail 48px rounded-lg + nome semibold + "N membros" muted + CTA à direita ("Entrar" / "Solicitar entrada" com estado pendente persistente / "Membro" disabled).
- Privado: cadeado ao lado do nome.
- Detalhe (futura): header com cover colapsando, tabs Publicações/Membros/Sobre.

## 3. `/events` (item 7)

- Agrupado por data com header de data sticky ("Hoje", "Sáb, 9 ago").
- Card: bloco de data quadrado 48px (dia grande + mês 11px) à esquerda + título semibold + linha de local/hora muted + avatares empilhados (3) + contagem.
- RSVP segmented à direita/dentro: Vou / Talvez / Não vou — update otimista, ativo com `var(--accent-soft)`.
- Local privado: renderizado só para confirmados (server-side; UI não faz fetch-then-hide).

## 4. `/recommendations` (item 9)

- Chip row horizontal scroll-snap de categorias + busca com debounce.
- Cards: ícone de categoria + nome do negócio semibold + "indicado por X" muted + blurb (clamp 2) + "N acharam útil".
- Empty "nenhum resultado" mantém a query visível.
- **Entrada no sidebar desktop** (ver §0 Navegação).

## 5. `/messages` (item 9)

- ≥1024px: duas colunas (lista 320px + thread flex-1). Mobile: lista → thread com slide back.
- Lista: avatar + nome + preview truncado + hora + dot de não-lida `var(--accent)`.
- Thread: separadores de data; bolhas agrupadas; próprias à direita com `var(--accent-soft)`; enviar habilita só com texto; tick pendente no envio otimista.
- Sem contexto de DM: empty state explicativo (regra contextual), nunca erro de permissão cru.

## 6. `/notifications` (item 10)

- Grupos "Hoje / Esta semana / Anteriores" com headers muted 13px.
- Não-lida: bg `var(--accent-soft)` que esmaece (`duration-slow`) ao ler.
- Header: "Marcar todas como lidas".

## 7. `/profile` (item 6)

- Header: avatar 64px + nome + "Manaus, AM" + "membro desde <mês ano>". **Sem badge de verificação, patente, OM ou endereço.**
- Tabs: Publicações / Eventos / Configurações.
- Configurações: preferências de notificação, visibilidade do perfil, convites de família, sair.

## 8. `/login` + `/onboarding` (item 11)

- Fora do shell (sem nav). Card centralizado max-w-sm sobre `var(--surface-sunken)`.
- Login: brand + Google + divisor "ou" + email + link mágico.
- Onboarding: máscara CPF `000.000.000-00`, CTA verde, waitlist secondary, nota de privacidade. CPF nunca ecoado de volta.

---

## 9. Rubrica da auditoria visual (pós-implementação)

Para cada tela tocada, verificar nas capturas 375/768/1440:
1. Hierarquia: ação primária visível em <1s.
2. Ritmo: gaps 12-16px entre cards; padding 16px; sem deriva arbitrária.
3. Estados: loading/empty/error/end-of-feed presentes e estilizados (não caixas cruas).
4. Nav: sidebar ativa correta no desktop; bottom nav ativa no mobile; pré-auth sem nav.
5. Densidade: lista coesa, não parede nem objetos flutuando.
6. Responsivo: 375 não é 1440 espremido; 1440 usa right rail/sidebar (sem margem morta).
7. A11y: targets 44px, um h1, foco visível, sem overflow horizontal.
8. Copy: acentos corretos; erros amigáveis; nada de patente/OM/endereço/badge.
