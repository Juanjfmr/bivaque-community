# RULE_LEDGER — incumbent normative extraction

> **Status: PHASE 2 FROZEN.**
>
> `docs/agents/DESIGN_SPEC.md` and `docs/agents/VISUAL_GUIDE.md` were both traversed in full before this freeze. Phase 1 reference files and confrontation artifacts were not opened.

## Scope / protocol

Read first: `AGENTS.md`, `README.md`, and this ledger protocol under `docs/agents/design-audit/`. Then read in full only the two incumbent sources above.

No rule below was repaired, reconciled, softened, deleted for being unimplemented, or compared with the independent reference. Duplicate and contradictory incumbent rules remain separate.

Record syntax:

`ID :: source :: T/F :: abs=Y|N fp=Y|N s=0..5 :: statement || rat=<explicit rationale or —> || int=<internal support or —> || conflict=<incumbent conflict or —> || note=<optional note or —>`

Types: `PI` product-invariant; `DD` design-decision; `IG` implementation-guidance; `OS` objective-standard.

Force: `A` absolute (always/never/must/exactly/only/every/cannot or equivalent/implied fixed universal requirement); `R` unqualified required prescription; `O` explicitly optional; `G` guidance.

`fp=Y` flags exact/fixed numerical or geometric precision not proportionally justified in its own source. This is only a scrutiny flag. `s` is current incumbent support, assigned without reference comparison under the protocol’s 0–5 scale. `int` uses only these two incumbent documents or cross-references explicitly named by them; named cross-references were not opened for validation.

## Ledger

CUR-001 :: DS — preâmbulo :: DD/R :: abs=N fp=N s=2 :: Bivaque usa o Nextdoor como produto de referência para arquitetura de interação. || rat=Referência declarada para densidade, anatomia, composição, localidade e descoberta. || int=— || conflict=— || note=—
CUR-002 :: DS — preâmbulo :: DD/R :: abs=N fp=N s=2 :: Copiar do Nextdoor a densidade do feed. || rat=Parte da arquitetura de interação declarada como referência. || int=— || conflict=— || note=—
CUR-003 :: DS — preâmbulo :: DD/R :: abs=N fp=N s=2 :: Copiar do Nextdoor a anatomia dos cards. || rat=Parte da arquitetura de interação declarada como referência. || int=— || conflict=— || note=—
CUR-004 :: DS — preâmbulo :: DD/R :: abs=N fp=N s=2 :: Copiar do Nextdoor os pontos de entrada de composição. || rat=Parte da arquitetura de interação declarada como referência. || int=— || conflict=— || note=—
CUR-005 :: DS — preâmbulo :: DD/R :: abs=N fp=N s=2 :: Copiar do Nextdoor o enquadramento de localidade. || rat=Parte da arquitetura de interação declarada como referência. || int=— || conflict=— || note=—
CUR-006 :: DS — preâmbulo :: DD/R :: abs=N fp=N s=2 :: Copiar do Nextdoor os chips de descoberta. || rat=Parte da arquitetura de interação declarada como referência. || int=— || conflict=— || note=—
CUR-007 :: DS — preâmbulo :: DD/A :: abs=Y fp=N s=3 :: Nunca copiar do Nextdoor cores. || rat=A marca do Nextdoor não deve ser copiada; apenas a arquitetura de interação. || int=— || conflict=— || note=—
CUR-008 :: DS — preâmbulo :: DD/A :: abs=Y fp=N s=3 :: Nunca copiar do Nextdoor logo. || rat=A marca do Nextdoor não deve ser copiada; apenas a arquitetura de interação. || int=— || conflict=— || note=—
CUR-009 :: DS — preâmbulo :: DD/A :: abs=Y fp=N s=3 :: Nunca copiar do Nextdoor ilustrações. || rat=A marca do Nextdoor não deve ser copiada; apenas a arquitetura de interação. || int=— || conflict=— || note=—
CUR-010 :: DS — preâmbulo :: DD/A :: abs=Y fp=N s=3 :: Nunca copiar do Nextdoor copy. || rat=A marca do Nextdoor não deve ser copiada; apenas a arquitetura de interação. || int=— || conflict=— || note=—
CUR-011 :: DS — preâmbulo :: DD/A :: abs=Y fp=N s=3 :: Nunca copiar do Nextdoor arquivos de assets. || rat=A marca do Nextdoor não deve ser copiada; apenas a arquitetura de interação. || int=— || conflict=— || note=—
CUR-012 :: DS — preâmbulo :: PI/A :: abs=Y fp=N s=5 :: Bivaque é uma rede privada. || rat=Identidade do produto declarada no preâmbulo. || int=— || conflict=— || note=—
CUR-013 :: DS — preâmbulo :: PI/A :: abs=Y fp=N s=5 :: O acesso à rede Bivaque é condicionado a verificação. || rat=Identidade do produto declarada como verification-gated. || int=— || conflict=— || note=—
CUR-014 :: DS — preâmbulo :: PI/R :: abs=N fp=N s=5 :: A rede é destinada a militares federais verificados, Veteranos e pensionistas em Manaus. || rat=Público e localidade declarados como definição do produto. || int=— || conflict=— || note=—
CUR-015 :: DS — preâmbulo :: DD/R :: abs=Y fp=N s=3 :: O tom visual/verbal deve ser sóbrio e institucional, não consumer-playful. || rat=Associado à autoridade e confiança de uma comunidade federal-militar verificada. || int=Repetido em DESIGN_SPEC §1 Color. || conflict=— || note=—
CUR-016 :: DS §1 — Token system :: IG/A :: abs=Y fp=N s=3 :: Tudo que é visual deve ler de tokens. || rat=Consistência e auditabilidade visual; raw colors são tratados como defeito. || int=Reforçado em DESIGN_SPEC §1 Color e VISUAL_GUIDE §0. || conflict=— || note=—
CUR-017 :: DS §1 — Token system :: IG/A :: abs=Y fp=N s=4 :: Hex bruto ou rgb() dentro de componente é defeito e deve ser sinalizado como hardcoded-color. || rat=Garantir consumo do sistema de tokens. || int=Reforçado por 'Components must read tokens ... never raw colors'. || conflict=— || note=—
CUR-018 :: DS §1 — Color :: DD/R :: abs=N fp=N s=3 :: A paleta incumbente é Navy Professional. || rat=Autoridade + confiança para comunidade federal-militar verificada; tom sóbrio/institucional. || int=Repetido em VISUAL_GUIDE §0 Paleta. || conflict=— || note=—
CUR-019 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--background` = `#F8FAFC (slate-50)` para page background. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-020 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--foreground` = `#020617 (slate-950)` para primary text. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-021 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--surface` = `#FFFFFF` para card surface. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-022 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--accent` = `#1E3A8A (blue-900)` para primary action / focus / link. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-023 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--accent-foreground` = `#FFFFFF` para text on --accent. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-024 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--accent-soft` = `color-mix(in oklch, var(--accent) 12%, transparent)` para selected chips, active nav. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-025 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--secondary-accent` = `#3B82F6 (blue-500)` para secondary CTAs, hover highlights. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-026 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--surface-raised` = `#FFFFFF` para cards above page background. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-027 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--surface-sunken` = `color-mix(in oklch, var(--background) 95%, var(--foreground) 5%)` para inset areas (composer field, empty states). || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-028 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--surface-subtle` = `color-mix(in oklch, var(--foreground) 8%, transparent)` para avatar initials, chips, hover rows. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-029 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--border` = `color-mix(in oklch, var(--foreground) 12%, transparent)` para hairlines. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-030 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--muted` = `#475569 (slate-600)` para secondary text. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-031 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--danger` = `#DC2626 (red-600)` para destructive + report affordances. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-032 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--danger-soft` = `color-mix(in oklch, var(--danger) 15%, transparent)` para destructive background. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-033 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--warning` = `#D97706 (amber-600)` para moderation / verification states. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-034 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--success` = `#059669 (emerald-600)` para moderation / verification states. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-035 :: DS §1 — Color token table :: DD/A :: abs=Y fp=Y s=2 :: `--backdrop` = `color-mix(in oklch, var(--foreground) 45%, transparent)` para modal scrim. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-036 :: DS §1 — Color token table :: DD/R :: abs=N fp=N s=3 :: `--focus` = `var(--accent)` para focus ring. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-037 :: DS §1 — Color token table :: DD/R :: abs=N fp=N s=3 :: `--link` = `var(--accent)` para hyperlinks. || rat=Purpose explícito na tabela. || int=Vários valores/papéis reaparecem em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-038 :: DS §1 — Color :: OS/A :: abs=Y fp=N s=5 :: `--muted` deve manter contraste 4.5:1 sobre `--surface`. || rat=Legibilidade de texto secundário. || int=Repetido como limiar global de contraste. || conflict=— || note=—
CUR-039 :: DS §1 — Color :: OS/A :: abs=Y fp=N s=5 :: Todas as cores devem atingir 4.5:1 contra sua superfície de fundo; 3:1 para texto ≥24px ou ≥18.66px bold. || rat=Contraste de texto. || int=Repetido em DESIGN_SPEC §4 e VISUAL_GUIDE §0. || conflict=— || note=—
CUR-040 :: DS §1 — Color :: IG/A :: abs=Y fp=N s=4 :: Componentes devem ler cores via `var(--…)` ou `brandTokens`, nunca cores brutas. || rat=Sistema de tokens como fonte visual. || int=Reforça a regra de hardcoded-color. || conflict=— || note=—
CUR-041 :: DS §1 — Elevation :: DD/R :: abs=N fp=N s=2 :: `--elevation-0` corresponde a flat, border only. || rat=Hierarquia de elevação declarada. || int=— || conflict=— || note=—
CUR-042 :: DS §1 — Elevation :: DD/R :: abs=N fp=N s=2 :: `--elevation-1` corresponde a card. || rat=Hierarquia de elevação declarada. || int=— || conflict=— || note=—
CUR-043 :: DS §1 — Elevation :: DD/R :: abs=N fp=N s=2 :: `--elevation-2` corresponde a sheet/menu. || rat=Hierarquia de elevação declarada. || int=— || conflict=— || note=—
CUR-044 :: DS §1 — Elevation :: DD/R :: abs=N fp=N s=2 :: `--elevation-3` corresponde a modal. || rat=Hierarquia de elevação declarada. || int=— || conflict=— || note=—
CUR-045 :: DS §1 — Elevation :: DD/R :: abs=N fp=N s=2 :: A hierarquia de elevação progride de `--elevation-0` → `--elevation-1` → `--elevation-2` → `--elevation-3`. || rat=Hierarquia explícita por tipo de superfície. || int=— || conflict=— || note=—
CUR-046 :: DS §1 — Elevation :: IG/A :: abs=Y fp=N s=3 :: Sombras usam `color-mix` contra `--foreground`, nunca preto. || rat=Integração das sombras ao sistema de tokens. || int=— || conflict=— || note=—
CUR-047 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--space-1` = 4px. || rat=Escala de 4px declarada. || int=— || conflict=— || note=—
CUR-048 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--space-2` = 8px. || rat=Escala de 4px declarada. || int=— || conflict=— || note=—
CUR-049 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--space-3` = 12px. || rat=Escala de 4px declarada. || int=— || conflict=— || note=—
CUR-050 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--space-4` = 16px. || rat=Escala de 4px declarada. || int=— || conflict=— || note=—
CUR-051 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--space-6` = 24px. || rat=Escala de 4px declarada. || int=— || conflict=— || note=—
CUR-052 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--space-8` = 32px. || rat=Escala de 4px declarada. || int=— || conflict=— || note=—
CUR-053 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--space-12` = 48px. || rat=Escala de 4px declarada. || int=— || conflict=— || note=—
CUR-054 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--radius-sm` = .5rem. || rat=Escala de radius declarada. || int=— || conflict=— || note=—
CUR-055 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--radius` = .75rem. || rat=Escala de radius declarada. || int=— || conflict=— || note=—
CUR-056 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--radius-lg` = 1rem. || rat=Escala de radius declarada. || int=— || conflict=— || note=—
CUR-057 :: DS §1 — Spacing & radius :: DD/A :: abs=Y fp=Y s=1 :: `--radius-full` = 9999px. || rat=Escala de radius declarada. || int=— || conflict=— || note=—
CUR-058 :: DS §1 — Typography :: DD/A :: abs=Y fp=Y s=1 :: `--text-xs` = 12px. || rat=Escala tipográfica declarada. || int=Parcialmente repetido em VISUAL_GUIDE §0 Tipografia. || conflict=— || note=—
CUR-059 :: DS §1 — Typography :: DD/A :: abs=Y fp=Y s=1 :: `--text-sm` = 14px. || rat=Escala tipográfica declarada. || int=Parcialmente repetido em VISUAL_GUIDE §0 Tipografia. || conflict=— || note=—
CUR-060 :: DS §1 — Typography :: DD/A :: abs=Y fp=Y s=1 :: `--text-base` = 16px. || rat=Escala tipográfica declarada. || int=Parcialmente repetido em VISUAL_GUIDE §0 Tipografia. || conflict=— || note=—
CUR-061 :: DS §1 — Typography :: DD/A :: abs=Y fp=Y s=1 :: `--text-lg` = 18px. || rat=Escala tipográfica declarada. || int=Parcialmente repetido em VISUAL_GUIDE §0 Tipografia. || conflict=— || note=—
CUR-062 :: DS §1 — Typography :: DD/A :: abs=Y fp=Y s=1 :: `--text-xl` = 20px. || rat=Escala tipográfica declarada. || int=Parcialmente repetido em VISUAL_GUIDE §0 Tipografia. || conflict=— || note=—
CUR-063 :: DS §1 — Typography :: DD/A :: abs=Y fp=Y s=1 :: `--text-2xl` = 24px. || rat=Escala tipográfica declarada. || int=Parcialmente repetido em VISUAL_GUIDE §0 Tipografia. || conflict=— || note=—
CUR-064 :: DS §1 — Typography :: DD/A :: abs=Y fp=Y s=1 :: `--text-3xl` = 30px. || rat=Escala tipográfica declarada. || int=Parcialmente repetido em VISUAL_GUIDE §0 Tipografia. || conflict=— || note=—
CUR-065 :: DS §1 — Typography :: DD/A :: abs=Y fp=Y s=2 :: Nada tipográfico pode ficar abaixo de 12px. || rat=Piso tipográfico incumbente. || int=Repetido em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-066 :: DS §1 — Typography :: DD/A :: abs=Y fp=Y s=3 :: Line-height de body deve ser 1.5 ou maior. || rat=Legibilidade. || int=Repetido em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-067 :: DS §1 — Typography :: DD/A :: abs=Y fp=Y s=2 :: Line-height de headings = 1.2. || rat=Escala tipográfica incumbente. || int=Repetido em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-068 :: DS §1 — Motion token table :: DD/A :: abs=Y fp=Y s=1 :: `--duration-instant` = `100ms` para color/opacity on hover, focus ring. || rat=Uso explícito na tabela. || int=— || conflict=— || note=—
CUR-069 :: DS §1 — Motion token table :: DD/A :: abs=Y fp=Y s=1 :: `--duration-fast` = `160ms` para press feedback, chip selection, icon morph. || rat=Uso explícito na tabela. || int=— || conflict=— || note=—
CUR-070 :: DS §1 — Motion token table :: DD/A :: abs=Y fp=Y s=1 :: `--duration-base` = `240ms` para card enter, accordion, tab indicator. || rat=Uso explícito na tabela. || int=— || conflict=— || note=—
CUR-071 :: DS §1 — Motion token table :: DD/A :: abs=Y fp=Y s=1 :: `--duration-slow` = `320ms` para sheets, modals, page transitions. || rat=Uso explícito na tabela. || int=— || conflict=— || note=—
CUR-072 :: DS §1 — Motion token table :: DD/A :: abs=Y fp=Y s=1 :: `--ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)` para anything entering. || rat=Uso explícito na tabela. || int=— || conflict=— || note=—
CUR-073 :: DS §1 — Motion token table :: DD/A :: abs=Y fp=Y s=1 :: `--ease-in` = `cubic-bezier(0.7, 0, 0.84, 0)` para anything leaving. || rat=Uso explícito na tabela. || int=— || conflict=— || note=—
CUR-074 :: DS §1 — Motion token table :: DD/A :: abs=Y fp=Y s=1 :: `--ease-spring` = `cubic-bezier(0.34, 1.56, 0.64, 1)` para press release, reaction pop. || rat=Uso explícito na tabela. || int=— || conflict=— || note=—
CUR-075 :: DS §1 — Motion :: OS/A :: abs=Y fp=N s=4 :: Manter o bloco `prefers-reduced-motion` de `globals.css` que zera durações. || rat=Respeito a preferência de redução de movimento. || int=— || conflict=— || note=—
CUR-076 :: DS §1 — Motion :: OS/A :: abs=Y fp=N s=5 :: Nunca codificar significado apenas em movimento; nenhum estado pode ser comunicado somente por movimento. || rat=Acessibilidade e redundância de pistas. || int=— || conflict=— || note=—
CUR-077 :: DS §2 :: DD/A :: abs=Y fp=Y s=2 :: Todo elemento interativo precisa de mudança de estado visível em menos de 200ms. || rat=Feedback imediato; ausência é sinalizada como `no-transition`. || int=— || conflict=— || note=—
CUR-078 :: DS §2 :: IG/A :: abs=Y fp=N s=3 :: Interativo sem transição ou animação deve ser sinalizado pela auditoria como `no-transition`. || rat=Gate de auditoria para feedback de interação. || int=— || conflict=— || note=—
CUR-079 :: DS §2 — Button :: DD/A :: abs=Y fp=Y s=1 :: Hover de botão eleva a superfície e escurece 1.5%. || rat=— || int=— || conflict=— || note=—
CUR-080 :: DS §2 — Button :: DD/A :: abs=Y fp=Y s=1 :: Press de botão usa `scale(0.97)` com `--duration-fast` e `--ease-spring`. || rat=— || int=— || conflict=— || note=—
CUR-081 :: DS §2 — Button :: DD/R :: abs=N fp=N s=2 :: Em loading, o label do botão faz crossfade para spinner inline. || rat=— || int=— || conflict=— || note=—
CUR-082 :: DS §2 — Button :: DD/R :: abs=N fp=N s=3 :: Em loading, a largura do botão permanece fixa. || rat=Evitar mudança de layout durante loading. || int=— || conflict=— || note=—
CUR-083 :: DS §2 — Bottom nav tab :: DD/A :: abs=Y fp=Y s=2 :: Ícone ativo da bottom nav preenche de outline para solid em `--duration-fast`. || rat=— || int=— || conflict=— || note=—
CUR-084 :: DS §2 — Bottom nav tab :: DD/R :: abs=N fp=N s=2 :: Indicador da bottom nav desliza entre tabs com transição shared-layout. || rat=— || int=— || conflict=— || note=—
CUR-085 :: DS §2 — Bottom nav tab :: DD/A :: abs=Y fp=Y s=3 :: Ripple de press permanece dentro do target de 44px. || rat=Conter feedback dentro do alvo interativo. || int=Alvo mínimo de 44px aparece em §4 e VISUAL_GUIDE. || conflict=— || note=—
CUR-086 :: DS §2 — Feed card :: DD/A :: abs=Y fp=Y s=1 :: Ao montar, feed card faz fade + rise de 8px. || rat=— || int=— || conflict=— || note=—
CUR-087 :: DS §2 — Feed card :: DD/A :: abs=Y fp=Y s=1 :: Entrada de feed cards é staggered em 40ms por card, com máximo de 6 cards. || rat=— || int=— || conflict=— || note=—
CUR-088 :: DS §2 — Feed card :: DD/A :: abs=Y fp=N s=2 :: Hover de feed card existe apenas para pointer e eleva de `--elevation-1` para `--elevation-2`. || rat=— || int=— || conflict=— || note=—
CUR-089 :: DS §2 — Reaction / RSVP :: DD/A :: abs=Y fp=Y s=1 :: Toggle otimista faz o ícone pop de `scale(1.2)` para `1` com `--ease-spring`. || rat=— || int=— || conflict=— || note=—
CUR-090 :: DS §2 — Reaction / RSVP :: DD/R :: abs=N fp=N s=1 :: No toggle otimista, o número da contagem desliza para cima. || rat=— || int=— || conflict=— || note=—
CUR-091 :: DS §2 — Reaction / RSVP :: DD/R :: abs=N fp=N s=2 :: No toggle otimista, o tint é preenchido. || rat=— || int=— || conflict=— || note=—
CUR-092 :: DS §2 — Reaction / RSVP :: IG/R :: abs=N fp=N s=4 :: Falha do servidor reverte o toggle otimista. || rat=Recuperabilidade após falha. || int=— || conflict=— || note=—
CUR-093 :: DS §2 — Reaction / RSVP :: DD/R :: abs=N fp=N s=2 :: Falha do servidor é acompanhada de shake + toast. || rat=Comunicar a reversão/falha. || int=— || conflict=— || note=—
CUR-094 :: DS §2 — Composer :: DD/A :: abs=Y fp=Y s=2 :: Composer expande de campo de uma linha 'No que você está pensando?' para editor completo em `--duration-base`. || rat=— || int=— || conflict=— || note=—
CUR-095 :: DS §2 — Composer :: DD/A :: abs=Y fp=Y s=1 :: Contador de caracteres muda para `--warning` em 90%. || rat=— || int=— || conflict=— || note=—
CUR-096 :: DS §2 — Composer :: DD/A :: abs=Y fp=Y s=2 :: Contador de caracteres muda para `--danger` em 100%. || rat=— || int=— || conflict=— || note=—
CUR-097 :: DS §2 — Chip / filter :: DD/R :: abs=N fp=N s=2 :: Chip selecionado preenche com `--accent-soft`. || rat=— || int=Repetido em VISUAL_GUIDE §0 Paleta. || conflict=— || note=—
CUR-098 :: DS §2 — Chip / filter :: DD/R :: abs=N fp=N s=1 :: Borda do chip selecionado aperta. || rat=— || int=— || conflict=— || note=—
CUR-099 :: DS §2 — Chip / filter :: DD/A :: abs=Y fp=Y s=1 :: Transição de seleção de chip usa `--duration-fast`. || rat=— || int=— || conflict=— || note=—
CUR-100 :: DS §2 — Modal / sheet :: DD/A :: abs=Y fp=Y s=1 :: Scrim de modal/sheet faz fade em `--duration-fast`. || rat=— || int=— || conflict=— || note=—
CUR-101 :: DS §2 — Modal / sheet :: DD/A :: abs=Y fp=Y s=1 :: Painel de modal/sheet sobe 24px e faz fade em `--duration-slow` com `--ease-out`. || rat=— || int=— || conflict=— || note=—
CUR-102 :: DS §2 — Modal / sheet :: DD/R :: abs=N fp=N s=3 :: No mobile, modal/sheet é bottom sheet com drag handle. || rat=— || int=— || conflict=— || note=—
CUR-103 :: DS §2 — Modal / sheet :: DD/A :: abs=Y fp=Y s=2 :: Em viewport ≥768px, modal/sheet é dialog centralizado. || rat=— || int=— || conflict=— || note=—
CUR-104 :: DS §2 — Skeleton :: DD/A :: abs=Y fp=Y s=1 :: Skeleton usa shimmer sweep de 1.4s linear infinito. || rat=— || int=— || conflict=— || note=—
CUR-105 :: DS §2 — Skeleton :: DD/R :: abs=N fp=N s=2 :: Base do skeleton usa `--surface-sunken`. || rat=— || int=— || conflict=— || note=—
CUR-106 :: DS §2 — Skeleton :: IG/A :: abs=Y fp=N s=4 :: Skeletons devem corresponder à caixa real do card para não haver reflow no carregamento. || rat=Evitar reflow/layout shift no carregamento. || int=— || conflict=— || note=—
CUR-107 :: DS §2 — Toast :: DD/R :: abs=N fp=N s=2 :: Toast entra deslizando de baixo, acima da navegação. || rat=— || int=— || conflict=— || note=—
CUR-108 :: DS §2 — Toast :: DD/A :: abs=Y fp=Y s=1 :: Toast faz auto-dismiss em 4s. || rat=— || int=— || conflict=— || note=—
CUR-109 :: DS §2 — Toast :: DD/R :: abs=N fp=N s=3 :: Auto-dismiss do toast pausa em hover. || rat=Permitir leitura/ação com pointer. || int=— || conflict=— || note=—
CUR-110 :: DS §2 — Toast :: DD/R :: abs=N fp=N s=2 :: Toast pode ser dispensado por swipe. || rat=— || int=— || conflict=— || note=—
CUR-111 :: DS §2 — Toast :: OS/R :: abs=N fp=N s=4 :: Toast pode ser dispensado por `Esc`. || rat=Alternativa de teclado para dismiss. || int=— || conflict=— || note=—
CUR-112 :: DS §2 — Pull-to-refresh :: DD/R :: abs=N fp=N s=2 :: Feed mobile oferece pull-to-refresh elástico. || rat=— || int=— || conflict=— || note=—
CUR-113 :: DS §2 — Pull-to-refresh :: DD/R :: abs=N fp=N s=1 :: Spinner de pull-to-refresh escala com a distância puxada. || rat=— || int=— || conflict=— || note=—
CUR-114 :: DS §2 — Pull-to-refresh :: DD/R :: abs=N fp=N s=2 :: Ao soltar, pull-to-refresh faz snap back. || rat=— || int=— || conflict=— || note=—
CUR-115 :: DS §2 — Route change :: IG/A :: abs=Y fp=N s=4 :: Cada segmento de rota usa `loading.tsx` para renderizar skeleton. || rat=Evitar tela vazia/bare spinner durante transição. || int=— || conflict=— || note=—
CUR-116 :: DS §2 — Route change :: DD/A :: abs=Y fp=N s=4 :: Mudança de rota nunca mostra tela em branco nem spinner isolado. || rat=Manter contexto visual durante loading. || int=— || conflict=— || note=—
CUR-117 :: DS §3 — layout global :: DD/A :: abs=Y fp=Y s=2 :: Toda tela usa coluna única com largura de conteúdo ≤640px em mobile/tablet. || rat=— || int=— || conflict=— || note=—
CUR-118 :: DS §3 — layout global :: DD/A :: abs=Y fp=Y s=2 :: Em ≥1024px, toda tela usa grid de duas colunas. || rat=— || int=— || conflict=VISUAL_GUIDE /messages prescreve duas colunas internas; /community desktop mostra sidebar + conteúdo + right rail. || note=—
CUR-119 :: DS §3 — layout global :: DD/A :: abs=Y fp=Y s=2 :: Na grade desktop, a coluna de conteúdo tem max 640px. || rat=— || int=— || conflict=— || note=—
CUR-120 :: DS §3 — layout global :: DD/A :: abs=Y fp=Y s=2 :: Na grade desktop, o right rail tem 320px e é sticky. || rat=— || int=Reforçado em /community; VISUAL_GUIDE usa right rail w-72 (~288px), criando divergência numérica. || conflict=VISUAL_GUIDE §1 wireframe desktop prescreve `w-72` para right rail. || note=—
CUR-121 :: DS §3 — layout global :: DD/A :: abs=Y fp=N s=3 :: Bottom nav existe apenas em mobile/tablet. || rat=— || int=Repetido em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-122 :: DS §3 — layout global :: DD/A :: abs=Y fp=Y s=3 :: Em ≥1024px, bottom nav torna-se sidebar esquerda. || rat=— || int=Repetido em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-123 :: DS §3.1 `/login` :: DD/R :: abs=N fp=N s=3 :: Login usa card centralizado sobre `--background`. || rat=— || int=— || conflict=VISUAL_GUIDE §8 prescreve card sobre `--surface-sunken`. || note=—
CUR-124 :: DS §3.1 `/login` :: DD/R :: abs=N fp=N s=3 :: Login inclui wordmark. || rat=— || int=— || conflict=— || note=—
CUR-125 :: DS §3.1 `/login` :: DD/A :: abs=Y fp=Y s=2 :: Login inclui value proposition de uma linha. || rat=— || int=— || conflict=— || note=—
CUR-126 :: DS §3.1 `/login` :: PI/R :: abs=N fp=N s=4 :: Login inclui botão Google OAuth. || rat=Fluxo de autenticação incumbente. || int=— || conflict=— || note=—
CUR-127 :: DS §3.1 `/login` :: DD/R :: abs=N fp=N s=2 :: Login inclui divisor 'ou'. || rat=— || int=— || conflict=— || note=—
CUR-128 :: DS §3.1 `/login` :: PI/R :: abs=N fp=N s=4 :: Login inclui campo de e-mail + magic link. || rat=Fluxo de autenticação incumbente. || int=— || conflict=— || note=—
CUR-129 :: DS §3.1 `/login` :: DD/R :: abs=N fp=N s=3 :: Sucesso do magic link substitui o formulário por estado inline 'Verifique seu e-mail'. || rat=— || int=— || conflict=— || note=—
CUR-130 :: DS §3.1 `/login` :: DD/A :: abs=Y fp=N s=2 :: Sucesso do magic link não usa alert box. || rat=— || int=— || conflict=— || note=—
CUR-131 :: DS §3.1 `/login` :: PI/R :: abs=N fp=N s=4 :: Footer do login inclui nota de acesso condicionado à verificação. || rat=Comunicar gating de verificação. || int=— || conflict=— || note=—
CUR-132 :: DS §3.2 `/consent` e `/onboarding` :: DD/R :: abs=N fp=N s=3 :: Consent/onboarding são multi-step. || rat=— || int=— || conflict=— || note=—
CUR-133 :: DS §3.2 `/consent` e `/onboarding` :: DD/A :: abs=Y fp=N s=2 :: Progress bar superior usa segmentos, não percentual. || rat=— || int=— || conflict=— || note=—
CUR-134 :: DS §3.2 `/consent` e `/onboarding` :: DD/A :: abs=Y fp=Y s=1 :: Transição para frente entre etapas desliza 24px à esquerda. || rat=— || int=— || conflict=— || note=—
CUR-135 :: DS §3.2 `/consent` e `/onboarding` :: DD/A :: abs=Y fp=Y s=1 :: Transição para trás entre etapas desliza 24px à direita. || rat=— || int=— || conflict=— || note=—
CUR-136 :: DS §3.2 `/consent` e `/onboarding` :: DD/R :: abs=N fp=N s=4 :: Campo CPF aplica máscara conforme digitado. || rat=— || int=Repetido em VISUAL_GUIDE §8 com máscara exata. || conflict=— || note=—
CUR-137 :: DS §3.2 `/consent` e `/onboarding` :: PI/A :: abs=Y fp=N s=5 :: CPF nunca é ecoado de volta após submit. || rat=Privacidade de dado sensível. || int=Repetido em VISUAL_GUIDE §8. || conflict=— || note=—
CUR-138 :: DS §3.2 `/consent` e `/onboarding` :: DD/R :: abs=N fp=N s=3 :: Espera de verificação usa progresso indeterminado com copy tranquilizadora. || rat=— || int=— || conflict=— || note=—
CUR-139 :: DS §3.2 `/consent` e `/onboarding` :: DD/A :: abs=Y fp=N s=3 :: Espera de verificação não usa spinner sozinho. || rat=Evitar estado sem contexto. || int=— || conflict=— || note=—
CUR-140 :: DS §3.2 `/consent` e `/onboarding` :: DD/A :: abs=Y fp=N s=3 :: Estados de falha devem ser específicos. || rat=Clareza de erro. || int=— || conflict=— || note=—
CUR-141 :: DS §3.2 `/consent` e `/onboarding` :: PI/R :: abs=N fp=N s=4 :: Estados de falha oferecem caminho para waitlist. || rat=Recuperabilidade do fluxo de elegibilidade. || int=— || conflict=— || note=—
CUR-142 :: DS §3.3 `/community` :: PI/R :: abs=N fp=N s=4 :: Header de localidade mostra 'Manaus, AM'. || rat=Enquadramento de localidade do produto. || int=Repetido no wireframe do VISUAL_GUIDE. || conflict=— || note=—
CUR-143 :: DS §3.3 `/community` :: DD/R :: abs=N fp=N s=3 :: Header de localidade mostra contagem de membros. || rat=— || int=— || conflict=— || note=—
CUR-144 :: DS §3.3 `/community` :: DD/R :: abs=N fp=N s=3 :: Header de localidade fica sticky sob o app header. || rat=— || int=VISUAL_GUIDE wireframe repete sticky top-12. || conflict=— || note=—
CUR-145 :: DS §3.3 `/community` :: DD/R :: abs=N fp=N s=3 :: Composer entry contém avatar. || rat=— || int=— || conflict=— || note=—
CUR-146 :: DS §3.3 `/community` :: DD/R :: abs=N fp=N s=3 :: Composer entry usa input colapsado. || rat=— || int=— || conflict=— || note=—
CUR-147 :: DS §3.3 `/community` :: DD/R :: abs=N fp=N s=2 :: Composer entry oferece atalhos de attachment/event/recommendation. || rat=— || int=VISUAL_GUIDE wireframe mostra atalhos Foto/Link/📊, não exatamente event/recommendation. || conflict=VISUAL_GUIDE §1 wireframe mostra Foto/Link/📊 em vez da lista textual attachment/event/recommendation. || note=—
CUR-148 :: DS §3.3 `/community` :: DD/R :: abs=N fp=N s=4 :: Sort control é segmentado com 'Recentes / Relevantes'. || rat=— || int=Repetido no VISUAL_GUIDE wireframe. || conflict=— || note=—
CUR-149 :: DS §3.3 `/community` :: IG/R :: abs=N fp=N s=4 :: Sort control mapeia para o argumento `p_order` de `feed_posts`. || rat=Integração explícita com contrato existente. || int=— || conflict=— || note=—
CUR-150 :: DS §3.3 `/community` :: DD/R :: abs=N fp=N s=2 :: Troca de sort faz crossfade da lista. || rat=— || int=— || conflict=— || note=—
CUR-151 :: DS §3.3 `/community` :: DD/A :: abs=Y fp=N s=4 :: Troca de sort não deixa a lista em branco. || rat=Preservar continuidade durante mudança. || int=— || conflict=— || note=—
CUR-152 :: DS §3.3 `/community` — post card anatomy :: DD/R :: abs=N fp=N s=3 :: Post card começa com avatar. || rat=— || int=— || conflict=— || note=—
CUR-153 :: DS §3.3 `/community` — post card anatomy :: DD/R :: abs=N fp=N s=3 :: Post card mostra display name. || rat=— || int=— || conflict=— || note=—
CUR-154 :: DS §3.3 `/community` — post card anatomy :: DD/R :: abs=N fp=N s=3 :: Post card mostra localidade + tempo relativo. || rat=— || int=— || conflict=— || note=—
CUR-155 :: DS §3.3 `/community` — post card anatomy :: DD/R :: abs=N fp=N s=3 :: Post card possui overflow menu com ação de report. || rat=— || int=— || conflict=— || note=—
CUR-156 :: DS §3.3 `/community` — post card anatomy :: DD/A :: abs=Y fp=Y s=2 :: Corpo do post usa clamp de 4 linhas + 'Ver mais'. || rat=— || int=— || conflict=— || note=—
CUR-157 :: DS §3.3 `/community` — post card anatomy :: DD/R :: abs=N fp=N s=3 :: Post card pode incluir mídia opcional. || rat=— || int=— || conflict=— || note=—
CUR-158 :: DS §3.3 `/community` — post card anatomy :: DD/R :: abs=N fp=N s=3 :: Post card inclui reaction row com react. || rat=— || int=— || conflict=— || note=—
CUR-159 :: DS §3.3 `/community` — post card anatomy :: DD/R :: abs=N fp=N s=3 :: Reaction row inclui contagem de comentários. || rat=— || int=— || conflict=— || note=—
CUR-160 :: DS §3.3 `/community` — post card anatomy :: DD/R :: abs=N fp=N s=3 :: Reaction row inclui share. || rat=— || int=— || conflict=— || note=—
CUR-161 :: DS §3.3 `/community` — post card anatomy :: DD/A :: abs=Y fp=Y s=2 :: Post card mostra preview dos 2 comentários mais recentes. || rat=— || int=— || conflict=— || note=—
CUR-162 :: DS §3.3 `/community` — post card anatomy :: DD/R :: abs=N fp=N s=3 :: Post card inclui campo de resposta inline. || rat=— || int=— || conflict=— || note=—
CUR-163 :: DS §3.3 `/community` — states :: DD/A :: abs=Y fp=Y s=2 :: Loading do feed usa skeleton de 3 cards. || rat=— || int=Repetido em VISUAL_GUIDE §0 Estados. || conflict=— || note=—
CUR-164 :: DS §3.3 `/community` — states :: DD/R :: abs=N fp=N s=3 :: Empty do feed usa 'Seja o primeiro a publicar' + CTA do composer. || rat=— || int=— || conflict=— || note=—
CUR-165 :: DS §3.3 `/community` — states :: DD/R :: abs=N fp=N s=4 :: Error do feed inclui botão retry. || rat=— || int=Repetido em VISUAL_GUIDE §0 Estados. || conflict=— || note=—
CUR-166 :: DS §3.3 `/community` — states :: OS/A :: abs=Y fp=N s=5 :: Mensagem de erro do feed nunca vaza erro bruto de Postgres. || rat=Não expor erro interno. || int=Repetido em VISUAL_GUIDE §0. || conflict=— || note=—
CUR-167 :: DS §3.3 `/community` — states :: DD/R :: abs=N fp=N s=3 :: Feed inclui marcador de fim. || rat=— || int=VISUAL_GUIDE define divisor + 'Você está em dia'. || conflict=— || note=—
CUR-168 :: DS §3.3 `/community` :: DD/A :: abs=Y fp=Y s=3 :: Em ≥1024px, right rail inclui próximos eventos. || rat=— || int=— || conflict=— || note=—
CUR-169 :: DS §3.3 `/community` :: DD/A :: abs=Y fp=Y s=3 :: Em ≥1024px, right rail inclui grupos ativos. || rat=— || int=— || conflict=— || note=—
CUR-170 :: DS §3.3 `/community` :: DD/A :: abs=Y fp=Y s=3 :: Em ≥1024px, right rail inclui diretrizes da comunidade. || rat=— || int=— || conflict=— || note=—
CUR-171 :: DS §3.4 `/groups` :: DD/R :: abs=N fp=N s=2 :: Tela de grupos usa grid de group cards. || rat=— || int=— || conflict=VISUAL_GUIDE §2 prescreve lista de linhas, explicitamente 'não cards soltos'. || note=—
CUR-172 :: DS §3.4 `/groups` :: DD/R :: abs=N fp=N s=2 :: Group card mostra cover. || rat=— || int=— || conflict=VISUAL_GUIDE §2 muda a composição para lista de linhas. || note=—
CUR-173 :: DS §3.4 `/groups` :: DD/R :: abs=N fp=N s=2 :: Group card mostra nome. || rat=— || int=— || conflict=VISUAL_GUIDE §2 muda a composição para lista de linhas. || note=—
CUR-174 :: DS §3.4 `/groups` :: DD/R :: abs=N fp=N s=2 :: Group card mostra contagem de membros. || rat=— || int=— || conflict=VISUAL_GUIDE §2 muda a composição para lista de linhas. || note=—
CUR-175 :: DS §3.4 `/groups` :: DD/R :: abs=N fp=N s=2 :: Group card mostra badge de privacidade. || rat=— || int=— || conflict=VISUAL_GUIDE §2 usa cadeado ao lado do nome em vez de badge de privacidade. || note=—
CUR-176 :: DS §3.4 `/groups` :: DD/R :: abs=N fp=N s=4 :: Tabs de grupos são 'Meus grupos / Descobrir'. || rat=— || int=Repetido em VISUAL_GUIDE §2. || conflict=— || note=—
CUR-177 :: DS §3.4 `/groups` :: DD/R :: abs=N fp=N s=4 :: Grupos privados mostram lock. || rat=— || int=Repetido em VISUAL_GUIDE §2. || conflict=— || note=—
CUR-178 :: DS §3.4 `/groups` :: DD/R :: abs=N fp=N s=4 :: Grupos privados mostram botão 'Solicitar entrada'. || rat=— || int=Repetido em VISUAL_GUIDE §2. || conflict=— || note=—
CUR-179 :: DS §3.4 `/groups` :: PI/R :: abs=N fp=N s=4 :: Estado pendente de 'Solicitar entrada' persiste. || rat=Persistência de estado de solicitação. || int=Repetido em VISUAL_GUIDE §2. || conflict=— || note=—
CUR-180 :: DS §3.4 `/groups` :: DD/R :: abs=N fp=N s=3 :: Detalhe de grupo usa cover header que colapsa ao scroll. || rat=— || int=Repetido em VISUAL_GUIDE §2. || conflict=— || note=—
CUR-181 :: DS §3.4 `/groups` :: DD/R :: abs=N fp=N s=4 :: Detalhe de grupo usa tabs Publicações / Membros / Sobre. || rat=— || int=Repetido em VISUAL_GUIDE §2. || conflict=— || note=—
CUR-182 :: DS §3.4 `/groups` :: PI/A :: abs=Y fp=N s=5 :: Ações de moderação são disponíveis somente para moderators. || rat=Autorização por papel. || int=— || conflict=— || note=—
CUR-183 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=4 :: Eventos são listados agrupados por data. || rat=— || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-184 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=4 :: Headers de data são sticky. || rat=— || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-185 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=3 :: Card de evento mostra bloco de data (dia + mês). || rat=— || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-186 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=3 :: Card de evento mostra título. || rat=— || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-187 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=3 :: Card de evento mostra linha de venue. || rat=— || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-188 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=3 :: Card de evento mostra avatares de participantes. || rat=— || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-189 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=4 :: RSVP é controle segmentado 'Vou / Talvez / Não vou'. || rat=— || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-190 :: DS §3.5 `/events` :: IG/R :: abs=N fp=N s=4 :: RSVP faz update otimista. || rat=— || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-191 :: DS §3.5 `/events` :: PI/A :: abs=Y fp=N s=5 :: Venue privado renderiza somente para participantes confirmados. || rat=Privacidade do local. || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-192 :: DS §3.5 `/events` :: IG/A :: abs=Y fp=N s=5 :: Restrição de venue privado é aplicada server-side. || rat=Não expor local privado ao cliente não autorizado. || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-193 :: DS §3.5 `/events` :: OS/A :: abs=Y fp=N s=5 :: UI não pode fetch-then-hide venue privado. || rat=Evitar vazamento de dado privado ao cliente. || int=Repetido em VISUAL_GUIDE §3. || conflict=— || note=—
CUR-194 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=2 :: Detalhe do evento inclui hero photo. || rat=— || int=— || conflict=— || note=—
CUR-195 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=2 :: Detalhe do evento inclui map placeholder. || rat=— || int=— || conflict=— || note=—
CUR-196 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=2 :: Detalhe do evento inclui descrição. || rat=— || int=— || conflict=— || note=—
CUR-197 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=2 :: Detalhe do evento inclui lista de participantes. || rat=— || int=— || conflict=— || note=—
CUR-198 :: DS §3.5 `/events` :: DD/R :: abs=N fp=N s=2 :: Detalhe do evento inclui share. || rat=— || int=— || conflict=— || note=—
CUR-199 :: DS §3.6 `/recommendations` :: DD/R :: abs=N fp=N s=4 :: Linha de chips de categoria é horizontalmente rolável. || rat=— || int=Repetido em VISUAL_GUIDE §4. || conflict=— || note=—
CUR-200 :: DS §3.6 `/recommendations` :: DD/R :: abs=N fp=N s=3 :: Linha de chips de categoria usa snap. || rat=— || int=Repetido como scroll-snap em VISUAL_GUIDE §4. || conflict=— || note=—
CUR-201 :: DS §3.6 `/recommendations` :: DD/R :: abs=N fp=N s=3 :: Card de indicação mostra ícone de categoria. || rat=— || int=Repetido em VISUAL_GUIDE §4. || conflict=— || note=—
CUR-202 :: DS §3.6 `/recommendations` :: DD/R :: abs=N fp=N s=3 :: Card de indicação mostra nome do negócio. || rat=— || int=Repetido em VISUAL_GUIDE §4. || conflict=— || note=—
CUR-203 :: DS §3.6 `/recommendations` :: DD/R :: abs=N fp=N s=3 :: Card de indicação mostra nome do recomendador. || rat=— || int=Repetido em VISUAL_GUIDE §4. || conflict=— || note=—
CUR-204 :: DS §3.6 `/recommendations` :: DD/R :: abs=N fp=N s=3 :: Card de indicação mostra blurb. || rat=— || int=Repetido em VISUAL_GUIDE §4. || conflict=— || note=—
CUR-205 :: DS §3.6 `/recommendations` :: DD/R :: abs=N fp=N s=3 :: Card de indicação mostra helpful count. || rat=— || int=Repetido em VISUAL_GUIDE §4. || conflict=— || note=—
CUR-206 :: DS §3.6 `/recommendations` :: IG/R :: abs=N fp=N s=3 :: Busca de indicações usa filtering com debounce. || rat=— || int=Repetido em VISUAL_GUIDE §4. || conflict=— || note=—
CUR-207 :: DS §3.6 `/recommendations` :: DD/R :: abs=N fp=N s=4 :: Empty state 'nenhum resultado' mantém query visível. || rat=Preservar contexto da busca. || int=Repetido em VISUAL_GUIDE §4. || conflict=— || note=—
CUR-208 :: DS §3.7 `/messages` :: DD/A :: abs=Y fp=Y s=4 :: Em ≥1024px, mensagens usam dois panes: lista + thread. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-209 :: DS §3.7 `/messages` :: DD/R :: abs=N fp=N s=4 :: No mobile, mensagens empilham lista/thread com navegação por slide. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-210 :: DS §3.7 `/messages` :: DD/R :: abs=N fp=N s=3 :: Lista de threads mostra avatar. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-211 :: DS §3.7 `/messages` :: DD/R :: abs=N fp=N s=3 :: Lista de threads mostra nome. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-212 :: DS §3.7 `/messages` :: DD/R :: abs=N fp=N s=3 :: Lista de threads mostra preview de mensagem. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-213 :: DS §3.7 `/messages` :: DD/R :: abs=N fp=N s=3 :: Lista de threads mostra tempo relativo. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-214 :: DS §3.7 `/messages` :: DD/R :: abs=N fp=N s=3 :: Lista de threads mostra dot de não-lida. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-215 :: DS §3.7 `/messages` :: DD/R :: abs=N fp=N s=3 :: Thread usa separadores de data. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-216 :: DS §3.7 `/messages` :: DD/R :: abs=N fp=N s=3 :: Mensagens consecutivas são agrupadas em bubbles. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-217 :: DS §3.7 `/messages` :: DD/R :: abs=N fp=N s=3 :: Mensagens próprias são accent-tinted e alinhadas à direita. || rat=— || int=VISUAL_GUIDE especifica `--accent-soft`. || conflict=— || note=—
CUR-218 :: DS §3.7 `/messages` :: DD/A :: abs=Y fp=N s=4 :: Botão de enviar habilita somente com input não vazio. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-219 :: DS §3.7 `/messages` :: IG/R :: abs=N fp=N s=4 :: Envio é otimista e mostra tick pendente. || rat=— || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-220 :: DS §3.7 `/messages` :: PI/A :: abs=Y fp=N s=5 :: Uma thread requer contexto compartilhado. || rat=Regra contextual de DM. || int=— || conflict=— || note=—
CUR-221 :: DS §3.7 `/messages` :: DD/R :: abs=N fp=N s=4 :: Ausência de contexto de DM aparece como empty state explicativo. || rat=Explicar regra contextual. || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-222 :: DS §3.7 `/messages` :: OS/A :: abs=Y fp=N s=5 :: Ausência de contexto de DM nunca aparece como erro cru de permissão. || rat=Não expor erro de autorização cru. || int=Repetido em VISUAL_GUIDE §5. || conflict=— || note=—
CUR-223 :: DS §3.8 `/notifications` :: DD/R :: abs=N fp=N s=4 :: Notificações são agrupadas em 'Hoje / Esta semana / Anteriores'. || rat=— || int=Repetido em VISUAL_GUIDE §6. || conflict=— || note=—
CUR-224 :: DS §3.8 `/notifications` :: DD/R :: abs=N fp=N s=4 :: Item não lido usa fundo `--accent-soft`. || rat=— || int=Repetido em VISUAL_GUIDE §6. || conflict=— || note=—
CUR-225 :: DS §3.8 `/notifications` :: DD/A :: abs=Y fp=Y s=3 :: Fundo de item não lido esmaece em `--duration-slow` ao ser lido. || rat=— || int=Repetido em VISUAL_GUIDE §6. || conflict=— || note=—
CUR-226 :: DS §3.8 `/notifications` :: DD/R :: abs=N fp=N s=4 :: Header inclui 'Marcar todas como lidas'. || rat=— || int=Repetido em VISUAL_GUIDE §6. || conflict=— || note=—
CUR-227 :: DS §3.9 `/profile` :: IG/R :: abs=N fp=N s=4 :: A rota `/profile` deve existir para corresponder ao link já presente na bottom nav. || rat=Spec declara que a rota ainda não existe mas a navegação já aponta para ela. || int=— || conflict=— || note=—
CUR-228 :: DS §3.9 `/profile` :: DD/R :: abs=N fp=N s=4 :: Header de perfil mostra avatar. || rat=— || int=Repetido em VISUAL_GUIDE §7. || conflict=— || note=—
CUR-229 :: DS §3.9 `/profile` :: DD/R :: abs=N fp=N s=4 :: Header de perfil mostra display name. || rat=— || int=Repetido em VISUAL_GUIDE §7. || conflict=— || note=—
CUR-230 :: DS §3.9 `/profile` :: DD/R :: abs=N fp=N s=4 :: Header de perfil mostra localidade. || rat=— || int=Repetido em VISUAL_GUIDE §7. || conflict=— || note=—
CUR-231 :: DS §3.9 `/profile` :: DD/R :: abs=N fp=N s=4 :: Header de perfil mostra member-since. || rat=— || int=Repetido em VISUAL_GUIDE §7. || conflict=— || note=—
CUR-232 :: DS §3.9 `/profile` :: PI/A :: abs=Y fp=N s=5 :: Membros verificados mostram somente o estado interno de confiança permitido pelo schema. || rat=Limitar exposição de atributos de verificação. || int=— || conflict=— || note=—
CUR-233 :: DS §3.9 `/profile` :: PI/A :: abs=Y fp=N s=5 :: Perfil nunca mostra badge público de verificação. || rat=Privacidade/trust model. || int=Repetido em VISUAL_GUIDE §7 e rubrica. || conflict=— || note=—
CUR-234 :: DS §3.9 `/profile` :: PI/A :: abs=Y fp=N s=5 :: Perfil nunca mostra patente. || rat=Privacidade/trust model. || int=Repetido em VISUAL_GUIDE §7 e rubrica. || conflict=— || note=—
CUR-235 :: DS §3.9 `/profile` :: PI/A :: abs=Y fp=N s=5 :: Perfil nunca mostra organização militar. || rat=Privacidade/trust model. || int=Repetido em VISUAL_GUIDE §7 e rubrica. || conflict=— || note=—
CUR-236 :: DS §3.9 `/profile` :: PI/A :: abs=Y fp=N s=5 :: Perfil nunca mostra endereço. || rat=Privacidade/trust model. || int=Repetido em VISUAL_GUIDE §7 e rubrica. || conflict=— || note=—
CUR-237 :: DS §3.9 `/profile` :: DD/R :: abs=N fp=N s=4 :: Perfil usa tabs Publicações / Eventos / Configurações. || rat=— || int=Repetido em VISUAL_GUIDE §7. || conflict=— || note=—
CUR-238 :: DS §3.9 `/profile` :: DD/R :: abs=N fp=N s=3 :: Configurações inclui preferências de notificação. || rat=— || int=Repetido em VISUAL_GUIDE §7. || conflict=— || note=—
CUR-239 :: DS §3.9 `/profile` :: PI/R :: abs=N fp=N s=3 :: Configurações inclui visibilidade de privacidade. || rat=— || int=Repetido em VISUAL_GUIDE §7. || conflict=— || note=—
CUR-240 :: DS §3.9 `/profile` :: DD/R :: abs=N fp=N s=3 :: Configurações inclui convites de família. || rat=— || int=Repetido em VISUAL_GUIDE §7. || conflict=— || note=—
CUR-241 :: DS §3.9 `/profile` :: DD/R :: abs=N fp=N s=3 :: Configurações inclui sair. || rat=— || int=Repetido em VISUAL_GUIDE §7. || conflict=— || note=—
CUR-242 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=Y s=5 :: Todo target interativo tem mínimo de 44×44 CSS px. || rat=Gate de acessibilidade. || int=Repetido em VISUAL_GUIDE §0 e rubrica. || conflict=— || note=—
CUR-243 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=N s=5 :: Contraste de texto é ≥4.5:1; ≥3:1 para texto ≥24px ou ≥18.66px bold. || rat=Gate de acessibilidade. || int=Repetido em §1 e VISUAL_GUIDE. || conflict=— || note=—
CUR-244 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=Y s=4 :: Existe exatamente um `<h1>` por tela. || rat=Hierarquia de headings incumbente. || int=Repetido em VISUAL_GUIDE §0 e rubrica. || conflict=— || note=—
CUR-245 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=N s=5 :: Níveis de heading nunca pulam. || rat=Hierarquia semântica. || int=— || conflict=— || note=—
CUR-246 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=N s=5 :: Todo controle tem nome acessível. || rat=Acessibilidade de controles. || int=— || conflict=— || note=—
CUR-247 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=N s=5 :: Toda `<img>` tem `alt`. || rat=Acessibilidade de imagens. || int=— || conflict=— || note=—
CUR-248 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=Y s=5 :: Foco usa ring `:focus-visible` visível com `--focus` e offset 2px. || rat=Visibilidade de foco. || int=Repetido na rubrica do VISUAL_GUIDE. || conflict=— || note=—
CUR-249 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=N s=5 :: Nunca usar `outline: none` como tratamento de foco. || rat=Não remover indicação de foco. || int=— || conflict=— || note=—
CUR-250 :: DS §4 — Accessibility gates :: OS/R :: abs=N fp=N s=5 :: Modais prendem foco. || rat=— || int=— || conflict=— || note=—
CUR-251 :: DS §4 — Accessibility gates :: OS/R :: abs=N fp=N s=5 :: Modais fecham com `Esc`. || rat=— || int=— || conflict=— || note=—
CUR-252 :: DS §4 — Accessibility gates :: OS/R :: abs=N fp=N s=5 :: Modais restauram foco ao trigger. || rat=— || int=— || conflict=— || note=—
CUR-253 :: DS §4 — Accessibility gates :: OS/R :: abs=N fp=N s=5 :: Live regions anunciam ações otimistas. || rat=Feedback assíncrono acessível. || int=— || conflict=— || note=—
CUR-254 :: DS §4 — Accessibility gates :: IG/R :: abs=N fp=N s=4 :: Toasts e contagens usam `aria-live='polite'` para ações otimistas. || rat=Implementação explícita da live region. || int=— || conflict=— || note=—
CUR-255 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=Y s=4 :: Não pode haver scroll horizontal de página em 375px. || rat=Gate responsivo explícito. || int=Mesmos viewports são usados na rubrica do VISUAL_GUIDE. || conflict=— || note=—
CUR-256 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=Y s=4 :: Não pode haver scroll horizontal de página em 768px. || rat=Gate responsivo explícito. || int=Mesmos viewports são usados na rubrica do VISUAL_GUIDE. || conflict=— || note=—
CUR-257 :: DS §4 — Accessibility gates :: OS/A :: abs=Y fp=Y s=4 :: Não pode haver scroll horizontal de página em 1440px. || rat=Gate responsivo explícito. || int=Mesmos viewports são usados na rubrica do VISUAL_GUIDE. || conflict=— || note=—
CUR-258 :: VG — preâmbulo :: IG/A :: abs=Y fp=N s=4 :: Em conflito com `AGENTS.md`, o contrato do repo vence. || rat=Precedência documental declarada. || int=— || conflict=— || note=Regra de governança incumbente registrada; nenhum AGENTS externo foi aberto nesta fase.
CUR-259 :: VG §0 — Superfícies e ritmo :: DD/A :: abs=Y fp=Y s=3 :: Fundo da tela inteira usa `var(--background)` = `#F8FAFC` slate-50. || rat=— || int=Repete DESIGN_SPEC §1 `--background`. || conflict=— || note=—
CUR-260 :: VG §0 — Superfícies e ritmo :: DD/R :: abs=N fp=N s=3 :: Cards usam `var(--surface)` / `var(--surface-raised)` brancos sobre fundo slate-50. || rat=— || int=Repete DESIGN_SPEC §1. || conflict=— || note=—
CUR-261 :: VG §0 — Superfícies e ritmo :: DD/R :: abs=N fp=N s=3 :: Inset areas de composer e empty states usam `var(--surface-sunken)`. || rat=— || int=Repete DESIGN_SPEC §1. || conflict=— || note=—
CUR-262 :: VG §0 — Superfícies e ritmo :: DD/A :: abs=Y fp=Y s=2 :: Cards de conteúdo usam raio 12px (`rounded-xl`). || rat=— || int=— || conflict=— || note=—
CUR-263 :: VG §0 — Superfícies e ritmo :: DD/A :: abs=Y fp=Y s=2 :: Empty states e modais usam raio 16px (`rounded-2xl`). || rat=— || int=— || conflict=— || note=—
CUR-264 :: VG §0 — Superfícies e ritmo :: DD/R :: abs=N fp=N s=3 :: CTAs e bottom-nav items usam pill (`rounded-full`). || rat=— || int=— || conflict=— || note=—
CUR-265 :: VG §0 — Superfícies e ritmo :: DD/A :: abs=Y fp=Y s=2 :: Padding interno de card é 16px (`p-4`). || rat=— || int=Repetido na rubrica. || conflict=— || note=—
CUR-266 :: VG §0 — Superfícies e ritmo :: DD/A :: abs=Y fp=Y s=2 :: Padding lateral da página é 16px (`px-4`). || rat=— || int=— || conflict=— || note=—
CUR-267 :: VG §0 — Superfícies e ritmo :: DD/A :: abs=Y fp=Y s=3 :: Gap entre cards é 12–16px (`gap-3`/`space-y-3`). || rat=Feed deve ler como lista coesa, não objetos flutuando; finding #7. || int=Repetido no wireframe e rubrica. || conflict=— || note=—
CUR-268 :: VG §0 — Superfícies e ritmo :: DD/A :: abs=Y fp=Y s=3 :: Gap entre cards de lista nunca excede 24px. || rat=Feed deve ler como LISTA coesa, não objetos flutuando (finding #7). || int=— || conflict=— || note=—
CUR-269 :: VG §0 — Superfícies e ritmo :: DD/A :: abs=Y fp=Y s=1 :: Separação entre seções é 24px (`mt-6`). || rat=— || int=— || conflict=— || note=—
CUR-270 :: VG §0 — Superfícies e ritmo :: DD/R :: abs=N fp=N s=3 :: Divisores usam `var(--border)` hairline. || rat=— || int=Token definido em DESIGN_SPEC §1. || conflict=— || note=—
CUR-271 :: VG §0 — Paleta :: DD/A :: abs=Y fp=Y s=3 :: `--accent` = `#1E3A8A` (blue-900) para CTAs principais, links, focus ring e item ativo da nav. || rat=— || int=Repete tokens de DESIGN_SPEC §1. || conflict=— || note=—
CUR-272 :: VG §0 — Paleta :: DD/A :: abs=Y fp=Y s=3 :: Texto sobre `--accent` = `--accent-foreground` = `#FFFFFF` para texto sobre accent. || rat=— || int=Repete tokens de DESIGN_SPEC §1. || conflict=— || note=—
CUR-273 :: VG §0 — Paleta :: DD/A :: abs=Y fp=Y s=3 :: `brandTokens.secondaryAccent` = `#3B82F6` (blue-500) para CTAs secundárias e links de navegação mais leves. || rat=— || int=Repete tokens de DESIGN_SPEC §1. || conflict=— || note=—
CUR-274 :: VG §0 — Paleta :: DD/A :: abs=Y fp=Y s=3 :: `--accent-soft` = 12% blue-900 para fundo de item ativo na sidebar/bottom nav. || rat=— || int=Repete tokens de DESIGN_SPEC §1. || conflict=— || note=—
CUR-275 :: VG §0 — Paleta :: DD/A :: abs=Y fp=Y s=3 :: `--foreground` = `#020617` (slate-950) para texto principal. || rat=— || int=Repete tokens de DESIGN_SPEC §1. || conflict=— || note=—
CUR-276 :: VG §0 — Paleta :: DD/A :: abs=Y fp=Y s=3 :: `--muted` = `#475569` (slate-600) para meta, timestamps e subtexto. || rat=— || int=Repete tokens de DESIGN_SPEC §1. || conflict=— || note=—
CUR-277 :: VG §0 — Paleta :: DD/A :: abs=Y fp=Y s=3 :: `--danger` = `#DC2626` para report/destrutivo. || rat=— || int=Repete tokens de DESIGN_SPEC §1. || conflict=— || note=—
CUR-278 :: VG §0 — Paleta :: IG/R :: abs=N fp=N s=3 :: Success / Warning / Danger-soft seguem os tokens definidos. || rat=— || int=Valores constam no DESIGN_SPEC §1. || conflict=— || note=—
CUR-279 :: VG §0 — Paleta :: OS/A :: abs=Y fp=N s=5 :: Tudo deve atingir contraste ≥4.5:1 em texto normal ou ≥3:1 em ≥24px/≥18.66px bold. || rat=Contraste. || int=Repete DESIGN_SPEC §§1 e 4. || conflict=— || note=—
CUR-280 :: VG §0 — Tipografia :: IG/R :: abs=N fp=N s=3 :: Usar system sans-serif stack `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` no body. || rat=Stack declarada no globals.css. || int=— || conflict=— || note=—
CUR-281 :: VG §0 — Tipografia :: IG/A :: abs=Y fp=N s=3 :: Não fazer fetch externo de fonte. || rat=— || int=— || conflict=— || note=—
CUR-282 :: VG §0 — Tipografia :: DD/A :: abs=Y fp=Y s=2 :: h1 de seção = `--text-xl` 20px semibold tracking-tight. || rat=— || int=— || conflict=— || note=—
CUR-283 :: VG §0 — Tipografia :: DD/A :: abs=Y fp=Y s=2 :: h2 = `--text-lg` 18px. || rat=— || int=— || conflict=— || note=—
CUR-284 :: VG §0 — Tipografia :: DD/A :: abs=Y fp=Y s=2 :: Corpo = `--text-base` 16px. || rat=— || int=— || conflict=— || note=—
CUR-285 :: VG §0 — Tipografia :: DD/A :: abs=Y fp=Y s=2 :: Meta/secundário = `--text-sm` 14px com `--muted`. || rat=— || int=— || conflict=— || note=—
CUR-286 :: VG §0 — Tipografia :: DD/A :: abs=Y fp=Y s=2 :: Nada fica abaixo de `--text-xs` 12px. || rat=— || int=Repete DESIGN_SPEC §1. || conflict=— || note=—
CUR-287 :: VG §0 — Tipografia :: DD/A :: abs=Y fp=Y s=3 :: Line-height de body é 1.5 ou maior. || rat=— || int=Repete DESIGN_SPEC §1. || conflict=— || note=—
CUR-288 :: VG §0 — Tipografia :: DD/A :: abs=Y fp=Y s=2 :: Headings usam line-height 1.2. || rat=— || int=Repete DESIGN_SPEC §1. || conflict=— || note=—
CUR-289 :: VG §0 — Tipografia :: DD/A :: abs=Y fp=Y s=1 :: Headings usam letter-spacing -0.011em. || rat=— || int=— || conflict=— || note=—
CUR-290 :: VG §0 — Tipografia :: OS/A :: abs=Y fp=Y s=4 :: Há um h1 por tela. || rat=— || int=Repete DESIGN_SPEC §4. || conflict=— || note=—
CUR-291 :: VG §0 — Tipografia :: DD/A :: abs=Y fp=N s=4 :: O h1 é o título da seção. || rat=finding #4. || int=— || conflict=— || note=—
CUR-292 :: VG §0 — Tipografia :: DD/A :: abs=Y fp=N s=4 :: Em rotas autenticadas, o h1 nunca é 'Bivaque'. || rat=finding #4. || int=— || conflict=— || note=—
CUR-293 :: VG §0 — Copy e acentos :: DD/A :: abs=Y fp=N s=4 :: Toda copy nova usa acentos corretos. || rat=Correção textual. || int=— || conflict=— || note=—
CUR-294 :: VG §0 — Copy e acentos :: DD/A :: abs=Y fp=N s=4 :: Headers refeitos usam acentos corretos. || rat=— || int=— || conflict=— || note=—
CUR-295 :: VG §0 — Copy e acentos :: IG/R :: abs=N fp=N s=3 :: Unificar acentos no polish de cada tela tocada. || rat=— || int=— || conflict=— || note=—
CUR-296 :: VG §0 — CTAs e ações :: DD/R :: abs=N fp=N s=3 :: CTA primário é pill sólido `--accent` blue-900 com texto branco para criar/publicar/verificar. || rat=— || int=Repete papéis de `--accent` no DESIGN_SPEC. || conflict=— || note=—
CUR-297 :: VG §0 — CTAs e ações :: DD/R :: abs=N fp=N s=2 :: CTA secundário é pill `brandTokens.secondaryAccent` blue-500 ou `--surface-subtle`. || rat=— || int=— || conflict=— || note=—
CUR-298 :: VG §0 — CTAs e ações :: DD/A :: abs=Y fp=N s=4 :: Ação destrutiva/report fica dentro de overflow menu. || rat=finding #6. || int=Consistente com anatomia do post card no DESIGN_SPEC. || conflict=— || note=—
CUR-299 :: VG §0 — CTAs e ações :: DD/A :: abs=Y fp=N s=4 :: Ação destrutiva/report nunca fica inline em card. || rat=finding #6. || int=— || conflict=— || note=—
CUR-300 :: VG §0 — CTAs e ações :: OS/A :: abs=Y fp=Y s=5 :: Toda ação tem pelo menos 44px (`min-h-11 min-w-11`). || rat=— || int=Repete DESIGN_SPEC §4. || conflict=— || note=—
CUR-301 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Navegação do shell do membro espelha o modelo de produto, não a lista de features. || rat=Derivada de BIVAQUE.md §3.1 e §6.3, segundo a própria fonte; ADR nomeado. || int=— || conflict=— || note=Cross-references registradas, não abertas.
CUR-302 :: VG §0 — Navegação :: PI/A :: abs=Y fp=Y s=4 :: A navegação do membro tem exatamente quatro containers. || rat=Derivação declarada de níveis/ciclos do modelo; quatro ≤ teto de cinco. || int=Tabela de containers + teste `tests/scope/navigation.test.mjs` citado. || conflict=Wireframe desktop de `/community` lista Minha/Grupos/Eventos/Indicações/Perfil; wireframe mobile inclui ícone de calendário. || note=—
CUR-303 :: VG §0 — Navegação, tabela de containers :: PI/A :: abs=Y fp=N s=4 :: Container `Cidade` usa id `cidade`, rota `/localidade`, e guarda nível de localidade: eventos da cidade, guia de chegada, vitrine e busca de prestador. || rat=Mapeamento explícito do modelo de produto. || int=— || conflict=Wireframe /community usa sidebar legada diferente. || note=—
CUR-304 :: VG §0 — Navegação, tabela de containers :: PI/A :: abs=Y fp=N s=4 :: Container `Minha comunidade` usa id `community`, rota `/community`, e guarda nível da comunidade: home/feed da vila e os dois ciclos. || rat=Mapeamento explícito do modelo de produto. || int=— || conflict=Wireframe /community usa sidebar legada diferente. || note=—
CUR-305 :: VG §0 — Navegação, tabela de containers :: PI/A :: abs=Y fp=N s=4 :: Container `Grupos` usa id `groups`, rota `/groups`, e guarda nível do grupo: conversa por interesse. || rat=Mapeamento explícito do modelo de produto. || int=— || conflict=Wireframe /community usa rótulo 'Minha' e inclui destinos extras. || note=—
CUR-306 :: VG §0 — Navegação, tabela de containers :: PI/A :: abs=Y fp=N s=4 :: Container `Eu` usa id `me`, rota `/profile`, e guarda membro: perfil, conta, mensagens e convite de membro. || rat=Mapeamento explícito do modelo de produto. || int=— || conflict=Wireframe /community usa sidebar legada diferente. || note=—
CUR-307 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Todo destino novo aterrissa dentro de um container. || rat=Containers representam níveis estáveis do modelo. || int=— || conflict=— || note=—
CUR-308 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Destino novo nunca vira aba nova. || rat=Evitar navegação orientada à lista de features. || int=— || conflict=— || note=—
CUR-309 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Vitrine aterrissa em Cidade. || rat=— || int=— || conflict=— || note=—
CUR-310 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Busca de prestador aterrissa em Cidade. || rat=— || int=— || conflict=— || note=—
CUR-311 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Convite de membro aterrissa em Eu. || rat=— || int=— || conflict=— || note=—
CUR-312 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Seletor de localidade da transferência aterrissa onde o nível de pertencimento é escolhido. || rat=— || int=— || conflict=— || note=—
CUR-313 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Se um destino não couber em nenhum container, considerar o destino confuso, não falta de vaga. || rat=Regra falsificável declarada. || int=— || conflict=— || note=—
CUR-314 :: VG §0 — Navegação :: IG/A :: abs=Y fp=N s=4 :: Se um destino não couber em nenhum container, parar e reportar. || rat=Procedimento associado à regra falsificável. || int=— || conflict=— || note=—
CUR-315 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Eventos não é aba própria. || rat=Eventos pertencem ao nível municipal/vila. || int=— || conflict=Wireframe desktop `/community` mostra 'Eventos' na sidebar. || note=—
CUR-316 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Eventos da cidade aterrissam dentro de Cidade; `/events` continua como rota interna. || rat=Eventos da cidade pertencem ao nível municipal. || int=— || conflict=— || note=—
CUR-317 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Eventos de vila pertencem à vila. || rat=— || int=— || conflict=— || note=—
CUR-318 :: VG §0 — Navegação :: DD/A :: abs=Y fp=N s=4 :: Indicações vive no header como ícone. || rat=— || int=— || conflict=VISUAL_GUIDE §4 diz 'Entrada no sidebar desktop'; wireframe desktop também lista Indicações. || note=—
CUR-319 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Mensagens vive dentro de Eu. || rat=— || int=— || conflict=— || note=—
CUR-320 :: VG §0 — Navegação :: DD/A :: abs=Y fp=Y s=4 :: Teto de itens de navegação é 5. || rat=Fonte cita iOS HIG / Material; quatro containers ≤ cinco. || int=Fonte cita verificação por `tests/scope/navigation.test.mjs`. || conflict=— || note=Referências externas/internas citadas pela fonte, não abertas nesta fase.
CUR-321 :: VG §0 — Navegação :: DD/A :: abs=Y fp=Y s=4 :: Em desktop ≥1024px, há sidebar esquerda de 224px (`w-56`) com os quatro containers. || rat=— || int=Consistente com regra de sidebar do DESIGN_SPEC; largura é específica. || conflict=Wireframe desktop lista cinco destinos diferentes. || note=—
CUR-322 :: VG §0 — Navegação :: DD/R :: abs=N fp=N s=3 :: Item ativo da sidebar usa fundo `--accent-soft`. || rat=— || int=— || conflict=— || note=—
CUR-323 :: VG §0 — Navegação :: DD/R :: abs=N fp=N s=3 :: Item ativo da sidebar usa ícone preenchido. || rat=— || int=— || conflict=— || note=—
CUR-324 :: VG §0 — Navegação :: DD/R :: abs=N fp=N s=3 :: Item ativo da sidebar usa texto `--accent`. || rat=— || int=— || conflict=— || note=—
CUR-325 :: VG §0 — Navegação :: DD/A :: abs=Y fp=Y s=4 :: Em desktop ≥1024px, bottom nav fica oculta. || rat=— || int=Repete DESIGN_SPEC §3. || conflict=— || note=—
CUR-326 :: VG §0 — Navegação :: DD/A :: abs=Y fp=Y s=4 :: Em mobile/tablet <1024px, bottom nav é fixa. || rat=— || int=Repete DESIGN_SPEC §3. || conflict=— || note=—
CUR-327 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=4 :: Bottom nav mobile/tablet contém Cidade, Comunidade, Grupos e Eu. || rat=— || int=— || conflict=Wireframe mobile mostra ícones casa, grupos, calendário, perfil, sugerindo conjunto diferente. || note=—
CUR-328 :: VG §0 — Navegação :: DD/R :: abs=N fp=N s=3 :: Item ativo da bottom nav usa ícone preenchido. || rat=— || int=— || conflict=— || note=—
CUR-329 :: VG §0 — Navegação :: DD/R :: abs=N fp=N s=3 :: Item ativo da bottom nav usa label `--accent`. || rat=— || int=— || conflict=— || note=—
CUR-330 :: VG §0 — Navegação :: DD/A :: abs=Y fp=Y s=4 :: Em mobile/tablet <1024px, sidebar fica oculta. || rat=— || int=— || conflict=— || note=—
CUR-331 :: VG §0 — Navegação :: DD/R :: abs=N fp=N s=4 :: Em mobile/tablet, Indicações é acessada via ícone no header. || rat=— || int=— || conflict=§4 e wireframe desktop colocam Indicações no sidebar desktop. || note=—
CUR-332 :: VG §0 — Navegação :: DD/A :: abs=Y fp=N s=5 :: Pré-auth `/login`, `/consent`, `/onboarding` não têm bottom nav. || rat=finding #3. || int=Repetido em §8 e rubrica. || conflict=— || note=—
CUR-333 :: VG §0 — Navegação :: DD/A :: abs=Y fp=N s=5 :: Pré-auth `/login`, `/consent`, `/onboarding` não têm sidebar. || rat=finding #3. || int=Repetido em §8 e rubrica. || conflict=— || note=—
CUR-334 :: VG §0 — Navegação :: IG/R :: abs=N fp=N s=4 :: AppShell deve ser condicional por sessão ou rotas pré-auth devem ficar fora do shell. || rat=Implementar ausência de navegação pré-auth. || int=— || conflict=— || note=—
CUR-335 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=5 :: Papéis não entram nos containers de navegação do membro. || rat=Separação por papel/shell. || int=— || conflict=— || note=—
CUR-336 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=5 :: Consoles do fundador e do dono são shells separados e não disputam containers. || rat=Separação de papéis. || int=— || conflict=— || note=—
CUR-337 :: VG §0 — Navegação :: PI/A :: abs=Y fp=N s=5 :: Prestador não tem membership e não compartilha a navegação do membro. || rat=Modelo de papel/membership. || int=— || conflict=— || note=—
CUR-338 :: VG §0 — Navegação :: DD/A :: abs=Y fp=N s=4 :: Header posiciona brand à esquerda, não centralizado. || rat=finding #9. || int=— || conflict=— || note=—
CUR-339 :: VG §0 — Navegação :: DD/R :: abs=N fp=N s=4 :: Header posiciona ícone de Indicações à direita. || rat=finding #9. || int=— || conflict=— || note=—
CUR-340 :: VG §0 — Navegação :: DD/R :: abs=N fp=N s=4 :: Header posiciona avatar do usuário à direita. || rat=finding #9. || int=— || conflict=— || note=—
CUR-341 :: VG §0 — Navegação :: DD/R :: abs=N fp=N s=3 :: Dropdown do avatar inclui Perfil e Sair. || rat=— || int=— || conflict=— || note=—
CUR-342 :: VG §0 — Estados :: DD/A :: abs=Y fp=Y s=3 :: Toda tela de lista em loading usa 3 skeletons de card (`FeedCardSkeleton` ou variante). || rat=— || int=Feed DESIGN_SPEC usa 3 cards. || conflict=— || note=—
CUR-343 :: VG §0 — Estados :: DD/A :: abs=Y fp=N s=4 :: Toda tela de lista vazia usa `EmptyState` com ícone + título + descrição + CTA quando aplicável. || rat=— || int=— || conflict=— || note=—
CUR-344 :: VG §0 — Estados :: DD/A :: abs=Y fp=N s=4 :: Empty state nunca é caixa tracejada vazia sem CTA. || rat=— || int=— || conflict=— || note=—
CUR-345 :: VG §0 — Estados :: DD/A :: abs=Y fp=N s=4 :: Toda tela de lista em erro usa `ErrorState` com retry. || rat=— || int=Repetido no DESIGN_SPEC feed. || conflict=— || note=—
CUR-346 :: VG §0 — Estados :: OS/A :: abs=Y fp=N s=5 :: Erro nunca vaza string crua de Supabase/Postgres. || rat=Não expor erro interno. || int=Repetido no DESIGN_SPEC. || conflict=— || note=—
CUR-347 :: VG §0 — Estados :: DD/A :: abs=Y fp=N s=3 :: End-of-feed usa divisor + 'Você está em dia' centralizado em muted. || rat=— || int=Marker é exigido no DESIGN_SPEC. || conflict=— || note=—
CUR-348 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/R :: abs=N fp=N s=3 :: Header é sticky. || rat=— || int=— || conflict=— || note=—
CUR-349 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/R :: abs=N fp=N s=3 :: Header mostra marca Bivaque, ícone de Indicações e avatar. || rat=— || int=Consistente com regra global do header. || conflict=— || note=—
CUR-350 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/R :: abs=N fp=N s=4 :: Header de localidade mostra 'Manaus, AM · N membros'. || rat=— || int=Repete DESIGN_SPEC §3.3. || conflict=— || note=—
CUR-351 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/A :: abs=Y fp=Y s=3 :: Header de localidade é sticky em `top-12`. || rat=— || int=Sticky sob app header no DESIGN_SPEC. || conflict=— || note=—
CUR-352 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/R :: abs=N fp=N s=3 :: Composer entry mostra avatar + 'No que você está…'. || rat=— || int=— || conflict=— || note=—
CUR-353 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/R :: abs=N fp=N s=3 :: Composer entry abre modal. || rat=— || int=— || conflict=DESIGN_SPEC §2 descreve composer expandindo de campo de uma linha para editor completo; não explicita modal. || note=—
CUR-354 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/R :: abs=N fp=N s=2 :: Composer oferece atalhos Foto, Link e um terceiro atalho representado por 📊. || rat=— || int=— || conflict=DESIGN_SPEC §3.3 prescreve attachment/event/recommendation shortcuts. || note=—
CUR-355 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/R :: abs=N fp=N s=4 :: Sort é segmented 'Recentes / Relevantes'. || rat=— || int=Repete DESIGN_SPEC §3.3. || conflict=— || note=—
CUR-356 :: VG §1 `/community` — wireframe mobile/tablet, post card :: DD/R :: abs=N fp=N s=3 :: Post card mostra avatar, nome, Manaus, tempo relativo e overflow menu. || rat=— || int=Repete/expande anatomia do DESIGN_SPEC. || conflict=— || note=—
CUR-357 :: VG §1 `/community` — wireframe mobile/tablet, post card :: DD/A :: abs=Y fp=Y s=3 :: Corpo do post usa clamp 4 + 'Ver mais'. || rat=— || int=Repete/expande anatomia do DESIGN_SPEC. || conflict=— || note=—
CUR-358 :: VG §1 `/community` — wireframe mobile/tablet, post card :: DD/R :: abs=N fp=N s=3 :: Post card reserva área para media/link/poll. || rat=— || int=Repete/expande anatomia do DESIGN_SPEC. || conflict=— || note=—
CUR-359 :: VG §1 `/community` — wireframe mobile/tablet, post card :: DD/R :: abs=N fp=N s=3 :: Reaction row mostra reação, contagem de comentários e Compartilhar. || rat=— || int=Repete/expande anatomia do DESIGN_SPEC. || conflict=— || note=—
CUR-360 :: VG §1 `/community` — wireframe mobile/tablet, post card :: DD/A :: abs=Y fp=Y s=3 :: Post card mostra preview de 2 comentários. || rat=— || int=Repete/expande anatomia do DESIGN_SPEC. || conflict=— || note=—
CUR-361 :: VG §1 `/community` — wireframe mobile/tablet, post card :: DD/R :: abs=N fp=N s=3 :: Post card inclui resposta inline. || rat=— || int=Repete/expande anatomia do DESIGN_SPEC. || conflict=— || note=—
CUR-362 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/A :: abs=Y fp=Y s=3 :: Gap entre post cards permanece 12–16px. || rat=Coesão de lista; regra global. || int=— || conflict=— || note=—
CUR-363 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/R :: abs=N fp=N s=3 :: Fim do feed mostra 'Você está em dia'. || rat=— || int=Repete regra global de end-of-feed. || conflict=— || note=—
CUR-364 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/R :: abs=N fp=N s=4 :: Bottom nav aparece no mobile/tablet. || rat=— || int=Repete regra global. || conflict=— || note=—
CUR-365 :: VG §1 `/community` — wireframe Mobile 375 / Tablet 768 :: DD/A :: abs=Y fp=Y s=2 :: Bottom nav do wireframe contém quatro ícones correspondentes visualmente a home, grupos, calendário e perfil. || rat=— || int=— || conflict=Regra global diz containers Cidade, Comunidade, Grupos, Eu; calendário sugere Eventos, que globalmente 'não é aba própria'. || note=—
CUR-366 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/A :: abs=Y fp=Y s=4 :: Desktop de `/community` mostra sidebar à esquerda. || rat=— || int=Regra global desktop. || conflict=— || note=—
CUR-367 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/A :: abs=Y fp=Y s=3 :: Sidebar usa largura `w-56`. || rat=— || int=Repete 224px global. || conflict=— || note=—
CUR-368 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/R :: abs=N fp=N s=4 :: Área principal contém locality + composer + sort + feed. || rat=— || int=— || conflict=— || note=—
CUR-369 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/A :: abs=Y fp=Y s=2 :: Feed usa `max-w-2xl`. || rat=— || int=— || conflict=DESIGN_SPEC §3 fixa conteúdo max 640px; Tailwind `max-w-2xl` é tipicamente 672px, mas esta fase não resolve. || note=—
CUR-370 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/R :: abs=N fp=N s=4 :: Desktop mostra right rail. || rat=— || int=Repete DESIGN_SPEC §3.3. || conflict=— || note=—
CUR-371 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/A :: abs=Y fp=Y s=2 :: Right rail usa `w-72` e `lg:block`. || rat=— || int=— || conflict=DESIGN_SPEC §3 fixa right rail em 320px. || note=—
CUR-372 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/A :: abs=Y fp=Y s=3 :: Right rail mostra Próximos eventos (3). || rat=— || int=Conteúdo repete DESIGN_SPEC; contagem 3 é nova precisão. || conflict=— || note=—
CUR-373 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/A :: abs=Y fp=Y s=3 :: Right rail mostra Grupos ativos (3). || rat=— || int=Conteúdo repete DESIGN_SPEC; contagem 3 é nova precisão. || conflict=— || note=—
CUR-374 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/R :: abs=N fp=N s=3 :: Right rail mostra Boas práticas. || rat=— || int=Corresponde aproximadamente a community guidelines do DESIGN_SPEC. || conflict=— || note=—
CUR-375 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/A :: abs=Y fp=Y s=2 :: Sidebar do wireframe lista Minha, Grupos, Eventos, Indicações e Perfil. || rat=— || int=— || conflict=Conflita com regra global de exatamente quatro containers Cidade, Minha comunidade, Grupos, Eu; também com Eventos não ser aba e Indicações viver no header. || note=—
CUR-376 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/R :: abs=N fp=N s=4 :: Right rail deve preencher o vazio à direita. || rat=finding HIGH #1. || int=— || conflict=— || note=—
CUR-377 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/A :: abs=Y fp=Y s=2 :: Título de seção dos cards do rail = 13px semibold muted. || rat=— || int=— || conflict=— || note=—
CUR-378 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/A :: abs=Y fp=Y s=2 :: Itens do rail usam título 14px. || rat=— || int=— || conflict=— || note=—
CUR-379 :: VG §1 `/community` — wireframe Desktop 1440 :: DD/A :: abs=Y fp=Y s=2 :: Itens do rail usam meta 13px. || rat=— || int=— || conflict=— || note=—
CUR-380 :: VG §2 `/groups` :: DD/R :: abs=N fp=N s=4 :: Tabs são 'Meus grupos / Descobrir' em controle segmented. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-381 :: VG §2 `/groups` :: DD/R :: abs=N fp=N s=3 :: Busca pill 'Buscar grupos' fica no topo. || rat=— || int=— || conflict=— || note=—
CUR-382 :: VG §2 `/groups` :: DD/A :: abs=Y fp=N s=3 :: Grupos são apresentados como lista de linhas, não cards soltos. || rat=— || int=— || conflict=DESIGN_SPEC §3.4 prescreve grid de group cards. || note=—
CUR-383 :: VG §2 `/groups` :: DD/A :: abs=Y fp=Y s=2 :: Cada linha de grupo usa thumbnail 48px rounded-lg. || rat=— || int=— || conflict=— || note=—
CUR-384 :: VG §2 `/groups` :: DD/R :: abs=N fp=N s=3 :: Cada linha de grupo mostra nome semibold. || rat=— || int=— || conflict=— || note=—
CUR-385 :: VG §2 `/groups` :: DD/R :: abs=N fp=N s=3 :: Cada linha de grupo mostra 'N membros' muted. || rat=— || int=— || conflict=— || note=—
CUR-386 :: VG §2 `/groups` :: DD/R :: abs=N fp=N s=3 :: CTA fica à direita da linha. || rat=— || int=— || conflict=— || note=—
CUR-387 :: VG §2 `/groups` :: DD/R :: abs=N fp=N s=3 :: CTA de grupo pode ser 'Entrar'. || rat=— || int=— || conflict=— || note=—
CUR-388 :: VG §2 `/groups` :: PI/R :: abs=N fp=N s=4 :: CTA de grupo privado é 'Solicitar entrada' com estado pendente persistente. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-389 :: VG §2 `/groups` :: DD/R :: abs=N fp=N s=3 :: Estado 'Membro' é disabled. || rat=— || int=— || conflict=— || note=—
CUR-390 :: VG §2 `/groups` :: DD/R :: abs=N fp=N s=4 :: Grupo privado mostra cadeado ao lado do nome. || rat=— || int=— || conflict=DESIGN_SPEC diz privacy badge; ambos podem coexistir, mas a forma difere. || note=—
CUR-391 :: VG §2 `/groups` :: DD/R :: abs=N fp=N s=3 :: Detalhe futuro usa header com cover colapsando. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-392 :: VG §2 `/groups` :: DD/R :: abs=N fp=N s=4 :: Detalhe futuro usa tabs Publicações / Membros / Sobre. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-393 :: VG §3 `/events` :: DD/R :: abs=N fp=N s=4 :: Eventos são agrupados por data. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-394 :: VG §3 `/events` :: DD/R :: abs=N fp=N s=4 :: Header de data é sticky. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-395 :: VG §3 `/events` :: DD/R :: abs=N fp=N s=3 :: Header de data usa labels como 'Hoje' e 'Sáb, 9 ago'. || rat=— || int=— || conflict=— || note=—
CUR-396 :: VG §3 `/events` :: DD/A :: abs=Y fp=Y s=2 :: Card de evento usa bloco de data quadrado 48px à esquerda. || rat=— || int=— || conflict=— || note=—
CUR-397 :: VG §3 `/events` :: DD/A :: abs=Y fp=Y s=2 :: Bloco de data mostra dia grande + mês 11px. || rat=— || int=— || conflict=— || note=—
CUR-398 :: VG §3 `/events` :: DD/R :: abs=N fp=N s=3 :: Card de evento mostra título semibold. || rat=— || int=— || conflict=— || note=—
CUR-399 :: VG §3 `/events` :: DD/R :: abs=N fp=N s=3 :: Card de evento mostra linha de local/hora muted. || rat=— || int=— || conflict=— || note=—
CUR-400 :: VG §3 `/events` :: DD/A :: abs=Y fp=Y s=2 :: Card de evento mostra 3 avatares empilhados + contagem. || rat=— || int=— || conflict=— || note=—
CUR-401 :: VG §3 `/events` :: DD/R :: abs=N fp=N s=3 :: RSVP segmentado fica à direita/dentro do card. || rat=— || int=— || conflict=— || note=—
CUR-402 :: VG §3 `/events` :: DD/R :: abs=N fp=N s=4 :: RSVP usa opções Vou / Talvez / Não vou. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-403 :: VG §3 `/events` :: IG/R :: abs=N fp=N s=4 :: RSVP faz update otimista. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-404 :: VG §3 `/events` :: DD/R :: abs=N fp=N s=3 :: RSVP ativo usa `--accent-soft`. || rat=— || int=— || conflict=— || note=—
CUR-405 :: VG §3 `/events` :: PI/A :: abs=Y fp=N s=5 :: Local privado renderiza somente para confirmados. || rat=Privacidade do local. || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-406 :: VG §3 `/events` :: IG/A :: abs=Y fp=N s=5 :: Restrição de local privado é server-side. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-407 :: VG §3 `/events` :: OS/A :: abs=Y fp=N s=5 :: UI não faz fetch-then-hide de local privado. || rat=Não entregar dado privado ao cliente não autorizado. || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-408 :: VG §4 `/recommendations` :: DD/R :: abs=N fp=N s=4 :: Categorias usam chip row horizontal com scroll-snap. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-409 :: VG §4 `/recommendations` :: IG/R :: abs=N fp=N s=3 :: Busca usa debounce. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-410 :: VG §4 `/recommendations` :: DD/R :: abs=N fp=N s=3 :: Card mostra ícone de categoria. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-411 :: VG §4 `/recommendations` :: DD/R :: abs=N fp=N s=3 :: Card mostra nome do negócio semibold. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-412 :: VG §4 `/recommendations` :: DD/R :: abs=N fp=N s=3 :: Card mostra 'indicado por X' muted. || rat=— || int=— || conflict=— || note=—
CUR-413 :: VG §4 `/recommendations` :: DD/A :: abs=Y fp=Y s=2 :: Card mostra blurb com clamp 2. || rat=— || int=— || conflict=— || note=—
CUR-414 :: VG §4 `/recommendations` :: DD/R :: abs=N fp=N s=3 :: Card mostra 'N acharam útil'. || rat=— || int=— || conflict=— || note=—
CUR-415 :: VG §4 `/recommendations` :: DD/R :: abs=N fp=N s=4 :: Empty 'nenhum resultado' mantém query visível. || rat=Preservar contexto da busca. || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-416 :: VG §4 `/recommendations` :: DD/A :: abs=Y fp=N s=2 :: Recommendations tem entrada no sidebar desktop. || rat=— || int=— || conflict=VISUAL_GUIDE §0 diz Indicações vive no header e novos destinos não viram abas; wireframe desktop lista Indicações no sidebar. || note=—
CUR-417 :: VG §5 `/messages` :: DD/A :: abs=Y fp=Y s=4 :: Em ≥1024px, mensagens usam duas colunas: lista 320px + thread flex-1. || rat=— || int=Repete DESIGN_SPEC e adiciona largura exata. || conflict=— || note=—
CUR-418 :: VG §5 `/messages` :: DD/R :: abs=N fp=N s=4 :: No mobile, navegação vai lista → thread com slide back. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-419 :: VG §5 `/messages` :: DD/R :: abs=N fp=N s=3 :: Lista mostra avatar. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-420 :: VG §5 `/messages` :: DD/R :: abs=N fp=N s=3 :: Lista mostra nome. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-421 :: VG §5 `/messages` :: DD/R :: abs=N fp=N s=3 :: Lista mostra preview truncado. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-422 :: VG §5 `/messages` :: DD/R :: abs=N fp=N s=3 :: Lista mostra hora. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-423 :: VG §5 `/messages` :: DD/R :: abs=N fp=N s=3 :: Lista mostra dot de não-lida em `--accent`. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-424 :: VG §5 `/messages` :: DD/R :: abs=N fp=N s=3 :: Thread usa separadores de data. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-425 :: VG §5 `/messages` :: DD/R :: abs=N fp=N s=3 :: Thread agrupa bolhas consecutivas. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-426 :: VG §5 `/messages` :: DD/R :: abs=N fp=N s=3 :: Mensagens próprias ficam à direita com `--accent-soft`. || rat=— || int=Repete DESIGN_SPEC com token explícito. || conflict=— || note=—
CUR-427 :: VG §5 `/messages` :: DD/A :: abs=Y fp=N s=4 :: Enviar habilita somente com texto. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-428 :: VG §5 `/messages` :: IG/R :: abs=N fp=N s=4 :: Envio otimista mostra tick pendente. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-429 :: VG §5 `/messages` :: DD/R :: abs=N fp=N s=4 :: Sem contexto de DM, mostrar empty state explicativo. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-430 :: VG §5 `/messages` :: OS/A :: abs=Y fp=N s=5 :: Sem contexto de DM, nunca mostrar erro de permissão cru. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-431 :: VG §6 `/notifications` :: DD/R :: abs=N fp=N s=4 :: Notificações agrupam em Hoje / Esta semana / Anteriores. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-432 :: VG §6 `/notifications` :: DD/A :: abs=Y fp=Y s=2 :: Headers dos grupos são muted 13px. || rat=— || int=— || conflict=— || note=—
CUR-433 :: VG §6 `/notifications` :: DD/R :: abs=N fp=N s=4 :: Não-lida usa bg `--accent-soft`. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-434 :: VG §6 `/notifications` :: DD/A :: abs=Y fp=Y s=3 :: Bg de não-lida esmaece em `duration-slow` ao ler. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-435 :: VG §6 `/notifications` :: DD/R :: abs=N fp=N s=4 :: Header inclui 'Marcar todas como lidas'. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-436 :: VG §7 `/profile` :: DD/A :: abs=Y fp=Y s=2 :: Header de perfil usa avatar 64px. || rat=— || int=— || conflict=— || note=—
CUR-437 :: VG §7 `/profile` :: DD/R :: abs=N fp=N s=4 :: Header mostra nome. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-438 :: VG §7 `/profile` :: PI/R :: abs=N fp=N s=4 :: Header mostra 'Manaus, AM'. || rat=— || int=Repete localidade do DESIGN_SPEC. || conflict=— || note=—
CUR-439 :: VG §7 `/profile` :: DD/R :: abs=N fp=N s=4 :: Header mostra 'membro desde <mês ano>'. || rat=— || int=Repete member-since. || conflict=— || note=—
CUR-440 :: VG §7 `/profile` :: PI/A :: abs=Y fp=N s=5 :: Perfil não mostra badge de verificação. || rat=Privacidade/trust model. || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-441 :: VG §7 `/profile` :: PI/A :: abs=Y fp=N s=5 :: Perfil não mostra patente. || rat=Privacidade/trust model. || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-442 :: VG §7 `/profile` :: PI/A :: abs=Y fp=N s=5 :: Perfil não mostra OM. || rat=Privacidade/trust model. || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-443 :: VG §7 `/profile` :: PI/A :: abs=Y fp=N s=5 :: Perfil não mostra endereço. || rat=Privacidade/trust model. || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-444 :: VG §7 `/profile` :: DD/R :: abs=N fp=N s=4 :: Tabs são Publicações / Eventos / Configurações. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-445 :: VG §7 `/profile` :: DD/R :: abs=N fp=N s=3 :: Configurações inclui preferências de notificação. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-446 :: VG §7 `/profile` :: PI/R :: abs=N fp=N s=3 :: Configurações inclui visibilidade do perfil. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-447 :: VG §7 `/profile` :: DD/R :: abs=N fp=N s=3 :: Configurações inclui convites de família. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-448 :: VG §7 `/profile` :: DD/R :: abs=N fp=N s=3 :: Configurações inclui sair. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-449 :: VG §8 `/login` + `/onboarding` :: DD/A :: abs=Y fp=N s=5 :: Login e onboarding ficam fora do shell, sem nav. || rat=— || int=Repete regra global. || conflict=— || note=—
CUR-450 :: VG §8 `/login` + `/onboarding` :: DD/A :: abs=Y fp=Y s=3 :: Card é centralizado com `max-w-sm`. || rat=— || int=— || conflict=— || note=—
CUR-451 :: VG §8 `/login` + `/onboarding` :: DD/R :: abs=N fp=N s=3 :: Card fica sobre `--surface-sunken`. || rat=— || int=— || conflict=DESIGN_SPEC §3.1 diz login card sobre `--background`. || note=—
CUR-452 :: VG §8 `/login` :: DD/R :: abs=N fp=N s=3 :: Login inclui brand. || rat=— || int=Repete wordmark do DESIGN_SPEC. || conflict=— || note=—
CUR-453 :: VG §8 `/login` :: PI/R :: abs=N fp=N s=4 :: Login inclui Google. || rat=— || int=Repete OAuth do DESIGN_SPEC. || conflict=— || note=—
CUR-454 :: VG §8 `/login` :: DD/R :: abs=N fp=N s=3 :: Login inclui divisor 'ou'. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-455 :: VG §8 `/login` :: PI/R :: abs=N fp=N s=4 :: Login inclui email + link mágico. || rat=— || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-456 :: VG §8 `/onboarding` :: DD/A :: abs=Y fp=Y s=3 :: CPF usa máscara exata `000.000.000-00`. || rat=— || int=DESIGN_SPEC exige máscara conforme digitado. || conflict=— || note=—
CUR-457 :: VG §8 `/onboarding` :: DD/R :: abs=N fp=N s=2 :: CTA de onboarding é verde. || rat=— || int=— || conflict=VISUAL_GUIDE §0 diz CTA primário de verificar usa `--accent` blue-900; DESIGN_SPEC define success verde para estados de moderação/verificação, não CTA primário. || note=—
CUR-458 :: VG §8 `/onboarding` :: DD/R :: abs=N fp=N s=3 :: Waitlist é ação secundária. || rat=— || int=— || conflict=— || note=—
CUR-459 :: VG §8 `/onboarding` :: PI/R :: abs=N fp=N s=4 :: Onboarding inclui nota de privacidade. || rat=— || int=— || conflict=— || note=—
CUR-460 :: VG §8 `/onboarding` :: PI/A :: abs=Y fp=N s=5 :: CPF nunca é ecoado de volta. || rat=Privacidade. || int=Repete DESIGN_SPEC. || conflict=— || note=—
CUR-461 :: VG §9 — Rubrica :: IG/A :: abs=Y fp=Y s=4 :: Para cada tela tocada, verificar capturas em 375px, 768px e 1440px. || rat=Rubrica pós-implementação; três viewports definidos. || int=Mesmos viewports aparecem no gate de overflow do DESIGN_SPEC. || conflict=— || note=—
CUR-462 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=Y s=2 :: A ação primária deve estar visível em menos de 1s. || rat=Critério de hierarquia visual. || int=— || conflict=— || note=—
CUR-463 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=Y s=3 :: Ritmo auditado exige gaps de 12–16px entre cards. || rat=— || int=Repete §0. || conflict=— || note=—
CUR-464 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=Y s=3 :: Ritmo auditado exige padding de 16px. || rat=— || int=Repete §0. || conflict=— || note=—
CUR-465 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=N s=3 :: Ritmo auditado não admite deriva arbitrária. || rat=— || int=— || conflict=— || note=—
CUR-466 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=N s=4 :: Loading, empty, error e end-of-feed devem estar presentes nas telas tocadas aplicáveis. || rat=— || int=Repete §0 Estados. || conflict=— || note=—
CUR-467 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=N s=4 :: Loading, empty, error e end-of-feed devem estar estilizados, não como caixas cruas. || rat=— || int=— || conflict=— || note=—
CUR-468 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=N s=4 :: Desktop deve mostrar sidebar ativa correta. || rat=— || int=Repete §0 Navegação. || conflict=— || note=—
CUR-469 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=N s=4 :: Mobile deve mostrar bottom nav ativa correta. || rat=— || int=Repete §0 Navegação. || conflict=— || note=—
CUR-470 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=N s=5 :: Pré-auth deve ficar sem nav. || rat=— || int=Repete §0 e §8. || conflict=— || note=—
CUR-471 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=N s=3 :: Densidade deve resultar em lista coesa, não parede nem objetos flutuando. || rat=Coesão visual; finding #7 no §0. || int=— || conflict=— || note=—
CUR-472 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=Y s=3 :: Layout em 375px não deve ser apenas o layout de 1440px espremido. || rat=Responsividade adaptativa. || int=— || conflict=— || note=—
CUR-473 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=Y s=4 :: Em 1440px, usar right rail/sidebar e não deixar margem morta. || rat=Aproveitamento do desktop; finding HIGH #1 para right rail. || int=— || conflict=— || note=—
CUR-474 :: VG §9 — Rubrica :: OS/A :: abs=Y fp=Y s=5 :: Targets de ação devem ter 44px. || rat=— || int=Repete DESIGN_SPEC §4 e §0. || conflict=— || note=—
CUR-475 :: VG §9 — Rubrica :: OS/A :: abs=Y fp=Y s=4 :: Cada tela deve ter um h1. || rat=— || int=Repete DESIGN_SPEC §4 e §0. || conflict=— || note=—
CUR-476 :: VG §9 — Rubrica :: OS/A :: abs=Y fp=N s=5 :: Foco deve ser visível. || rat=— || int=Repete DESIGN_SPEC §4. || conflict=— || note=—
CUR-477 :: VG §9 — Rubrica :: OS/A :: abs=Y fp=N s=5 :: Não deve haver overflow horizontal. || rat=— || int=DESIGN_SPEC §4 fixa 375/768/1440. || conflict=— || note=—
CUR-478 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=N s=4 :: Copy deve ter acentos corretos. || rat=— || int=Repete §0 Copy. || conflict=— || note=—
CUR-479 :: VG §9 — Rubrica :: DD/A :: abs=Y fp=N s=4 :: Erros devem ser amigáveis. || rat=— || int=Repete padrões de erro no DESIGN_SPEC e §0 Estados. || conflict=— || note=—
CUR-480 :: VG §9 — Rubrica :: PI/A :: abs=Y fp=N s=5 :: Copy/UI auditada não deve expor patente. || rat=Privacidade/trust model. || int=Repete `/profile`. || conflict=— || note=—
CUR-481 :: VG §9 — Rubrica :: PI/A :: abs=Y fp=N s=5 :: Copy/UI auditada não deve expor OM. || rat=Privacidade/trust model. || int=Repete `/profile`. || conflict=— || note=—
CUR-482 :: VG §9 — Rubrica :: PI/A :: abs=Y fp=N s=5 :: Copy/UI auditada não deve expor endereço. || rat=Privacidade/trust model. || int=Repete `/profile`. || conflict=— || note=—
CUR-483 :: VG §9 — Rubrica :: PI/A :: abs=Y fp=N s=5 :: Copy/UI auditada não deve expor badge. || rat=Privacidade/trust model. || int=Repete `/profile`. || conflict=— || note=—
CUR-484 :: DS §1 — Color :: IG/R :: abs=N fp=N s=4 :: HeroUI reserva `--overlay` para a superfície flutuante; o scrim modal usa `--backdrop`. || rat=Evitar colisão semântica de token com HeroUI. || int=— || conflict=— || note=—
CUR-485 :: DS §4 — Accessibility gates :: IG/A :: abs=Y fp=N s=4 :: Os gates de acessibilidade listados são todos tratados como enforced por `scripts/visual/capture.mjs`. || rat=Mecanismo de enforcement explicitamente declarado. || int=— || conflict=— || note=—

## Extraction completeness

Covered: product/reference identity; navigation/shells; information hierarchy; responsive transitions; token/color system; typography; spacing/density; radius/elevation; motion; components/wrappers; forms/controls; loading/empty/error/success/end states; accessibility/contrast/touch/focus; cards/feed/lists; modal/overlay; mobile/desktop differences; copy/labels; per-surface wireframes; and all material absolute/fixed-count/fixed-size/threshold/duration/breakpoint/geometry prescriptions encountered.

Known direct/material incumbent tensions are retained in their individual `conflict=` fields, including: right rail 320px vs `w-72`; max content 640px vs `max-w-2xl`; groups grid cards vs row list; login on `--background` vs `--surface-sunken`; exact four navigation containers vs legacy-looking wireframes/sidebar entries; Eventos not a tab vs Eventos in the sidebar wireframe; Indicações in header vs desktop sidebar; blue primary verify CTA vs green onboarding CTA; composer shortcut sets; and inline composer expansion vs modal-opening wireframe.

**Phase 2 frozen condition: satisfied.**
