# Mapeamento de jornadas — fluxos Mobbin a partir das pranchas

> **Escrito em 2026-09-12**, substituindo a versão anterior deste plano, que derivava os fluxos do
> catálogo de rotas da spec. A unidade passou a ser **a prancha**. Executável via
> `/run-plan docs/superpowers/plans/2026-09-12-mapeamento-de-jornadas-mobbin.md`.
> Não abre onda de produto: não toca migration, RLS, dado pessoal nem runtime. É documental.

## 1. Resultado exigido

Uma **galeria Mobbin-style gerada das 59 pranchas** do guia visual. Cada **prancha é um fluxo**;
suas telas/estados são os **passos**; cada passo é um **recorte** do PNG da prancha; o `group` é a
**categoria** do fluxo; as `reviewNotes` são **restrições de construção**. A galeria é gerada do
`manifest.json` — não escrita à mão — e regenerável.

**Isto é mapa de referência, não prova de implementação.** O selo de cada fluxo diz "referência
visual". Nenhum fluxo é apresentado como "capturado" ou "pronto" — essa distinção é o que o
`AGENTS.md` do guia chama de regra que os bitmaps não podem redefinir.

## 2. Autoridade — o que manda

| Fonte | Papel |
|---|---|
| [`manifest.json`](../../design/visual-guide-2026-09-06/manifest.json) | **Fonte canônica**: `id`, `kind`, `title`, `screens[]`, `group`, `reviewNotes[]`, `status` de cada prancha |
| [`MAPA-DE-TELAS.md`](../../design/visual-guide-2026-09-06/MAPA-DE-TELAS.md) · [`README.md`](../../design/visual-guide-2026-09-06/README.md) · [`AGENTS.md`](../../design/visual-guide-2026-09-06/AGENTS.md) | Notas de inspeção e regras do guia |
| Os PNGs em [`docs/design/visual-guide-2026-09-06/`](../../design/visual-guide-2026-09-06/) | A imagem de cada passo |
| [`index.html`](../../design/visual-guide-2026-09-06/index.html) | Galeria existente — referência de UX e filtros; **não substituir** |
| [`spec 2026-09-08`](../specs/2026-09-08-reconstrucao-visual-web-design.md) | Opcional: amarrar cada fluxo aos ids R/C/O para rastreio. Nunca redefine o fluxo |

`docs/journeys/MAP.md` continua histórico e superseded: não estender, não citar como verdade.

## 3. Geometria real — medido, não suposto

Os 59 PNGs **não compartilham uma geometria**. A medição de 2026-09-12 achou três lotes:

| Geometria | Ratio | Pranchas | Composição |
|---|---|---|---|
| 1536×1024 | 1.5 | 39 (ex.: 00, 02, 10, 11, 14, 40, 44, 46, 49, 59, 66, 68; web 01, 12, 13, 15, 17, 19, 21, 23, 25) | mobile: 3 quadros; web: 1 quadro |
| ~1685×933 | ~1.8 | 8 (30–35, 67, 69) | lote auth — composição própria |
| ~2076×757 | ~2.74 | 17 (36–39, 42, 43, 45, 48, 51, 52, 54, 56–58, 60–65) | lote web — provavelmente 2 painéis |

**Consequência:** cortar "por terços" ou por `screens.length` corta errado em ~25 pranchas. O
recorte é **por prancha**, e precisa de detecção das calhas (gutters) + registro + verificação.

## 4. Arquitetura

```
scripts/visual/flows/
  taxonomy.json      fluxos canônicos (reconcilia guia/guide, mercado/market…) + tags de ação
  frames.json        geometria de recorte por prancha (gerada pela detecção + revisada)
  detect-frames.mjs  detecta as colunas de cada prancha e propõe frames.json
flows-gallery.mjs    gera a galeria a partir de manifest + taxonomy + frames

docs/design/visual-guide-2026-09-06/flows.html   <- gerado (fica ao lado dos PNGs)
docs/journeys/FLOWS.md                            <- gerado (índice textual, linkado do README)
```

## 5. Decisões, com justificativa

- **D1 — A galeria é gerada do manifesto.** Nada de dataset paralelo escrito à mão.
- **D2 — Recorte por CSS** (`background-image` + `background-position`/`size`), **sem PNG derivado.**
  Não cria arquivo que apodrece, é reversível e o PNG original continua a única fonte.
- **D3 — A geometria mora em `frames.json`**, com a calha de cada prancha registrada. Prancha
  substituída → regenera a geometria, não recorta no olho.
- **D4 — Taxonomia reconciliada.** Hoje convivem `guia`/`guide`, `mercado`/`market`,
  `imoveis`/`housing` no seletor da galeria e no manifesto. Um fluxo por grupo canônico; sinônimos
  viram apelido, não fluxo separado.
- **D5 — Sem runtime.** Não há driver Playwright nem captura. O status é o do guia (`Referencia
  visual` / `Referencia com ajustes registrados`).
- **D6 — A galeria existente não é tocada.** `flows.html` é artefato novo; `index.html` continua.
- **D7 — Rastreio à spec é opcional.** Ligar um fluxo a R/C/O ajuda a achar a tela no código; não
  redefine o fluxo nem cria fluxo que a prancha não tem.

## 6. Contrato de fluxo (shape)

```jsonc
{
  "id": "auth-admissao",                    // canônico, kebab, do group reconciliado + assunto
  "title": "Admissão e convite familiar",
  "group": "auth",                          // fluxo canônico
  "platform": "mobile",                     // do manifest.kind
  "actions": ["Verificar", "Enviar identidade", "Aceitar convite"],  // tags controladas
  "prancha": "33-mobile-auth-admissao",     // 1:1 com o artefato do manifest
  "status": "Referencia visual",
  "reviewNotes": [ "..." ],                 // restrições de construção
  "steps": [
    { "label": "Identidade em análise por IA",              "frame": { "x": 0.0,   "y": 0, "w": 0.333, "h": 1 } },
    { "label": "Enviar identidade como alternativa ao CPF", "frame": { "x": 0.333, "y": 0, "w": 0.333, "h": 1 } },
    { "label": "Aceitar convite familiar",                  "frame": { "x": 0.667, "y": 0, "w": 0.333, "h": 1 } }
  ]
}
```

`frame` é relativo (0–1), então independe da resolução do PNG.

## 7. Tasks

- **T1 — Taxonomia.** `taxonomy.json`: grupos canônicos (reconciliando sinônimos), mapa
  prancha→fluxo, e o vocabulário controlado de tags de ação em português. Prova: teste unitário —
  todo `group` do manifest tem fluxo canônico; zero sinônimo solto; toda tag vem do vocabulário.
- **T2 — Geometria.** `detect-frames.mjs` acha as calhas de cada prancha (colunas de fundo
  uniforme / rim escuro) e escreve `frames.json`. Prova: cobre as 59; nenhum frame fora de `[0,1]`;
  as larguras fecham 1 sem sobreposição nem buraco; **revisão visual das 25 pranchas fora do lote
  1536×1024**, onde a detecção mais erra.
- **T3 — Catálogo.** `flows` derivado de `manifest.json` + `taxonomy.json` + `frames.json`.
  Prova: 59 fluxos, um por prancha; `screens.length === steps.length`; ids únicos.
- **T4 — Gerador.** `flows-gallery.mjs` → `flows.html` Mobbin-style: fluxo (nome + tags + selo +
  plataforma), carrossel de passos com o recorte CSS, `reviewNotes` colapsáveis, busca e filtros por
  plataforma e fluxo. Prova: abre sem erro de console; todo fluxo aparece; o recorte confere com a
  prancha em 3 amostras, uma de cada lote de geometria.
- **T5 — Verificação.** Checagem determinística: todo passo renderiza frame não vazio; contagem de
  passos bate; nenhuma imagem 404; link do PNG original funciona. Gera `docs/journeys/FLOWS.md`.
  Prova: verificador verde + leitura humana de 3 fluxos.
- **T6 — Integração.** Script no `package.json` (`npx pnpm@11.18.0 flows:gallery`), nota no
  `README.md` do guia sobre o artefato derivado, ponteiro em `docs/journeys/README.md`, e card no
  kanban com a evidência.

## 8. Gates

- **G1 (após T2):** geometria válida nas 59 e revisada nas 25 fora do lote padrão. Sem isso, T4
  corta errado.
- **G2 (após T4):** galeria abre, cobre 59/59, recorte confere nas 3 amostras.
- **G3 (fechamento):** T5 verde, `gate` completo verde, card no kanban com evidência.

## 9. Paradas obrigatórias — não faça

1. **Não substitua nem edite `index.html`.** `flows.html` é artefato novo e derivado.
2. **Não edite `manifest.json` à mão** para caber na galeria. Se a taxonomia não fecha, o problema é
   a taxonomia — corrija `taxonomy.json`, não a fonte.
3. **Não apresente fluxo como implementado.** O selo é "referência visual", nunca "pronto".
4. **Não trate as `reviewNotes` como opcionais** — são restrições de construção e vão visíveis.
5. **Não toque em migration, RLS, `--linked` ou runtime.** Este plano não muda o banco nem a app.
6. **Não invente fluxo que a prancha não mostra.** 59 pranchas, 59 fluxos; nada a mais.

## 10. Riscos

- **Recorte errado (o risco principal).** Mitigado por detecção + `frames.json` versionado + revisão
  das 25 pranchas fora do lote padrão. Prancha não detectável com segurança **falha** a verificação e
  é nomeada — não vira recorte silenciosamente errado.
- **Deriva do guia.** `flows.html` e `FLOWS.md` são gerados: precisam ser regenerados quando uma
  prancha for substituída. Registrar no README do guia.
- **Taxonomia herdada.** Os sinônimos já existem no manifesto; T1 os reconcilia sem reescrever a
  fonte, e o mapa é explícito sobre o apelido de cada grupo.
