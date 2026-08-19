# ANTI-SLOP — checklist congelada da auditoria multiagente

> **Esta lista congela antes da rodada 1 e não muda durante o loop.**
> Critério descoberto no meio do caminho vai para `BACKLOG.md` da run — nunca para o gate.
> Essa é a única defesa contra deriva de gol, que é o modo de falha nº 1 de um
> loop com agente crítico.

Derivada de `DESIGN_SPEC.md` (tokens, tom), `VISUAL_GUIDE.md` §0 e §9 (rubrica),
`nextdoor-refs/ANALYSIS.md` (arquitetura de interação de referência) e da regra de
privacidade do `AGENTS.md`.

O produto é **sóbrio e institucional** — rede privada, com verificação, para militares
federais, veteranos e pensionistas. Não é consumer-playful. Boa parte do que segue é
slop justamente porque empurra o tom para o lado errado.

## Como usar

Cada item é binário: **acionado** ou **não acionado**. Um item acionado exige
`tela + elemento + prescrição` — nome do token, valor em px, peso da fonte. Achado sem
prescrição não conta como achado; conta como ruído do próprio auditor.

| ID | Aciona quando | Prescrição esperada |
|---|---|---|
| `SLOP-01` | Gradiente decorativo que não codifica estado nem dado | Superfície chapada: `--surface` + `--border` |
| `SLOP-02` | Emoji usado como ícone de UI (seção, empty state, botão, nav) | Ícone do set em uso, ou nada |
| `SLOP-03` | Centralização por default — texto corrido centralizado, ou tela centrada verticalmente sem razão (só `/login` e erro justificam) | Alinhamento à esquerda, âncora no topo |
| `SLOP-04` | Dois níveis de hierarquia distinguidos **só** por `font-size` | Peso, cor (`--muted`) ou espaço fazendo parte da distinção |
| `SLOP-05` | Grid uniforme onde o conteúdo tem importância desigual | Peso visual diferente para o item de maior importância |
| `SLOP-06` | Densidade uniforme — mesmo gap entre tudo, sem agrupamento por proximidade | Escala 4px aplicada com intenção: 12–16px intra-grupo, 24–32px entre grupos |
| `SLOP-07` | Copy genérica de marketing — "Bem-vindo à comunidade!", "Conecte-se com…", "Tudo em um só lugar" | Frase que só faz sentido neste produto, nesta tela |
| `SLOP-08` | Empty state decorativo sem próximo passo | Estado vazio honesto: o que existe, e a ação concreta |
| `SLOP-09` | `box-shadow` fora de `--elevation-*`, ou sombra em preto | `--elevation-0..3`, `color-mix` sobre `--foreground` |
| `SLOP-10` | Dois CTAs com o mesmo peso competindo na mesma tela | Uma ação primária; o resto secundário ou terciário |
| `SLOP-11` | Ícone que repete literalmente o rótulo ao lado sem acrescentar leitura | Remover o ícone, ou trocar por um que carregue informação |
| `SLOP-12` | Placeholder vazando: `Lorem`, "João Silva", contadores redondos (100, 1.000) | Dado do seed real, ou ausência honesta |
| `SLOP-13` | Cor crua (hex/`rgb()`) em CSS, classe ou componente | `var(--…)` ou `brandTokens` |
| `SLOP-14` | Raio de borda fora da escala (`--radius-sm`/`--radius`/`--radius-lg`/`--radius-full`) | Token da escala |
| `SLOP-15` | Simetria forçada — conteúdo inventado para preencher coluna ou card vazio | Layout que aceita a assimetria real do conteúdo |
| `SLOP-16` | **Falha dura.** Badge/selo de verificação visível, patente, OM, endereço ou classe na tela | Remover. É violação da regra de privacidade do `AGENTS.md`, não questão de gosto |

## Escala de nota (o Carrasco atribui por tela)

Ausência de slop **não é AAA**. Limpo e sem graça é AA. AAA exige acerto positivo de ofício.

- **AAA** — zero SLOP acionado, zero P0/P1 do Medidor, 8/8 na rubrica §9, **e** pelo menos
  um acerto deliberado por tela: uma decisão de hierarquia, densidade ou copy que só faz
  sentido para esta comunidade e que um gerador genérico não produziria. O Carrasco precisa
  **nomear** esse acerto. Não conseguiu nomear, não é AAA.
- **AA** — zero SLOP, 8/8 na §9, nada de distintivo.
- **A** — no máximo 1 SLOP de baixa gravidade, 8/8 na §9.
- **B** — 2+ SLOP, ou item da §9 falhando.
- **C** — `SLOP-16` acionado, ou P0 do Medidor aberto.
